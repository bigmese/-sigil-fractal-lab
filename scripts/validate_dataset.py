#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import hashlib
import json
import sys
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "database" / "manifest.json"


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError as exc:
            raise SystemExit(f"Invalid JSON at {path}:{line_number}: {exc}")
    return records


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    errors: list[str] = []

    chunks_by_kind: dict[str, list[dict[str, Any]]] = {}
    for chunk in manifest.get("chunks", []):
        path = ROOT / chunk["path"]
        chunks_by_kind.setdefault(chunk["kind"], []).append(chunk)
        if not path.exists():
            errors.append(f"Missing file: {chunk['path']}")
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != chunk.get("sha256"):
            errors.append(f"Hash mismatch: {chunk['path']}")
        if chunk.get("format") == "jsonl":
            count = len(load_jsonl(path))
            if count != chunk.get("records"):
                errors.append(f"Record-count mismatch: {chunk['path']} expected {chunk.get('records')} got {count}")
        elif chunk.get("format") == "json":
            try:
                json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                errors.append(f"Invalid JSON: {chunk['path']} ({exc})")

    def all_jsonl(kind: str) -> list[dict[str, Any]]:
        entries = sorted(chunks_by_kind.get(kind, []), key=lambda entry: entry["path"])
        if not entries:
            errors.append(f"Missing required chunk kind: {kind}")
            return []
        records: list[dict[str, Any]] = []
        for entry in entries:
            if entry.get("format") != "jsonl":
                errors.append(f"Expected JSONL for {kind}: {entry['path']}")
                continue
            records.extend(load_jsonl(ROOT / entry["path"]))
        return records

    sources = all_jsonl("sources")
    observations = all_jsonl("observations")
    lineages = all_jsonl("lineages")
    geometry = all_jsonl("geometry_families")
    meanings = all_jsonl("meanings")
    claims = all_jsonl("claims")
    colors = all_jsonl("color_evidence")

    def unique(records: list[dict[str, Any]], field: str) -> set[str]:
        values = [record.get(field) for record in records]
        missing = [index + 1 for index, value in enumerate(values) if not value]
        if missing:
            errors.append(f"Missing primary key {field} in rows {missing[:5]}")
        if len(values) != len(set(values)):
            errors.append(f"Duplicate primary key in {field}")
        return {str(value) for value in values if value}

    source_ids = unique(sources, "source_id")
    observation_ids = unique(observations, "observation_id")
    lineage_ids = unique(lineages, "lineage_id")
    geometry_ids = unique(geometry, "geometry_id")
    meaning_ids = unique(meanings, "meaning_id")
    claim_ids = unique(claims, "claim_id")
    unique(colors, "color_record_id")

    for record in observations:
        if record.get("source_id") not in source_ids:
            errors.append(f"Observation {record.get('observation_id')} has missing source {record.get('source_id')}")

    for record in claims:
        if record.get("source_id") not in source_ids:
            errors.append(f"Claim {record.get('claim_id')} has missing source {record.get('source_id')}")
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

    for record in colors:
        if record.get("source_id") not in source_ids:
            errors.append(f"Color record {record.get('color_record_id')} has missing source")
        if record.get("observation_id") not in observation_ids:
            errors.append(f"Color record {record.get('color_record_id')} has missing observation")
        if record.get("generator_status") != "inactive":
            errors.append(f"Color record {record.get('color_record_id')} is unexpectedly active")

    supersession_specs = [
        (sources, source_ids, "source_id", ("supersedes_source_id", "supersedes_id")),
        (observations, observation_ids, "observation_id", ("supersedes_observation_id", "supersedes_id")),
        (lineages, lineage_ids, "lineage_id", ("supersedes_lineage_id", "supersedes_id")),
        (geometry, geometry_ids, "geometry_id", ("supersedes_geometry_id", "supersedes_id")),
        (meanings, meaning_ids, "meaning_id", ("supersedes_meaning_id", "supersedes_id")),
        (claims, claim_ids, "claim_id", ("supersedes_claim_id", "supersedes_id")),
    ]
    for records, ids, primary, fields in supersession_specs:
        for record in records:
            for field in fields:
                ref = record.get(field)
                if ref and ref not in ids:
                    errors.append(f"{record.get(primary)} supersedes missing record {ref}")

    history = manifest.get("release_history", [])
    current_version = manifest.get("atlas_version")
    if not history:
        errors.append("Manifest has no release_history")
    current_release = next((item for item in history if item.get("atlas_version") == current_version), None)
    if not current_release:
        errors.append(f"No release_history entry for current Atlas {current_version}")
    else:
        for kind in ("living_synthesis", "generator_profile", "benchmark_cases", "update_impact"):
            path = current_release.get("chunks", {}).get(kind)
            if not path or not (ROOT / path).exists():
                errors.append(f"Current release is missing {kind}")

    if manifest.get("snapshot", {}).get("generator_integration") != "experimental_connected":
        errors.append("Generator integration status is not experimental_connected")
    if manifest.get("snapshot", {}).get("color_generation") != "inactive_collection_only":
        errors.append("Color generation must remain inactive_collection_only")

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
    print(f"Color evidence: {len(colors)}")
    print(f"Atlas: {manifest.get('atlas_version')} / Generator: {manifest.get('compatible_generator_version')}")


if __name__ == "__main__":
    main()
