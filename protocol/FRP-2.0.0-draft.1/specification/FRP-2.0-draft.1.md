# Finality Reality Protocol Specification

Version `2.0.0-draft.1` · Finality Group specification · 29 August 2026

This is a Finality Group specification, not an adopted industry standard. The
key words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and
**MAY** are normative when capitalized.

## 1. Scope

FRP defines portable semantics for determining whether a consequential outcome
has reached the authoritative state required by a pre-approved contract. It
defines contracts, source authority, observations, deterministic
classification, evidence commitments, certificates, challenges, reopen, and
offline verification. It does not define identity proofing, orchestration,
source truth, legal finality, or autonomous remediation.

## 2. Terminology

- **Outcome Contract (FOC):** immutable, versioned definition of the requested
  outcome and sufficient/contradictory evidence.
- **State-Source Contract (SSC):** field-, subject-, scope-, context-, and
  time-specific grant of evidentiary authority to a source.
- **AOE:** transport-neutral Authoritative Observation Envelope.
- **FSK:** deterministic Finality Semantic Kernel.
- **Current FINAL:** most recent non-superseded certificate classified FINAL.
- **Counterproof:** verifiable artifact explaining refusal of FINAL.
- **Cure Contract:** non-executing description of outstanding predicates.
- **Trust domain:** party or control boundary capable of correlated failure.
- **Independence root:** common upstream dependency used to prevent duplicate
  evidence from being counted as independent.

## 3. Threat model

Implementations MUST assume malicious actor self-report, stale yet correctly
signed evidence, source omission, contract substitution, certificate
substitution, replay, timestamp manipulation, dependency correlation, witness
equivocation, parser ambiguity, partial compromise, partitions, and reordered
observations. The core safety theorem assumes mandatory observations that are
authentic, correctly normalized, and issued by the SSC-authorized source. It
does not prove those assumptions true.

## 4. Finality Semantic Kernel

The normative classification function is:

```text
Evaluate(OutcomeContract, StateSourceContracts, Observations, Context)
  -> EvaluationResult
```

FSK MUST be deterministic. FSK MUST NOT call an LLM, vendor API, or UI. Vendor
logic and probabilistic inference MUST remain outside the trusted kernel. An
implementation MUST fail closed when a critical extension or required semantic
object is unknown.

## 5. Outcome Contract data model

An Outcome Contract MUST include protocol/version, immutable identifier,
namespace, outcome, subject, context, required authority, typed required
predicates, contradictions, reopen rules, temporal policy, finality rule, and
zero-tolerance STOP conditions. Changing the meaning of DONE MUST create a new
contract version and hash. Historical certificates MUST retain their original
contract hash.

## 6. FOCL language

FOCL core syntax is line-oriented:

```text
OUTCOME account-closure(account:account_982711) IN bank-us
REQUIRE
account.status == "CLOSED" FROM core-account
identity.access == "REVOKED" FROM identity-primary FOR 10m
CONTRADICT
IF ledger.pending == TRUE FROM core-ledger
REOPEN
IF ledger.new_posting == TRUE FROM core-ledger
```

The grammar MUST reject undefined operators and unscoped prose. A compiler MAY
propose predicates, but an authorized human/institution MUST approve the
contract before it can govern classification.

## 7. State-Source Contracts

An SSC MUST declare source identity, institution, system type, trust domain,
context, authoritative predicates, subject/scope, observation mechanism,
timestamp source, freshness, authentication, integrity, availability,
dependency root/upstreams, conflict priority, retention, privacy, status, and
validity interval. Authority attaches to:

```text
source + predicate + subject/scope + context + time
```

No whole database is implicitly authoritative for every field.

## 8. Authoritative observations

AOE MUST bind predicate, subject, typed value, source, trust domain, evidence
kind, observation/validity times, SSC, integrity, provenance, dependency
references, and disclosure class. REST, event bus, SQL, file, MCP, and signed
attestation transports MAY produce AOEs but MUST NOT alter their semantics.
Actor assertions and workflow completion events MUST NOT satisfy an
authoritative requirement unless an SSC explicitly grants the limited
predicate authority.

## 9. Evidence normalization

Mappings from source-native state to protocol predicate MUST be typed,
versioned, deterministic, signed or hash-bound, reviewable, and tested. AI MAY
propose a mapping. AI MUST NOT approve it or convert confidence into source
authority. A certificate MUST bind the mapping hash when normalization occurs.

## 10. Canonicalization and hashing

`FINALITY-CANONICAL-JSON-1` sorts ASCII object keys lexicographically, preserves
array order, encodes UTF-8 without insignificant whitespace, and requires
semantic numeric values to be integers or decimal strings. Undefined and
non-finite values are invalid. Hashes use SHA-256 in this profile. Signed
objects MUST identify their canonicalization and hash algorithms.

