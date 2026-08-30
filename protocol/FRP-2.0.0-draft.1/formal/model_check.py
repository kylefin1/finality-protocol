#!/usr/bin/env python3
"""Bounded explicit-state companion check for FinalityKernel.tla.

This is executable in the frozen release without a TLC installation. It checks
the same finite safety abstraction through depth eight and reports its state
and transition counts. It is not a proof about real-world source correctness.
"""

from __future__ import annotations

import hashlib
import json
from collections import deque
from dataclasses import dataclass


@dataclass(frozen=True)
class State:
    classification: str = "OPEN"
    observed: int = 0
    mandatory_false: bool = False
    hard_contradiction: bool = False
    stopped: bool = False
    lineage: tuple[tuple[int, str], ...] = ()


def classify(state: State) -> str:
    if state.stopped:
        return "FAILED"
    if state.classification == "FINAL" and (state.hard_contradiction or state.mandatory_false):
        return "REOPENED"
    if state.hard_contradiction:
        return "CONTRADICTED"
    if state.observed == 0:
        return "OPEN"
    if state.observed != 0b11:
        return "PENDING"
    if state.mandatory_false:
        return "CURE_REQUIRED"
    return "FINAL"


def successors(state: State) -> set[State]:
    def immediate(new_flag: str) -> State:
        mandatory_false = state.mandatory_false or new_flag == "mandatory"
        hard_contradiction = state.hard_contradiction or new_flag == "contradiction"
        stopped = state.stopped or new_flag == "stop"
        if stopped:
            classification = "FAILED"
        elif state.classification == "FINAL" and (mandatory_false or hard_contradiction):
            classification = "REOPENED"
        else:
            classification = state.classification
        changed = classification != state.classification or new_flag == "stop"
        lineage = state.lineage + ((len(state.lineage) + 1, classification),) if changed else state.lineage
        return State(classification, state.observed, mandatory_false, hard_contradiction, stopped, lineage)
    result = {
        State(state.classification, state.observed | 0b01, state.mandatory_false, state.hard_contradiction, state.stopped, state.lineage),
        State(state.classification, state.observed | 0b10, state.mandatory_false, state.hard_contradiction, state.stopped, state.lineage),
        immediate("mandatory"),
        immediate("contradiction"),
        immediate("stop"),
    }
    next_class = classify(state)
    result.add(State(next_class, state.observed, state.mandatory_false, state.hard_contradiction, state.stopped, state.lineage + ((len(state.lineage) + 1, next_class),)))
    return result


def invariant(state: State) -> list[str]:
    failures = []
    if state.classification == "FINAL" and (state.mandatory_false or state.hard_contradiction or state.stopped or state.observed != 0b11):
        failures.append("NO_FALSE_FINAL")
    if state.classification == "REOPENED" and (not state.lineage or state.lineage[-1][1] != "REOPENED"):
        failures.append("REOPEN_HAS_LINEAGE")
    if any(index != generation for index, (generation, _) in enumerate(state.lineage, 1)):
        failures.append("NO_HISTORY_MUTATION")
    return failures


def main() -> int:
    initial = State()
    queue = deque([(initial, 0)])
    visited = {initial}
    transitions = 0
    failures = []
    while queue:
        state, depth = queue.popleft()
        failures.extend((state, failure) for failure in invariant(state))
        if depth == 8:
            continue
        for successor in successors(state):
            transitions += 1
            if successor not in visited:
                visited.add(successor)
                queue.append((successor, depth + 1))
    report = {
        "artifact": "FinalityKernelBoundedModelCheck",
        "depth": 8,
        "states": len(visited),
        "transitions": transitions,
        "invariants": ["NO_FALSE_FINAL", "REOPEN_HAS_LINEAGE", "NO_HISTORY_MUTATION"],
        "failures": len(failures),
        "status": "PASS" if not failures else "FAIL",
        "assumption": "Authentic, correctly normalized mandatory-source observations",
    }
    report["report_hash"] = hashlib.sha256(json.dumps(report, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
