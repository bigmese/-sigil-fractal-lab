import { Diagnostics, cssIsReady } from "./diagnostics.js";
import { getAtlasSummary, loadAtlas } from "./atlas.js";
import {
  displayAtlasSummary,
  initializeCanvas,
  setSystemStatus
} from "./ui.js";

const diagnostics = new Diagnostics();

async function bootstrap() {
  diagnostics.success("html", "Required application markup is present.");
  diagnostics.success("js", "ES module bootstrap executed.");

  if (cssIsReady()) {
    diagnostics.success("css", "Foundation stylesheet is active.");
  } else {
    throw new Error("The foundation stylesheet did not load.");
  }

  setSystemStatus("Loading the Symbol Atlas...", "loading");

  const atlas = await loadAtlas();
  const atlasSummary = getAtlasSummary(atlas);

  diagnostics.success(
    "atlas",
    `${atlasSummary.name} ${atlasSummary.version}; ${atlasSummary.recordCount} records.`
  );

  const canvasSummary = initializeCanvas();

  diagnostics.success(
    "svg",
    `${canvasSummary.constructionElementCount} construction elements and ` +
      `${canvasSummary.symbolElementCount} visible symbol elements rendered.`
  );

  displayAtlasSummary(atlasSummary);

  window.SymbolDNA = Object.freeze({
    version: "G0.3.0",
    atlas: Object.freeze(atlasSummary),
    canvas: Object.freeze(canvasSummary)
  });
}

bootstrap().catch((error) => {
  console.error("[SymbolDNA] Startup failed:", error);

  diagnostics.failRemaining(
    ["html", "css", "js", "atlas", "svg"],
    error
  );

  try {
    setSystemStatus(`Startup failed: ${error.message}`, "error");
  } catch (statusError) {
    console.error("[SymbolDNA] Unable to update startup status:", statusError);
  }
});
