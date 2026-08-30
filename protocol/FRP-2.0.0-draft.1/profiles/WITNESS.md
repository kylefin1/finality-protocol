# Finality Witness profile

A Witness is independently operable and has only three core functions:

```text
observe(predicate, subject)
attest(value, validity interval, SSC)
sign(AOE)
```

The Witness MUST minimize disclosure, identify its source/trust domain/time,
bind its SSC and dependency references, and protect signing keys. A Witness
MUST NOT claim global FINAL unless an approved Outcome Contract grants it that
specific policy role. Federation MAY use multiple independent signatures or a
threshold construction. Threshold cryptography is optional; this reference
release implements independent attestations, not a threshold-signature scheme.
