import { seededRandom } from "./symbol-code.js";

const SIZE = 1200;

export function prepareCanvas(canvas) {
  if (canvas.width !== SIZE || canvas.height !== SIZE) {
    canvas.width = SIZE;
    canvas.height = SIZE;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, SIZE, SIZE);
  return ctx;
}

function point(cx, cy, radius, angle) {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}

function stroke(ctx, alpha = 0.72, width = 4, glow = 18) {
  ctx.strokeStyle = `rgba(226,220,255,${alpha})`;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(139,124,255,.72)";
  ctx.shadowBlur = glow;
}

function clearGlow(ctx) {
  ctx.shadowBlur = 0;
}

function drawBackdrop(ctx, random) {
  const gradient = ctx.createRadialGradient(
    SIZE * (0.37 + random() * 0.2),
    SIZE * (0.30 + random() * 0.18),
    SIZE * 0.02,
    SIZE / 2,
    SIZE / 2,
    SIZE * 0.7,
  );
  gradient.addColorStop(0, "#2a2440");
  gradient.addColorStop(0.43, "#0d0c14");
  gradient.addColorStop(1, "#040406");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function drawBoundary(ctx, plan, radius, layer) {
  const { dna, order, phase, boundaryMode } = plan;
  const polygon = boundaryMode === "polygon" || (boundaryMode === "mixed" && layer % 2 === 0);
  stroke(ctx, 0.25 + layer * 0.075, 3.2 + layer * 0.55, 22);
  ctx.beginPath();
  if (!polygon) {
    ctx.arc(SIZE / 2, SIZE / 2, radius, 0, Math.PI * 2);
  } else {
    const sides = Math.max(4, Math.min(13, order));
    for (let index = 0; index <= sides; index += 1) {
      const angle = phase + index * Math.PI * 2 / sides;
      const [x, y] = point(SIZE / 2, SIZE / 2, radius, angle);
      index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
  }
  ctx.stroke();
  clearGlow(ctx);

  if (dna.nesting > 0.56 && layer === 0) {
    ctx.strokeStyle = "rgba(188,174,255,.15)";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 14]);
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, radius * 0.92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawPathNetwork(ctx, plan, nodes) {
  const { dna, pathStep, pathMode } = plan;
  stroke(ctx, 0.52 + dna.connectivity * 0.28, 4.2 + dna.connectivity * 3.2, 20);
  ctx.beginPath();
  const visited = new Set();
  let index = 0;
  for (let count = 0; count <= nodes.length; count += 1) {
    const node = nodes[index];
    if (!node) break;
    if (count === 0) ctx.moveTo(node[0], node[1]);
    else if (pathMode === "curved") {
      const previous = nodes[(index - pathStep + nodes.length) % nodes.length];
      const controlX = SIZE / 2 + (previous[0] + node[0] - SIZE) * (0.17 + dna.flow * 0.22);
      const controlY = SIZE / 2 + (previous[1] + node[1] - SIZE) * (0.17 + dna.flow * 0.22);
      ctx.quadraticCurveTo(controlX, controlY, node[0], node[1]);
    } else ctx.lineTo(node[0], node[1]);
    visited.add(index);
    index = (index + pathStep) % nodes.length;
    if (visited.has(index) && count > 1) break;
  }
  ctx.closePath();
  ctx.stroke();
  clearGlow(ctx);

  if (dna.radiality > 0.42) {
    ctx.strokeStyle = `rgba(190,177,255,${0.10 + dna.radiality * 0.22})`;
    ctx.lineWidth = 2.2;
    for (const [x, y] of nodes) {
      ctx.beginPath();
      ctx.moveTo(SIZE / 2, SIZE / 2);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
}

function drawCentralGlyph(ctx, plan, random, radius) {
  const { dna, armCount, armSteps, phase } = plan;
  stroke(ctx, 0.76, 5.6, 28);
  for (let arm = 0; arm < armCount; arm += 1) {
    const base = phase + arm * Math.PI * 2 / armCount;
    ctx.beginPath();
    ctx.moveTo(SIZE / 2, SIZE / 2);
    let last = [SIZE / 2, SIZE / 2];
    for (let step = 1; step <= armSteps; step += 1) {
      const progress = step / armSteps;
      const wave = Math.sin(progress * Math.PI * (1.2 + dna.connectivity * 2.4));
      const jitter = (random() - 0.5) * (0.03 + (1 - dna.radiality) * 0.12);
      const angle = base + wave * dna.flow * 0.48 + jitter;
      const rr = radius * progress * (0.77 + dna.centrality * 0.19);
      const current = point(SIZE / 2, SIZE / 2, rr, angle);
      if (dna.angularity < 0.52 && step > 1) {
        const control = point(last[0], last[1], rr * 0.08, angle - 0.7);
        ctx.quadraticCurveTo(control[0], control[1], current[0], current[1]);
      } else ctx.lineTo(current[0], current[1]);
      last = current;
    }
    if (random() < dna.connectivity * 0.45) ctx.lineTo(SIZE / 2, SIZE / 2);
    ctx.stroke();
  }
  clearGlow(ctx);
}

function drawMotif(ctx, x, y, radius, motif, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  if (motif === "square" || motif === "grid") ctx.rect(-radius, -radius, radius * 2, radius * 2);
  else if (motif === "diamond") {
    ctx.moveTo(0, -radius); ctx.lineTo(radius, 0); ctx.lineTo(0, radius); ctx.lineTo(-radius, 0); ctx.closePath();
  } else if (motif === "triangle") {
    for (let i = 0; i <= 3; i += 1) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 3;
      i ? ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius) : ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
  } else if (motif === "star") {
    for (let i = 0; i <= 10; i += 1) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 ? radius * 0.42 : radius;
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  } else if (motif === "cross") {
    ctx.moveTo(-radius, 0); ctx.lineTo(radius, 0); ctx.moveTo(0, -radius); ctx.lineTo(0, radius);
  } else ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawTerminals(ctx, plan, radius) {
  const { dna, terminalCount, phase, motifs } = plan;
  const motifCycle = motifs.length ? motifs : ["circle", "diamond"];
  stroke(ctx, 0.72, 3.2, 18);
  for (let index = 0; index < terminalCount; index += 1) {
    const angle = phase + index * Math.PI * 2 / terminalCount;
    const [x, y] = point(SIZE / 2, SIZE / 2, radius * (0.82 + dna.repetition * 0.06), angle);
    drawMotif(ctx, x, y, 8 + dna.repetition * 8, motifCycle[index % motifCycle.length], angle);
  }
  clearGlow(ctx);
}

function drawCenter(ctx, plan) {
  const { dna, centerMode, motifs } = plan;
  const radius = 24 + dna.centrality * 38;
  stroke(ctx, 0.96, 6.8, 34);
  ctx.beginPath();
  if (centerMode === "network" || motifs.includes("diamond")) {
    ctx.moveTo(SIZE / 2, SIZE / 2 - radius);
    ctx.lineTo(SIZE / 2 + radius, SIZE / 2);
    ctx.lineTo(SIZE / 2, SIZE / 2 + radius);
    ctx.lineTo(SIZE / 2 - radius, SIZE / 2);
    ctx.closePath();
  } else ctx.arc(SIZE / 2, SIZE / 2, radius, 0, Math.PI * 2);
  ctx.stroke();
  clearGlow(ctx);
  ctx.fillStyle = "rgba(245,239,255,.86)";
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, Math.max(4, radius * 0.12), 0, Math.PI * 2);
  ctx.fill();
}

export function drawAtlasSymbol(canvas, plan) {
  const ctx = prepareCanvas(canvas);
  const random = seededRandom(plan.renderKey);
  drawBackdrop(ctx, random);
  const outerRadius = SIZE * (0.33 + plan.dna.boundary * 0.055);

  for (let layer = 0; layer < plan.layers; layer += 1) {
    drawBoundary(ctx, plan, outerRadius * (1 - layer * plan.ringSpacing), layer);
  }

  const nodeRadius = outerRadius * (0.61 + plan.dna.radiality * 0.12);
  const nodes = Array.from({ length: plan.order }, (_, index) => point(
    SIZE / 2,
    SIZE / 2,
    nodeRadius,
    plan.phase + index * Math.PI * 2 / plan.order,
  ));
  drawPathNetwork(ctx, plan, nodes);
  drawCentralGlyph(ctx, plan, random, outerRadius * (0.42 + plan.dna.flow * 0.08));
  drawTerminals(ctx, plan, outerRadius);
  drawCenter(ctx, plan);
  return canvas;
}

export function saveCanvas(canvas, name) {
  const link = document.createElement("a");
  link.download = name;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
