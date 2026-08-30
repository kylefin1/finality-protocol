# Break Finality challenge

This package asks outside reviewers to falsify the frozen
`FRP-2.0.0-draft.1` / `FSK-1.0.0` semantics. It does not ask for endorsement.

```bash
make attacks
make test
```

The public harness covers disclosed false-FINAL, STOP-bypass, temporal,
source-correlation, evidence mutation, signature-required, REOPEN, version, and
lineage cases. Reviewers should add attacks rather than infer assurance from the
included cases.

1. Read [`CHALLENGE_RULES.md`](CHALLENGE_RULES.md).
2. Record methods in [`REPORT_TEMPLATE.md`](REPORT_TEMPLATE.md).
3. Validate against [`schemas/falsification-report.schema.json`](schemas/falsification-report.schema.json).
4. Sign the finished report using [`SIGNING.md`](SIGNING.md).
5. Submit an evidence envelope described in [`../evidence/README.md`](../evidence/README.md).

No report changes the external-evidence scoreboard until identity, release,
hashes, reproducibility, and signature material have been independently checked.
