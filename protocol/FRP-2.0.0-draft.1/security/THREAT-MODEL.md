# Finality Reality Protocol threat model

## Assets

Outcome Contract meaning, SSC authority, AOE integrity/freshness, dependency
structure, classification, certificate/lineage integrity, signing keys, tenant
separation, hidden expected answers, and challenge history.

## Adversaries and controls

| Threat | Required control | Residual boundary |
| --- | --- | --- |
| malicious agent claims completion | actor statements non-authoritative by default | approved SSC could still grant limited authority |
| forged/mutated evidence | canonical hash, signature policy, evidence DAG | compromised authorized source may sign false state |
| replay/stale signature | observation id, validity interval, freshness, lineage | source clock correctness remains assumed |
| contract/certificate substitution | contract hash and certificate hash binding | key/trust policy must be configured correctly |
| correlated evidence | independence roots and dependency graph | undisclosed upstream dependency may remain hidden |
| witness collusion/equivocation | trust-domain policies, immutable observations, challenge | tolerance only as strong as configured quorum |
| source omission | mandatory SSC list and fail-closed PENDING | availability may reduce liveness |
| parser ambiguity | canonical JSON subset, typed FOCL, fuzzing | profile extensions require their own review |
| timestamp manipulation | SSC timestamp source, validity/freshness separation | no universal trusted time is claimed |
| cross-tenant leakage | context/subject/scope binding and access policy | deployment enforcement is outside bare protocol |
| privacy leakage | predicate attestations, commitments, selective disclosure | no ZK proof implementation in this release |
| STOP bypass | STOP evaluated before FINAL; state history immutable | external workflow must honor returned STOP |
| LLM override | LLM excluded from FSK; proposal-only compiler/Sentinel | surrounding application access control still matters |
| denial of service/partition | resource limits; PENDING on missing mandatory authority | safety is preferred over forced availability |

## Security release truth

The package is seller-tested. It has not received an external penetration test,
independent cryptographic review, production red-team assessment, hardware
attestation, or institutional security approval.
