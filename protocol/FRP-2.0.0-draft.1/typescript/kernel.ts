import { canonicalJson, sha256Hex } from "./canonical.ts";

export const FSK_VERSION = "FSK-1.0.0";
export const FRP_VERSION = "FRP-2.0.0-draft.1";
export const FRP_OBJECT_VERSION = "2.0";

export type OutcomeState =
  | "OPEN"
  | "PENDING"
  | "FINAL"
  | "CONTRADICTED"
  | "CURE_REQUIRED"
  | "FAILED"
  | "REOPENED"
  | "SUPERSEDED";

export type PredicateOperator = "EQUALS" | "NOT_EQUALS" | "GT" | "GTE" | "LT" | "LTE" | "IN" | "PRESENT";
export type ContradictionClass = "HARD" | "SOFT" | "TEMPORAL" | "SOURCE" | "DEPENDENCY" | "AUTHORITY" | "FRESHNESS" | "INTEGRITY" | "POLICY";
export type EvidenceKind = "AUTHORITATIVE" | "SUPPORTING" | "WORKFLOW" | "ACTOR_ASSERTION" | "DERIVED" | "EXTERNAL_WITNESS" | "TELEMETRY";

export type StateSourceContract = {
  protocol: "finality-reality";
  protocolVersion: string;
  sourceContractId: string;
  version: string;
  institution: string;
  systemType: string;
  trustDomain: string;
  context: string;
  authoritativeFor: Array<{ predicate: string; subject: string; scope: string }>;
  observationMechanism: string;
  timestampSource: string;
  freshness: { maximumAgeMs: number; stale: "REJECT" | "INDETERMINATE" };
  authentication: { method: string };
  integrity: { hashAlgorithm: "sha-256"; signatureRequired: boolean; allowedSignatureAlgorithms: string[] };
  availability: "AVAILABLE" | "DEGRADED" | "UNAVAILABLE";
  dependency: { independenceRoot: string; upstream: string[] };
  conflictPriority: number;
  retention: string;
  privacyClassification: string;
  status: "ACTIVE" | "REVOKED" | "SUPERSEDED";
  validFrom: string;
  validUntil?: string;
  extensions?: Record<string, unknown>;
};

export type ObservationIntegrity = {
  hashAlgorithm: "sha-256";
  contentHash: string;
  signatureAlgorithm?: string;
  signature?: string;
  keyId?: string;
};

export type AuthoritativeObservationEnvelope = {
  envelopeType: "AuthoritativeObservationEnvelope";
  envelopeVersion: "1.0";
  observationId: string;
  predicate: string;
  subject: string;
  value: unknown;
  source: string;
  trustDomain: string;
  evidenceKind: EvidenceKind;
  observedAt: string;
  validFrom: string;
  validUntil: string;
  sourceContract: string;
  integrity: ObservationIntegrity;
  provenance: { transport: string; collector: string; transformation?: string; mappingHash?: string };
  dependencyRefs: string[];
  privacy: { disclosure: "FULL" | "PREDICATE_ONLY" | "COMMITMENT_ONLY"; classification: string };
};

export type ContractPredicate = {
  id: string;
  predicate: string;
  operator: PredicateOperator;
  expected?: unknown;
  mandatory: boolean;
  sourceContracts: string[];
  sourcePolicy: {
    mode: "ALL_REQUIRED" | "M_OF_N" | "TRUST_DOMAIN_THRESHOLD";
    threshold?: number;
    mandatorySources?: string[];
    minimumTrustDomains?: number;
  };
  temporal: { mode: "TRUE_NOW" | "ALWAYS_FOR" | "TRUE_BEFORE_DEADLINE"; durationMs?: number; deadline?: string };
};

export type ContractContradiction = {
  id: string;
  predicate: string;
  operator: PredicateOperator;
  expected?: unknown;
  sourceContracts: string[];
  class: ContradictionClass;
  mandatory: boolean;
};

export type OutcomeContractV2 = {
  protocol: "finality-reality";
  protocolVersion: string;
  contractType: "FinalityOutcomeContract";
  contractVersion: string;
  contractId: string;
  namespace: string;
  outcome: { id: string; type: string; description: string; settlementPhase: "REQUESTED" | "ACCEPTED" | "EXECUTED" | "OBSERVED" | "PROPAGATED" | "SETTLED" | "DURABLE" | "FINAL" };
  subject: { type: string; id: string; scope: string };
  context: string;
  authority: { required: string[]; externalReference?: string };
  requiredState: ContractPredicate[];
  contradictions: ContractContradiction[];
  reopenIf: ContractContradiction[];
  finality: { rule: "ALL_REQUIRED" | "M_OF_N"; threshold?: number; minimumEvidenceAgeMs: number; consistencyWindowMs: number };
  stopConditions: { falseFinal: 0; receiptVerificationFailure: 0; buyerStopBypass: 0 };
  extensions?: Record<string, { critical: boolean; value: unknown }>;
};

