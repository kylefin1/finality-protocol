# Contributing

Contributions should make the frozen semantics easier to verify, implement, or
falsify. They must not introduce new FRP or FSK semantics in this repository.

1. Fork the repository.
2. Run `make test` before opening a pull request.
3. Describe whether the change affects infrastructure, a discrepancy report,
   or an independent implementation record.
4. Keep protocol discrepancies visible; do not rewrite historical reports.
5. Do not include secrets, protected buyer data, confidential adapters, or
   proprietary-core material.
6. Certify the Developer Certificate of Origin 1.1 by adding a `Signed-off-by:`
   line to every commit. Use `git commit -s` to add it automatically.

Specification questions are welcome. Finality may clarify published text but
must not secretly write or patch a submission presented as independent.

External implementation and falsification submissions must follow their
respective `IMPLEMENTATION_RULES.md` or `CHALLENGE_RULES.md` and must disclose
reused code.

The full certificate appears in [`DCO.md`](DCO.md). Contributions are licensed
under Apache-2.0. No contribution grants a right to use reserved Finality marks.
