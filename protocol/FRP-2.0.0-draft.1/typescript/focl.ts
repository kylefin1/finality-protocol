import type { ContractContradiction, ContractPredicate, OutcomeContractV2, PredicateOperator } from "./kernel.ts";

export const FOCL_VERSION = "FOCL-1.0.0";

export type FoclParseResult = {
  contract: OutcomeContractV2 | null;
  errors: Array<{ line: number; code: string; message: string }>;
  ambiguities: Array<{ line: number; phrase: string; question: string }>;
};

const OPERATORS: Record<string, PredicateOperator> = {
  "==": "EQUALS",
  "!=": "NOT_EQUALS",
  ">": "GT",
  ">=": "GTE",
  "<": "LT",
  "<=": "LTE",
  IN: "IN",
  PRESENT: "PRESENT",
};

function parseDuration(value: string): number | null {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(value);
  if (!match) return null;
  const scale = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as "ms" | "s" | "m" | "h" | "d"];
  return Number(match[1]) * scale;
}

function parseLiteral(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "TRUE") return true;
  if (trimmed === "FALSE") return false;
  if (trimmed === "NULL") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed.includes(".") ? trimmed : Number(trimmed);
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) return JSON.parse(trimmed);
  return trimmed;
}

function parseRule(line: string, id: string, mandatory = true): ContractPredicate | null {
  const match = /^([a-zA-Z][\w.-]*)\s+(==|!=|>=|<=|>|<|IN|PRESENT)(?:\s+(.+?))?\s+FROM\s+([\w.-]+)(?:\s+FOR\s+(\d+(?:ms|s|m|h|d)))?$/.exec(line);
  if (!match) return null;
  const duration = match[5] ? parseDuration(match[5]) : null;
  return {
    id,
    predicate: match[1],
    operator: OPERATORS[match[2]],
    expected: match[2] === "PRESENT" ? undefined : parseLiteral(match[3] || ""),
    mandatory,
    sourceContracts: [match[4]],
    sourcePolicy: { mode: "ALL_REQUIRED", mandatorySources: [match[4]] },
    temporal: duration === null ? { mode: "TRUE_NOW" } : { mode: "ALWAYS_FOR", durationMs: duration },
  };
}

function asContradiction(rule: ContractPredicate, classification: ContractContradiction["class"]): ContractContradiction {
  return { id: rule.id, predicate: rule.predicate, operator: rule.operator, expected: rule.expected, sourceContracts: rule.sourceContracts, class: classification, mandatory: true };
}

/**
 * Deterministic FOCL core grammar. It deliberately rejects prose and requires
 * an institution to approve the resulting contract before use.
 */
