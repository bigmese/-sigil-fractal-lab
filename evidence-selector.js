import { DNA_SCHEMA, clamp01, normalizeDNA } from "./dna.js";
import { seededRandom } from "./symbol-code.js";

const FEATURE_TERMS = {
  boundary: ["circle", "circular", "enclosure", "enclosed", "boundary", "bounded", "sphere", "container", "ring", "pentacle"],
  centrality: ["center", "central", "hub", "privileged", "core", "inside", "interior", "payload"],
  radiality: ["radial", "spoke", "sector", "perimeter", "cardinal", "direction", "wheel", "star", "pentagram", "center-to"],
  connectivity: ["connected", "connect", "network", "edge", "wire", "link", "overlay", "interlace", "graph"],
  nesting: ["nested", "concentric", "layer", "band", "inner", "outer", "multiple enclosure", "overlay", "inside"],
  angularity: ["angular", "angle", "triangle", "square", "diamond", "zigzag", "cross", "grid", "polygon", "peak"],
  flow: ["path", "sequence", "traversal", "clockwise", "counterclockwise", "spiral", "loop", "cursive", "calligraphic", "directed"],
  repetition: ["repeat", "multiple", "many", "row", "knots", "stations", "sectors", "spokes", "eight", "seven", "four", "five", "nine"],
};

function textOf(record) {
  return Object.values(record || {}).flatMap(value => Array.isArray(value) ? value : [value])
    .filter(value => typeof value === "string").join(" ").toLowerCase();
}

function featureVector(record) {
  const text = textOf(record);
  return Object.fromEntries(Object.entries(FEATURE_TERMS).map(([feature, terms]) => {
    const hits = terms.reduce((sum, term) => sum + Math.min(2, text.split(term).length - 1), 0);
    return [feature, Math.min(1, hits / 4)];
  }));
}

