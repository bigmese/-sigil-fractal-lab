import { choose, clamp, hashString, normalizedCode, seededRandom } from "./random.js";

const SYMMETRIES = [4, 5, 6, 7, 8, 9, 12];
const TOPOLOGIES = ["radial lattice", "nested field", "orbital weave", "axial convergence", "petal matrix"];

function profileFor(atlas, id) {
  return atlas.byKind.intention_profiles.find(profile => profile.id === id) || atlas.byKind.intention_profiles[0];
}

function grammarNumber(grammar) {
  const match = grammar.id.match(/(\d+)$/);
  return match ? String(Number(match[1])).padStart(2, "0") : "00";
}

function selectGrammar(atlas, profile, random) {
  const grammars = atlas.byKind.grammars;
  const preferred = grammars.filter(grammar => profile.preferred_grammars.includes(grammar.name));
  return choose(random, preferred.length ? preferred : grammars);
}

export function createBlueprint({ identity, intentId, variation = 0, atlas, controls = {} }) {
  const normalizedIdentity = identity.trim() || "Untitled identity";
  const seed = `${normalizedIdentity.toLocaleLowerCase()}::${intentId}::${variation}`;
  const random = seededRandom(seed);
  const profile = profileFor(atlas, intentId);
  const grammar = selectGrammar(atlas, profile, random);

  const profileSymmetries = profile.symmetry_choices.filter(value => SYMMETRIES.includes(value));
  const symmetry = choose(random, profileSymmetries.length ? profileSymmetries : SYMMETRIES);
  const userDensity = controls.density ?? .55;
  const userCurvature = controls.curvature ?? .68;
  const userComplexity = controls.complexity ?? .58;
  const density = clamp(profile.density * .66 + userDensity * .34);
  const curvature = clamp(profile.curvature * .66 + userCurvature * .34);
  const complexity = clamp(profile.complexity * .66 + userComplexity * .34);
  const boundaryCount = Math.max(1, Math.min(4, profile.boundary_count + (random() > .8 ? 1 : 0)));
  const ringCount = Math.max(boundaryCount + 1, 2 + Math.round(complexity * 3));
  const topology = profile.topology || choose(random, TOPOLOGIES);
  const centerRole = profile.center_role || "identity";
  const traversal = profile.traversal_mode || "derived_path";
  const axisAngle = (random() - .5) * (profile.axis_variance ?? .28);
  const anchorJitter = .03 + complexity * .06;
  const terminalCount = Math.max(3, Math.round(symmetry * (.55 + density * .55)));
  const identityHash = hashString(normalizedIdentity);
  const code = `SD-A01-G${grammarNumber(grammar)}-${normalizedCode(seed)}`;

  const rules = [
    {
      title: `${symmetry}-fold structure`,
      explanation: `${profile.label} selected ${symmetry}-fold radial organization from the experimental intent profile, then the seed fixed the exact orientation.`,
      source: profile.id,
      evidence: profile.status
    },
    {
      title: `${boundaryCount} bounded field${boundaryCount === 1 ? "" : "s"}`,
      explanation: "Enclosure defines an operational domain. The Atlas explicitly rejects treating every circle as protection alone.",
      source: "atlas-000001 / corr-000002",
      evidence: "corpus-derived + rejected universal claim"
    },
    {
      title: grammar.name,
      explanation: grammar.description || `Applied operators: ${grammar.operators.join(", ")}.`,
      source: grammar.id,
      evidence: grammar.status
    },
    {
      title: "Hidden construction scaffold",
      explanation: "Circles, axes, radial divisions, and anchor points organize the final curves; they are hidden unless Construction View is enabled.",
      source: "hyp-000001 / grammar-000003",
      evidence: "experimental"
    },
    {
      title: "Deterministic identity encoding",
      explanation: "The identity text and variation number generate a reproducible seed. The same inputs reconstruct the same blueprint and symbol.",
      source: `hash-${identityHash}`,
      evidence: "system rule"
    }
  ];

  return Object.freeze({
    release: "G0.3.0",
    code,
    seed,
    identity: normalizedIdentity,
    intentId: profile.id,
    intentLabel: profile.label,
    intentStatus: profile.status,
    variation,
    grammar: Object.freeze(grammar),
    symmetry,
    topology,
    centerRole,
    traversal,
    boundaryCount,
    ringCount,
    density,
    curvature,
    complexity,
    axisAngle,
    anchorJitter,
    terminalCount,
    palette: Object.freeze(profile.palette),
    rules: Object.freeze(rules),
    atlasVersion: atlas.manifest.database_version,
    generatedAt: new Date().toISOString()
  });
}
