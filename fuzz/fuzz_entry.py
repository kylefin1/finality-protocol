#!/usr/bin/env python3
"""ClusterFuzzLite/Atheris entry point for public parser and semantic surfaces."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import atheris

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "protocol/FRP-2.0.0-draft.1/python/finality_verify.py"
SPEC = importlib.util.spec_from_file_location("finality_verify", MODULE_PATH)
assert SPEC and SPEC.loader
VERIFY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VERIFY)
IMPORT_SPEC = importlib.util.spec_from_file_location("evidence_import", ROOT / "tools/evidence_import.py")
assert IMPORT_SPEC and IMPORT_SPEC.loader
EVIDENCE_IMPORT = importlib.util.module_from_spec(IMPORT_SPEC)
IMPORT_SPEC.loader.exec_module(EVIDENCE_IMPORT)


def test_one_input(data: bytes) -> None:
    if not data:
        return
    mode = sum(data) % 11
    try:
        value = json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return
    try:
        if mode == 0:
            VERIFY.canonical_json(value)
        elif mode == 1 and isinstance(value, dict):
            VERIFY.contract_hash(value)
        elif mode == 2 and isinstance(value, dict):
            VERIFY.observation_hash(value)
        elif mode == 3 and isinstance(value, dict):
            VERIFY.verify_bundle(value)
        elif mode == 4 and isinstance(value, list):
            VERIFY.merkle_root(value)
        elif mode == 5 and isinstance(value, dict):
            VERIFY.parse_time(value.get("observedAt"))
        elif mode == 6 and isinstance(value, dict):
            contract = value.get("contract", {})
            VERIFY.evaluate(
                contract,
                value.get("sourceContracts", []),
                value.get("observations", []),
                value.get("evaluatedAt", "INVALID"),
                value.get("previousState"),
                bool(value.get("stopTriggered", False)),
                value.get("verifiedObservationSignatures", []),
            )
        elif mode == 7:
            EVIDENCE_IMPORT.validate_shape(value)
        elif mode == 8 and isinstance(value, dict):
            # Certificate and signature material are parsed through the
            # independent verification-bundle surface.
            VERIFY.verify_bundle(value)
        elif mode == 9 and isinstance(value, list):
            # Public lineage parser shape: every successor must identify a
            # previous certificate hash and every state must be canonical.
            previous = None
            for certificate in value:
                if not isinstance(certificate, dict):
                    raise TypeError("certificate object required")
                if previous is not None and certificate.get("previousCertificate") != previous:
                    raise ValueError("lineage mismatch")
                if certificate.get("classification") not in VERIFY.STATES:
                    raise ValueError("state invalid")
                previous = certificate.get("certificateHash")
        elif mode == 10 and isinstance(value, dict):
            signature = value.get("signature", {})
            if signature and not all(isinstance(signature.get(key), str) for key in ("algorithm", "keyId", "signature")):
                raise ValueError("signature material invalid")
    except (KeyError, TypeError, ValueError, OverflowError):
        # Malformed public input must be rejected without an interpreter crash.
        return


def main() -> None:
    atheris.Setup(sys.argv, test_one_input)
    atheris.Fuzz()


if __name__ == "__main__":
    main()
