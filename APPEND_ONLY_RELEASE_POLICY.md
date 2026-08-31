# Append-only canonical release policy

Published canonical tags and release assets are immutable records. Normal publication is:

1. create `pub.N` as a draft;
2. attach every artifact without replacement;
3. verify archive, checksums, manifest, Sigstore and GitHub attestation;
4. publish and lock the record;
5. create `pub.N+1` for any byte change.

Automation must refuse upload to a non-draft release. `--clobber` is prohibited. Existing `pub.2` is not rewritten; a future `pub.3` may supersede it for publication-governance reasons without changing FRP-2.0.0-draft.1 or FSK-1.0.0 semantics.
