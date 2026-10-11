<div align="center">

# ⚔️ CodeQuest AI: AI Coding Mentor & Debugging Missions

**The deterministic coding mentor that remembers your mistakes, adapts your challenges, and never gives away the answer.**

Built for **Vortexa Hackathon 2026** · **Domain 5: AI-Powered Education & Learning Technology** · **Problem Statement: E-02**

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/)
[![Next.js 16](https://img.shields.io/badge/frontend-Next.js%2016-black.svg)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/tests-166%20passed-brightgreen.svg)]()
[![Sandbox](https://img.shields.io/badge/sandbox-Docker%20isolated-orange.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

</div>

---

## 🚨 The Problem

Beginners learn programming by writing code and examining failure, but modern learning tools are fundamentally broken:
1. **Cryptic Tracebacks:** An exception names a call-stack location, but fails to explain *why* the learner's logic crashed or where to look.
2. **Hidden Test Secrecy vs. Feedback:** Automated judges report "Wrong Answer" on hidden tests with zero diagnostic clues, while asking commercial LLMs immediately dumps full solutions.
3. **No Pedagogical Memory:** Existing judges (LeetCode, HackerRank, CodeChef) treat every submission as an isolated event. Nobody detects habituated bugs—like repeated off-by-one errors or unhandled empty inputs—or adapts future challenges to remediate them.

---

## 💡 Our Solution: "Deterministic Mentor, AI Only for Wording"

**CodeQuest AI** is an intelligent Python practice environment where every failure actively teaches:
- **Per-Test Verdicts:** Each test runs in an isolated sub-process with explicit outcomes (`passed`, `wrong_output`, `runtime_error`, `timeout`).
- **Hidden Test Privacy:** Hidden test inputs, values, and standard streams are strictly masked; only coarse categories and plain-language diagnostic explanations are delivered.
- **Progressive Hint Ladder ($H_1 \to H_4$):** Monotonic hints (Where $\to$ What $\to$ Teach $\to$ Shape) where every hint, including any AI wording, passes a **Leak Guard** that checks it against the reference solution before it is shown.
- **Mistake Memory & Adaptive Missions:** Real-time AST detectors track cognitive failure patterns. When the same mistake appears in a second, different mission (e.g. a repeated off-by-one), the system automatically prescribes a targeted **Debugging Mission** to cure the root misunderstanding.
- **Zero LLM Dependency:** The entire diagnostic engine, learner model, and hint ladder are **100% deterministic**. The AI layer is strictly used for conversational phrasing behind a leak firewall and can be toggled **OFF** without loss of functionality.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    subgraph Frontend["Frontend (Next.js + Monaco)"]
        UI[Workspace & Quest Map]
        ArenaUI[Sandbox Arena]
        Ext[LeetCode Companion Extension]
    end

    subgraph Backend["FastAPI Backend (Deterministic Engine)"]
        API[API Gateway & Sessions]
        AST[AST Bug Detectors]
        Explainer[Plain-Language Explainer]
        Hints[Hint Ladder & LeakGuard]
        Learner[Learner Model & Mistake Memory]
        AI[Guarded AI Layer (Optional)]
    end

    subgraph Sandbox["Sandboxed Execution Engine"]
        Runner[Docker Runner (--network none)]
        Fallback[Local Constrained Runner]
    end

    UI -->|Submissions| API
    Ext -->|Pairing & In-situ Check| API
    API --> Runner
    Runner -.->|Fallback if no Docker| Fallback
    Runner -->|Outcomes| Explainer
    API --> AST
    AST --> Learner
    Explainer --> UI
    Learner -->|Adaptive Re-rank| UI
    Hints -->|Leak Filter| UI
```

---

## ✨ Key Features & Capabilities

### 1. 20 Tiered Missions (15 Build + 5 Hand-Authored Debug)
- **Tiers 1–5 Progression:** Ranging from basic iteration (`total`, `count_evens`) up to recursion and stacks (`flatten`, `valid_brackets`, `binary_search`).
- **Targeted Debugging Missions:** Realistic broken code snippets where learners must diagnose and patch errors within constrained line budgets (e.g., `debug_average`, `debug_largest`, `debug_binary_search`, `debug_dedupe`, `debug_fib`).

### 2. Hardened Multi-Layer Sandbox
- Docker runner executes code under `--network none`, read-only root filesystem, non-root user, memory caps (256 MB), and per-test execution timeouts.
- **Sandbox Arena (`/arena`):** Live red-team demonstration executing canned hostile exploits (file system reads `/etc/passwd`, network egress, fork bombs, infinite loops) proving container containment.

### 3. Progressive Hints with Runtime LeakGuard
- Monotonic four-level hint ladder:
  - **H1 (Where):** Points to the problematic code block or loop construct.
  - **H2 (What):** Minimal failing counterexample generated dynamically.
  - **H3 (Teach):** Underlying pedagogical concept explanation.
  - **H4 (Shape):** The learner's *own* faulty line with one expression blanked out (missions with very short solutions stop at H3).
- Enforced cooldowns prevent hint spamming.

### 4. Mistake Memory & Concept Skill Tracking
- Fuses AST signals, test tags, and output shape analysis.
- Decays mistakes across distinct challenges.
- Concept-level Elo tracking across concepts with demonstrable evidence linking.

### 5. Ecosystem Integrations
- **LeetCode Companion (Chrome Extension MV3):** Brings CodeQuest's deterministic analysis and approach validation directly inside LeetCode.
- **Unified Portfolio:** `/api/portfolio/{handle}` imports public LeetCode and Codeforces activity and maps them into a unified, evidence-based mastery graph.
- **Syntax Warm-up:** Static corpus of 32 real Python idioms (`frontend/public/data/typing-snippets.json`) for muscle-memory practice.

---

## 🧰 Tech Stack

| Component | Technology | Rationale |
|---|---|---|
| **Backend** | Python 3.12+, FastAPI, Uvicorn, SQLite (WAL) | High performance, native AST manipulation, typing inspection |
| **Analysis** | Python `ast`, custom NodeVisitors, heuristics | 100% deterministic, zero latency, zero token cost |
| **Sandbox** | Docker container, Linux namespaces, subprocess limits | Secure isolated execution (`--network none`, non-root) |
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS | Modern reactive workbench with fast SSR and static assets |
| **Code Editor** | Monaco Editor | VS Code-grade in-browser editor with rich syntax highlighting |
| **Extension** | Chrome Extensions API (Manifest V3) | In-situ coding assistance on LeetCode |
| **AI Layer** | Guarded OpenAI / Gemini Flash-Lite / Fallback Templates | Optional wording polish with strict LeakGuard filtering |

---

## 🚀 Getting Started

### 1. Prerequisites
- Python $\ge$ 3.12
- Node.js $\ge$ 20
- Docker (optional, automatic local sandbox fallback included)

### 2. Backend Setup
```bash
cd backend
python -m pip install -e ".[dev]"
# Or install core requirements:
python -m pip install fastapi uvicorn pydantic pyyaml httpx pytest

# Start the backend server on port 8000
python -m uvicorn codequest.api:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# The workspace is live at http://localhost:3000
```

### 4. Chrome Extension (LeetCode Companion)
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select the [`extension/`](extension/) directory.
4. Pin the CodeQuest Companion icon and open any LeetCode problem.

---

## 🧪 Verification & Test Suite

Run the full automated test suite (166 tests covering sandbox isolation, leak guard, mistake detection, and challenge validation):

```bash
cd backend
python -m pytest -v
```

To verify all 20 challenge YAML schemas and reference implementations:
```bash
python -m pytest tests/test_content.py -v
```

---

## 👥 Vortexa Hackathon Team

- **Person A (Tech Lead):** Sandbox security, API gateway, Docker runner, submission pipeline.
- **Person B (Frontend & UX):** Next.js application, Monaco workspace, results board, Quest Map.
- **Person C (Content & AI):** Challenge authoring (20 missions), AST bug detectors, hint design, typing corpus, pitch & documentation.

---

## 📄 License

MIT License. Built with ❤️ for the Vortexa Hackathon.
