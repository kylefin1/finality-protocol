# Sign and verify a report

Use your own OIDC-backed identity. Do not request a Finality-held signing key.

```bash
cosign sign-blob REPORT.md --bundle REPORT.sigstore.json
```

Verify with the identity and issuer the reviewer disclosed:

```bash
cosign verify-blob REPORT.md \
  --bundle REPORT.sigstore.json \
  --certificate-identity "REVIEWER_IDENTITY" \
  --certificate-oidc-issuer "OIDC_ISSUER"
```

Signature verification establishes the signer binding and report integrity. It
does not establish reviewer independence or reproduce the technical result.
