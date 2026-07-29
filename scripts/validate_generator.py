#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []

required = [
    "index.html", "app.js", "atlas-loader.js", "evidence-selector.js",
    "architecture-mapper.js", "symbol-code.js", "renderer.js", "dna.js",
    "database/manifest.json",
]
for relative in required:
    if not (ROOT / relative).exists():
        errors.append(f"Missing generator file: {relative}")

manifest = json.loads((ROOT / "database/manifest.json").read_text(encoding="utf-8"))
index = (ROOT / "index.html").read_text(encoding="utf-8")
app = (ROOT / "app.js").read_text(encoding="utf-8")

if "Variation seed" in index or 'id="seed"' in index or 'id="seedInput"' in index:
    errors.append("Visible legacy seed input is still present")
if 'type="module" src="app.js"' not in index:
    errors.append("index.html does not load the modular app.js")
if "database/manifest.json" not in (ROOT / "atlas-loader.js").read_text(encoding="utf-8"):
    errors.append("Atlas loader does not reference the manifest")

version_match = re.search(r'const GENERATOR_VERSION = "([^"]+)"', app)
if not version_match:
    errors.append("Generator version constant is missing")
elif version_match.group(1) != manifest.get("compatible_generator_version"):
    errors.append("Generator version does not match manifest compatibility")

chunks = {entry["kind"]: entry for entry in manifest.get("chunks", [])}
for kind in ("living_synthesis", "generator_profile", "benchmark_cases", "benchmark_results", "update_impact", "color_evidence"):
    if kind not in chunks:
        errors.append(f"Manifest is missing {kind}")

profile_path = ROOT / chunks["generator_profile"]["path"]
profile = json.loads(profile_path.read_text(encoding="utf-8"))
if profile.get("atlas_version") != manifest.get("atlas_version"):
    errors.append("Generator profile Atlas version mismatch")
if profile.get("generator_version") != manifest.get("compatible_generator_version"):
    errors.append("Generator profile software version mismatch")
if len(profile.get("dimensions", [])) != 8:
    errors.append("Generator profile must expose eight Structural DNA dimensions")
if len(profile.get("intents", {})) != 12:
    errors.append("Generator profile must contain twelve controlled intentions")

results_path = ROOT / chunks["benchmark_results"]["path"]
results = json.loads(results_path.read_text(encoding="utf-8"))
rows = results.get("results", [])
if len(rows) != 12:
    errors.append("Expected 12 benchmark results")
if len({row.get("canvas_png_sha256") for row in rows}) != len(rows):
    errors.append("Benchmark image hashes are not unique")
if not all(row.get("core_id_matches") for row in rows):
    errors.append("One or more benchmark Core Symbol IDs failed")
if not all(row.get("machine_validation") == "passed" for row in rows):
    errors.append("One or more benchmark cases failed machine validation")

color_path = ROOT / chunks["color_evidence"]["path"]
colors = [json.loads(line) for line in color_path.read_text(encoding="utf-8").splitlines() if line.strip()]
if not colors:
    errors.append("Color Evidence ledger is empty")
if any(row.get("generator_status") != "inactive" for row in colors):
    errors.append("Color generation has been activated prematurely")

if errors:
    print("GENERATOR VALIDATION FAILED")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("GENERATOR VALIDATION PASSED")
print(f"Atlas: {manifest['atlas_version']}")
print(f"Generator: {manifest['compatible_generator_version']}")
print(f"Intent profiles: {len(profile['intents'])}")
print(f"Benchmarks: {len(rows)} unique outputs")
print(f"Color evidence: {len(colors)} inactive records")
