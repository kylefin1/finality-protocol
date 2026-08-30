# SCITT-style transparency profile

An implementation MAY register hashes of protocol releases, contracts,
certificates, REOPEN successors, external validation receipts, and release
manifests in a SCITT-compatible transparency service. A receipt establishes a
tamper-evident statement chronology under that service's assumptions. It MUST
NOT be treated as proof that the observed outcome was true.

This release provides the profile and hashable artifact fields; it does not
claim a live SCITT service, external notary, or third-party timestamp.
