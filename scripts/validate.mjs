import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = ["index.html","manifest.json","README.md","assets/css/app.css","assets/js/app.js","assets/js/atlas.js","assets/js/blueprint.js","assets/js/geometry.js","assets/js/renderer.js","assets/js/exporter.js","assets/js/ui.js","assets/js/random.js","assets/js/diagnostics.js","database/manifest.json"];
for (const path of required) await stat(join(root,path));
JSON.parse(await readFile(join(root,"manifest.json"),"utf8"));
const manifest = JSON.parse(await readFile(join(root,"database/manifest.json"),"utf8"));
if (manifest.strategy !== "append-only-chunks") throw new Error("Database strategy is not append-only-chunks.");
for (const chunk of manifest.chunks) {
  const text = await readFile(join(root,chunk.path),"utf8");
  const records = text.split(/\r?\n/).filter(line=>line.trim()).map(JSON.parse);
  if (records.length !== chunk.records) throw new Error(`${chunk.path}: record count mismatch.`);
  const digest = createHash("sha256").update(text).digest("hex");
  if (digest !== chunk.sha256) throw new Error(`${chunk.path}: SHA-256 mismatch.`);
}
const jsDir = join(root,"assets/js");
for (const name of await readdir(jsDir)) {
  if (!name.endsWith(".js")) continue;
  const source = await readFile(join(jsDir,name),"utf8");
  for (const match of source.matchAll(/from\s+["'](.+?)["']/g)) {
    if (match[1].startsWith(".")) await stat(resolve(jsDir,match[1]));
  }
}
const index = await readFile(join(root,"index.html"),"utf8");
for (const reference of ["assets/css/app.css","assets/js/app.js","manifest.json"]) if (!index.includes(reference)) throw new Error(`index.html does not reference ${reference}`);
console.log(`SymbolDNA validation passed: ${manifest.chunks.length} chunks, ${manifest.chunks.reduce((sum,chunk)=>sum+chunk.records,0)} Atlas records.`);
