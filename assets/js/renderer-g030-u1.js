const SVG_NS = "http://www.w3.org/2000/svg";

function svg(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function setDelay(element, delay) { element.style.setProperty("--delay", `${delay}ms`); }

function prepareAnimatedPath(element) {
  requestAnimationFrame(() => {
    try {
      const length = Math.ceil(element.getTotalLength());
      element.style.setProperty("--path-length", String(Math.max(1, length)));
    } catch { element.style.setProperty("--path-length", "2000"); }
  });
}

export function setConstructionVisible(frame, visible) {
  frame.classList.toggle("show-construction", Boolean(visible));
}

export function renderSymbol({ canvas, frame, blueprint, geometry, animate = true }) {
  const circleLayer = canvas.querySelector("#constructionCircleLayer");
  const lineLayer = canvas.querySelector("#constructionLineLayer");
  const anchorLayer = canvas.querySelector("#anchorLayer");
  const curveLayer = canvas.querySelector("#curveLayer");
  const glyphLayer = canvas.querySelector("#glyphLayer");
  const terminalLayer = canvas.querySelector("#terminalLayer");
  if (![circleLayer,lineLayer,anchorLayer,curveLayer,glyphLayer,terminalLayer].every(Boolean)) throw new Error("One or more SVG layers are missing.");
  for (const layer of [circleLayer,lineLayer,anchorLayer,curveLayer,glyphLayer,terminalLayer]) layer.replaceChildren();

  document.documentElement.style.setProperty("--symbol-color", blueprint.palette.primary);
  document.documentElement.style.setProperty("--symbol-secondary", blueprint.palette.secondary);
  document.documentElement.style.setProperty("--construction-color", blueprint.palette.construction);
  document.documentElement.style.setProperty("--aura-color", blueprint.palette.aura);

  geometry.constructionCircles.forEach(item => {
    const element = svg("circle", { cx: item.cx, cy: item.cy, r: item.r, class: "construction-draw" });
    setDelay(element, item.delay); circleLayer.append(element);
  });
  geometry.constructionLines.forEach(item => {
    const element = svg("line", { x1: item.x1, y1: item.y1, x2: item.x2, y2: item.y2, class: "construction-draw" });
    setDelay(element, item.delay); lineLayer.append(element);
  });
  geometry.anchors.forEach(item => {
    const element = svg("circle", { cx: item.x, cy: item.y, r: 3.7, class: "construction-draw" });
    setDelay(element, item.delay); anchorLayer.append(element);
  });
  geometry.boundaries.forEach(item => {
    const element = svg("circle", { cx: item.cx, cy: item.cy, r: item.r, class: `draw-path ${item.className || ""}`.trim() });
    setDelay(element, item.delay); prepareAnimatedPath(element); curveLayer.append(element);
  });
  geometry.visiblePaths.forEach(item => {
    const target = item.className === "glyph-path" ? glyphLayer : curveLayer;
    const element = svg("path", { d: item.d, class: `draw-path ${item.className || ""}`.trim() });
    setDelay(element, item.delay); prepareAnimatedPath(element); target.append(element);
  });
  geometry.terminals.forEach(item => {
    const element = svg("circle", { cx: item.cx, cy: item.cy, r: item.r, class: "construction-draw" });
    setDelay(element, item.delay); terminalLayer.append(element);
  });

  frame.classList.remove("is-animating");
  if (animate) requestAnimationFrame(() => frame.classList.add("is-animating"));
  const stopDelay = animate ? 2200 : 0;
  window.clearTimeout(renderSymbol.animationTimer);
  renderSymbol.animationTimer = window.setTimeout(() => frame.classList.remove("is-animating"), stopDelay);

  return {
    constructionElements: circleLayer.childElementCount + lineLayer.childElementCount + anchorLayer.childElementCount,
    visibleElements: curveLayer.childElementCount + glyphLayer.childElementCount + terminalLayer.childElementCount
  };
}
