#!/usr/bin/env python3
"""Rebuild external-evidence counts from strictly admissible records."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

REQUIRED_CHECKS = {"schemaValid", "hashesRecomputed", "signatureVerified", "repositoryCommitVerified", "ciVerified", "technicallyReproduced", "independenceReviewed"}


def admissible(record: dict[str, Any]) -> bool:
    identity = record.get("identity", {})
    text = " ".join(str(identity.get(key, "")).lower() for key in ("name", "organization", "identifier"))
    checks = record.get("checks", {})
    return (
        record.get("recordType") == "FINALITY_EXTERNAL_EVIDENCE_RECORD"
        and record.get("releaseTested") == "FRP-2.0.0-draft.1-20260829"
        and record.get("state") in {"REPRODUCED", "DISCREPANCY", "PASS", "FAILED", "DISPUTED"}
        and not identity.get("isBot", False)
        and all(marker not in text for marker in ("finality", "simulated", "anonymous"))
        and REQUIRED_CHECKS.issubset(checks)
        and all(checks[key] is True for key in REQUIRED_CHECKS)
    )


def build(records_dir: Path) -> dict[str, Any]:
    records: list[dict[str, Any]] = []
    for path in sorted(records_dir.glob("*.json")):
        records.append(json.loads(path.read_text(encoding="utf-8")))
    accepted = [record for record in records if admissible(record)]
    implementations = [record for record in accepted if record.get("evidenceKind") == "INDEPENDENT_IMPLEMENTATION"]
    attacks = [record for record in accepted if record.get("evidenceKind") == "OUTSIDE_FALSIFICATION"]
    discrepancies = [record for record in accepted if record.get("state") in {"DISCREPANCY", "FAILED", "DISPUTED"}]
    return {
        "scoreboardType": "FINALITY_ZERO_DOLLAR_EXTERNAL_PROOF",
        "schemaVersion": "1.0",
        "release": "FRP-2.0.0-draft.1-20260829",
        "generatedFrom": "evidence/records",
        "metrics": {
            "githubForks": 0,
            "externalImplementationAttempts": len(implementations),
            "externalConformanceRuns": len(implementations),
            "externalAttackReports": len(attacks),
            "signedReports": len(accepted),
            "dois": 0,
            "externalDiscrepancies": len(discrepancies),
            "independentCompatibleImplementations": sum(record.get("state") == "PASS" for record in implementations),
            "outsideFalsificationRecords": len(attacks)
        },
        "exclusions": [
            "Finality-controlled repositories or forks",
            "Finality seller test runs",
            "bots",
            "anonymous or unattributable submissions",
            "self-reported PASS values not independently recomputed"
        ],
        "claim": "External evidence remains zero until an attributable outside submission is verified and reproduced."
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--records", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    scoreboard = build(args.records)
    rendered = json.dumps(scoreboard, indent=2, sort_keys=False) + "\n"
    if args.check:
        if not args.output.exists() or args.output.read_text(encoding="utf-8") != rendered:
            print("SCOREBOARD: FAIL (stored scoreboard differs from verified records)")
            return 1
    else:
        args.output.write_text(rendered, encoding="utf-8")
    print(f"SCOREBOARD: PASS ({len(list(args.records.glob('*.json')))} record files; external counts derived without reported PASS)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
