# Integrate a Finality certificate

This account-free quickstart tests one bounded interoperability property: an outside program can verify the frozen public artifact, inspect its outcome classification, and react differently to FINAL and REOPENED. It is not a production integration, customer claim, or external evidence until an outside repository publishes an attributable result.

Canonical publication: external-proof-v2.0.0-draft.1-pub.2  
Protocol: FRP-2.0.0-draft.1  
Kernel: FSK-1.0.0

## 1. Verify the published FINAL sample

```bash
git clone https://github.com/kylefin1/finality-protocol.git
cd finality-protocol
node --experimental-strip-types protocol/FRP-2.0.0-draft.1/typescript/cli.mts verify protocol/FRP-2.0.0-draft.1/conformance/reference-bundle.json
```

Expected classification: FINAL. The verifier also checks protocol identity, contract hash, required sources, evidence integrity, certificate hash, and the provided signature state.

## 2. Consume the classification

An integration must fail closed:

```ts
type Classification = "OPEN" | "PENDING" | "FINAL" | "CONTRADICTED" | "CURE_REQUIRED" | "FAILED" | "REOPENED" | "SUPERSEDED";

export function applyFinality(state: Classification) {
  if (state === "FINAL") return { localControl: "ALLOW_BOUNDED_NEXT_STEP" };
  if (state === "REOPENED" || state === "SUPERSEDED") return { localControl: "REVOKE_OR_RECONCILE" };
  return { localControl: "HOLD" };
}
```

The consuming system retains authority over its own control. Finality does not execute money, law, access, or production actions.

## 3. Exercise changed reality

```bash
node --experimental-strip-types protocol/FRP-2.0.0-draft.1/conformance/run-conformance.mts
```

For lineage integration, retain the prior certificate, accept only a valid successor, verify its predecessor reference, and route REOPENED or SUPERSEDED to REVOKE_OR_RECONCILE. Never overwrite the earlier certificate.

## 4. What counts as external evidence

Publish in an outside-controlled repository:

- exact repository commit and CI URL;
- tested FRP, FSK, and publication revision;
- build instructions and artifact hashes;
- handling for both FINAL and REOPENED/SUPERSEDED;
- reused Finality code, discrepancies, and limitations;
- an evidence submission using evidence/README.md.

This can count as an **external test integration** after reproduction. It does not count as a production platform dependency without real operational reliance.
