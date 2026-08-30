# Zero-dollar license and IP decision packet

This is a decision record, not legal advice. The binding grant is the separate
Apache-2.0 `LICENSE` file.

## Decision recorded — 2026-08-30

Kyle Hughes selected Apache-2.0 for the entire public repository, DCO 1.1 for
contributions, and reserved Finality trademarks and conformance marks. Public
release of the sanitized repository was explicitly authorized.

## Why a decision is required

A public GitHub repository without a license remains under default copyright. That can permit inspection but generally does not give outsiders the legal permission needed to reproduce, modify, distribute, or independently implement the work. Finality's stated goal of independent implementation therefore requires an intentional rights posture.

## Separate the rights questions

1. **Reference software / verifier / harness / tooling.** Choose a standard software license only after reviewing patent implications and the desired contribution model.
2. **Normative protocol specification, schemas, and vectors.** Choose a specification/documentation license or other implementation-rights framework that actually permits the intended independent implementation.
3. **Patents.** Determine what has already been publicly disclosed, what remains undisclosed, whether any filing deadlines are running, and what patent grants/commitments a chosen license would create.
4. **Trade secrets.** Keep the proprietary Reality Graph, Authority Graph, source-discovery/normalization intelligence, private attack corpus, adapters, institutional mappings, and network intelligence outside the public repository.
5. **Trademarks/conformance.** Publication of source/specification need not grant rights in Finality names, logos, or future conformance marks.
6. **Contributions.** Decide whether contributions require a DCO, CLA, or another explicit contribution policy.

## Common options to discuss with counsel

For software, commonly evaluated standard options include Apache-2.0, MIT, and BSD-3-Clause. Apache-2.0 contains an express patent license; that can be desirable for interoperability but is a substantive rights decision.

For specifications/documentation, commonly evaluated options include Community Specification License 1.0 and Creative Commons licenses, depending on whether the objective is implementation rights, documentation reuse, or both. Patent commitments and specification-development terms must be reviewed before use.

Do not invent a custom license merely to avoid making these decisions.

## Counsel questions

- What was the earliest public disclosure date for each potentially patentable Finality mechanism?
- What U.S. and foreign filing consequences arise from those disclosures?
- Which undisclosed mechanisms should remain trade secret or be filed before further disclosure?
- Which patent rights would each candidate software/specification license grant?
- Which license combination best permits clean-room interoperable implementations while preserving the proprietary operational core?
- What contribution terms protect the provenance/ownership chain without making participation impractical?
- What trademark/conformance policy should accompany an open interoperability protocol?
