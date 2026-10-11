# Code typing trainers (typing-speed practice on real code): landscape, techniques, evidence, and fit for CodeQuest AI (PS E-02)

Research date: 2026-10-11. Scope: is an animated typing-speed trainer that uses code snippets instead of random sentences, with speed that goes up over time, worth building into CodeQuest AI (PS E-02, a Python debugging-mentor practice environment) during a ~24h hackathon? If so, how? Sources were fetched where possible. Claims that rest only on a search-engine summary are marked "(search summary)" so the writer can weigh them.

---

## Q1. Which products already offer typing practice on code, and which of their features matter (snippet sources, indentation and bracket handling, metrics, pacer and ghost, multiplayer, adaptivity)?

### Takeaway
Real-code typing trainers are a mature but small niche:
- **typing.io**: open-source files, counts symbols and backspace, makes you type brackets in order.
- **SpeedCoder**: imports your own code, per-key mistake heatmap, races.
- **SpeedTyper.dev**: MIT-licensed, snippets from real open-source projects, races and a leaderboard.

The big typing sites (Monkeytype, keybr, TypeRacer, 10FastFingers) are built on prose or word lists. Monkeytype's `code_python` "language" is a list of single Python tokens, not real code. A wave of small 2025–2026 entrants (DevType, TurboType, TypeNCode, codetypingpractice.com, AgileFingers) mostly add three things: indentation filled in for you, error breakdowns by symbol, and game-style scoring. None that I found ties drills to a learner's own mistakes inside a learning platform.

