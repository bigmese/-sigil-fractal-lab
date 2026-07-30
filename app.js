(() => {
  'use strict';
  const ATLAS_VERSION = 'A0.1.0';
  const GENERATOR_VERSION = 'G0.2.1';
  const PROFILE_PATH = 'database/generator/generator-profile-A0.1.0.json';
  const OBS_PATH = 'database/observations/observations-0001.jsonl';
  const GEO_PATH = 'database/geometry/geometry-families-0001.jsonl';
  const els = {};
  const state = {profile:null, observations:new Map(), geometries:new Map(), selected:[], recipe:null, cousin:0};
  const DIMENSIONS=['boundary','centrality','radiality','connectivity','nesting','angularity','flow','repetition'];

  document.addEventListener('DOMContentLoaded', init);
  async function init(){
    ['atlasStatus','saveButton','birthDate','birthTime','birthLocation','selectedCount','intentGrid','generateButton','cousinButton','symbolCode','codeState','copyButton','recreateButton','errorBox','formLabel','versionLabel','symbolSvg','emptyState','symbolSummary','dnaBars','evidenceList'].forEach(id=>els[id]=document.getElementById(id));
    els.generateButton.addEventListener('click',()=>generate(false));
    els.cousinButton.addEventListener('click',()=>{state.cousin++;generate(false)});
    els.copyButton.addEventListener('click',copyCode);
    els.recreateButton.addEventListener('click',recreate);
    els.saveButton.addEventListener('click',savePng);
    renderBars(Object.fromEntries(DIMENSIONS.map(k=>[k,0])));
    try{
      const [manifest,profile,obsText,geoText] = await Promise.all([
        fetchJson('database/manifest.json'), fetchJson(PROFILE_PATH), fetchText(OBS_PATH), fetchText(GEO_PATH)
      ]);
      if(!manifest.snapshot || !profile.intents) throw new Error('Atlas files are present but incomplete.');
      state.profile=profile;
      parseJsonl(obsText).forEach(x=>state.observations.set(x.observation_id,x));
      parseJsonl(geoText).forEach(x=>state.geometries.set(x.geometry_id,x));
      renderIntents(profile.intents);
      setStatus(`Atlas ${ATLAS_VERSION} connected`,'ready');
      els.versionLabel.textContent=`${ATLAS_VERSION} · ${GENERATOR_VERSION}`;
      els.generateButton.disabled=false;
    }catch(err){
      console.error(err); setStatus('Atlas load failed','error'); showError(`${err.message} Check that database/manifest.json and the Atlas JSON files are in the repository.`);
    }
  }
  async function fetchJson(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(`${path} returned ${r.status}`);return r.json()}
  async function fetchText(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(`${path} returned ${r.status}`);return r.text()}
  function parseJsonl(text){return text.split(/\r?\n/).filter(Boolean).map((line,i)=>{try{return JSON.parse(line)}catch(e){throw new Error(`Invalid JSONL line ${i+1}`)}})}
  function setStatus(text,kind){els.atlasStatus.textContent=text;els.atlasStatus.className=`status ${kind}`}
  function showError(text){els.errorBox.textContent=text;els.errorBox.classList.remove('hidden')}
  function clearError(){els.errorBox.classList.add('hidden');els.errorBox.textContent=''}

  function renderIntents(intents){
    els.intentGrid.innerHTML='';
    Object.entries(intents).forEach(([key,data])=>{
      const b=document.createElement('button');b.className='intent';b.type='button';b.textContent=data.label;b.dataset.key=key;
      b.addEventListener('click',()=>toggleIntent(key,b));els.intentGrid.appendChild(b)
    })
  }
  function toggleIntent(key,button){
    const i=state.selected.indexOf(key);
    if(i>=0){state.selected.splice(i,1);button.classList.remove('selected')}
    else if(state.selected.length<3){state.selected.push(key);button.classList.add('selected')}
    else showError('Choose up to three intentions.');
    els.selectedCount.textContent=`${state.selected.length} selected`;clearError();
  }

  function generate(fromCode){
    clearError();
    if(!state.profile){showError('Atlas is not ready.');return}
    if(!fromCode && state.selected.length===0){showError('Choose at least one intention.');return}
    let recipe;
    if(fromCode) recipe=state.recipe;
    else {
      const identityHash=hashString([els.birthDate.value,els.birthTime.value,els.birthLocation.value.trim().toLowerCase()].join('|'));
      const baseSeed=hashString(`${identityHash}|${state.selected.join(',')}|${state.cousin}|${ATLAS_VERSION}`);
      recipe=buildRecipe(identityHash,baseSeed,state.selected,state.cousin);
      state.recipe=recipe;
      els.symbolCode.value=encodeRecipe(recipe);
    }
    draw(recipe); updateUi(recipe);
  }

  function buildRecipe(identityHash,seed,intents,cousin){
    const rng=mulberry32(seed); const profiles=intents.map(k=>state.profile.intents[k]).filter(Boolean);
    const dna={}; DIMENSIONS.forEach(dim=>{
      const vals=profiles.map(p=>Number(p.structural_profile?.[dim] ?? p.dimension_profile?.[dim] ?? state.profile.global_baseline?.[dim] ?? .5));
      const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:Number(state.profile.global_baseline?.[dim]||.5);
      dna[dim]=clamp(avg*.84+(rng()-.5)*.16,0,1)
    });
    const obs=weightedUnique(profiles.flatMap(p=>(p.ranked_observations||[]).slice(0,10)),rng,6,'id');
    const geo=weightedUnique(profiles.flatMap(p=>(p.ranked_geometry||[]).slice(0,8)),rng,4,'id');
    return {format:'SymbolDNA-v2',atlas:ATLAS_VERSION,generator:GENERATOR_VERSION,identity:identityHash.toString(36),intentions:intents,cousin,seed,dna,observations:obs,geometries:geo,created:new Date().toISOString().slice(0,10)}
  }
  function weightedUnique(items,rng,count,key){
    const by=new Map();items.forEach(x=>{if(x&&x[key])by.set(x[key],Math.max(Number(x.score)||1,by.get(x[key])||0))});
    const pool=[...by.entries()].map(([id,score])=>({id,score}));const out=[];
    while(pool.length&&out.length<count){const total=pool.reduce((s,x)=>s+x.score,0);let r=rng()*total,idx=0;for(;idx<pool.length;idx++){r-=pool[idx].score;if(r<=0)break}out.push(pool[Math.min(idx,pool.length-1)].id);pool.splice(Math.min(idx,pool.length-1),1)}return out
  }

  function draw(recipe){
    const svg=els.symbolSvg; svg.innerHTML=''; const rng=mulberry32(recipe.seed); const d=recipe.dna;
    const ns='http://www.w3.org/2000/svg';
    const defs=document.createElementNS(ns,'defs');defs.innerHTML='<filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><radialGradient id="bg"><stop offset="0" stop-color="#201a35"/><stop offset="1" stop-color="#08070d"/></radialGradient>';svg.appendChild(defs);
    add('rect',{x:0,y:0,width:800,height:800,fill:'url(#bg)'});
    const cx=400,cy=400; const rings=1+Math.round(d.nesting*3); for(let i=0;i<rings;i++){add('circle',{cx,cy,r:285-i*22,fill:'none',stroke:'#8d89a8','stroke-width':1.4,opacity:.32+.12*i})}
    const order=Math.max(5,Math.min(13,5+Math.round(d.radiality*6)+Math.floor(rng()*2)));const radius=220;const pts=[];
    for(let i=0;i<order;i++){const a=-Math.PI/2+i*2*Math.PI/order;const rr=radius*(.92+rng()*.12);pts.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr])}
    const skip=1+Math.max(1,Math.round((d.connectivity*.7+d.angularity*.3)*(order/2-1)));let path='';for(let i=0;i<order;i++){const p=pts[(i*skip)%order];path+=(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)}path+='Z';add('path',{d:path,fill:'none',stroke:'#c6c2e8','stroke-width':2,opacity:.8,filter:'url(#glow)'});
    pts.forEach((p,i)=>{if(rng()<.45+d.repetition*.45)add('circle',{cx:p[0],cy:p[1],r:4.5+d.centrality*3,fill:'#f1efff',opacity:.92,filter:'url(#glow)'})});
    const arms=Math.max(4,Math.min(14,Math.round(4+d.repetition*8)));for(let j=0;j<arms;j++){const base=-Math.PI/2+j*2*Math.PI/arms;let r=35;let p=`M ${cx} ${cy}`;const segments=3+Math.round(d.flow*4);for(let s=0;s<segments;s++){r+=32+(rng()*28);const bend=(rng()-.5)*(1-d.radiality)*1.7+(s%2?1:-1)*d.angularity*.12;const a=base+bend;const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;p+=` L ${x.toFixed(1)} ${y.toFixed(1)}`}add('path',{d:p,fill:'none',stroke:'#dcd8ff','stroke-width':2.2,opacity:.82,'stroke-linecap':'round','stroke-linejoin':'round',filter:'url(#glow)'})}
    const petals=5+Math.round(d.centrality*4);let center='';for(let i=0;i<petals*2;i++){const a=-Math.PI/2+i*Math.PI/petals;const r=i%2?20:52;const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;center+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}center+='Z';add('path',{d:center,fill:'rgba(139,108,255,.10)',stroke:'#f2efff','stroke-width':2.6,filter:'url(#glow)'});
    function add(tag,attrs){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));svg.appendChild(e);return e}
    els.emptyState.classList.add('hidden');els.saveButton.disabled=false;
    recipe.render={order,rings,arms,skip};
  }

  function updateUi(r){
    const labels=r.intentions.map(k=>state.profile.intents[k]?.label||k);els.symbolSummary.textContent=`${labels.join(' + ')} · order ${r.render.order} · ${r.render.rings} boundary layers · cousin ${r.cousin}`;
    els.formLabel.textContent='Atlas structural glyph';els.codeState.textContent='Generated';els.copyButton.disabled=false;els.cousinButton.disabled=false;renderBars(r.dna);renderEvidence(r);els.versionLabel.textContent=`${r.atlas} · ${r.generator}`
  }
  function renderBars(dna){els.dnaBars.innerHTML='';DIMENSIONS.forEach(k=>{const v=clamp(Number(dna[k]||0),0,1);const row=document.createElement('div');row.className='dna-row';row.innerHTML=`<strong>${title(k)}</strong><div class="bar"><span style="width:${Math.round(v*100)}%"></span></div><em>${Math.round(v*100)}</em>`;els.dnaBars.appendChild(row)})}
  function renderEvidence(r){els.evidenceList.innerHTML='';[...r.observations,...r.geometries].forEach(id=>{const rec=state.observations.get(id)||state.geometries.get(id);const item=document.createElement('div');item.className='evidence-item';const name=rec?.title||rec?.family_name||rec?.geometry_name||'Atlas record';const detail=rec?.classification||rec?.construction_grammar||rec?.description||'Structural support record';item.innerHTML=`<strong>${escapeHtml(id)} — ${escapeHtml(name)}</strong><span>${escapeHtml(String(detail).slice(0,210))}</span>`;els.evidenceList.appendChild(item)});if(!els.evidenceList.children.length)els.evidenceList.innerHTML='<p class="muted">No evidence records selected.</p>'}

  function encodeRecipe(r){const json=JSON.stringify(r);const bytes=new TextEncoder().encode(json);let binary='';bytes.forEach(b=>binary+=String.fromCharCode(b));return 'SDNA2.'+btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')+'.'+hashString(json).toString(36)}
  function decodeRecipe(code){const parts=code.trim().split('.');if(parts.length!==3||parts[0]!=='SDNA2')throw new Error('This is not a SymbolDNA v2 code.');let b64=parts[1].replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';const bin=atob(b64);const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));const json=new TextDecoder().decode(bytes);if(hashString(json).toString(36)!==parts[2])throw new Error('The Symbol Code checksum does not match.');return JSON.parse(json)}
  function recreate(){clearError();try{const r=decodeRecipe(els.symbolCode.value);if(r.atlas!==ATLAS_VERSION)throw new Error(`This release contains ${ATLAS_VERSION}; the code requests ${r.atlas}.`);state.recipe=r;state.selected=[...r.intentions];document.querySelectorAll('.intent').forEach(b=>b.classList.toggle('selected',state.selected.includes(b.dataset.key)));els.selectedCount.textContent=`${state.selected.length} selected`;state.cousin=r.cousin||0;generate(true)}catch(e){showError(e.message)}}
  async function copyCode(){try{await navigator.clipboard.writeText(els.symbolCode.value);els.codeState.textContent='Copied'}catch{els.symbolCode.select();document.execCommand('copy');els.codeState.textContent='Copied'}}
  function savePng(){const xml=new XMLSerializer().serializeToString(els.symbolSvg);const img=new Image();const blob=new Blob([xml],{type:'image/svg+xml'});const url=URL.createObjectURL(blob);img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=1600;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,1600,1600);URL.revokeObjectURL(url);c.toBlob(p=>{const a=document.createElement('a');a.href=URL.createObjectURL(p);a.download=`SymbolDNA-${state.recipe?.identity||'symbol'}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)},'image/png')};img.src=url}

  function hashString(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function mulberry32(a){return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function title(s){return s.charAt(0).toUpperCase()+s.slice(1)}
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
})();
