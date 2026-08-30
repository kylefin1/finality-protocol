import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { canonicalJson } from "./canonical.ts";
import { contractHash, evaluateOutcome, issueCertificate } from "./kernel.ts";
import { referenceBundle } from "./fixtures.ts";

const output = resolve(process.argv[2] || resolve(import.meta.dirname, "..", "conformance", "reference-bundle.json"));
const bundle = referenceBundle();
const result = evaluateOutcome(bundle.contract, bundle.sourceContracts, bundle.observations, { evaluatedAt: bundle.evaluatedAt });
const certificate = issueCertificate(bundle.contract, bundle.sourceContracts, bundle.observations, result, { issuedAt: bundle.evaluatedAt });
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${canonicalJson({ ...bundle, contractHash: contractHash(bundle.contract), certificate })}\n`, "utf8");
console.log(output);
