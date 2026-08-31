from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class InfrastructureTests(unittest.TestCase):
    def test_frozen_manifest_matches_every_artifact(self):
        release = ROOT / "protocol/FRP-2.0.0-draft.1"
        manifest = json.loads((release / "release-manifest.json").read_text())
        self.assertEqual(56, len(manifest["artifacts"]))
        for artifact in manifest["artifacts"]:
            data = (release / artifact["path"]).read_bytes()
            self.assertEqual(artifact["bytes"], len(data), artifact["path"])
            self.assertEqual(artifact["sha256"], hashlib.sha256(data).hexdigest(), artifact["path"])

    def test_artifact_substitution_is_detected(self):
        release = ROOT / "protocol/FRP-2.0.0-draft.1"
        manifest = json.loads((release / "release-manifest.json").read_text())
        target = next(item for item in manifest["artifacts"] if item["path"] == "typescript/kernel.ts")
        substituted = (release / target["path"]).read_bytes() + b"\n"
        self.assertNotEqual(target["sha256"], hashlib.sha256(substituted).hexdigest())

    def test_manifest_substitution_is_detected(self):
        release = ROOT / "protocol/FRP-2.0.0-draft.1"
        original = (release / "release-manifest.json").read_bytes()
        manifest = json.loads(original)
        expected = manifest["manifestHash"]
        self.assertEqual("556ccddc45b30be84891e9f0e00d684761b63df444186cd15134f28e92ae0caf", expected)
        body = {key: value for key, value in manifest.items() if key != "manifestHash"}
        canonical = json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode()
        self.assertEqual(expected, hashlib.sha256(canonical).hexdigest())
        body["releaseId"] = body["releaseId"] + "-SUBSTITUTED"
        substituted = json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode()
        self.assertNotEqual(expected, hashlib.sha256(substituted).hexdigest())

    def test_empty_verified_records_produce_zero_scoreboard(self):
        scoreboard = load_module("scoreboard", ROOT / "tools/build_scoreboard.py")
        with tempfile.TemporaryDirectory() as directory:
            generated = scoreboard.build(Path(directory))
        self.assertTrue(all(value == 0 for value in generated["metrics"].values()))

    def test_simulated_submission_is_rejected(self):
        importer = load_module("importer", ROOT / "tools/evidence_import.py")
        data = json.loads((ROOT / "evidence/examples/SIMULATED-submission.json").read_text())
        errors = importer.validate_shape(data)
        self.assertIn("SIMULATED_OR_ANONYMOUS_NOT_ADMISSIBLE", errors)

    def test_reported_pass_does_not_promote_state(self):
        importer = load_module("importer2", ROOT / "tools/evidence_import.py")
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory)
            artifact = bundle / "artifact.bin"
            report = bundle / "report.json"
            artifact.write_bytes(b"outside-artifact")
            report.write_text("{}")
            submission = {
                "submissionType": "FINALITY_EXTERNAL_EVIDENCE_SUBMISSION",
                "schemaVersion": "1.0",
                "evidenceKind": "OUTSIDE_FALSIFICATION",
                "identity": {"name": "Outside Reviewer", "identifier": "https://example.org/reviewer", "independenceDisclosure": "No Finality control", "isBot": False},
                "repositoryUrl": "https://github.com/outside/review",
                "commit": "a" * 40,
                "releaseTested": "FRP-2.0.0-draft.1-20260829",
                "artifact": {"path": "artifact.bin", "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest()},
                "ciRunUrl": "https://github.com/outside/review/actions/runs/1",
                "report": {"path": "report.json", "sha256": hashlib.sha256(report.read_bytes()).hexdigest()},
                "claimedResult": "PASS",
                "submittedAt": "2026-08-30T00:00:00Z"
            }
            submission_path = bundle / "submission.json"
            submission_path.write_text(json.dumps(submission))
            record = importer.import_submission(submission_path, bundle)
        self.assertEqual("SUBMITTED", record["state"])
        self.assertFalse(record["checks"]["technicallyReproduced"])

    def test_boundary_script_passes(self):
        result = subprocess.run(["python3", "tools/check_boundary.py"], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class InfrastructureTests(unittest.TestCase):
    def test_frozen_manifest_matches_every_artifact(self):
        release = ROOT / "protocol/FRP-2.0.0-draft.1"
        manifest = json.loads((release / "release-manifest.json").read_text())
        self.assertEqual(56, len(manifest["artifacts"]))
        for artifact in manifest["artifacts"]:
            data = (release / artifact["path"]).read_bytes()
            self.assertEqual(artifact["bytes"], len(data), artifact["path"])
            self.assertEqual(artifact["sha256"], hashlib.sha256(data).hexdigest(), artifact["path"])

    def test_artifact_substitution_is_detected(self):
        release = ROOT / "protocol/FRP-2.0.0-draft.1"
        manifest = json.loads((release / "release-manifest.json").read_text())
        target = next(item for item in manifest["artifacts"] if item["path"] == "typescript/kernel.ts")
        substituted = (release / target["path"]).read_bytes() + b"\n"
        self.assertNotEqual(target["sha256"], hashlib.sha256(substituted).hexdigest())

    def test_manifest_substitution_is_detected(self):
        release = ROOT / "protocol/FRP-2.0.0-draft.1"
        original = (release / "release-manifest.json").read_bytes()
        manifest = json.loads(original)
        expected = manifest["manifestHash"]
        self.assertEqual("556ccddc45b30be84891e9f0e00d684761b63df444186cd15134f28e92ae0caf", expected)
        body = {key: value for key, value in manifest.items() if key != "manifestHash"}
        canonical = json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode()
        self.assertEqual(expected, hashlib.sha256(canonical).hexdigest())
        body["releaseId"] = body["releaseId"] + "-SUBSTITUTED"
        substituted = json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode()
        self.assertNotEqual(expected, hashlib.sha256(substituted).hexdigest())

    def test_empty_verified_records_produce_zero_scoreboard(self):
        scoreboard = load_module("scoreboard", ROOT / "tools/build_scoreboard.py")
        with tempfile.TemporaryDirectory() as directory:
            generated = scoreboard.build(Path(directory))
        self.assertTrue(all(value == 0 for value in generated["metrics"].values()))

    def test_simulated_submission_is_rejected(self):
        importer = load_module("importer", ROOT / "tools/evidence_import.py")
        data = json.loads((ROOT / "evidence/examples/SIMULATED-submission.json").read_text())
        errors = importer.validate_shape(data)
        self.assertIn("SIMULATED_OR_ANONYMOUS_NOT_ADMISSIBLE", errors)

    def test_reported_pass_does_not_promote_state(self):
        importer = load_module("importer2", ROOT / "tools/evidence_import.py")
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory)
            artifact = bundle / "artifact.bin"
            report = bundle / "report.json"
            artifact.write_bytes(b"outside-artifact")
            report.write_text("{}")
            submission = {
                "submissionType": "FINALITY_EXTERNAL_EVIDENCE_SUBMISSION",
                "schemaVersion": "1.0",
                "evidenceKind": "OUTSIDE_FALSIFICATION",
                "identity": {"name": "Outside Reviewer", "identifier": "https://example.org/reviewer", "independenceDisclosure": "No Finality control", "isBot": False},
                "repositoryUrl": "https://github.com/outside/review",
                "commit": "a" * 40,
                "releaseTested": "FRP-2.0.0-draft.1-20260829",
                "artifact": {"path": "artifact.bin", "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest()},
                "ciRunUrl": "https://github.com/outside/review/actions/runs/1",
                "report": {"path": "report.json", "sha256": hashlib.sha256(report.read_bytes()).hexdigest()},
                "claimedResult": "PASS",
                "submittedAt": "2026-08-30T00:00:00Z"
            }
            submission_path = bundle / "submission.json"
            submission_path.write_text(json.dumps(submission))
            record = importer.import_submission(submission_path, bundle)
        self.assertEqual("SUBMITTED", record["state"])
        self.assertFalse(record["checks"]["technicallyReproduced"])

    def test_boundary_script_passes(self):
        result = subprocess.run(["python3", "tools/check_boundary.py"], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class InfrastructureTests(unittest.TestCase):
    def test_frozen_manifest_matches_every_artifact(self):
        release = ROOT / "protocol/FRP-2.0.0-draft.1"
        manifest = json.loads((release / "release-manifest.json").read_text())
        self.assertEqual(56, len(manifest["artifacts"]))
        for artifact in manifest["artifacts"]:
            data = (release / artifact["path"]).read_bytes()
            self.assertEqual(artifact["bytes"], len(data), artifact["path"])
            self.assertEqual(artifact["sha256"], hashlib.sha256(data).hexdigest(), artifact["path"])

    def test_artifact_substitution_is_detected(self):
        release = ROOT / "protocol/FRP-2.0.0-draft.1"
        manifest = json.loads((release / "release-manifest.json").read_text())
        target = next(item for item in manifest["artifacts"] if item["path"] == "typescript/kernel.ts")
        substituted = (release / target["path"]).read_bytes() + b"\n"
        self.assertNotEqual(target["sha256"], hashlib.sha256(substituted).hexdigest())

    def test_manifest_substitution_is_detected(self):
        release = ROOT / "protocol/FRP-2.0.0-draft.1"
        original = (release / "release-manifest.json").read_bytes()
        manifest = json.loads(original)
        expected = manifest["manifestHash"]
        self.assertEqual("c133c950332e47a54eb542180dcd64fc1dd7c1b2068538f8eaad8491097c37b4", expected)
        body = {key: value for key, value in manifest.items() if key != "manifestHash"}
        canonical = json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode()
        self.assertEqual(expected, hashlib.sha256(canonical).hexdigest())
        body["releaseId"] = body["releaseId"] + "-SUBSTITUTED"
        substituted = json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode()
        self.assertNotEqual(expected, hashlib.sha256(substituted).hexdigest())

    def test_empty_verified_records_produce_zero_scoreboard(self):
        scoreboard = load_module("scoreboard", ROOT / "tools/build_scoreboard.py")
        with tempfile.TemporaryDirectory() as directory:
            generated = scoreboard.build(Path(directory))
        self.assertTrue(all(value == 0 for value in generated["metrics"].values()))

    def test_simulated_submission_is_rejected(self):
        importer = load_module("importer", ROOT / "tools/evidence_import.py")
        data = json.loads((ROOT / "evidence/examples/SIMULATED-submission.json").read_text())
        errors = importer.validate_shape(data)
        self.assertIn("SIMULATED_OR_ANONYMOUS_NOT_ADMISSIBLE", errors)

    def test_reported_pass_does_not_promote_state(self):
        importer = load_module("importer2", ROOT / "tools/evidence_import.py")
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory)
            artifact = bundle / "artifact.bin"
            report = bundle / "report.json"
            artifact.write_bytes(b"outside-artifact")
            report.write_text("{}")
            submission = {
                "submissionType": "FINALITY_EXTERNAL_EVIDENCE_SUBMISSION",
                "schemaVersion": "1.0",
                "evidenceKind": "OUTSIDE_FALSIFICATION",
                "identity": {"name": "Outside Reviewer", "identifier": "https://example.org/reviewer", "independenceDisclosure": "No Finality control", "isBot": False},
                "repositoryUrl": "https://github.com/outside/review",
                "commit": "a" * 40,
                "releaseTested": "FRP-2.0.0-draft.1-20260829",
                "artifact": {"path": "artifact.bin", "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest()},
                "ciRunUrl": "https://github.com/outside/review/actions/runs/1",
                "report": {"path": "report.json", "sha256": hashlib.sha256(report.read_bytes()).hexdigest()},
                "claimedResult": "PASS",
                "submittedAt": "2026-08-30T00:00:00Z"
            }
            submission_path = bundle / "submission.json"
            submission_path.write_text(json.dumps(submission))
            record = importer.import_submission(submission_path, bundle)
        self.assertEqual("SUBMITTED", record["state"])
        self.assertFalse(record["checks"]["technicallyReproduced"])

    def test_boundary_script_passes(self):
        result = subprocess.run(["python3", "tools/check_boundary.py"], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
