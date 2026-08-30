#!/usr/bin/env python3
"""Fail closed on public/private path leaks and common credential material."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_PATH_PARTS = {
    "reality-graph",
    "authority-graph",
    "source-dependency-implementation",
    "source-discovery",
    "normalization-intelligence",
    "private-attack-corpus",
    "customer-mappings",
    "private-adapters",
    "network-intelligence",
    "institutional-customer-data",
}
TEXT_EXTENSIONS = {".md", ".json", ".jsonl", ".yaml", ".yml", ".py", ".ts", ".mts", ".js", ".mjs", ".sh", ".tla", ".cfg", ".cff", ".txt"}


def secret_patterns() -> list[tuple[str, re.Pattern[str]]]:
    # Constructed here so this source does not contain a literal token that
    # trips its own scan.
    return [
        ("PEM_PRIVATE_KEY", re.compile("BEGIN " + "(?:RSA |EC |OPENSSH )?PRIVATE KEY")),
        ("AWS_ACCESS_KEY", re.compile("AKIA" + "[A-Z0-9]{16}")),
        ("GITHUB_CLASSIC_TOKEN", re.compile("gh" + "p_[A-Za-z0-9]{36}")),
        ("GITHUB_FINE_GRAINED_TOKEN", re.compile("github_pat_" + "[A-Za-z0-9_]{60,}")),
        ("SLACK_TOKEN", re.compile("xox" + "[abprs]-[A-Za-z0-9-]{24,}")),
        ("ASSIGNED_PASSWORD", re.compile(r"(?i)(?:password|passwd)\s*[:=]\s*['\"]?[^\s'\"${}]{12,}")),
    ]


def public_files() -> list[Path]:
    return [
        path
        for path in ROOT.rglob("*")
        if path.is_file()
        and ".git" not in path.parts
        and "node_modules" not in path.parts
        and "artifacts" not in path.parts
    ]


def main() -> int:
    findings: list[str] = []
    this_file = Path(__file__).resolve()
    for path in public_files():
        relative = path.relative_to(ROOT)
        normalized_parts = {part.lower().replace("_", "-") for part in relative.parts}
        leaked_parts = sorted(PRIVATE_PATH_PARTS & normalized_parts)
        if leaked_parts:
            findings.append(f"PRIVATE_PATH:{relative}:{','.join(leaked_parts)}")
        if path == this_file or path.suffix.lower() not in TEXT_EXTENSIONS or path.stat().st_size > 5_000_000:
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for name, pattern in secret_patterns():
            if pattern.search(content):
                findings.append(f"POSSIBLE_SECRET:{name}:{relative}")
    if findings:
        print("PUBLIC/PRIVATE BOUNDARY: FAIL")
        for finding in findings:
            print(finding)
        return 1
    print(f"PUBLIC/PRIVATE BOUNDARY: PASS ({len(public_files())} files inspected)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
