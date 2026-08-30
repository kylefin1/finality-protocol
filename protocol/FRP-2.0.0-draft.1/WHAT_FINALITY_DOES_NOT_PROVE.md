# What Finality does not prove

- A correctly signed source may still lie or be compromised.
- A source can be authoritative only under an approved SSC; a signature alone
  does not grant authority.
- The self-contained bundle does not prove that its SSCs or signing keys were
  institutionally approved. That requires an independently governed trust
  registry or equivalent verifier-supplied trust policy.
- Cryptography binds contract, evidence, classification, and lineage. It does
  not prove reality by itself.
- A valid certificate is technical evidence, not automatic legal finality,
  contractual acceptance, regulatory approval, or court admissibility.
- Physical outcomes require explicit sensor calibration, authority, custody,
  freshness, and redundancy assumptions.
- Seller-controlled conformance and adversarial tests are not independent
  validation, buyer testing, production evidence, or institutional adoption.
- The formal model checks a finite abstraction and not real-world source
  correctness, adapter security, or a machine-checked implementation refinement.
- The WASM module covers terminal fail-closed classification flags; the host
  verifier remains responsible for parsing, hashing, authority, and signatures.
- This release implements no zero-knowledge proof system, hardware attestation,
  threshold-signature scheme, live SCITT log, or W3C endorsement.
- Availability is subordinate to safety for consequential FINAL; partitions may
  leave outcomes PENDING.
