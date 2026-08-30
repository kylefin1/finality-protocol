#!/usr/bin/env python3
"""Parse and structurally audit every public JSON Schema without network access."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
VALID_TYPES = {"null", "boolean", "object", "array", "number", "string", "integer"}


def walk_schema(value: Any, location: str, errors: list[str]) -> None:
    if isinstance(value, list):
        for index, item in enumerate(value):
            walk_schema(item, f"{location}/{index}", errors)
        return
    if not isinstance(value, dict):
        return
    schema_type = value.get("type")
    if isinstance(schema_type, str) and schema_type not in VALID_TYPES:
        errors.append(f"{location}: unknown type {schema_type}")
    if isinstance(schema_type, list) and any(item not in VALID_TYPES for item in schema_type):
        errors.append(f"{location}: unknown union type")
    if "required" in value and ("properties" in value or value.get("type") == "object") and (not isinstance(value["required"], list) or not all(isinstance(item, str) for item in value["required"])):
        errors.append(f"{location}: required must be a string array")
    if "enum" in value and (not isinstance(value["enum"], list) or not value["enum"]):
        errors.append(f"{location}: enum must be non-empty")
    for key, item in value.items():
        walk_schema(item, f"{location}/{key}", errors)


def main() -> int:
    schemas = sorted(path for path in ROOT.rglob("*.schema.json") if ".git" not in path.parts)
    errors: list[str] = []
    for path in schemas:
        try:
            schema = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"{path.relative_to(ROOT)}: {exc}")
            continue
        if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
            errors.append(f"{path.relative_to(ROOT)}: draft 2020-12 required")
        if not isinstance(schema.get("$id"), str) or not schema["$id"].startswith("https://"):
            errors.append(f"{path.relative_to(ROOT)}: absolute HTTPS $id required")
        walk_schema(schema, str(path.relative_to(ROOT)), errors)
    if errors:
        print("SCHEMA AUDIT: FAIL")
        print("\n".join(errors))
        return 1
    print(f"SCHEMA AUDIT: PASS ({len(schemas)} schemas parsed and structurally audited)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