function mergeRankings(intents, profile, field) {
  const scores = new Map();
  const metadata = new Map();
  for (const intent of intents) {
    const entries = profile.intents[intent]?.[field] || [];
    entries.forEach((entry, index) => {
      const rankWeight = 1 / (1 + index * 0.17);
      scores.set(entry.id, (scores.get(entry.id) || 0) + Number(entry.score || 0.1) * rankWeight);
      const meta = metadata.get(entry.id) || { intents: new Set(), fallback: false };
      meta.intents.add(intent);
      meta.fallback ||= Boolean(entry.fallback);
      metadata.set(entry.id, meta);
    });
  }
  return [...scores].map(([id, score]) => ({
    id,
    score,
    intents: [...metadata.get(id).intents],
    fallback: metadata.get(id).fallback,
  })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

function chooseRanked(entries, count, random) {
  const pool = [...entries];
  const chosen = [];
  while (pool.length && chosen.length < count) {
    const windowSize = Math.min(pool.length, Math.max(2, Math.min(7, count + 2)));
    const total = pool.slice(0, windowSize).reduce((sum, item) => sum + Math.max(0.01, item.score), 0);
    let cursor = random() * total;
    let index = 0;
    for (; index < windowSize; index += 1) {
      cursor -= Math.max(0.01, pool[index].score);
      if (cursor <= 0) break;
    }
    chosen.push(pool.splice(Math.min(index, windowSize - 1), 1)[0]);
  }
  return chosen;
}

function parseNumbers(text) {
  const words = { three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13 };
  const lower = text.toLowerCase();
  const numbers = Object.entries(words).filter(([word]) => new RegExp(`\\b${word}\\b`).test(lower)).map(([, value]) => value);
  for (const match of lower.matchAll(/(?<!\d)([3-9]|1[0-3])(?!\d)/g)) numbers.push(Number(match[1]));
  return [...new Set(numbers)].filter(number => number >= 3 && number <= 13);
}

function evidenceWeight(record) {
  const confidence = Number(record?.confidence ?? record?.extraction_confidence ?? 0.75);
  const lineage = Number(record?.lineage_weight ?? record?.lineage_adjusted_count ?? 1);
  const inspection = String(record?.inspection ?? record?.evidence_status ?? record?.classification ?? "");
  const visual = inspection.includes("visually_inspected") && !inspection.includes("text_only") ? 1.15 : 0.82;
  return confidence * Math.min(1, lineage) * visual;
}

export function synthesizeSelection(atlas, { intents, identityKey, cousin = 0 }) {
  const profile = atlas.data.generator_profile;
  const selectedIntents = [...new Set(intents)].filter(intent => profile.intents[intent]);
  if (!selectedIntents.length) selectedIntents.push("protection");
  const random = seededRandom(`${identityKey}|${selectedIntents.sort().join(",")}|${cousin}|${atlas.atlasVersion}`);

  const observationRanking = mergeRankings(selectedIntents, profile, "ranked_observations");
  const geometryRanking = mergeRankings(selectedIntents, profile, "ranked_geometry");
  const meaningRanking = mergeRankings(selectedIntents, profile, "ranked_meanings");

  const observationCount = Math.min(6, Math.max(3, selectedIntents.length * 2));
  const geometryCount = Math.min(5, Math.max(2, selectedIntents.length + 1));
  const selectedObservations = chooseRanked(observationRanking, observationCount, random);
  const selectedGeometries = chooseRanked(geometryRanking, geometryCount, random);
  const selectedMeanings = chooseRanked(meaningRanking, Math.min(3, selectedIntents.length + 1), random);

  const records = [
    ...selectedObservations.map(item => ({ ...item, type: "observation", record: atlas.maps.observations.get(item.id) })),
    ...selectedGeometries.map(item => ({ ...item, type: "geometry", record: atlas.maps.geometries.get(item.id) })),
  ].filter(item => item.record);

  const baseline = profile.global_baseline;
  const dna = {};
  for (const [feature] of DNA_SCHEMA) {
    let numerator = 0;
    let denominator = 0;
    for (const item of records) {
      const vector = featureVector(item.record);
      const weight = Math.max(0.1, item.score) * evidenceWeight(item.record);
      numerator += vector[feature] * weight;
      denominator += weight;
    }
    const evidenceValue = denominator ? numerator / denominator : baseline[feature] || 0.5;
    dna[feature] = clamp01((baseline[feature] || 0.5) * 0.32 + evidenceValue * 0.68);
  }

  // Prevent unsupported feature absence from collapsing the existing armature.
  for (const [feature] of DNA_SCHEMA) dna[feature] = clamp01(0.16 + dna[feature] * 0.84);

  const numberCandidates = records.flatMap(item => parseNumbers(textOf(item.record)));
  const uniqueNumbers = [...new Set(numberCandidates)];
  const order = uniqueNumbers.length ? uniqueNumbers[Math.floor(random() * uniqueNumbers.length)] : 4 + Math.floor(random() * 6);
  const layers = Math.max(2, Math.min(6, 2 + Math.round(dna.nesting * 4)));
  const motifs = ["circle", "star", "triangle", "square", "diamond", "loop", "spiral", "cross", "grid"]
    .filter(term => records.some(item => textOf(item.record).includes(term)));

  const grammarCandidates = [
    [dna.nesting + dna.boundary, "Nested enclosure field"],
    [dna.radiality + dna.repetition, "Radial correspondence wheel"],
    [dna.connectivity + dna.flow, "Connected sequential network"],
    [dna.angularity + dna.connectivity, "Angular path lattice"],
    [dna.flow + (1 - dna.angularity), "Calligraphic radial glyph"],
  ].sort((a, b) => b[0] - a[0]);

  const support = selectedIntents.map(intent => ({ intent, ...profile.intents[intent] }));
  const weakIntents = support.filter(item => ["sparse_source_scoped", "exploratory_fallback"].includes(item.support_level));

  const trace = [
    ...selectedGeometries.map(item => {
      const record = atlas.maps.geometries.get(item.id);
      return {
        id: item.id,
        type: "Geometry family",
        title: record?.name || item.id,
        source: record?.provenance || "Atlas geometry synthesis",
        intents: item.intents,
        fallback: item.fallback,
        note: record?.construction_grammar || record?.description || "Structural family selected by the controlled intention mapping.",
      };
    }),
    ...selectedObservations.map(item => {
      const record = atlas.maps.observations.get(item.id);
      const source = atlas.maps.sources.get(record?.source_id);
      return {
        id: item.id,
        type: record?.inspection?.includes("text_only") ? "Text-context observation" : "Visual observation",
        title: record?.title || item.id,
        source: `${record?.source_id || ""}${source?.title ? ` · ${source.title}` : ""}`,
        intents: item.intents,
        fallback: item.fallback,
        note: record?.construction_grammar || record?.stated_purpose || "Source-scoped observation.",
      };
    }),
  ].slice(0, 10);

  return {
    intents: selectedIntents,
    identityKey,
    cousin,
    dna: normalizeDNA(dna),
    order,
    layers,
    motifs,
    grammar: grammarCandidates[0][1],
    trace,
    selectedMeaningIds: selectedMeanings.map(item => item.id),
    support,
    weakIntents,
    renderKey: `${identityKey}|${selectedIntents.join(",")}|${cousin}|${selectedObservations.map(item => item.id).join(",")}|${selectedGeometries.map(item => item.id).join(",")}`,
  };
}
