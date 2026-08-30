# Finality external-proof repository

This repository makes the frozen `FRP-2.0.0-draft.1` / `FSK-1.0.0`
verification surface independently inspectable, implementable, and attackable
without Finality credentials, Finality cloud services, or founder assistance.
It adds no protocol semantics and makes no new seller claim.

## Start here

```bash
make reproduce
make test
```

The commands verify the frozen release, run both disclosed verifier
implementations, run the bounded formal companion, exercise the public attack
harness, validate schemas, enforce the open/private boundary, and reconstruct
the external-evidence scoreboard from admissible records.

| Package | Purpose |
| --- | --- |
| [`protocol/FRP-2.0.0-draft.1`](protocol/FRP-2.0.0-draft.1/) | Frozen specification, schemas, semantic kernel, verifiers, formal model, and conformance vectors |
| [`break-finality`](break-finality/) | Neutral falsification rules, attack harness, and signed report format |
| [`implementation-challenge`](implementation-challenge/) | Clean-room implementation rules, conformance requirements, and report format |
| [`evidence`](evidence/) | Fail-closed submission format, importer, records, and zero-dollar scoreboard |

## Frozen identity

- Protocol: `FRP-2.0.0-draft.1`
- Semantic kernel: `FSK-1.0.0`
- Frozen open release: `FRP-2.0.0-draft.1-20260829`
- Canonical semantic source commit: `acf223f0ac5142ec98046ab09521e1054c7e7b45`
- Frozen archive SHA-256: `c46ebc911b907eee08cc3667273415022fd0e3026a9de83c13653d479837cf7c`
- Production canonical release-manifest SHA-256: `0ca1344c62c6d054424e77882b0851449ef5bfa46cca5e27c377729f08ee076a`
- Frozen package manifest-body SHA-256: `c133c950332e47a54eb542180dcd64fc1dd7c1b2068538f8eaad8491097c37b4`

The nested protocol directory is copied byte-for-byte from the production
download. The outer repository's tooling does not rewrite it.

## Evidence boundary

Everything shipped here is `SPECIFIED`, `IMPLEMENTED`, or
`SELLER_TESTED`, as identified by the frozen artifacts. Independent compatible
implementations, signed outside falsification records, buyer-authored executed
cases, and production platform dependencies remain zero until attributable
external evidence is ingested and reproduced.

Supply-chain automation (CodeQL, Scorecard, fuzzing, provenance, and signing)
is hygiene and traceability infrastructure. It is not independent protocol
assurance.

## Public versus private

The public repository deliberately contains semantics, schemas, conformance
vectors, verifiers, a challenge harness, and reference examples. It excludes
the proprietary Reality Graph, Authority Graph, source-dependency
implementation, source discovery, normalization intelligence, private attack
corpus, customer mappings, private adapters, and network intelligence. Run
`make boundary` to enforce the checked path and secret rules.

## External paths

- Implement independently: [`implementation-challenge/README.md`](implementation-challenge/README.md)
- Attempt to falsify: [`break-finality/README.md`](break-finality/README.md)
- Submit evidence: [`evidence/README.md`](evidence/README.md)
- Report a vulnerability: [`SECURITY.md`](SECURITY.md)
- Cite the frozen work: [`CITATION.cff`](CITATION.cff)

## Rights notice

The entire repository is licensed under the Apache License, Version 2.0; see
[`LICENSE`](LICENSE). Contributions use DCO 1.1; see [`DCO.md`](DCO.md).
Finality names, logos, product names, and conformance marks are reserved; see
[`TRADEMARKS.md`](TRADEMARKS.md). The public/private boundary remains controlling:
the Apache license applies only to the Work actually published here.
