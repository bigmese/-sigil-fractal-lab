import {glowStroke,clearGlow} from "./renderer.js";

export function renderCosmology(ctx,dna,random,time=0){
  const w=ctx.canvas.width,cx=w/2,cy=w/2;
  const breath=Math.sin(time*.001)*.5+.5;
  const rings=3+Math.floor(dna.complexity*7);
  const sectors=4+Math.floor(dna.repetition*12);
  const maxR=w*(.30+dna.enclosure*.10+breath*.007);

  for(let i=1;i<=rings;i++){
    glowStroke(ctx,`rgba(172,151,255,${.24+i/rings*.46})`,Math.max(1,w*.0023),15);
    ctx.beginPath();
    ctx.arc(cx,cy,maxR*i/rings,0,Math.PI*2);
    ctx.stroke();
  }
  clearGlow(ctx);

  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate((dna.orientation-.5)*Math.PI*.7);
  for(let i=0;i<sectors;i++){
    const a=i*Math.PI*2/sectors;
    ctx.strokeStyle="rgba(215,205,255,.27)";
    ctx.lineWidth=Math.max(1,w*.0016);
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(a)*maxR,Math.sin(a)*maxR);
    ctx.stroke();
  }
  ctx.restore();

  const nodes=4+Math.floor(dna.connectivity*12);
  for(let i=0;i<nodes;i++){
    const ring=1+Math.floor(random()*rings);
    const a=random()*Math.PI*2;
    const rr=maxR*ring/rings;
    const x=cx+Math.cos(a)*rr;
    const y=cy+Math.sin(a)*rr;
    glowStroke(ctx,"rgba(230,223,255,.9)",Math.max(2,w*.0024),16);
    ctx.beginPath();
    ctx.arc(x,y,w*(.007+random()*.008),0,Math.PI*2);
    ctx.stroke();
    clearGlow(ctx);

    if(random()<dna.connectivity){
      ctx.strokeStyle="rgba(194,180,255,.22)";
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.lineTo(x,y);
      ctx.stroke();
    }
  }

  glowStroke(ctx,"rgba(255,245,231,.98)",w*.006,28);
  ctx.beginPath();
  ctx.arc(cx,cy,w*(.025+dna.centrality*.032+breath*.002),0,Math.PI*2);
  ctx.stroke();
  clearGlow(ctx);

  return [
    ["Family grammar","Concentric hierarchy with radial divisions"],
    ["Primary center",dna.centrality>.65?"Dominant celestial hub":"Distributed multi-node map"],
    ["Orientation",dna.orientation>.55?"Directional map":"Near-rotational map"],
    ["Evidence level","Map structure supported; universal symbolism unproven"]
  ];
}
