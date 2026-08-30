#!/bin/bash
set -eu

python3 -m pip install --disable-pip-version-check --no-cache-dir atheris
compile_python_fuzzer fuzz/fuzz_entry.py