export type PredicateEvaluation = {
  id: string;
  status: "SATISFIED" | "UNSATISFIED" | "MISSING" | "STALE" | "TEMPORAL_PENDING" | "INVALID";
  supportingObservationIds: string[];
  consideredSourceContracts: string[];
  independentRoots: string[];
  trustDomains: string[];
  reason: string;
};

export type EvaluationResult = {
  protocol: "finality-reality";
  kernelVersion: string;
  contractHash: string;
  evaluatedAt: string;
  classification: OutcomeState;
  predicateResults: PredicateEvaluation[];
  contradictions: Array<{ id: string; class: ContradictionClass; observationIds: string[] }>;
  reopenTriggers: Array<{ id: string; observationIds: string[] }>;
  invalidObservationIds: string[];
  omittedMandatorySources: string[];
  reasonCodes: string[];
  finalitySupported: boolean;
};

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function epoch(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function comparePredicate(actual: unknown, operator: PredicateOperator, expected?: unknown): boolean {
  if (operator === "PRESENT") return actual !== null && actual !== undefined;
  if (operator === "EQUALS") return canonicalJson(actual) === canonicalJson(expected);
  if (operator === "NOT_EQUALS") return canonicalJson(actual) !== canonicalJson(expected);
  if (operator === "IN") return Array.isArray(expected) && expected.some((value) => canonicalJson(value) === canonicalJson(actual));
  const left = numberValue(actual);
  const right = numberValue(expected);
  if (left === null || right === null) return false;
  if (operator === "GT") return left > right;
  if (operator === "GTE") return left >= right;
  if (operator === "LT") return left < right;
  return left <= right;
}

export function contractHash(contract: OutcomeContractV2): string {
  return sha256Hex(canonicalJson(contract));
}

export function validateOutcomeContract(contract: unknown, supportedCriticalExtensions: string[] = []) {
  const errors: string[] = [];
  if (!contract || typeof contract !== "object") return { valid: false, errors: ["CONTRACT_OBJECT_REQUIRED"] };
  const candidate = contract as Partial<OutcomeContractV2>;
  if (candidate.protocol !== "finality-reality") errors.push("PROTOCOL_INVALID");
  if (candidate.protocolVersion !== FRP_OBJECT_VERSION) errors.push("PROTOCOL_VERSION_UNSUPPORTED");
  if (candidate.contractType !== "FinalityOutcomeContract") errors.push("CONTRACT_TYPE_INVALID");
  if (!candidate.contractId || !candidate.namespace?.startsWith("finality://")) errors.push("IDENTITY_OR_NAMESPACE_INVALID");
  if (!candidate.subject?.id || !candidate.subject.scope || !candidate.context) errors.push("SUBJECT_SCOPE_CONTEXT_REQUIRED");
  if (!candidate.authority?.required?.length) errors.push("AUTHORITY_REQUIRED");
  if (!candidate.requiredState?.length) errors.push("REQUIRED_STATE_EMPTY");
  const ids = candidate.requiredState?.map((item) => item.id) || [];
  if (new Set(ids).size !== ids.length) errors.push("PREDICATE_ID_DUPLICATE");
  for (const item of candidate.requiredState || []) {
    if (!item.predicate || !item.sourceContracts?.length) errors.push(`PREDICATE_INVALID:${item.id}`);
    if (!item.sourcePolicy?.mode || !item.temporal?.mode) errors.push(`PREDICATE_POLICY_INVALID:${item.id}`);
  }
  if (!candidate.finality || !["ALL_REQUIRED", "M_OF_N"].includes(candidate.finality.rule)
    || !Number.isInteger(candidate.finality.minimumEvidenceAgeMs) || candidate.finality.minimumEvidenceAgeMs < 0
    || !Number.isInteger(candidate.finality.consistencyWindowMs) || candidate.finality.consistencyWindowMs < 0) errors.push("FINALITY_POLICY_INVALID");
  if (candidate.finality?.rule === "M_OF_N" && (!Number.isInteger(candidate.finality.threshold) || (candidate.finality.threshold || 0) < 1 || (candidate.finality.threshold || 0) > (candidate.requiredState?.length || 0))) errors.push("FINALITY_THRESHOLD_INVALID");
  if (candidate.stopConditions?.falseFinal !== 0 || candidate.stopConditions?.receiptVerificationFailure !== 0 || candidate.stopConditions?.buyerStopBypass !== 0) errors.push("STOP_CONDITIONS_MUST_BE_ZERO");
  for (const [name, extension] of Object.entries(candidate.extensions || {})) if (extension.critical && !supportedCriticalExtensions.includes(name)) errors.push(`UNSUPPORTED_CRITICAL_EXTENSION:${name}`);
  return { valid: errors.length === 0, errors };
}

export function validateStateSourceContract(source: unknown) {
  const errors: string[] = [];
  if (!source || typeof source !== "object") return { valid: false, errors: ["SOURCE_CONTRACT_OBJECT_REQUIRED"] };
  const candidate = source as Partial<StateSourceContract>;
  if (candidate.protocol !== "finality-reality" || candidate.protocolVersion !== FRP_OBJECT_VERSION || !candidate.sourceContractId) errors.push("SOURCE_IDENTITY_INVALID");
  if (!candidate.trustDomain || !candidate.context || !candidate.authoritativeFor?.length) errors.push("SOURCE_AUTHORITY_SCOPE_REQUIRED");
  if (!candidate.dependency?.independenceRoot) errors.push("INDEPENDENCE_ROOT_REQUIRED");
  if (!Number.isInteger(candidate.freshness?.maximumAgeMs) || (candidate.freshness?.maximumAgeMs ?? -1) < 0) errors.push("FRESHNESS_INVALID");
  if (candidate.integrity?.hashAlgorithm !== "sha-256") errors.push("HASH_ALGORITHM_UNSUPPORTED");
  if (!candidate.validFrom || epoch(candidate.validFrom) === null) errors.push("VALID_FROM_INVALID");
  return { valid: errors.length === 0, errors };
}

export function sourceContractHash(source: StateSourceContract): string {
  return sha256Hex(canonicalJson(source));
}

export function observationBody(observation: AuthoritativeObservationEnvelope) {
  const integrity: Record<string, string> = { hashAlgorithm: observation.integrity.hashAlgorithm };
  if (observation.integrity.signatureAlgorithm) integrity.signatureAlgorithm = observation.integrity.signatureAlgorithm;
  if (observation.integrity.keyId) integrity.keyId = observation.integrity.keyId;
  return {
    ...observation,
    integrity,
  };
}

export function observationHash(observation: AuthoritativeObservationEnvelope): string {
  return sha256Hex(canonicalJson(observationBody(observation)));
}

export function sealObservation(observation: Omit<AuthoritativeObservationEnvelope, "integrity"> & { integrity?: Partial<ObservationIntegrity> }): AuthoritativeObservationEnvelope {
  const draft = {
    ...observation,
    integrity: {
      hashAlgorithm: "sha-256" as const,
      contentHash: "",
      signatureAlgorithm: observation.integrity?.signatureAlgorithm,
      signature: observation.integrity?.signature,
      keyId: observation.integrity?.keyId,
    },
  };
  return { ...draft, integrity: { ...draft.integrity, contentHash: observationHash(draft) } };
}

function sourceAuthorizes(source: StateSourceContract, contract: OutcomeContractV2, predicate: string, at: number): boolean {
  const from = epoch(source.validFrom);
  const until = source.validUntil ? epoch(source.validUntil) : null;
  if (source.status !== "ACTIVE" || source.availability !== "AVAILABLE" || from === null || from > at || (until !== null && until < at)) return false;
  if (source.context !== contract.context) return false;
  return source.authoritativeFor.some((entry) =>
    entry.predicate === predicate
    && (entry.subject === "*" || entry.subject === contract.subject.id)
    && (entry.scope === "*" || entry.scope === contract.subject.scope));
}

function observationValidity(observation: AuthoritativeObservationEnvelope, source: StateSourceContract, contract: OutcomeContractV2, at: number, verifiedSignatures: ReadonlySet<string> = new Set()) {
  if (observation.evidenceKind !== "AUTHORITATIVE" && observation.evidenceKind !== "EXTERNAL_WITNESS") return { valid: false, reason: "NON_AUTHORITATIVE_KIND" };
  if (observation.subject !== contract.subject.id || observation.sourceContract !== source.sourceContractId || observation.source !== source.sourceContractId) return { valid: false, reason: "SOURCE_OR_SUBJECT_MISMATCH" };
  if (observation.trustDomain !== source.trustDomain) return { valid: false, reason: "TRUST_DOMAIN_MISMATCH" };
  if (observation.integrity.hashAlgorithm !== "sha-256" || !SHA256_PATTERN.test(observation.integrity.contentHash) || observationHash(observation) !== observation.integrity.contentHash) return { valid: false, reason: "INTEGRITY_FAILURE" };
  const observed = epoch(observation.observedAt);
  const from = epoch(observation.validFrom);
  const until = epoch(observation.validUntil);
  if (observed === null || from === null || until === null || from > at || until < at || observed > at) return { valid: false, reason: "INVALID_TIME_INTERVAL" };
  if (at - observed > source.freshness.maximumAgeMs) return { valid: false, reason: "STALE" };
  if (source.integrity.signatureRequired) {
    if (!observation.integrity.signature || !observation.integrity.signatureAlgorithm || !observation.integrity.keyId) return { valid: false, reason: "SIGNATURE_REQUIRED" };
    if (!source.integrity.allowedSignatureAlgorithms.includes(observation.integrity.signatureAlgorithm)) return { valid: false, reason: "SIGNATURE_ALGORITHM_NOT_ALLOWED" };
    if (!verifiedSignatures.has(observation.observationId)) return { valid: false, reason: "SIGNATURE_CRYPTOGRAPHIC_VERIFICATION_REQUIRED" };
  }
  return { valid: true, reason: "VALID" };
}

function temporalSatisfied(requirement: ContractPredicate, observation: AuthoritativeObservationEnvelope, at: number, minimumEvidenceAgeMs: number) {
  const observed = epoch(observation.observedAt);
  if (observed === null || at - observed < minimumEvidenceAgeMs) return false;
  if (requirement.temporal.mode === "TRUE_NOW") return true;
  if (requirement.temporal.mode === "TRUE_BEFORE_DEADLINE") {
    const deadline = requirement.temporal.deadline ? epoch(requirement.temporal.deadline) : null;
    return deadline !== null && observed !== null && observed <= deadline;
  }
  const from = epoch(observation.validFrom);
  return from !== null && at - from >= (requirement.temporal.durationMs || 0);
}

function merklePair(left: string, right: string) {
  return sha256Hex(`node:${left}:${right}`);
}

export function merkleRoot(values: unknown[]): string {
  if (!values.length) return sha256Hex("finality:empty-merkle-root");
  let level = values.map((value) => sha256Hex(`leaf:${canonicalJson(value)}`)).sort();
  while (level.length > 1) {
    const next: string[] = [];
    for (let index = 0; index < level.length; index += 2) next.push(merklePair(level[index], level[index + 1] || level[index]));
    level = next;
  }
  return level[0];
}

function evaluateRequirement(requirement: ContractPredicate, contract: OutcomeContractV2, sources: Map<string, StateSourceContract>, observations: AuthoritativeObservationEnvelope[], at: number, verifiedSignatures: ReadonlySet<string>): PredicateEvaluation {
  const configured = requirement.sourceContracts.map((id) => sources.get(id)).filter((source): source is StateSourceContract => Boolean(source));
  const authorized = configured.filter((source) => sourceAuthorizes(source, contract, requirement.predicate, at));
  const relevant = observations.filter((observation) => observation.predicate === requirement.predicate && requirement.sourceContracts.includes(observation.sourceContract));
  const valid = relevant.flatMap((observation) => {
    const source = sources.get(observation.sourceContract);
    if (!source || !sourceAuthorizes(source, contract, requirement.predicate, at)) return [];
    const validity = observationValidity(observation, source, contract, at, verifiedSignatures);
    return validity.valid ? [{ observation, source }] : [];
  });
  const satisfying = valid.filter(({ observation }) => comparePredicate(observation.value, requirement.operator, requirement.expected) && temporalSatisfied(requirement, observation, at, contract.finality.minimumEvidenceAgeMs));
  const temporalOnly = valid.filter(({ observation }) => comparePredicate(observation.value, requirement.operator, requirement.expected));
  const roots = [...new Set(satisfying.map(({ source }) => source.dependency.independenceRoot))];
  const domains = [...new Set(satisfying.map(({ source }) => source.trustDomain))];
  const sourceIds = new Set(satisfying.map(({ source }) => source.sourceContractId));
  const mandatory = requirement.sourcePolicy.mandatorySources || [];
  const mandatorySatisfied = mandatory.every((id) => sourceIds.has(id));
  let quorumSatisfied = false;
  if (requirement.sourcePolicy.mode === "ALL_REQUIRED") quorumSatisfied = authorized.length === requirement.sourceContracts.length && authorized.every((source) => sourceIds.has(source.sourceContractId));
  if (requirement.sourcePolicy.mode === "M_OF_N") quorumSatisfied = roots.length >= (requirement.sourcePolicy.threshold || requirement.sourceContracts.length);
  if (requirement.sourcePolicy.mode === "TRUST_DOMAIN_THRESHOLD") quorumSatisfied = domains.length >= (requirement.sourcePolicy.minimumTrustDomains || requirement.sourcePolicy.threshold || 1);
  quorumSatisfied = quorumSatisfied && mandatorySatisfied;
  const base = {
    id: requirement.id,
    supportingObservationIds: satisfying.map(({ observation }) => observation.observationId).sort(),
    consideredSourceContracts: authorized.map((source) => source.sourceContractId).sort(),
    independentRoots: roots.sort(),
    trustDomains: domains.sort(),
  };
  if (authorized.length !== requirement.sourceContracts.length) return { ...base, status: "INVALID", reason: "SOURCE_CONTRACT_MISSING_REVOKED_OR_NOT_FIELD_AUTHORIZED" };
  if (!relevant.length) return { ...base, status: "MISSING", reason: "NO_AUTHORITATIVE_OBSERVATION" };
  const invalid = relevant.some((observation) => {
    const source = sources.get(observation.sourceContract);
    return !source || !observationValidity(observation, source, contract, at, verifiedSignatures).valid;
  });
  if (!valid.length && invalid) return { ...base, status: "STALE", reason: "NO_VALID_FRESH_OBSERVATION" };
  const explicitFalse = valid.some(({ observation }) => !comparePredicate(observation.value, requirement.operator, requirement.expected));
  if (explicitFalse) return { ...base, status: "UNSATISFIED", reason: "AUTHORITATIVE_VALUE_DOES_NOT_SATISFY_PREDICATE" };
  if (temporalOnly.length && !satisfying.length) return { ...base, status: "TEMPORAL_PENDING", reason: "DURABILITY_OR_DEADLINE_NOT_SATISFIED" };
  if (!quorumSatisfied) return { ...base, status: "MISSING", reason: "DEPENDENCY_AWARE_QUORUM_NOT_SATISFIED" };
  return { ...base, status: "SATISFIED", reason: "AUTHORIZED_FRESH_INDEPENDENT_QUORUM_SATISFIED" };
}

function findTriggers(rules: ContractContradiction[], contract: OutcomeContractV2, sources: Map<string, StateSourceContract>, observations: AuthoritativeObservationEnvelope[], at: number, verifiedSignatures: ReadonlySet<string>) {
  return rules.flatMap((rule) => {
    const matching = observations.filter((observation) => {
      const source = sources.get(observation.sourceContract);
      return rule.predicate === observation.predicate
        && rule.sourceContracts.includes(observation.sourceContract)
        && Boolean(source)
        && sourceAuthorizes(source!, contract, rule.predicate, at)
        && observationValidity(observation, source!, contract, at, verifiedSignatures).valid
        && comparePredicate(observation.value, rule.operator, rule.expected);
    });
    return matching.length ? [{ id: rule.id, class: rule.class, mandatory: rule.mandatory, observationIds: matching.map((item) => item.observationId).sort() }] : [];
  });
}

export function evaluateOutcome(contract: OutcomeContractV2, sourceContracts: StateSourceContract[], observations: AuthoritativeObservationEnvelope[], context: { evaluatedAt: string; previousState?: OutcomeState; stopTriggered?: boolean; verifiedObservationSignatures?: string[] } ): EvaluationResult {
  const at = epoch(context.evaluatedAt);
  const verifiedSignatures = new Set(context.verifiedObservationSignatures || []);
  const validation = validateOutcomeContract(contract);
  const contractIdentity = { protocol: "finality-reality" as const, kernelVersion: FSK_VERSION, contractHash: contractHash(contract), evaluatedAt: context.evaluatedAt };
  if (!validation.valid) return { ...contractIdentity, classification: "FAILED", predicateResults: [], contradictions: [], reopenTriggers: [], invalidObservationIds: observations.map((item) => item.observationId).sort(), omittedMandatorySources: [], reasonCodes: validation.errors.map((error) => `CONTRACT_INVALID:${error}`), finalitySupported: false };
  const sources = new Map(sourceContracts.filter((source) => validateStateSourceContract(source).valid).map((source) => [source.sourceContractId, source]));
  const allRequiredSources = [...new Set(contract.requiredState.flatMap((item) => item.sourceContracts))];
  const omittedMandatorySources = allRequiredSources.filter((id) => !sources.has(id));
  const invalidObservationIds = observations.filter((observation) => {
    const source = sources.get(observation.sourceContract);
    return !source || at === null || !observationValidity(observation, source, contract, at, verifiedSignatures).valid;
  }).map((item) => item.observationId).sort();
  const base = {
    ...contractIdentity,
    invalidObservationIds,
    omittedMandatorySources,
  };
  if (at === null || context.stopTriggered) return { ...base, classification: "FAILED", predicateResults: [], contradictions: [], reopenTriggers: [], reasonCodes: [at === null ? "INVALID_EVALUATION_TIME" : "STOP_CONDITION_TRIGGERED"], finalitySupported: false };
  const predicateResults = contract.requiredState.map((item) => evaluateRequirement(item, contract, sources, observations, at, verifiedSignatures));
  const contradictions = findTriggers(contract.contradictions, contract, sources, observations, at, verifiedSignatures);
  const reopenTriggers = findTriggers(contract.reopenIf, contract, sources, observations, at, verifiedSignatures);
  const hardContradiction = contradictions.some((item) => item.mandatory || item.class === "HARD");
  const integrityFailure = invalidObservationIds.some((id) => observations.some((observation) => observation.observationId === id && observation.integrity.contentHash && observationHash(observation) !== observation.integrity.contentHash));
  const mandatoryResults = predicateResults.filter((_, index) => contract.requiredState[index].mandatory);
  const satisfiedCount = predicateResults.filter((item) => item.status === "SATISFIED").length;
  const finalityQuorumSatisfied = contract.finality.rule === "ALL_REQUIRED"
    ? predicateResults.every((item) => item.status === "SATISFIED")
    : satisfiedCount >= (contract.finality.threshold || contract.requiredState.length) && mandatoryResults.every((item) => item.status === "SATISFIED");
  const supportingIds = new Set(predicateResults.flatMap((item) => item.supportingObservationIds));
  const supportingTimes = observations.filter((item) => supportingIds.has(item.observationId)).map((item) => epoch(item.observedAt)).filter((item): item is number => item !== null);
  const consistencyWindowSatisfied = supportingTimes.length === 0 || Math.max(...supportingTimes) - Math.min(...supportingTimes) <= contract.finality.consistencyWindowMs;
  let classification: OutcomeState;
  const reasonCodes: string[] = [];
  if (integrityFailure) {
    classification = "FAILED";
    reasonCodes.push("OBSERVATION_INTEGRITY_FAILURE");
  } else if (context.previousState === "FINAL" && reopenTriggers.length) {
    classification = "REOPENED";
    reasonCodes.push("AUTHORITATIVE_REOPEN_TRIGGER");
  } else if (hardContradiction) {
    classification = "CONTRADICTED";
    reasonCodes.push("MANDATORY_CONTRADICTION_PRESENT");
  } else if (!observations.length) {
    classification = "OPEN";
    reasonCodes.push("NO_OBSERVATIONS");
  } else if (omittedMandatorySources.length || mandatoryResults.some((item) => ["MISSING", "STALE", "TEMPORAL_PENDING", "INVALID"].includes(item.status))) {
    classification = "PENDING";
    reasonCodes.push(omittedMandatorySources.length ? "MANDATORY_SOURCE_OMITTED" : "EVIDENCE_OR_TEMPORAL_QUORUM_PENDING");
  } else if (mandatoryResults.some((item) => item.status === "UNSATISFIED")) {
    classification = "CURE_REQUIRED";
    reasonCodes.push("MANDATORY_PREDICATE_UNSATISFIED");
  } else if (finalityQuorumSatisfied && consistencyWindowSatisfied) {
    classification = "FINAL";
    reasonCodes.push(contract.finality.rule === "ALL_REQUIRED" ? "ALL_REQUIRED_PREDICATES_SATISFIED" : "CONTRACT_FINALITY_QUORUM_SATISFIED");
  } else if (!consistencyWindowSatisfied) {
    classification = "PENDING";
    reasonCodes.push("CONSISTENCY_WINDOW_NOT_SATISFIED");
  } else {
    classification = "FAILED";
    reasonCodes.push("UNDEFINED_STATE_PREVENTED");
  }
  return {
    ...base,
    classification,
    predicateResults,
    contradictions: contradictions.map((item) => ({ id: item.id, class: item.class, observationIds: item.observationIds })),
    reopenTriggers: reopenTriggers.map((item) => ({ id: item.id, observationIds: item.observationIds })),
    reasonCodes,
    finalitySupported: classification === "FINAL",
  };
}

export const transitionRules: Record<OutcomeState, OutcomeState[]> = {
  OPEN: ["PENDING", "CURE_REQUIRED", "FAILED", "CONTRADICTED", "SUPERSEDED"],
  PENDING: ["FINAL", "CURE_REQUIRED", "FAILED", "CONTRADICTED", "SUPERSEDED"],
  FINAL: ["REOPENED", "SUPERSEDED"],
  CONTRADICTED: ["CURE_REQUIRED", "PENDING", "FAILED", "SUPERSEDED"],
  CURE_REQUIRED: ["PENDING", "FINAL", "FAILED", "CONTRADICTED", "SUPERSEDED"],
  FAILED: ["SUPERSEDED"],
  REOPENED: ["PENDING", "FINAL", "CURE_REQUIRED", "FAILED", "CONTRADICTED", "SUPERSEDED"],
  SUPERSEDED: [],
};

export function transitionAllowed(from: OutcomeState, to: OutcomeState) {
  return from === to || transitionRules[from].includes(to);
}

export type FinalityCertificateV2 = {
  protocol: "finality-reality";
  protocolVersion: string;
  certificateType: "FinalityOutcomeCertificateV2";
  certificateId: string;
  outcomeContractHash: string;
  subject: OutcomeContractV2["subject"];
  requestedOutcome: OutcomeContractV2["outcome"];
  sourceContractHashes: Record<string, string>;
  observationCommitments: Record<string, string>;
  evidenceRoot: string;
  dependencyGraphRoot: string;
  temporalEvaluation: { evaluatedAt: string; consistencyWindowMs: number; minimumEvidenceAgeMs: number };
  contradictions: EvaluationResult["contradictions"];
  classification: OutcomeState;
  kernelVersion: string;
  previousCertificate: string | null;
  supersessionReason: string | null;
  reopenPolicyHash: string;
  issuedAt: string;
  signatures: Array<{ algorithm: string; keyId: string; signature: string }>;
  verificationMaterial: { canonicalization: "FINALITY-CANONICAL-JSON-1"; hashAlgorithm: "sha-256"; evidenceDisclosure: "FULL" | "SELECTIVE" };
  certificateHash: string;
};

export function certificateBody(certificate: FinalityCertificateV2) {
  return Object.fromEntries(Object.entries(certificate).filter(([key]) => key !== "certificateHash" && key !== "signatures"));
}

export function issueCertificate(contract: OutcomeContractV2, sources: StateSourceContract[], observations: AuthoritativeObservationEnvelope[], result: EvaluationResult, options: { issuedAt: string; previousCertificate?: string; supersessionReason?: string; evidenceDisclosure?: "FULL" | "SELECTIVE" }): FinalityCertificateV2 {
  const sourceContractHashes = Object.fromEntries(sources.map((source) => [source.sourceContractId, sourceContractHash(source)]).sort(([a], [b]) => a.localeCompare(b)));
  const observationCommitments = Object.fromEntries(observations.map((observation) => [observation.observationId, observationHash(observation)]).sort(([a], [b]) => a.localeCompare(b)));
  const evidenceNodes = [contract, ...sources, ...observations, result];
  const dependencyNodes = sources.map((source) => ({ source: source.sourceContractId, root: source.dependency.independenceRoot, upstream: [...source.dependency.upstream].sort() }));
  const draft = {
    protocol: "finality-reality" as const,
    protocolVersion: contract.protocolVersion,
    certificateType: "FinalityOutcomeCertificateV2" as const,
    certificateId: `foc:${sha256Hex(`${result.contractHash}:${contract.subject.id}:${options.issuedAt}:${options.previousCertificate || "genesis"}`)}`,
    outcomeContractHash: result.contractHash,
    subject: contract.subject,
    requestedOutcome: contract.outcome,
    sourceContractHashes,
    observationCommitments,
    evidenceRoot: merkleRoot(evidenceNodes),
    dependencyGraphRoot: merkleRoot(dependencyNodes),
    temporalEvaluation: { evaluatedAt: result.evaluatedAt, consistencyWindowMs: contract.finality.consistencyWindowMs, minimumEvidenceAgeMs: contract.finality.minimumEvidenceAgeMs },
    contradictions: result.contradictions,
    classification: result.classification,
    kernelVersion: result.kernelVersion,
    previousCertificate: options.previousCertificate || null,
    supersessionReason: options.supersessionReason || null,
    reopenPolicyHash: sha256Hex(canonicalJson(contract.reopenIf)),
    issuedAt: options.issuedAt,
    signatures: [],
    verificationMaterial: { canonicalization: "FINALITY-CANONICAL-JSON-1" as const, hashAlgorithm: "sha-256" as const, evidenceDisclosure: options.evidenceDisclosure || "FULL" as const },
  };
  const hashable = Object.fromEntries(Object.entries(draft).filter(([key]) => key !== "signatures"));
  return { ...draft, certificateHash: sha256Hex(canonicalJson(hashable)) };
}

export function verifyCertificate(certificate: FinalityCertificateV2, contract: OutcomeContractV2, sources: StateSourceContract[], observations: AuthoritativeObservationEnvelope[], signatureVerifier?: (signature: FinalityCertificateV2["signatures"][number], certificateHash: string) => boolean) {
  const result = evaluateOutcome(contract, sources, observations, { evaluatedAt: certificate.temporalEvaluation.evaluatedAt, previousState: certificate.classification === "REOPENED" ? "FINAL" : undefined });
  const expected = issueCertificate(contract, sources, observations, result, { issuedAt: certificate.issuedAt, previousCertificate: certificate.previousCertificate || undefined, supersessionReason: certificate.supersessionReason || undefined, evidenceDisclosure: certificate.verificationMaterial.evidenceDisclosure });
  const hashableCertificate = certificateBody(certificate);
  const certificateSignaturesVerified = certificate.signatures.length === 0
    ? null
    : Boolean(signatureVerifier) && certificate.signatures.every((item) => signatureVerifier!(item, certificate.certificateHash));
  const checks = {
    protocol: certificate.protocol === "finality-reality" && certificate.protocolVersion === FRP_OBJECT_VERSION && contract.protocolVersion === FRP_OBJECT_VERSION && certificate.kernelVersion === FSK_VERSION,
    certificateHash: sha256Hex(canonicalJson(hashableCertificate)) === certificate.certificateHash,
    contractHash: certificate.outcomeContractHash === contractHash(contract),
    sourceContracts: canonicalJson(certificate.sourceContractHashes) === canonicalJson(expected.sourceContractHashes),
    evidenceRoot: certificate.evidenceRoot === expected.evidenceRoot,
    dependencyRules: certificate.dependencyGraphRoot === expected.dependencyGraphRoot,
    temporalConditions: result.predicateResults.every((item) => item.status === "SATISFIED") || result.classification !== "FINAL",
    classification: certificate.classification === result.classification,
    signatureIntegrity: certificateSignaturesVerified !== false,
  };
  return {
    checks,
    certificateIntegrityVerified: checks.certificateHash && checks.contractHash && checks.evidenceRoot,
    certificateSignatureIntegrity: certificateSignaturesVerified === null ? "NOT_PROVIDED" : certificateSignaturesVerified ? "VERIFIED" : "NOT_VERIFIED",
    authoritativeEvidence: Object.values(checks).every(Boolean) ? "QUALIFIED_UNDER_CONTRACT" : "NOT_QUALIFIED",
    outcomeClassification: result.classification,
    supportedByProvidedEvidence: Object.values(checks).every(Boolean),
  } as const;
}

export function buildCounterproof(contract: OutcomeContractV2, result: EvaluationResult, observations: AuthoritativeObservationEnvelope[]) {
  const body = {
    protocol: "finality-reality",
    artifactType: "FinalityCounterproof",
    contractHash: result.contractHash,
    requestedOutcome: contract.outcome,
    subject: contract.subject,
    classification: result.classification,
    failedPredicates: result.predicateResults.filter((item) => item.status !== "SATISFIED"),
    contradictions: result.contradictions,
    observationCommitments: Object.fromEntries(observations.map((item) => [item.observationId, observationHash(item)])),
    issuedAt: result.evaluatedAt,
  };
  return { ...body, counterproofHash: sha256Hex(canonicalJson(body)) };
}

export function buildCureContract(contract: OutcomeContractV2, result: EvaluationResult) {
  const outstanding = result.predicateResults.filter((item) => item.status !== "SATISFIED").map((item) => {
    const requirement = contract.requiredState.find((candidate) => candidate.id === item.id)!;
    return { predicateId: item.id, predicate: requirement.predicate, requiredOperator: requirement.operator, requiredValue: requirement.expected, currentStatus: item.status, authorizedExecution: false };
  });
  const body = { protocol: "finality-reality", artifactType: "FinalityCureContract", sourceContractHash: result.contractHash, subject: contract.subject, outstanding, executionPolicy: "IDENTIFICATION_ONLY_NO_AUTONOMOUS_REMEDIATION", issuedAt: result.evaluatedAt };
  return { ...body, cureContractHash: sha256Hex(canonicalJson(body)) };
}

export function verifyLineage(certificates: FinalityCertificateV2[]) {
  const failures: string[] = [];
  certificates.forEach((certificate, index) => {
    if (index === 0 && certificate.previousCertificate) failures.push(`${certificate.certificateId}:GENESIS_HAS_PREDECESSOR`);
    if (index > 0 && certificate.previousCertificate !== certificates[index - 1].certificateHash) failures.push(`${certificate.certificateId}:PREDECESSOR_MISMATCH`);
    if (index > 0 && !transitionAllowed(certificates[index - 1].classification, certificate.classification)) failures.push(`${certificate.certificateId}:INVALID_TRANSITION`);
  });
  return { valid: failures.length === 0, failures, lineageRoot: merkleRoot(certificates.map((certificate) => certificate.certificateHash)), current: certificates.at(-1)?.classification || null };
}
