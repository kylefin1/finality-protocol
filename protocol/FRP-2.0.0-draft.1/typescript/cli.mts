#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FRP_OBJECT_VERSION, FSK_VERSION, contractHash, evaluateOutcome, validateOutcomeContract, verifyCertificate, verifyLineage, type FinalityCertificateV2, type OutcomeContractV2, type StateSourceContract, type AuthoritativeObservationEnvelope } from "./kernel.ts";

const [command, inputPath] = process.argv.slice(2);

function read(path: string) { return JSON.parse(readFileSync(resolve(path), "utf8")); }
function pass(label: string, value: boolean) { console.log(`${label.padEnd(28)} ${value ? "PASS" : "FAIL"}`); }

if (!command || !inputPath) {
  console.error("usage: finality verify|evaluate|contract-hash|history-verify <file.json>");
  process.exit(64);
}

if (command === "contract-hash") {
  console.log(contractHash(read(inputPath) as OutcomeContractV2));
  process.exit(0);
}

if (command === "contract-validate") {
  const result = validateOutcomeContract(read(inputPath));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}

if (command === "history-verify") {
  const history = read(inputPath) as FinalityCertificateV2[];
  const result = verifyLineage(history);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}

const bundle = read(inputPath) as { contract: OutcomeContractV2; sourceContracts: StateSourceContract[]; observations: AuthoritativeObservationEnvelope[]; evaluatedAt: string; previousState?: "FINAL"; stopTriggered?: boolean; expectedClassification?: string; certificate?: FinalityCertificateV2 };
const result = evaluateOutcome(bundle.contract, bundle.sourceContracts, bundle.observations, { evaluatedAt: bundle.evaluatedAt, previousState: bundle.previousState, stopTriggered: bundle.stopTriggered });
if (command === "evaluate") {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
if (command !== "verify") {
  console.error(`unknown command: ${command}`);
  process.exit(64);
}

const checks: Record<string, boolean> = {
  protocol: bundle.contract.protocol === "finality-reality" && bundle.contract.protocolVersion === FRP_OBJECT_VERSION && result.kernelVersion === FSK_VERSION,
  contract: result.contractHash === contractHash(bundle.contract),
  sourceRequirements: result.omittedMandatorySources.length === 0,
  evidenceIntegrity: result.invalidObservationIds.length === 0,
  classification: !bundle.expectedClassification || bundle.expectedClassification === result.classification,
};
if (bundle.certificate) Object.assign(checks, verifyCertificate(bundle.certificate, bundle.contract, bundle.sourceContracts, bundle.observations).checks);
console.log("FINALITY REALITY PROTOCOL");
console.log("Independent verifier result");
for (const [label, value] of Object.entries(checks)) pass(label.toUpperCase(), value);
console.log(`\nCLASSIFICATION:\n${result.classification}`);
console.log(`Certificate integrity:\n${bundle.certificate ? (checks.certificateHash ? "VERIFIED" : "NOT VERIFIED") : "NOT PROVIDED"}`);
console.log(`Certificate signatures:\n${bundle.certificate ? (bundle.certificate.signatures.length ? (checks.signatureIntegrity ? "VERIFIED" : "NOT VERIFIED") : "NOT PROVIDED") : "NOT PROVIDED"}`);
console.log(`Authoritative evidence:\n${Object.values(checks).every(Boolean) ? "QUALIFIED UNDER CONTRACT" : "NOT QUALIFIED"}`);
console.log("Institutional source/key approval:\nNOT ESTABLISHED BY SELF-CONTAINED BUNDLE");
console.log(`Finality:\n${Object.values(checks).every(Boolean) ? "SUPPORTED BY PROVIDED EVIDENCE" : "NOT SUPPORTED"}`);
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
