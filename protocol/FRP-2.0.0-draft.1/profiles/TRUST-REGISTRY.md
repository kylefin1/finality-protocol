# Trust registry interface

A verifier resolves `keyId` and SSC issuer through a configured registry
interface: `resolve(issuer, keyId, at) -> key/status/validity/revocation`.
Deployments MAY use explicit trust, an internal registry, consortium list,
government list, or Finality-operated registry. No global registry is required.
Historical verification MUST apply the key and revocation semantics declared by
the profile rather than silently using the current key.
