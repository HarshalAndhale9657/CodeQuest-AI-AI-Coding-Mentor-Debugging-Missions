# Learning signals: evidence brief

Research behind Predict Before You Run, the pass review, the Debug Journey and the growth analytics (compiled 2026-10-11; every citation checked against Crossref, publisher or repository records; ⚠ = partly verified). Numbers marked *heuristic* are design choices, not findings. How each finding was applied: [MENTOR_ENGINE.md §10](../MENTOR_ENGINE.md#10-learning-signals).


## 1. Predict before you run
- **PRIMM** classes (13 schools, 493 students aged 11–14) beat a control group on the post-test. Learners predict output of given code, not their own ([Sentance et al. 2019](https://doi.org/10.1080/08993408.2019.1608781)).
- **Tracing:** across seven countries, many students were weak at predicting short-code output (and weaker at completing code), suggesting a "fragile" grasp of skills that problem-solving depends on ([Lister et al. 2004](https://doi.org/10.1145/1044550.1041673)).
- **Tracing and writing:** tracing plus explaining code accounted for 46% of the variance in code-writing scores ([Lopez et al. 2008](https://doi.org/10.1145/1404520.1404531)). Replicated broadly ([Venables et al. 2009](https://doi.org/10.1145/1584322.1584336)).
- **Notional machine:** the learner's picture of how the computer runs code is a root of novice errors ([du Boulay 1986](https://doi.org/10.2190/3LFX-9RRF-67T8-UVK9); review: [Sorva 2013](https://doi.org/10.1145/2483710.2483713)).
- **"Achievement" difficulty:** some autograder users refuse to abandon a wrong solution out of a false sense of being nearly done ([Prather et al. 2018](https://doi.org/10.1145/3230977.3230981)).
- **Predicting first:** working out the expected output for one input before coding raised completion (76% vs 53%) and cut submissions (4.5 vs 7.6). It took under a minute. The authors recommend crafted over random inputs; n=38, results called inconclusive ([Prather et al. 2019](https://doi.org/10.1145/3287324.3287374)).
- **Calibration:** exam-score self-predictions correlated only moderately with actual scores, and logging confidence per quiz item didn't improve them ([Denny et al. 2010](https://doi.org/10.1145/1822090.1822124)). Novices overrated themselves relative to peers on harder tasks, and those who did scored lower on the exam ([Cloude et al. 2024](https://doi.org/10.1145/3636555.3636848)).

**Design implications**
- **Outcomes:**
  - P=E≠A: "your code doesn't do what you think". A tracing gap, the most valuable signal; offer a step-through.
  - P=A≠E: the spec was misread. Prompt a re-read.
  - A=E≠P: passed but couldn't trace it; queue a tracing drill.
- **Cadence:** once per attempt, before the first submission. Drop to 1 problem in 3 at ≥80% concept accuracy (heuristic). Under 60 s.
- **Inputs:** small, novel boundary cases (empty, 0, duplicates), never a visible test (E is shown).
- **Friction:** one field plus "Not sure"; skippable, outside Elo.
- **Feedback:** "You said 2; your code returned 1; expected 2. Trace the loop." Always show the comparison; logging confidence alone didn't help.

## 2. Debug journey
- **Error Quotient (EQ):** for each consecutive compile pair, +2 if both fail, +3 same error type, +3 same error line, +1 same edit location; divide by 9 and average ([Jadud 2006](https://doi.org/10.1145/1151588.1151600); algorithm as given in [Rodrigo et al. 2009](https://jadud.com/dl/pdf/tabanao-mercedes-jadud-pjs2009.pdf), co-authored by Jadud). ⚠ A max-11 variant also circulates. EQ explained at most about 26% of grade variance ([Švábenský et al. 2024](https://doi.org/10.1145/3649217.3653563)).
- **Watwin** adds a penalty for slow fixes relative to peers on the same error type. It explained 42% of coursework variance ([Watson et al. 2013](https://doi.org/10.1109/ICALT.2013.99)), and 56% combined with time spent resolving errors ([Watson et al. 2014](https://doi.org/10.1145/2538862.2538930)). A later version uses peer quartiles (faster than Q1: low penalty; slower than Q3: high) ([Watson 2015](https://etheses.durham.ac.uk/id/eprint/11141/)).
- **Repeated Error Density** weights long runs of the same error more heavily ([Becker 2016](https://doi.org/10.1145/2899415.2899463)). ⚠ The per-run formula r²/(r+1) is inferred from a published table.
- **Weak novices** give up, don't re-read their code, and debug by random trial and error ([Perkins et al. 1986](https://doi.org/10.2190/GUJT-JCBJ-Q6QU-Q9PL)). ⚠ The "stoppers/movers/tinkerers" labels come from secondary sources.
- **Good debuggers** trace code. Others apply few strategies poorly and introduce new bugs ([Murphy et al. 2008](https://doi.org/10.1145/1352135.1352191)). Students found 70% of bugs but fixed 97% of those found, so locating the bug is the hard part ([Fitzgerald et al. 2008](https://doi.org/10.1080/08993400802114508)).
- **Reflection:** explicit problem-solving stages plus reflection prompts raised independence and self-efficacy ([Loksa et al. 2016](https://doi.org/10.1145/2858036.2858252)). In CS2, spoken self-explanation went with *more* errors, likely because strugglers talk more ([Loksa & Ko 2016](https://doi.org/10.1145/2960310.2960334)).

**Design implications**
- **Step labels**, based on the set of failing tests:
  - progress: the set shrinks
  - regression: a test that passed now fails
  - swap: some fixed, some broken
  - no change: same set and same exception
  - revert: the code hash matches an earlier snapshot
- **Strategy score = 1 − EQ'**, where error type = failing tests plus exception class, line = traceback line, and edit location = diff hunk.
- **Tinkering nudge** (heuristic): after ≥3 submissions under 30 s apart, each changing ≤2 lines with no test change, ask: "Which test fails, and what should line N hold?"
- **Fix time:** peer quartiles per error type (≥30 samples).
- **Reflection:** after ≥3 failed submissions, ask "What was the bug, and what clue found it?" Optional, ungraded, at most once per session.

## 3. Fragile pass
- **Small scope hypothesis:** "most bugs can be caught by considering only small instances" ([Jackson 2000](https://people.csail.mit.edu/dnj/talks/newcastle/newcastle-b/outlinee.htm); [Jackson 2006](https://doi.org/10.1017/S0956796808006977)).
- **Evidence:** exhaustive tests within small scopes caught almost all injected bugs (mutants) and beat same-size random suites. Full code coverage arrived at smaller scopes but still missed mutants ([Marinov et al. 2003](https://www.cs.columbia.edu/~andoni/papers/TR921.pdf)). ⚠ Andoni et al.'s manuscript "Evaluating the small scope hypothesis" could not be retrieved.
- **Tools:** random property-based testing ([Claessen & Hughes 2000](https://doi.org/10.1145/351240.351266)); exhaustive testing to a depth bound ([Runciman et al. 2008](https://doi.org/10.1145/1411286.1411292)); Python's Hypothesis, which shrinks failures to a minimal case ([MacIver et al. 2019](https://doi.org/10.21105/joss.01891)).
- **In education:** property-based testing taught via problems with several valid outputs ([Wrenn et al. 2021](https://doi.org/10.22152/programming-journal.org/2021/5/9)). Students who misread a problem write tests with the same misreading ([Wrenn & Krishnamurthi 2019](https://doi.org/10.1145/3291279.3339416)). Test-suite grading has pitfalls ([Wrenn et al. 2018](https://doi.org/10.1145/3230977.3230999)).
- **Autograders:** bugs injected from real student-mistake patterns expose incomplete or unfair test suites ([Clegg et al. 2019](https://doi.org/10.1109/ICSE-SEET.2019.00021)).
- **Overconfidence:** low performers overestimate themselves ([Kruger & Dunning 1999](https://doi.org/10.1037/0022-3514.77.6.1121)), but the effect's size is disputed ([Gignac & Zajenkowski 2020](https://doi.org/10.1016/j.intell.2020.101449)). Prefer Cloude 2024 and Prather 2018.

**Design implications**
- **Search** after all tests pass, diffing against the reference on ints −3 to 3, lists of length ≤4 over {−1, 0, 1, 2}, and strings of length ≤3. Cap at about 2,000 cases or 2 s, then optionally run Hypothesis.
- **Message:** report the smallest counterexample: "All tests pass, but `f([])` returns `None`; expected `0`. Tests sample behaviour; they don't prove it."
- **Label it "pass · fragile"**, not a failure; halve the Elo gain (heuristic); offer a prediction on the counterexample.
- **Audit the hidden tests:** add any found input that kills a surviving mutant. Target ≥90% of mutants caught (heuristic).
- **Avoid "overconfident"**; say "an edge case the tests missed".

## 4. Learner dashboard
- **Help-seeking:** learners use on-demand help poorly ([Aleven et al. 2003](https://doi.org/10.3102/00346543073003277)). One tutor builds in a model of good help-seeking ([Aleven et al. 2006](https://kilthub.cmu.edu/articles/journal_contribution/Toward_Meta-Cognitive_Tutoring_A_Model_of_Help-Seeking_with_a_Cognitive_Tutor/6470573)).
- **Gaming the system**, such as rapid hint-after-hint until the answer appears, correlates with post-test score as strongly as prior knowledge does ([Baker et al. 2004](https://doi.org/10.1145/985692.985741)).
- **Hint quality:** the quality of the first few hints predicted later hint use and possible help abuse ([Price et al. 2017](https://doi.org/10.1007/978-3-319-61425-0_26)).
- **Open learner models** show learners the system's model of them. SMILI is a framework for describing them ([Bull & Kay 2007](https://research.birmingham.ac.uk/en/publications/student-models-that-invite-the-learner-in-the-smili-open-learner-)). They can drive metacognition ([Bull & Kay 2013](https://doi.org/10.1007/978-1-4419-5546-3_23); survey: [Bull 2020](https://doi.org/10.1109/TLT.2020.2978473)).
- **Radar charts** were the least effective and least liked radial design tested ([Albo et al. 2016](https://doi.org/10.1109/TVCG.2015.2467322)). Position on a common scale beats angle or area ([Cleveland & McGill 1984](https://doi.org/10.1080/01621459.1984.10478080)).

**Design implications**
- **Hint independence:** share of the last 10 solves with 0 hints, plus deepest hint level; a trend, not a grade.
- **Flags** (heuristic):
  - Abuse: a hint within 10 s of opening, or two hints within 15 s with no edit.
  - Avoidance: ≥4 failures and no hint. Offer one.
  - Make the first hint excellent.
- **First-submission success:** per concept with n, hidden until n≥5. **Struggle tiles:** ≥4 failures or more than 2× the median time.
- **Mistake lanes:** one row per category, with dots on a shared time axis.
- **Skills:** a sorted dot chart of Elo with uncertainty bands, plus "Why?" (evidence) and "I disagree" (triggers a check problem).
- **Prediction accuracy by concept:** shown once n≥3, split into P=E≠A and P=A≠E.
