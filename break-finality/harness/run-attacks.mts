import fs from "node:fs";
import {
  evaluateOutcome,
  issueCertificate,
  sealObservation,
  transitionAllowed,
  verifyLineage,
  type AuthoritativeObservationEnvelope,
  type OutcomeContractV2,
  type StateSourceContract,
} from "../../protocol/FRP-2.0.0-draft.1/typescript/kernel.ts";
import {
  REFERENCE_TIME,
  referenceContract,
  referenceObservations,
  referenceSources,
  reseal,
} from "../../protocol/FRP-2.0.0-draft.1/typescript/fixtures.ts";

type CaseResult = { id: string; expected: string; actual: string; pass: boolean; safety: string };
const cases: CaseResult[] = [];

function record(id: string, expected: string, actual: string, safety: string) {
  cases.push({ id, expected, actual, pass: expected === actual, safety });
}

const vectors = JSON.parse(fs.readFileSync(new URL("../../protocol/FRP-2.0.0-draft.1/conformance/golden-vectors.json", import.meta.url), "utf8"));
for (const vector of vectors.vectors) {
  const bundle = vector.bundle;
  const result = evaluateOutcome(bundle.contract, bundle.sourceContracts, bundle.observations, {
    evaluatedAt: bundle.evaluatedAt,
    previousState: bundle.previousState,
    stopTriggered: bundle.stopTriggered,
    verifiedObservationSignatures: bundle.verifiedObservationSignatures,
  });
  record(vector.id, vector.expectedClassification, result.classification, "GOLDEN_VECTOR");
}

const baseline = evaluateOutcome(referenceContract, referenceSources, referenceObservations, { evaluatedAt: REFERENCE_TIME });
record("ATTACK-BASELINE", "FINAL", baseline.classification, "CONTROL");

const pendingLedger = referenceObservations.find((item) => item.sourceContract === "core-ledger")!;
const contradiction = sealObservation({
  ...pendingLedger,
  observationId: "attack-ledger-pending",
  predicate: "ledger.pending",
  value: true,
  integrity: undefined,
});
const contradicted = evaluateOutcome(referenceContract, referenceSources, [...referenceObservations, contradiction], { evaluatedAt: REFERENCE_TIME });
record("ATTACK-FALSE-FINAL-CONTRADICTION", "CONTRADICTED", contradicted.classification, "FALSE_FINAL");

const mutated = structuredClone(referenceObservations[0]);
mutated.value = "OPEN";
const mutation = evaluateOutcome(referenceContract, referenceSources, [mutated, ...referenceObservations.slice(1)], { evaluatedAt: REFERENCE_TIME });
record("ATTACK-EVIDENCE-MUTATION", "FAILED", mutation.classification, "INTEGRITY");

const stopped = evaluateOutcome(referenceContract, referenceSources, referenceObservations, { evaluatedAt: REFERENCE_TIME, stopTriggered: true });
record("ATTACK-STOP-BYPASS", "FAILED", stopped.classification, "STOP");

const wrongVersion = structuredClone(referenceContract) as OutcomeContractV2;
wrongVersion.protocolVersion = "1.0";
const incompatible = evaluateOutcome(wrongVersion, referenceSources, referenceObservations, { evaluatedAt: REFERENCE_TIME });
record("ATTACK-PROTOCOL-MISMATCH", "FAILED", incompatible.classification, "VERSION");

const stale = referenceObservations.map((item) => reseal(item, {
  observedAt: "2026-08-29T00:00:00.000Z",
  validFrom: "2026-08-29T00:00:00.000Z",
  validUntil: "2026-08-29T13:00:00.000Z",
}));
const staleResult = evaluateOutcome(referenceContract, referenceSources, stale, { evaluatedAt: REFERENCE_TIME });
record("ATTACK-STALE-EVIDENCE", "PENDING", staleResult.classification, "TEMPORAL");