### Cited Findings
**typing.io**
- Describes itself as typing practice where you "type through open source code in JavaScript, Ruby, C, C++, Java, PHP, Perl, Haskell, Scala, and more". It argues "every typo interrupts the thought process". — [typing.io](https://typing.io/)
- It deliberately includes symbol keys and backspace/delete, which other tutors skip: "Typing.io includes these keys, resulting in uninflated WPMs and realistic practice." — [typing.io](https://typing.io/)
- Bracket policy (FAQ). Q: "Why doesn't typing.io allow typing open and closing braces/brackets together? (e.g. typing {}←content→ instead of {content})". A: "Typing paired symbols together is significantly slower due to the long jumps to the arrow keys." In other words, it makes you type brackets in linear order and does not emulate an editor's auto-close. — [typing.io](https://typing.io/)
- On code completion: "code completion tools usually help with easyToTypeAlphabeticVariables" and "Some completion tools help initially generate symbol-heavy boilerplate, but subsequent edits still require manual typing." — [typing.io](https://typing.io/)
- Pricing as of Oct 2026: the homepage says "It's free, just sign in" and links to "plans & pricing" (paid tiers are not described on the page). — [typing.io](https://typing.io/)
- Indentation: in the 2012 Hacker News launch thread, a user praised it for "not making me type the indentation (because any sane editor will do that for me)". The creator (moonboots) said they "preserved the whitespace the project authors used". — [HN thread](https://news.ycombinator.com/item?id=4419030)
- A 2026 review likewise says typing.io's "editor auto-indents; you don't type leading whitespace". — [TypingFastest, 28 Jul 2026](https://typingfastest.com/blog/code-typing-practice-sites-i-tested-for-devs-2026)
- Error correction in the same thread:
  - The creator first did not require corrections and saw "errors rates around 3~5%". Requiring corrections "revealed the true cost of mistyping a key".
  - One user reported being "only about 48% effective, meaning 52% of the keystrokes I made were accidents".
  - Another reported about 45 WPM on JavaScript vs about 65 on Python.
  - [HN thread](https://news.ycombinator.com/item?id=4419030)

**SpeedCoder (speedcoder.net)**
- "Source code available in 10+ languages" (C, C++, Java, Python, JavaScript, PHP...).
- "Custom Code": "Paste your source, upload a file, or import directly from GitHub".
- Two modes: "natural" (keep typing after an error) and "forced correction".
- Results show "WPM (words per minute), Accuracy and keys with most mistakes", plus a colour-coded keyboard heatmap that counts corrected mistakes too.
- "SpeedCoder Race" is "a multiplayer code typing game".
- [SpeedCoder](https://www.speedcoder.net/)
- The 2026 review says it "skips whitespace automatically" and tracks which characters you are slow on. — [TypingFastest](https://typingfastest.com/blog/code-typing-practice-sites-i-tested-for-devs-2026)

**SpeedTyper.dev**
- "Type racing for programmers": "type code snippets from real open source projects".
- Three modes: Practice, Battle ("play with your friends in real time with the private race mode") and Compete (global leaderboard).
- "speedtyper.dev is open source software licensed as MIT" (the logo is excluded).
- About 624 stars and 75 forks. Repo topics suggest Next.js/React, NestJS, PostgreSQL and WebSockets.
- [GitHub codicocodes/speedtyper.dev](https://github.com/codicocodes/speedtyper.dev); covered by [Changelog News (Mar 2023)](https://changelog.com/news/LW70)

**Monkeytype**
- GPL-3.0, about 20.9k stars and 3.4k forks.
- Stack badges include TypeScript, Solid, Vite, Anime.js, Chart.js, Firebase, MongoDB and Redis.
- Features list includes "a smooth caret".
- [GitHub monkeytypegame/monkeytype](https://github.com/monkeytypegame/monkeytype)
- Its `code_python` language file exists but holds 174 **single tokens**: keywords, built-ins, method names and dunders such as `__init__`, `append`, `class`. It has `noLazyMode: true` and contains no multi-line code. — [code_python.json](https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/static/languages/code_python.json)
- Pace caret is a "Visual WPM target guide" with modes `off`, `average`, `pb`, `last`, `custom`, `daily` and `tagPb`. "Smooth Caret" = "Enable animated transitions". `smoothLineScroll` = "Animated line transitions". — [Mintlify-generated repo docs (cites config-metadata.ts)](https://mintlify.wiki/monkeytypegame/monkeytype/guides/customization)
- The 2026 review says Monkeytype with punctuation and numbers turned on fixes the number row and general punctuation, "but not code-specific sequences like `=>`". — [TypingFastest](https://typingfastest.com/blog/code-typing-practice-sites-i-tested-for-devs-2026)

**keybr.com**
- "tracks every single keystroke and computes statistics for each individual key".
- "automatically generates lessons that focus on your weakest keys".
- Starts "with a small set of the most frequent letters" and "More letters are added once you reach the target speed with the current ones."
- License: GNU AGPL-3.0.
- [GitHub aradzie/keybr.com](https://github.com/aradzie/keybr.com)
- The 2026 review calls it "Excellent, but not a code trainer" (pseudo-words). — [TypingFastest](https://typingfastest.com/blog/code-typing-practice-sites-i-tested-for-devs-2026)

**TypeRacer**
- Launched March 2008. Passages of roughly 20–930 characters from "songs, films, television shows, video games and books".
- Multiplayer "maintrack" mode, plus a single-player "ghost racing" practice mode.
- Replays show "unlagged" vs "registered" WPM.
- Anti-cheat uses keystroke replays and a CAPTCHA for anyone over 100 WPM.
- Versions of the article disagree on the daily ghost-race save limit (5 vs 10).
- [Wikipedia: TypeRacer](https://en.wikipedia.org/wiki/TypeRacer); typing replays were added in 2017 per [TypeRacer blog](https://blog.typeracer.com/2017/06/20/new-pit-stop-features-full-race-history-and-typing-replays)

**10FastFingers** (search summary; secondhand and partly promotional sources)
- One-minute tests over the top 200 or top 1000 words of a language, real-time multiplayer races, and 24-hour competitions.
- No code mode was found.
- [TypeQuicker comparison page](https://www.typequicker.com/compare/10fastfingers); [PCWorld](https://www.pcworld.com/article/3148829/want-to-type-faster-start-with-this-fun-one-minute-test.html)

**2025–2026 entrants**
- **DevType** (dev-type.honualohak.com; DEV post dated 23 Dec 2025, edited Feb 2026):
  - Python, JS, TS, Go and Rust problems "generated with the Claude API", each with an explanation dialog.
  - "Auto-fills leading indentation (users don't need to type it)".
  - WPM uses 5 chars per word.
  - Score combines speed, accuracy, difficulty and "combo"; S–D ranks; global leaderboard. Multiplayer is only planned.
  - Stack: Next.js 15, React 19, Prism.js, Supabase.
  - [DEV Community](https://dev.to/mukitaro/in-the-age-of-ai-generated-code-i-built-a-typing-game-to-record-humanitys-peak-typing-speed-3n2l)
- **TurboType**:
  - Free. Claims practice "across 8 programming languages", including a "Symbols & Brackets" track.
  - "Error analysis by character and symbol".
  - Footer © 2026.
  - [turbotype.co](https://www.turbotype.co/)
- **Other entrants** (search summary):
  - [Code Typing Practice](https://www.codetypingpractice.com/): JS, TS, Python, React and Rust; progress saved in the browser; no account needed.
  - [TypeNCode](https://typencode.com/): game-style practice in Python, JS, HTML, PHP and Go; listed March 2026 on [PeerPush](https://peerpush.com/p/typencode).
  - [AgileFingers programming lessons](https://agilefingers.com/programming-lessons): Java, JS, C++, C#, Go, PHP, SQL, Bash and Python.
  - [CodeKeys](https://github.com/codewithevilxd/codekeys): open source, 46 lessons in JS, Python and C++.
  - [TypeQuicker "with symbols" test](https://www.typequicker.com/typing-speed-test/with-symbols), [The Typing Cat](https://thetypingcat.com/) and [Code Typer](https://www.thetypingpractice.com/games/code-typer).
- **A user's view of the benefit** (2026 review; anecdotal, on a site that sells typing practice):
  - The author's code speed was about 55 WPM against about 105 WPM on prose.
  - Six weeks of about 10 minutes a day raised code speed from 48 to 62 WPM.
  - A 40–50% drop from prose to code speed is called "completely normal".
  - The author says accuracy improved more than speed.
  - [TypingFastest](https://typingfastest.com/blog/code-typing-practice-sites-i-tested-for-devs-2026)

### Inferences
- These conventions recur across the code trainers. Adopt them rather than invent new ones:
  1. Indentation is filled in automatically (typing.io, SpeedCoder, DevType).
  2. Brackets are typed in linear order, with no auto-close (typing.io's explicit policy).
  3. Backspace counts and corrected errors are tracked (typing.io, SpeedCoder).
  4. Error breakdowns are per key or per symbol (SpeedCoder heatmap, TurboType, keybr).
  5. The pacer is relative to your own history (Monkeytype pace caret `pb`/`average`/`last`).
- **Gap in the market:** no tool found links drills to a learner's recurring errors or concept mastery. That link is the only differentiated angle CodeQuest could claim. The trainer itself is a commodity; judges who know Monkeytype will not find it novel.
- Python indentation is semantic. Copying the "auto-fill indentation" convention removes practice on exactly the mistakes Python novices make (`IndentationError`). A Python-specific trainer may want an optional "type the indent" mode (Tab = one level).

### Gaps
- No evidence found that Typing.com offers a code or programming course. A targeted search returned only other sites. Unverified either way.
- How SpeedTyper.dev handles indentation and whitespace, and how it extracts snippets (tree-sitter or otherwise), was not confirmed from its README.
- Launch dates for TurboType, codetypingpractice.com and TypeNCode are unconfirmed (the PeerPush listing and the © 2026 footer are only proxies).
- The other Monkeytype `code_*` language files were not enumerated; only `code_python` was verified. Whether Monkeytype's "custom text" mode keeps newlines and indentation was not verified.

---

## Q2. Which open-source implementations can be reused or learned from (licenses), and how do you get smooth caret animation and accurate keystroke timing in React or vanilla JS?

### Takeaway
Safe to reuse (permissive):
- SpeedTyper.dev (MIT)
- `react-typing-game-hook` (MIT on GitHub; one registry listing says Apache-2.0)
- `ts-fsrs` (MIT) for spaced repetition

Study but do not copy (copyleft): Monkeytype (GPL-3.0) and keybr (AGPL-3.0).

Core techniques:
- Render each character as a span with a state.
- Move a single caret element by character index, with an animation that can be switched off.
- Count in-progress IME composition when placing the caret.
- Timestamp with the monotonic `performance.now()` clock (100 µs resolution normally, 5 µs when cross-origin isolated).
- Compute WPM on the client, never over the network.

### Cited Findings
- **Licenses:**
  - Monkeytype is GPL-3.0 ([GitHub](https://github.com/monkeytypegame/monkeytype)).
  - keybr.com is "GNU Affero General Public License v3.0" ([GitHub](https://github.com/aradzie/keybr.com)).
  - SpeedTyper.dev is MIT, logo excluded ([GitHub](https://github.com/codicocodes/speedtyper.dev)).
  - tree-sitter (useful for pulling function-level snippets out of source) is MIT ([Wikipedia](https://en.wikipedia.org/wiki/Tree-sitter_(parser_generator))).
- **`react-typing-game-hook`:**
  - Provides `charsState` (per-character Incomplete/Correct/Incorrect), `currIndex`, `correctChar`/`errorChar` counts, `startTime`/`endTime`, `insertTyping(char)`, `deleteTyping()`, `getDuration()`.
  - Options: `skipCurrentWordOnSpace`, `pauseOnError`, `countErrors: 'everytime' | 'once'`.
  - About 24 stars. GitHub lists MIT ([GitHub](https://github.com/jokarz/react-typing-game-hook)). A Yarn registry listing reportedly shows Apache-2.0, so the licenses conflict (search summary) ([Yarn](https://classic.yarnpkg.com/en/package/react-typing-game-hook)).
- **`ts-fsrs`:** TypeScript FSRS (v6) scheduler, MIT, about 811 stars. API: `createEmptyCard()`, `fsrs()`, `scheduler.repeat(card, now)`, `scheduler.next(card, now, Rating.Good)`. — [GitHub open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- **Monkeytype caret logic:**
  - The caret moves by index, not pixels: `letterIndex: getCurrentInput().length + CompositionState.getData().length`, which includes in-progress IME composition text.
  - Animation is a switch: `animate: Config.smoothCaret !== "off" && !noAnim`. Resets reposition without animation.
  - Right-to-left and reversed directions are passed through.
  - [caret.ts](https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/src/ts/test/caret.ts)
  - The pixel measurement and animation live in a separate `Caret` class that was not retrieved. Anime.js is in the project's stack badges ([GitHub](https://github.com/monkeytypegame/monkeytype)).
- **Timing:**
  - `performance.now()` returns floating-point times "with up to microsecond precision". These are coarsened against timing attacks: "Resolution in isolated contexts: 5 microseconds; Resolution in non-isolated contexts: 100 microseconds".
  - It is relative to a "monotonic clock: its current time never decreases and isn't subject to adjustments", unlike `Date.now()`.
  - [MDN performance.now()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
- **Network lag distorts measured speed:** TypeRacer distinguishes "unlagged" (actual) from lag-affected "registered" WPM. — [Wikipedia: TypeRacer](https://en.wikipedia.org/wiki/TypeRacer)
- **Overlapping keypresses:** fast typists use "rollover where keypresses are overlapping", which the 168,000-volunteer study calls "surprisingly prevalent". — [Aalto 136M keystrokes](https://userinterfaces.aalto.fi/136Mkeystrokes/)
- **Syntax highlighting in a recent code-typing game:** DevType uses Prism.js on a Next.js/React stack. — [DEV Community](https://dev.to/mukitaro/in-the-age-of-ai-generated-code-i-built-a-typing-game-to-record-humanitys-peak-typing-speed-3n2l)

### Inferences
- **For a 24h build, write a ~200–300 line engine; don't fork Monkeytype or keybr.** Copyleft would cover the derived code; AGPL also triggers when the app is served over a network. Both codebases are large and built on frameworks (Solid in Monkeytype) the team may not use. SpeedTyper.dev (MIT) is a reasonable reference for race and leaderboard architecture if ever needed.
- **Smooth caret recipe** (a standard technique, not sourced to a specific article):
  - Use one absolutely positioned caret `div`.
  - On each keystroke, read the target span's `offsetLeft`/`offsetTop` (or `getBoundingClientRect` relative to the container).
  - Set `transform: translate(x, y)` with a short CSS `transition` (about 80–120 ms, ease-out), so the browser composites it on the GPU.
  - Turn the transition off on reset and line jumps, mirroring Monkeytype's `noAnim`.
  - Avoid re-rendering every character span on each key in React. Memoise the spans, or update only the changed span's class directly.
- **Pace caret / personal-best ghost recipe:**
  - Record a timeline of `(charIndex, t)` from `performance.now()` during each run.
  - Keep the best run's timeline.
  - During a new run, drive a second, semi-transparent caret with `requestAnimationFrame`: binary-search the PB timeline for the elapsed time and place it at that index.
  - A constant-speed pacer is just `index = floor(targetCharsPerSec × elapsed)`.
  - "Progressively increasing speed" = targetWPM = learner's recent median × (1 + 5%) after each passed drill (keybr-style "unlock when target reached").
- **Input handling:**
  - Use `keydown` (or `beforeinput`) on a focused hidden textarea, process events in order, and do not assume key-up arrives before the next key-down (rollover).
  - Call `preventDefault` on Tab so it isn't used for focus navigation.
  - Block paste in the drill.
  - Treat `compositionstart`/`compositionend` as Monkeytype does.

### Gaps
- Monkeytype's `Caret` class (actual measurement and animation code) was not retrieved, so it is unconfirmed whether it uses `transform`, `left`/`top` or Anime.js timelines.
- The `Event.timeStamp` resolution was not retrieved (MDN's `performance.now()` page doesn't cover it).
- No benchmark found comparing React rendering strategies for long typing passages.

---

## Q3. How is WPM defined for code (5-chars-per-word, whitespace and indentation, auto-indent), and how do trainers treat special characters like {}[]():;?

### Takeaway
Everyone uses the 5-characters-per-word convention, counting spaces and punctuation. Gross WPM counts everything typed. Net WPM subtracts uncorrected errors per minute. Accuracy counts corrected errors as well.

Code-specific choices are product decisions, not standards:
- Code trainers mostly don't count auto-filled indentation as typed characters.
- typing.io counts backspace and refuses `{}←content` style bracket entry.
- Symbols are where code WPM collapses: a 40–50% drop from prose speed is reported as normal, and novices often look down for `}`.

### Cited Findings
- A typing "word" is "standardized to be five characters or keystrokes long in English, including spaces and punctuation". Professional typists reach "43 to 80 wpm". A 1999 study measured average users at "32.5 words per minute" for transcription and "19.0" for composition. — [Wikipedia: Words per minute](https://en.wikipedia.org/wiki/Words_per_minute)
- Formulas:
  - Gross WPM = all typed entries / 5 / minutes. Spaces, numbers, letters and punctuation count; Shift and Backspace do not.
  - Net WPM = gross WPM minus uncorrected errors per minute: "only errors left uncorrected should be penalized".
  - Accuracy = correct characters / total characters × 100%, and it counts corrected errors too.
  - [SpeedTypingOnline: typing equations](https://www.speedtypingonline.com/typing-equations)
- typing.io counts symbol keys and backspace/delete, "resulting in uninflated WPMs". It also refuses paired-bracket entry because "Typing paired symbols together is significantly slower due to the long jumps to the arrow keys." — [typing.io](https://typing.io/)
- Indentation handling:
  - typing.io: auto-indents, so you don't type leading whitespace ([TypingFastest](https://typingfastest.com/blog/code-typing-practice-sites-i-tested-for-devs-2026); [HN](https://news.ycombinator.com/item?id=4419030)).
  - SpeedCoder: "skips whitespace automatically" ([TypingFastest](https://typingfastest.com/blog/code-typing-practice-sites-i-tested-for-devs-2026)).
  - DevType: auto-fills indentation and handles "edge cases like tabs vs spaces", using standard 5-char WPM ([DEV](https://dev.to/mukitaro/in-the-age-of-ai-generated-code-i-built-a-typing-game-to-record-humanitys-peak-typing-speed-3n2l)).
- Novice friction with symbols:
  - In the 2012 typing.io thread a user wrote: "When I had to type '}' in the training program I actually had to look down at my keyboard!"
  - Another reported that typing a closing bracket right after its opener (editor habit) was marked as an error.
  - Others warned that retroactive correction would clash "with autocomplete and autoindent".
  - [HN](https://news.ycombinator.com/item?id=4419030)
- A 2005 keystroke study grouped code keystrokes into **alphabetic (A), numeric (N), control (C), "other" (O: e.g. `()[]/*=;.` plus CR, SHIFT, SPACE, DELETE) and browsing (B)**. It hypothesised that a weak programmer perceives tokens like `:=` or `;` as "almost meaningless" non-words. It cites typing research showing non-words "are typed up to 40% slower". — [Thomas, Karahasanovic & Kennedy, ACE 2005 (PDF)](https://cms.simula.no/sites/default/files/publications/Thomas.2005.1.pdf)
- The code vs prose gap: about 55 vs about 105 WPM for one author, and "a code-to-prose speed drop of 40 to 50%" is called normal (anecdotal). The author's test for a good code trainer: it should show "a semicolon, a bracket pair, and a digit within the first ten seconds". — [TypingFastest](https://typingfastest.com/blog/code-typing-practice-sites-i-tested-for-devs-2026)

### Inferences
- **Recommended definitions for a CodeQuest drill:**
  - A typed character is any character the learner must actually type: newline (Enter) counts as 1; auto-filled leading indentation counts as 0.
  - Report **net WPM** (5-char words) and **accuracy (incl. corrected)**.
  - Add a code-specific **"syntax-critical accuracy"**: accuracy on `: ( ) [ ] { } ' " = ,` and on line-end colons only. This is the number a learning platform should care about, more than speed.
- **Normalise snippets before drilling:** use spaces only (the common 4-space Python convention), strip trailing whitespace and comments, and collapse blank lines. Do not auto-insert closing brackets; follow the typing.io linear-order rule.
- **Optional "indent mode" for Python:** the learner presses Tab (one level) or Backspace (dedent) at the start of each line. This drills the semantic indentation that `IndentationError` reflects. Make it the exception, not the default.

### Gaps
- Monkeytype's official definitions of `wpm`, `raw`, `acc` and `consistency` could not be retrieved: the live site served a "CSS failed to load" shell, and the old `about.html` paths in the repo return 404. Third-party explainers describe raw WPM as all typed chars / 5 / minutes, but none is authoritative. The commonly repeated claim that Monkeytype consistency is "based on the coefficient of variation of raw WPM" is **unverified**.
- No standard (ISO or other) exists for "code WPM". Every product picks its own rules, and none publishes its handling of trailing whitespace or blank lines.

---

## Q4. Does typing speed and accuracy on code symbols help programmers, especially beginners? Evidence, expert opinion, and counter-arguments

### Takeaway
The evidence is **correlational and modest**:
- Keystroke latency at "chunk boundaries" (mixed or symbol sequences) correlates at about r = 0.5 with programming scores (Thomas et al. 2005), and frequent pauses correlate with weaker performance (2022).
- Self-selected students who did "retype the worked example" exercises (NCSU TYPOS) had higher grades and fewer build failures.
- Novices' most frequent compile errors are bracket and syntax slips.

No controlled study found shows that **speed training** on code causes better programming. The 2005 authors themselves read slow symbol typing as a *symptom* of poor chunking or understanding, not a cause. Practitioners split:
- Against: "typing is not the bottleneck" (Seemann: actual output is about 27 chars/min).
- For: effortful typing taxes attention and communication (Ball), and novices should type code by hand to learn symbols (Shaw, Hermans).

For beginners, the defensible claim is **accuracy and symbol fluency (fewer syntax slips, lower working-memory load)**, not WPM.

### Cited Findings
**For a link between typing and programming**
- Thomas, Karahasanovic & Kennedy (ACE 2005, primary PDF):
  - Two studies: Java students in a controlled experiment (39 participants), and first-year Ada students in a 6-week field study (the conclusion says 125 participants; a summary elsewhere says 141 students).
  - Latency of "E" digraphs (key pairs of different types, likely at chunk boundaries) correlated negatively with programming score. "The correlations are of medium strength, around 0.5, and there is substantial scatter", and "These metrics are not sufficient to measure programming performance".
  - Significance threshold p = 0.001 because of the many tests run.
  - They considered whether the metrics "merely reflect" typing practice and rejected that specific explanation. They also suggest the metrics may be "a proxy for learning in the lab".
  - They note CS students' typing rate rises over their first two university years (Thomas 1998).
  - [PDF](https://cms.simula.no/sites/default/files/publications/Thomas.2005.1.pdf); summary also on [Simula](https://www.simula.no/research/investigation-keystroke-metrics-indicator-programming-performance)
- "Pausing While Programming" (Shrestha, Leinonen et al., ICSE-SEET 2022): "Frequency of pauses of all lengths is negatively correlated with performance". One cluster of students that took fewer mid-to-long pauses did better on exams (search summary). — [Aalto repository](https://aaltodoc.aalto.fi/items/00331ee7-f8f2-43d6-ad77-53600d6e8c9d)
- Leinonen, Ihantola & Hellas (L@S 2017): students' programming experience can be inferred from keystroke latency data (search summary). — [Tampere Univ. research portal](https://researchportal.tuni.fi/en/publications/preventing-keystroke-based-identification-in-open-data-sets/)
- **NCSU TYPOS platform:**
  - "typing exercises offer students the opportunity to practice their typing skills on a worked example of code" without problem solving.
  - "self-selected students that completed these typing exercises earned higher final grades and had less build failures in projects".
  - Novices: "Simply using the incorrect keyword or making a 'typo' while writing code are often the first mistakes students make."
  - No sample sizes or effect sizes are given on the page.
  - [NCSU TYPOS](https://research.csc.ncsu.edu/arglab/projects/typos/)
- **Related papers:**
  - Gaweda, Lynch, Seamon, Oliveira & Deliwa, "Typing Exercises as Interactive Worked Examples for Deliberate Practice in CS Courses", ACE '20. Pages 105–113 per one reference list; 1–9 per the NCSU profile. — [arXiv 2410.08922 reference list](https://arxiv.org/pdf/2410.08922); [NCSU profile](https://ci.lib.ncsu.edu/profiles/agaweda)
  - Gaweda & Lynch, "Giving Students Canned Code using Typing Exercises" (SIGCSE '19). Its TL;DR (per Semantic Scholar) says typing exercises are viable and can help lower-performing students (search summary). — [NCSU profile](https://ci.lib.ncsu.edu/profiles/agaweda)
  - EDM 2021 work by the same group classifies typing exercises as **"active"** in the ICAP framework, alongside Parsons and debugging tasks (search summary). — [EDM 2021 poster](https://educationaldatamining.org/EDM2021/virtual/poster_paper88.html)
- **Novice errors are heavily syntactic:**
  - Altadmri & Brown (SIGCSE 2015) studied 37,158,094 BlueJ/Java compilations from more than 250,000 students. **Mismatched or unbalanced parentheses/brackets ranked #1** by frequency (search summary). — [Never Work in Theory review](https://neverworkintheory.org/2016/06/09/novice-programming-mistakes.html); [Kent repository](https://kar.kent.ac.uk/46742)
  - In Pritchard's Python error corpus the most common error was "SyntaxError: invalid syntax" (179,624 occurrences) (search summary). — [Never Work in Theory](https://neverworkintheory.org/2016/06/12/error-message-frequency.html); [paper](https://ar5iv.labs.arxiv.org/html/1509.07238)
  - A blocks-to-text Python study found syntax issues the most frequent category. The common ones were string quotes, `=` vs `==`, and missing or misplaced colons and mismatched parentheses, which a structured editor "almost eliminates" (search summary). — [arXiv 2302.05708](https://arxiv.org/pdf/2302.05708)
  - A Korean elementary-school Python study found missing parentheses the most frequent error (search summary). — [Korea Univ.](https://pure.korea.ac.kr/en/publications/an-analysis-of-the-difficulties-of-elementary-school-students-in-/)
- **Expert and pedagogical opinion for hand-typing code:**
  - Zed Shaw: "You must type each of these exercises in, manually. If you copy and paste, you might as well not even do them." Also: "Typing the code samples and getting them to run will help you learn the names of the symbols". — [Learn Python the Hard Way](https://learnpythonthehardway.org/python3/intro.html)
  - Felienne Hermans' *The Programmer's Brain* (Manning 2021) offers "Ways to learn new syntax and keep it memorized" ([Manning](https://www.manning.com/books/the-programmers-brain)). Section "3.2 How to learn syntax quickly with flashcards" is per a TOC summary (search summary) ([TOC notes](https://scrapbox.io/iki-iki/%E3%80%8EThe_Programmer's_Brain_-_What_every_programmer_needs_to_know_about_cognition%E3%80%8F)). A reader review recounts its working-memory estimate of 2–6 chunks ([Goodreads](https://www.goodreads.com/book/show/57196550)).
  - Thorsten Ball (2020) on effort over speed: "Effort, that's the important one, not raw speed." Also: "Typing is not something you should need to think about." — [thorstenball.com](https://thorstenball.com/blog/2020/09/01/typing-can-be-the-bottleneck/)
  - typing.io's pitch: "every typo interrupts the thought process". — [typing.io](https://typing.io/)
- **Fast typists err less:** the 168,000-volunteer study reports that "Faster typists make generally less errors" ([Aalto](https://userinterfaces.aalto.fi/136Mkeystrokes/)). Press coverage gives an average of 52 WPM and the fastest at about 120 (search summary). Some blogs cite 40 or 41.4 WPM for the same study, which conflicts ([Cambridge news](https://www.cam.ac.uk/research/news/what-makes-a-faster-typist)).

**Counter-arguments**
- Mark Seemann's arithmetic: The Mythical Man-Month gives about 10 LOC per day. Even at 100 lines × 80 chars over a 5-hour coding day, that is about 1,600 chars/hour ≈ 27 chars/minute (about 5 WPM). He concludes "Programmer productivity has nothing to do with typing speed" and "Typing isn't a programming bottleneck." — [ploeh blog, 2018](https://blog.ploeh.dk/2018/09/17/typing-is-not-a-programming-bottleneck/)
- The slogan is old: "Coding has never been the bottleneck" goes back to Kevlin Henney talks in the late 1990s and a 2009 sticker (search summary). — [Rob Bowley, 2026](https://blog.robbowley.net/2026/01/05/coding-has-never-been-the-bottleneck/)
- HN sceptics on typing.io (2012): "I don't understand programmer's obsession with typing efficiency. We're not typists." Also: "That's hardly a way to become a better programmer, only a more prolific one." — [HN](https://news.ycombinator.com/item?id=4419030)
- Autocomplete and AI shrink the need to type:
  - A keyboard.io forum user says typing.io "makes me type a lot of stuff that I really wouldn't be typing otherwise, as my IDE autocompletes most of the boilerplate code" (search summary) ([forum](https://community.keyboard.io/t/typing-practice/269)).
  - DevType's author frames the AI era as possibly "when humans are typing code the fastest in history", i.e., before it declines ([DEV](https://dev.to/mukitaro/in-the-age-of-ai-generated-code-i-built-a-typing-game-to-record-humanitys-peak-typing-speed-3n2l)).

### Inferences
- **Direction of causality is the weak point.** The strongest study (Thomas 2005) treats slow symbol-boundary typing as a sign of poor *chunking*, i.e., not yet understanding `def f(x):` as one unit. Drilling the keystrokes may speed the motor part without building the understanding. The TYPOS outcome is from self-selected students (motivation confound). Leinonen's work shows typing patterns encode experience, so "fast typists program better" is plausibly "experienced programmers type code faster".
- **ICAP:** typing exercises are "active", which the ICAP framework (Chi & Wylie) ranks below "constructive" and "interactive" (that ranking is background knowledge, not re-verified here). CodeQuest's core activities (debugging, explaining failures, hints) are constructive or interactive, so a typing drill is a *lower-yield* activity per minute and should stay short.
- **The honest beginner case is narrow but real:** brackets, colons and quotes are the most frequent novice compile errors. Slips at the keyboard plausibly cause part of them, alongside not knowing the grammar. A short, accuracy-first warm-up on the learner's *own* code is defensible. A speed race is not.
- Speed in the AI era: a 2026 Python learner will type less boilerplate (AI and autocomplete). That weakens any "type faster = code faster" pitch further, but not the "read and edit symbols accurately" argument.

### Gaps
- No randomised or controlled study was found that isolates code-typing *speed* training and measures novice programming outcomes.
- The ACE '20 and SIGCSE '19 Gaweda papers' full results (samples, effect sizes) were not retrieved; the ACM DL and Semantic Scholar were rate-limited.
- No Python-specific frequency data was retrieved for `expected ':'` or `IndentationError` separately. Retrieved sources only show SyntaxError dominance, with colons and parentheses among common types.

---

## Q5. How could a typing module tie into CodeQuest's learner model (snippets from accepted solutions or weak concepts, drills on frequent syntax errors, spaced repetition, keystroke replay as proof of effort), and what are the privacy implications?

### Takeaway
Integration with real teaching value:
- The drill content comes from (a) the learner's own accepted solutions and (b) idioms for concepts flagged weak.
- Drills are selected by the recurring-mistake detector's syntax categories (unbalanced brackets, missing colon, `=` vs `==`, quotes, indentation).
- Drills are scheduled with spaced repetition (FSRS, or simple Leitner boxes) and scored on syntax-critical accuracy.

"Keystroke replay as proof of authentic effort" has precedents (TypeRacer anti-cheat, Grammarly Authorship replays) but two problems:
1. Retyping AI output defeats it.
2. Keystroke timing is identifying behavioural data (biometric under GDPR's definition).

If CodeQuest wants an anti-copy signal, use coarse, content-free paste and time-on-task counts in the *challenge editor* rather than keystroke dynamics.

### Cited Findings
- **Precedents for snippet sourcing:**
  - SpeedCoder imports the user's own code: "Paste your source, upload a file, or import directly from GitHub" ([SpeedCoder](https://www.speedcoder.net/)).
  - SpeedTyper.dev uses snippets "from real open source projects" ([GitHub](https://github.com/codicocodes/speedtyper.dev)).
  - DevType generates problems with an LLM (Claude API) and attaches an explanation dialog ([DEV](https://dev.to/mukitaro/in-the-age-of-ai-generated-code-i-built-a-typing-game-to-record-humanitys-peak-typing-speed-3n2l)).
- **Precedent for adaptivity:** keybr generates "lessons that focus on your weakest keys" and unlocks more "once you reach the target speed" ([keybr GitHub](https://github.com/aradzie/keybr.com)). SpeedCoder reports "keys with most mistakes" ([SpeedCoder](https://www.speedcoder.net/)).
- **Spaced repetition:** `ts-fsrs` (MIT) implements FSRS v6 scheduling ([GitHub](https://github.com/open-spaced-repetition/ts-fsrs)). Hermans recommends flashcards for syntax ([Manning](https://www.manning.com/books/the-programmers-brain)).
- **Mistake categories worth targeting** (from Q4): mismatched brackets (top Java novice error), colons and mismatched parentheses, `=` vs `==`, missing quotes. — [Never Work in Theory](https://neverworkintheory.org/2016/06/09/novice-programming-mistakes.html); [arXiv 2302.05708](https://arxiv.org/pdf/2302.05708)
- **Replay and authorship precedents:**
  - TypeRacer uses "keystroke replays" and a CAPTCHA above 100 WPM as anti-cheat ([Wikipedia](https://en.wikipedia.org/wiki/TypeRacer)).
  - Grammarly Authorship replays the writing process "from the first paste to the last keystroke" and labels text typed, pasted or AI-generated ([Grammarly](https://www.grammarly.com/authorship); [UNE academic integrity blog](https://blog.une.edu.au/academicintegrity/?p=966)).
  - Jisc notes it "does not analyse the contents of the text". Even AI text retyped by hand would just show as time, sessions and replay, i.e., retyping defeats the typed/pasted label (search summary) ([Jisc](https://nationalcentreforai.jiscinvolve.org/wp/2024/11/15/grammarly-authorship-acknowledging-ai-use-in-assessment/)).
  - An independent trial found the report labelled the tester's own edited text "AI generated" (search summary) ([Anna Mills](https://annamills.substack.com/p/writing-process-tracking-is-coming)).
- **Detection limits:**
  - Keystroke dynamics detected LLM-assisted *essay* writing with up to 85.7% accuracy in controlled settings, but accuracy dropped across users and datasets (search summary). — [arXiv 2406.15335](https://arxiv.org/html/2406.15335v1)
  - A CS1 study logged paste events in the IDE but deliberately not the source of text pasted from outside it: "This ensures student privacy when acting outside of their IDE, but adds some ambiguity". — [arXiv 2605.21374](https://arxiv.org/pdf/2605.21374)
  - zyBooks reports that students forced to code in the autograder IDE who used ChatGPT show very little time relative to classmates and get flagged (search summary). — [zyBooks research](https://www.zybooks.com/research-items/chatgpt-and-cheat-detection-in-cs1-using-a-program-autograding-system/)
- **Privacy:**
  - Typing rhythms identify individuals. "Simply removing explicit identifiers such as names and student numbers is not sufficient"; latency data can be perturbed so identification fails while experience can still be inferred (search summary). — [Leinonen, Ihantola & Hellas, L@S 2017](https://researchportal.tuni.fi/en/publications/preventing-keystroke-based-identification-in-open-data-sets/)
  - Students could be matched to typing profiles in programming exams (search summary). — [Leinonen et al., ITiCSE 2016](https://archive.cps-vo.org/node/37819)
  - GDPR Art. 4(14): "biometric data" means "personal data resulting from specific technical processing relating to the physical, physiological or behavioural characteristics of a natural person, which allow or confirm the unique identification of that natural person". — [gdpr-info.eu Art. 4](https://gdpr-info.eu/art-4-gdpr/)

### Inferences
- **Concrete tie-in to CodeQuest's learner model** (smallest viable version):
  1. The mistake detector already classifies failed runs. Add syntax categories from the interpreter's message and the diff:
     - `unclosed_bracket`: messages like "'(' was never closed" in Python 3.10+ (message wording not re-verified here)
     - `missing_colon` ("expected ':'")
     - `assign_vs_compare`
     - `unterminated_string`
     - `indentation`
  2. When a category occurs ≥ 2–3 times, enqueue a **60–90 s "Syntax Warm-up"** before the next challenge.
  3. Content:
     - 3–5 lines taken from the learner's **own accepted solutions**. Use Python's `ast` to cut out `def`/`for`/`if`/comprehension lines that contain the weak symbol.
     - Plus 1–2 canonical idioms for concepts the skill tracker marks weak (e.g., `for i in range(len(xs) - 1):`, `if not items: return []`).
     - Never use unsolved challenge content, so hints never leak.
  4. Score on **syntax-critical accuracy**, then net WPM. Write back the result as a skill signal ("syntax fluency: brackets") and update an FSRS or Leitner card per idiom.
  5. "Progressively increasing speed" (the team's idea) survives as a **personal pace caret**: target = learner's recent median + 5%, shown only after accuracy ≥ 95%.
- **Anti-copy without biometrics:**
  - In the *challenge editor* (not the trainer), count paste events and large single insertions, plus active time per attempt.
  - Store counts only, never pasted content or per-key timings.
  - Show learners their own stats ("you pasted 3 times") as reflection, not accusation.
  - If keystroke replay is ever stored, keep it per attempt, opt-in, short-lived, and coarsened. Never use it to identify or authenticate people.
- **Product risk:** framing the feature as surveillance or cheat detection in a demo can alienate judges and users. The PS frames copying as a *learning* problem ("skips the debugging that builds skill"), which hints and explanations address better.

### Gaps
- No study found that evaluates typing drills generated from a learner's *own* past code.
- India's DPDP Act 2023 treatment of behavioural or keystroke data was not researched. Check before storing any keystroke timing for Indian users, especially minors.
- The exact Python 3.10+ SyntaxError message strings were not re-verified in this session.

---

## Q6. Roughly how much effort is an MVP (single-player, animated, metrics, personal-best ghost) for one front-end developer?

### Takeaway
This estimate is an inference; no published effort data was found:
- A **bare drill** (render snippet, typed input, auto-indent skip, net WPM and accuracy, results card) is about **3–5 focused hours**.
- **Smooth caret + per-symbol stats + PB ghost/pace caret + learner-model hook** brings it to about **9–12 hours**.

In a 24h sprint that is a third to a half of the front-end owner's productive time, time the PS-mandated UI also needs: challenge view, per-test outcomes, explanations, hint ladder, skill map.

### Cited Findings
- **Reusable pieces:**
  - typing state logic, `react-typing-game-hook` (MIT) ([GitHub](https://github.com/jokarz/react-typing-game-hook))
  - scheduling, `ts-fsrs` (MIT) ([GitHub](https://github.com/open-spaced-repetition/ts-fsrs))
  - highlighting, as DevType does with Prism.js ([DEV](https://dev.to/mukitaro/in-the-age-of-ai-generated-code-i-built-a-typing-game-to-record-humanitys-peak-typing-speed-3n2l))
  - monotonic high-resolution timing, `performance.now()` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now))
- **Edge cases that mature products handle:**
  - IME composition in the caret index ([Monkeytype caret.ts](https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/src/ts/test/caret.ts))
  - forced vs natural correction modes ([SpeedCoder](https://www.speedcoder.net/))
  - lag-free client-side speed measurement ([Wikipedia: TypeRacer](https://en.wikipedia.org/wiki/TypeRacer))
  - tabs vs spaces ([DEV](https://dev.to/mukitaro/in-the-age-of-ai-generated-code-i-built-a-typing-game-to-record-humanitys-peak-typing-speed-3n2l))

### Inferences
Effort estimate for one front-end developer who knows React; the backend owner supplies one endpoint:

| Component | Bare drill | Full MVP |
|---|---|---|
| Snippet render as per-char spans (+ optional Prism highlighting) | 1 h | 1.5 h |
| Input: focused hidden textarea, keydown/beforeinput, backspace, Enter skips leading indent, Tab `preventDefault`, block paste, composition guard | 1–1.5 h | 2 h |
| Metrics: net and raw WPM, accuracy incl. corrected, syntax-critical accuracy, results card | 0.5–1 h | 1.5 h (+ per-symbol bar chart) |
| Smooth caret (absolute div + `transform` transition; line wrap and scroll) | 0.5 h (blinking block) | 1 h |
| PB ghost / pace caret (record `(index, t)` timeline, rAF replay; +5% target rule) | – | 1–1.5 h |
| Learner-model hook: `GET /drills/next` (snippets from accepted solutions + weak-concept idioms via `ast`), `POST /drills/result` (update skill and card) | 0.5 h (static snippets) | 2 h |
| Edge cases, testing, polish | 0.5 h | 1.5–2 h |
| **Total** | **≈ 4–5 h** | **≈ 10–12 h** |

- **Top risks:**
  - Tab and focus handling across browsers.
  - React re-render lag on long snippets.
  - Inconsistent key events on mobile and IME keyboards (judges may try it on a phone).
  - Scope creep into races and leaderboards, which need WebSockets, auth and anti-cheat.
- **Cheapest credible version:** about 2 h. Static per-concept snippets, no ghost, blinking caret, accuracy + WPM. Only the "triggered by recurring mistake" link to the learner model is wired. It demos the *idea* without stealing the core build's time.

### Gaps
- No published build-time data for code typing trainers was found. The figures above are engineering estimates and should be re-scaled once the team picks its stack (CLAUDE.md: stack undecided until the PS analysis).

---

## Q7. Fit to PS E-02 and judging: include it or not, at what minimal scope, and how tied to the learner model?

### Takeaway
**Candidly: the typing trainer is not required by, and only loosely related to, E-02.** The PS's mandated features are:
- challenges with visible and hidden tests
- restricted execution
- separate per-test outcomes
- plain-language failure explanations
- non-revealing progressive hints
- recurring-mistake detection that adapts future challenges
- per-concept skill tracking

Its own examples of recurring mistakes are *logic* errors (off-by-one, empty inputs), not typing slips.

**Recommendation:**
- **Do not build "an animated typing-speed trainer with progressively increasing speed" as a pillar or headline.**
- At most, after the core loop is deployed and demo-stable and before feature freeze, add a **≤ 2–4 h "Syntax Warm-up"**:
  - triggered by recurring syntax-error categories
  - built from the learner's own accepted code
  - scored on accuracy, with an optional personal pace caret
  - writing back to the skill tracker
- Otherwise put it on a roadmap slide.

### Cited Findings
- E-02 text, saved verbatim in the brief:
  - "Learners often copy complete solutions, which gets code working but skips the debugging that builds skill."
  - Mandates include "Report each test's outcome separately: passed, wrong output, runtime error, or timeout", "Provide progressive hints... no hint may reveal the complete solution", and "Detect recurring mistakes across a learner's work, such as off-by-one errors or unhandled empty inputs, and adapt future challenges to them. Track demonstrated skills by concept."
  - Typing or speed is not mentioned.
  - [docs/pm/01_hackathon_brief.md](../../../pm/01_hackathon_brief.md)
- Official judging criteria are still "TBD" in the brief. The rubric file the brief points to (`docs/research/judging-and-winning-patterns.md`) does not exist in the repo as of this session. — [docs/pm/01_hackathon_brief.md](../../../pm/01_hackathon_brief.md)
- The evidence base for typing drills is correlational: r ≈ 0.5 with "substantial scatter" ([Thomas et al. 2005](https://cms.simula.no/sites/default/files/publications/Thomas.2005.1.pdf)) and self-selected outcomes ([NCSU TYPOS](https://research.csc.ncsu.edu/arglab/projects/typos/)). Novice errors are, however, heavily bracket- and colon-related ([Never Work in Theory](https://neverworkintheory.org/2016/06/09/novice-programming-mistakes.html); [arXiv 2302.05708](https://arxiv.org/pdf/2302.05708)).
- Code typing trainers are a crowded commodity space: typing.io, SpeedCoder, SpeedTyper.dev, Monkeytype, and several 2025–2026 clones (see Q1). — [TypingFastest](https://typingfastest.com/blog/code-typing-practice-sites-i-tested-for-devs-2026)

### Inferences
- **How judges will likely read it:**
  - As a standalone speed game: off-brief scope creep, or "Monkeytype for code", which already exists.
  - As a **remediation activity chosen by the recurring-mistake detector**: a small, defensible example of "adapt future challenges to [recurring mistakes]" and "track demonstrated skills by concept".
  - Framing decides which way it lands.
- **Pitch line if included (≤ 15 s of demo):** "When CodeQuest sees you miss a colon or close a bracket three times, it schedules a 60-second warm-up built from *your own* passing code, then tracks 'syntax fluency' like any other skill."
- **Minimum scope to keep it honest:**
  - Single-player only: no leaderboards, races or ghosts of other users.
  - Accuracy first: speed is shown, but mastery is accuracy ≥ 95% on syntax-critical characters.
  - Snippets only from the learner's accepted solutions or curated idioms, never from unsolved challenges or hidden tests.
  - Paste disabled in the drill.
  - No keystroke-timing storage beyond per-drill aggregates.
- **Priority order for the 24h build:** core loop (challenge → restricted run → per-test outcome → explanation → hint ladder) → mistake detector + skill map → deploy + demo mode → *then* Syntax Warm-up if ≥ 4 h remain before feature freeze. If behind schedule, cut it without regret; it changes no mandated requirement.
- **Better-aligned alternatives of similar cost** (for comparison when scoring the idea in `05_idea_scoring.md`):
  - A "retype the fix" step after a hint: the learner types the corrected line rather than pasting it, as in TYPOS-style worked examples.
  - Paste/time-on-task counters in the challenge editor to support the "don't just copy solutions" narrative without biometrics.
  - Both reuse the same typing engine pieces.

### Gaps
- The official judging rubric and weights are unknown (TBD in the brief), so the cost/benefit above assumes a typical problem-fit + execution + demo rubric.
- Open questions for the team (per the discuss-before-planning preference):
  - Which front-end stack?
  - Who would own the drill?
  - Is a mobile demo likely?
  - Does the team want the "speed" framing at all, or would an accuracy-first "syntax fluency" framing satisfy the original idea?
