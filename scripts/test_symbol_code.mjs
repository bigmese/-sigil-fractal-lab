import assert from "node:assert/strict";
import { createSymbolCode, parseSymbolCode, deriveIdentityKey } from "../symbol-code.js";

const identityKey = deriveIdentityKey({
  date: "1990-01-01",
  time: "12:34",
  location: "Las Vegas, NV",
});

const input = {
  atlasVersion: "A0.1.0",
  generatorVersion: "G0.2.0",
  identityKey,
  intents: ["wisdom", "protection"],
  cousin: 0,
};

const first = createSymbolCode(input);
const second = createSymbolCode(input);
assert.equal(first.code, second.code, "Same input must create the same code");
assert.equal(first.coreId, second.coreId, "Same input must create the same core ID");

const parsed = parseSymbolCode(first.code);
assert.equal(parsed.a, "A0.1.0");
assert.equal(parsed.g, "G0.2.0");
assert.equal(parsed.i, identityKey);
assert.deepEqual(parsed.n, ["protection", "wisdom"]);
assert.equal(parsed.c, 0);

const cousin = createSymbolCode({ ...input, cousin: 1 });
assert.notEqual(cousin.code, first.code, "A cousin must receive a new full code");
assert.notEqual(cousin.coreId, first.coreId, "A cousin must receive a new core ID");

assert.throws(() => parseSymbolCode(first.code.slice(0, -1) + "0"), /checksum/i);
console.log("SYMBOL CODE TEST PASSED");
