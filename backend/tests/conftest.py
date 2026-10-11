import pytest

from codequest.content import load_all
from codequest.sandbox.runner import make_runner


@pytest.fixture(scope="session")
def runner():
    # CQ_RUNNER=docker runs the whole suite inside the hardened container
    return make_runner()


@pytest.fixture(scope="session")
def challenges():
    return load_all()


PRIYA_CLASS_AVERAGE = '''def class_average(scores):
    total = 0
    count = 0
    i = 0
    while i < len(scores) - 1:
        if scores[i] == -1:
            continue
        total += scores[i]
        count += 1
        i += 1
    return total / count
'''
