# External submission bundles

Each pull request may add one directory containing `submission.json` plus the
artifact, report, conformance result (when applicable), and Sigstore bundle it
references. Do not place example or seller-authored evidence here.

CI imports every submission into `SUBMITTED` state and recomputes local hashes.
CI does not promote it. Repository/commit inspection, keyless signature
verification, isolated rebuild, technical reproduction, and independence review
must be recorded before a verified evidence record is added to
`evidence/records`.
