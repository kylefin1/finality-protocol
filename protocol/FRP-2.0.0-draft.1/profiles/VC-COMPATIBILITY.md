# W3C Verifiable Credentials compatibility profile

This is a compatibility mapping, not W3C endorsement.

| FRP | VC-compatible concept |
| --- | --- |
| certificate issuer | `issuer` |
| authorized recipient/presenter | `holder` where applicable |
| subject | `credentialSubject` |
| certificate/observation integrity | `proof` |
| verifier | VC verifier role |

The VC representation MUST embed or hash-bind the complete FOC v2 semantic
object. A valid VC proof does not establish SSC authority, freshness, quorum,
or outcome satisfaction; the FRP verifier still evaluates those rules.
