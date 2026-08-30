# Finality Reality Protocol — open verification surface

Release candidate: `FRP-2.0.0-draft.1`  
Semantic kernel: `FSK-1.0.0`  
Evidence class: `E3_SELLER_CONTROLLED`

This package lets a skeptical reviewer reconstruct disclosed Finality
classifications without Finality credentials, Finality cloud services, or
founder interpretation. It does not disclose the proprietary source-discovery,
normalization intelligence, deployment fabric, accumulated attack corpus, or
institutional operating control plane.

## Ten-minute path

Requires Node.js 22+ and Python 3.11+; both implementations use only their
standard runtimes.

```bash
./reproduce.sh
```

The one-command run verifies the release manifest and every disclosed artifact,
executes both canonical verifier implementations over the frozen vectors, runs
the bounded formal companion, and rebuilds the WASM terminal core in a temporary
directory. Individual commands, from the extracted package root, are:

```bash
node --experimental-strip-types typescript/cli.mts verify conformance/reference-bundle.json
node --experimental-strip-types conformance/run-conformance.mts conformance/golden-vectors.json
python3 python/finality_verify.py conformance conformance/golden-vectors.json
python3 formal/model_check.py
```

The self-contained verifier proves deterministic consistency under the supplied
contract and SSCs. It does not establish that those SSCs were institutionally
approved. Signature-required observations fail closed unless a separate
cryptographic layer supplies their verified observation IDs. Certificate hash
integrity is reported separately from certificate-signature verification.

## What is open

- normative protocol specification;
- FOCL core grammar and Outcome Contract schema;
- State-Source Contract and Authoritative Observation Envelope schemas;
- TypeScript semantic kernel and verifier;
- standard-library Python verifier;
- certificate v2, counterproof, cure, challenge, and lineage semantics;
- bounded conformance vectors and deterministic vector generator;
- TLA+ safety model plus executable bounded companion check;
- tiny WASM terminal-classification kernel;
- interoperability profiles and reference adapters.

The disclosed conformance corpus is 32 vectors. The 4,096-case seller
metamorphic result is reported as seller-controlled evidence; its private runner
is not part of this archive.

## Claim boundary

Everything in the frozen package is a Finality Group specification or
seller-controlled implementation/test artifact. No outside organization has
yet authored a compatible implementation, signed an external validation
receipt, run a buyer-hidden test, deployed the protocol in production, or made
its product depend on these semantics. The package exists to make those next
steps easier and falsifiable.
