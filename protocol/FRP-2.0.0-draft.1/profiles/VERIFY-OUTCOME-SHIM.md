# `verifyOutcome()` compatibility shim

Platforms may preserve a familiar method while adopting FRP semantics:

```ts
async function verifyOutcome(input) {
  const bundle = mapPlatformInputToApprovedFrpBundle(input);
  return finalityVerifier.verify(bundle);
}
```

The mapping MUST reference an already approved Outcome Contract and SSCs. It
MUST NOT synthesize authority from platform completion flags. This shim lowers
adoption cost; it does not collapse FRP into a boolean. Callers receive the
classification, evidence qualification, counterproof/cure, and certificate
lineage rather than only `true` or `false`.
