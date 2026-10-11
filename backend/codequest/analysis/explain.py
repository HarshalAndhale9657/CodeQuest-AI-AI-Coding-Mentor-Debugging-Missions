"""Deterministic plain-language explanations.

Template shape: what happened -> where -> evidence (visible tests only) ->
a next-step QUESTION (never the fix). Hidden-test explanations use only the
verdict and static findings about the learner's own code.
"""

from __future__ import annotations

import re

from codequest.analysis.detectors import Finding


def _loc(line: int | None) -> str:
    return f"line {line}" if line else "your code"


def _first_local(locals_: dict[str, str], *candidates: str) -> tuple[str, str] | None:
    for name in candidates:
        if name in locals_:
            return name, locals_[name]
    return None


def explain_exception(exc_type: str, message: str, line: int | None, locals_: dict[str, str],
                      source_line: str | None) -> str:
    where = _loc(line)
    snippet = f" (`{source_line.strip()}`)" if source_line and source_line.strip() else ""
    evidence = ""
    if locals_:
        shown = ", ".join(f"`{k}` = {v}" for k, v in list(locals_.items())[:4])
        evidence = f" At that moment: {shown}."

    if message.startswith("CodeQuest sandbox: "):
        reason = message.removeprefix("CodeQuest sandbox: ")
        return (f"Your code tried something the practice sandbox blocks on {where}: {reason}. "
                "These missions only need the function's inputs. What does the task actually ask you to use?")
    if exc_type == "IndexError":
        return (f"On {where}{snippet} your code read a position that does not exist in a list or string.{evidence} "
                "Positions run from 0 to len - 1. Which values can your index take, and what if the list is empty?")
    if exc_type == "KeyError":
        return (f"On {where}{snippet} your code looked up a key ({message}) that is not in the dictionary.{evidence} "
                "How could you check whether a key exists before reading it?")
    if exc_type == "ZeroDivisionError":
        return (f"On {where}{snippet} your code divided by zero.{evidence} "
                "Which input makes the divisor 0? What should your function return in that case?")
    if exc_type == "TypeError" and "not callable" in message:
        return (f"On {where}{snippet} your code called something that is not a function ({message}).{evidence} "
                "Did a variable reuse the name of a built-in function such as `sum`, `max` or `list`?")
    if exc_type == "TypeError" and ("unsupported operand" in message or "can only concatenate" in message):
        return (f"On {where}{snippet} two values of incompatible types were combined ({message}).{evidence} "
                "What type does each side have at this point?")
    if exc_type == "TypeError" and ("positional argument" in message or "argument" in message):
        return (f"On {where}{snippet} a function was called with the wrong number of arguments ({message}). "
                "Compare the call with the function's definition.")
    if exc_type == "TypeError" and "indices must be integers" in message:
        return (f"On {where}{snippet} a position was not a whole number ({message}).{evidence} "
                "Did `/` produce a float where you needed `//`?")
    if exc_type == "ValueError" and re.search(r"(max|min)\(\) (arg|iterable argument) is (an )?empty", message):
        return (f"On {where}{snippet} `max()` or `min()` received an empty sequence.{evidence} "
                "What should happen when there is nothing to compare?")
    if exc_type == "ValueError":
        return (f"On {where}{snippet} a value had the right type but an unusable content ({message}).{evidence} "
                "Which input produced it?")
    if exc_type == "AttributeError":
        return (f"On {where}{snippet} {message}.{evidence} "
                "Check which type the value really has. Is it possibly `None` because a function returned nothing?")
    if exc_type in ("NameError", "UnboundLocalError"):
        return (f"On {where}{snippet} Python did not recognise a name: {message}. "
                "Is it spelled the same everywhere, and is it assigned before it is used?")
    if exc_type == "RecursionError":
        return (f"Your function kept calling itself without stopping (reached on {where}).{evidence} "
                "Which input should stop the recursion, and is that check reached before the recursive call?")
    if exc_type == "MemoryError":
        return (f"Your code used more memory than allowed (on {where}). "
                "Is something growing without limit, such as a list inside a loop that never ends?")
    if exc_type == "EOFError":
        return ("Your code called `input()`, but this mission passes values as function parameters. "
                "Remove `input()` and use the parameters instead.")
    return (f"Your code raised {exc_type} on {where}{snippet}: {message}.{evidence} "
            "Read the line carefully: which value is not what you expected?")


def explain_timeout(findings: list[Finding], visible: bool) -> str:
    loop = next((f for f in findings if f.key == "infinite_loop"), None)
    if loop is not None:
        return (f"The test ran out of time. {loop.message} (line {loop.line}). "
                "Trace the loop by hand for one input: does it ever reach its stopping condition?")
    return ("The test ran out of time. Either a loop never stops, or the approach does too much work for this input. "
            "Which loop could repeat forever, or more often than needed?")


def explain_syntax(message: str, line: int | None, offset: int | None) -> str:
    return (f"Python could not read your code: {message} on {_loc(line)}"
            f"{f', near column {offset}' if offset else ''}. "
            "No tests could run. Check that line and the one before it for a missing `:`, bracket or quote.")


def explain_missing_function(function: str) -> str:
    return (f"Your code does not define a function named `{function}`. "
            "The tests call that exact name. Check the spelling and that it is not inside another block.")


def explain_wrong_output(label_message: str | None) -> str:
    if label_message:
        return f"{label_message} Compare your result with the expected one: where do they first differ?"
    return "Your function returned a different value. Compare it with the expected one: where do they first differ?"


def explain_hidden(status: str, coarse_category: str, static_findings: list[Finding]) -> str:
    """Explanation for a hidden test: built from the verdict and YOUR code only, never from test data."""
    lead = {
        "wrong_output": "returned a wrong answer",
        "runtime_error": "crashed",
        "timeout": "ran out of time",
    }.get(status, "failed")
    text = (f"On a hidden {coarse_category} test your code {lead}. Hidden tests check that your solution works "
            "in general, not just on the examples, so their data stays private.")
    if static_findings:
        f = static_findings[0]
        text += f" A check of your code found something worth looking at on line {f.line}: {f.message}"
    else:
        text += " Try inputs you haven't tested yet, especially unusual ones."
    return text
