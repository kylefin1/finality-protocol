# External evidence ingest

The importer records submissions without trusting reported PASS booleans.

## Submission bundle

Place a submission JSON and its referenced local artifacts in an isolated
directory, then run:

```bash
python3 tools/evidence_import.py \
  --submission /path/to/bundle/submission.json \
  --bundle-root /path/to/bundle \
  --output /tmp/FER.json
```

The importer validates the schema, release identity, non-bot attribution,
repository shape, safe local paths, and recomputed artifact/report/result
hashes. Initial state is always `SUBMITTED`. It does not infer independence,
trust remote CI, verify GitHub ownership, or reproduce the technical result.

Promotion requires separately recorded checks:

- `IDENTITY_VERIFIED`: report signature and signer identity verified;
- `REPRODUCED`: exact repository commit and CI inspected, artifacts rebuilt,
  technical result reproduced, and independence reviewed;
- `PASS`: reproduced result meets the applicable published conformance rules;
- `DISCREPANCY`, `FAILED`, or `DISPUTED`: disagreement or adverse result remains
  visible and is never reduced to PASS.

`tools/build_scoreboard.py` rebuilds canonical counts from evidence records and
excludes Finality-controlled, bot, anonymous, simulated, or incompletely checked
records. Empty `evidence/records` therefore produces truthful zeros.
