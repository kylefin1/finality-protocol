import { sealObservation, type AuthoritativeObservationEnvelope, type OutcomeContractV2, type StateSourceContract } from "./kernel.ts";

export const REFERENCE_TIME = "2026-08-29T12:00:00.000Z";

export const referenceContract: OutcomeContractV2 = {
  protocol: "finality-reality",
  protocolVersion: "2.0",
  contractType: "FinalityOutcomeContract",
  contractVersion: "1.0.0",
  contractId: "foc:account-closure:account_982711:v1",
  namespace: "finality://finance/account-closed/v1",
  outcome: { id: "account-closure", type: "ACCOUNT_CLOSURE", description: "Authoritative closure of a customer account", settlementPhase: "FINAL" },
  subject: { type: "account", id: "account_982711", scope: "servicing" },
  context: "reference-bank-us",
  authority: { required: ["account_owner_authorization", "servicing_policy"], externalReference: "reference:mandate:001" },
  requiredState: [
    { id: "status-closed", predicate: "account.status", operator: "EQUALS", expected: "CLOSED", mandatory: true, sourceContracts: ["core-account"], sourcePolicy: { mode: "ALL_REQUIRED", mandatorySources: ["core-account"] }, temporal: { mode: "TRUE_NOW" } },
    { id: "balance-zero", predicate: "ledger.balance", operator: "EQUALS", expected: "0", mandatory: true, sourceContracts: ["core-ledger"], sourcePolicy: { mode: "ALL_REQUIRED", mandatorySources: ["core-ledger"] }, temporal: { mode: "TRUE_NOW" } },
    { id: "recurring-disabled", predicate: "payments.recurring", operator: "EQUALS", expected: "DISABLED", mandatory: true, sourceContracts: ["payments-primary"], sourcePolicy: { mode: "ALL_REQUIRED", mandatorySources: ["payments-primary"] }, temporal: { mode: "TRUE_NOW" } },
    { id: "access-revoked", predicate: "identity.access", operator: "EQUALS", expected: "REVOKED", mandatory: true, sourceContracts: ["identity-primary"], sourcePolicy: { mode: "ALL_REQUIRED", mandatorySources: ["identity-primary"] }, temporal: { mode: "ALWAYS_FOR", durationMs: 600_000 } }
  ],
  contradictions: [
    { id: "pending-transaction", predicate: "ledger.pending", operator: "EQUALS", expected: true, sourceContracts: ["core-ledger"], class: "HARD", mandatory: true },
    { id: "restored-access", predicate: "identity.access", operator: "EQUALS", expected: "ACTIVE", sourceContracts: ["identity-primary"], class: "HARD", mandatory: true }
  ],
  reopenIf: [
    { id: "new-posting", predicate: "ledger.new_posting", operator: "EQUALS", expected: true, sourceContracts: ["core-ledger"], class: "HARD", mandatory: true },
    { id: "access-restored", predicate: "identity.access", operator: "EQUALS", expected: "ACTIVE", sourceContracts: ["identity-primary"], class: "HARD", mandatory: true }
  ],
  finality: { rule: "ALL_REQUIRED", minimumEvidenceAgeMs: 0, consistencyWindowMs: 600_000 },
  stopConditions: { falseFinal: 0, receiptVerificationFailure: 0, buyerStopBypass: 0 }
};

function source(sourceContractId: string, systemType: string, trustDomain: string, predicates: string[], independenceRoot: string): StateSourceContract {
  return {
    protocol: "finality-reality", protocolVersion: "2.0", sourceContractId, version: "1.0.0", institution: "SIMULATED REFERENCE BANK", systemType, trustDomain, context: referenceContract.context,
    authoritativeFor: predicates.map((predicate) => ({ predicate, subject: referenceContract.subject.id, scope: referenceContract.subject.scope })),
    observationMechanism: "REFERENCE_SIGNED_PREDICATE", timestampSource: "REFERENCE_SOURCE_CLOCK", freshness: { maximumAgeMs: 300_000, stale: "REJECT" }, authentication: { method: "REFERENCE" }, integrity: { hashAlgorithm: "sha-256", signatureRequired: false, allowedSignatureAlgorithms: ["Ed25519"] }, availability: "AVAILABLE", dependency: { independenceRoot, upstream: [independenceRoot] }, conflictPriority: 100, retention: "REFERENCE_ONLY", privacyClassification: "SIMULATED", status: "ACTIVE", validFrom: "2026-08-29T00:00:00.000Z"
  };
}

export const referenceSources: StateSourceContract[] = [
  source("core-account", "CORE_ACCOUNT", "BANK_ACCOUNT_DOMAIN", ["account.status"], "db:core-account-primary"),
  source("core-ledger", "LEDGER", "BANK_LEDGER_DOMAIN", ["ledger.balance", "ledger.pending", "ledger.new_posting"], "db:ledger-primary"),
  source("payments-primary", "PAYMENTS", "PAYMENT_DOMAIN", ["payments.recurring"], "db:payments-primary"),
  source("identity-primary", "IAM", "IDENTITY_DOMAIN", ["identity.access"], "db:identity-primary")
];

function observation(id: string, predicate: string, value: unknown, sourceContract: string, trustDomain: string, validFrom = "2026-08-29T11:40:00.000Z") {
  return sealObservation({
    envelopeType: "AuthoritativeObservationEnvelope", envelopeVersion: "1.0", observationId: id, predicate, subject: referenceContract.subject.id, value, source: sourceContract, trustDomain, evidenceKind: "AUTHORITATIVE", observedAt: "2026-08-29T11:59:00.000Z", validFrom, validUntil: "2026-08-29T13:00:00.000Z", sourceContract,
    provenance: { transport: "REFERENCE", collector: "SELLER_REFERENCE_FIXTURE" }, dependencyRefs: [], privacy: { disclosure: "PREDICATE_ONLY", classification: "SIMULATED" }
  });
}

export const referenceObservations: AuthoritativeObservationEnvelope[] = [
  observation("obs-status", "account.status", "CLOSED", "core-account", "BANK_ACCOUNT_DOMAIN"),
  observation("obs-balance", "ledger.balance", "0", "core-ledger", "BANK_LEDGER_DOMAIN"),
  observation("obs-recurring", "payments.recurring", "DISABLED", "payments-primary", "PAYMENT_DOMAIN"),
  observation("obs-access", "identity.access", "REVOKED", "identity-primary", "IDENTITY_DOMAIN")
];

export function reseal(observationToChange: AuthoritativeObservationEnvelope, changes: Partial<AuthoritativeObservationEnvelope>) {
  const merged = { ...observationToChange, ...changes, integrity: undefined };
  return sealObservation(merged);
}

export function referenceBundle(overrides: { observations?: AuthoritativeObservationEnvelope[]; sourceContracts?: StateSourceContract[]; evaluatedAt?: string; previousState?: "FINAL"; stopTriggered?: boolean; expectedClassification?: string } = {}) {
  return {
    artifactType: "FinalityIndependentVerificationBundle",
    protocolVersion: "2.0",
    contract: referenceContract,
    sourceContracts: overrides.sourceContracts || referenceSources,
    observations: overrides.observations || referenceObservations,
    evaluatedAt: overrides.evaluatedAt || REFERENCE_TIME,
    previousState: overrides.previousState,
    stopTriggered: overrides.stopTriggered || false,
    expectedClassification: overrides.expectedClassification || "FINAL"
  };
}
