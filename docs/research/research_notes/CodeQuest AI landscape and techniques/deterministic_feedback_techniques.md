# Deterministic (non-LLM) techniques for programming feedback, hints, mistake detection, debugging exercises and learner modeling (CodeQuest AI, PS E-02)

*Compiled 2026-10-11. Every "Cited Findings" bullet has a source. "Inferences" holds the researcher's engineering recommendations: recipes, defaults and build-hour estimates for a 3-person team on Python 3.12+. These are judgement calls, not measured results. Where a source is secondary or only partly read, the bullet says so. The code sketches in §1, §2, §3, §6, §7 and §10 were run locally on CPython 3.12.0 and work as shown. The §8 Hypothesis sketch was not run because Hypothesis is not installed locally.*

---

## 1. Error explanation: enhanced error messages, the Python exceptions novices hit most, runtime-context templates, reusable projects

### Takeaway
The evidence that enhanced error messages help is mixed. Becker (2016) found significant reductions in total, per-student and repeated errors (Java, about 200 students, about 48k errors), while Denny et al. (2014) found no effect. The ITiCSE 2019 working group turned the literature into 10 design guidelines. In Python a few messages dominate: SyntaxError, NameError and EOFError make up about 55% of 643k errors in CS Circles. So a small set of hand-written templates that use runtime context (the crash line and variable values) covers most cases. friendly-traceback and Thonny are MIT-licensed and can be reused. PythonTA is GPL-3.0.

