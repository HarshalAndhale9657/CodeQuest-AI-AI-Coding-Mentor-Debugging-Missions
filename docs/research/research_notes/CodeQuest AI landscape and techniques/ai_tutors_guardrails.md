# AI coding tutors and how they avoid giving away solutions (2023 to Oct 2026), with implications for CodeQuest AI (PS E-02)

Compiled 2026-10-11. Sources are primary papers and official docs wherever we could fetch them. Items tagged **(search-level)** come from search-result summaries we could not open in full. Items tagged **(vendor claim)** are self-reported by the company and have not been independently checked. The web-search budget ran out near the end of the session, so a few verifications are listed under Gaps instead of being resolved.

---

## Key Question 1: How do the leading AI tutors behave when a learner asks for the answer, and what guardrails are documented?

### Takeaway
Nearly every product says it "guides, doesn't give answers," but very few document a mechanism stronger than a system prompt. The ones that do, all academic (CS50.ai, CodeHelp, CodeAid), use layered pipelines: a system prompt, an input check, multiple candidates scored for code, an LLM rewrite or pseudo-code conversion, static-analysis matching, one-shot (no follow-up) interactions, and usage throttling. Consumer "study/learning modes" (ChatGPT, Claude, Gemini) are optional toggles that can be switched off. ChatGPT's is explicitly built from system instructions only.

### Cited Findings

#### Harvard CS50.ai / CS50 Duck (Liu, Zenke, Liu, Holmes, Thornton, Malan; SIGCSE 2024)
- CS50.ai runs all of CS50's AI tools: "Explain Highlighted Code" (VS Code), an enhanced style50 with an "Explain Changes" button, and the CS50 Duck chatbot in VS Code, on the web, and in the Ed forum. All of them have built-in "pedagogical guardrails" meant to guide students "rather than providing direct solutions to questions." — [CS50 paper](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf)
- Every request to GPT-4 carries a system prompt (course rules, "act as a teaching assistant for CS50") plus user-prompt templates that wrap the student query in fixed instructions. Separate YAML configurations exist per use case: CS questions, code explanation, and style feedback. — [CS50 paper](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf)
- The course also banned outside tools such as ChatGPT and GitHub Copilot while supplying its own guardrailed tools. — [CS50 paper](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf)
- Grounding uses RAG over lecture captions: text-embedding-ada-002 embeddings in ChromaDB, with the top-N caption segments added to the prompt to reduce hallucination. — [CS50 paper](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf)
- **Prompt-injection guard:** every request is checked for "atypical nonalphanumeric patterns." If that check fires, a *separate* GPT-4 call decides whether the input is an injection attack. A confirmed attack makes the system "immediately abort the current user session." The paper names the threat as "tricking GPT-4 into providing full-blown homework solutions." — [CS50 paper](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf)
- **Throttling:** each student starts with 10 "hearts" and regains one every 3 minutes, and each Duck interaction costs one heart. The stated reasons are both cost and pedagogy: it pushes students to think before asking and to take reflective breaks. Some students asked for the limit to be lifted, and the course declined. — [CS50 paper](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf)
- **Accuracy:** in Summer 2023 a staff reviewer judged 22/25 (88%) of curricular Ed answers and 30/39 (77%) of administrative ones correct. In Fall 2023 only 70 of 180 Duck answers on Ed were staff-"endorsed" (39%). The authors think this understates accuracy because Ed usage collapsed (0.28 questions per student, down from 1.1). — [CS50 paper](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf)
- **Scale and cost:** daily active users grew from about 200 (June 2023) to 1,500 (Nov 2023), with a peak of 25,000 prompts/day. Cost was about $1.90 per student per month, or $0.05 per prompt. — [CS50 paper](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf)
- **Reliance signal:** in the Fall 2023 end-of-term survey, 50% used the tools "frequently" and 28% "constantly." The authors themselves read this as "a high level of reliance." They also note that the AI "tends to exhibit a tone of complete and authoritative confidence even when wrong." — [CS50 paper](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf)

