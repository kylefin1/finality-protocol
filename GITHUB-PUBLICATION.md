# GitHub publication and controls

## Repository settings

1. Confirm `LICENSE`, `DCO.md`, `TRADEMARKS.md`, `NOTICE`, and the repository URL recorded in citation metadata.
2. Create a public repository with Actions and private vulnerability reporting
   enabled.
3. Push the exact committed tree. Do not rebuild or rewrite the nested frozen
   protocol package.
4. Require `Public conformance and adversarial CI`, `CodeQL`,
   `ClusterFuzzLite PR fuzzing`, and `External evidence intake` on `main`.
5. Require pull requests, prevent force pushes/deletion, require conversation
   resolution, and restrict direct writes to evidence records.
6. Enable GitHub code scanning and verify CodeQL/Scorecard SARIF upload.
7. Run the release workflow only from `external-proof-v*` tags. Verify the
   Sigstore bundle and SLSA provenance subject before publishing an artifact.

All workflows use standard GitHub-hosted runner labels. No paid larger runner is
configured. GitHub-hosted execution, security-tab publication, and release
attestation exist only after the repository is published and workflows run.
