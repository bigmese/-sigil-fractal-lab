import {DNA_SCHEMA,mutateDNA} from "./core/dna.js";
import {state,resetDNA} from "./core/state.js";
import {seededRandom} from "./core/random.js";
import {prepareCanvas,drawBackdrop,saveCanvas} from "./core/renderer.js";
import {renderSeal} from "./engines/seal.js";
import {renderCosmology} from "./engines/cosmology.js";
import {renderDevice} from "./engines/device.js";

const canvas=document.getElementById("artCanvas");
const seedInput=document.getElementById("seedInput");
const sliderHost=document.getElementById("sliderHost");
const dnaReadout=document.getElementById("dnaReadout");
const ruleList=document.getElementById("ruleList");
const engineLabel=document.getElementById("engineLabel");
const seedLabel=document.getElementById("seedLabel");
const breatheButton=document.getElementById("breatheButton");
const sliders=new Map();

for(const [key,label] of DNA_SCHEMA){
  const row=document.createElement("div");
  row.className="slider-row";
  const lab=document.createElement("label");
  lab.textContent=label;
  const input=document.createElement("input");
  input.type="range";
  input.min="0";
  input.max="1";
  input.step=".001";
  input.value=state.dna[key];
  const output=document.createElement("output");
  output.textContent=Number(input.value).toFixed(2);

  input.addEventListener("input",()=>{
    state.dna[key]=Number(input.value);
    output.textContent=Number(input.value).toFixed(2);
    render();
  });

  row.append(lab,input,output);
  sliderHost.append(row);
  sliders.set(key,{input,output});
}

function syncSliders(){
  for(const [key,{input,output}] of sliders){
    input.value=state.dna[key];
    output.textContent=state.dna[key].toFixed(2);
  }
}

function updateDNA(){
  dnaReadout.innerHTML="";
  for(const [key,label] of DNA_SCHEMA){
    const item=document.createElement("div");
    item.className="dna-item";
    item.innerHTML=`<strong>${label}</strong><span>${state.dna[key].toFixed(3)}</span>`;
    dnaReadout.append(item);
  }
}

function updateRules(rules){
  ruleList.innerHTML="";
  for(const [title,text] of rules){
    const item=document.createElement("div");
    item.className="rule";
    item.innerHTML=`<strong>${title}</strong><span>${text}</span>`;
    ruleList.append(item);
  }
}

function render(time=performance.now()){
  const ctx=prepareCanvas(canvas);
  const random=seededRandom(state.seed,state.variation);
  drawBackdrop(ctx,random(),random());

  let rules;
  if(state.mode==="seal"){
    rules=renderSeal(ctx,state.dna,random,state.breathing?time:0);
    engineLabel.textContent="Seal Engine";
  }else if(state.mode==="cosmology"){
    rules=renderCosmology(ctx,state.dna,random,state.breathing?time:0);
    engineLabel.textContent="Cosmological Map Engine";
  }else{
    rules=renderDevice(ctx,state.dna,random,state.breathing?time:0);
    engineLabel.textContent="Symbolic Device Engine";
  }

  seedLabel.textContent=`seed: ${state.seed}`;
  updateDNA();
  updateRules(rules);

  if(state.breathing) requestAnimationFrame(render);
}

document.querySelectorAll(".tab").forEach(button=>{
  button.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    button.classList.add("active");
    state.mode=button.dataset.mode;
    state.variation=0;
    render();
  });
});

seedInput.addEventListener("change",()=>{
  state.seed=seedInput.value.trim()||"seed";
  state.variation=0;
  render();
});

document.getElementById("randomSeedButton").addEventListener("click",()=>{
  state.seed=`sigil-${Math.random().toString(36).slice(2,10)}`;
  seedInput.value=state.seed;
  state.variation=0;
  render();
});

document.getElementById("mutateButton").addEventListener("click",()=>{
  const random=seededRandom(state.seed,state.variation+1000);
  state.dna=mutateDNA(state.dna,random,.22);
  state.variation++;
  syncSliders();
  render();
});

document.getElementById("variationButton").addEventListener("click",()=>{
  state.variation++;
  render();
});

document.getElementById("resetButton").addEventListener("click",()=>{
  resetDNA();
  state.variation=0;
  syncSliders();
  render();
});

breatheButton.addEventListener("click",()=>{
  state.breathing=!state.breathing;
  breatheButton.textContent=state.breathing?"Stop Breathing":"Start Breathing";
  render();
});

document.getElementById("saveButton").addEventListener("click",()=>{
  saveCanvas(canvas,`${state.mode}-${state.seed}.png`);
});

window.addEventListener("resize",()=>render());
render();
