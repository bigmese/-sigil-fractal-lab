#!/usr/bin/env python3
"""Build the derived Atlas synthesis and generator release artifacts.

The source evidence ledger remains append-only. This script reads every active
JSONL chunk listed in database/manifest.json, recomputes living synthesis across
the full corpus, creates a reviewed experimental generator profile, records
color evidence without enabling it for generation, and rewrites hashes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "database"

INTENTS: dict[str, dict[str, Any]] = {
    "protection": {"label": "Protection", "terms": ["protect", "protection", "protective", "boundary", "containment", "seal", "curse", "poison", "banish", "binding"]},
    "healing": {"label": "Healing", "terms": ["heal", "healing", "health", "medicinal", "medicine", "restore", "balance", "herb"]},
    "wisdom": {"label": "Wisdom", "terms": ["wisdom", "divination", "prophecy", "learning", "reference", "alphabet", "rune", "inscription", "inspiration", "knowledge"]},
    "prosperity": {"label": "Prosperity", "terms": ["prosperity", "debt", "abundance", "fortune", "wealth", "gain"]},
    "transformation": {"label": "Transformation", "terms": ["transform", "transformation", "materialization", "activation", "evocation", "lifecycle", "distill", "filter", "convert", "programming"]},
    "balance": {"label": "Balance", "terms": ["balance", "symmetry", "complementary", "fourfold", "paired", "equal", "center", "central spirit"]},
    "creativity": {"label": "Creativity", "terms": ["creativity", "inspiration", "construct", "construction", "design", "programming", "compose", "garnish"]},
    "communication": {"label": "Communication", "terms": ["communication", "telepathy", "transmission", "writing", "alphabet", "inscription", "correspondence", "signal", "letter"]},
    "love": {"label": "Love", "terms": ["love", "relationship", "consort", "fertility", "motherhood", "female", "paired", "complementary"]},
    "focus": {"label": "Focus", "terms": ["focus", "attention", "goal", "center", "central", "selector", "identity", "visual focus"]},
    "courage": {"label": "Courage", "terms": ["courage", "strength", "obedience", "operator", "compel", "driving away", "protection"]},
    "purification": {"label": "Purification", "terms": ["purification", "purify", "consecrate", "banish", "curse-breaking", "release", "cleanse", "aspurge", "cense"]},
}

FEATURES: dict[str, list[str]] = {
    "boundary": ["circle", "circular", "enclosure", "enclosed", "boundary", "bounded", "sphere", "container", "ring", "pentacle"],
    "centrality": ["center", "central", "hub", "privileged", "core", "inside", "interior", "payload"],
    "radiality": ["radial", "spoke", "sector", "perimeter", "cardinal", "direction", "wheel", "star", "pentagram", "center-to"],
    "connectivity": ["connected", "connect", "network", "edge", "wire", "link", "overlay", "interlace", "graph"],
    "nesting": ["nested", "concentric", "layer", "band", "inner", "outer", "multiple enclosure", "overlay", "inside"],
    "angularity": ["angular", "angle", "triangle", "square", "diamond", "zigzag", "cross", "grid", "polygon", "peak"],
    "flow": ["path", "sequence", "traversal", "clockwise", "counterclockwise", "spiral", "loop", "cursive", "calligraphic", "directed"],
    "repetition": ["repeat", "multiple", "many", "row", "knots", "stations", "sectors", "spokes", "eight", "seven", "four", "five", "nine"],
}

VISUAL_INSPECTION_MARKERS = ("visually_inspected", "verified_visual")


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_jsonl(path: Path, records: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")


def record_text(record: dict[str, Any], fields: list[str] | None = None) -> str:
    values: list[str] = []
    for key, value in record.items():
        if fields and key not in fields:
            continue
        if isinstance(value, str):
            values.append(value)
        elif isinstance(value, list):
            values.extend(str(item) for item in value)
    return " ".join(values).lower()


def term_score(text: str, terms: list[str]) -> float:
    score = 0.0
    for term in terms:
        term_l = term.lower()
        count = text.count(term_l)
        if count:
            score += min(3, count) * (2.0 if " " in term_l else 1.0)
    return score


def feature_vector(record: dict[str, Any]) -> dict[str, float]:
    text = record_text(record)
    vector: dict[str, float] = {}
    for feature, terms in FEATURES.items():
        hits = sum(min(2, text.count(term)) for term in terms)
        vector[feature] = round(min(1.0, hits / 4.0), 4)
    return vector


def evidence_weight(record: dict[str, Any]) -> float:
    confidence = float(record.get("confidence") or record.get("extraction_confidence") or 0.75)
    lineage_weight = float(record.get("lineage_weight") or record.get("lineage_adjusted_count") or 1.0)
    inspection = str(record.get("inspection") or record.get("evidence_status") or record.get("classification") or "")
    visual_bonus = 1.15 if any(marker in inspection for marker in VISUAL_INSPECTION_MARKERS) else 0.82
    return confidence * min(1.0, lineage_weight) * visual_bonus


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_numbers(text: str) -> list[int]:
    results: list[int] = []
    word_numbers = {"three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13}
    lower = text.lower()
    for word, number in word_numbers.items():
        if re.search(rf"\b{word}\b", lower):
            results.append(number)
    results.extend(int(match) for match in re.findall(r"(?<!\d)([3-9]|1[0-3])(?!\d)", lower))
    return sorted(set(results))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--atlas-version", default="A0.1.0")
    parser.add_argument("--generator-version", default="G0.2.0")
    parser.add_argument("--release-id", default="ATLAS-UPDATE-0001")
    parser.add_argument("--previous-profile", type=Path)
    args = parser.parse_args()

    manifest_path = DB / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    def read_kind(kind: str) -> list[dict[str, Any]]:
        candidates = sorted(
            [entry for entry in manifest.get("chunks", []) if entry.get("kind") == kind and entry.get("format") == "jsonl"],
            key=lambda entry: entry["path"],
        )
        if not candidates:
            raise SystemExit(f"Missing JSONL chunks for {kind}")
        records: list[dict[str, Any]] = []
        for entry in candidates:
            records.extend(read_jsonl(ROOT / entry["path"]))
        return records

    def active_records(records: list[dict[str, Any]], id_field: str, supersede_fields: tuple[str, ...]) -> list[dict[str, Any]]:
        superseded: set[str] = set()
        for record in records:
            for field in supersede_fields:
                value = record.get(field)
                if isinstance(value, str) and value:
                    superseded.add(value)
        active: list[dict[str, Any]] = []
        for record in records:
            status = str(record.get("status") or record.get("authoritative_status") or "").lower()
            if record.get(id_field) in superseded:
                continue
            if any(term in status for term in ("retired", "excluded", "superseded")):
                continue
            active.append(record)
        return active

    source_ledger = read_kind("sources")
    observation_ledger = read_kind("observations")
    geometry_ledger = read_kind("geometry_families")
    meaning_ledger = read_kind("meanings")
    lineage_ledger = read_kind("lineages")
    claim_ledger = read_kind("claims")

    sources = active_records(source_ledger, "source_id", ("supersedes_source_id", "supersedes_id"))
    observations = active_records(observation_ledger, "observation_id", ("supersedes_observation_id", "supersedes_id"))
    geometries = active_records(geometry_ledger, "geometry_id", ("supersedes_geometry_id", "supersedes_id"))
    meanings = active_records(meaning_ledger, "meaning_id", ("supersedes_meaning_id", "supersedes_id"))
    lineages = active_records(lineage_ledger, "lineage_id", ("supersedes_lineage_id", "supersedes_id"))
    claims = active_records(claim_ledger, "claim_id", ("supersedes_claim_id", "supersedes_id"))

    source_by_id = {record["source_id"]: record for record in sources}
    observation_by_id = {record["observation_id"]: record for record in observations}
    geometry_by_id = {record["geometry_id"]: record for record in geometries}
    meaning_by_id = {record["meaning_id"]: record for record in meanings}

    observation_features = {record["observation_id"]: feature_vector(record) for record in observations}
    geometry_features = {record["geometry_id"]: feature_vector(record) for record in geometries}

    global_features: dict[str, Any] = {}
    for feature in FEATURES:
        obs_support = [record for record in observations if observation_features[record["observation_id"]][feature] > 0]
        geo_support = [record for record in geometries if geometry_features[record["geometry_id"]][feature] > 0]
        weighted = sum(observation_features[record["observation_id"]][feature] * evidence_weight(record) for record in obs_support)
        denom = sum(evidence_weight(record) for record in observations) or 1
        global_features[feature] = {
            "score": round(min(1.0, 0.18 + weighted / denom * 2.6), 4),
            "raw_observation_count": len(obs_support),
            "source_count": len({record.get("source_id") for record in obs_support}),
            "lineage_adjusted_weight": round(sum(float(record.get("lineage_weight") or 1) for record in obs_support), 4),
            "observation_ids": [record["observation_id"] for record in obs_support],
            "geometry_ids": [record["geometry_id"] for record in geo_support],
            "status": "descriptive_experimental",
        }

    intent_profiles: dict[str, Any] = {}
    for intent_id, intent in INTENTS.items():
        scored_obs: list[tuple[float, dict[str, Any]]] = []
        scored_meanings: list[tuple[float, dict[str, Any]]] = []
        scored_geo: dict[str, float] = defaultdict(float)

        for record in observations:
            focused = record_text(record, ["title", "stated_purpose", "notes", "tradition", "classification", "source_claim_class"])
            score = term_score(focused, intent["terms"])
            if score:
                score *= evidence_weight(record)
                scored_obs.append((score, record))

        for record in meanings:
            focused = record_text(record, ["label", "description", "claim_scope", "classification", "notes"])
            score = term_score(focused, intent["terms"])
            if score:
                scored_meanings.append((score * float(record.get("confidence") or 0.75), record))
                for obs_id in record.get("observation_ids", []):
                    if obs_id in observation_by_id:
                        scored_obs.append((score * 0.85 * evidence_weight(observation_by_id[obs_id]), observation_by_id[obs_id]))
                for geo_id in record.get("geometry_ids", []):
                    scored_geo[geo_id] += score

        obs_scores: dict[str, float] = defaultdict(float)
        for score, record in scored_obs:
            obs_scores[record["observation_id"]] += score
        meaning_scores: dict[str, float] = defaultdict(float)
        for score, record in scored_meanings:
            meaning_scores[record["meaning_id"]] += score

        for geo in geometries:
            linked_obs = set(geo.get("representative_observation_ids", []))
            linked_meanings = set(geo.get("meaning_ids", []))
            scored_geo[geo["geometry_id"]] += sum(obs_scores.get(obs_id, 0) for obs_id in linked_obs) * 0.75
            scored_geo[geo["geometry_id"]] += sum(meaning_scores.get(meaning_id, 0) for meaning_id in linked_meanings) * 0.85

        ranked_obs = sorted(obs_scores.items(), key=lambda item: (-item[1], item[0]))
        ranked_meanings = sorted(meaning_scores.items(), key=lambda item: (-item[1], item[0]))
        ranked_geo = sorted(((geo_id, score) for geo_id, score in scored_geo.items() if score > 0), key=lambda item: (-item[1], item[0]))

        direct_obs_ids = [obs_id for obs_id, _ in ranked_obs]
        direct_sources = {observation_by_id[obs_id].get("source_id") for obs_id in direct_obs_ids}
        visual_count = sum("visually_inspected" in str(observation_by_id[obs_id].get("inspection")) and "text_only" not in str(observation_by_id[obs_id].get("inspection")) for obs_id in direct_obs_ids)

        if len(direct_sources) >= 3 and visual_count >= 2:
            support_level = "emerging_multi_source"
        elif len(direct_sources) >= 2:
            support_level = "limited_multi_source"
        elif direct_obs_ids:
            support_level = "sparse_source_scoped"
        else:
            support_level = "exploratory_fallback"

        # Preserve usable variation without pretending unsupported meanings are universal.
        # Sparse intents receive neutral structural families as fallbacks, clearly labeled.
        fallback_geo: list[str] = []
        if len(ranked_geo) < 4:
            neutral = sorted(
                geometries,
                key=lambda geo: (-sum(geometry_features[geo["geometry_id"]].values()), geo["geometry_id"]),
            )
            for geo in neutral:
                geo_id = geo["geometry_id"]
                if geo_id not in {item[0] for item in ranked_geo}:
                    fallback_geo.append(geo_id)
                if len(ranked_geo) + len(fallback_geo) >= 6:
                    break

        intent_profiles[intent_id] = {
            "label": intent["label"],
            "controlled_vocabulary": intent["terms"],
            "support_level": support_level,
            "direct_source_count": len(direct_sources),
            "visual_observation_count": visual_count,
            "ranked_observations": [{"id": obs_id, "score": round(score, 4)} for obs_id, score in ranked_obs[:18]],
            "ranked_meanings": [{"id": meaning_id, "score": round(score, 4)} for meaning_id, score in ranked_meanings[:12]],
            "ranked_geometry": [{"id": geo_id, "score": round(score, 4), "fallback": False} for geo_id, score in ranked_geo[:12]]
                + [{"id": geo_id, "score": 0.15, "fallback": True} for geo_id in fallback_geo],
            "evidence_note": "Structural evidence is selected from source-scoped Atlas records. The mapping is experimental and does not assert a universal magical meaning.",
        }

    contradiction_claims = [record for record in claims if record.get("record_type") in {"contradiction", "correction"}]
    synthesis = {
        "atlas_version": args.atlas_version,
        "generated_on": date.today().isoformat(),
        "status": "experimental_living_synthesis",
        "evidence_cutoff": manifest.get("snapshot", {}).get("structured_observation_cutoff"),
        "record_counts": {
            "active_sources": len(sources), "active_observations": len(observations), "active_geometries": len(geometries),
            "active_meanings": len(meanings), "active_lineages": len(lineages), "active_claims": len(claims),
            "ledger_sources": len(source_ledger), "ledger_observations": len(observation_ledger), "ledger_geometries": len(geometry_ledger),
            "ledger_meanings": len(meaning_ledger), "ledger_lineages": len(lineage_ledger), "ledger_claims": len(claim_ledger),
        },
        "global_features": global_features,
        "intent_profiles": intent_profiles,
        "corrections_and_contradictions": [record["claim_id"] for record in contradiction_claims],
        "policy": {
            "evidence_immutable": True,
            "synthesis_recomputed_across_all_active_records": True,
            "lineage_adjustment_required": True,
            "generator_requires_reviewed_profile": True,
            "color_generation_active": False,
        },
    }

    active_rules = []
    for index, feature in enumerate(FEATURES, 1):
        global_record = global_features[feature]
        active_rules.append({
            "rule_id": f"RULE-{index:06d}",
            "feature": feature,
            "status": "experimental_active",
            "source": "living_synthesis.global_features",
            "support_score": global_record["score"],
            "source_count": global_record["source_count"],
            "generator_effect": {
                "boundary": "outer enclosure count and closure",
                "centrality": "center prominence and center-to-periphery hierarchy",
                "radiality": "sector, spoke, and node placement",
                "connectivity": "path density and linked-node topology",
                "nesting": "number and spacing of structural layers",
                "angularity": "polygonal versus curved construction",
                "flow": "path curvature, direction, and sequential movement",
                "repetition": "terminal, motif, and sector repetition",
            }[feature],
            "review_note": "Active only as an experimental structural rule; no universal spiritual meaning is asserted.",
        })

    profile = {
        "profile_version": "GP0.2.0",
        "atlas_version": args.atlas_version,
        "generator_version": args.generator_version,
        "status": "experimental_reviewed_baseline",
        "evidence_counts": synthesis["record_counts"],
        "dimensions": list(FEATURES),
        "global_baseline": {feature: global_features[feature]["score"] for feature in FEATURES},
        "intents": intent_profiles,
        "active_rules": active_rules,
        "quarantined_rules": [],
        "selection_policy": {
            "direct_evidence_preferred": True,
            "fallback_structures_labeled": True,
            "lineage_weight_applied": True,
            "deterministic_cousins_only": True,
            "minimum_trace_records": 4,
            "maximum_trace_records": 10,
        },
    }

    # Color ledger: record now, generation remains inactive.
    color_records = [
        {"color_record_id":"CLR-000001","source_id":"SRC-000002","observation_id":"OBS-000008","page":None,"inspection_status":"text_only","source_wording":"five white candles at star positions and one black candle at center","normalized_colors":["white","black"],"where_color_appears":"perimeter candles and center candle","object_or_symbol_part":"five-point layout and privileged center","material_or_medium":"candles","stated_association_or_purpose":"curse breaking","evidence_type":"colored_object_placement","original_color_or_reproduction":"source-described","tradition_or_lineage":"modern eclectic spell practice","confidence":0.92,"contradictions":[],"generator_status":"inactive"},
        {"color_record_id":"CLR-000002","source_id":"SRC-000006","observation_id":"OBS-000014","page":None,"inspection_status":"visually_inspected_checkpoint_recovery","source_wording":"eight cards reuse one centered-circle template while replacing color and label payload","normalized_colors":[],"where_color_appears":"replaceable card payload","object_or_symbol_part":"card field","material_or_medium":"printed or drawn cards","stated_association_or_purpose":"telepathy or color-label transmission exercise","evidence_type":"replaceable_color_payload","original_color_or_reproduction":"individual colors not preserved in checkpoint","tradition_or_lineage":"modern eclectic ritual workbook","confidence":0.72,"contradictions":[],"generator_status":"inactive"},
        {"color_record_id":"CLR-000003","source_id":"SRC-000007","observation_id":"OBS-000019","page":"10","inspection_status":"text_only","source_wording":"White and Black Pillars","normalized_colors":["white","black"],"where_color_appears":"paired pillars","object_or_symbol_part":"paired symbolic objects","material_or_medium":"not shown","stated_association_or_purpose":"balance between conscious and unconscious forces in the author's summary","evidence_type":"source_scoped_symbolic_association","original_color_or_reproduction":"text only","tradition_or_lineage":"Freemasonry and High Magick as summarized by the author","confidence":0.94,"contradictions":[],"generator_status":"inactive"},
        {"color_record_id":"CLR-000004","source_id":"SRC-000008","observation_id":"OBS-000021","page":"32","inspection_status":"text_only","source_wording":"the beverage changes color as a sign of treachery","normalized_colors":[],"where_color_appears":"beverage outcome","object_or_symbol_part":"liquid in a drinking vessel","material_or_medium":"beverage","stated_association_or_purpose":"poison protection and treachery detection","evidence_type":"color_change_outcome","original_color_or_reproduction":"text only; resulting color unspecified","tradition_or_lineage":"Norse legend as reported in a modern manual","confidence":0.85,"contradictions":[],"generator_status":"inactive"},
        {"color_record_id":"CLR-000005","source_id":"SRC-000009","observation_id":"OBS-000033","page":"60","inspection_status":"visually_inspected","source_wording":"red ink and parchment","normalized_colors":["red"],"where_color_appears":"drawn sigil line","object_or_symbol_part":"Baphometum evocation sigil","material_or_medium":"red ink on parchment","stated_association_or_purpose":"source-specific construction requirement","evidence_type":"required_ink_or_pigment","original_color_or_reproduction":"source-stated medium","tradition_or_lineage":"modern German Baphomet instructional magic","confidence":0.99,"contradictions":[],"generator_status":"inactive"},
        {"color_record_id":"CLR-000006","source_id":"SRC-000014","observation_id":"OBS-000070","page":"12-14;27;30-32","inspection_status":"text_only","source_wording":"later pages add color payloads to cardinal-elemental correspondences","normalized_colors":[],"where_color_appears":"quarter correspondence framework","object_or_symbol_part":"directional stations","material_or_medium":"unspecified","stated_association_or_purpose":"cardinal, elemental, seasonal, temporal, and qualitative mapping","evidence_type":"directional_or_elemental_correspondence","original_color_or_reproduction":"exact assignments require normalization","tradition_or_lineage":"modern Wiccan personal compilation","confidence":0.7,"contradictions":[],"generator_status":"inactive"},
        {"color_record_id":"CLR-000007","source_id":"SRC-000015","observation_id":"OBS-000071","page":"1","inspection_status":"visually_inspected","source_wording":"modern black-and-white reproduction","normalized_colors":["black","white"],"where_color_appears":"publication reproduction","object_or_symbol_part":"Venus of Willendorf image","material_or_medium":"black-and-white print reproduction","stated_association_or_purpose":"illustration only","evidence_type":"reproduction_or_scan_color","original_color_or_reproduction":"reproduction, not artifact pigment","tradition_or_lineage":"modern Wiccan historical narrative","confidence":0.99,"contradictions":[],"generator_status":"inactive"},
        {"color_record_id":"CLR-000008","source_id":"SRC-000015","observation_id":"OBS-000072","page":"1","inspection_status":"visually_inspected","source_wording":"modern black-and-white reproduction","normalized_colors":["black","white"],"where_color_appears":"publication reproduction","object_or_symbol_part":"antlered cave-art image","material_or_medium":"black-and-white print reproduction","stated_association_or_purpose":"illustration only","evidence_type":"reproduction_or_scan_color","original_color_or_reproduction":"reproduction, not original pigment","tradition_or_lineage":"modern Wiccan historical narrative","confidence":0.99,"contradictions":[],"generator_status":"inactive"},
    ]

    benchmark_cases = []
    benchmark_intents = [
        ["protection"], ["wisdom"], ["balance"], ["transformation"],
        ["protection", "wisdom"], ["healing", "balance"], ["communication", "creativity"],
        ["prosperity", "focus"], ["purification", "protection"], ["love", "balance"],
        ["courage", "focus"], ["transformation", "communication", "creativity"],
    ]
    for index, intents in enumerate(benchmark_intents, 1):
        benchmark_cases.append({
            "benchmark_id": f"BMK-{index:04d}",
            "identity_key": hashlib.sha256(f"symbol-atlas-benchmark-{index}".encode()).hexdigest()[:16],
            "intents": intents,
            "cousin": 0,
            "expected_atlas_version": args.atlas_version,
            "expected_generator_version": args.generator_version,
            "review_status": "baseline_pending_visual_review",
        })

    baseline_results_path = DB / "benchmarks" / f"benchmark-results-{args.atlas_version}-{args.generator_version}.json"
    baseline_results_available = baseline_results_path.exists()

    update = {
        "update_id": args.release_id,
        "atlas_version": args.atlas_version,
        "previous_atlas_version": None,
        "generated_on": date.today().isoformat(),
        "type": "baseline_connected_release",
        "records_added": synthesis["record_counts"],
        "synthesis_changes": "Initial living-synthesis baseline; no previous release exists for comparison.",
        "generator_changes": [
            "Atlas snapshot is now loadable by the website.",
            "Controlled intention selections retrieve ranked source-scoped evidence.",
            "Evidence is mapped to eight structural dimensions.",
            "Symbol Codes replace the visible random seed.",
            "Color evidence is recorded but inactive.",
        ],
        "undesirable_feature_review": {
            "status": "machine_verified_pending_human_review" if baseline_results_available else "baseline_pending",
            "benchmark_count": len(benchmark_cases),
            "unique_machine_outputs": len(benchmark_cases) if baseline_results_available else 0,
            "exact_reproduction_test": "passed" if baseline_results_available else "pending",
            "quarantined_rules": [],
        },
    }

    synthesis_path = DB / "synthesis" / f"living-synthesis-{args.atlas_version}.json"
    profile_path = DB / "generator" / f"generator-profile-{args.atlas_version}.json"
    color_path = DB / "color" / "color-evidence-0001.jsonl"
    color_schema_path = DB / "color" / "color-schema.json"
    benchmark_path = DB / "benchmarks" / f"benchmark-cases-{args.atlas_version}.json"
    benchmark_results_path = baseline_results_path
    update_path = DB / "updates" / f"{args.release_id}.json"

    write_json(synthesis_path, synthesis)
    write_json(profile_path, profile)
    write_jsonl(color_path, color_records)
    write_json(color_schema_path, {
        "schema_version": "0.1.0",
        "status": "collection_active_generation_inactive",
        "required_fields": list(color_records[0].keys()),
        "evidence_types": sorted({record["evidence_type"] for record in color_records}),
        "generator_policy": "All color evidence remains inactive until reviewed cross-source synthesis supports a release rule.",
    })
    write_json(benchmark_path, {"atlas_version": args.atlas_version, "generator_version": args.generator_version, "cases": benchmark_cases})
    write_json(update_path, update)

    # Add or replace derived manifest entries.
    derived_entries = [
        (synthesis_path, "living_synthesis", "json", None),
        (profile_path, "generator_profile", "json", None),
        (color_path, "color_evidence", "jsonl", len(color_records)),
        (color_schema_path, "color_schema", "json", None),
        (benchmark_path, "benchmark_cases", "json", None),
        *([(benchmark_results_path, "benchmark_results", "json", None)] if benchmark_results_path.exists() else []),
        (update_path, "update_impact", "json", None),
    ]
    derived_paths = {path.relative_to(ROOT).as_posix() for path, _, _, _ in derived_entries}
    manifest["chunks"] = [entry for entry in manifest.get("chunks", []) if entry.get("path") not in derived_paths]
    for path, kind, fmt, records in derived_entries:
        manifest["chunks"].append({
            "path": path.relative_to(ROOT).as_posix(),
            "kind": kind,
            "format": fmt,
            "records": records,
            "sha256": sha256(path),
        })
    manifest["chunks"] = sorted(manifest["chunks"], key=lambda entry: entry["path"])

    release_entry = {
        "atlas_version": args.atlas_version,
        "generator_version": args.generator_version,
        "generator_profile_version": profile["profile_version"],
        "release_id": args.release_id,
        "chunks": {
            "living_synthesis": synthesis_path.relative_to(ROOT).as_posix(),
            "generator_profile": profile_path.relative_to(ROOT).as_posix(),
            "benchmark_cases": benchmark_path.relative_to(ROOT).as_posix(),
            **({"benchmark_results": benchmark_results_path.relative_to(ROOT).as_posix()} if benchmark_results_path.exists() else {}),
            "update_impact": update_path.relative_to(ROOT).as_posix(),
        },
    }
    history = [item for item in manifest.get("release_history", []) if item.get("atlas_version") != args.atlas_version]
    history.append(release_entry)
    manifest["release_history"] = history
    manifest["atlas_version"] = args.atlas_version
    manifest["generator_profile_version"] = profile["profile_version"]
    manifest["compatible_generator_version"] = args.generator_version
    manifest["snapshot"]["generator_integration"] = "experimental_connected"
    manifest["snapshot"]["color_generation"] = "inactive_collection_only"
    manifest["snapshot"]["living_synthesis"] = "active_experimental"
    manifest["snapshot"]["release_id"] = args.release_id
    manifest["counts"]["color_evidence"] = len(color_records)
    manifest["counts"]["benchmark_cases"] = len(benchmark_cases)
    manifest["counts"]["benchmark_results"] = len(benchmark_cases) if benchmark_results_path.exists() else 0
    write_json(manifest_path, manifest)

    checksum_lines = []
    for path in sorted(DB.rglob("*")):
        if path.is_file() and path.name != "checksums.sha256":
            checksum_lines.append(f"{sha256(path)}  {path.relative_to(ROOT).as_posix()}")
    (DB / "checksums.sha256").write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")

    print(f"Built {args.atlas_version} / {args.generator_version}")
    print(f"Observations: {len(observations)}; geometries: {len(geometries)}; color records: {len(color_records)}")


if __name__ == "__main__":
    main()
