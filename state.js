import {DEFAULT_DNA,cloneDNA} from "./dna.js";

export const state={
  mode:"seal",
  seed:"first-sigil",
  variation:0,
  dna:cloneDNA(DEFAULT_DNA),
  breathing:false
};

export function resetDNA(){
  state.dna=cloneDNA(DEFAULT_DNA);
}
