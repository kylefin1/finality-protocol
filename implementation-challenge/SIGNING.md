# Sign and verify an implementation report

```bash
cosign sign-blob REPORT.md --bundle REPORT.sigstore.json
```

```bash
cosign verify-blob REPORT.md \
  --bundle REPORT.sigstore.json \
  --certificate-identity "IMPLEMENTER_IDENTITY" \
  --certificate-oidc-issuer "OIDC_ISSUER"
```

The signature binds the report to the disclosed signing identity. The evidence
importer still recomputes hashes and requires technical reproduction.
