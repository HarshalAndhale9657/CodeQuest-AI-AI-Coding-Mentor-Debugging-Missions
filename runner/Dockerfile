# Sandbox image for learner code. Build from the repo root:
#   docker build -f runner/Dockerfile -t codequest-judge:latest .
# The API starts one container per test with the hardening flags in
# backend/codequest/sandbox/runner.py (no network, read-only FS, non-root, limits).
# BASE can point at any local Python image when Docker Hub is unreachable
ARG BASE=python:3.12-slim
FROM ${BASE}

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONIOENCODING=utf-8

COPY backend/codequest/sandbox/harness.py /opt/codequest/harness.py
RUN chmod 0444 /opt/codequest/harness.py && chmod 0555 /opt/codequest

USER 65534:65534
WORKDIR /tmp
