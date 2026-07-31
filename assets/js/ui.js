const SVG_NS = "http://www.w3.org/2000/svg";

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }

  return element;
}

export function setSystemStatus(message, state = "loading") {
  const status = document.getElementById("system-status");

  if (!status) {
    throw new Error("System status element was not found.");
  }

  status.textContent = message;
  status.dataset.state = state;
}

export function initializeCanvas() {
  const svg = document.getElementById("construction-canvas");
  const constructionLayer = document.getElementById("construction-layer");
  const symbolLayer = document.getElementById("symbol-layer");

  if (!(svg instanceof SVGElement)) {
    throw new Error("Construction canvas is unavailable.");
  }

  if (!(constructionLayer instanceof SVGGElement)) {
    throw new Error("Construction layer is unavailable.");
  }

  if (!(symbolLayer instanceof SVGGElement)) {
    throw new Error("Symbol layer is unavailable.");
  }

  constructionLayer.replaceChildren();
  symbolLayer.replaceChildren();

  const center = 500;
  const radii = [120, 230, 350];

  for (const radius of radii) {
    constructionLayer.append(
      createSvgElement("circle", {
        cx: center,
        cy: center,
        r: radius
      })
    );
  }

  const divisions = 8;

  for (let index = 0; index < divisions; index += 1) {
    const angle = (Math.PI * 2 * index) / divisions;
    const x = center + Math.cos(angle) * 350;
    const y = center + Math.sin(angle) * 350;

    constructionLayer.append(
      createSvgElement("line", {
        x1: center,
        y1: center,
        x2: x,
        y2: y
      })
    );

    constructionLayer.append(
      createSvgElement("circle", {
        cx: x,
        cy: y,
        r: 5,
        fill: "currentColor",
        stroke: "none"
      })
    );
  }

  symbolLayer.append(
    createSvgElement("path", {
      d: [
        "M 500 150",
        "C 610 245, 755 390, 850 500",
        "C 755 610, 610 755, 500 850",
        "C 390 755, 245 610, 150 500",
        "C 245 390, 390 245, 500 150",
        "Z"
      ].join(" ")
    })
  );

  symbolLayer.append(
    createSvgElement("circle", {
      cx: center,
      cy: center,
      r: 120
    })
  );

  return {
    viewBox: svg.getAttribute("viewBox"),
    constructionElementCount: constructionLayer.childElementCount,
    symbolElementCount: symbolLayer.childElementCount
  };
}

export function displayAtlasSummary(summary) {
  const status = [
    "System ready.",
    `${summary.name} ${summary.version} loaded.`,
    `${summary.recordCount} Atlas records present.`,
    summary.appendOnly ? "Append-only mode confirmed." : ""
  ]
    .filter(Boolean)
    .join(" ");

  setSystemStatus(status, "ready");
}
