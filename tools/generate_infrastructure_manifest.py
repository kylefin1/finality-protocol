#!/usr/bin/env python3
"""Compute or verify the outer infrastructure content-root manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "external-proof-manifest.json"
EXCLUDED = {"external-proof-manifest.json"}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def records() -> list[dict[str, object]]:
    output = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or ".git" in path.parts or "artifacts" in path.parts or "__pycache__" in path.parts:
            continue
        relative = path.relative_to(ROOT).as_posix()
        if relative in EXCLUDED or relative.endswith(".pyc"):
            continue
        data = path.read_bytes()
        output.append({"path": relative, "sha256": sha256_bytes(data), "bytes": len(data)})
    return output


def payload() -> dict[str, object]:
    entries = records()
    canonical = json.dumps(entries, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return {
        "manifestType": "FINALITY_EXTERNAL_PROOF_INFRASTRUCTURE_MANIFEST",
        "manifestVersion": "1.0",
        "protocolRelease": "FRP-2.0.0-draft.1-20260829",
        "protocol": "FRP-2.0.0-draft.1",
        "kernel": "FSK-1.0.0",
        "canonicalReleaseManifestSha256": "0ca1344c62c6d054424e77882b0851449ef5bfa46cca5e27c377729f08ee076a",
        "frozenPackageManifestBodySha256": "c133c950332e47a54eb542180dcd64fc1dd7c1b2068538f8eaad8491097c37b4",
        "fileCount": len(entries),
        "contentRoot": sha256_bytes(canonical),
        "evidenceClass": "SELLER_CONTROLLED_INFRASTRUCTURE",
        "externalEvidenceCounts": {
            "independentCompatibleImplementations": 0,
            "outsideFalsificationRecords": 0,
            "buyerAuthoredExecutedCases": 0,
            "productionPlatformDependencies": 0
        }
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--print", dest="print_payload", action="store_true")
    args = parser.parse_args()
    expected = payload()
    if args.print_payload or not args.check:
        print(json.dumps(expected, indent=2))
    if args.check:
        if not MANIFEST.exists() or json.loads(MANIFEST.read_text(encoding="utf-8")) != expected:
            print("INFRASTRUCTURE MANIFEST: FAIL")
            print(json.dumps(expected, indent=2))
            return 1
        print(f"INFRASTRUCTURE MANIFEST: PASS ({expected['fileCount']} files; root {expected['contentRoot']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
