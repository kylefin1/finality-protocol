#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$root"

for command in node python3; do
  command -v "$command" >/dev/null || { echo "MISSING_RUNTIME: $command" >&2; exit 69; }
done

python3 - <<'PY'
import hashlib, json, pathlib, sys

root = pathlib.Path.cwd()
manifest_path = root / "release-manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
body = {key: value for key, value in manifest.items() if key != "manifestHash"}
encoded = json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode()
if hashlib.sha256(encoded).hexdigest() != manifest["manifestHash"]:
    raise SystemExit("RELEASE_MANIFEST_HASH: FAIL")

artifacts = manifest["artifacts"]
for artifact in artifacts:
    path = root / artifact["path"]
    if not path.is_file():
        raise SystemExit(f"MISSING_ARTIFACT: {artifact['path']}")
    data = path.read_bytes()
    if len(data) != artifact["bytes"] or hashlib.sha256(data).hexdigest() != artifact["sha256"]:
        raise SystemExit(f"ARTIFACT_HASH: FAIL: {artifact['path']}")

root_hash = hashlib.sha256(json.dumps(artifacts, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
if root_hash != manifest["contentRoot"]:
    raise SystemExit("CONTENT_ROOT: FAIL")
print(json.dumps({"manifest":"PASS","artifacts":len(artifacts),"contentRoot":root_hash}))
PY

node --experimental-strip-types conformance/run-conformance.mts conformance/golden-vectors.json
python3 python/finality_verify.py conformance conformance/golden-vectors.json
python3 formal/model_check.py

wasm_tmp="$(mktemp)"
trap 'rm -f "$wasm_tmp"' EXIT
node wasm/build-wasm.mjs "$wasm_tmp" >/dev/null
cmp --silent wasm/finality-kernel.wasm "$wasm_tmp" || { echo "WASM_REBUILD: FAIL" >&2; exit 1; }

printf 'FINALITY INDEPENDENT REPRODUCTION\n'
printf 'Protocol: PASS\nCanonicalization: PASS\nContract validation: PASS\n'
printf 'Evidence hash integrity: PASS\nOutcome reconstruction: PASS\nCertificate hash reconstruction: PASS\n'
printf 'Institutional source/key approval: NOT ESTABLISHED BY SELF-CONTAINED PACKAGE\n'
printf 'History/REOPEN model: PASS\nVerifier differential: PASS\nObserved discrepancies: 0\n'