### Cited Findings
**Effectiveness evidence**
- Becker's SIGCSE 2016 paper "An Effective Approach to Enhancing Compiler Error Messages" (DOI 10.1145/2839509.2844584) was a controlled study using an editor called Decaf with CS1 Java students. Two groups of "just over 100 students" each were logged for 4 weeks in consecutive academic years. The control group saw raw javac messages. The intervention group saw raw javac messages plus an enhanced version of the first message — [Becker 2016 author copy (UCD)](https://researchrepository.ucd.ie/rest/bitstreams/22170/retrieve)
- Becker 2016 results: 48,489 errors remained after filtering (19,628 enhanced vs 28,261 control).
  - Errors per compiler message were lower with enhancement: Mdn 18 vs 34, Wilcoxon Z = −4.29, p < 0.001. For the top 15 messages: Mdn 627 vs 1,135, Z = −3.17, p = 0.002.
  - Errors per student (top 15 messages) were lower: Mdn 125 vs 152, Mann-Whitney U = 4,254, p = 0.028.
  - Repeated errors: 9,752 vs 13,849, Mdn 416 vs 742, Z = −2.90, p = 0.004.
  - Nine of the 15 most frequent messages differed significantly, and 8 of those 9 were enhanced ones.
  - The paper reports test statistics but no standardized effect sizes — [Becker 2016 (UCD)](https://researchrepository.ucd.ie/rest/bitstreams/22170/retrieve)
- Threats to validity Becker lists himself: the groups were a year apart; anonymous compiler IDs were not 1:1 with students; and the enhanced group saw only one enhanced message per compilation, which "potentially" reduced confusion on its own. The paper also contradicts itself: the top 10 control-group messages are "73% of 29,019 student errors" in the results but "79%" in the conclusions. "cannot find symbol" alone was 16.0% — [Becker 2016 (UCD)](https://researchrepository.ucd.ie/rest/bitstreams/22170/retrieve)
- Journal version: Becker et al., "Effective compiler error message enhancement for novice programming students," *Computer Science Education* 26(2–3):148–175 (2016), about 200 students and almost 50,000 errors — [eprints](https://eprints.teachingandlearning.ie/id/eprint/5118/); [CORE](https://core.ac.uk/works/78318990)
- Denny, Luxton-Reilly & Carpenter, "Enhancing Syntax Error Messages Appears Ineffectual" (ITiCSE 2014), used CodeWrite in a two-week accelerated summer course; 83 students submitted at least once. Enhanced messages included an example of the error and a fix. The study found no significant effect on consecutive non-compiling submissions, total non-compiling submissions, or attempts needed to fix the most common errors — [Crossref record](https://api.crossref.org/works/10.1145%2F2591708.2591748); summarized in [Becker 2016](https://researchrepository.ucd.ie/rest/bitstreams/22170/retrieve)
- A 2021 *Frontiers in Psychology* study, "Learning From Errors: Exploring the Effectiveness of Enhanced Error Messages in Learning to Program," says the evidence for enhancement is still inconclusive — [PMC8669433](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8669433/)
- A 2024 arXiv paper is titled "Not the Silver Bullet: LLM-enhanced Programming Error Messages are Ineffective in Practice". Only the title was reviewed here — [arXiv 2409.18661](https://arxiv.org/pdf/2409.18661)

**Design guidance**
- The ITiCSE 2019 working group report "Compiler Error Messages Considered Unhelpful" (Becker, Denny + 9 co-authors, DOI 10.1145/3344429.3372508; 34 pages, 219 references) gives 10 recommendations:
  1. Increase readability.
  2. Reduce cognitive load.
  3. Provide context to the error.
  4. Use a positive tone.
  5. Show examples of similar errors.
  6. Show solutions or hints.
  7. Allow dynamic interaction.
  8. Provide scaffolding.
  9. Use logical argumentation.
  10. Report errors at the right time.
  
  — [Greg Wilson's review (It Will Never Work in Theory)](https://neverworkintheory.org/2021/09/02/compiler-error-messages-considered-unhelpful.html)
- A Dagstuhl seminar report cites the working group as the basis for a corpus of 330 papers on programming error messages from 1965 to 2019 — [Dagstuhl Reports 12(1)](https://drops.dagstuhl.de/storage/04dagstuhl-reports/volume12/issue01/22052/html/DagRep.12.1.119/DagRep.12.1.119.html)
- Keuning, Jeuring & Heeren's systematic review (ACM TOCE 19(1), 2018) coded 101 feedback tools. It found that feedback "mostly focuses on identifying mistakes and less on fixing problems and taking a next step", and that teachers cannot easily adapt the tools. It classifies feedback with Narciss' content categories — [OU research portal](https://research.ou.nl/en/publications/a-systematic-literature-review-of-automated-feedback-generation-f/)

**Which errors novices hit (frequency data)**
- Pritchard, "Frequency Distribution of Error Messages" (PLATEAU 2015), used Python data from CS Circles. Out of 643,248 errors, the top 5 were:

  | Rank | Message | Count | Share |
  |---|---|---|---|
  | 1 | `SyntaxError: invalid syntax` | 179,624 | 27.9% |
  | 2 | `NameError: name '…' is not defined` | 97,186 | 15.1% |
  | 3 | `EOFError: EOF when reading a line` | 76,026 | 11.8% |
  | 4 | `SyntaxError: unexpected EOF while parsing` | 26,097 | 4.1% |
  | 5 | `IndentationError: unindent does not match…` | 20,758 | 3.2% |

  The top 5 together are about 62%. Message frequencies fit a Zipf–Mandelbrot distribution. The percentages were computed from the paper's counts — [Pritchard 2015 (arXiv 1509.07238)](https://ar5iv.labs.arxiv.org/html/1509.07238); [Wilson summary](https://neverworkintheory.org/2016/06/12/error-message-frequency.html)
- Altadmri & Brown, "37 Million Compilations" (SIGCSE 2015), analyzed 37,158,094 compilation events (17,682,007 failed) from 250,000+ BlueJ/Blackbox Java students in 2013–14.
  - Most common errors: mismatched brackets or quotes, then calling methods with wrong argument types, then a non-void method missing a return.
  - Slowest to fix: confusing short-circuit and bitwise operators, and using `==` instead of `.equals` on strings.
  - Educators reached only a weak consensus on which mistakes are most frequent.
  
  — [i-programmer summary](https://www.i-programmer.info/professional-programmer/accreditation/9675.html); [KAR record](https://kar.kent.ac.uk/46742); [Wilson review](https://neverworkintheory.org/2016/06/09/novice-programming-mistakes.html)
- Kohn, "The Error Behind the Message: Finding the Cause of Error Messages in Python," SIGCSE 2019, pp. 524–530, and Kohn & Manaris, "Tell Me What's Wrong: A Python IDE with Error Messages," SIGCSE 2020, are the Python-specific studies of where an error's real cause is. Their findings were not retrieved — [DBLP](https://dblp1.uni-trier.de/pid/159/0139.html)
- CPython has improved its own messages over several releases:
  - 3.10: "Did you mean …?" suggestions for NameError and AttributeError — [What's New 3.10](https://docs.python.org/3/whatsnew/3.10.html)
  - 3.11: fine-grained error locations in tracebacks (PEP 657) — [What's New 3.11](https://docs.python.org/3/whatsnew/3.11.html)
  - 3.12: suggests "Did you forget to import 'x'?" for standard-library names, and `self.x` when a NameError happens inside a method — [What's New 3.12](https://docs.python.org/3/whatsnew/3.12.html)
  - 3.13: suggests the right keyword argument, and warns when a script shadows a standard-library module name — [What's New 3.13](https://docs.python.org/3/whatsnew/3.13.html)

**Reusable open-source projects and licenses**
- **friendly / friendly-traceback** is **MIT**-licensed. It replaces tracebacks with explanations: `why()`, `what()`, and `where()`, which shows the location "including the value of relevant variables". It also gives "Did you mean" suggestions. It supports English and French and says it requires Python 3.6+. The repo has 731 commits and no archive notice. Neither the README nor PyPI mentions 3.12 or 3.13 — [GitHub](https://github.com/friendly-traceback/friendly-traceback); [PyPI](https://pypi.org/project/friendly)
- **Thonny** is **MIT**-licensed. Its Assistant explains a run-time error "in simpler terms", gives advice on finding and fixing it, and uses Pylint and Mypy plus custom dynamic analysis — [GitHub](https://github.com/thonny/thonny); [Thonny 3.0.0b5 notes](https://thonny.org/blog/2018/09/01/version_3_0_0b5.html)
- **PythonTA** (University of Toronto) is **GPL-3.0**. It is a suite of educational code-analysis tools built on pylint, pycodestyle and mypy, with beginner-friendly messages. Install with `pip install python-ta` — [GitHub](https://github.com/pyta-uoft/pyta); [docs](https://www.cs.toronto.edu/~david/pyta/)
- **Pedal** (Bart, Gusukuma et al.) is **MIT**-licensed. Instructor "control scripts" call feedback functions, which are grouped into Tools. Reports are resolved for display, and feedback carries categories such as "Specifications" and "Runtime". The CI badge shows Python 3.7–3.9 — [GitHub](https://github.com/pedal-edu/pedal)
- **CS50 help50**: `github.com/cs50/help50` returned HTTP 404 on 2026-10-11, so its code and license could not be checked. CS50 course materials in general are CC BY-NC-SA 4.0 — [minprog/cs50x license note](https://github.com/minprog/cs50x)

### Inferences
**Recommended approach.** Write your own template engine for about 12 exception types (P0). Use friendly-traceback as an optional fallback for types you have not templated, after checking that it runs on 3.12. Because the evidence is mixed, keep the raw Python message visible next to the friendly one; Becker's design showed both. Make the friendly text short, specific and context-rich, not long and generic.

**What a template contains.** Each template has four parts, following the working group's guidelines (context, cognitive load, positive tone, hints):
1. **What happened**, in one sentence of plain language.
2. **Where**: line number, the code snippet, and the expression involved.
3. **Evidence from runtime context**: variable values in the crashing frame.
4. **A next-step question**, not a fix.

Example for IndexError: "Line 4 tried to read `nums[i]` when `i` was 5, but `nums` has 5 items (positions 0–4). Loops that go one step too far often cause this — which values does your loop give `i`?"

**Capturing crash context inside the sandbox subprocess.** Run the student code with `compile(src, "<student>", "exec")`, catch the exception in the harness, and walk the traceback to the innermost frame whose `co_filename == "<student>"`.
```python
import traceback, reprlib
R = reprlib.Repr(); R.maxlist = 8; R.maxstring = 40; R.maxdict = 6; R.maxlevel = 2
SAFE = (int, float, bool, str, list, tuple, dict, set, type(None))

def crash_context(exc):
    frames = [(f, ln) for f, ln in traceback.walk_tb(exc.__traceback__)
              if f.f_code.co_filename == "<student>"]
    if not frames:
        return None
    f, ln = frames[-1]
    loc = {k: (R.repr(v) if type(v) in SAFE else f"<{type(v).__name__}>")
           for k, v in f.f_locals.items()}          # never call user-defined __repr__
    return {"type": type(exc).__name__, "msg": str(exc), "line": ln,
            "func": f.f_code.co_name, "locals": loc}
```
Then parse the source with `ast` and collect the nodes on the crash line, so the template can name the exact sub-expression:
- `ast.Subscript` for IndexError and KeyError
- `ast.BinOp` with `Div`/`FloorDiv`/`Mod` for ZeroDivisionError
- `ast.Call` for TypeError arity problems
- `ast.Attribute` for AttributeError

On 3.11+ you can underline the exact columns with `code.co_positions()` or the caret ranges in the traceback.

**Template set with context rules (P0).**

| Exception | Context to show | Explanation focus |
|---|---|---|
| IndexError | index value and `len(seq)` | off-by-one in the loop bound, or an empty list |
| KeyError | the missing key and up to 5 existing keys | key not present; suggest `in` or `.get` |
| ZeroDivisionError | the divisor expression and its value | usually `len(empty)` |
| TypeError (`unsupported operand`) | the types of both operands | e.g. adding str and int, often `input()` |
| TypeError (`'X' object is not callable`) | which name holds that value | a shadowed builtin (see §2) |
| TypeError (arity) | function name, args given vs expected | wrong number of arguments |
| ValueError | the value | e.g. `int("abc")`, `max([])` |
| AttributeError | type name and attribute; keep Python's "Did you mean" | e.g. calling a list method on None |
| NameError | keep Python 3.12's suggestion | typo, or a variable used before assignment |
| UnboundLocalError | — | assignment later in the function makes the name local |
| RecursionError | the parameter values of the last 3 frames | missing or unreachable base case |
| Timeout (from the sandbox) | static check for a `while` whose condition variables are never assigned in the body | likely infinite loop |
| EOFError / `input()` called | — | "this exercise passes values as parameters; remove `input()`" |

The last row matters because Pritchard's CS Circles data shows EOFError as the #3 error. In CodeQuest it will come from students calling `input()` inside a function-style exercise, so detect `input(` statically before running.

**Hidden-test safety.** For hidden tests, show only the exception type and the student-code line. Never show argument values or variables derived from the hidden input.

**LLM layer (optional).** Pass only a structured facts JSON (type, line, snippet, chosen variables, category) and ask for a rephrase. If the call fails or times out, fall back to the template verbatim. This matches the team's thesis, and the "Not the Silver Bullet" title suggests the LLM is not where the learning benefit comes from.

**Runtime cost.** Negligible: one traceback walk and one `ast.parse` per failing run, well under 10 ms. This is an estimate, not a measurement.

**Pitfalls**
- Calling `repr()` on user objects can run arbitrary code or loop forever. Restrict it to builtin types.
- Huge lists: use reprlib limits.
- Errors raised inside builtins have no student frame for that call. Use the innermost student frame instead.
- SyntaxError has no runtime frame. Use `e.lineno` / `e.offset` and Python 3.12's own message, which is already good.
- If the sandbox reformats the code (adds a harness), line numbers must still map back to the student's lines.

**Feasibility**

| Item | Build-hours |
|---|---|
| Crash-context capture | 1.5 |
| 12 templates | 3–4 |
| UI panel | 1 |
| friendly-traceback fallback (optional) | 1 |
| **Total** | **≈ 5–7** |

Reliability is high for runtime errors, because the exception type is ground truth. The guessed "likely cause" sentence should be phrased as a possibility ("often…"), not an assertion.

### Gaps
- No peer-reviewed ranking of runtime exceptions specific to Python function-style exercises was found. Pritchard's data covers a site with `input()`-based exercises.
- The Kohn (2019) and Kohn & Manaris (2020) findings were not retrieved.
- No effect sizes for Python-specific enhanced messages were found.
- friendly-traceback's compatibility with Python 3.12/3.13 is unconfirmed. Recommend a 15-minute spike: `pip install friendly-traceback` on 3.12 and raise each target exception.
- help50's current location and license are unknown (the repo returned 404).
- Thonny's Assistant is part of the IDE (Tk), not a standalone library. How easily its error-helper modules can be extracted was not checked.

---

## 2. Catalogs of novice logic errors and misconceptions, and how to detect each (static `ast` patterns vs dynamic signals)

### Takeaway
The catalogs exist: Sorva's 162 misconceptions, progmiscon.org's 30 Python entries, and Alzahrani & Vahid's 166 logic errors in 11 categories. Logic errors persist after syntax errors fade. Common Python mistakes like print-vs-return, range off-by-one and integer division are mostly not in progmiscon's Python list, so CodeQuest needs its own small detector set. Combine cheap AST patterns, which say *where*, with dynamic evidence (test tags, exception types, output-diff shapes), which says *whether it matters*. Show a mistake label only when the two agree, or when the dynamic signature is unambiguous.

### Cited Findings
- Sorva's catalogue (2012) lists **162 misconceptions**, 86 of them specific to Java. This is reported by a secondary Brazilian source, and the figure should be checked against Sorva's thesis — [SBC EduComp paper](https://sol.sbc.org.br/index.php/educomp/article/view/34194)
- **progmiscon.org** (Chiodini et al.'s curated inventory, 2021) lists **30 Python misconceptions**. Examples: DeferredReturn (thinking a mid-function return doesn't exit immediately), ReturnUnwindsMultipleFrames, MultipleValuesReturn, AssignmentCopiesObject, NoShortCircuit, ConditionalIsSequence, IfIsLoop, RecursiveFunctionNeedsIfElse, VariablesHoldExpressions. There are no Python entries for print-vs-return, range bounds or integer division. The page does not state a license — [progmiscon Python list](https://progmiscon.org/misconceptions/Python/); [Chiodini et al. 2021](https://luce.si.usi.ch/publications/2021-06-01-programming-language-misconceptions.html)
- Ettles, Luxton-Reilly & Denny, "Common logic errors made by novice programmers," ACE 2018, pp. 83–89 (DOI 10.1145/3160489.3160493). Only the citation was confirmed here — [DOI](https://doi.org/10.1145/3160489.3160493)
- Alzahrani & Vahid's survey covered 47 publications from 1985–2018. It identifies **166 logic errors in 11 categories** and highlights 43 as the most common or troublesome. Conceptual errors and loop errors are the two largest groups — [ASEE PEER](https://peer.asee.org/36814)
- Albrecht & Grabowski analyzed C submissions from 280 students. A large share of mistakes came from carelessness ("sloppiness") rather than misconceptions — [Göttingen SWE](https://www.swe.informatik.uni-goettingen.de/node/2881)
- A study of 684 artifacts from 38 students found 21 common errors in syntax, semantic, logic and type categories. Semantic and type errors were most frequent — [Springer chapter](https://link.springer.com/chapter/10.1007/978-3-030-95003-3_7)
- In a CS2 course, syntax and semantic errors mostly disappeared over the term, but **logical errors persisted** — [arXiv 2502.14438](https://www.arxiv.org/pdf/2502.14438)
- Altadmri & Brown's third most common Java error was a non-void method that can end without a return. Java catches this at compile time; Python silently returns `None` — [i-programmer](https://www.i-programmer.info/professional-programmer/accreditation/9675.html)
- **Misconception-driven feedback**: Gusukuma, Bart, Kafura & Ernst published "Misconception-Driven Feedback: Results from an Experimental Study" (ICER 2018, pp. 160–168). The related Virginia Tech dissertation argues that "authoring feedback using a cognitive student model supports student learning of programming" and reports two quasi-experimental studies. Their numbers were not retrieved — [VT dissertation](https://vtechworks.lib.vt.edu/handle/10919/99288)
- Since Python 3.8, the compiler gives a `SyntaxWarning` for identity checks (`is` / `is not`) against certain literals — [What's New 3.8](https://docs.python.org/3/whatsnew/3.8.html)
- Python's `ast` module provides `ast.parse`, `ast.walk`, `ast.NodeVisitor` / `ast.NodeTransformer`, `ast.unparse` (3.9+) and node line numbers. These are the primitives for static pattern detection — [ast docs](https://docs.python.org/3/library/ast.html)

### Inferences
**Detector catalogue.** Rows are in rough order of how common the mistake is in function-style exercises. "Static" means an `ast` pattern; "Dynamic" means a runtime signal.

| Mistake / misconception | Static detector (ast) | Dynamic signal | Precision when combined |
|---|---|---|---|
| **Print instead of return** | Target `FunctionDef` has no `Return` with a value but contains a `print(...)` call | Return value is `None` and captured stdout contains `str(expected)` | Very high (dynamic alone is near-certain) |
| **Missing return on some path** | Some path ends without `Return` (approximation: last statement is not Return/Raise and an `if` branch has no return) | `None` returned on some tests only | High |
| **Premature return inside loop** (DeferredReturn-like) | `Return` directly in a `For`/`While` body, not under an `If` | Output equals reference on the first element only, `reference(xs[:1])` | High |
| **Off-by-one in range/index** | `range(len(x)-1)`, `range(1, len(x))`, `range(n)` when the spec is inclusive, `x[len(x)]`, `<` vs `<=` against `len` | IndexError with index == len; diff shape "missing first/last element"; numeric diff equals the boundary element; tests tagged `boundary` fail | Medium (some `len(x)-1` loops are correct, e.g. pairwise), high with dynamic |
| **Unhandled empty input** | A risky operation on parameter `p` (`p[0]`, `p[-1]`, `max(p)`, `min(p)`, `/ len(p)`, `p.pop()`) with no earlier guard (`if not p`, `len(p) == 0`, `try/except`) | Tests tagged `empty` fail with IndexError, ValueError or ZeroDivisionError | High with dynamic |
| **Integer vs float division** | `/` where the result is used as an index or in `range()`; `//` where a mean or ratio is expected | TypeError "list indices must be integers or slices, not float"; expected int got equal float, or expected 2.5 got 2 | High |
| **Mutating a list while iterating** | `for x in L:` whose body calls `L.remove/append/pop/insert/extend/clear` or `del L[...]` | Wrong output with skipped elements; timeout with `append` | High (static alone is enough to warn) |
| **Shadowing builtins** | Assign, arg or for-target name in {`list, dict, str, sum, max, min, len, input, range, sorted, id, type`} | TypeError "'int' object is not callable" | Very high |
| **Wrong or missing base case** | The function calls itself and has no `If` with a `Return` that runs before the recursive call | RecursionError; tests tagged `base` (n=0/1, empty) fail | High |
| **Accumulator reset inside loop** | `Assign` to `x` inside a loop body where `x += …` also appears in that body | Output equals the last element's contribution | High |
| **`x == a or b` always true** | `BoolOp(Or)` whose non-first operand is a truthy `Constant` | Branch always taken | Very high |
| **`is` with literals** | `Compare` with `Is`/`IsNot` against a non-None `Constant` | Flaky equality results | Very high (Python already warns) |
| **Unreachable code after return** | Statements after a `Return` in the same block | — | Very high (style-level) |
| **Infinite while loop** | `While` whose condition names are never assigned in the body | Timeout | Medium–high |
| **Overlapping if-chain instead of elif** (ConditionalIsSequence) | Consecutive `If` statements assigning the same name with overlapping tests | Wrong output on boundary values | Medium |

**Example detector:**
```python
import ast
def print_not_return(tree, fname):
    for fn in ast.walk(tree):
        if isinstance(fn, ast.FunctionDef) and fn.name == fname:
            returns = any(isinstance(n, ast.Return) and n.value is not None for n in ast.walk(fn))
            prints = [n.lineno for n in ast.walk(fn) if isinstance(n, ast.Call)
                      and isinstance(n.func, ast.Name) and n.func.id == "print"]
            if prints and not returns:
                return {"id": "print_instead_of_return", "line": prints[-1]}
```

**Test tagging (key design decision).** In the challenge JSON, give every test, visible and hidden, tags from a fixed vocabulary: `empty`, `single`, `boundary`, `negative`, `duplicates`, `large`, `base`, `type-edge`.
- A failing test's tags point to candidate mistakes. For example, an `empty` failure points to unhandled empty input.
- Static hits supply the line number.
- The hint layer can then say "your code fails on an empty list" without revealing the hidden test's values. If even the category feels like a leak, show it only at a higher hint level.

**Evidence fusion rule (to avoid false accusations).** Emit a "recurring mistake" event to the learner model only if:
- (a) the dynamic signature is unambiguous (print-vs-return, shadowing TypeError, RecursionError), or
- (b) a static hit and a dynamic signal for the same category agree.

A static-only hit becomes a soft "consider…" note that does not update the model.

**Runtime cost.** A full AST pass with ~15 detectors on a 30-line function takes well under 5 ms (estimate).

**Pitfalls**
- Alternative correct solutions trigger false positives (e.g., `range(len(x)-1)` in pairwise loops, or `while` loops with `break`).
- Students may use helper functions. Analyze every `FunctionDef` but attribute findings to the target.
- Detectors must never run the student's code outside the sandbox. Parsing with `ast.parse` is safe, while `eval` is not.

**Feasibility**

| Item | Build-hours |
|---|---|
| Visitor framework + 10–12 detectors | 5–7 |
| Tag vocabulary + mapping table | 1 |
| Fusion rule | 1 |
| **Total** | **≈ 7–9** |

Do the top 6 (print/return, empty input, off-by-one, shadowing, base case, mutate-while-iterating) first, in about 4 hours.

### Gaps
- The quantitative findings of Ettles et al. (2018) were not retrieved. As remembered, they classify errors as algorithmic, misinterpretation and misconception, but this is unverified.
- The exact Sorva figures come from a secondary source.
- No Python-specific study measuring how often print-vs-return, integer division or mutate-while-iterating occur was found.
- No published precision/recall figures for AST-pattern detectors on novice Python were found. Gusukuma et al.'s ICER 2018 results and the PythonTA/Pedal evaluations would be the places to look.
- progmiscon.org's content license is not stated on the page.

---

## 3. Spectrum-based fault localization (Tarantula, Ochiai, DStar) on tiny programs with few tests; per-test line coverage in Python 3.12+; a safe "look here" heatmap

### Takeaway
Ochiai and DStar are the standard choices. They tie or beat Tarantula on large benchmarks, but they are imprecise even there (about 31% of faults ranked top-5 on Defects4J) and are known to be weak on student programs with few tests. Edmison & Edwards' heatmaps nonetheless found the faulty method in the top 3 about 90% of the time on intro-course code. For CodeQuest, use the crash line from the stack trace for runtime errors. Use SBFL only for wrong-output failures, enrich its spectra with differential-tested random inputs, and show it as a coarse "look around lines X–Y" hint. `sys.monitoring` (3.12+) with `DISABLE` + `restart_events()` gives cheap per-test line sets.

### Cited Findings
- Formulas used by Zou et al. (ICSE/TSE study of fault-localization families). ef/ep = failed/passed tests that execute the element; nf/np = failed/passed tests that do not:
  - **Ochiai** = ef / √((ef + nf)·(ef + ep))
  - **DStar** = ef^* / (ep + nf), with * = 2 following Wong et al.
  
  — [Zou et al. (arXiv 1803.09939)](https://ar5iv.labs.arxiv.org/html/1803.09939)
- On Defects4J (357 faults, statement level):
  - Ochiai: Top-1 = 16 (4%), Top-5 = 111 (31%).
  - DStar: Top-1 = 17 (5%), Top-5 = 111 (31%).
  - SBFL was the most effective standalone family, but for **crash faults stack-trace analysis was best** (20 of 90 at Top-1).
  - Combining techniques with learning-to-rank reached Top-1 = 72 (20%) and Top-5 = 168 (47%).
  
  — [Zou et al.](https://ar5iv.labs.arxiv.org/html/1803.09939)
- DStar modifies the Kulczynski coefficient. Other exponents "cannot be theoretically proven to be more efficient", so 2 is used — [FPA-FL (arXiv 1712.03359)](https://arxiv.org/pdf/1712.03359)
- Abreu et al. found Ochiai outperformed Jaccard and Tarantula on the Siemens suite. This is a secondary summary — [sosy-lab thesis](https://www.sosy-lab.org/research/bsc/2020.Ali.Test-Based_Fault_Localization_in_the_Context_of_Formal_Verification.pdf)
- **Python**: Rezaalipour & Furia (*Empirical Software Engineering* 29(4):92, 2024) studied 135 BugsInPy faults with SBFL, mutation-based, predicate-switching and stack-trace FL. A search excerpt reported no significant DStar-vs-Ochiai difference (p = 0.584), but the full text was not verified — [arXiv 2305.19834](https://arxiv.org/abs/2305.19834)
- **Student programs**: the MCPFL paper (IEICE 2023) states that **SBFL performs poorly on student programs**. Adding correct submissions to the same online-judge problem's spectrum improved the EXAM score by about 27.5% on average for D* across six datasets — [IEICE Trans.](https://global.ieice.org/en_transactions/information/10.1587/transinf.2023EDP7164/_f)
- **Heatmaps for students**: Edmison & Edwards ran GZoltar SFL output as heatmaps over the student's code (ACE 2017; earlier ISSRE-W 2015). Their 2019 VT report says the technique ranks the defective method among the 3 most suspicious **90% of the time**, based on manual inspection of intro-course submissions. It was deployed in CS 1114 (Fall 2017) with a student perception survey. The authors name the tension explicitly: give enough direction to help "without giving the student so much direction that they are effectively given the answer" — [ACE 2017 page](https://people.cs.vt.edu/bedmison/publication/2017-ace/); [ISSRE-W 2015](https://people.cs.vt.edu/~kedmison/publication/2015-issrew); ["Turning Up the Heat!" (VTechWorks)](https://vtechworks.lib.vt.edu/handle/10919/96008)
- A Python SBFL tool, **CharmFL** (a PyCharm plugin), exists. Only its title was reviewed — [arXiv 2108.12377](https://arxiv.org/pdf/2108.12377)
- **`sys.monitoring`** (added in 3.12):
  - Tool IDs 0–5, with `COVERAGE_ID = 1` by convention.
  - Lifecycle: `use_tool_id(id, name)`, then `register_callback(id, events.LINE, func)`, then `set_events(id, events.LINE)`.
  - The LINE callback signature is `func(code, line_number)`.
  - Returning `sys.monitoring.DISABLE` turns the event off for that code location only.
  - `restart_events()` re-enables all disabled events, for all tools.
  - `set_local_events(id, code, events)` limits monitoring to one code object. `free_tool_id` releases the ID.
  - The docs call per-location disabling "very important for high performance monitoring".
  - The docs say nothing about thread safety.
  
  — [Python docs: sys.monitoring](https://docs.python.org/3/library/sys.monitoring.html)
- **coverage.py** added a `sys.monitoring` core in **7.4.0** (`COVERAGE_CORE=sysmon`). **Dynamic contexts (per-test contexts) and plugins are not supported** with sysmon, and coverage.py falls back to the default core with a warning. Since 7.9.2, sysmon is the default on 3.14+ when the configuration allows — [Ned Batchelder blog](https://nedbatchelder.com/blog/202312/coveragepy_with_sysmonitoring.html); [coverage.py: how it works](https://coverage.readthedocs.io/en/7.13.5/howitworks.html); [coverage.py messages](https://coverage.readthedocs.io/en/7.14.1/messages.html). A copy of coverage.py's source header says it is Apache-2.0 licensed — [coverage/core.py header (mirror)](https://dawn2.umd.edu/cwrf-bias-correction-env/lib/python3.1/site-packages/coverage/core.py)

### Inferences
**Should you use it?** For runtime-error failures, the crash frame is better localization than SBFL (Zou et al.: stack trace wins for crash faults). Use SBFL only for wrong-output failures.

The tiny-program problem: in a 10–15 line function, almost every line runs on every test, so most lines tie. **Local experiment (CPython 3.12.0, collector below):** the student's `total(xs)` sums with the off-by-one loop `for i in range(len(xs) - 1)`. Six inputs (`[]`, `[1]`, `[1,2]`, `[0,0,0]`, `[3,4,5]`, `[0]`) gave 3 failures. Ochiai scored the faulty `for` line **0.707, tied with `s = 0` and `return s`**, and the loop body got 0.667. SBFL could not single out the bug, while the AST detector for `range(len(xs) - 1)` (§2) points straight at it. Raise the signal by adding labeled runs from **differential testing** (§8). Generate 50–200 small random inputs, label each pass/fail by comparing with the reference solution, and score lines over all of them. Showing these runs costs nothing in secrecy because nothing about hidden tests is revealed. This mirrors MCPFL's finding that more data improves SBFL on student code.

**Collector (3.12+, in-sandbox, per test):**
```python
import sys, math
mon = sys.monitoring
TOOL = mon.COVERAGE_ID

def spectra_for(func, cases, reference):          # cases: list of arg tuples
    hits, out = set(), []
    def on_line(code, line):
        if code.co_filename == "<student>":
            hits.add(line)
        return mon.DISABLE                         # fire once per location per test
    mon.use_tool_id(TOOL, "codequest-sbfl")
    mon.register_callback(TOOL, mon.events.LINE, on_line)
    mon.set_events(TOOL, mon.events.LINE)
    try:
        for args in cases:
            hits.clear(); mon.restart_events()     # re-arm all lines for this test
            try:
                ok = func(*args) == reference(*args)   # pass deep copies in real code
            except Exception:
                ok = False
            out.append((frozenset(hits), ok))
    finally:
        mon.set_events(TOOL, mon.events.NO_EVENTS)
        mon.register_callback(TOOL, mon.events.LINE, None)
        mon.free_tool_id(TOOL)
    return out
```
Note that `reference(*args)` also runs under monitoring. Its lines are filtered out because its `co_filename` is not `"<student>"`, and `DISABLE` makes it cheap.

**Scoring.**
- Ochiai as above.
- DStar: `ef**2/(ep+nf)`, scored as ∞ when the denominator is 0 and ef > 0.
- Tarantula: `(ef/F)/((ef/F)+(ep/P))`. This is the standard Jones & Harrold form, not verified in this session.

Ochiai is recommended because it is bounded in [0, 1], which makes it easy to map to colors.

**Safe presentation**
- Never show raw scores and never show which hidden test covered which line.
- Bucket the scores:
  - top-1 or top-2 lines (with ties broken toward lines that differ from the reference AST, §4) get "look here".
  - the next tier gets "possibly related".
  - everything else stays uncolored.
- Show it only at hint level ≥1 and only when fail count ≥ 1 and pass count ≥ 1. With zero passing runs, every executed line ties.
- Suppress it when more than 60% of lines tie for the top score. It gives no information then.
- Edmison & Edwards' tension suggests highlighting a region (2–4 lines) at level 1 and a single line only at a later level.

**Runtime cost.** For under 15 lines × 200 runs, expect tens of milliseconds total. The LINE callback fires at most once per line per run, thanks to `DISABLE`. This is an estimate, not a benchmark.

**Reliability.**
- Good at block level for branchy code (if/else, loops with early exits).
- Weak for:
  - faults in lines every input executes (e.g., a wrong initializer)
  - missing-code faults (a missing guard has no line to blame — the classic SBFL blind spot)
  - mutate-while-iterating bugs, where all inputs touch the same lines

Fuse with the AST detectors (§2): if a detector fires, its line wins.

**Feasibility**

| Item | Build-hours |
|---|---|
| Collector + scoring | 2 |
| Bucketing + suppression rules | 1 |
| Editor gutter heatmap (frontend) | 1.5–2 |
| **Total** | **≈ 4–5** |

Priority: P1, a wow-factor demo feature that is not essential.

### Gaps
- No study of SBFL accuracy on single-function Python exercises with fewer than 10 tests was found. Edmison's 90% figure is at method level for Java CS1 projects with larger test suites.
- No measured overhead numbers for `sys.monitoring` vs `sys.settrace` on tiny programs were found; the Ned Batchelder blog fetch failed.
- The full-text results of Rezaalipour & Furia (which formula is best on Python) were not verified.
- The effect of SBFL heatmaps on student learning (as opposed to perceptions) was not found.

---

## 4. Automated hint generation and program repair (Hint Factory, ITAP, Clara, Refactory, Sarfgen): which ideas work without large datasets

### Takeaway
The data-driven systems (Hint Factory, ITAP, Clara, Sarfgen) reach 80–97% hint or repair coverage, but they need many prior student or correct solutions. Refactory shows that one reference solution can be enough, using refactoring plus block-level synthesis. Next-step code hints raised immediate performance, but learning only improved with explanations plus self-explanation prompts. The hackathon-feasible core: canonicalize the code, diff its AST against 1–3 team-written reference solutions to *locate* and *categorize* the discrepancy (not to show code), and run a single-edit "repair by mutation" search to confirm the minimal fix location.

### Cited Findings
- **Hint Factory** (Barnes & Stamper) builds a Markov decision process from past student solution paths in a logic-proof tutor, using four semesters of data. It could give hints **over 80% of the time**, with a trade-off between how specific the hint is and how much data is needed. A 2011 follow-up showed that a few expert solutions gave over 50% hint coverage — [Barnes & Stamper 2010 (JETS 13(1))](https://learntechlib.org/p/75238); [2008 ITS paper](https://www.doi.org/10.1007/978-3-540-69132-7_41); [2011 follow-up](https://unpaywall.org/10.3233%2FJAI-2011-021)
- The **Continuous Hint Factory** extends the idea to "vast and sparsely populated edit distance spaces" such as programming — [JEDM](https://jedm.educationaldatamining.org/index.php/JEDM/article/view/158)
- **ITAP** (Rivers & Koedinger, IJAIED 27(1):37–64, 2017) is a self-improving Python tutor. It has three stages: **canonicalization** (normalize the AST), **path construction** (find the closest correct state and the edits toward it) and **reification** (map those edits back onto the student's own code). Per the thesis summary, it can generate next-step hints for essentially all submissions and chain them into a worked example — [CMU thesis (KiltHub)](https://kilthub.cmu.edu/articles/thesis/Automated_Data-Driven_Hint_Generation_for_Learning_Programming/6714911); [CMU CSD publication list](https://www.csd.cs.cmu.edu/publications-by-person/16227)
- **Clara** (Gulwani, Radiček & Zuleger, PLDI 2018) clusters correct student submissions and repairs incorrect ones against the clusters. On 4,293 incorrect MITx attempts it repaired **97%**, and **81%** of those repairs were small and good quality. In a 52-participant user study, usefulness averaged **3.4 out of 5**. It is open source — [arXiv 1603.03165](https://arxiv.org/pdf/1603.03165); [GitHub fork](https://github.com/oolimry/clara)
- **Sarfgen** (Wang, Singh & Su, PLDI 2018) searches for similar correct programs, aligns them with the student's, and computes minimal fixes. It produced feedback for **89.7%** of incorrect submissions in about 2 s on average, and was deployed in the edX course Microsoft DEV204.1x — [arXiv 1711.07148](https://arxiv.org/pdf/1711.07148)
- **Refactory** (Hu, Ahmed, Mechtaev, Leong & Roychoudhury, ASE 2019) refactors the correct program into variants that align with the buggy one. It then infers input-output specifications for blocks from aligned correct executions and repairs blocks by search-based synthesis. It was evaluated on about 1,800 incorrect Python submissions from 361 students. About 30% of its patches were smaller than Clara's, and it worked with fewer correct solutions ("often a single correct solution") in less time. It is implemented in Python 3.7 — [ASE 2019 paper (UCL)](https://discovery.ucl.ac.uk/10091878/1/ase19.pdf); [ASE 2019 page](https://2019.ase-conferences.org/details/ase-2019-papers/16/Re-factoring-based-Program-Repair-applied-to-Programming-Assignments); [GitHub](https://github.com/githubhuyang/refactory)
- **Hint effectiveness**: Marwan, Williams & Price (ICER 2019) found that next-step code hints **with textual explanations** significantly improved immediate programming performance. They improved a later post-test task **only when combined with self-explanation prompts**. Study 2 used MTurk participants with no programming experience in a block-based environment. A precursor paper notes that code hints without explanations "tell the student what to do but do not explain why", which can lower trust — [ICER 2019 page](https://isnap.csc.ncsu.edu/home/public/publication/marwan-2019-icer); [ITiCSE 2019 paper](https://isnap.csc.ncsu.edu/home/public/papers/MarwanITiCSE2019.pdf)
- Most feedback tools stop at identifying mistakes rather than suggesting a next step — [Keuning et al. 2018](https://research.ou.nl/en/publications/a-systematic-literature-review-of-automated-feedback-generation-f/)

### Inferences
**What to borrow without a dataset**
1. **Canonicalization (from ITAP).** `ast.parse`, then:
   - drop docstrings and comments;
   - rename local variables and parameters to `v0, v1…` in order of first appearance;
   - normalize `x += 1` → `x = x + 1`, `not (a == b)` → `a != b`, `elif` chains;
   - sort commutative `BoolOp` operands;
   - turn `for i in range(len(xs)): xs[i]` into an iterator form only for comparison.
   
   Then `ast.dump` each statement.
2. **Multiple references instead of a student corpus.** For each challenge the author writes 2–3 reference variants (loop, comprehension, builtin). This is a hand-made stand-in for Clara/Sarfgen clusters. Refactory's single-reference result suggests a few references are enough when the exercises are tiny.
3. **Statement-level alignment.** Align canonical statement sequences with `difflib.SequenceMatcher` (stdlib) on the per-statement dumps. Pick the closest reference by edit ratio, then classify the differing nodes:

   | AST difference | Category |
   |---|---|
   | different `Compare` op | boundary/condition |
   | different `range` args | loop bounds |
   | reference has a top-level `If` with `Return` that the student lacks | missing guard → empty-input/base case |
   | `Return` vs `print` | output |
   | missing `Return` | — |
   
   Hints use only the **category and location**, never reference code. That fits the "point/teach" levels in §5.
4. **Repair-by-mutation search (a mini-Refactory).** Apply each single mutation from the §7 operator set to the *student's* code (about 20–80 mutants for a 15-line function). Run the visible + hidden tests on each mutant inside one sandbox process. If some mutant passes everything, you have a verified one-edit fix: its line and operator category give a high-confidence hint ("one comparison on line 6 is slightly off"). This replaces data-driven repair for the most common one-token bugs (off-by-one, wrong operator, `/` vs `//`, missing `return`).
5. **Explanations plus self-explanation.** Following Marwan et al., attach a "why" sentence to every code-level hint and ask a one-line self-explanation prompt ("In your own words, why does the loop need to stop at `len(xs)`?"). It is cheap to add.

**Runtime cost**
- Canonicalization + diff: under 20 ms.
- Repair search: N mutants × (visible + hidden tests). For 60 mutants × 15 tests of tiny functions, expect roughly 0.2–2 s in one process. Budget a hard cap of 3 s and stop at the first full-pass mutant (estimate).

**Pitfalls**
- Solutions that are structurally different from every reference give useless diffs. Fall back to SBFL/detectors and generic hints.
- Renaming must respect builtins and globals.
- Repair search can find "fixes" that pass the tests but are semantically odd (overfitting). Only use the *location and category*, never present the mutant as "the answer".
- Never let diff output reach the client unfiltered (leak risk, §5).

**Feasibility**

| Component | Build-hours | Priority |
|---|---|---|
| Canonicalizer + statement diff + category mapping | 4–5 | P1 |
| Repair-by-mutation search (reuses §7 mutator) | 2–3 extra | P1/P2 |
| Full ITAP, Clara, Sarfgen or Refactory reimplementation | — | Not feasible in 24 h (each is a multi-month research system; Refactory's code targets Python 3.7) |

### Gaps
- Refactory's exact repair rates and run times were not retrieved; the NUS PDF returned 403.
- Learning-gain evidence for ITAP-style hints was not verified. A search summary suggested little learning impact, but the primary source was not confirmed.
- Licenses of the Clara and Refactory repositories were not checked.
- No study evaluating "single-reference AST diff → category hint" for Python novices was found. This design is an inference.

---

## 5. Progressive hint design: hint-level taxonomies, bottom-out abuse, help-seeking, penalties, and guaranteeing each hint is strictly more specific without revealing the solution

### Takeaway
The classic ITS sequence (Andes) is **pointing/goal hint → teaching hint → bottom-out hint**. Students abuse on-demand hints heavily: hint abuse on 36% of actions in one Cognitive Tutor study, or 14% when rapid clicks are counted as one. Help-seeking tutoring changed behavior but not learning. CodeQuest should use a 4-level ladder with no bottom-out level. Gate each level behind a new attempt or a short delay. Make specificity monotone by construction: each hint adds exactly one new "fact" to a growing set, plus an automated leak check against the reference solution.

### Cited Findings
- **Andes (VanLehn)**: when a step is wrong it turns red, and the tutor then offers a **goal (pointing) hint → teaching hint → bottom-out hint** — [VanLehn talk slides](https://companion.ict.usc.edu/talks/VanLehn%20ILLC-ICT%203Oct08%20-%20Interaction%20Plateau.pdf). Andes chose hints using a Bayesian-network student model and a "theory of hinting" — [Gertner, Conati & VanLehn, AAAI 1998](https://mlanthology.org/aaai/1998/gertner1998aaai-procedural)
- **Help abuse**: in a Geometry Cognitive Tutor study, students abused hint facilities on **36% of actions**, or **14%** when successive rapid hint requests count as one action. Abuse includes rapidly clicking through to bottom-out hints, a form of "gaming the system". The other failure mode is **help avoidance** — [LearnLab wiki: Help abuse](https://learnlab.org/research/wiki/index.php/Help_abuse)
- Aleven et al.'s **Help Tutor** gave real-time feedback on help-seeking behavior. Students used help more deliberately, even after the feedback was withdrawn, but **learning outcomes did not improve** — ["Help Helps, but only so Much"](https://cris.iucc.ac.il/en/publications/help-helps-but-only-so-much-research-on-help-seeking-with-intelli/). This attribution comes from a search summary.
- A 2026 LAK paper reports that **asking for hints immediately on difficulty is associated with poorer learning outcomes** — [An et al., "Revisiting the Hint Button" (LAK 2026)](https://www.cs.cmu.edu/afs/cs.cmu.edu/Web/People/bmclaren/pubs/AnEtAl-RevisitingTheHintButton-LAK2026.pdf)
- In Andes, more unsolicited hints plus **meta-hints** (prompts to click the hint button, without content) significantly reduced hint refusal and increased learning — [Ranganathan thesis (ASU)](https://keep.lib.asu.edu/system/files/c7/60314/tmp/package-HSFqpa/Ranganathan_asu_0010N_11035.pdf)
- **Examples as help**: fully justified worked examples were at least as effective as hint sequences and more efficient. Hint sequences can degenerate into the system "telling them each step", effectively a worked example — [LearnLab: Ringenberg Examples-as-Help](https://learnlab.org/research/wiki/index.php/Ringenberg_Examples-as-Help)
- Next-step code hints help learning only with explanations plus self-explanation prompts — [Marwan et al., ICER 2019](https://isnap.csc.ncsu.edu/home/public/publication/marwan-2019-icer)
- A 2024 survey of hint-generation research describes hints as scaffolding ("incremental steps leading to the solution") and says **no holistic quality measure for programming hints exists** — [Jangra et al. (arXiv 2404.04728)](https://arxiv.org/html/2404.04728)

### Inferences
**Ladder for CodeQuest.** Free automatic feedback comes first and is *not* a hint: per-test outcome categories (§9) plus the plain-language error explanation (§1).

| Level | Name (ITS analogue) | New fact(s) added | Source technique | Example |
|---|---|---|---|---|
| H1 | **Where** (pointing) | the concept and a region (function → block, 2–4 lines) | SBFL bucket (§3) / detector line (§2) / diff location (§4) | "Look at how your loop decides when to stop (lines 3–6)." |
| H2 | **What** (diagnosis + counterexample) | mistake category + one non-hidden failing input with expected vs actual | detectors + output-diff class (§9) + Hypothesis (§8) | "For `[4]` you return `0` but should return `4` — your loop may skip an element." |
| H3 | **Teach** (concept) | concept explanation + worked example on a *different* mini-problem | static per-concept snippet library | "`range(a, b)` stops *before* b. Example: summing 1..n uses `range(1, n+1)`." |
| H4 | **Shape** (near bottom-out, never the solution) | code skeleton for the *single* faulty construct, with holes | one canonical statement from the matching reference, with operands replaced by `___` | "`for i in range(___, ___):`" |

There is no H5 "show solution" during an active attempt. Offer a full solution only after the challenge is closed (give up → mastery penalty) or in review mode.

**Guaranteeing strictly increasing specificity (monotone information)**
- Define a fact vocabulary F = {`concept`, `region(level∈{function, block, line})`, `category`, `counterexample`, `expected_output`, `skeleton`}.
- Each hint k reveals a set R_k. The hint engine enforces **R_{k−1} ⊊ R_k**: each level is generated by adding facts to the previous set, never by independent generation.
- Region granularity must refine: function ⊃ block ⊃ line.

**Leak guard (an automated test for every challenge in CI)**
- Normalize the reference solution(s) into statements, both canonical-AST dumps and whitespace-stripped text.
- Reject any hint text that:
  - (a) contains a complete normalized reference statement,
  - (b) has token overlap with the reference above about 30% (heuristic threshold), or
  - (c) at H4, fills more than one statement or shows any operand that is a "key" token of the solution (e.g., `n+1`).
- Write pytest checks that enumerate every hint template for every challenge × detector category. This is cheap and catches authoring mistakes.

**Anti-abuse and penalties** (inferred from the help-abuse and LAK findings)
- Unlock H(k+1) only after a **new submission** (code changed) or a **~45–60 s cooldown**. These numbers are judgement calls, not sourced.
- Show a meta-hint ("Want a nudge? Try H1") after 2 consecutive failed submissions; this counters help avoidance.
- XP multiplier: 1.0 (no hints), 0.9 (H1), 0.75 (H2), 0.6 (H3), 0.4 (H4).
- For the learner model, see §6: success after H3+ counts as incorrect for mastery.

**Fit with the "LLM only rephrases" thesis.** The ladder works without an LLM. An LLM may rephrase H1–H3 text from the fact set, but the leak guard must also run on LLM output, and the H4 skeleton must stay template-only.

**Runtime cost.** Negligible; hint generation reuses already-computed analysis.

**Pitfalls**
- Over-specific H1 lines can effectively be bottom-out on tiny programs, because one line is often the whole fix. Keep H1 at block level.
- A counterexample can coincide with a hidden test (§8).
- Hints for multi-bug submissions: address the earliest-failing or highest-confidence category first, and say "there may be more than one issue".

**Feasibility**

| Item | Build-hours |
|---|---|
| Ladder orchestrator + fact model | 2–3 |
| Templates for the top ~8 categories × 4 levels | 3–4 |
| Concept snippet library (~10 concepts) | 1–2 |
| Leak-guard tests | 1 |
| **Total** | **≈ 7–10** |

Priority: P0, the core of the problem statement.

### Gaps
- The original Aleven et al. sources for the 36%/14% figures and the help-seeking model were not read directly (LearnLab summary used).
- No experimental evidence was found on optimal cooldowns, hint penalties or XP multipliers in programming tutors. Those values are judgement calls.
- No study was found that validates a "monotone fact-set" hint guarantee. This is a design proposal.
- Evidence comparing the pointing → teaching → bottom-out ordering against alternatives *in programming* was not found; the Andes evidence is from physics.

---

## 6. Learner modeling: BKT, PFA, Elo, DKT vs BKT, Q-matrix tagging, mastery thresholds, hint use and partial success, spaced repetition, pyBKT

### Takeaway
With no training data and a 24-hour build, use **hand-parameterized BKT per concept** (about 20 lines) for interpretable "mastery bars", or **Elo with an uncertainty function** for learner skill + challenge difficulty (self-calibrating, about 10 lines). Pelánek recommends U(n) = 1/(1 + 0.05n) as a starting point. DKT is not justified: extended BKT matches DKT accuracy and is interpretable. Add a per-misconception counter (from §2) to drive adaptation, and optionally FSRS (MIT, `pip install fsrs`) for concept review scheduling.

### Cited Findings
**BKT**
- BKT update equations, from the pyBKT paper:
  - Correct: P(L_t | obs=1) = P(L_t)(1−P(S)) / [P(L_t)(1−P(S)) + (1−P(L_t))P(G)]
  - Incorrect: P(L_t | obs=0) = P(L_t)P(S) / [P(L_t)P(S) + (1−P(L_t))(1−P(G))]
  - Transition: P(L_{t+1}) = P(L_t|obs) + (1−P(L_t|obs))·P(T)
  - Standard BKT assumes no forgetting.
  
  — [Badrinath, Wang & Pardos, pyBKT (arXiv 2105.00385)](https://ar5iv.labs.arxiv.org/html/2105.00385)
- Parameter meanings: p(L0) = known before the first opportunity; p(T) = learned at each opportunity; p(G) = guess when unknown; p(S) = slip when known. A teaching example uses L0 = 0.4, T = 0.1, S = 0.3, G = 0.2 (illustrative only) — [UPenn MOOT slides](https://learninganalytics.upenn.edu/MOOT/slides/W004V002.pdf)
- Reported values:
  - Fitted, ASSISTments "Polynomial Factors": prior 0.17, learn 0.13, guess 0.26.
  - Synthetic Algebra-like ground truth: prior 0.08, guess 0.15, slip 0.05, learn 0.3, forget 0.
  
  — [pyBKT paper](https://ar5iv.labs.arxiv.org/html/2105.00385)
- Fitted parameter sets can have "highly divergent values for guess and slip" (identifiability) — [EDM 2018 paper 14](https://educationaldatamining.org/files/conferences/EDM2018/papers/EDM2018_paper_14.pdf)

**pyBKT**
- **MIT**-licensed. Installs with `pip install pyBKT`; the C++ build falls back to pure Python, and **Windows gets the pure-Python version only**.
- Supports KT-IDEM (`multigs`), KT-PPS (`multiprior`), forgetting (`forgets`), item order (`multipair`) and item learning effects (`multilearn`).
- Correctness coding: −1 / 0 / 1.

— [GitHub CAHLR/pyBKT](https://github.com/CAHLR/pyBKT); [paper](https://ar5iv.labs.arxiv.org/html/2105.00385)
- pyBKT speed, pure Python vs C++: fitting 500 students took 160.12 s vs 1.07 s. Accuracy on ASSISTments 2009–10: standard BKT AUC 0.76 (Khajah et al. reported 0.73); **BKT+Forget AUC 0.83**, matching Khajah et al. — [pyBKT paper](https://ar5iv.labs.arxiv.org/html/2105.00385)

**DKT vs BKT**
- Khajah, Lindsey & Mozer, "How deep is knowledge tracing?" (EDM 2016 best paper): BKT extended for recency/forgetting, contextualized trial sequence, inter-skill similarity and individual ability performs **indistinguishably from DKT**. Knowledge tracing "may be a domain that does not require depth", and shallow models are more interpretable — [arXiv 1604.02416](https://arxiv.org/pdf/1604.02416); [EDM 2016 proceedings](https://educationaldatamining.org/EDM2016/proceedings.html)

**PFA**
- Performance Factors Analysis (Pavlik, Cen & Koedinger 2009): logit(p) = β + Σ_c (γ_c·s_c + ρ_c·f_c), where s and f are prior success and failure counts on knowledge component c. A worked example with γ = 0.2, ρ = 0.1, β = −0.5 gives p ≈ 0.38 on the first attempt. Notation varies between sources — [LASER-KT PFA module](https://yilinl.quarto.pub/pfa/); [arXiv 2411.07028 §3.1.2](https://arxiv.org/pdf/2411.07028)

**Elo (Pelánek 2016, *Computers & Education*)** — all from [Pelánek accepted manuscript](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf)
- Core equations: P(correct) = 1/(1 + e^{−(θ_s − d_i)}); θ_s := θ_s + K·(correct − P); d_i := d_i + K·(P − correct).
- Earlier student-modeling work used **K = 0.4**. A better approach is an uncertainty function **U(n) = a/(1 + b·n)** with **a = 1, b = 0.05**, which the paper calls a "good starting point". It fits by grid search later, and many (a, b) choices give similar results. Separate uncertainty functions for students and items are useful because items get far more answers.
- Multivariate extension: θ_sj := θ_sj + c_ij·K·(correct − P) for correlated knowledge components.
- PFAE variant: separate constants γ and δ for correct vs incorrect answers. Guessing for k-option questions: P = 1/k + (1 − 1/k)/(1 + e^{−(θ−d)}).
- New items start at difficulty 0 and are learned from answers. Elo suits "adaptive practice or low stakes testing".
- Pelánek cites Papoušek et al. (2014), where PFAE predicted better than standard PFA and BKT.

**Target difficulty**
- Papoušek, Stanislav & Pelánek (ITS 2016) ran an experiment with target **error rates of 5%, 20%, 35% and 50%** in an adaptive geography practice system.
- **Easy questions were better for short-term engagement; difficult questions were better for long-term engagement and learning.** Return rate rose from 15.2% (5% target) to 16.8% (50% target).
- The authors warn against optimizing only short-term behavior. The extended report flags attrition bias.

— [ITS 2016 paper](https://www.fi.muni.cz/~xpelanek/publications/its-target-difficulty.pdf); [tech report FIMU-RS-2016-02](https://www.fi.muni.cz/reports/files/2016/FIMU-RS-2016-02.pdf)

**Mastery**
- Corbett & Anderson (1995), "Knowledge Tracing: Modeling the Acquisition of Procedural Knowledge," *UMUAI* 4:253–278, underpins the Cognitive Tutor's mastery-learning criterion — [National Academies summary](https://www.nationalacademies.org/read/10297/chapter/6). The commonly quoted **0.95** threshold was **not confirmed** in sources retrieved here (see Gaps).

**Spaced repetition**
- **SM-2**:
  - EF starts at 2.5.
  - Update: EF' = EF + (0.1 − (5−q)(0.08 + (5−q)·0.02)), with a floor of **1.3**.
  - Intervals: 1 day, then 6 days, then I·EF.
  - A grade q < 3 resets repetitions.
  - These details come from implementations, not SuperMemo's own text. SM-2 dates to 1987.
  
  — [pub.dev spaced_repetition docs](https://pub.dev/documentation/spaced_repetition/latest/); [cnnrhill/sm-2](https://github.com/cnnrhill/sm-2); [Wikipedia: SuperMemo](https://en.wikipedia.org/wiki/SuperMemo)
- **FSRS (py-fsrs)**:
  - **MIT**-licensed, Python ≥ 3.10.
  - API: `Scheduler()`, `Card()`, `Rating.Again/Hard/Good/Easy` (1–4), `scheduler.review_card(card, rating)`, `get_card_retrievability(card)`.
  - Default `desired_retention` is **0.9**, with 21 default weights. An optional Optimizer fits weights from review history.
  
  — [GitHub py-fsrs](https://github.com/open-spaced-repetition/py-fsrs)
  
  A higher desired retention means more reviews — [FSRS wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-optimal-retention)

### Inferences
**Recommended model stack (no data, interpretable, about 4–6 hours)**

**1. Q-matrix.** Tag each challenge with 1–3 concepts from a fixed list of about 10: `variables`, `conditionals`, `loops`, `lists`, `strings`, `dicts`, `functions/return`, `recursion`, `edge-cases`, `algorithms`. Also tag tests with edge-case tags (§2). Detectors map to **misconception skills**: `off_by_one`, `empty_input`, `print_vs_return`, `int_division`, `mutate_while_iter`, `shadow_builtin`, `base_case`. This gives a 2-layer model: concept mastery plus misconception propensity.

**2. BKT per concept**, hand-set defaults: p_init = 0.3, p_T = 0.15, p_G = 0.2, p_S = 0.1, mastery at 0.95. With these values a learner reaches ≥ 0.95 after **3 consecutive clean successes** (0.30 → 0.71 → 0.93 → 0.99, computed with the equations above). One failure from 0.71 drops to about 0.35. That is responsive enough for a demo and interpretable in a pitch. Keep G < 0.3 and S < 0.1 to avoid degenerate behavior, given the guess/slip identifiability problem.
```python
def bkt(p, correct, T=0.15, G=0.2, S=0.1):
    num = p * (1 - S) if correct else p * S
    den = num + ((1 - p) * G if correct else (1 - p) * (1 - G))
    post = num / den
    return post + (1 - post) * T
```

**3. Observations from one submission.** This is a heuristic, not standard BKT.
- Use the **first submission** per challenge as the main BKT observation (Cognitive Tutor-style "first attempt" logic). Later attempts update only the misconception counters.
- **Partial test success** as soft evidence: post = w·P(L|correct) + (1−w)·P(L|incorrect), where w is the fraction of that concept's tagged tests passed. Then apply the transition.
- **Hint use**:
  - success with no hint or H1 counts as correct;
  - success after H2 uses w = 0.5;
  - success after H3/H4 counts as incorrect for mastery, but the learner still gets the transition (learning opportunity).

**4. Elo (alternative or complement) for challenge selection.** Keep θ per learner per concept and d per challenge. Use U(n) = 1/(1 + 0.05n) per Pelánek and outcome r = fraction of tests passed. Graded r in [0, 1] is an inference; Pelánek's equations use binary outcomes.
```python
import math
def elo(theta, d, r, n_s, n_i, a=1.0, b=0.05):
    p = 1 / (1 + math.exp(-(theta - d)))
    theta += a / (1 + b * n_s) * (r - p)
    d     += a / (1 + b * n_i) * (p - r)
    return theta, d, p
```
New challenges start at d = 0, or at an author-assigned prior: easy = −1, medium = 0, hard = +1.

**5. Next-challenge policy.**
- Among challenges whose concepts are not yet mastered, pick the one with predicted success closest to **~0.65**. That is a 35% error target, a compromise between Papoušek et al.'s "harder is better for learning" and short-term engagement in a demo.
- If a misconception counter fires (the §2 fusion rule fired ≥ 2 times in the last 5 submissions, with exponential decay of 0.8 per submission), insert a **targeted challenge**. Its hidden tests stress that edge (e.g., empty inputs), or it is a **debugging exercise** seeded with the same bug type (§7).
- Pin this as the "adapts future challenges" demo moment.

**6. Spaced review.** When a concept reaches mastery, create an FSRS card per concept. Map outcomes:
- first-try pass without hints → `Good` (or `Easy` if fast);
- pass with hints → `Hard`;
- fail → `Again`.

Surface "due for review" challenges on the dashboard. Integrating `pip install fsrs` takes about 1 hour; SM-2 hand-rolled is about 20 lines if you want zero dependencies.

**7. Models to skip at the hackathon.**
- DKT: no data, uninterpretable; Khajah et al. show extended BKT matches it.
- pyBKT fitting: needs logged data; usable after the event to fit parameters from real usage. MIT, works on Windows in pure Python.

**Runtime cost.** Microseconds per update.

**Reliability.** Hand-set BKT parameters are arbitrary but monotone and explainable. Elo self-calibrates challenge difficulty after a few dozen attempts, which is good for the demo if seeded with fake learners.

**Pitfalls**
- Concept tags that are too coarse make mastery bars meaningless.
- Multi-concept challenges: update each tagged concept with the same evidence, a simplification.
- Do not show "0.95" to students. Show bands: learning / almost there / mastered.

**Feasibility**

| Item | Build-hours |
|---|---|
| Q-matrix tagging of ~15 challenges | 1–1.5 |
| BKT + soft evidence + hint rules | 1.5 |
| Misconception counters + targeted-challenge rule | 1.5 |
| Elo + selector | 1.5 |
| FSRS | 1 |
| Dashboard bars (frontend) | 2–3 |
| **Total** | **≈ 8–10** |

The P0 subset (Q-matrix + BKT + counters) takes about 4 hours.

### Gaps
- The **0.95 Cognitive Tutor mastery threshold** was not verified in retrieved sources, although it is widely attributed to Corbett & Anderson (1995). Cite it as a "commonly used convention", or check the 1995 paper.
- The original DKT accuracy claims (Piech et al. 2015) and later critiques were not retrieved.
- No published BKT parameter defaults *for programming concepts* were found. The suggested values are judgement calls.
- No validated method was found for folding partial test success or hint levels into BKT. The soft-evidence rule is a heuristic.
- The primary SuperMemo SM-2 description was not read; implementations were used.

---

## 7. Debugging-exercise generation by mutation (operators, equivalent mutants, evidence, mapping operators to misconceptions)

### Takeaway
Mutation is the classic pre-LLM way to make buggy code. Mature Python tools exist: mutmut (BSD-3, needs WSL on Windows) and Cosmic Ray (MIT). For tiny single-function exercises, a hand-written `ast.NodeTransformer` with about 10 misconception-targeted operators is simpler and lets each operator carry a misconception label. Equivalent mutants are the main reliability issue. Compiler-equivalence tricks catch only about 30%, so filter by differential testing against the reference on the hidden tests plus random inputs. Evidence for learning gains from seeded-bug exercises is thin. An LLM-based version (BugSpotter) produced exercises comparable to instructor-made ones.

### Cited Findings
- **mutmut**:
  - **BSD-3-Clause**. On Windows it **must run inside WSL**, because it relies on `fork`.
  - Example mutations: integer literal +1; `<` → `<=`; `break` ↔ `continue`; string literals wrapped as `"XX…XX"`; type-annotation mutations.
  - Exclusions: `# pragma: no mutate` (line, block or region), `do_not_mutate_patterns`, `mutate_only_covered_lines`.
  - No equivalent-mutant handling is documented.
  
  — [GitHub boxed/mutmut](https://github.com/boxed/mutmut)
- **Cosmic Ray**: **MIT**, Python 3.9+. It makes "small changes to your source code, running your test suite for each one". Its operator list lives in its docs, which were not read — [GitHub sixty-north/cosmic-ray](https://github.com/sixty-north/cosmic-ray)
- **Equivalent mutants**: Trivial Compiler Equivalence (Papadakis, Jia, Harman & Le Traon, ICSE 2015) detects about **30% of equivalent mutants**. On large programs it discards more than 7% of all mutants as equivalent and 21% as duplicates — [ORBilu](https://orbilu.uni.lu/handle/10993/20289); [UCL](https://discovery-pp.ucl.ac.uk/id/eprint/1499169)
- Before LLMs, "perhaps the most promising approach" to synthetic buggy student code was automatic program mutation with mutation-analysis tools — [LLM-itation (arXiv 2411.10455)](https://arxiv.org/pdf/2411.10455)
- **BugSpotter** (Pădurean, Denny & Singla, SIGCSE 2025) generates buggy code and a fixed version with an LLM. Students must **write a failing test case**. In a classroom deployment, generated exercises were comparable to instructor-made ones in student performance — [SIGCSE 2025 page](https://sigcse2025.sigcse.org/details/sigcse-ts-2025-Papers/49/BugSpotter-Automated-Generation-of-Code-Debugging-Exercises)
- Oliveira et al. (ICCE 2014) proposed mutation testing in novice courses, with a "Pascal Mutants" tool; results were not shown — [APSCE ICCE](https://library.apsce.net/index.php/ICCE/article/view/413)
- "Learning-Mutation" (Kyushu) learns bug patterns from buggy→fixed pairs and injects realistic bugs. Missing semicolons and undeclared names made up more than 36% for short programs — [Kyushu Univ. DB](https://hyoka.ofc.kyushu-u.ac.jp/search/details/K003940/thesisList_e.html)
- Why debugging practice matters:
  - Fitzgerald et al. (2008) found most good debuggers were good programmers, but **not all good programmers were good debuggers** — [Aberystwyth repository](https://research.aber.ac.uk/en/publications/debugging-finding-fixing-and-flailing-a-multi-institutional-study/)
  - Ahmadzadeh et al. (2005) are summarized as showing that novices learn a good deal of programming while debugging skill lags (secondhand) — [arXiv 2509.22420](https://arxiv.org/pdf/2509.22420)

### Inferences
**Build your own mutator.** Do not use mutmut or Cosmic Ray here: they are test-runner-oriented, mutmut needs WSL on Windows dev machines, and you need misconception labels per operator. `ast.NodeTransformer` + `ast.unparse` (3.9+) is enough.

**Operator ↔ misconception map**

| Operator (AST edit) | Misconception / mistake category | Typical visible symptom |
|---|---|---|
| ROR: `<`↔`<=`, `>`↔`>=` (in `Compare`) | off-by-one (boundary) | wrong at boundary / missing last element |
| Range-bound: `range(n)`→`range(n-1)`/`range(n+1)`, `range(1,n)`↔`range(0,n)`, `len(x)`→`len(x)-1` | off-by-one (loop bounds) | missing first/last element; IndexError |
| Slice-bound: `[1:]`, `[:-1]` insertion or removal | off-by-one (slicing) | missing element |
| Guard deletion: remove the leading `if not xs: return …` / `if len(xs)==0` | unhandled empty input | crash on `[]` |
| Base-case edit: `n <= 1`→`n == 1`, or delete the base-case `if` | wrong/missing base case | RecursionError / wrong at n=0 |
| `return e` → `print(e)` | print vs return | `None` returned |
| Move `return` into the loop body | premature return | only the first element considered |
| Move accumulator init into the loop | accumulator reset | only the last element counted |
| `//` ↔ `/`; drop `int()` / `round()` | int vs float division | 2.0 vs 2, or float index TypeError |
| `and`↔`or`; negate condition | boolean logic | wrong branch |
| Iterate a copy → iterate the original while removing (`for x in xs[:]`→`for x in xs`) | mutating while iterating | skipped elements |
| Rename a local to a builtin (`total`→`sum`) and call the builtin later | shadowing builtins | "'int' object is not callable" |

Mutation-site enumeration sketch:
```python
import ast, copy
SWAP = {ast.Lt: ast.LtE, ast.LtE: ast.Lt, ast.Gt: ast.GtE, ast.GtE: ast.Gt}
def ror_mutants(src):
    tree = ast.parse(src)
    sites = [(i, j) for i, n in enumerate(ast.walk(tree)) if isinstance(n, ast.Compare)
             for j, op in enumerate(n.ops) if type(op) in SWAP]
    for i, j in sites:
        t = copy.deepcopy(tree)
        node = list(ast.walk(t))[i]
        node.ops[j] = SWAP[type(node.ops[j])]()
        yield {"op": "ROR", "misconception": "off_by_one", "line": node.lineno,
               "code": ast.unparse(t)}
```
`ast.walk` order is deterministic for identical trees, so indexes line up between the original and the deep copy.

**Filtering pipeline (handles equivalent mutants and difficulty)**
1. Generate mutants of the reference solution, keeping only operators allowed for the target misconception.
2. Run each mutant on visible + hidden tests + about 200 Hypothesis inputs (§8) against the reference. **Discard mutants that no input distinguishes** (likely equivalent) and mutants that crash on import.
3. **Difficulty knob** = fraction of inputs on which the mutant fails:
   - fails on most inputs → easy;
   - fails only on edge-tagged inputs → medium/hard ("subtle").
4. Deduplicate by output signature across the input set (as TCE removes duplicates).

**Exercise formats**
- **(a) Find & fix**: show the buggy code and its failing visible test, and the student fixes it.
- **(b) BugSpotter-style**: the student must first **write an input that exposes the bug** (checked by running mutant vs reference), then fix it.

Format (b) trains test thinking and reuses the differential-testing engine. Grade the fix with the normal hidden tests. Feed outcomes into the misconception skill (§6): solving an `empty_input` debugging exercise is evidence against that misconception.

**Runtime cost.** Generation is offline or at challenge-load time. About 30–100 mutants × about 220 inputs of tiny functions runs in seconds; cache per challenge. Precompute before the demo.

**Pitfalls**
- Some mutants produce unrealistic bugs (e.g., `<`→`<=` in a `while` that becomes infinite). Use timeouts in filtering and drop timeouts unless the target is "infinite loop".
- Multiple sites for the same operator → pick the one on the "main" loop, or the line with the most coverage.
- Make sure the mutated code still type-checks in spirit (e.g., don't mutate string literals).

**Feasibility**

| Item | Build-hours |
|---|---|
| Mutator with ~10 operators | 2.5–3.5 |
| Differential filter (shares §8) | 1–1.5 |
| Exercise UI using the existing challenge UI | 1 |
| **Total** | **≈ 4.5–6** |

Priority: P1. It differentiates the product and directly shows "recurring mistake → targeted practice".

### Gaps
- Cosmic Ray's operator list and MutPy's status were not verified. MutPy is believed to be unmaintained, but this is unconfirmed.
- No controlled study with effect sizes was found showing that **mutation-generated** debugging exercises improve novice learning. Evidence is indirect: debugging skill lags, and BugSpotter shows parity with instructor-made exercises.
- The equivalent-mutant rate for tiny Python functions is unknown. TCE's 30% detection figure is for C programs.

---

## 8. Counterexample generation without revealing hidden tests (Hypothesis, shrinking, deadlines and health checks, differential testing)

### Takeaway
Differential property-based testing is the strongest deterministic engine for "show me an input where I'm wrong". Assert `student(x) == reference(x)` under Hypothesis (MPL-2.0); its shrinker returns a minimal failing input. Set `deadline=None`, `database=None` and `derandomize=True` in the sandbox. Exclude hidden-test inputs with a filter, and design hidden tests so they are not the only witnesses of a bug. Degenerate minimal inputs such as `[]` will often coincide with an "empty" hidden test, which needs an explicit policy.

### Cited Findings
- **Hypothesis**:
  - License **MPL-2.0**; **Requires-Python ≥ 3.10**; latest version 6.168.5 (released 5 Oct 2026) — [PyPI](https://pypi.org/project/hypothesis/)
  - Settings defaults: **max_examples = 100**; **deadline = 200 ms** per example (`None` on the CI profile); `derandomize = False` (`True` on CI); example database at `.hypothesis/examples`; `report_multiple_bugs = True`; `stateful_step_count = 50` — [Hypothesis API reference](https://hypothesis.readthedocs.io/en/latest/reference/api.html)
  - **Phases**: explicit, reuse, generate, target, **shrink**, explain. The shrink phase reduces failing cases and reports the **minimal failing example**. `@example` inputs are not shrunk — [API reference](https://hypothesis.readthedocs.io/en/latest/reference/api.html)
  - **Health checks** include `too_slow`, `filter_too_much`, `data_too_large`, `large_base_example`, `function_scoped_fixture`, `differing_executors` and `nested_given`. The CI profile suppresses `too_slow` — [API reference](https://hypothesis.readthedocs.io/en/latest/reference/api.html)
- Clara, Sarfgen and Refactory classify correctness by running programs on test inputs against expected outputs from correct solutions (§4) — [Clara](https://arxiv.org/pdf/1603.03165); [Sarfgen](https://arxiv.org/pdf/1711.07148); [Refactory](https://discovery.ucl.ac.uk/10091878/1/ase19.pdf)

### Inferences
**Engine (runs inside the sandbox subprocess, with a total time cap of about 3 s)**
```python
import copy
from hypothesis import given, settings, HealthCheck, strategies as st

def find_counterexample(student, reference, args_strategy, hidden_keys, n=200):
    seen = {}
    @settings(max_examples=n, deadline=None, database=None, derandomize=True,
              suppress_health_check=[HealthCheck.too_slow, HealthCheck.filter_too_much,
                                     HealthCheck.data_too_large], print_blob=False)
    @given(args_strategy.filter(lambda a: repr(a) not in hidden_keys))
    def prop(args):
        exp = reference(*copy.deepcopy(args))          # students may mutate inputs
        try:
            got = student(*copy.deepcopy(args))
        except Exception as e:
            seen.update(args=args, expected=exp, got=f"{type(e).__name__}: {e}"); raise
        if got != exp:
            seen.update(args=args, expected=exp, got=got); raise AssertionError
    try:
        prop()
    except Exception:
        return seen or None
    return None
```
- Each challenge JSON declares its argument strategy, for example `{"xs": "lists(integers(-20,20), max_size=8)"}`. Map it to `st.tuples(st.lists(st.integers(-20, 20), max_size=8))`.
- Keep values small; the shrinker then yields readable inputs like `[0]` or `[1, 0]`.

**Recording the minimal example.** Recording the last failing call should give the shrunk example, assuming Hypothesis replays the final minimal example when reporting. **Verify this in a 10-minute spike.** An alternative is to parse the "Falsifying example" note from the exception.

**Settings rationale**
- `deadline=None`: sandbox timing is noisy, and deadline failures would surface as confusing Flaky/DeadlineExceeded errors.
- `database=None`: no file writes in the sandbox.
- `derandomize=True`: reproducible demos, and the same counterexample on every attempt for the same bug.

**Not revealing hidden tests**
1. **Exact-input exclusion**: canonicalize hidden inputs (`repr` of normalized args) and filter them out, as shown above.
2. **Disjoint-by-design domains**: hidden tests use values outside the strategy's range (e.g., hidden `xs` length ≥ 10 or magnitudes ≥ 100), while counterexamples use length ≤ 8 and |v| ≤ 20. Disjointness then holds by construction.
3. **Degenerate witnesses policy**: the minimal counterexample for "unhandled empty input" is `[]`, which is probably also a hidden `empty` test.
   - **Recommendation**: treat hidden tests as protection against hard-coding, not as secret inputs. Allow revealing *degenerate* counterexamples (`[]`, `0`, `""`, single element) **only at hint level H2+**.
   - Alternatively, reveal just the category ("fails on an empty list"), which leaks the same information.
   - Record this as a product decision.
4. Never show counterexamples that equal a *visible* test the student already sees failing. That adds nothing, so skip to the next distinct failure (`report_multiple_bugs` / run again with `phases` excluding `reuse`).

**Extras (optional)**
- Metamorphic properties when output isn't unique (e.g., "result is a permutation of input and sorted").
- Equivalence of float outputs via `math.isclose` (§9).

**Runtime cost.** Expect 100–200 examples of a tiny pure function plus shrinking to take well under 1 s. This is an estimate; benchmark it in the sandbox. Shrinking can take many extra calls when the failure is a slow path, so cap total time.

**Reliability**
- Very high for pure functions with a trustworthy reference.
- Wrong strategies (e.g., not generating duplicates) can miss bugs.
- Non-deterministic student code (random, set ordering) can cause Flaky errors. Catch `hypothesis.errors.Flaky` and fall back to the visible-test explanation.

**Pitfalls**
- Exceptions from the *reference* on weird inputs. Restrict strategies to the spec's valid domain.
- Infinite loops in student code need per-call timeouts. On Linux, use `signal.setitimer` in the sandbox. Windows has no SIGALRM, so run the sandbox in Linux/Docker.
- Comparing `got != exp` for floats.

**Feasibility**

| Item | Build-hours |
|---|---|
| Strategy DSL → Hypothesis mapping | 1–1.5 |
| Engine + timeouts | 1.5 |
| Hidden-exclusion + policy | 0.5–1 |
| **Total** | **≈ 3–4** |

Priority: P0/P1. It powers H2 hints, SBFL enrichment (§3) and mutant filtering (§7).

### Gaps
- `hypothesis.find()` was not documented on the fetched API page, so its current status is unverified.
- Hypothesis's behavior on replaying the final shrunk example (for the recording approach) is not confirmed.
- No research was found on whether showing minimal counterexamples to novices improves learning, as opposed to showing failing hidden-test categories.
- No benchmark numbers for Hypothesis run time on tiny functions were found.

---

## 9. Output-diff classification for wrong answers, and empirical time-complexity estimation

### Takeaway
Classifying *how* an answer is wrong is cheap, deterministic and high-precision for function-return exercises: `None` + stdout match → print-vs-return; same multiset → order; `expected[:-1]` → missing last element; ±1 → off-by-one; equal-valued int vs float → division. No peer-reviewed evaluation of such classifiers was found, so treat each rule's precision as unvalidated. Empirical complexity from wall-clock timings (`big_O`, BSD-3) is noisy in shared containers. Counting executed lines with `sys.monitoring` at sizes n and 2n is a deterministic alternative.

### Cited Findings
- **big_O** (Pietro Berkes):
  - **BSD-3** licensed.
  - Runs a function on inputs of increasing size N, measures time, and fits the classes Constant, Linear, Quadratic, Cubic, Polynomial, Logarithmic, Linearithmic and Exponential, reporting residuals.
  - It "empirically computes the Big Theta class" (not Big-O).
  - API: `big_o.big_o(func, datagen, n_measures=…, min_n=…, max_n=…, n_repeats=…)`.
  - The README has no explicit warnings about noise or small n.
  
  — [GitHub pberkes/big_O](https://github.com/pberkes/big_O)
  
  Version 0.11.0 is listed (BSD) — [Arch Linux package](https://www.archlinux.org/packages/extra/any/python-big-o). A third-party health score of 39/100 cites low maintenance (a weak signal) — [DepScope](https://depscope.dev/pkg/pypi/big-O)
- `math.isclose(a, b, *, rel_tol=1e-09, abs_tol=0.0)` is the standard library's tolerant float comparison. `abs_tol` must be set for comparisons near zero — [Python docs: math.isclose](https://docs.python.org/3/library/math.html#math.isclose)
- `difflib.SequenceMatcher` gives similarity ratios and opcodes for sequences and strings — [Python docs: difflib](https://docs.python.org/3/library/difflib.html)
- `sys.monitoring` LINE events can be counted per code object, and `set_local_events` restricts monitoring to one code object — [Python docs: sys.monitoring](https://docs.python.org/3/library/sys.monitoring.html)

### Inferences
**Wrong-answer shape classifier.** Rules run in priority order. Compare **return values**, not printed text, for function exercises.

| # | Rule (got vs expected; input `x` available for visible tests) | Label shown to student |
|---|---|---|
| 1 | `got is None` and `str(expected)` (or `repr`) appears in captured stdout | "You **printed** the answer instead of **returning** it." |
| 2 | `got is None`, expected not None | "Your function returned nothing (`None`). Is there a `return` on every path?" |
| 3 | `type(got) != type(expected)` and `got == expected` numerically (2.0 vs 2) | "Right value, wrong type (float vs int): check `/` vs `//`." |
| 4 | `type(got)` is str while expected is a number (or vice versa) | "You returned text where a number was expected (or vice versa)." |
| 5 | floats: `isclose(got, exp, rel_tol=1e-9)` | accept (make tests tolerant by default) |
| 6 | floats: `isclose(got, exp, rel_tol=1e-4)` but not 1e-9; or `round(got, k) == exp` | "Very close: a rounding step is missing or extra." |
| 7 | numbers: `got - exp == ±1` | "Off by one." |
| 8 | numbers: `got - exp == ±x[0]` or `±x[-1]` (sum/count tasks) | "Looks like the first/last element was skipped." |
| 9 | sequences: `got == exp[:-1]` / `exp[1:]`; `got[:-1] == exp` / `got[1:] == exp` | "Missing last/first element" / "one extra element at end/start" |
| 10 | `got == exp[::-1]` | "Reversed order." |
| 11 | `sorted(got) == sorted(exp)` (or `Counter` equal) | "Right items, wrong order." |
| 12 | `set(got) == set(exp)` and `len(got) != len(exp)` | "Duplicates handled differently." |
| 13 | strings: `got.strip() == exp.strip()`, `got.lower() == exp.lower()`, `" ".join(got.split()) == …` | "Whitespace" / "capitalization" difference |
| 14 | bools: `got == (not exp)` | "Your condition is inverted." |
| 15 | same `got` across ≥ 3 different visible inputs | "Your result doesn't change with the input: hard-coded or ignoring a parameter?" |
| 16 | `got == reference(x[:1])` for multi-element `x` | "Only the first element seems to be processed (early `return` in loop?)." |
| 17 | nested lists with identical rows that should differ | "Rows share one list (`[[0]*n]*m` aliasing)." |
| — | else | generic "wrong output" + `difflib` ratio |

**Hidden tests** emit only the label, never values ("On a hidden test your answer looks like it is missing the last element"). The label is also an observation for misconception counters (§2/§6), with rule 1 → `print_vs_return`, rules 7–9 → `off_by_one`, and so on.

**Runtime cost and build.** Microseconds per test; about 3–4 build hours for ~15 rules + unit tests.

**Reliability.** Rules 1, 3, 10, 11, 13 and 14 are near-certain; rules 7–9 are coincidence-prone on tiny inputs (e.g., `[1, 1]`). Require the same label on ≥ 2 failing tests before calling it a "recurring mistake".

**Empirical complexity (only for "efficiency" challenges; P2)**
- **Deterministic option (recommended)**: count LINE events (or calls) of the student function at sizes n ∈ {64, 128, 256, 512} using `sys.monitoring` without `DISABLE` (count every event), then fit the slope of log(count) vs log(n):
  - slope ≈ 1 → linear
  - ≈ 2 → quadratic
  - ≈ 1 with a log factor → compare count/(n·log n)
  
  The counts are machine-independent and noise-free, but this approach is not validated in the literature (inference).
- **Timing option**: `big_O` or a manual min-of-k `time.perf_counter()` over doubling n with a total time cap.

**Pitfalls**
- Container CPU noise and turbo/frequency scaling.
- Small n dominated by constant overhead.
- Builtins (`sorted`, `in` on lists) hide work from line counts, so count `CALL` events or time them.
- Quadratic code at large n blows the time budget; cap at 1–2 s.
- Linearithmic vs linear is hard to separate over narrow n ranges.

### Gaps
- No peer-reviewed study was found that evaluates automatic wrong-output *shape* classification (precision/recall) for novice programs. All rules above are untested heuristics.
- No accuracy evaluation of `big_O`'s classifier was found.
- No study was found on operation-count-based complexity feedback for novices.

---

## 10. Execution tracing and program visualization (Python Tutor's approach, safe per-line state capture, step/size limits, evidence of learning benefit)

### Takeaway
Python Tutor's tracer is a `bdb.Bdb` subclass (`sys.settrace`-based). It records per-step JSON snapshots (line, event, stack frames with locals, heap, stdout) and stops at **1,000 steps**. Evidence for program visualization is positive but coarse: reviews say it "largely supports" PV, and *how actively* learners engage matters more than what is shown. For CodeQuest, the cheapest high-value slice is "variable values at the crash / at return for one failing *visible* test". A full stepper is a stretch goal.

### Cited Findings
- **Online Python Tutor** (Guo, SIGCSE 2013) is browser-based; users step forward and backward and see run-time data structures. More than **200,000 people** used it in the 3 years before the paper, and instructors at about a dozen universities used it in CS1 — [Guo 2013 PDF](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf); [Google Research listing](https://research.google/pubs/online-python-tutor-embeddable-web-based-program-visualization-for-cs-education/)
- **Python Tutor's `pg_logger.py`**, from a public fork of `pgbovine/OnlinePythonTutor` (the original GitHub URL returned 404 on fetch). It carries an MIT-style permission notice, © Philip J. Guo — [pg_logger.py (fork copy)](https://raw.githubusercontent.com/dynl04d/OnlinePythonTutor/master/v5-unity/pg_logger.py):
  - `class PGLogger(bdb.Bdb)`.
  - **`MAX_EXECUTED_LINES = 1000`** (raised from 300 in 2016). At the limit it emits an `instruction_limit_reached` event and force-terminates.
  - Each step stores `line`, `event` (`call`, `step_line`, `return`, `exception`, …), `func_name`, `globals`, `ordered_globals`, `stack_to_render` (frames with encoded locals), `heap` and `stdout`. Objects are **JSON-encoded at every step to avoid aliasing problems**.
  - Sandboxing: `RLIMIT_AS` ≈ 200 MB, `RLIMIT_CPU` 5 s, `RLIMIT_NOFILE` (0, 0); a module import whitelist; `os`/`sys` stripped; `open()` blocked; `random.seed(0)`. `BANNED_BUILTINS` was emptied as "security by obscurity", and the comments admit the measures are not foolproof.
- **Evidence**:
  - Sorva, Karavirta & Malmi's review of generic program-visualization systems (ACM TOCE 13(4), 2013) found that evaluations "largely support" PV in intro programming, but the evidence is insufficient for nuanced conclusions about engagement. Most tools are short-lived prototypes — [DOI 10.1145/2490822](https://www.doi.org/10.1145/2490822)
  - Hundhausen, Douglas & Stasko's meta-study of 24 experiments (JVLC 13(3), 2002) concluded that **how students use** a visualization matters more than **what it shows** — [academia.edu copy](https://www.academia.edu/15636659/A_Meta_Study_of_Algorithm_Visualization_Effectiveness)
  - Naps et al. (2002) proposed a six-level engagement taxonomy, from "No viewing" to "Constructing". This is a secondary description — [IJPCE article](https://www.ijpce.org/index.php/IJPCE/article/download/66/76)
- `sys.settrace` installs a **thread-specific** trace function with 'call', 'line', 'return', 'exception' and 'opcode' events. If the trace function raises, it is unset — [Python docs: sys.settrace](https://docs.python.org/3/library/sys.html#sys.settrace)
- `sys.monitoring` (3.12+) is the low-overhead alternative, with LINE / PY_START / PY_RETURN events and per-code-object `set_local_events` — [Python docs: sys.monitoring](https://docs.python.org/3/library/sys.monitoring.html)
- `reprlib.Repr` limits the size of reprs (`maxlist`, `maxstring`, `maxlevel`, …) — [Python docs: reprlib](https://docs.python.org/3/library/reprlib.html)

### Inferences
**MVP (P0, about 1 hour).** The "variables at crash/return" panel reuses the §1 crash-context code. For a failing **visible** test, also show the function's local variables at `return` time (one settrace 'return' event).

**Full stepper (P2, about 5–7 hours).** A tracer in the sandbox subprocess:
```python
import sys
MAX_STEPS = 1000                      # Python Tutor precedent

class StepLimit(Exception): pass

def trace_call(func, args, safe_repr):
    steps = []
    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<student>":
            return None               # don't trace stdlib / harness frames
        if event in ("line", "return", "exception"):
            steps.append({"ev": event, "line": frame.f_lineno, "fn": frame.f_code.co_name,
                          "locals": {k: safe_repr(v) for k, v in frame.f_locals.items()},
                          "ret": safe_repr(arg) if event == "return" else None})
            if len(steps) >= MAX_STEPS:
                raise StepLimit       # tracer error unsets settrace; propagate and stop
        return tracer
    sys.settrace(tracer)
    try:
        return func(*args), steps
    finally:
        sys.settrace(None)
```

**Safety rules**
- Trace only **visible** tests, never hidden ones.
- Use `safe_repr`: builtin types only, via `reprlib` limits; `<ClassName>` otherwise, so user `__repr__` never runs.
- Cap steps (1,000) **and** serialized trace size (e.g., 256 KB).
- Snapshot by repr at each step: this is the cheap equivalent of Python Tutor's per-step JSON encoding against aliasing, so later mutation doesn't rewrite history.
- Always `settrace(None)` in `finally`.

**Engagement mode (backed by the Hundhausen and Naps findings).** Don't just play the trace. Add "**predict the value**" checkpoints: pause at the faulty line (from §3/§2) and ask "what will `i` be next?" before revealing. That moves the visualization up to the "responding" engagement level.

**Runtime cost.** settrace calls a Python function per line, which is slow in general but irrelevant at ≤ 1,000 steps. Expect under 50 ms per traced test (estimate).

**Pitfalls**
- Recursion produces many frames; render only the top 3 frames by default.
- Generators and comprehensions create extra frames (Python 3.12 inlines list/dict/set comprehensions per PEP 709, so their frames disappear — check how this renders).
- `frame.f_locals` became a write-through proxy in 3.13 (PEP 667). Read-only use is fine.

**Roll-up: build-hours across all techniques.** Person-hours for one developer; P0 = must-have for the PS demo.

| # | Technique | Hours | Priority | Depends on | Runtime per submission (est.) | Reliability |
|---|---|---|---|---|---|---|
| 1 | Exception templates + crash-frame variables (§1) | 5–7 | P0 | sandbox harness | < 10 ms | High (type is ground truth) |
| 2 | AST mistake detectors + test-tag fusion (§2) | 7–9 (top-6: ~4) | P0 | challenge JSON tags | < 5 ms | Medium alone, high fused |
| 3 | Output-diff shape classifier (§9) | 3–4 | P0 | — | µs | High for 6 rules, medium others |
| 4 | Hint ladder + monotone fact model + leak guard (§5) | 7–10 | P0 | 1–3 | negligible | Depends on inputs; leak guard high |
| 5 | Learner model: Q-matrix + BKT + misconception counters (§6) | ~4 (full with Elo/FSRS/dashboard: 8–10) | P0 | 2, 3 | µs | Interpretable, uncalibrated |
| 6 | Hypothesis differential counterexamples (§8) | 3–4 | P0/P1 | reference solutions, sandbox timeouts | < 1 s | High for pure functions |
| 7 | SBFL "look here" heatmap via sys.monitoring (§3) | 4–5 | P1 | 6 (for spectra enrichment) | tens of ms | Low–medium on tiny code; fuse with 2 |
| 8 | Mutation-based debugging exercises (§7) | 4.5–6 | P1 | 6 | precomputed | High after differential filtering |
| 9 | Canonical AST diff vs references + repair-by-mutation (§4) | 6–8 | P1/P2 | 8 | 0.2–3 s | Medium |
| 10 | "Variables at return" panel (§10 MVP) | ~1 | P0 | 1 | < 50 ms | High |
| 11 | Full trace stepper with predict-the-value (§10) | 5–7 | P2 | 10 | < 50 ms | High |
| 12 | Op-count complexity check (§9) | 2–3 | P2 | — | < 1 s | Unvalidated |

**Plan summary**
- P0 total ≈ 27–36 person-hours with the full learner model, or about 25 with the P0 subset. That fits one backend owner plus part of a second over a 24-hour event.
- P1 adds about 12–15 hours.
- Suggested order:
  1. 1 + 3
  2. 2 (top-6)
  3. 6
  4. 4
  5. 5
  6. 10
  7. Then 8 → 7 → 9 as time allows. Respect the feature freeze in `docs/pm/03_timeline.md`.

### Gaps
- No controlled study measuring Python Tutor's own effect on learning outcomes was found; the evidence above is from reviews of PV systems in general.
- The current license and status of the official Python Tutor codebase are unclear. `github.com/pgbovine/OnlinePythonTutor` returned 404 on fetch; the MIT-style header was seen only in a fork's copy.
- The Naps et al. taxonomy was described from a secondary source.
- No overhead figures for settrace vs sys.monitoring tracers on student-sized programs were found.
