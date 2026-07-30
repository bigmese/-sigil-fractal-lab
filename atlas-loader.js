function parseJSONL(text) {
  return text.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
}

async function sha256Hex(text) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function fetchText(path, expectedHash = null) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
  const text = await response.text();
  if (expectedHash) {
    const actual = await sha256Hex(text);
    if (actual && actual !== expectedHash) throw new Error(`Integrity check failed for ${path}.`);
  }
  return text;
}

export class AtlasStore {
  constructor(base = ".") {
    this.base = base.replace(/\/$/, "");
    this.manifest = null;
    this.data = {};
    this.maps = {};
  }

  path(relative) {
    return `${this.base}/${relative.replace(/^\.\//, "")}`;
  }

  chunks(kind) {
    return (this.manifest?.chunks || [])
      .filter(entry => entry.kind === kind)
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  releaseChunk(kind) {
    const release = (this.manifest?.release_history || []).find(item => item.atlas_version === this.atlasVersion);
    const releasePath = release?.chunks?.[kind];
    if (releasePath) {
      const match = this.chunks(kind).find(entry => entry.path === releasePath);
      if (match) return match;
    }
    const chunks = this.chunks(kind);
    if (!chunks.length) throw new Error(`Atlas manifest does not contain a ${kind} chunk.`);
    return chunks[chunks.length - 1];
  }

  async loadEntry(entry) {
    const text = await fetchText(this.path(entry.path), entry.sha256 || null);
    const value = entry.format === "jsonl" ? parseJSONL(text) : JSON.parse(text);
    if (entry.records != null && Array.isArray(value) && value.length !== entry.records) {
      throw new Error(`${entry.path} expected ${entry.records} records but loaded ${value.length}.`);
    }
    return value;
  }

  async loadKind(kind) {
    const entries = this.chunks(kind);
    if (!entries.length) throw new Error(`Atlas manifest does not contain a ${kind} chunk.`);
    let value;
    if (entries.every(entry => entry.format === "jsonl")) {
      const chunks = await Promise.all(entries.map(entry => this.loadEntry(entry)));
      value = chunks.flat();
    } else {
      value = await this.loadEntry(this.releaseChunk(kind));
    }
    this.data[kind] = value;
    return value;
  }

  async load() {
    if (location.protocol === "file:") {
      throw new Error("The Atlas cannot load from a file:// page. Run it through GitHub Pages or a local web server.");
    }
    const manifestText = await fetchText(this.path("database/manifest.json"));
    this.manifest = JSON.parse(manifestText);
    await Promise.all([
      "sources",
      "observations",
      "geometry_families",
      "meanings",
      "lineages",
      "claims",
      "living_synthesis",
      "generator_profile",
      "color_evidence",
      "benchmark_cases",
      "update_impact",
    ].map(kind => this.loadKind(kind)));

    this.maps = {
      sources: new Map(this.data.sources.map(record => [record.source_id, record])),
      observations: new Map(this.data.observations.map(record => [record.observation_id, record])),
      geometries: new Map(this.data.geometry_families.map(record => [record.geometry_id, record])),
      meanings: new Map(this.data.meanings.map(record => [record.meaning_id, record])),
      lineages: new Map(this.data.lineages.map(record => [record.lineage_id, record])),
      claims: new Map(this.data.claims.map(record => [record.claim_id, record])),
    };
    return this;
  }

  get atlasVersion() {
    return this.manifest?.atlas_version || `A${this.manifest?.database_version || "0.0.0"}`;
  }

  get generatorVersion() {
    return this.manifest?.compatible_generator_version || "G0.2.0";
  }
}
