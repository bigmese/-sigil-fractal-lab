import { complexityOf } from "./dna.js";
import { hashString } from "./symbol-code.js";

function coprimeStep(order, desired) {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  let step = Math.max(1, Math.min(order - 1, desired));
  while (step < order && gcd(order, step) !== 1) step += 1;
  return step >= order ? 1 : step;
}

export function mapSynthesisToArchitecture(synthesis) {
  const dna = synthesis.dna;
  const order = Math.max(3, Math.min(13, synthesis.order));
  const desiredStep = 1 + Math.floor(dna.connectivity * Math.max(1, order - 2));
  const pathStep = coprimeStep(order, desiredStep);
  const complexity = complexityOf(dna);
  const hash = hashString(synthesis.renderKey);
  const phase = ((hash % 3600) / 3600) * Math.PI * 2 - Math.PI / 2;

  const boundaryMode = dna.angularity > 0.62 ? "polygon" : dna.boundary > 0.68 ? "circle" : "mixed";
  const pathMode = dna.flow > 0.62 && dna.angularity < 0.58 ? "curved" : "linear";
  const centerMode = dna.centrality > 0.67 ? "dominant" : dna.connectivity > 0.65 ? "network" : "quiet";

  return {
    ...synthesis,
    order,
    pathStep,
    phase,
    complexity,
    boundaryMode,
    pathMode,
    centerMode,
    terminalCount: Math.max(order, 3 + Math.round(dna.repetition * 9)),
    armCount: 3 + Math.round(dna.repetition * 7),
    armSteps: 5 + Math.round(complexity * 8),
    ringSpacing: 0.07 + (1 - dna.nesting) * 0.045,
    architectureDecisions: [
      ["Armature", "The existing center, rings, radial positions, and paths remain the placement skeleton."],
      ["Boundary", `${boundaryMode} enclosure across ${synthesis.layers} structural layers`],
      ["Organization", `${order}-position field with path step ${pathStep}`],
      ["Path grammar", `${pathMode} paths; connectivity ${dna.connectivity.toFixed(2)}; flow ${dna.flow.toFixed(2)}`],
      ["Center", `${centerMode} center; centrality ${dna.centrality.toFixed(2)}`],
      ["Evidence policy", "Atlas structures are recombined as construction rules; source figures are not copied."],
    ],
  };
}
