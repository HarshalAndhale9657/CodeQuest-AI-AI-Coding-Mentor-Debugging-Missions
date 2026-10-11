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
from pydantic import BaseModel, Field, field_validator, model_validator

from codequest import arena, extension, journey, predict, roadmap
from codequest.ai import load_dotenv
from codequest.companion_chat import MODES, ChatRequest
from codequest.content import load_all
from codequest.sandbox.runner import Runner, make_runner
from codequest.service import CodeQuestService, ServiceError
from codequest.store import Store


class SessionIn(BaseModel):
    persona: Literal["priya", "guest"] = "guest"
    name: str | None = Field(default=None, max_length=40)


class PredictionIn(BaseModel):
    """Answer to this attempt's Predict Before You Run question: a value, "it crashes", or a skip."""
    prompt_id: str = Field(pattern=r"^[0-9a-f]{12}$")
    answer: str = Field(default="", max_length=predict.MAX_ANSWER_CHARS)
    crash: bool = False
    skipped: bool = False

    @model_validator(mode="after")
    def _answered(self) -> "PredictionIn":
        if not (self.skipped or self.crash or self.answer.strip()):
            raise ValueError("type a prediction, choose 'it raises an error', or skip")
        return self


class SubmissionIn(BaseModel):
    challenge_id: str = Field(min_length=1, max_length=64)
    code: str = Field(min_length=1, max_length=64 * 1024)
    prediction: PredictionIn | None = None


class ReflectionIn(BaseModel):
    strategy: Literal[journey.SELF_REPORTS]  # type: ignore[valid-type]
    note: str | None = Field(default=None, max_length=journey.MAX_NOTE_CHARS)


class ImportIn(BaseModel):
    platform: Literal["codeforces", "leetcode"]
    handle: str = Field(min_length=1, max_length=40)


class TypingIn(BaseModel):
    """A finished drill. Speed and accuracy are computed on the server from the snippet itself."""
    snippet_id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    auto_indent: bool = True
    duration_ms: int = Field(ge=1000, le=3_600_000)
    errors: dict[str, int] = Field(default_factory=dict, max_length=100)   # expected character -> wrong keys
    syntax_errors: int = Field(default=0, ge=0, le=100_000)

    @field_validator("errors")
    @classmethod
    def _single_chars(cls, v: dict[str, int]) -> dict[str, int]:
        if any(len(k) != 1 or n < 0 or n > 100_000 for k, n in v.items()):
            raise ValueError("errors maps one expected character to a non-negative count")
        return v


class ProfileIn(BaseModel):
    """Onboarding answers: only what changes the plan (no email, phone, college or date of birth)."""
    name: str | None = Field(default=None, min_length=1, max_length=40)
    goal: roadmap.GoalId
    deadline_weeks: int | None = Field(default=None, ge=2, le=26)
    hours_per_week: int = Field(default=8, ge=1, le=40)
    level: roadmap.LevelId
    premium_ok: bool = False
    comfortable: list[str] = Field(default_factory=list, max_length=len(roadmap.TOPICS))

    @field_validator("name")
    @classmethod
    def _clean_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = " ".join("".join(ch for ch in v if ch.isprintable()).split())
        if not v:
            raise ValueError("name can't be blank")
        return v

    @field_validator("comfortable")
    @classmethod
    def _known_topics(cls, v: list[str]) -> list[str]:
        unknown = sorted(set(v) - set(roadmap.TOPIC_IDS))
        if unknown:
            raise ValueError(f"unknown topics: {unknown}")
        return list(dict.fromkeys(v))


class ReplanIn(BaseModel):
    use_ai: bool = True


class RoadmapItemIn(BaseModel):
    item_id: str = Field(min_length=4, max_length=130, pattern=r"^lc:[a-z0-9-]+$")
    done: bool

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


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ExtChatIn(BaseModel):
    mode: Literal[MODES] = "chat"  # type: ignore[valid-type]
    message: str = Field(default="", max_length=2000)
    slug: str = Field(default="", max_length=120, pattern=r"^[a-z0-9-]*$")
    title: str = Field(default="", max_length=200)
    difficulty: str = Field(default="", max_length=20)
    tags: list[str] = Field(default_factory=list, max_length=30)
    statement: str = Field(default="", max_length=12000)
    code: str = Field(default="", max_length=32000)
    language: str = Field(default="", max_length=30)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)
    hint_level: int = Field(default=1, ge=1, le=3)


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
                       allow_credentials=False, allow_methods=["GET", "POST", "PUT", "DELETE"],
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
        return s.get_challenge(challenge_id) | {"hints": s.hint_state(user, challenge_id),
                                                "prediction": s.prediction_prompt(user, challenge_id)}

    @app.get("/api/challenges/{challenge_id}/journey")
    def get_journey(challenge_id: str, attempt_id: str | None = None, user=Depends(current_user),
                    s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.journey(user, challenge_id, attempt_id)  # private: the replay shows the learner's code

    @app.post("/api/challenges/{challenge_id}/reflection")
    def reflect(challenge_id: str, body: ReflectionIn, user=Depends(current_user),
                s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.reflect(user, challenge_id, body.strategy, body.note)

    @app.post("/api/submissions", status_code=202)
    def submit(body: SubmissionIn, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        prediction = body.prediction.model_dump() if body.prediction else None
        return s.submit(user, body.challenge_id, body.code, prediction)

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

    @app.get("/api/typing/drills")
    def typing_drills(user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.typing_drills(user)

    @app.post("/api/typing/results")
    def post_typing(body: TypingIn, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.typing_result(user, body.model_dump())

    @app.get("/api/me/profile")
    def get_profile(user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.get_profile(user)

    @app.put("/api/me/profile")
    def put_profile(body: ProfileIn, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.update_profile(user, body.model_dump())

    @app.get("/api/me/roadmap")
    def get_roadmap(user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.get_roadmap(user)

    @app.post("/api/me/roadmap")
    def replan(body: ReplanIn, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.replan(user, body.use_ai)

    @app.post("/api/me/roadmap/items")
    def mark_item(body: RoadmapItemIn, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.mark_roadmap_item(user, body.item_id, body.done)

    @app.get("/api/me/export")
    def export(user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.export_data(user)

    @app.delete("/api/me")
    def delete_me(user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.delete_account(user)

    def optional_user(authorization: str | None = Header(default=None),
                      s: CodeQuestService = Depends(svc)) -> dict[str, Any] | None:
        token = authorization.removeprefix("Bearer ").strip() if authorization else None
        return s.store.user_by_token(token) if token else None

    @app.get("/api/settings/ai")
    def get_ai(user=Depends(optional_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.ai_status(user)  # public; with a session, `enabled` reflects that learner's preference

    @app.post("/api/settings/ai")
    def set_ai(body: AISettingsIn, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.set_ai_preference(user, body.enabled)  # per learner: never switches AI off for everyone

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

    @app.post("/api/ext/chat")
    def ext_chat(body: ExtChatIn, user=Depends(ext_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        req = ChatRequest(**body.model_dump(exclude={"history"}),
                          history=[t.model_dump() for t in body.history])
        return s.ext_chat(user, req)

    @app.get("/api/ext/me")
    def ext_me(user=Depends(ext_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        return s.ext_summary(user)

    @app.get("/api/arena/attacks")
    def attacks() -> list[dict[str, Any]]:
        return arena.list_attacks()

    @app.post("/api/arena/run")
    def run_attack(body: ArenaIn, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        s.check_rate(user)  # the arena shares the submission rate limit
        return arena.run_attack(body.index, s.challenges["total"], s.runner)

    return app


app = create_app()
