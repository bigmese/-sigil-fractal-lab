export function hashString(text) {
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(seedText) {
  return mulberry32(hashString(seedText));
}

export function randomInt(random, minimum, maximumInclusive) {
  return Math.floor(random() * (maximumInclusive - minimum + 1)) + minimum;
}

export function choose(random, values) {
  return values[Math.floor(random() * values.length)];
}

export function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function normalizedCode(text, digits = 9) {
  const modulus = 10 ** digits;
  return String(hashString(text) % modulus).padStart(digits, "0");
}
