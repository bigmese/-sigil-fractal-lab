#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "database" / "manifest.json"

def load_jsonl(path):
    records = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError as exc:
            raise SystemExit(f"Invalid JSON at {path}:{line_number}: {exc}")
    return records

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
errors = []

for chunk in manifest["chunks"]:
    path = ROOT / chunk["path"]
    if not path.exists():
        errors.append(f"Missing file: {chunk['path']}")
        continue
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != chunk["sha256"]:
        errors.append(f"Hash mismatch: {chunk['path']}")
    if chunk["format"] == "jsonl":
        count = len(load_jsonl(path))
        if count != chunk["records"]:
            errors.append(
                f"Record-count mismatch: {chunk['path']} expected {chunk['records']} got {count}"
            )

paths = {chunk["kind"]: ROOT / chunk["path"] for chunk in manifest["chunks"] if chunk["format"] == "jsonl"}
sources = load_jsonl(paths["sources"])
observations = load_jsonl(paths["observations"])
lineages = load_jsonl(paths["lineages"])
geometry = load_jsonl(paths["geometry_families"])
meanings = load_jsonl(paths["meanings"])
claims = load_jsonl(paths["claims"])

def unique(records, field):
    values = [record.get(field) for record in records]
    if len(values) != len(set(values)):
        errors.append(f"Duplicate primary key in {field}")
    return set(values)

source_ids = unique(sources, "source_id")
observation_ids = unique(observations, "observation_id")
lineage_ids = unique(lineages, "lineage_id")
geometry_ids = unique(geometry, "geometry_id")
meaning_ids = unique(meanings, "meaning_id")
claim_ids = unique(claims, "claim_id")

for record in observations:
    if record.get("source_id") not in source_ids:
        errors.append(f"Observation {record.get('observation_id')} has missing source")

for record in claims:
    if record.get("source_id") not in source_ids:
        errors.append(f"Claim {record.get('claim_id')} has missing source")
    for ref in record.get("observation_ids", []):
        if ref not in observation_ids:
            errors.append(f"Claim {record.get('claim_id')} has missing observation {ref}")

for record in meanings:
    for ref in record.get("source_claim_ids", []):
        if ref not in claim_ids:
            errors.append(f"Meaning {record.get('meaning_id')} has missing claim {ref}")
    for ref in record.get("observation_ids", []):
        if ref not in observation_ids:
            errors.append(f"Meaning {record.get('meaning_id')} has missing observation {ref}")
    for ref in record.get("geometry_ids", []):
        if ref not in geometry_ids:
            errors.append(f"Meaning {record.get('meaning_id')} has missing geometry {ref}")

for record in geometry:
    for ref in record.get("lineage_ids", []):
        if ref not in lineage_ids:
            errors.append(f"Geometry {record.get('geometry_id')} has missing lineage {ref}")
    for ref in record.get("meaning_ids", []):
        if ref not in meaning_ids:
            errors.append(f"Geometry {record.get('geometry_id')} has missing meaning {ref}")
    for ref in record.get("representative_observation_ids", []):
        if ref not in observation_ids:
            errors.append(f"Geometry {record.get('geometry_id')} has missing observation {ref}")

if manifest["snapshot"]["structured_observation_cutoff"] != "SRC-000015":
    errors.append("Unexpected structured observation cutoff")

if errors:
    print("VALIDATION FAILED")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("VALIDATION PASSED")
print(f"Sources: {len(sources)}")
print(f"Observations: {len(observations)}")
print(f"Lineages: {len(lineages)}")
print(f"Geometry families: {len(geometry)}")
print(f"Meanings: {len(meanings)}")
print(f"Claims: {len(claims)}")
