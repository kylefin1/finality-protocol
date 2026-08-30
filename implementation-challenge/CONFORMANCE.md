# Conformance requirements

The implementation must accept the frozen contract, SSCs, observations,
verified-signature IDs, evaluation time, previous certificate, and stop signal
defined by each vector. It must emit at least the terminal classification and
the disclosed safety-relevant reason fields.

Required checks:

- all 32 vectors executed;
- terminal classification disagreement count is zero for a full reproduction;
- canonical contract and certificate material use the specified serialization;
- missing mandatory sources fail closed;
- dependency-root correlation is respected;
- temporal and freshness rules are respected;
- STOP is not presentation-overridable;
- REOPEN preserves predecessor lineage;
- unsupported protocol/kernel material is rejected or handled only by an
  explicitly published compatible profile.

Output must validate against
`schemas/conformance-result.schema.json`. A full pass establishes compatibility
with the disclosed vectors—not universal correctness or production adoption.
