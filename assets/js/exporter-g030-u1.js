function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(code, extension) { return `${code || "SymbolDNA"}.${extension}`.replace(/[^a-z0-9_.-]/gi, "-"); }

export function exportBlueprint(blueprint) {
  downloadBlob(new Blob([JSON.stringify(blueprint, null, 2)], { type: "application/json" }), safeFilename(blueprint.code, "json"));
}

export function exportSvg(canvas, blueprint) {
  const clone = canvas.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  const computed = getComputedStyle(document.documentElement);
  style.textContent = `
    .canvas-background{fill:#03050a}.canvas-aura{fill:${computed.getPropertyValue("--aura-color").trim()};opacity:.12}
    .construction-layer{display:none}.curve-layer{fill:none;stroke:${computed.getPropertyValue("--symbol-color").trim()};stroke-width:5.5;stroke-linecap:round;stroke-linejoin:round}
    .curve-layer .secondary{stroke:${computed.getPropertyValue("--symbol-secondary").trim()};stroke-width:3.3;opacity:.82}
    .glyph-layer{fill:none;stroke:${computed.getPropertyValue("--symbol-color").trim()};stroke-width:4.1;stroke-linecap:round;stroke-linejoin:round}
    .terminal-layer{fill:${computed.getPropertyValue("--symbol-secondary").trim()};stroke:#03050a;stroke-width:3}
  `;
  clone.prepend(style);
  const xml = new XMLSerializer().serializeToString(clone);
  downloadBlob(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }), safeFilename(blueprint.code, "svg"));
}

export function exportPng(canvas, blueprint) {
  const clone = canvas.cloneNode(true);
  clone.querySelectorAll(".construction-layer").forEach(layer => layer.remove());
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const computed = getComputedStyle(document.documentElement);
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `.canvas-background{fill:#03050a}.canvas-aura{fill:${computed.getPropertyValue("--aura-color").trim()};opacity:.12}.curve-layer{fill:none;stroke:${computed.getPropertyValue("--symbol-color").trim()};stroke-width:5.5;stroke-linecap:round;stroke-linejoin:round}.curve-layer .secondary{stroke:${computed.getPropertyValue("--symbol-secondary").trim()};stroke-width:3.3;opacity:.82}.glyph-layer{fill:none;stroke:${computed.getPropertyValue("--symbol-color").trim()};stroke-width:4.1;stroke-linecap:round;stroke-linejoin:round}.terminal-layer{fill:${computed.getPropertyValue("--symbol-secondary").trim()};stroke:#03050a;stroke-width:3}`;
  clone.prepend(style);
  const xml = new XMLSerializer().serializeToString(clone);
  const svgUrl = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  const image = new Image();
  image.onload = () => {
    const bitmap = document.createElement("canvas"); bitmap.width = 2000; bitmap.height = 2000;
    const context = bitmap.getContext("2d"); context.fillStyle = "#03050a"; context.fillRect(0,0,2000,2000); context.drawImage(image,0,0,2000,2000);
    URL.revokeObjectURL(svgUrl);
    bitmap.toBlob(blob => { if (blob) downloadBlob(blob, safeFilename(blueprint.code, "png")); }, "image/png");
  };
  image.onerror = () => { URL.revokeObjectURL(svgUrl); throw new Error("PNG export could not render the SVG."); };
  image.src = svgUrl;
}

export function exporterIsReady() { return typeof Blob === "function" && typeof XMLSerializer === "function"; }
