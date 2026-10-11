"""HTTP API for CodeQuest AI.

Run locally:  uvicorn codequest.api:app --reload   (from the backend/ directory)
Environment:
    CQ_RUNNER           auto | local | docker   (auto = docker if the judge image exists; deployments MUST use docker)
    CQ_DB_PATH          SQLite file (default: codequest.db)
    CQ_ALLOWED_ORIGINS  comma-separated exact origins for CORS (default: http://localhost:3000)
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import Depends, FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from codequest import arena, extension
from codequest.ai import load_dotenv
from codequest.content import load_all
from codequest.sandbox.runner import Runner, make_runner
from codequest.service import CodeQuestService, ServiceError
from codequest.store import Store


class SessionIn(BaseModel):
    persona: Literal["priya", "guest"] = "guest"
    name: str | None = Field(default=None, max_length=40)


class SubmissionIn(BaseModel):
    challenge_id: str = Field(min_length=1, max_length=64)
    code: str = Field(min_length=1, max_length=64 * 1024)


class ImportIn(BaseModel):
    platform: Literal["codeforces", "leetcode"]
    handle: str = Field(min_length=1, max_length=40)


class TypingIn(BaseModel):
    snippet_id: str = Field(min_length=1, max_length=80)
    concept: str | None = Field(default=None, max_length=40)
    cpm: float = Field(ge=0, le=3000)  # ~600 WPM: anything above is not human
    accuracy: float = Field(ge=0, le=1)
    duration_ms: int = Field(ge=500, le=3_600_000)
    errors: dict[str, int] = Field(default_factory=dict, max_length=200)

Slug = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9-]+$")
TagList = Field(default_factory=list, max_length=30)


class PairIn(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class ExtAnalyzeIn(BaseModel):
    code: str = Field(min_length=1, max_length=64 * 1024)
    language: str = Field(default="python", max_length=20)


class ExtApproachIn(BaseModel):
    text: str = Field(max_length=2000)
    tags: list[str] = TagList


class ExtHintIn(BaseModel):
    tags: list[str] = TagList
    level: int = Field(default=1, ge=1, le=5)


class ExtSyncIn(BaseModel):
    slug: str = Slug
    tags: list[str] = TagList
    verdict: Literal["accepted", "wrong_answer", "runtime_error", "time_limit", "other"]
    code: str = Field(default="", max_length=64 * 1024)


class AISettingsIn(BaseModel):
    enabled: bool


class ArenaIn(BaseModel):
    index: int = Field(ge=0, lt=len(arena.ATTACKS))


# repo-root .env (gitignored); real environment variables take precedence
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))


def create_app(service: CodeQuestService | None = None) -> FastAPI:
    holder: dict[str, CodeQuestService] = {}

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        svc = service
        if svc is None:
            runner: Runner = make_runner()
            store = Store(os.environ.get("CQ_DB_PATH", "codequest.db"))
            store.requeue_stale()
            svc = CodeQuestService(store, runner, load_all())
        holder["svc"] = svc
        yield
        svc.shutdown()

    app = FastAPI(title="CodeQuest AI", version="0.1.0", lifespan=lifespan)
    origins = [o.strip() for o in os.environ.get("CQ_ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_origin_regex=r"^chrome-extension://[a-p]{32}$",
                       allow_credentials=False, allow_methods=["GET", "POST"],
                       allow_headers=["Authorization", "Content-Type"])

    @app.exception_handler(ServiceError)
    async def service_error(_: Request, exc: ServiceError) -> JSONResponse:
        headers = {"Retry-After": str(exc.extra["retry_after"])} if "retry_after" in exc.extra else None
        return JSONResponse({"error": exc.message, **exc.extra}, status_code=exc.status, headers=headers)

    def svc() -> CodeQuestService:
        return holder["svc"]

    def current_user(authorization: str | None = Header(default=None),
                     s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        token = authorization.removeprefix("Bearer ").strip() if authorization else None
        return s.user(token)

    @app.get("/api/health")
    def health(s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return {"status": "ok", "runner": s.runner.name, "sandboxed": s.runner.is_sandboxed,
                "missions": len(s.challenges)}

    @app.post("/api/session")
    def session(body: SessionIn, s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.create_session(body.persona, body.name)

    @app.get("/api/challenges")
    def challenges(user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> list[dict[str, Any]]:
        return s.list_challenges(user)

    @app.get("/api/challenges/{challenge_id}")
    def challenge(challenge_id: str, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.get_challenge(challenge_id) | {"hints": s.hint_state(user, challenge_id)}

    @app.post("/api/submissions", status_code=202)
    def submit(body: SubmissionIn, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.submit(user, body.challenge_id, body.code)

    @app.get("/api/submissions/{submission_id}")
    def submission(submission_id: str, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.get_submission(user, submission_id)

    @app.post("/api/challenges/{challenge_id}/hint")
    def hint(challenge_id: str, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.hint(user, challenge_id)

    @app.get("/api/me")
    def me(user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.me(user)

    @app.get("/api/portfolio/{handle}")
    def get_portfolio(handle: str, s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.portfolio(handle)  # public: a portfolio is meant to be shared

    @app.post("/api/imports", status_code=202)
    def post_import(body: ImportIn, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.request_import(user, body.platform, body.handle)

    @app.post("/api/typing/results")
    def post_typing(body: TypingIn, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.typing_result(user, body.model_dump())

    @app.get("/api/settings/ai")
    def get_ai(s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.ai.status()

    @app.post("/api/settings/ai")
    def set_ai(body: AISettingsIn, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.ai.set_enabled(body.enabled)

    def ext_user(authorization: str | None = Header(default=None),
                 s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        token = authorization.removeprefix("Bearer ").strip() if authorization else None
        return s.ext_user(token)

    @app.post("/api/ext/pairing-code")
    def pairing_code(user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.create_pairing_code(user)

    @app.post("/api/ext/pair")
    def pair(body: PairIn, s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.pair_extension(body.code)

    @app.post("/api/ext/analyze")
    def ext_analyze(body: ExtAnalyzeIn, user=Depends(ext_user)) -> dict[str, Any]:
        if not body.language.lower().startswith("python"):
            raise ServiceError(400, "Code analysis currently supports Python only.")
        return extension.analyze(body.code)

    @app.post("/api/ext/approach")
    def ext_approach(body: ExtApproachIn, user=Depends(ext_user)) -> dict[str, Any]:
        return extension.check_approach(body.text, body.tags)

    @app.post("/api/ext/hint")
    def ext_hint(body: ExtHintIn, user=Depends(ext_user)) -> dict[str, Any]:
        return extension.hint(body.tags, body.level)

    @app.post("/api/ext/sync")
    def ext_sync(body: ExtSyncIn, user=Depends(ext_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.ext_sync(user, body.slug, body.tags, body.verdict, body.code)

    @app.get("/api/arena/attacks")
    def attacks() -> list[dict[str, Any]]:
        return arena.list_attacks()

    @app.post("/api/arena/run")
    def run_attack(body: ArenaIn, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        s.check_rate(user)  # the arena shares the submission rate limit
        return arena.run_attack(body.index, s.challenges["total"], s.runner)

    return app


app = create_app()
