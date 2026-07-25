import {glowStroke,clearGlow} from "./renderer.js";

function drawGlyph(ctx,cx,cy,radius,dna,random,breath){
  const arms=3+Math.floor(dna.repetition*7);
  const steps=5+Math.floor(dna.complexity*8);
  glowStroke(ctx,"rgba(225,214,255,.94)",Math.max(3,radius*.018),22);

  for(let arm=0;arm<arms;arm++){
    const base=-Math.PI/2+arm*Math.PI*2/arms;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    for(let s=1;s<=steps;s++){
      const p=s/steps;
      const angle=base+Math.sin(p*Math.PI*(1.4+dna.connectivity*2))*dna.curvature*.55+(random()-.5)*dna.entropy*.5;
      const rr=radius*p*(.74+dna.centrality*.2+breath*.03);
      ctx.lineTo(cx+Math.cos(angle)*rr,cy+Math.sin(angle)*rr);
    }
    if(random()<dna.connectivity) ctx.lineTo(cx,cy);
    ctx.stroke();
  }

  const loops=1+Math.floor(dna.enclosure*4);
  for(let i=0;i<loops;i++){
    const a=random()*Math.PI*2;
    const rr=radius*(.28+random()*.56);
    ctx.beginPath();
    ctx.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,radius*(.035+random()*.03),0,Math.PI*2);
    ctx.stroke();
  }
  clearGlow(ctx);
}

export function renderSeal(ctx,dna,random,time=0){
  const w=ctx.canvas.width,cx=w/2,cy=w/2;
  const breath=Math.sin(time*.001)*.5+.5;
  const outer=w*(.31+dna.enclosure*.08+breath*.007);

  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate((dna.orientation-.5)*.4);
  ctx.translate(-cx,-cy);

  glowStroke(ctx,"rgba(154,132,255,.78)",w*.0055,25);
  ctx.beginPath();
  if(dna.symmetry>.55){
    ctx.arc(cx,cy,outer,0,Math.PI*2);
  }else{
    const sides=4+Math.floor(dna.repetition*5);
    for(let i=0;i<=sides;i++){
      const a=-Math.PI/2+i*Math.PI*2/sides;
      const rr=outer*(1+(random()-.5)*dna.entropy*.08);
      const x=cx+Math.cos(a)*rr;
      const y=cy+Math.sin(a)*rr;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }
  }
  ctx.stroke();
  clearGlow(ctx);

  for(let i=0;i<1+Math.floor(dna.repetition*3);i++){
    ctx.strokeStyle=`rgba(208,194,255,${.14+i*.05})`;
    ctx.lineWidth=Math.max(1,w*.0015);
    ctx.beginPath();
    ctx.arc(cx,cy,outer*(.8-i*.09),0,Math.PI*2);
    ctx.stroke();
  }

  drawGlyph(ctx,cx,cy,outer*.65,dna,random,breath);

  const terminals=3+Math.floor(dna.repetition*8);
  for(let i=0;i<terminals;i++){
    const a=-Math.PI/2+i*Math.PI*2/terminals;
    ctx.fillStyle="rgba(229,221,255,.86)";
    ctx.beginPath();
    ctx.arc(cx+Math.cos(a)*outer*.86,cy+Math.sin(a)*outer*.86,w*.006,0,Math.PI*2);
    ctx.fill();
  }

  ctx.restore();

  return [
    ["Family grammar",dna.enclosure>.6?"Circular enclosed seal":"Open emblematic seal"],
    ["Central operator","Dominant glyph with controlled family mutation"],
    ["Perimeter behavior",dna.repetition>.55?"Repeated terminal markers":"Sparse terminal markers"],
    ["Evidence level","Structure supported; spiritual meaning remains provisional"]
  ];
}
