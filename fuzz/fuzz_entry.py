#!/usr/bin/env python3
"""ClusterFuzzLite/Atheris entry point for public parser and semantic surfaces."""

import json
import sys

import atheris

# The build script stages these reviewed modules beside this entry point so
# PyInstaller can discover and bundle them. This avoids runtime dependencies on
# a repository checkout after ClusterFuzzLite relocates the packaged fuzzer.
import evidence_import as EVIDENCE_IMPORT
import finality_verify as VERIFY


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
            observed_at = value.get("observedAt")
            if isinstance(observed_at, str):
                VERIFY.parse_time(observed_at)
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
