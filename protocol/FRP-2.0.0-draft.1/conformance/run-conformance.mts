#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contractHash, evaluateOutcome, issueCertificate } from "../typescript/kernel.ts";

const path = resolve(process.argv[2] || resolve(import.meta.dirname, "golden-vectors.json"));
const suite = JSON.parse(readFileSync(path, "utf8"));
const discrepancies = [];
for (const vector of suite.vectors) {
  const bundle = vector.bundle;
  const result = evaluateOutcome(bundle.contract, bundle.sourceContracts, bundle.observations, { evaluatedAt: bundle.evaluatedAt, previousState: bundle.previousState, stopTriggered: bundle.stopTriggered });
  const certificate = issueCertificate(bundle.contract, bundle.sourceContracts, bundle.observations, result, { issuedAt: bundle.evaluatedAt });
  if (result.classification !== vector.expectedClassification || contractHash(bundle.contract) !== vector.expectedContractHash || certificate.certificateHash !== vector.expectedCertificateHash) discrepancies.push({ id: vector.id, expected: vector.expectedClassification, observed: result.classification });
}
console.log(JSON.stringify({ protocol: suite.protocolVersion, vectors: suite.vectorCount, discrepancies, status: discrepancies.length ? "FAIL" : "PASS", conformanceClaim: "SELLER_SELF_TEST_ONLY" }, null, 2));
process.exit(discrepancies.length ? 1 : 0);