export function parseFocl(input: string): FoclParseResult {
  const errors: FoclParseResult["errors"] = [];
  const ambiguities: FoclParseResult["ambiguities"] = [];
  const lines = input.split(/\r?\n/).map((text, index) => ({ text: text.trim(), line: index + 1 })).filter((item) => item.text && !item.text.startsWith("#"));
  const header = /^OUTCOME\s+([a-zA-Z][\w.-]*)\(([a-zA-Z][\w.-]*):([^\s)]+)\)\s+IN\s+([^\s]+)$/.exec(lines[0]?.text || "");
  if (!header) errors.push({ line: lines[0]?.line || 1, code: "FOCL_HEADER_REQUIRED", message: "Expected OUTCOME name(type:id) IN context" });
  const required: ContractPredicate[] = [];
  const contradictions: ContractContradiction[] = [];
  const reopenIf: ContractContradiction[] = [];
  let section: "REQUIRE" | "CONTRADICT" | "REOPEN" | null = null;
  let sequence = 0;
  for (const item of lines.slice(1)) {
    if (item.text === "REQUIRE" || item.text === "CONTRADICT" || item.text === "REOPEN") { section = item.text; continue; }
    if (!section) { errors.push({ line: item.line, code: "FOCL_SECTION_REQUIRED", message: "Rule must follow REQUIRE, CONTRADICT or REOPEN" }); continue; }
    sequence += 1;
    const rule = parseRule(item.text.replace(/^IF\s+/, ""), `${section.toLowerCase()}-${sequence}`);
    if (!rule) { errors.push({ line: item.line, code: "FOCL_RULE_INVALID", message: "Rule does not match the deterministic FOCL grammar" }); continue; }
    if (section === "REQUIRE") required.push(rule);
    if (section === "CONTRADICT") contradictions.push(asContradiction(rule, "HARD"));
    if (section === "REOPEN") reopenIf.push(asContradiction(rule, "HARD"));
  }
  const ambiguousPhrases = ["fully", "appropriate", "complete", "correct", "all systems", "as soon as possible"];
  for (const item of lines) for (const phrase of ambiguousPhrases) if (item.text.toLowerCase().includes(phrase)) ambiguities.push({ line: item.line, phrase, question: `Replace “${phrase}” with typed predicates and named State-Source Contracts.` });
  if (!required.length) errors.push({ line: 1, code: "FOCL_REQUIREMENT_REQUIRED", message: "At least one required predicate is mandatory" });
  if (!header || errors.length) return { contract: null, errors, ambiguities };
  const [, outcomeId, subjectType, subjectId, context] = header;
  const contract: OutcomeContractV2 = {
    protocol: "finality-reality",
    protocolVersion: "2.0",
    contractType: "FinalityOutcomeContract",
    contractVersion: "1.0.0",
    contractId: `focl:${outcomeId}:${subjectId}:v1`,
    namespace: `finality://custom/${outcomeId}/v1`,
    outcome: { id: outcomeId, type: outcomeId.toUpperCase().replaceAll("-", "_"), description: `Institution-approved ${outcomeId} outcome`, settlementPhase: "FINAL" },
    subject: { type: subjectType, id: subjectId, scope: "*" },
    context,
    authority: { required: ["institutional_contract_approval"] },
    requiredState: required,
    contradictions,
    reopenIf,
    finality: { rule: "ALL_REQUIRED", minimumEvidenceAgeMs: 0, consistencyWindowMs: Math.max(0, ...required.map((item) => item.temporal.durationMs || 0)) },
    stopConditions: { falseFinal: 0, receiptVerificationFailure: 0, buyerStopBypass: 0 },
  };
  return { contract, errors, ambiguities };
}

export function renderFocl(contract: OutcomeContractV2): string {
  const literal = (value: unknown) => typeof value === "string" ? JSON.stringify(value) : JSON.stringify(value);
  const operator = (value: PredicateOperator) => Object.entries(OPERATORS).find(([, mapped]) => mapped === value)?.[0] || value;
  const duration = (ms?: number) => !ms ? "" : ms % 3_600_000 === 0 ? ` FOR ${ms / 3_600_000}h` : ms % 60_000 === 0 ? ` FOR ${ms / 60_000}m` : ms % 1000 === 0 ? ` FOR ${ms / 1000}s` : ` FOR ${ms}ms`;
  const rule = (item: ContractPredicate | ContractContradiction) => `${item.predicate} ${operator(item.operator)}${item.operator === "PRESENT" ? "" : ` ${literal(item.expected)}`} FROM ${item.sourceContracts[0]}${"temporal" in item ? duration(item.temporal.durationMs) : ""}`;
  return [
    `OUTCOME ${contract.outcome.id}(${contract.subject.type}:${contract.subject.id}) IN ${contract.context}`,
    "",
    "REQUIRE",
    ...contract.requiredState.map(rule),
    "",
    "CONTRADICT",
    ...contract.contradictions.map((item) => `IF ${rule(item)}`),
    "",
    "REOPEN",
    ...contract.reopenIf.map((item) => `IF ${rule(item)}`),
  ].join("\n");
}
