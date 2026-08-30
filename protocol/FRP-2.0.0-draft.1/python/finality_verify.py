#!/usr/bin/env python3
"""Independent, standard-library-only Finality verifier reference.

It deliberately contains no Finality network calls and no dependency on the
TypeScript implementation. Semantic numbers in hashed objects MUST be integers
or decimal strings under FINALITY-CANONICAL-JSON-1.
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

FSK_VERSION = "FSK-1.0.0"
FRP_OBJECT_VERSION = "2.0"
STATES = {"OPEN", "PENDING", "FINAL", "CONTRADICTED", "CURE_REQUIRED", "FAILED", "REOPENED", "SUPERSEDED"}


def canonical_json(value: Any) -> str:
    def reject(value_to_check: Any) -> None:
        if isinstance(value_to_check, float):
            raise ValueError("Floating point values are outside FINALITY-CANONICAL-JSON-1; use integer or decimal string")
        if isinstance(value_to_check, list):
            for item in value_to_check:
                reject(item)
        if isinstance(value_to_check, dict):
            for key, item in value_to_check.items():
                if not isinstance(key, str) or not key.isascii():
                    raise ValueError("Canonical object keys MUST be ASCII strings")
                reject(item)
    reject(value)
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def parse_time(value: str) -> int | None:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return None
        return int(parsed.astimezone(timezone.utc).timestamp() * 1000)
    except (TypeError, ValueError):
        return None


def compare(actual: Any, operator: str, expected: Any = None) -> bool:
    if operator == "PRESENT":
        return actual is not None
    if operator == "EQUALS":
        return canonical_json(actual) == canonical_json(expected)
    if operator == "NOT_EQUALS":
        return canonical_json(actual) != canonical_json(expected)
    if operator == "IN":
        return isinstance(expected, list) and any(canonical_json(actual) == canonical_json(item) for item in expected)
    try:
        left, right = float(actual), float(expected)
    except (TypeError, ValueError):
        return False
    return {"GT": left > right, "GTE": left >= right, "LT": left < right, "LTE": left <= right}.get(operator, False)


def observation_body(observation: dict[str, Any]) -> dict[str, Any]:
    body = dict(observation)
    integrity = observation.get("integrity", {})
    body["integrity"] = {key: integrity[key] for key in ("hashAlgorithm", "signatureAlgorithm", "keyId") if key in integrity}
    return body


def observation_hash(observation: dict[str, Any]) -> str:
    return sha256(canonical_json(observation_body(observation)))


def contract_hash(contract: dict[str, Any]) -> str:
    return sha256(canonical_json(contract))


def source_hash(source: dict[str, Any]) -> str:
    return sha256(canonical_json(source))


def merkle_root(values: list[Any]) -> str:
    if not values:
        return sha256("finality:empty-merkle-root")
    level = sorted(sha256(f"leaf:{canonical_json(value)}") for value in values)
    while len(level) > 1:
        level = [sha256(f"node:{level[index]}:{level[index + 1] if index + 1 < len(level) else level[index]}") for index in range(0, len(level), 2)]
    return level[0]


def source_authorizes(source: dict[str, Any], contract: dict[str, Any], predicate: str, at: int) -> bool:
    start = parse_time(source.get("validFrom"))
    end = parse_time(source.get("validUntil")) if source.get("validUntil") else None
    if source.get("status") != "ACTIVE" or source.get("availability") != "AVAILABLE" or start is None or start > at or (end is not None and end < at):
        return False
    if source.get("context") != contract.get("context"):
        return False
    subject = contract["subject"]
    return any(
        entry.get("predicate") == predicate
        and entry.get("subject") in ("*", subject["id"])
        and entry.get("scope") in ("*", subject["scope"])
        for entry in source.get("authoritativeFor", [])
    )


def observation_validity(observation: dict[str, Any], source: dict[str, Any], contract: dict[str, Any], at: int, verified_signatures: set[str] | None = None) -> tuple[bool, str]:
    if observation.get("evidenceKind") not in ("AUTHORITATIVE", "EXTERNAL_WITNESS"):
        return False, "NON_AUTHORITATIVE_KIND"
    if observation.get("subject") != contract["subject"]["id"] or observation.get("sourceContract") != source["sourceContractId"] or observation.get("source") != source["sourceContractId"]:
        return False, "SOURCE_OR_SUBJECT_MISMATCH"
    if observation.get("trustDomain") != source.get("trustDomain"):
        return False, "TRUST_DOMAIN_MISMATCH"
    integrity = observation.get("integrity", {})
    if integrity.get("hashAlgorithm") != "sha-256" or integrity.get("contentHash") != observation_hash(observation):
        return False, "INTEGRITY_FAILURE"
    observed, start, end = (parse_time(observation.get(key)) for key in ("observedAt", "validFrom", "validUntil"))
    if observed is None or start is None or end is None or start > at or end < at or observed > at:
        return False, "INVALID_TIME_INTERVAL"
    if at - observed > source["freshness"]["maximumAgeMs"]:
        return False, "STALE"
    if source["integrity"]["signatureRequired"]:
        if not integrity.get("signature") or not integrity.get("signatureAlgorithm") or not integrity.get("keyId"):
            return False, "SIGNATURE_REQUIRED"
        if integrity["signatureAlgorithm"] not in source["integrity"].get("allowedSignatureAlgorithms", []):
            return False, "SIGNATURE_ALGORITHM_NOT_ALLOWED"
        if observation.get("observationId") not in (verified_signatures or set()):
            return False, "SIGNATURE_CRYPTOGRAPHIC_VERIFICATION_REQUIRED"
    return True, "VALID"


def temporal_satisfied(requirement: dict[str, Any], observation: dict[str, Any], at: int, minimum_evidence_age_ms: int) -> bool:
    temporal = requirement["temporal"]
    observed = parse_time(observation["observedAt"])
    if observed is None or at - observed < minimum_evidence_age_ms:
        return False
    if temporal["mode"] == "TRUE_NOW":
        return True
    if temporal["mode"] == "TRUE_BEFORE_DEADLINE":
        deadline = parse_time(temporal.get("deadline"))
        return deadline is not None and observed is not None and observed <= deadline
    start = parse_time(observation["validFrom"])
    return start is not None and at - start >= temporal.get("durationMs", 0)


def evaluate_requirement(requirement: dict[str, Any], contract: dict[str, Any], sources: dict[str, dict[str, Any]], observations: list[dict[str, Any]], at: int, verified_signatures: set[str]) -> dict[str, Any]:
    configured = [sources[source_id] for source_id in requirement["sourceContracts"] if source_id in sources]
    authorized = [source for source in configured if source_authorizes(source, contract, requirement["predicate"], at)]
    relevant = [observation for observation in observations if observation.get("predicate") == requirement["predicate"] and observation.get("sourceContract") in requirement["sourceContracts"]]
    valid: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for observation in relevant:
        source = sources.get(observation.get("sourceContract"))
        if source and source_authorizes(source, contract, requirement["predicate"], at) and observation_validity(observation, source, contract, at, verified_signatures)[0]:
            valid.append((observation, source))
    satisfying = [(observation, source) for observation, source in valid if compare(observation["value"], requirement["operator"], requirement.get("expected")) and temporal_satisfied(requirement, observation, at, contract["finality"]["minimumEvidenceAgeMs"])]
    temporal_only = [(observation, source) for observation, source in valid if compare(observation["value"], requirement["operator"], requirement.get("expected"))]
    roots = sorted({source["dependency"]["independenceRoot"] for _, source in satisfying})
    domains = sorted({source["trustDomain"] for _, source in satisfying})
    source_ids = {source["sourceContractId"] for _, source in satisfying}
    policy = requirement["sourcePolicy"]
    mandatory_ok = all(source_id in source_ids for source_id in policy.get("mandatorySources", []))
    if policy["mode"] == "ALL_REQUIRED":
        quorum = len(authorized) == len(requirement["sourceContracts"]) and all(source["sourceContractId"] in source_ids for source in authorized)
    elif policy["mode"] == "M_OF_N":
        quorum = len(roots) >= policy.get("threshold", len(requirement["sourceContracts"]))
    else:
        quorum = len(domains) >= policy.get("minimumTrustDomains", policy.get("threshold", 1))
    base = {"id": requirement["id"], "supportingObservationIds": sorted(observation["observationId"] for observation, _ in satisfying), "consideredSourceContracts": sorted(source["sourceContractId"] for source in authorized), "independentRoots": roots, "trustDomains": domains}
    if len(authorized) != len(requirement["sourceContracts"]):
        return {**base, "status": "INVALID", "reason": "SOURCE_CONTRACT_MISSING_REVOKED_OR_NOT_FIELD_AUTHORIZED"}
    if not relevant:
        return {**base, "status": "MISSING", "reason": "NO_AUTHORITATIVE_OBSERVATION"}
    if not valid:
        return {**base, "status": "STALE", "reason": "NO_VALID_FRESH_OBSERVATION"}
    if any(not compare(observation["value"], requirement["operator"], requirement.get("expected")) for observation, _ in valid):
        return {**base, "status": "UNSATISFIED", "reason": "AUTHORITATIVE_VALUE_DOES_NOT_SATISFY_PREDICATE"}
    if temporal_only and not satisfying:
        return {**base, "status": "TEMPORAL_PENDING", "reason": "DURABILITY_OR_DEADLINE_NOT_SATISFIED"}
    if not quorum or not mandatory_ok:
        return {**base, "status": "MISSING", "reason": "DEPENDENCY_AWARE_QUORUM_NOT_SATISFIED"}
    return {**base, "status": "SATISFIED", "reason": "AUTHORIZED_FRESH_INDEPENDENT_QUORUM_SATISFIED"}


def find_triggers(rules: list[dict[str, Any]], contract: dict[str, Any], sources: dict[str, dict[str, Any]], observations: list[dict[str, Any]], at: int, verified_signatures: set[str]) -> list[dict[str, Any]]:
    found = []
    for rule in rules:
        matching = []
        for observation in observations:
            source = sources.get(observation.get("sourceContract"))
            if source and rule["predicate"] == observation.get("predicate") and observation.get("sourceContract") in rule["sourceContracts"] and source_authorizes(source, contract, rule["predicate"], at) and observation_validity(observation, source, contract, at, verified_signatures)[0] and compare(observation["value"], rule["operator"], rule.get("expected")):
                matching.append(observation["observationId"])
        if matching:
            found.append({"id": rule["id"], "class": rule["class"], "mandatory": rule["mandatory"], "observationIds": sorted(matching)})
    return found


def evaluate(contract: dict[str, Any], source_contracts: list[dict[str, Any]], observations: list[dict[str, Any]], evaluated_at: str, previous_state: str | None = None, stop_triggered: bool = False, verified_observation_signatures: list[str] | None = None) -> dict[str, Any]:
    at = parse_time(evaluated_at)
    verified_signatures = set(verified_observation_signatures or [])
    if contract.get("protocol") != "finality-reality" or contract.get("protocolVersion") != FRP_OBJECT_VERSION:
        return {"protocol": "finality-reality", "kernelVersion": FSK_VERSION, "contractHash": contract_hash(contract), "evaluatedAt": evaluated_at, "invalidObservationIds": sorted(item.get("observationId", "UNKNOWN") for item in observations), "omittedMandatorySources": [], "classification": "FAILED", "predicateResults": [], "contradictions": [], "reopenTriggers": [], "reasonCodes": ["CONTRACT_PROTOCOL_VERSION_UNSUPPORTED"], "finalitySupported": False}
    sources = {source["sourceContractId"]: source for source in source_contracts if source.get("protocol") == "finality-reality" and source.get("protocolVersion") == FRP_OBJECT_VERSION}
    required_sources = sorted({source_id for requirement in contract["requiredState"] for source_id in requirement["sourceContracts"]})
    omitted = [source_id for source_id in required_sources if source_id not in sources]
    invalid_ids = sorted(observation["observationId"] for observation in observations if at is None or observation.get("sourceContract") not in sources or not observation_validity(observation, sources[observation["sourceContract"]], contract, at, verified_signatures)[0])
    base = {"protocol": "finality-reality", "kernelVersion": FSK_VERSION, "contractHash": contract_hash(contract), "evaluatedAt": evaluated_at, "invalidObservationIds": invalid_ids, "omittedMandatorySources": omitted}
    if at is None or stop_triggered:
        return {**base, "classification": "FAILED", "predicateResults": [], "contradictions": [], "reopenTriggers": [], "reasonCodes": ["INVALID_EVALUATION_TIME" if at is None else "STOP_CONDITION_TRIGGERED"], "finalitySupported": False}
    predicate_results = [evaluate_requirement(requirement, contract, sources, observations, at, verified_signatures) for requirement in contract["requiredState"]]
    contradictions = find_triggers(contract.get("contradictions", []), contract, sources, observations, at, verified_signatures)
    reopen = find_triggers(contract.get("reopenIf", []), contract, sources, observations, at, verified_signatures)
    integrity_failure = any(observation.get("observationId") in invalid_ids and observation.get("integrity", {}).get("contentHash") and observation_hash(observation) != observation["integrity"]["contentHash"] for observation in observations)
    mandatory_results = [item for index, item in enumerate(predicate_results) if contract["requiredState"][index].get("mandatory", False)]
    satisfied_count = sum(1 for item in predicate_results if item["status"] == "SATISFIED")
    finality = contract["finality"]
    finality_quorum = all(item["status"] == "SATISFIED" for item in predicate_results) if finality["rule"] == "ALL_REQUIRED" else satisfied_count >= finality.get("threshold", len(predicate_results)) and all(item["status"] == "SATISFIED" for item in mandatory_results)
    supporting_ids = {item for result_item in predicate_results for item in result_item["supportingObservationIds"]}
    supporting_times = [parse_time(item["observedAt"]) for item in observations if item["observationId"] in supporting_ids]
    supporting_times = [item for item in supporting_times if item is not None]
    consistency_window = not supporting_times or max(supporting_times) - min(supporting_times) <= finality["consistencyWindowMs"]
    if integrity_failure:
        classification, reasons = "FAILED", ["OBSERVATION_INTEGRITY_FAILURE"]
    elif previous_state == "FINAL" and reopen:
        classification, reasons = "REOPENED", ["AUTHORITATIVE_REOPEN_TRIGGER"]
    elif any(item["mandatory"] or item["class"] == "HARD" for item in contradictions):
        classification, reasons = "CONTRADICTED", ["MANDATORY_CONTRADICTION_PRESENT"]
    elif not observations:
        classification, reasons = "OPEN", ["NO_OBSERVATIONS"]
    elif omitted or any(item["status"] in ("MISSING", "STALE", "TEMPORAL_PENDING", "INVALID") for item in mandatory_results):
        classification, reasons = "PENDING", ["MANDATORY_SOURCE_OMITTED" if omitted else "EVIDENCE_OR_TEMPORAL_QUORUM_PENDING"]
    elif any(item["status"] == "UNSATISFIED" for item in mandatory_results):
        classification, reasons = "CURE_REQUIRED", ["MANDATORY_PREDICATE_UNSATISFIED"]
    elif finality_quorum and consistency_window:
        classification, reasons = "FINAL", ["ALL_REQUIRED_PREDICATES_SATISFIED" if finality["rule"] == "ALL_REQUIRED" else "CONTRACT_FINALITY_QUORUM_SATISFIED"]
    elif not consistency_window:
        classification, reasons = "PENDING", ["CONSISTENCY_WINDOW_NOT_SATISFIED"]
    else:
        classification, reasons = "FAILED", ["UNDEFINED_STATE_PREVENTED"]
    return {**base, "classification": classification, "predicateResults": predicate_results, "contradictions": [{key: value for key, value in item.items() if key != "mandatory"} for item in contradictions], "reopenTriggers": [{"id": item["id"], "observationIds": item["observationIds"]} for item in reopen], "reasonCodes": reasons, "finalitySupported": classification == "FINAL"}


def issue_certificate(contract: dict[str, Any], sources: list[dict[str, Any]], observations: list[dict[str, Any]], result: dict[str, Any], issued_at: str, previous_certificate: str | None = None, supersession_reason: str | None = None, evidence_disclosure: str = "FULL") -> dict[str, Any]:
    source_hashes = {source["sourceContractId"]: source_hash(source) for source in sorted(sources, key=lambda item: item["sourceContractId"])}
    observation_hashes = {observation["observationId"]: observation_hash(observation) for observation in sorted(observations, key=lambda item: item["observationId"])}
    dependency_nodes = [{"source": source["sourceContractId"], "root": source["dependency"]["independenceRoot"], "upstream": sorted(source["dependency"]["upstream"])} for source in sources]
    result_hash = result["contractHash"]
    subject_id = contract["subject"]["id"]
    predecessor_label = previous_certificate or "genesis"
    certificate_id = f"foc:{sha256(f'{result_hash}:{subject_id}:{issued_at}:{predecessor_label}')}"
    draft = {
        "protocol": "finality-reality",
        "protocolVersion": contract["protocolVersion"],
        "certificateType": "FinalityOutcomeCertificateV2",
        "certificateId": certificate_id,
        "outcomeContractHash": result_hash,
        "subject": contract["subject"],
        "requestedOutcome": contract["outcome"],
        "sourceContractHashes": source_hashes,
        "observationCommitments": observation_hashes,
        "evidenceRoot": merkle_root([contract, *sources, *observations, result]),
        "dependencyGraphRoot": merkle_root(dependency_nodes),
        "temporalEvaluation": {"evaluatedAt": result["evaluatedAt"], "consistencyWindowMs": contract["finality"]["consistencyWindowMs"], "minimumEvidenceAgeMs": contract["finality"]["minimumEvidenceAgeMs"]},
        "contradictions": result["contradictions"],
        "classification": result["classification"],
        "kernelVersion": result["kernelVersion"],
        "previousCertificate": previous_certificate,
        "supersessionReason": supersession_reason,
        "reopenPolicyHash": sha256(canonical_json(contract["reopenIf"])),
        "issuedAt": issued_at,
        "signatures": [],
        "verificationMaterial": {"canonicalization": "FINALITY-CANONICAL-JSON-1", "hashAlgorithm": "sha-256", "evidenceDisclosure": evidence_disclosure},
    }
    hashable = {key: value for key, value in draft.items() if key != "signatures"}
    return {**draft, "certificateHash": sha256(canonical_json(hashable))}


def verify_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    contract, sources, observations = bundle["contract"], bundle["sourceContracts"], bundle["observations"]
    result = evaluate(contract, sources, observations, bundle["evaluatedAt"], bundle.get("previousState"), bundle.get("stopTriggered", False))
    checks = {"protocol": contract.get("protocol") == "finality-reality" and contract.get("protocolVersion") == FRP_OBJECT_VERSION and result.get("kernelVersion") == FSK_VERSION, "contractHash": bundle.get("contractHash", contract_hash(contract)) == contract_hash(contract), "observationIntegrity": all(observation_hash(observation) == observation["integrity"]["contentHash"] for observation in observations), "classificationMatch": bundle.get("expectedClassification", result["classification"]) == result["classification"]}
    certificate = bundle.get("certificate")
    certificate_integrity: bool | None = None
    if certificate:
        hashable = {key: value for key, value in certificate.items() if key not in ("certificateHash", "signatures")}
        expected_source_hashes = {source["sourceContractId"]: source_hash(source) for source in sorted(sources, key=lambda item: item["sourceContractId"])}
        expected_observations = {observation["observationId"]: observation_hash(observation) for observation in sorted(observations, key=lambda item: item["observationId"])}
        expected_dependency_root = merkle_root([{"source": source["sourceContractId"], "root": source["dependency"]["independenceRoot"], "upstream": sorted(source["dependency"]["upstream"])} for source in sources])
        certificate_integrity = certificate.get("protocolVersion") == FRP_OBJECT_VERSION and certificate.get("kernelVersion") == FSK_VERSION and sha256(canonical_json(hashable)) == certificate.get("certificateHash") and certificate.get("outcomeContractHash") == contract_hash(contract) and certificate.get("sourceContractHashes") == expected_source_hashes and certificate.get("observationCommitments") == expected_observations and certificate.get("evidenceRoot") == merkle_root([contract, *sources, *observations, result]) and certificate.get("dependencyGraphRoot") == expected_dependency_root and certificate.get("classification") == result["classification"]
        checks["certificateIntegrity"] = certificate_integrity
        checks["signatureIntegrity"] = not bool(certificate.get("signatures"))
    return {"checks": checks, "classification": result["classification"], "certificateIntegrity": certificate_integrity, "signatureIntegrity": None if not certificate else "NOT_PROVIDED" if not certificate.get("signatures") else "NOT_VERIFIED", "supportedByProvidedEvidence": all(checks.values()), "result": result}


def print_result(result: dict[str, Any]) -> None:
    print("FINALITY REALITY PROTOCOL")
    print("Independent verifier result")
    for label, value in result["checks"].items():
        print(f"{label.upper():28} {'PASS' if value else 'FAIL'}")
    print(f"{'CLASSIFICATION':28} {result['classification']}")
    certificate_label = "VERIFIED" if result["certificateIntegrity"] is True else "NOT PROVIDED" if result["certificateIntegrity"] is None else "NOT VERIFIED"
    print(f"{'CERTIFICATE INTEGRITY':28} {certificate_label}")
    print(f"{'CERTIFICATE SIGNATURES':28} {result['signatureIntegrity'] or 'NOT PROVIDED'}")
    print(f"{'AUTHORITATIVE EVIDENCE':28} {'QUALIFIED UNDER CONTRACT' if result['supportedByProvidedEvidence'] else 'NOT QUALIFIED'}")
    print(f"{'SOURCE/KEY APPROVAL':28} NOT ESTABLISHED BY SELF-CONTAINED BUNDLE")
    print("Finality: SUPPORTED BY PROVIDED EVIDENCE" if result["supportedByProvidedEvidence"] else "Finality: NOT SUPPORTED")


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print("usage: finality_verify.py verify|evaluate|contract-hash|conformance <file.json>", file=sys.stderr)
        return 64
    command, path = argv[1], Path(argv[2])
    payload = json.loads(path.read_text(encoding="utf-8"))
    if command == "conformance":
        discrepancies = []
        for vector in payload["vectors"]:
            bundle = vector["bundle"]
            result = evaluate(bundle["contract"], bundle["sourceContracts"], bundle["observations"], bundle["evaluatedAt"], bundle.get("previousState"), bundle.get("stopTriggered", False))
            certificate = issue_certificate(bundle["contract"], bundle["sourceContracts"], bundle["observations"], result, bundle["evaluatedAt"])
            if result["classification"] != vector["expectedClassification"] or contract_hash(bundle["contract"]) != vector["expectedContractHash"] or certificate["certificateHash"] != vector["expectedCertificateHash"]:
                discrepancies.append({"id": vector["id"], "expected": vector["expectedClassification"], "observed": result["classification"]})
        report = {"protocol": payload["protocolVersion"], "vectors": payload["vectorCount"], "discrepancies": discrepancies, "status": "FAIL" if discrepancies else "PASS", "conformanceClaim": "SELLER_ALTERNATE_IMPLEMENTATION_SELF_TEST_ONLY"}
        print(json.dumps(report, indent=2, sort_keys=True))
        return 1 if discrepancies else 0
    if command == "contract-hash":
        print(contract_hash(payload))
        return 0
    if command == "evaluate":
        print(json.dumps(verify_bundle(payload)["result"], indent=2, sort_keys=True))
        return 0
    if command == "verify":
        result = verify_bundle(payload)
        print_result(result)
        return 0 if result["supportedByProvidedEvidence"] else 1
    print(f"unknown command: {command}", file=sys.stderr)
    return 64


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
