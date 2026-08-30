import { sign, verify } from "node:crypto";
import { canonicalJson, sha256Hex } from "./canonical.ts";
import type { FinalityCertificateV2 } from "./kernel.ts";

export type SignedFinalityObject<T> = {
  envelopeType: "SignedFinalityObject";
  payload: T;
  payloadHash: string;
  signatures: Array<{ algorithm: "Ed25519"; keyId: string; signature: string }>;
};

export function signObject<T>(payload: T, privateKeyPem: string, keyId: string): SignedFinalityObject<T> {
  const payloadHash = sha256Hex(canonicalJson(payload));
  const signature = sign(null, Buffer.from(payloadHash, "hex"), privateKeyPem).toString("base64");
  return { envelopeType: "SignedFinalityObject", payload, payloadHash, signatures: [{ algorithm: "Ed25519", keyId, signature }] };
}

export function verifySignedObject<T>(envelope: SignedFinalityObject<T>, publicKeys: Record<string, string>) {
  const hashValid = sha256Hex(canonicalJson(envelope.payload)) === envelope.payloadHash;
  const signatures = envelope.signatures.map((item) => ({ keyId: item.keyId, valid: item.algorithm === "Ed25519" && Boolean(publicKeys[item.keyId]) && verify(null, Buffer.from(envelope.payloadHash, "hex"), publicKeys[item.keyId], Buffer.from(item.signature, "base64")) }));
  return { hashValid, signatures, verified: hashValid && signatures.length > 0 && signatures.every((item) => item.valid) };
}

export function signCertificate(certificate: FinalityCertificateV2, privateKeyPem: string, keyId: string): FinalityCertificateV2 {
  const signature = sign(null, Buffer.from(certificate.certificateHash, "hex"), privateKeyPem).toString("base64");
  return { ...certificate, signatures: [...certificate.signatures, { algorithm: "Ed25519", keyId, signature }] };
}

export function verifyCertificateSignatures(certificate: FinalityCertificateV2, publicKeys: Record<string, string>) {
  const results = certificate.signatures.map((item) => ({ keyId: item.keyId, valid: item.algorithm === "Ed25519" && Boolean(publicKeys[item.keyId]) && verify(null, Buffer.from(certificate.certificateHash, "hex"), publicKeys[item.keyId], Buffer.from(item.signature, "base64")) }));
  return { present: results.length > 0, results, verified: results.length > 0 && results.every((item) => item.valid) };
}
