# Challenge rules

## Target

Frozen release `FRP-2.0.0-draft.1-20260829`, protocol
`FRP-2.0.0-draft.1`, kernel `FSK-1.0.0`.

## Valid findings

- a `FINAL` classification despite a mandatory disclosed contradiction;
- silent omission of a mandatory source;
- acceptance of substituted contract, evidence, certificate, or manifest;
- contractual STOP bypass;
- verifier disagreement on an in-scope input;
- REOPEN or supersession lineage mutation;
- accepted stale, unsigned-required, or incompatible-version evidence contrary
  to the published rules.

## Required method

Use an exact commit and immutable artifacts. Preserve raw inputs and outputs.
Separate modeled assumptions from claims about real-world source correctness.
Disclose any reused Finality code. Describe unsuccessful attacks. Do not include
protected data or exploit third-party systems.

## Result vocabulary

`FALSE_FINAL_OBSERVED`, `STOP_BYPASS_OBSERVED`, `VERIFIER_DISCREPANCY`,
`OTHER_SECURITY_FINDING`, or `NO_LISTED_FAILURE_OBSERVED_WITHIN_SCOPE`.
The last value is not proof of universal correctness.

## Independence

Repository ownership, contributor identity, methods, and assistance must be
disclosed. An account or fork alone does not establish independence.
