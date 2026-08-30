#!/usr/bin/env python3
"""Fail-closed external evidence importer.

This importer proves only local schema/identity shape and hash consistency. It
never promotes a submission from SUBMITTED based on a reported PASS field.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

EXPECTED_RELEASE = "FRP-2.0.0-draft.1-20260829"
FINALITY_MARKERS = {"finality", "finalitygroup", "finality-group"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def safe_file(root: Path, relative: str) -> Path:
    candidate = (root / relative).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError as exc:
        raise ValueError(f"PATH_ESCAPES_BUNDLE:{relative}") from exc
    if not candidate.is_file():
        raise ValueError(f"FILE_MISSING:{relative}")
    return candidate


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def validate_shape(data: Any) -> list[str]:
    errors: list[str] = []
    require(isinstance(data, dict), "SUBMISSION_OBJECT_REQUIRED", errors)
    if not isinstance(data, dict):
        return errors
    required = {"submissionType", "schemaVersion", "evidenceKind", "identity", "repositoryUrl", "commit", "releaseTested", "artifact", "ciRunUrl", "report", "submittedAt"}
    require(required.issubset(data), f"MISSING_FIELDS:{','.join(sorted(required - set(data)))}", errors)
    require(data.get("submissionType") == "FINALITY_EXTERNAL_EVIDENCE_SUBMISSION", "SUBMISSION_TYPE_INVALID", errors)
    require(data.get("schemaVersion") == "1.0", "SCHEMA_VERSION_INVALID", errors)
    require(data.get("evidenceKind") in {"INDEPENDENT_IMPLEMENTATION", "OUTSIDE_FALSIFICATION"}, "EVIDENCE_KIND_INVALID", errors)
    require(data.get("releaseTested") == EXPECTED_RELEASE, "RELEASE_IDENTITY_MISMATCH", errors)
    identity = data.get("identity") if isinstance(data.get("identity"), dict) else {}
    require(bool(identity.get("name")) and bool(identity.get("identifier")) and bool(identity.get("independenceDisclosure")), "ATTRIBUTABLE_IDENTITY_REQUIRED", errors)
    require(identity.get("isBot") is not True, "BOT_SUBMISSION_NOT_ADMISSIBLE", errors)
    identity_text = " ".join(str(identity.get(key, "")).lower() for key in ("name", "organization", "identifier"))
    require("simulated" not in identity_text and "anonymous" not in identity_text, "SIMULATED_OR_ANONYMOUS_NOT_ADMISSIBLE", errors)
    require(not any(marker in identity_text for marker in FINALITY_MARKERS), "FINALITY_CONTROLLED_IDENTITY_NOT_EXTERNAL", errors)
    repo = data.get("repositoryUrl", "")
    require(isinstance(repo, str) and repo.startswith("https://github.com/") and len(repo.rstrip("/").split("/")) == 5, "INDEPENDENT_GITHUB_REPOSITORY_REQUIRED", errors)
    require(isinstance(data.get("commit"), str) and len(data["commit"]) == 40 and all(c in "0123456789abcdef" for c in data["commit"]), "FULL_GIT_COMMIT_REQUIRED", errors)
    require(isinstance(data.get("ciRunUrl"), str) and data["ciRunUrl"].startswith("https://github.com/") and "/actions/runs/" in data["ciRunUrl"], "GITHUB_CI_RUN_REQUIRED", errors)
    if data.get("evidenceKind") == "INDEPENDENT_IMPLEMENTATION":
        require(isinstance(data.get("conformanceResult"), dict), "CONFORMANCE_RESULT_REQUIRED", errors)
    return errors


def verify_hash_fields(data: dict[str, Any], bundle_root: Path) -> tuple[bool, list[str]]:
    errors: list[str] = []
    fields = ["artifact", "report"] + (["conformanceResult"] if data.get("evidenceKind") == "INDEPENDENT_IMPLEMENTATION" else [])
    for field in fields:
        descriptor = data.get(field)
        if not isinstance(descriptor, dict) or not isinstance(descriptor.get("path"), str) or not isinstance(descriptor.get("sha256"), str):
            errors.append(f"{field.upper()}_DESCRIPTOR_INVALID")
            continue
        try:
            actual = sha256_file(safe_file(bundle_root, descriptor["path"]))
        except ValueError as exc:
            errors.append(str(exc))
            continue
        if actual != descriptor["sha256"]:
            errors.append(f"{field.upper()}_HASH_MISMATCH:{actual}")
    return not errors, errors


def import_submission(submission_path: Path, bundle_root: Path) -> dict[str, Any]:
    data = json.loads(submission_path.read_text(encoding="utf-8"))
    errors = validate_shape(data)
    hashes_ok = False
    if not errors:
        hashes_ok, hash_errors = verify_hash_fields(data, bundle_root)
        errors.extend(hash_errors)
    if errors:
        raise ValueError(";".join(errors))
    submission_hash = hashlib.sha256(canonical_bytes(data)).hexdigest()
    return {
        "recordType": "FINALITY_EXTERNAL_EVIDENCE_RECORD",
        "recordVersion": "1.0",
        "recordId": f"FER-{submission_hash[:24]}",
        "submissionSha256": submission_hash,
        "evidenceKind": data["evidenceKind"],
        "state": "SUBMITTED",
        "releaseTested": data["releaseTested"],
        "repositoryUrl": data["repositoryUrl"],
        "commit": data["commit"],
        "identity": data["identity"],
        "checks": {
            "schemaValid": True,
            "hashesRecomputed": hashes_ok,
            "signatureVerified": False,
            "repositoryCommitVerified": False,
            "ciVerified": False,
            "technicallyReproduced": False,
            "independenceReviewed": False
        },
        "discrepancies": [],
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--submission", required=True, type=Path)
    parser.add_argument("--bundle-root", required=True, type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        record = import_submission(args.submission.resolve(), args.bundle_root.resolve())
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"EVIDENCE IMPORT: REJECTED ({exc})")
        return 1
    rendered = json.dumps(record, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    print("EVIDENCE IMPORT: SUBMITTED — NO EXTERNAL CLAIM PROMOTED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