#### CodeHelp (Liffiton, Sheese, Savelka, Denny; Koli Calling 2023)
- **Pipeline:** (1) a "sufficiency check" prompt runs in parallel with the main response and asks for clarification when the query lacks information. (2) The main prompt appends "Please do not write any example code in your response," and also lists any instructor "avoid set" keywords. (3) Because "the LLMs we currently use appear to be strongly biased towards providing a complete solution ... even when the prompt requests otherwise," it generates **two completions, scores each for code blocks and avoid-set keywords, and keeps the better one**. (4) If that one still has a code block, a third "code removal" prompt rewrites it without code. An LLM does the rewrite, rather than simply deleting the block, so the remaining text still reads coherently. — [CodeHelp paper](https://arxiv.org/abs/2308.06921)
- **Models:** gpt-3.5-turbo-0301 did the sufficiency check and main response, and text-davinci-003 did code removal. The authors "could not find a prompt that reliably filtered out code when using the 'turbo' model," whereas davinci "completed this task successfully in nearly all cases." — [CodeHelp paper](https://arxiv.org/abs/2308.06921)
- **One-shot by design:** each query stands alone, with no follow-up dialogue, because the risk of incorrect or off-the-rails output "increases with additional rounds of user input and model response." — [CodeHelp paper](https://arxiv.org/abs/2308.06921)
- **Cost:** about $0.002 per query (June 2023 pricing). That puts 50 students for a full semester under $10, and the authors estimated GPT-4 would cost about 25x more (about $0.05/query). — [CodeHelp paper](https://arxiv.org/abs/2308.06921)
- **Deployment:** 52 students over 12 weeks. 95% of survey respondents wanted it in future courses. The instructor called the avoid set "critical" for keeping responses at course level, for example blocking methods the class had not yet covered. — [CodeHelp paper](https://arxiv.org/abs/2308.06921)

#### CodeAid (Kazemitabaar et al.; CHI 2024)
- **Deployment:** a 700-student class over 12 weeks, with 8,132 original plus 1,986 follow-up queries from 372 students. Features were General Question (38%), Question from Code (28%), Help Fix Code (23%), Explain Code (5.5%), and Help Write Code (4%). — [CodeAid paper](https://arxiv.org/html/2401.11314v2)
- **No-solution mechanisms:** for *Help Write Code*, the LLM writes code internally and a second call converts it to pseudo-code, so the student only sees pseudo-code. For *Help Fix Code*, a corrected version is generated internally and **a static analyzer matches lines so that only annotations, not fixed code, are shown**. — [CodeAid paper](https://arxiv.org/html/2401.11314v2)
- **Accuracy:** 79% of 1,749 coded responses were correct (74% before a mid-term update, 87% after). Help Fix Code was correct only 63% of the time (42% helpful), and Question from Code 66%. — [CodeAid paper](https://arxiv.org/html/2401.11314v2)
- **Leakage despite design:** early General/Question-from-Code answers included generic example code in 6% of cases and a 1 to 3 line solution in 2%. In a sample of 77 Help Write Code uses, 53% gave the "exact solution" of the requested behavior, in pseudo-code form, which conflicts with the stated goal. About 10% of all usages were direct requests for code. — [CodeAid paper](https://arxiv.org/html/2401.11314v2)
- **Design implications (D1 to D4):** exploit AI's unique strengths; make queries easy to write while keeping students cognitively engaged; avoid direct answers while sustaining motivation; keep the AI's responses transparent and steerable. — [CodeAid abstract](https://arxiv.org/abs/2401.11314)

#### Khanmigo (Khan Academy)
- Khan's published prompt-engineering approach has 7 steps: model the ideal tutor relationship, ground in learning science ("prompt students towards self explanation"), integrate Khan content and learner data, craft interactions with moderation guardrails, test with diverse personas, prioritize safety (NIST practices, controlled testing), and iterate on feedback. The post does **not** describe a technical answer-withholding mechanism such as a hidden solve step or an output filter. — [Khan Academy blog](https://blog.khanacademy.org/khan-academys-7-step-approach-to-prompt-engineering-for-khanmigo)
- Khan markets Khanmigo as "not an answer-generating bot" with layered hints **(vendor claim, search-level)**. — [Khan Academy blog](https://blog.khanacademy.org/?p=14335)
- Independent reviewers report that it declined to write content for a student and asked guiding questions instead, but also that hints can be too revealing (one hint "essentially provided the definition") **(search-level)**. — [Hess review](https://rickhess99.medium.com/can-an-ai-powered-tutor-produce-meaningful-results-b67d7376cb51); [AVID review](https://avidopenaccess.org/resource/khanmigo-as-an-ai-personal-tutor-and-assistant/)

#### Codecademy AI Learning Assistant
- The help center says the assistant gives "explanations of errors and concepts" in all lessons, projects, and articles. Pro/Plus subscribers get unlimited prompts and free learners get a limited number. — [Codecademy Help Center](https://help.codecademy.com/hc/en-us/articles/25489197408539-AI-Learning-Assistant-Availability)
- An "Explain code" button explains highlighted code inside the lesson **(search-level)**. — [Codecademy blog](https://www.codecademy.com/resources/blog/new-learning-environment-platform-features)
- We found no public documentation of a solution-refusal policy or filter (see Gaps).

#### Boot.dev "Boots"
- Boots "already knows the official solution, what you've been asked to do, and changes you've made to the code." He is "trained to not give you the answer" and uses the Socratic method **(vendor claim)**. — [Boot.dev lesson page](https://www.boot.dev/lessons/e4fac74c-9d67-41ad-a85c-c579cb3ad76f)
- **Economic friction:** chatting with Boots *before* completing a lesson costs 1 "baked salmon" (an in-app item) or 50% of the lesson's XP. *After* completion it is free and encouraged. — [Boot.dev lesson page](https://www.boot.dev/lessons/e4fac74c-9d67-41ad-a85c-c579cb3ad76f)
- In October 2023 Boots moved from GPT-3.5 to GPT-4 and switched to Socratic behavior "rather than just giving answers." — [Boot.dev Beat Oct 2023](https://www.boot.dev/blog/news/bootdev-beat-2023-10)

#### CodeSignal Learn "Cosmo"
- Cosmo is "trained in best practices for communicating with learners ... to problem-solve—without giving away the answer" and already knows the learner, lesson, and practice context **(vendor claim, search-level)**. — [CodeSignal Cosmo page](https://codesignal.com/cosmo)
- CodeSignal Learn launched with Cosmo in Feb 2024. — [TechCrunch](https://techcrunch.com/2024/02/08/codesignal-launches-a-learning-platform-with-an-ai-powered-guide)

#### Replit
- Replit shut down Teams for Education (2024). — [DataWars explainer](https://www.datawars.io/articles/replit-teams-for-education-deprecation-all-you-need-to-know)
- A commentator says AI features were pushed to all users by default, students included. — [Charlie Meyer blog](https://blog.charliemeyer.co/replits-existential-problem/)
- In a 2025 community thread, a teacher asked for a class-wide AI off switch. Replies (unofficial) say only a per-account AI toggle exists. — [Replit forum](https://replit.discourse.group/t/teacher-using-replit-in-public-school-need-to-disable-ai-for-entire-class-and-bring-back-blank-projects/11926)
- We found no documented tutor mode or solution guardrail.

#### GitHub Copilot in education
- Copilot is free for verified students. From 12 March 2026 it moved to a "GitHub Copilot Student" plan, under which premium models (e.g., GPT-5.4, Claude Opus/Sonnet) can no longer be selected manually but remain available through Auto mode. — [GitHub community announcement](https://github.com/orgs/community/discussions/189268); [The Register](https://www.theregister.com/2026/03/13/microsoft_github_removes_models_student_plan/)
- We found no Copilot "learning mode" or teacher-facing solution guardrail in our search results (see Gaps). Copilot is a code generator, not a tutor.

#### JetBrains Academy / Hyperskill AI hints
- In the JetBrains Academy plugin, learners click "Get Hint." Each hint is a text explanation of a possible next move plus a code diff preview in the IDE. Uses are suggesting the next logical step, fixing compilation errors, and passing failing tests. Python and Kotlin are supported. Hints "combine static code analysis from your IDE with the power of large language models." JetBrains warns the hints "may occasionally be incomplete or inaccurate." — [JetBrains blog, June 2025](https://blog.jetbrains.com/education/2025/06/02/ai-hints-plugin/)
- **Underlying research:** a three-stage chain-of-thought pipeline (generate subgoals, then code for the *next subgoal only*, then text describing that step). **Static analysis controls the size and quality of the generated code hint.** It was evaluated with experts and then 14 students, and both text and code hints helped students keep progressing. — [Birillo et al., Koli Calling 2024](https://arxiv.org/abs/2410.09268)

#### Python Tutor AI chat (Philip Guo, launched around Jan 2025)
- The prompt automatically includes the learner's code, error message, line numbers, and runtime state. A dropdown offers canned questions such as "What does this error message mean?" — [Guo, O'Reilly Radar case study (copy)](https://par.nsf.gov/servlets/purl/10618667)
- Guo first tried self-hosted Llama 1B/3B with Ollama and was "dismayed ... at how often the 1B and 3B models produced incorrect explanations." 8B was "still not amazing." He launched on Llama 3.3 70B via OpenRouter ($0.42 per 1M tokens, versus $0.04 for 3B). — [Guo case study](https://par.nsf.gov/servlets/purl/10618667)
- **Cost controls:** capped input and conversation length (also "to reduce hallucinations since smaller LLMs tend to go 'off the rails' as conversations grow longer") and one chat per user per minute. The result was about 2,000 queries/day for under $1/day. — [Guo case study](https://par.nsf.gov/servlets/purl/10618667)
- Guo's rule of thumb: "a short, direct, and simple system prompt with a larger LLM will beat elaborate system prompts with a smaller LLM." The article describes no solution-withholding guardrail. — [Guo case study](https://par.nsf.gov/servlets/purl/10618667)

#### ChatGPT Study Mode (OpenAI, launched 29 July 2025)
- It is built from "custom system instructions" written with teachers, scientists, and pedagogy experts, not a new model. OpenAI acknowledges this "may lead to inconsistent behavior" and plans to train the behavior into core models. — [InfoQ](https://www.infoq.com/news/2025/08/study-mode-chatgpt); [OpenAI Help Center](https://help.openai.com/en/articles/11780217-using-study-mode)
- The system prompt was extracted on launch day. Its top rule is "Above all: DO NOT DO THE USER'S WORK FOR THEM." It also says "Don't answer homework questions — help the user find the answer, by working with them," and "be brief." Willison notes OpenAI "mostly don't seem to try to prevent their system prompts from being revealed." — [Simon Willison](https://simonwillison.net/2025/Jul/29/openai-introducing-study-mode)
- Study mode is a user-selectable option, i.e., the learner can simply not use it. Help-center versions conflict on whether it works in Temporary Chats; the newer one says it is not available in Temporary Chats, GPTs, or Projects **(search-level)**. — [OpenAI Help Center](https://help.openai.com/en/articles/11780217-using-study-mode)

#### Claude learning modes (Anthropic)
- A "Learning" style in claude.ai's style menu guides users to their own solution instead of answering outright. It began in Claude for Education (Apr 2025) and reached all users in Aug 2025. — [Engadget](https://engadget.com/ai/anthropic-brings-claudes-learning-mode-to-regular-users-and-devs-170018471.html); [Tom's Guide](https://www.tomsguide.com/ai/claudes-new-learning-modes-take-on-chatgpts-study-mode-heres-what-they-do)
- Claude Code has "Explanatory" and "Learning" output styles. In Learning, Claude periodically stops and leaves a TODO for the user to write 5 to 10 lines themselves. — [Tom's Guide](https://www.tomsguide.com/ai/claudes-new-learning-modes-take-on-chatgpts-study-mode-heres-what-they-do)
- Anthropic's own skill-formation study points to these modes, and to ChatGPT Study Mode, as designs that support learning. — [Anthropic research](https://www.anthropic.com/research/AI-assistance-coding-skills)

#### Gemini Guided Learning (Google, Aug 2025)
- Built on LearnLM, Google's pedagogy-tuned model family. It breaks problems down step by step and adapts explanations, with multimodal aids and quizzes. — [Google blog](https://blog.google/outreach-initiatives/education/guided-learning/); [Maginative](https://www.maginative.com/article/google-launches-guided-learning-for-gemini-joining-the-ai-tutor-arms-race/)
- An independent benchmark (Key Question 2) found LearnLM models leak solutions very rarely (0.9 to 2.6%) but also produced very small student solve-rate gains. — [Dinucu-Jianu et al. 2025](https://arxiv.org/html/2505.15607v2)

#### Coursera Coach
- A "Help Me Practice" mode uses probing questions and gives feedback on the learner's own answers so they reach conclusions themselves. — [Coursera blog](https://blog.coursera.org/coursera-coach-providing-essential-learner-support)
- We found no official statement on how Coach handles graded-assessment questions (see Gaps).

### Inferences
- Every documented production guardrail beyond prompting is **post-generation and deterministic-plus-LLM**: code-block detection and scoring (CodeHelp), pseudo-code conversion and static line matching (CodeAid), static-analysis size control (JetBrains), and a pattern prefilter plus LLM classifier (CS50). None trusts the system prompt alone. CodeHelp's authors state outright that the models were "strongly biased" toward full solutions.
- Friction is a deliberate design tool, not a bug: hearts (CS50), salmon/XP cost (Boot.dev), one message per minute (Python Tutor), and limited prompts on free plans (Codecademy). It controls cost and reduces help abuse.
- Consumer modes (ChatGPT, Claude, Gemini) are opt-in and switchable. For an assessment-like practice environment, the guard has to live in *our* pipeline, not in a provider's mode.
- Products that give the LLM the official solution (Boot.dev, and research systems such as Phung et al.) get better-targeted hints but raise leak risk. That trade-off is where CodeQuest's deterministic layer should sit.

### Gaps
- No vendor (Khan, Codecademy, Boot.dev, CodeSignal, Coursera, JetBrains) publishes a measured leakage rate or a technical description of its filter. Their "won't give answers" claims are unverified.
- We could not verify CodeSignal's free-tier "energy" limits (reported in search results: five bars, one per question, recharging every four hours). We could not pin the source page.
- Coursera Coach's behavior on graded items, GitHub Copilot org/teacher controls in classrooms, and Hyperskill-specific AI features (beyond the JetBrains plugin) were not found. Search budget was exhausted before follow-up.
- CS50's 2025 to 2026 follow-up publications (e.g., their SIGCSE 2025/2026 work) were not retrieved.

---

## Key Question 2: What do empirical studies report on LLM help for novices? (accuracy, solution leakage, hallucination, learning vs over-reliance)

### Takeaway
LLM diagnoses of novice bugs are useful but unreliable on their own:
- **Accuracy:** roughly 48 to 90% depending on task and model, with high false-positive rates. Small models are much worse.
- **Leakage:** "don't give the answer" instructions leak at substantial rates (29 to 61% for prompted open models, 35% for GPT-4o in one benchmark). Under adversarial learners, even pedagogically tuned tutors leak 70 to 83%.
- **Learning:** unrestricted AI help raises practice scores but can *lower* later independent performance (−17% exam; −17 points on a skill quiz). Guardrailed tutors remove most of that harm but rarely show learning *gains*, and benefits often vanish once help is removed.

### Cited Findings

#### Accuracy and hallucination of explanations and hints
- **Hellas et al., ICER 2023** (GPT-3.5 vs Codex on real help requests): GPT-3.5 found at least one actual issue in 90% of cases but all issues in only 57%. False positives were common (about 40% for GPT-3.5). It did better on program logic than output formatting, and "model solutions were frequently provided even when the LLM was prompted not to." — [Aalto summary](https://research.aalto.fi/en/publications/exploring-the-responses-of-large-language-models-to-beginner-prog/); [arXiv 2306.05715](https://arxiv.org/abs/2306.05715)
  - The abstract also reports that non-English prompts gave only slightly worse responses. This is from our recollection of the abstract and was not re-fetched.
- **Leinonen et al., SIGCSE 2023** (Codex explaining Python error messages): an explanation was produced for 84% of inputs, but only 57% of those were correct (48% of all inputs). 88% were comprehensible. Fixes appeared in 70% of outputs, but only 47% of those were correct (33% of all inputs). Results were better at temperature 0. The authors judged LLM explanations "not yet ready for production" and suggested a two-step system that picks between LLM and traditional support by error type and code complexity. — [Leinonen et al.](https://arxiv.org/abs/2210.11630)
- **CS50 Duck:** 88% of curricular answers correct (Summer 2023); 39% staff-endorsed in Fall 2023 (likely understated). — [CS50 paper](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf)
- **CodeAid:** 79% correct overall, but "Help Fix Code" (debugging) only 63%. — [CodeAid paper](https://arxiv.org/html/2401.11314v2)
- **Hints-In-Browser (Kotalwar, Gotovos, Singla; NeurIPS 2024 D&B):** the hint is "good" only if it is correct, informative, *conceals the solution (HConceal)*, and is comprehensible.

  | Model | Good hints |
  |---|---|
  | GPT-4 | 89% |
  | GPT-3.5 | 34% |
  | Llama-3-8B base / fine-tuned | 36% / 77% |
  | Llama-3-8B 4-bit in-browser, base / fine-tuned | 21% / 64% |
  | Phi-3-3.8B base / fine-tuned | 27% / 51% |
  | Phi-3-3.8B 4-bit in-browser, base / fine-tuned | 8% / 36% |

  — [Hints-In-Browser](https://arxiv.org/html/2406.05053v2)
- **Python Tutor (practitioner report):** 1B/3B local models often gave incorrect explanations and 8B was "still not amazing." — [Guo case study](https://par.nsf.gov/servlets/purl/10618667)

#### Validation raises precision (at the cost of coverage)
- **PyFiXV (Phung et al., EDM 2023):** Codex generates a syntax-error fix plus explanation. A **run-time validation mechanism decides whether the feedback is suitable to show**, giving educators a "precision knob" that trades coverage for precision. — [Phung et al. 2023](https://arxiv.org/abs/2302.04662)
- **GPT4Hints-GPT3.5Val (Phung et al., LAK 2024):**
  - GPT-4 writes hints using symbolic information (failing test cases and fixes) in the prompt.
  - GPT-3.5 then acts as a simulated *student* that tries to fix the program using the hint. Hints that don't help it are rejected.
  - Reported precision is around 95%, comparable to human-tutor hints, with coverage above 70% on three datasets. These figures are **(search-level)** and not verified against the tables. — [Phung et al. 2024](https://arxiv.org/abs/2310.03780)

#### Measured solution leakage despite instructions
- **Dinucu-Jianu et al. 2025** (math tutoring dialogues, LLM judge, 500 held-out problems). Leak rate = share of conversations where the tutor gives away the solution; Δ solve = student solve-rate gain:

  | Model | Leak rate | Δ solve |
  |---|---|---|
  | Qwen2.5-7B-Instruct (prompted not to reveal) | 29.3% | 11.3 |
  | Qwen2.5-72B-Instruct | 61.0% | 38.7 |
  | GPT-4o-2024-11-20 | 35.2% | 33.1 |
  | DeepSeek V3 | 46.6% | 39.3 |
  | SocraticLM | 40.4% | — |
  | LearnLM 1.5 Pro | 2.6% | 1.5 |
  | LearnLM 2.0 Flash | 0.9% | 4.3 |
  | Their RL-tuned 7B, λ=0 (no leak penalty) | 89.5% | 36.2 |
  | Their RL-tuned 7B, λ=0.75 | 10.6% | 25.3 |
  | Their RL-tuned 7B, λ=1.5 | 5.4% | 21.2 |

  - The authors conclude "even with engineered prompts, standard LLMs are inherently optimized for answering."
  - Letting the tutor "think" in hidden tags gave mixed results and could *increase* leakage, because the tutor solves the problem itself.

  — [Dinucu-Jianu et al.](https://arxiv.org/html/2505.15607v2)
- **Zhao, Knežević, Käser, ACL 2026** (adversarial students; GSM8K main, HumanEval in appendix). Leakage was judged by a regex prefilter plus a Llama-3.1-70B judge. **For code, leakage is checked by running the official tests on code extracted from the tutor's reply.**
  - *Manually written attacks:* Qwen-7B leaked 75%, Qwen-32B 46%, Llama-8B 40%.
  - *A fine-tuned adversarial student:* 34 to 82% leakage on standard models, and 70 to 83% on "pedagogically aligned" tutors (TutorRL-7B 83%, SocraticLM 70%, MathDial-SFT 70%).
  - *Most effective techniques:* persuasive ones beat adversarial ones. Contextual manipulation 74%, interpersonal influence 67%, request shaping 66%, intentional wrong answer 64%, direct request 50%, emotional threat 47%.
  - *Defenses:*
    - A "reasoning tutor" that writes a pedagogical reason in a JSON field before answering.
    - A multi-agent tutor, in which a judge flags leaks and a refiner rewrites them.
    - Effect: Qwen-32B dropped 46% → 2 to 4% (manual attacks) and 70% → 3 to 4% (fine-tuned attacker); Qwen-72B dropped 80% → 8%.
    - The small Qwen-7B stayed high (82% → 61% multi-agent, 38% reasoning).

  — [Zhao et al.](https://arxiv.org/html/2604.18660v1)
- **CodeHelp and CodeAid** (see Key Question 1) document the same bias toward full solutions in classroom deployments. — [CodeHelp](https://arxiv.org/abs/2308.06921); [CodeAid](https://arxiv.org/html/2401.11314v2)

#### Learning outcomes vs over-reliance
- **Bastani et al., PNAS 2025** (about 1,000 Turkish high-school math students):
  - GPT Base (ChatGPT-like) raised practice performance by 48%, but students did **17% worse** on the later unassisted exam than the control group.
  - GPT Tutor (teacher input; hints instead of answers) raised practice performance by 127%, and exam performance was about the same as control.
  - In short, the guardrails removed the harm but showed no learning gain.

  — [Wharton Knowledge](https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education); [PNAS record](https://ideas.repec.org/a/nas/journl/v122y2025pe2422633122.html)
- **Bassner, Lenk-Ostendorf, Beinstingel, Wasner, Krusche (TUM), Computers & Education: AI, Dec 2025** (275 students). The study had three arms: an AI tutor that gives calibrated hints but withholds full solutions, unrestricted ChatGPT, and a no-AI control. Both AI arms scored higher on the exercise, but gains did **not** carry over to conceptual understanding or code comprehension. AI lowered frustration and cognitive load. Only the tutor raised intrinsic motivation; unrestricted use produced a "comfort trap" **(summary-level; full text blocked)**. — [TUM EdTech summary](https://www.edtech.tum.de/?p=3520)
- **Zhou, Pankiewicz, Paquette, Baker, ICCE 2025** (randomized controlled trial, 257 CS1 students). Students got GPT-4 (gpt-4-0613) compiler-error feedback on 72 of 141 tasks, giving 43,795 submissions. Feedback improved scores and solve likelihood and reduced "wheel spinning" (repeated attempts without progress). But "almost all the benefits ... were no longer present when the LLM feedback was disabled." — [Zhou et al.](https://learninganalytics.upenn.edu/ryanbaker/ICCE2025_paper_28.pdf)
- **Pankiewicz & Baker, ITiCSE 2024** (GPT-4 compiler-error hints in C#). Students showed higher focus and lower "confrustion" (combined confusion and frustration). Performance was mixed while hints were on. With hints *off*, the experimental group outperformed control on 5 of 6 error types. This **conflicts** with the ICCE 2025 result on persistence of benefits. — [Pankiewicz & Baker](https://arxiv.org/abs/2403.12737)
- **Shen & Tamkin (Anthropic), Jan 2026** (randomized controlled trial; 52 developers learning the Python async library Trio). The AI group scored 50% on the follow-up quiz versus 67% for hand-coders (Cohen's d = 0.738, p = 0.01). The largest gap was on **debugging** questions, and the AI group was not significantly faster. Participants who used AI only for conceptual questions scored ≥65%, while those who delegated code generation or used AI for iterative debugging scored <40%. — [Anthropic research](https://www.anthropic.com/research/AI-assistance-coding-skills)
- **Kazemitabaar et al., CHI 2023** (69 learners aged 10 to 17, Codex access). Codex gave 1.15x completion and 1.8x scores on authoring tasks, with no loss on manual code-modification tasks. One-week retention was slightly higher but not significant. Learners with more prior knowledge benefited most. — [Kazemitabaar et al. 2023](https://arxiv.org/abs/2302.07427)
- **Kazemitabaar et al., Koli Calling 2023** (self-paced; 33 learners). A "Hybrid" usage pattern (writing code yourself and using AI for parts) trended positively with post-test scores. The "AI Single Prompt" pattern (asking for the whole solution at once) trended negatively **(search-level)**. — [ACM](https://dl.acm.org/doi/fullHtml/10.1145/3631802.3631806)

### Inferences
- Error-explanation accuracy in the 48 to 88% range means a deterministic classifier should decide *what is wrong*. Examples are the Python exception type and line, or which test category failed. The LLM should at most rephrase a known-correct diagnosis.
- Leakage is the *default* behavior of instruction-following LLMs. Even GPT-4o-class models leak about a third of the time, and pedagogically fine-tuned models can be talked into leaking by persuasive learners. A leak guard must be *external* to the generating model, and on code tasks it should be **executable** (run the tests against any code in the hint), following the Zhao et al. method.
- Small models make the problem worse on every axis: lower hint quality, and they resisted defenses least (Qwen-7B stayed at 38 to 61% leakage). The cheapest models are fine as *rephrasers* of vetted text, not as *authors* of hints.
- The learning-outcome evidence argues for fading support (benefits vanished when feedback was removed) and for privileging conceptual and Socratic help over code-level help (Anthropic's conceptual-inquiry finding). It also supports measuring unassisted performance: mastery should be credited only on attempts without bottom-level hints.

### Gaps
- Prather et al., ICER 2024, "The Widening Gap" (metacognitive harms for struggling novices) could not be verified before the search budget ran out.
- Phung et al. ICER 2023 (GPT-4 vs human tutors across scenarios) quantitative results were not retrieved.
- We found no study that measures hint leakage specifically for *Python practice-platform hints* with a published leak rate. The closest are Zhao et al.'s HumanEval appendix and Hints-In-Browser's HConceal attribute.
- The Bastani GPT Tutor prompt specifics (whether teacher solutions were embedded) are not stated in the Wharton summary.

---

## Key Question 3: Which techniques make AI hints safe and progressively specific?

### Takeaway
The proven building blocks are:
- an explicit hint ladder, from general guidance down to concrete but partial help;
- next-step (subgoal) scoping;
- grounding the generator in symbolic facts (failing tests, a known fix);
- automatic validation before showing a hint (run-time checks or a simulated-student check);
- code-detection plus rewrite or pseudo-code conversion;
- course "avoid sets";
- a separate judge or refiner for leakage.

Natural-language-only hints are often too vague for novices at the syntax and next-step level, so the ladder needs concrete lower rungs, carefully capped below the full solution.

### Cited Findings
- **Multi-level hints:** Xiao, Hou and Stamper's think-aloud study (CHI EA 2024, 12 novices) used the "LLM Hint Factory," with four hint levels running from general natural-language guidance to concrete code assistance. High-level NL hints alone were often unhelpful or even misleading, especially for next-step and syntax problems. Adding lower-level hints (code examples with inline comments) supported students better. — [Xiao et al.](https://arxiv.org/abs/2404.02213)
- **Next-step scoping plus static analysis:** generate subgoals, then code for only the *next* subgoal, then a textual hint. Static analysis bounds the size and quality of the code part. — [Birillo et al.](https://arxiv.org/abs/2410.09268); [JetBrains blog](https://blog.jetbrains.com/education/2025/06/02/ai-hints-plugin/)
- **Symbolic grounding plus simulated-student validation:** feed failing test cases and a fix into the hint generator, then check whether a weaker model can use the hint. Hints are shown only if they pass, which raises precision at some cost in coverage. — [Phung et al. 2024](https://arxiv.org/abs/2310.03780); [Phung et al. 2023](https://arxiv.org/abs/2302.04662)
- **Code suppression pipeline:** best-of-2 generation scored on code blocks and avoid-set words, then an LLM rewrite to remove code. The instructor avoid set blocks constructs not yet taught. — [CodeHelp](https://arxiv.org/abs/2308.06921)
- **Hidden solution, shown abstraction:** generate code internally, then show only pseudo-code (Help Write Code) or only line annotations located by a static analyzer (Help Fix Code). — [CodeAid](https://arxiv.org/html/2401.11314v2)
- **Leak judging method:** a cheap rule-based prefilter (regex/digit match) followed by an LLM judge. For code, correctness of code extracted from the reply is checked by running the official tests. Two defenses then cut leakage sharply for mid-to-large models: a pedagogical "reason" field generated before the reply, and a judge-plus-refiner second agent. — [Zhao et al.](https://arxiv.org/html/2604.18660v1)
- **Training-time option (not hackathon-feasible):** RL with an explicit leak penalty λ moves the tutor along a helpfulness/leakage frontier. For example, leakage fell from 89.5% to 5.4% while Δ solve dropped from 36.2 to 21.2. — [Dinucu-Jianu et al.](https://arxiv.org/html/2505.15607v2)
- **Hint-quality rubric usable as acceptance criteria:** correct, informative, *concealing* ("not too detailed, so the learner must still reason out the fix"), and comprehensible. — [Hints-In-Browser](https://arxiv.org/html/2406.05053v2)
- **Socratic framing in products:** questions instead of answers (Boot.dev, Khanmigo, Cosmo, Coursera "Help Me Practice," ChatGPT Study Mode's "guide users, don't just give answers"). — [Boot.dev](https://www.boot.dev/lessons/e4fac74c-9d67-41ad-a85c-c579cb3ad76f); [Khan blog](https://blog.khanacademy.org/khan-academys-7-step-approach-to-prompt-engineering-for-khanmigo); [Coursera blog](https://blog.coursera.org/coursera-coach-providing-essential-learner-support); [Simon Willison](https://simonwillison.net/2025/Jul/29/openai-introducing-study-mode)
- **Classic intelligent-tutoring caveat on hint ladders:** students "game the system" by clicking rapidly through hint levels to reach the final "bottom-out" hint that says exactly what to type. A LearnLab summary of Aleven et al. 2006 reports hint abuse on 36% of actions, or 14% when rapid sequences are counted as one **(secondary source)**. — [LearnLab wiki: Help abuse](https://learnlab.org/research/wiki/index.php/Help_abuse); gaming definition in [Zhang, Borchers, Baker, LAK 2026](https://arxiv.org/abs/2601.04487)

### Inferences
- **Proposed CodeQuest ladder (each rung is authored or generated offline, then vetted, per challenge, so the deterministic engine can always serve it without an LLM):**
  - **L1 Orient:** restate the goal, or point at the relevant concept, e.g., "think about what happens when the list is empty."
  - **L2 Locate:** the failing *behavior category*, never the hidden input itself. For example: "a hidden test with an empty input raised IndexError," or "your output is off by one element at the end."
  - **L3 Strategy:** the subgoal or plan for the next step only, in prose or a Socratic question.
  - **L4 Scaffold:** a partial structure, such as a pseudo-code skeleton for the *next subgoal* or a fill-in-the-blank line. **It is capped so that splicing it into the learner's code still fails at least one hidden test** (executable check).
  - **There is no L5 "bottom-out" rung.** The PS forbids revealing the complete solution, and the gaming literature shows bottom-out hints are where abuse concentrates.
- Prefer a **"next-step-only + executable check"** cap over text-similarity thresholds. Studies validate hints by *running* things (PyFiXV, the Phung simulated student, Zhao's test execution), and our platform already has a sandbox and hidden tests.
- An avoid set can be derived automatically per challenge: identifiers, literals, and API calls present in the reference solution but *not* in the starter code or problem statement. Any hint containing them is suspicious. This is an inference adapted from CodeHelp's instructor avoid set.

### Gaps
- We found no published, validated threshold for text-to-code similarity (e.g., n-gram or AST overlap between hint text and reference solution) as a leak detector. The search budget ran out before a dedicated search. Treat any similarity threshold as a heuristic to be tuned on our own challenges.
- Formal hint-level taxonomies from the programming-feedback literature (e.g., Keuning, Jeuring and Heeren's feedback classification; Aleven et al.'s help-seeking model) were not fetched this session.

---

## Key Question 4: Known failure modes and attacks (jailbreaks, injection via code comments, gaming, cost and latency)

### Takeaway
The realistic threats to a tutor are mostly not exotic jailbreaks:
- **Persuasive requests:** framing, social pressure, deliberately wrong answers. These defeat prompt-only guards most often.
- **Injection hidden in the learner's own submission:** comments, strings. This is the same vector already shown against LLM graders.
- **Hint-ladder gaming:** clicking through to the most specific hint.

General-purpose guard models trade off badly in education: high false positives (NeMo Guardrails flagged 16% of legitimate requests) or high bypass (Prompt Guard was bypassed 38% of the time). Domain-specific, layered, deterministic-first guards do better. Cost and latency are real but manageable with throttling, short contexts, and caching.

### Cited Findings
- **Persuasion beats "hacking":** contextual manipulation (74% leak), interpersonal influence (67%), and request shaping (66%) out-performed direct requests (50%) and emotional threats (47%) against LLM tutors. A fine-tuned adversarial student extracted answers 70 to 83% of the time even from pedagogically aligned tutors. — [Zhao et al., ACL 2026](https://arxiv.org/html/2604.18660v1)
- **Prompt-injection families in tutors:** instruction override ("ignore previous instructions," give the full solution), role hijacking, format bypass (answer inside JSON or code blocks), multi-turn escalation, and prompt exfiltration **(search-level description of the paper)**.
  - The abstract compares a domain-specific multi-layer pipeline (deterministic pattern filters, structural validation, contextual sandboxing, session-level behavioral checks) against general guards:

    | Defense | Bypass rate | False-positive rate | Latency |
    |---|---|---|---|
    | Multi-layer pipeline | low (no figure) | 0% | "optimized" (no figure) |
    | NeMo Guardrails | 0% | 16.22% | ~1.5 s |
    | Llama Prompt Guard | 38.48% | 3.60% | not reported |

  — [Maiorano, arXiv 2605.06669](https://arxiv.org/abs/2605.06669)
- **CS50's production defense:** a cheap pattern check, an independent LLM classification call only when it fires, and session abort on a confirmed attack. — [CS50 paper](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf)
- **CodeGuard (Raihan et al., Jan 2026):**
  - It defines 20 "unsafe" prompt types for CS education, including *Graded-Solution Request*, *Autograder Submission Code*, *Exam Cheat Sheet Generation*, and *Unauthorized Debugging for Credit*.
  - On their 8,000-prompt set, **none of the evaluated off-the-shelf guardrails exceeded 0.65 F1.** These included GPT-4o, Claude 3.7 Sonnet, Llama Guard, NeMo Guard, Gemma 3 27B, and Magistral.
  - Their **PromptShield**, a fine-tuned RoBERTa-base (125M parameters) that trained in 37 minutes on one GPU, reached **0.93 F1**.
  - The abstract also says CodeGuard "reduces potentially harmful or policy-violating code completions by 30-65% without degrading performance on legitimate educational tasks."
  - Takeaway from the paper: "General-purpose safety filters overlook many classroom-specific infractions."

  — [CodeGuard](https://arxiv.org/abs/2602.02509)
- **Injection via submissions (grading analog):** students can embed instructions inside "seemingly regular assignment submissions" to manipulate LLM graders **(search-level)**, and "current LLM-based [automatic grading] systems remain highly vulnerable to PI attacks." — [Education Sciences 2025 (Milani, Franzoni, Florindi et al.)](https://iris.unimore.it/retrieve/62927f50-12fc-4bfe-9d71-f780e4b9a196/education-15-01419.pdf); [Li et al., arXiv 2606.03090](https://arxiv.org/abs/2606.03090)
- **Gaming the hint ladder:** rapid repeated help requests and clicking through to the bottom-out hint are classic "help abuse" behaviors linked to poorer learning in intelligent tutoring systems. — [LearnLab wiki](https://learnlab.org/research/wiki/index.php/Help_abuse)
- **Dialogue drift:** the risk of wrong, harmful, or off-the-rails replies grows with conversation length. CodeHelp made every query one-shot, and Python Tutor caps conversation length partly to curb small-model hallucination. — [CodeHelp](https://arxiv.org/abs/2308.06921); [Guo case study](https://par.nsf.gov/servlets/purl/10618667)
- **Over-confidence:** wrong answers delivered with "complete and authoritative confidence," plus student over-trust (69% "very" or "generally" confident in accuracy). — [CS50 paper](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf)
- **Cost and latency data points:**

  | System | Cost | Latency |
  |---|---|---|
  | CS50 | $0.05/prompt; ~$1.90 per student per month (GPT-4, 2023) | — |
  | CodeHelp | ~$0.002/query (gpt-3.5-turbo, 2023) | — |
  | Python Tutor | <$1/day for ~2,000 queries (Llama 3.3 70B via OpenRouter) | — |
  | Hints-In-Browser, GPT-4 | ~$0.057/hint | 34 s |
  | Hints-In-Browser, GPT-4o mini | ~$0.001/hint | 15 s |
  | Hints-In-Browser, in-browser 8B (fine-tuned) | — | 28 s (Apple M3 Max) to 624 s (RTX 2060) |
  | NeMo Guardrails | — | ~1.5 s added per request |

  — [CS50](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf); [CodeHelp](https://arxiv.org/abs/2308.06921); [Guo](https://par.nsf.gov/servlets/purl/10618667); [Hints-In-Browser](https://arxiv.org/html/2406.05053v2); [Maiorano](https://arxiv.org/abs/2605.06669)

### Inferences
- Since persuasive, benign-looking requests are the top threat, **input classification alone cannot stop leakage**. The decisive control is an **output-side** guard that judges *what is about to be shown*, regardless of how the request was phrased.
- **Learner code is untrusted input.** Before code goes into any LLM prompt, strip comments and docstrings and truncate or neutralize string literals. Wrap the code in clearly delimited data blocks. Never let text from the learner's code become instructions. This is inferred from the grading-injection literature and the CS50 threat model.
- **Prefer constrained UI over free chat.** Offer buttons such as "Explain my error," "Next hint," and "Ask me a question," and make each LLM call one-shot. This removes multi-turn escalation and role-play vectors at little pedagogical cost (CodeHelp precedent).
- **Hint gaming is handled by the deterministic engine, not the LLM:**
  - unlock the next rung only after a *new, changed* submission;
  - apply cooldowns (CS50 hearts, Python Tutor one per minute);
  - charge "mastery credit" for hint use (Boot.dev's XP cost is a precedent);
  - log rapid-request patterns as a learner-model signal.
- Latency budgets matter for a live demo. Even API hints took 15 to 34 s in the research setup, though that pipeline was heavier than a short rephrase. A hard timeout with a fallback to the deterministic text is essential.

### Gaps
- The Maiorano paper's full per-attack-family success rates and the multi-layer pipeline's exact bypass rate and latency were not retrieved (abstract only).
- No study found specifically measures injection through *code comments* against a programming tutor (as opposed to graders). The risk is inferred by analogy.
- CodeGuard's PromptShield is trained for a broad unsafe/irrelevant taxonomy. Its precision on "give me the solution" phrasings in Python practice contexts is unknown.

---

## Key Question 5: Cost, latency and free-tier options in Oct 2026 for small LLMs that rephrase explanations or add Socratic hints

### Takeaway
The free tiers all still exist but are tighter, and several no longer publish numbers on their docs pages:
- **Gemini:** limits are now only visible in AI Studio.
- **Groq:** its docs table is labeled as Developer-plan limits.
- **OpenRouter:** free models are capped at 50 requests/day unless you have bought ≥10 credits.
- **Cerebras:** a 30-day, $5 trial.

Research is consistent that **small local models (1 to 8B) are poor hint *authors*** without fine-tuning. They are acceptable only for constrained rephrasing of text the deterministic engine has already verified, and even then they need the output guard.

### Cited Findings
- **Google Gemini API (fetched 2026-10-11):**
  - The rate-limits page (last updated 2026-10-09) no longer lists free-tier RPM/TPM/RPD values. It says "View your active rate limits in AI Studio," and RPD quotas reset at midnight Pacific time. — [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
  - The pricing page (last updated 2026-10-09) shows a free tier for, among others, Gemini 2.5 Flash, 2.5 Flash-Lite, 3.1 Flash-Lite, 3.5 Flash-Lite, 3.6 Flash, 3.8 Flash, 3 Flash Preview, and Gemma 4. It also lists 2.5 Pro as free, which **conflicts** with third-party reports that Pro models went paid-only in 2026.
  - Paid prices: 2.5 Flash-Lite $0.10 / $0.40 per 1M (in/out); 3.1 Flash-Lite $0.25 / $1.50; 2.5 Flash $0.30 / $2.50.
  - **Free-tier content is used to improve Google's products.**

  — [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing); conflicting third-party: [agentdeals.dev](https://agentdeals.dev/gemini-api-pricing-changes)
  - Third-party trackers disagree on 2026 daily caps for Flash, ranging from about 100 to 250 RPD (some older guides say about 1,500). These are unverified. — [yingtu.ai](https://yingtu.ai/en/blog/google-gemini-api-free-tier-limits-2026); [agentdeals.dev](https://agentdeals.dev/gemini-api-pricing-changes)
  - Gemini exposes an OpenAI-compatible endpoint, `https://generativelanguage.googleapis.com/v1beta/openai/` (beta), which supports structured JSON output. `reasoning_effort` maps to thinking levels, and "none" disables thinking only on 2.5 models. — [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)
- **Groq (fetched 2026-10-11):**
  - The rate-limit table lists, for example:

    | Model | RPM | RPD | TPM | TPD |
    |---|---|---|---|---|
    | openai/gpt-oss-20b and gpt-oss-120b | 30 | 1K | 8K | 200K |
    | qwen/qwen3.8-27b | 30 | 1K | 8K | 200K |
    | meta-llama/llama-prompt-guard-2-22m / 86m (injection classifiers) | 30 | 14.4K | 15K | 500K |

  - The page text says "the limits shown below are the base limits for the Developer plan." It also has a separate "Free Plan Limits" tab whose values we could not read.
  - Exceeding a limit returns 429 with `retry-after`.

  — [Groq rate limits](https://console.groq.com/docs/rate-limits)
  - Groq is OpenAI-SDK compatible via `https://api.groq.com/openai/v1`. Unsupported fields are `logprobs`, `logit_bias`, `top_logprobs`, `messages[].name`, and `n` > 1. — [Groq OpenAI compatibility](https://console.groq.com/docs/openai)
- **OpenRouter:** `:free` models allow 20 RPM. The daily cap is **50 requests/day** if you have bought fewer than 10 credits in total, and 1,000/day with ≥10 credits purchased. Exceeding returns 429. — [OpenRouter limits](https://openrouter.ai/docs/api-reference/limits)
- **Cerebras:** the Free Trial gives **$5 credits that expire 30 days after grant**. gpt-oss-120b and qwen-3.8-27b are limited to 5 RPM, 30K uncached TPM, and 1M tokens/day. — [Cerebras rate limits](https://inference-docs.cerebras.ai/support/rate-limits)
- **Ollama local models (library as of 2026-10-11):**
  - General: qwen3 (0.6/1.7/4/8B), gemma3 (270M/1/4B), llama3.2 (1/3B), phi4-mini (3.8B), granite4 (350M/1/3B), qwen2.5 (0.5 to 7B).
  - Code: qwen2.5-coder (0.5/1.5/3/7B), codegemma (2/7B), deepseek-coder (1.3/6.7B).

  — [Ollama library](https://ollama.com/library)
- **Local quality and latency evidence:** without fine-tuning, 4-bit in-browser Llama-3-8B produced good hints 21% of the time and Phi-3-3.8B 8%. Fine-tuning on GPT-4 synthetic data raised these to 64% and 36%. Hints took 20 to 129 s on Apple laptops, and 4.2 GB / 2 GB downloads were needed. — [Hints-In-Browser](https://arxiv.org/html/2406.05053v2) Guo found 1B/3B models frequently wrong and moved to a hosted 70B model. — [Guo case study](https://par.nsf.gov/servlets/purl/10618667)

### Inferences
- For a 24h hackathon demo, **don't make a local Ollama model the primary path.** Setup time, laptop latency, and quality all argue against it. Keep it as an offline "it still works with no internet" fallback only for *rephrasing* verified template text, with the output guard on.
- **Groq's free gpt-oss-20b**, if the free plan matches the table's 8K TPM and 200K TPD, yields only about 4 calls/minute and about 114 calls/day at roughly 1,750 tokens per call. That is enough for a judged demo but not for load. Splitting traffic across models with separate quotas multiplies it.
- **Gemini Flash-Lite free tier** is the most verifiable free option today: it is officially listed and OpenAI-compatible. Its data-use clause means we should avoid sending anything personal. Synthetic or demo learner code is fine.
- Pre-generate and cache all LLM rephrasings for the seeded demo challenges, keyed by (challenge, error category, hint level). The live demo then never depends on a free quota. This is also CLAUDE.md's "demo mode" requirement.

### Gaps
- We do not have exact Groq free-plan limits (the tab content was unreadable) or exact Gemini free-tier RPM/RPD (the dashboard requires login). Verify both in the consoles at T+00:00.
- We did not measure Groq or Gemini latency for our prompt size. No sourced figure was found.

---

## Key Question 6 (coordinator add-on): OpenAI on about US$2.50 of credit. Prices, call budget, cost and risk features, and the fallback if credit runs out

### Takeaway
At Oct 2026 list prices the cheapest suitable OpenAI models are **gpt-5-nano ($0.05 input / $0.40 output per 1M tokens)** and **gpt-4.1-nano ($0.10 / $0.40)**. The newer gpt-6-luna is close behind at $0.10 / $0.50.

At about 1,500 input + 250 output tokens per call, $2.50 covers roughly **10,000 to 14,000 calls**. That drops to roughly 5,000 to 7,000 if each hint needs a second (judge) call or about 500 hidden reasoning tokens. Money is not the binding constraint for a 24h event; demo reliability is. So:
- split spend across projects with hard limits;
- use Structured Outputs;
- cache the static prompt prefix;
- wire Gemini Flash-Lite and Groq through the same OpenAI SDK, with deterministic templates as the final fallback.

### Cited Findings
- **Standard-tier prices per 1M tokens** (fetched 2026-10-11; the page shows no last-updated date). Table rows were re-fetched verbatim to confirm. — [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)

  | Model | Input | Cached input | Output |
  |---|---|---|---|
  | gpt-5-nano | $0.05 | $0.005 | $0.40 |
  | gpt-4.1-nano | $0.10 | $0.025 | $0.40 |
  | gpt-6-luna | $0.10 | $0.01 (cache writes $0.125) | $0.50 |
  | gpt-4o-mini | $0.15 | $0.075 | $0.60 |
  | gpt-5.6-luna | $0.20 | $0.02 (cache writes $0.25) | $1.20 |
  | gpt-5.4-nano | $0.20 | $0.02 | $1.25 |
  | gpt-5-mini | $0.25 | $0.025 | $2.00 |
  | gpt-4.1-mini | $0.40 | $0.10 | $1.60 |
  | gpt-5.4-mini | $0.75 | $0.075 | $4.50 |

  - **Batch tier is half price.** For example, gpt-5-nano is $0.025 / $0.0025 / $0.20, gpt-4.1-nano $0.05 / $0.20, and gpt-6-luna $0.05 / $0.25.
  - **Flex tier** lists the same prices as Batch for the GPT-5 and luna models.
  - **A "Fast" tier costs more**, e.g., gpt-6-luna at $0.20 / $1.00 and gpt-4.1-nano at $0.20 / $0.80.

  — [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
- **Worked estimate** (our arithmetic on the prices above; 1,500 input + 250 output tokens per call; budget $2.50):

  | Model | $/call | Calls for $2.50 | $/call with +500 extra output tokens (reasoning or longer reply) | Calls | $/call with 1,024 input tokens cached | Calls |
  |---|---|---|---|---|---|---|
  | gpt-5-nano | $0.000175 | ~14,285 | $0.000375 | ~6,666 | $0.000129 | ~19,391 |
  | gpt-4.1-nano | $0.000250 | ~10,000 | $0.000450 | ~5,555 | $0.000173 | ~14,434 |
  | gpt-6-luna | $0.000275 | ~9,090 | $0.000525 | ~4,761 | $0.000183 | ~13,673 |
  | gpt-4o-mini | $0.000375 | ~6,666 | $0.000675 | ~3,703 | $0.000298 | ~8,383 |
  | gpt-5.4-nano | $0.000613 | ~4,081 | $0.001238 | ~2,020 | $0.000428 | ~5,838 |
  | gpt-5-mini | $0.000875 | ~2,857 | $0.001875 | ~1,333 | $0.000645 | ~3,878 |
  | gpt-4.1-mini | $0.001000 | ~2,500 | $0.001800 | ~1,388 | $0.000693 | ~3,608 |

  The cached column ignores cache-write surcharges and assumes the cache hits. A two-call pipeline (generate, then LLM leak-judge) roughly halves every count. Source prices: [OpenAI API pricing](https://developers.openai.com/api/docs/pricing).
- **Reasoning tokens are billed as output tokens and count toward `max_output_tokens`.** Effort values "can include `none`, `minimal`, `low`, `medium`, `high` ..." and support varies by model. — [OpenAI reasoning guide](https://developers.openai.com/api/docs/guides/reasoning)
- **Prompt caching:**
  - It is "enabled by default for supported OpenAI models," with reused tokens billed at a cached rate "discounted up to 95%."
  - The minimum cacheable prefix is 1,024 tokens for GPT-5.6 and later; for earlier models the minimum "varies."
  - Retention is 30 minutes for GPT-5.6+. Earlier models keep entries in memory for about 5 to 10 minutes (up to 1 h), with an optional 24 h setting.
  - "Put stable developer instructions and shared reference material first."

  — [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- **Batch API:** "50% cost discount compared to synchronous APIs." Each batch "completes within 24 hours" and is meant for "jobs that don't require immediate responses." — [OpenAI Batch guide](https://developers.openai.com/api/docs/guides/batch)
- **Structured Outputs** "ensures the model will always generate responses that adhere to your supplied JSON Schema." Refusals come back in a separate `refusal` field. Support is "starting with GPT-4o," including specific gpt-4o-mini snapshots and later models. — [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- **Spend controls:**
  - Spend *alerts* "do not enforce a cap."
  - A *hard* spend limit makes requests return 429 (`project_spend_limit_exceeded` / `organization_spend_limit_exceeded`). Project limits apply only to that project's traffic.
  - "Enforcement is not instantaneous," so recorded spend "can slightly exceed the configured amount."
  - Running out of prepaid credit returns `credit_balance_exhausted`, and the fix is to add credits.

  — [OpenAI spend limits](https://developers.openai.com/api/docs/guides/spend-limits)
  - You can "set custom rate and spend limits per project" and use separate staging and production projects. — [OpenAI production best practices](https://developers.openai.com/api/docs/guides/production-best-practices)
- **Usage tiers and rate limits:**

  | Tier | Qualification | Usage limit |
  |---|---|---|
  | Free | allowed geography | $100/month |
  | Build | $5 total credit purchases | $500/month |
  | Launch | $100 | $5,000/month |
  | Grow | $500 | $200,000/month |

  - "Rate limits are defined at the organization level and at the project level."
  - Limits are listed per model *family* (e.g., Astra, Sol, Terra, Luna). The page does not map families to concrete model IDs; check the org limits page.

  — [OpenAI rate limits](https://developers.openai.com/api/docs/guides/rate-limits)
- **Free fallbacks with OpenAI-compatible endpoints:** Gemini at `https://generativelanguage.googleapis.com/v1beta/openai/` has a free tier listed for Flash-Lite and Flash models, but free-tier content is used to improve Google's products. Groq is at `https://api.groq.com/openai/v1`. — [Gemini OpenAI compat](https://ai.google.dev/gemini-api/docs/openai); [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing); [Groq OpenAI compat](https://console.groq.com/docs/openai)
  - OpenRouter's free models (50 RPD below 10 purchased credits) and Cerebras's trial (5 RPM; credits expire in 30 days) are tighter. — [OpenRouter limits](https://openrouter.ai/docs/api-reference/limits); [Cerebras rate limits](https://inference-docs.cerebras.ai/support/rate-limits)

### Inferences
- **Model choice:**
  - Use **gpt-4.1-nano** as the default rephraser if we want predictable cost and latency. To our knowledge the GPT-4.1 family emits no hidden reasoning tokens.
  - Or use **gpt-5-nano** (cheapest list price) or **gpt-6-luna** (newer) with the lowest supported reasoning effort.
  - Before committing, make 10 to 20 test calls and read `usage.output_tokens_details.reasoning_tokens`. Reasoning tokens are billed as output and can silently double the per-call cost or exhaust `max_output_tokens`.
  - Always set `max_output_tokens`. For example, 400 caps gpt-5-nano's worst case at about $0.000235/call, or about 10,600 calls.
- **Budget hygiene:** make two projects, for example "dev" with a hard limit of about $1.00 and "demo" with a hard limit of about $1.25, leaving about $0.25 as a buffer for non-instant enforcement. Testing then cannot drain the demo, and a 429 from a spend limit is a clean trigger for the fallback chain.
- **Caching:** put a static prefix of at least 1,024 tokens first (system prompt, leak-guard rules, the challenge's vetted hint ladder) and the learner-specific facts last. Savings are certain only on GPT-5.6+ models per the docs; even uncached, the budget suffices.
- **Structured Outputs for risk reduction:** use a schema like `{level: enum, text: string (maxLength), socratic_question: string, mentions_code: boolean}`. For the LeetCode-extension "approach check," use `{verdict: enum[on_track, partially, off_track, unclear], missing_concept: enum[...], question: string}`. Parse deterministically, run the leak guard on the text fields, and treat `refusal` or a parse failure as a fallback to the template. The LLM never produces free-form text that reaches the learner unguarded.
- **Batch API:** use it to pre-generate rephrasings for all seeded or demo challenges at half price, ideally before about T+12:00 given the up-to-24h window. Keep it off the live path.
- **Fallback chain:** OpenAI (gpt-4.1-nano or gpt-5-nano) → **Gemini 2.5/3.1 Flash-Lite free tier** via the OpenAI-compatible base URL (the most verifiable free option) → **Groq gpt-oss-20b** (OpenAI-compatible; free quota unverified) → **deterministic template plus cached rephrasings** (always works). Switch on HTTP 429 or 402, `credit_balance_exhausted`, a spend-limit code, a timeout over about 4 s, or a guard rejection. OpenRouter and Cerebras are tertiary at best for a live demo.

### Gaps
- **Prepaid-credit expiry could not be verified.** help.openai.com and openai.com policy pages returned HTTP 403. Check Billing → credit grants in the dashboard; do not assume the $2.50 persists past the event.
- We could not confirm whether gpt-5-nano and gpt-6-luna emit reasoning tokens by default, or which effort values each accepts. Model-level details were not on the fetched pages.
- The team's actual usage tier depends on total purchases (Build requires $5), and the model-family-to-ID mapping for rate limits needs the dashboard. Flex-tier semantics (latency or availability) were not fetched.

---

## Key Question 7 (synthesis): Where an LLM adds value vs where deterministic logic must own the decision, and how to build the leak guard for CodeQuest AI

### Takeaway
Every decision the PS makes testable must be owned by deterministic code:
- test verdicts;
- hidden-test secrecy;
- hint-level gating;
- mistake detection;
- skill tracking;
- whether a hint may be shown.

The LLM's evidence-backed niche is narrow: rephrasing an already-correct diagnosis in plain, friendly language, and posing one Socratic question. Both go behind a layered, executable leak guard with a deterministic fallback. This matches what worked in CS50, CodeHelp, CodeAid, and JetBrains, and avoids the documented failure modes: 48 to 88% explanation accuracy, 29 to 83% leakage, persuasion attacks, and learning harm from answer-giving.

### Cited Findings
- **LLM diagnoses are frequently wrong or incomplete:**
  - Codex error explanations were correct for 48% of inputs and fixes for 33%. — [Leinonen et al.](https://arxiv.org/abs/2210.11630)
  - GPT-3.5 found all issues 57% of the time, with about 40% false positives. — [Hellas et al.](https://research.aalto.fi/en/publications/exploring-the-responses-of-large-language-models-to-beginner-prog/)
  - Debug-help correctness was 63% in deployment. — [CodeAid](https://arxiv.org/html/2401.11314v2)
- **LLMs leak despite instructions, and persuasion defeats prompt-only and even fine-tuned guards; external judge/refiner and reasoning-first defenses cut leakage to about 2 to 8% for capable models.** — [Dinucu-Jianu et al.](https://arxiv.org/html/2505.15607v2); [Zhao et al.](https://arxiv.org/html/2604.18660v1)
- **Executable validation is the strongest documented check for code:** run tests on code extracted from replies (Zhao et al.), run-time validation before showing feedback (PyFiXV), and simulated-student validation (GPT4Hints-GPT3.5Val). — [Zhao et al.](https://arxiv.org/html/2604.18660v1); [Phung 2023](https://arxiv.org/abs/2302.04662); [Phung 2024](https://arxiv.org/abs/2310.03780)
- **Deterministic-first hybrids exist in production:** static analysis bounds LLM code hints (JetBrains); a static analyzer turns hidden fixes into line annotations (CodeAid); a pattern prefilter gates an LLM classifier (CS50); best-of-N scoring plus code removal (CodeHelp). — [Birillo et al.](https://arxiv.org/abs/2410.09268); [CodeAid](https://arxiv.org/html/2401.11314v2); [CS50](https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf); [CodeHelp](https://arxiv.org/abs/2308.06921)
- **Learning-protective patterns:**
  - Conceptual questions preserve skill formation and delegation harms it. — [Anthropic](https://www.anthropic.com/research/AI-assistance-coding-skills)
  - Guardrailed tutors avoid the exam penalty of unrestricted AI. — [Bastani et al.](https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education)
  - Feedback benefits can vanish when removed, so support should fade. — [Zhou et al. ICCE 2025](https://learninganalytics.upenn.edu/ryanbaker/ICCE2025_paper_28.pdf)
  - AI support can raise scores without raising understanding. — [TUM summary](https://www.edtech.tum.de/?p=3520)
- **Domain-specific lightweight classifiers beat general guards for classroom misuse** (0.93 vs ≤0.65 F1). — [CodeGuard](https://arxiv.org/abs/2602.02509)

### Inferences

#### Design rules: what the deterministic core must own (no LLM in the decision path)
1. **Verdicts.** The sandbox runner classifies each test as passed / wrong output / runtime error (exception type and line) / timeout. Hidden-test inputs and expected outputs **never leave the server**: not to the UI, not to the LLM. The UI shows only the test index, category tag (e.g., `empty_input`, `boundary`, `large_n`), and verdict.
2. **Diagnosis.** Map exception types and failure patterns to vetted plain-language templates, e.g., `IndexError` + `empty_input` tag → "Your code reads an element from a list that might be empty..." Detect recurring mistakes with (a) **tagged hidden tests** (empty, single-element, boundary, off-by-one probes) and (b) **AST patterns**, e.g., `range(len(x)-1)`, `<=` vs `<` on loop bounds, missing `if not xs`, mutating while iterating. The LLM never decides *what* is wrong.
3. **Hint ladder and gating.** L1 to L4 per challenge, pre-authored or generated offline and human-vetted, stored as data. Unlock the next level only after a *changed* resubmission. Add a cooldown (CS50-style hearts). Do not have a bottom-out level.
4. **Learner model.** Concept-level mastery updates from unassisted attempts, discounted by the highest hint level used. Mistake-tag frequencies drive the next challenge choice. Rapid hint-request patterns are logged as a "help abuse" signal.
5. **Leak-guard verdict.** The final yes/no on whether text may be shown is deterministic: rules plus test execution. An LLM judge is at most an *additional* veto, never an override.

#### Where an optional LLM adds value
- **Rephrasing** a selected deterministic template using the learner's actual variable names and line numbers. This gives more personal, plain-language output, with a fact-preservation check: the rephrase must still mention the same exception type, line, and test category, else fall back.
- **One Socratic question** aligned to the current ladder level ("What should your function return when the list has no elements?").
- **Approach or "thinking" check** (LeetCode extension): classify the learner's described approach into an enum verdict plus a question, via Structured Outputs. It never generates code.
- **Not recommended:** free-form multi-turn chat, LLM-authored hints at runtime, LLM-decided test outcomes, and sending the reference solution in the prompt. The model can still solve easy problems on its own (Dinucu-Jianu et al. note tutors leak by solving the problem themselves), so withholding the solution reduces but does not remove leak risk.

#### Leak guard: a layered recipe (cheap and deterministic first)
1. **Input hygiene.** Strip comments and docstrings from learner code with `ast` or `tokenize`, truncate string literals, and wrap code in delimiters as data. Run a small pattern filter for override phrases ("ignore previous", "system prompt", "you are now"). On a hit, skip the LLM and serve the template; do not abort the session, to avoid false-positive harm. Use structured buttons instead of free chat.
2. **Output schema.** Use Structured Outputs with `maxLength` and an enum `level`. Reject on parse failure or `refusal`.
3. **Code-shape filter** (all deterministic):
   - reject any fenced or inline code block;
   - reject any line or segment that `ast.parse` accepts as a non-trivial Python statement (assignment, `def`, `for`/`while`, `return`, comprehension);
   - reject any run of more than N consecutive code tokens;
   - L1 to L3 allow zero code; L4 allows only the vetted skeleton text.
4. **Secret filter.** Reject any hidden-test literal (inputs or expected outputs) and any token from the auto-derived **avoid set**: identifiers, literals, and calls in the reference solution but absent from the starter code and problem statement.
5. **Similarity heuristic.** Reject if normalized token 4-gram overlap between the hint and the reference solution exceeds a tuned threshold. This is unvalidated in the literature, so tune it on our own challenges.
6. **Executable check** (the strongest). If any code-like fragment survives, splice it into the learner's code or the function body and run the hidden tests in the sandbox. **If it makes all tests pass, it is a leak.** Reject it.
7. **Optional LLM judge.** Only for ambiguous cases, and only if budget and latency allow. Use the Zhao et al. pattern: judge, then refiner, with a pedagogical-reason field generated first.
8. **On any rejection.** Retry once with a stricter prompt (CodeHelp best-of-2), then serve the deterministic template. Never show raw LLM text that failed a check. Log every rejection for the demo's "safety" slide.
9. **Timeouts and fallback.** Hard timeout of about 4 s, then the template. Use the provider chain from Key Question 6. Keep pre-generated, guard-checked rephrasings cached for the demo set.

### Gaps
- None of the cited systems combine *all* of these layers, so the end-to-end false-rejection rate (good hints blocked) and the residual leak rate of this exact design are unknown. Measure them during the hack with a small red-team set: the persuasion categories from Zhao et al., plus comment-injection and format-bypass prompts.
- The thresholds for the similarity heuristic and the code-token run length are heuristics without a published validation.