## 11. Outcome classification

Only these public states exist:

| State | Meaning |
| --- | --- |
| `OPEN` | No authoritative observations have been accepted. |
| `PENDING` | Required source, freshness, independence, or temporal condition is incomplete. |
| `FINAL` | Every contractually required predicate and quorum is satisfied and no mandatory contradiction exists. |
| `CONTRADICTED` | A mandatory/hard contradiction is present. |
| `CURE_REQUIRED` | Valid authoritative state explicitly fails a required predicate without a hard contradiction. |
| `FAILED` | Integrity, STOP, invalid-time, or undefined-semantic failure prevents evaluation. |
| `REOPENED` | A previously FINAL outcome is invalidated by a contract-defined later event. |
| `SUPERSEDED` | A later immutable artifact replaces this artifact as current. |

An implementation MUST NOT invent another public classification without a new
protocol version defining exact semantics.

## 12. State transitions

Allowed transitions are normative in `transitionRules` of the reference
kernel. A FINAL object MAY transition only to REOPENED or SUPERSEDED. History
MUST NOT be updated in place. A benign re-observation MAY support a successor
FINAL certificate; it does not mutate its predecessor. Invalid transitions
MUST fail lineage verification.

## 13. Safety and liveness

Safety property:

```text
mandatory contradiction present => classification != FINAL
mandatory required predicate false => classification != FINAL
mandatory source omitted => classification != FINAL
```

Liveness target: if every mandatory authoritative predicate eventually becomes
satisfied, remains valid for its temporal requirement, and the required
quorum/independence policy is available, an implementation SHOULD be capable of
reaching FINAL. A system that always refuses FINAL is safe but nonconforming.

## 14. Temporal semantics

Core temporal modes are `TRUE_NOW`, `ALWAYS_FOR(duration)`, and
`TRUE_BEFORE_DEADLINE(time)`. Profiles MAY add `EVENTUALLY`, `UNTIL`, or
irreversibility semantics as critical extensions. A timestamp's presence is
not proof of correct time. SSC timestamp source, observation time, validity
interval, freshness, evidence age, and consistency window MUST be evaluated
separately. A partition MUST produce PENDING rather than forced FINAL when a
mandatory source is unavailable.

## 15. Contradiction calculus

Contradictions are classified `HARD`, `SOFT`, `TEMPORAL`, `SOURCE`,
`DEPENDENCY`, `AUTHORITY`, `FRESHNESS`, `INTEGRITY`, or `POLICY`. Any mandatory
or HARD contradiction makes FINAL impossible. Soft contradiction behavior MUST
be explicitly defined by policy. Conflicts MUST preserve both observations and
the rule used to classify them.

## 16. Quorum and dependency semantics

Core policies are `ALL_REQUIRED`, `M_OF_N`, and `TRUST_DOMAIN_THRESHOLD`, with
optional mandatory sources. `M_OF_N` MUST count distinct buyer-approved
independence roots—not raw source, observation, connector or API counts. Three
APIs deriving from one database count as one independence root. Policies MAY
require multiple trust domains. Correlation assessment is a control signal,
not mathematical proof of independence.

## 17. Evidence DAG

The evidence DAG includes contract, SSCs, AOEs, mappings, dependency
assertions, policies, evaluation, and signatures. Leaf hash is
`SHA256("leaf:" || canonical(node))`; internal hash is
`SHA256("node:" || left || ":" || right)`. Leaf hashes are sorted before tree
construction; an odd terminal leaf is duplicated. Empty root is
`SHA256("finality:empty-merkle-root")`. Selective disclosure MUST include every
branch needed to verify the disclosed predicate and root.

## 18. Certificates

FOC v2 MUST bind protocol, contract hash, subject, requested outcome, SSC
hashes, observation commitments, evidence root, dependency graph root, temporal
evaluation, contradictions, classification, kernel version, predecessor,
supersession cause, reopen policy hash, issuance time, signatures, verification
material, and certificate hash. Verification MUST report separately:

1. certificate integrity;
2. authoritative evidence qualified under the supplied contract;
3. outcome classification supported by supplied evidence.

The phrase “cryptographically verified reality” MUST NOT be used.

## 19. Counterproof and Cure Contract

Non-FINAL classification SHOULD emit a Counterproof binding failed predicates,
contradictions, and observation commitments. A Cure Contract MAY enumerate
what remains false. It MUST state that it authorizes no autonomous remediation.
Only an authorized execution system may act on a separately approved mandate.

