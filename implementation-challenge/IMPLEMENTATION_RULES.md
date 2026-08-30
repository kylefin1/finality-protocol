# Independent implementation rules

1. Author the implementation independently from Finality's disclosed verifier
   source. The specification, schemas, and vectors may be used.
2. Identify every reused library and code fragment.
3. Keep the repository and discrepancy history visible.
4. Bind reports to exact commits, build artifacts, frozen release identity, and
   CI URLs.
5. Finality may clarify published semantics but may not secretly patch the
   implementation or pre-approve results.
6. Execute all conformance vectors and preserve raw machine-readable output.
7. Report every disagreement. Partial reproduction must not be labeled full
   conformance.
8. A Finality-authored repository, bot-only run, anonymous submission, or copied
   canonical verifier does not count as independent implementation evidence.
