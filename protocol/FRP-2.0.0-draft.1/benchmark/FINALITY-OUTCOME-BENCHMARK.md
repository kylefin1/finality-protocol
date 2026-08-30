# Finality Outcome Benchmark v2

Primary release metric: **false FINAL count**. A controlled benchmark claiming
PASS requires exactly zero false FINAL observations under its frozen assumptions.

## Public families

Partial execution, premature completion, stale confirmation, downstream
failure, reversal, state divergence, expired authority, correlated evidence,
source unavailable, invalid evidence, duplicate execution, reordered events,
clock skew, partition, Byzantine witness, contract/evidence/certificate
mutation, and REOPEN/supersession failure.

## Measures

- false FINAL and false contradiction;
- true contradiction;
- detection latency;
- certificate and history reconstruction;
- receipt verification;
- REOPEN correctness;
- cross-domain kernel changes.

The public reproduction package contains 32 complete golden vectors and their
deterministic generator. The separate seller-controlled release gate exercises
a 4,096-case metamorphic family; that runner is not disclosed in this package
and its reported result remains seller evidence. The larger proprietary
attack-generation corpus is also excluded. Seller results do not become
external benchmark evidence until a reviewer executes an agreed disclosed
corpus and signs an attributable record.