## 20. Supersession, REOPEN, and challenge

Every successor MUST reference its predecessor hash. REOPEN MUST retain the
historical FINAL certificate, triggering evidence, cause, time, and lineage.
An authorized party MAY submit an immutable challenge referencing the disputed
certificate and new evidence. Challenge resolution MUST issue an UPHELD
successor or REOPENED successor; it MUST NOT erase the challenge.

## 21. Witnesses and trust registries

A Witness may observe, make a predicate attestation, and sign. It MUST NOT
declare global FINAL unless the Outcome Contract grants that exact authority.
Federated policies MAY require independent attestations from buyer, payment,
supplier, or reviewer domains. FRP defines a registry interface but MUST NOT
require one global Finality registry; explicit trust lists, internal registries,
consortia, or government lists are permitted.

## 22. Privacy

Implementations SHOULD minimize fields and MAY use signed predicate
attestations, salted commitments, encrypted attachments, Merkle inclusion
proofs, and role-specific disclosure. Salt MUST remain available to an
authorized verifier when a commitment must be opened. This release defines no
zero-knowledge proof system and MUST NOT be described as implementing ZK.

## 23. Interoperability and transports

HTTP, event bus, CloudEvents, MCP, file exchange, and VC-compatible
representations are bindings, not semantics. Two organizations MUST be able to
exchange contracts, SSCs, AOEs, and certificates without Finality cloud. A
transport profile MUST preserve canonical semantic objects. Unknown critical
extensions MUST fail verification; unknown noncritical extensions MAY be
ignored but remain hash-bound.

## 24. Version negotiation and algorithm agility

Version is `major.minor`, plus optional named profile/extensions. Major changes
may break semantics. Minor changes MUST be backward compatible. Verifiers MUST
reject an unsupported major version. Algorithms are named in signed objects;
deprecation MUST preserve historical verification. Post-quantum algorithms MAY
be added through a versioned profile without burdening core v2 semantics.

## 25. Verification and error handling

Offline verification MUST validate schema/profile, canonicalization, hashes,
contract binding, SSC authority, AOE integrity/time, dependency-aware quorum,
contradictions, temporal rules, classification, and lineage. Errors MUST be
machine-readable and MUST NOT be converted into FINAL. A conforming verifier
MUST distinguish missing evidence, stale evidence, integrity failure,
unsupported critical extension, invalid transition, and classification
disagreement.

## 26. Conformance

Profiles are `FRP CORE`, `FRP CERTIFICATE`, `FRP WITNESS`, and `FRP FULL`.
Self-test output is not an externally granted conformance mark. A release MUST
STOP on disagreement between seller implementations over any golden vector.
Third-party conformance requires the published suite and an attributable result
under the governance process; none exists at this release.

## 27. Security considerations

Signature validity does not establish source authority, freshness, predicate
satisfaction, or truth. Implementations MUST prevent contract/certificate
substitution, cross-tenant source use, untrusted key selection, stale key use,
signature stripping, replay, noncanonical parser differences, and silent
fallback to telemetry. Resource limits SHOULD protect parsers and DAG traversal.
Human STOP and challenge are allowed; hidden rewrite of cryptographic history
is forbidden.

## 28. Reference vectors and implementation mapping

Normative requirements map to `tests/finality-semantic-kernel-v28.test.mjs`,
`protocol/conformance`, the Python verifier, WASM kernel self-test, and the
formal model. The reference account-closure vector is simulated and does not
contain institutional production data. Generated vectors are deterministic and
seed-bound; private attack-generation methods are outside this open surface.

## 29. Limitations

FRP cannot prove a compromised authoritative source is truthful, infer legal
acceptance, establish identity without external authority, or guarantee
physical state without a valid sensor/witness model. Model checking proves only
the checked abstraction under stated assumptions. Seller tests are not buyer or
independent proof. See `WHAT_FINALITY_DOES_NOT_PROVE.md`.

## 30. IANA and standards status

There are no IANA assignments. `finality://` is a Finality Group namespace in
this draft, not a registered standards-body scheme. W3C VC and SCITT documents
are compatibility profiles only. No standards body has approved FRP.

## 31. Frozen object version and legacy boundary

This release is `FRP-2.0.0-draft.1`; normative machine objects use the exact
`protocolVersion` value `2.0`. The release schemas, TypeScript kernel, Python
verifier and WASM verification path MUST reject other values. Generic `X.Y`
compatibility is not part of this frozen release.

`FRP-1.0.0` identifies a historical, superseded reference package retained for
reproducibility and lineage. It is not a current object version and MUST NOT be
accepted or presented as an FRP-2.0.0-draft.1 object.
