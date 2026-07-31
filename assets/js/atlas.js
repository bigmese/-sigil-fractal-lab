const ROOT_URL = new URL("../../", import.meta.url);
const MANIFEST_URL = new URL("database/manifest.json", ROOT_URL);

function parseJsonLines(text, path) {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${path} contains invalid JSONL at line ${index + 1}.`, { cause: error }); }
  });
}

async function sha256(text) {
  if (!globalThis.crypto?.subtle) return null;
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object") throw new Error("Atlas manifest is not an object.");
  if (manifest.strategy !== "append-only-chunks") throw new Error("Atlas must use append-only-chunks strategy.");
  if (!Array.isArray(manifest.chunks) || manifest.chunks.length === 0) throw new Error("Atlas manifest has no chunks.");
  return manifest;
}

export async function loadAtlas() {
  let manifestResponse;
  try { manifestResponse = await fetch(MANIFEST_URL, { cache: "no-store" }); }
  catch (error) { throw new Error("Could not request the Atlas manifest. Use GitHub Pages or another web server.", { cause: error }); }
  if (!manifestResponse.ok) throw new Error(`Atlas manifest returned HTTP ${manifestResponse.status}.`);
  const manifest = validateManifest(await manifestResponse.json());

  const byKind = {};
  const chunks = [];
  for (const entry of manifest.chunks) {
    const response = await fetch(new URL(entry.path, ROOT_URL), { cache: "no-store" });
    if (!response.ok) throw new Error(`${entry.path} returned HTTP ${response.status}.`);
    const text = await response.text();
    const records = entry.format === "jsonl" ? parseJsonLines(text, entry.path) : JSON.parse(text);
    if (records.length !== entry.records) throw new Error(`${entry.path} expected ${entry.records} records but loaded ${records.length}.`);
    const digest = await sha256(text);
    if (digest && entry.sha256 && digest !== entry.sha256) throw new Error(`${entry.path} failed SHA-256 validation.`);
    byKind[entry.kind] = [...(byKind[entry.kind] || []), ...records];
    chunks.push({ ...entry, verified: !digest || digest === entry.sha256 });
  }

  const allRecords = Object.entries(byKind).flatMap(([kind, records]) => records.map(record => ({ ...record, atlasKind: kind })));
  return Object.freeze({ manifest: Object.freeze(manifest), byKind: Object.freeze(byKind), allRecords: Object.freeze(allRecords), chunks: Object.freeze(chunks) });
}

export function atlasSummary(atlas) {
  return {
    version: atlas.manifest.database_version,
    updated: atlas.manifest.updated,
    chunkCount: atlas.manifest.chunks.length,
    recordCount: atlas.allRecords.length,
    strategy: atlas.manifest.strategy
  };
}
