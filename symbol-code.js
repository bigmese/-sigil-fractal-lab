const VERSION_PREFIX = "SD2";

export function hashString(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededRandom(seedText) {
  let seed = hashString(seedText);
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function base64UrlEncode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function canonicalPayload(payload) {
  return {
    v: 2,
    a: String(payload.atlasVersion),
    g: String(payload.generatorVersion),
    i: String(payload.identityKey),
    n: [...new Set(payload.intents)].sort(),
    c: Math.max(0, Number.parseInt(payload.cousin, 10) || 0),
  };
}

export function deriveIdentityKey({ date = "", time = "", location = "" } = {}) {
  const normalized = [date.trim(), time.trim(), location.trim().toLowerCase().replace(/\s+/g, " ")].join("|");
  const source = normalized === "||" ? "anonymous-symboldna-identity" : normalized;
  const a = hashString(source).toString(16).padStart(8, "0");
  const b = hashString(`${source}|identity`).toString(16).padStart(8, "0");
  return `${a}${b}`;
}

export function coreSymbolId({ identityKey, intents, cousin = 0 }) {
  const basis = `${identityKey}|${[...intents].sort().join(",")}|${cousin}`;
  const left = hashString(basis).toString(36).toUpperCase().padStart(7, "0");
  const right = hashString(`${basis}|core`).toString(36).toUpperCase().padStart(7, "0");
  return `SDNA-${left.slice(-6)}-${right.slice(-6)}`;
}

export function createSymbolCode(payload) {
  const canonical = canonicalPayload(payload);
  const json = JSON.stringify(canonical);
  const body = base64UrlEncode(json);
  const checksum = hashString(json).toString(16).padStart(8, "0");
  return {
    code: `${VERSION_PREFIX}.${body}.${checksum}`,
    coreId: coreSymbolId({ identityKey: canonical.i, intents: canonical.n, cousin: canonical.c }),
    payload: canonical,
  };
}

export function parseSymbolCode(code) {
  const clean = String(code || "").trim();
  const [prefix, body, checksum] = clean.split(".");
  if (prefix !== VERSION_PREFIX || !body || !checksum) throw new Error("This is not a valid SymbolDNA v2 code.");
  const json = base64UrlDecode(body);
  const expected = hashString(json).toString(16).padStart(8, "0");
  if (expected !== checksum.toLowerCase()) throw new Error("The Symbol Code checksum does not match. It may have been copied incompletely.");
  const payload = JSON.parse(json);
  if (payload.v !== 2 || !payload.a || !payload.g || !payload.i || !Array.isArray(payload.n)) {
    throw new Error("The Symbol Code payload is incomplete.");
  }
  return canonicalPayload({
    atlasVersion: payload.a,
    generatorVersion: payload.g,
    identityKey: payload.i,
    intents: payload.n,
    cousin: payload.c,
  });
}
