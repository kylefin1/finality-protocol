import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { canonicalJson, sha256Hex } from "../typescript/canonical.ts";
import { contractHash, evaluateOutcome, issueCertificate, sealObservation } from "../typescript/kernel.ts";
import { REFERENCE_TIME, referenceBundle, referenceObservations, reseal } from "../typescript/fixtures.ts";

const vectors = [];
for (let flags = 0; flags < 32; flags += 1) {
  const bundle = structuredClone(referenceBundle());
  if (flags & 1) bundle.stopTriggered = true;
  if (flags & 2) bundle.observations = bundle.observations.filter((item) => item.observationId !== "obs-balance");
  if (flags & 4) bundle.observations = bundle.observations.map((item) => item.observationId === "obs-balance" ? reseal(item, { value: "0.01" }) : item);
  if (flags & 8) bundle.observations = bundle.observations.map((item) => item.observationId === "obs-access" ? reseal(item, { validFrom: "2026-08-29T11:59:59.999Z" }) : item);
  if (flags & 16) bundle.observations.push(sealObservation({ ...referenceObservations[1], observationId: `contradiction-${flags}`, predicate: "ledger.pending", value: true, integrity: undefined }));
  const result = evaluateOutcome(bundle.contract, bundle.sourceContracts, bundle.observations, { evaluatedAt: bundle.evaluatedAt, stopTriggered: bundle.stopTriggered });
  bundle.expectedClassification = result.classification;
  const certificate = issueCertificate(bundle.contract, bundle.sourceContracts, bundle.observations, result, { issuedAt: REFERENCE_TIME });
  vectors.push({ id: `FRP-GOLD-${String(flags).padStart(3, "0")}`, flags, bundle, expectedClassification: result.classification, expectedContractHash: contractHash(bundle.contract), expectedCertificateHash: certificate.certificateHash, vectorHash: sha256Hex(canonicalJson({ flags, bundle, expectedClassification: result.classification, expectedCertificateHash: certificate.certificateHash })) });
}
const body = { artifactType: "FinalityGoldenConformanceVectors", protocolVersion: "2.0", generator: "FRP-GOLDEN-1.0.0", vectorCount: vectors.length, vectors };
const output = resolve(process.argv[2] || resolve(import.meta.dirname, "golden-vectors.json"));
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${canonicalJson({ ...body, suiteHash: sha256Hex(canonicalJson(body)) })}\n`);
console.log(output);
