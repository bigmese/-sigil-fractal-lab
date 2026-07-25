export const DNA_SCHEMA = [
  ["enclosure","Enclosure"],
  ["centrality","Centrality"],
  ["connectivity","Connectivity"],
  ["repetition","Repetition"],
  ["orientation","Orientation"],
  ["complexity","Complexity"],
  ["curvature","Curvature"],
  ["symmetry","Symmetry"],
  ["entropy","Entropy"]
];

export const DEFAULT_DNA = {
  enclosure:.72,
  centrality:.78,
  connectivity:.58,
  repetition:.55,
  orientation:.62,
  complexity:.67,
  curvature:.56,
  symmetry:.48,
  entropy:.28
};

export const cloneDNA = (dna=DEFAULT_DNA) => ({...dna});

export function mutateDNA(dna, random, strength=.18){
  const result={};
  for(const [key] of DNA_SCHEMA){
    const value=dna[key]+(random()-.5)*strength*2;
    result[key]=Math.max(0,Math.min(1,value));
  }
  return result;
}
