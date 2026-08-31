#!/usr/bin/env bash
set -euo pipefail

release=""
e4_bundle=""
output="reviewer-report.json"
while (($#)); do
  case "$1" in
    --release) release="$2"; shift 2 ;;
    --e4-bundle) e4_bundle="$2"; shift 2 ;;
    --output) output="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 64 ;;
  esac
done
test -n "$release" || { echo "--release required" >&2; exit 64; }
test -f "$e4_bundle" || { echo "--e4-bundle must name a buyer-controlled bundle" >&2; exit 66; }

./protocol/FRP-2.0.0-draft.1/reproduce.sh
python3 - "$e4_bundle" <<'PY'
import json, pathlib, sys
payload = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
required = {"release_identity", "buyer_protocol", "result_matrix", "receipt", "reopen_records"}
missing = sorted(required - set(payload))
if missing:
    raise SystemExit("E4_BUNDLE_MISSING:" + ",".join(missing))
print("E4_BUNDLE_SHAPE: PASS; ATTRIBUTION_AND_ACCEPTANCE: REVIEWER_REQUIRED")
PY

python3 - "$release" "$e4_bundle" "$output" <<'PY'
import hashlib, json, pathlib, sys
release, bundle_path, output = sys.argv[1:]
bundle = pathlib.Path(bundle_path).read_bytes()
report = {
  "artifact": "FinalityIndependentE5ReviewerReport",
  "release": release,
  "buyer_e4_bundle_sha256": hashlib.sha256(bundle).hexdigest(),
  "release_reproduction": "PASS",
  "e4_import": "PARSED_NOT_ACCEPTED",
  "classification_replay": "REVIEWER_ACTION_REQUIRED",
  "evidence_root": "REVIEWER_ACTION_REQUIRED",
  "certificate_lineage": "REVIEWER_ACTION_REQUIRED",
  "reopen_supersession": "REVIEWER_ACTION_REQUIRED",
  "disposition": "AMBIGUITY",
  "boundary": "The reviewer must change disposition only after completing independent custody, replay and lineage review."
}
pathlib.Path(output).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"report": output, "disposition": report["disposition"]}))
PY
