#!/usr/bin/env python3
"""Verify that a promoted evidence record has every required check."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

REQUIRED = ["schemaValid", "hashesRecomputed", "signatureVerified", "repositoryCommitVerified", "ciVerified", "technicallyReproduced", "independenceReviewed"]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("record", type=Path)
    args = parser.parse_args()
    record = json.loads(args.record.read_text(encoding="utf-8"))
    checks = record.get("checks", {})
    failures = [name for name in REQUIRED if checks.get(name) is not True]
    if record.get("state") != "SUBMITTED" and failures:
        print("EXTERNAL RESULT: FAIL CLOSED")
        print("Missing verified checks: " + ", ".join(failures))
        return 1
    if record.get("state") == "PASS" and record.get("evidenceKind") == "INDEPENDENT_IMPLEMENTATION" and failures:
        print("EXTERNAL RESULT: INVALID PASS")
        return 1
    print(f"EXTERNAL RESULT: {record.get('state', 'INVALID')} (checks inspected; no reported boolean trusted)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
