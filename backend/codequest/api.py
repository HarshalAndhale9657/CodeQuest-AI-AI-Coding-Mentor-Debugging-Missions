"""HTTP API for CodeQuest AI.

Run locally:  uvicorn codequest.api:app --reload   (from the backend/ directory)
Environment:
    CQ_RUNNER           local | docker   (deployments MUST use docker)
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

from codequest import arena
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


class ArenaIn(BaseModel):
    index: int = Field(ge=0, lt=len(arena.ATTACKS))


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
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False,
                       allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])

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

    @app.get("/api/arena/attacks")
    def attacks() -> list[dict[str, Any]]:
        return arena.list_attacks()

    @app.post("/api/arena/run")
    def run_attack(body: ArenaIn, user=Depends(current_user), s: CodeQuestService = Depends(svc)) -> dict[str, Any]:
        s.check_rate(user)  # the arena shares the submission rate limit
        return arena.run_attack(body.index, s.challenges["total"], s.runner)

    return app


app = create_app()
