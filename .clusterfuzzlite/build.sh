#!/bin/bash
set -eu

python3 -m pip install --disable-pip-version-check --no-cache-dir atheris
cp protocol/FRP-2.0.0-draft.1/python/finality_verify.py fuzz/finality_verify.py
cp tools/evidence_import.py fuzz/evidence_import.py
trap 'rm -f fuzz/finality_verify.py fuzz/evidence_import.py' EXIT
compile_python_fuzzer fuzz/fuzz_entry.py
