import { loadAtlas, atlasSummary } from "./atlas.js";
import { createBlueprint } from "./blueprint.js";
import { Diagnostics, cssIsReady } from "./diagnostics.js";
import { buildGeometry } from "./geometry.js";
import { renderSymbol, setConstructionVisible } from "./renderer.js";
import { exportBlueprint, exportPng, exportSvg, exporterIsReady } from "./exporter.js";
import { activateTab, bindTabs, buildAtlasFilters, populateIntentions, renderAtlas, renderBlueprintInspector, setSystemMessage, updateCanvasMetadata } from "./ui.js";

const diagnostics = new Diagnostics();
const state = { atlas: null, blueprint: null, geometry: null, variation: 0, activeAtlasKind: "all" };
const canvas = document.getElementById("symbolCanvas");
const frame = document.getElementById("canvasFrame");

function controls() {
  return {
    density: Number(document.getElementById("densityInput").value) / 100,
    curvature: Number(document.getElementById("curvatureInput").value) / 100,
    complexity: Number(document.getElementById("complexityInput").value) / 100
  };
}

function persistInputs() {
  try { localStorage.setItem("symboldna-inputs", JSON.stringify({ identity: document.getElementById("identityInput").value, intent: document.getElementById("intentSelect").value })); } catch { /* storage is optional */ }
}

function restoreInputs() {
  try {
    const saved = JSON.parse(localStorage.getItem("symboldna-inputs") || "null");
    if (saved?.identity) document.getElementById("identityInput").value = saved.identity;
    if (saved?.intent && [...document.getElementById("intentSelect").options].some(option => option.value === saved.intent)) document.getElementById("intentSelect").value = saved.intent;
  } catch { /* ignore malformed saved state */ }
}

function generate({ incrementVariation = false } = {}) {
  if (!state.atlas) return;
  if (incrementVariation) state.variation += 1;
  const identity = document.getElementById("identityInput").value;
  const intentId = document.getElementById("intentSelect").value;
  state.blueprint = createBlueprint({ identity, intentId, variation: state.variation, atlas: state.atlas, controls: controls() });
  state.geometry = buildGeometry(state.blueprint);
  const result = renderSymbol({ canvas, frame, blueprint: state.blueprint, geometry: state.geometry, animate: document.getElementById("animationToggle").checked });
  updateCanvasMetadata(state.blueprint);
  renderBlueprintInspector(state.blueprint);
  document.getElementById("canvasLoading").classList.add("hidden");
  diagnostics.success("blueprint", `${state.blueprint.symmetry}-fold blueprint created`);
  diagnostics.success("renderer", `${result.visibleElements} visible elements rendered`);
  setSystemMessage(`System ready. ${state.blueprint.code} reconstructed from Atlas ${state.blueprint.atlasVersion}.`, "ready");
  persistInputs();
}

function bindControls() {
  document.getElementById("generateButton").addEventListener("click", () => { state.variation = 0; generate(); });
  document.getElementById("variationButton").addEventListener("click", () => generate({ incrementVariation: true }));
  document.getElementById("constructionToggle").addEventListener("change", event => setConstructionVisible(frame, event.target.checked));
  document.getElementById("animationToggle").addEventListener("change", () => generate());
  document.getElementById("identityInput").addEventListener("keydown", event => { if (event.key === "Enter") { state.variation = 0; generate(); } });
  document.getElementById("copyCodeButton").addEventListener("click", async () => { if (!state.blueprint) return; await navigator.clipboard?.writeText(state.blueprint.code); document.getElementById("copyCodeButton").textContent = "Copied"; setTimeout(() => document.getElementById("copyCodeButton").textContent = "Copy", 900); });
  [["densityInput","densityOutput"],["curvatureInput","curvatureOutput"],["complexityInput","complexityOutput"]].forEach(([inputId,outputId]) => {
    const input = document.getElementById(inputId); const output = document.getElementById(outputId);
    input.addEventListener("input", () => { output.value = input.value; output.textContent = input.value; });
    input.addEventListener("change", () => generate());
  });
  document.getElementById("exportSvgButton").addEventListener("click", () => state.blueprint && exportSvg(canvas, state.blueprint));
  document.getElementById("exportPngButton").addEventListener("click", () => state.blueprint && exportPng(canvas, state.blueprint));
  document.getElementById("exportJsonButton").addEventListener("click", () => state.blueprint && exportBlueprint(state.blueprint));
  document.getElementById("openDiagnosticsButton").addEventListener("click", () => activateTab("diagnostics"));
  bindTabs();
}

async function bootstrap() {
  diagnostics.success("html", "Application markup found");
  diagnostics.success("js", "ES module bootstrap executed");
  if (!cssIsReady()) throw new Error("Foundation CSS did not load.");
  diagnostics.success("css", "Responsive interface active");
  setSystemMessage("Loading append-only Atlas chunks…", "loading");

  state.atlas = await loadAtlas();
  const summary = atlasSummary(state.atlas);
  diagnostics.success("manifest", `${summary.chunkCount} append-only chunks declared`);
  diagnostics.success("database", `${summary.recordCount} records verified`);
  document.getElementById("atlasVersionBadge").textContent = `Atlas ${summary.version}`;
  document.getElementById("atlasRecordCount").textContent = `${summary.recordCount} records`;
  populateIntentions(state.atlas.byKind.intention_profiles);
  restoreInputs();

  let currentFilter = "all";
  const refreshAtlas = () => renderAtlas(state.atlas, document.getElementById("atlasSearchInput").value, currentFilter);
  buildAtlasFilters(state.atlas, kind => { currentFilter = kind; refreshAtlas(); });
  document.getElementById("atlasSearchInput").addEventListener("input", refreshAtlas);
  refreshAtlas();

  bindControls();
  if (!exporterIsReady()) throw new Error("Browser export APIs are unavailable.");
  diagnostics.success("export", "SVG, PNG, and blueprint exports available");
  generate();

  window.SymbolDNA = Object.freeze({ release: "G0.3.0", atlas: summary, regenerate: () => generate(), getBlueprint: () => state.blueprint });
}

bootstrap().catch(error => {
  console.error("[SymbolDNA] Startup failed", error);
  diagnostics.failRemaining(["html","css","js","manifest","database","blueprint","renderer","export"], error);
  setSystemMessage(`Startup failed: ${error.message}`, "error");
  document.getElementById("canvasLoading").textContent = "Startup failed — open Diagnostics";
  activateTab("diagnostics");
});
