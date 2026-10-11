# CodeQuest AI: Pitch Deck Outline

> Optimized for a 3–5 minute presentation + judging Q&A at Vortexa Hackathon.
> Problem Statement: **E-02 · CodeQuest AI (AI-Powered Education & Learning Technology)**

---

## Slide 1: Hook (Title & Opening)
- **Visual:** CodeQuest AI logo + headline: *"Turning Guess-and-Check Beginners into Resilient Debuggers"*.
- **Sub-tagline:** The first deterministic coding mentor that remembers your mistakes, adapts your missions, and never leaks the answer.
- **Presenter:** "70% of beginners abandon programming when they get stuck on cryptic tracebacks. The rest copy-paste from ChatGPT and never learn to debug. Today, we fix both."

## Slide 2: The Problem (The Debugging Dilemma)
- **Key Stat:** **68%** of novice submissions on LeetCode/CodeChef fail on hidden tests without informative feedback, while LLMs leak solutions **35%–61%** of the time.
- **Three Pain Points:**
  1. *Opaque Failures:* Tracebacks name Python internals, not the student's logical flaw.
  2. *Hidden Test Secrecy vs. Feedback:* Platforms either hide everything or give the game away.
  3. *Zero Memory:* No existing platform notices recurring patterns like consecutive off-by-one errors.

## Slide 3: The Solution — CodeQuest AI
- **Core Architecture:** Deterministic AST analysis + sandboxed execution + adaptive learner memory + guarded AI wording.
- **Three Core Pillars:**
  - *Per-Test Visibility:* Instant 4-verdict reporting with plain-language failure diagnosis.
  - *Never-the-Solution Hint Ladder:* Progressive 4-level hints protected by runtime Leak Guard.
  - *Mistake Memory & Adaptation:* Detects habituated bugs and prescribes targeted debugging drills.

## Slide 4: Live Demo (The 4-Minute Flow)
*(Live screen share transitioning directly into the working app)*
- **Demo Sequence:**
  1. Submitting buggy code $\to$ Discrete test cards $\to$ Plain-language variable breakdown.
  2. Hint Ladder $H_1 \to H_3$ $\to$ Solution leak attempts blocked.
  3. Mistake Memory detects recurring off-by-one $\to$ Automatically injects Debug Mission.
  4. Unified Portfolio with Codeforces/LeetCode imports + LeetCode Companion extension.
  5. Live attack in Sandbox Arena $\to$ Docker container traps the breach.
  6. Switch AI completely OFF $\to$ System remains 100% smart and deterministic.

## Slide 5: Deep-Dive: Why Nobody Else Does This
- **Comparison Matrix:**

| Feature | LeetCode | Codeforces | Exercism | ChatGPT/Copilot | **CodeQuest AI** |
|---|:---:|:---:|:---:|:---:|:---:|
| Granular 4-Class Verdicts | ⚠️ | ❌ | ⚠️ | ❌ | **✅ Yes** |
| Hidden Tests Explained without Leaking | ❌ | ❌ | ❌ | ❌ | **✅ Yes** |
| Guaranteed No-Leak Progressive Hints | ❌ | ❌ | ⚠️ | ❌ (35% leak) | **✅ Yes (LeakGuard)** |
| Recurring Mistake Memory | ❌ | ❌ | ❌ | ❌ | **✅ Yes (AST-backed)** |
| Adaptive Debugging Drills | ❌ | ❌ | ❌ | ❌ | **✅ Yes** |
| Containerized Hardened Sandbox | ✅ | ✅ | ✅ | ❌ | **✅ Yes** |
| Works with AI Switched OFF | ✅ | ✅ | ✅ | ❌ | **✅ Yes** |

## Slide 6: System Design & Technical Depth
- **AST Bug Detectors:** Custom visitor pattern analyzing AST nodes for boundary conditions, empty containers, and iteration mutation.
- **Multi-Process Judge:** Hardened container (`--network none`, read-only FS, drop all capabilities, 256MB memory cap).
- **Concept Elo & Knowledge Graph:** Multi-dimensional skill model calculating verified competence from actual test outcomes.
- **Ecosystem Integration:** Chrome Extension (Manifest V3) pairing with backend for in-situ LeetCode guidance.

## Slide 7: Feasibility, Scale & Impact
- **Educational Impact:** Shifts pedagogy from passive code generation back to active problem-solving and diagnostic debugging.
- **Cost & Scalability:** Core analysis requires zero LLM tokens. When enabled, caching and small models keep AI costs under $0.001 per student per session.
- **Safety:** Hardened multi-layer sandbox protects institutional infrastructure from untrusted learner code.

## Slide 8: What's Next (Roadmap)
- **T+1 Month:** Multi-language support (JavaScript/TypeScript and C++ AST analyzers).
- **T+3 Months:** Placement-cell and instructor dashboard for batch tracking recurring class pitfalls.
- **T+6 Months:** Browser WebAssembly runner (Pyodide) for 100% zero-latency offline practice.

## Slide 9: Team & Summary
- **Team Vortexa:**
  - Person A: Full-stack & Sandbox Security
  - Person B: Frontend UX & Workspace
  - Person C: Content, Pedagogy & Pitch
- **Closing Takeaway:** *"CodeQuest doesn't write your code. It teaches you how to think, test, and debug like a senior engineer."*
- **QR Code:** Link to Live Application & GitHub Repository.