const correlatedContract = structuredClone(referenceContract);
correlatedContract.requiredState[0].sourceContracts = ["core-account", "core-account-copy"];
correlatedContract.requiredState[0].sourcePolicy = { mode: "M_OF_N", threshold: 2 };
const correlatedSource = { ...structuredClone(referenceSources[0]), sourceContractId: "core-account-copy" };
const correlatedObservation = sealObservation({
  ...structuredClone(referenceObservations[0]),
  observationId: "attack-correlated-copy",
  source: "core-account-copy",
  sourceContract: "core-account-copy",
  integrity: undefined,
});
const correlated = evaluateOutcome(
  correlatedContract,
  [...referenceSources, correlatedSource],
  [...referenceObservations, correlatedObservation],
  { evaluatedAt: REFERENCE_TIME },
);
record("ATTACK-CORRELATED-SOURCES", "PENDING", correlated.classification, "DEPENDENCY_INDEPENDENCE");

const signatureSources = structuredClone(referenceSources) as StateSourceContract[];
signatureSources[0].integrity.signatureRequired = true;
const signatureObservation = reseal(referenceObservations[0], {
  integrity: { hashAlgorithm: "sha-256", contentHash: "", signatureAlgorithm: "Ed25519", signature: "REFERENCE-NOT-CRYPTOGRAPHICALLY-VERIFIED", keyId: "reference-key" },
});
const unsignedRequired = evaluateOutcome(referenceContract, signatureSources, [signatureObservation, ...referenceObservations.slice(1)], { evaluatedAt: REFERENCE_TIME });
record("ATTACK-UNVERIFIED-SIGNATURE", "PENDING", unsignedRequired.classification, "SIGNATURE");

const reopenObservation = sealObservation({
  ...structuredClone(pendingLedger),
  observationId: "attack-new-posting",
  predicate: "ledger.new_posting",
  value: true,
  integrity: undefined,
});
const reopened = evaluateOutcome(referenceContract, referenceSources, [...referenceObservations, reopenObservation], { evaluatedAt: REFERENCE_TIME, previousState: "FINAL" });
record("ATTACK-REOPEN", "REOPENED", reopened.classification, "LINEAGE");

const genesis = issueCertificate(referenceContract, referenceSources, referenceObservations, baseline, { issuedAt: "2026-08-29T12:00:01.000Z" });
const successor = issueCertificate(referenceContract, referenceSources, [...referenceObservations, reopenObservation], reopened, {
  issuedAt: "2026-08-29T12:00:02.000Z",
  previousCertificate: genesis.certificateHash,
  supersessionReason: "AUTHORITATIVE_REOPEN_TRIGGER",
});
const lineage = verifyLineage([genesis, successor]);
record("ATTACK-LINEAGE", "true", String(lineage.valid), "LINEAGE");
record("ATTACK-TRANSITION-FINAL-REOPENED", "true", String(transitionAllowed("FINAL", "REOPENED")), "STATE_MACHINE");
record("ATTACK-TRANSITION-FINAL-OPEN", "false", String(transitionAllowed("FINAL", "OPEN")), "STATE_MACHINE");

const failed = cases.filter((item) => !item.pass);
const falseFinal = cases.filter((item) => item.actual === "FINAL" && item.expected !== "FINAL");
const report = {
  reportType: "SELLER_CONTROLLED_PUBLIC_ATTACK_HARNESS",
  release: "FRP-2.0.0-draft.1-20260829",
  protocol: "FRP-2.0.0-draft.1",
  kernel: "FSK-1.0.0",
  casesExecuted: cases.length,
  casesPassed: cases.length - failed.length,
  observedFalseFinal: falseFinal.length,
  discrepancies: failed,
  scope: "32 frozen public vectors plus disclosed mutation, STOP, version, temporal, correlation, signature, REOPEN, and lineage attacks",
  claimBoundary: "SELLER_CONTROLLED; not independent assurance and not a universal safety claim",
};
console.log(JSON.stringify(report, null, 2));
if (failed.length || falseFinal.length) process.exitCode = 1;
