import { seededRandom } from "./random-g030-u1.js";

const TAU = Math.PI * 2;
const CENTER = Object.freeze({ x: 500, y: 500 });

function polar(radius, angle) {
  return { x: CENTER.x + Math.cos(angle) * radius, y: CENTER.y + Math.sin(angle) * radius };
}

function fmt(value) { return Number(value.toFixed(2)); }

function catmullRomClosedPath(points, tension = .5) {
  if (points.length < 3) return "";
  let path = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let index = 0; index < points.length; index += 1) {
    const p0 = points[(index - 1 + points.length) % points.length];
    const p1 = points[index];
    const p2 = points[(index + 1) % points.length];
    const p3 = points[(index + 2) % points.length];
    const c1 = { x: p1.x + (p2.x - p0.x) * tension / 6, y: p1.y + (p2.y - p0.y) * tension / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) * tension / 6, y: p2.y - (p3.y - p1.y) * tension / 6 };
    path += ` C ${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return `${path} Z`;
}

function openSmoothPath(points, tension = .42) {
  if (points.length < 2) return "";
  if (points.length === 2) return `M ${fmt(points[0].x)} ${fmt(points[0].y)} L ${fmt(points[1].x)} ${fmt(points[1].y)}`;
  let path = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) * tension / 6, y: p1.y + (p2.y - p0.y) * tension / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) * tension / 6, y: p2.y - (p3.y - p1.y) * tension / 6 };
    path += ` C ${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return path;
}

function identityGlyph(identity, symmetry, random) {
  const chars = [...identity.toUpperCase()].filter(char => /[A-Z0-9]/.test(char)).slice(0, 12);
  const ringRadius = 130;
  const points = chars.map((char, index) => {
    const code = char.charCodeAt(0);
    const angleIndex = (code + index * 3) % symmetry;
    const angle = -Math.PI / 2 + angleIndex * TAU / symmetry;
    const radius = ringRadius * (.55 + ((code % 7) / 12));
    return polar(radius, angle + (random() - .5) * .08);
  });
  const deduped = [];
  for (const point of points) {
    if (!deduped.some(existing => Math.hypot(existing.x - point.x, existing.y - point.y) < 22)) deduped.push(point);
  }
  return deduped.length >= 2 ? openSmoothPath([{...CENTER}, ...deduped, {...CENTER}], .34) : "";
}

function branchPaths(blueprint, rings, random) {
  const paths = [];
  const branches = Math.max(3, Math.round(blueprint.symmetry * (.45 + blueprint.density * .35)));
  for (let index = 0; index < branches; index += 1) {
    const angle = -Math.PI / 2 + blueprint.axisAngle + index * TAU / branches;
    const points = [{...CENTER}];
    for (let ring = 1; ring < rings.length; ring += 1) {
      const bend = Math.sin((ring + index) * 1.7) * blueprint.curvature * .16;
      points.push(polar(rings[ring] * (.72 + random() * .22), angle + bend));
    }
    paths.push(openSmoothPath(points, .5 + blueprint.curvature * .25));
  }
  return paths;
}

export function buildGeometry(blueprint) {
  const random = seededRandom(`${blueprint.seed}::geometry`);
  const outerRadius = 365 + blueprint.density * 35;
  const rings = Array.from({ length: blueprint.ringCount }, (_, index) => outerRadius * (index + 1) / blueprint.ringCount);
  const constructionCircles = rings.map((radius, index) => ({ cx: 500, cy: 500, r: fmt(radius), delay: index * 55 }));
  const constructionLines = [];
  const anchors = [];

  for (let sector = 0; sector < blueprint.symmetry; sector += 1) {
    const angle = -Math.PI / 2 + blueprint.axisAngle + sector * TAU / blueprint.symmetry;
    const end = polar(outerRadius, angle);
    constructionLines.push({ x1: 500, y1: 500, x2: fmt(end.x), y2: fmt(end.y), delay: 110 + sector * 28 });
    rings.forEach((radius, ringIndex) => {
      const jitter = 1 + (random() - .5) * blueprint.anchorJitter;
      const point = polar(radius * jitter, angle);
      anchors.push({ x: fmt(point.x), y: fmt(point.y), ring: ringIndex, sector, delay: 180 + ringIndex * 35 + sector * 8 });
    });
  }

  const visiblePaths = [];
  const primaryPoints = [];
  const secondaryPoints = [];
  for (let sector = 0; sector < blueprint.symmetry; sector += 1) {
    const base = -Math.PI / 2 + blueprint.axisAngle + sector * TAU / blueprint.symmetry;
    const wave = Math.sin(sector * Math.PI * (blueprint.topology === "petal matrix" ? 1 : 2) / blueprint.symmetry);
    const primaryRadius = outerRadius * (.74 + blueprint.density * .16 + wave * blueprint.complexity * .08 + (random() - .5) * .04);
    const secondaryRadius = outerRadius * (.34 + blueprint.curvature * .16 + Math.cos(sector * 1.8) * .04);
    primaryPoints.push(polar(primaryRadius, base + Math.sin(sector * 1.3) * blueprint.curvature * .04));
    secondaryPoints.push(polar(secondaryRadius, base + TAU / blueprint.symmetry * .5));
  }
  visiblePaths.push({ d: catmullRomClosedPath(primaryPoints, .42 + blueprint.curvature * .5), className: "primary", delay: 440 });
  visiblePaths.push({ d: catmullRomClosedPath(secondaryPoints, .4 + blueprint.curvature * .4), className: "secondary", delay: 610 });

  if (blueprint.grammar.name === "deterministic-derivation-tree") {
    branchPaths(blueprint, rings, random).forEach((d, index) => visiblePaths.push({ d, className: index % 2 ? "secondary" : "primary", delay: 650 + index * 55 }));
  } else if (blueprint.grammar.name === "hidden-radial-field") {
    for (let sector = 0; sector < blueprint.symmetry; sector += 1) {
      const angle = -Math.PI / 2 + blueprint.axisAngle + sector * TAU / blueprint.symmetry;
      const p0 = polar(rings[0] * .25, angle);
      const p1 = polar(outerRadius * .48, angle + blueprint.curvature * .18);
      const p2 = polar(outerRadius * .82, angle - blueprint.curvature * .12);
      visiblePaths.push({ d: openSmoothPath([p0,p1,p2], .75), className: sector % 2 ? "secondary" : "primary", delay: 650 + sector * 45 });
    }
  } else {
    const glyph = identityGlyph(blueprint.identity, blueprint.symmetry, random);
    if (glyph) visiblePaths.push({ d: glyph, className: "glyph-path", delay: 720 });
  }

  const boundaries = [];
  for (let index = 0; index < blueprint.boundaryCount; index += 1) {
    boundaries.push({ cx: 500, cy: 500, r: fmt(outerRadius * (1 - index * .075)), className: index === 0 ? "boundary-primary" : "secondary", delay: 360 + index * 80 });
  }

  const terminals = [];
  for (let index = 0; index < blueprint.terminalCount; index += 1) {
    const angle = -Math.PI / 2 + blueprint.axisAngle + index * TAU / blueprint.terminalCount;
    const point = polar(outerRadius * .82, angle);
    terminals.push({ cx: fmt(point.x), cy: fmt(point.y), r: fmt(4.5 + blueprint.complexity * 3), delay: 920 + index * 28 });
  }

  return Object.freeze({ center: CENTER, constructionCircles, constructionLines, anchors, visiblePaths, boundaries, terminals });
}
