# Portable outcome semantics for consequential autonomous action

## Abstract

Execution acknowledgments are weak evidence of consequential completion across
heterogeneous enterprise systems. Finality Reality Protocol separates an
approved definition of outcome from the actor attempting it, binds field-level
source authority, applies deterministic temporal and contradiction semantics,
and emits portable certificates or counterproofs. The reference implementation
is falsifiable offline and deliberately distinguishes cryptographic integrity
from source truth.

## Model

Let `C` be an Outcome Contract, `S` the approved SSC set, `E` accepted AOEs, and
`t` the evaluation context. The deterministic kernel computes
`Q = Evaluate(C,S,E,t)`. FINAL requires every mandatory predicate to satisfy its
source, dependency, trust-domain, freshness, and temporal policy, with no hard
contradiction or STOP. An evidence Merkle DAG binds the derivation. Later
contract-defined contradictory evidence produces a successor REOPENED object.

## Safety theorem target

Assuming mandatory source observations are authentic, fresh under their SSCs,
and correctly normalized, a false mandatory predicate or mandatory
contradiction cannot produce FINAL. This is semantic safety, not proof that the
source itself is truthful.

## Evaluation

The frozen seller-controlled suite includes 32 full cross-implementation golden
vectors, 4,096 deterministic metamorphic/adversarial combinations, a bounded
formal companion check, parser/hash/certificate mutation tests, and a 90-byte
WASM terminal kernel. Exact results belong in the release manifest generated at
freeze time. No independent institution has reproduced these results yet.

## Comparison with a boolean

A boolean can report a result but cannot by itself preserve the pre-approved
meaning of completion, field-specific authority, temporal durability,
dependency-aware independence, contradiction precedence, portable evidence
derivation, challenge, or immutable supersession lineage. FRP exposes those
distributed-systems obligations while keeping vendor adapters outside the core.

## Limitations and research path

Open problems include compromised authoritative sources, physical-world witness
quality, richer temporal logics, independently governed trust registries,
machine-checked refinement, privacy proofs, and multiple genuinely independent
implementations. External criticism and falsification are required before any
mature protocol or standardization claim.
