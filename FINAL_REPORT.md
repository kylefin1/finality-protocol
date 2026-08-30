# Zero-dollar external proof infrastructure — build report

Frozen protocol identity remains `FRP-2.0.0-draft.1` with semantic kernel
`FSK-1.0.0`. No FRP, FSK, or seller evidence class was added.

| Deliverable | Build status | Execution/evidence boundary |
| --- | --- | --- |
| Public protocol package | PASS | 56 frozen artifacts; `reproduce.sh` PASS |
| Break Finality challenge | PASS | 44/44 seller-controlled public cases; false FINAL observed: 0 |
| Independent implementation challenge | PASS | Rules, schemas, conformance result, report, signing, and submission path |
| GitHub CI | PASS | Definitions pass actionlint; hosted run not yet observed |
| CodeQL | PASS | Pinned v4 default + security-extended workflow; Security result not yet observed |
| OpenSSF Scorecard | PASS | Pinned workflow; supply-chain hygiene only; result not yet observed |
| ClusterFuzzLite | PASS | PR, scheduled batch, coverage, Python fuzz target; hosted run not yet observed |
| Formal model | PASS | Frozen TLA+ plus bounded companion: 2,374 states / 5,804 transitions / 0 failures |
| Provenance | PASS | Pinned SLSA generic generator workflow; attestation not yet created |
| Sigstore signing | PASS | Report commands and keyless release workflow; no external report signed |
| Zenodo metadata | PASS | `CITATION.cff`, `.zenodo.json`, deposit procedure; DOI count 0 |
| Report templates | PASS | Neutral implementation and falsification reports |
| Private-core boundary | PASS | Automated path/secret scan; private implementations remain excluded |

## Exact seller-controlled verification

- TypeScript vectors: 32/32
- Python vectors: 32/32
- Cross-verifier classification disagreements: 0
- Frozen artifact hashes: 56/56
- Public adversarial harness: 44/44
- Observed false FINAL: 0 within the disclosed seller-controlled suite
- Tooling unit tests: 7/7
- Public schemas parsed/audited: 14
- Model failures: 0 under the model's disclosed assumptions
- Institutional source/key approval: not established by the package

## External state

- Independent compatible implementations: 0
- Signed outside falsification records: 0
- Buyer-authored executed cases: 0
- Production platform dependencies: 0
- DOI deposits: 0

## Remaining non-seller evidence events

The repository is technically ready for an outside fork, implementation,
attack, signed report, and immutable deposit. Those events remain zero until a
real outside party acts and the fail-closed importer/reproduction process
accepts the evidence.

Public GitHub publication also requires repository-owner selection and the
rights decision in `LICENSE-REVIEW.md`; the build does not silently grant IP
rights. Hosted GitHub Action, Security tab, provenance, Sigstore, and Zenodo
outputs are not claimed before their respective services execute them.
