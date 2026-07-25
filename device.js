import {glowStroke,clearGlow} from "./renderer.js";

export function renderDevice(ctx,dna,random,time=0){
  const w=ctx.canvas.width;
  const breath=Math.sin(time*.001)*.5+.5;
  const y=w*.53;
  const boxW=w*.18,boxH=w*.13;
  const left=w*.10,right=w*.72,center=w*.5;

  ctx.strokeStyle="rgba(171,151,255,.72)";
  ctx.lineWidth=w*.004;
  ctx.beginPath();ctx.roundRect(left,y-boxH/2,boxW,boxH,w*.018);ctx.stroke();
  ctx.beginPath();ctx.roundRect(right,y-boxH/2,boxW,boxH,w*.018);ctx.stroke();

  glowStroke(ctx,"rgba(226,216,255,.94)",w*.005,22);
  ctx.beginPath();
  ctx.arc(center,y,w*(.075+dna.centrality*.035+breath*.004),0,Math.PI*2);
  ctx.stroke();
  clearGlow(ctx);

  ctx.strokeStyle="rgba(215,203,255,.55)";
  ctx.lineWidth=w*.004;
  ctx.beginPath();
  ctx.moveTo(left+boxW,y);
  ctx.lineTo(center-w*.11,y);
  ctx.moveTo(center+w*.11,y);
  ctx.lineTo(right,y);
  ctx.stroke();

  const modules=4+Math.floor(dna.repetition*8);
  const radius=w*.20;
  for(let i=0;i<modules;i++){
    const a=-Math.PI/2+i*Math.PI*2/modules;
    const x=center+Math.cos(a)*radius;
    const yy=y+Math.sin(a)*radius;

    ctx.strokeStyle="rgba(154,132,255,.68)";
    ctx.lineWidth=w*.0026;
    ctx.beginPath();
    ctx.arc(x,yy,w*(.022+.008*dna.complexity),0,Math.PI*2);
    ctx.stroke();

    ctx.beginPath();
    for(let s=0;s<24;s++){
      const t=s/23*Math.PI*4;
      const rr=w*.018*s/23;
      const sx=x+Math.cos(t)*rr;
      const sy=yy+Math.sin(t)*rr;
      s?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy);
    }
    ctx.stroke();

    if(random()<dna.connectivity){
      ctx.strokeStyle="rgba(192,178,255,.22)";
      ctx.beginPath();
      ctx.moveTo(x,yy);
      ctx.lineTo(center,y);
      ctx.stroke();
    }
  }

  const selectorY=w*.18;
  const selectorR=w*.085;
  const sectors=4+Math.floor(dna.repetition*8);
  ctx.strokeStyle="rgba(208,198,255,.5)";
  ctx.lineWidth=w*.0025;
  ctx.beginPath();
  ctx.arc(center,selectorY,selectorR,0,Math.PI*2);
  ctx.stroke();
  for(let i=0;i<sectors;i++){
    const a=i*Math.PI*2/sectors;
    ctx.beginPath();
    ctx.moveTo(center,selectorY);
    ctx.lineTo(center+Math.cos(a)*selectorR,selectorY+Math.sin(a)*selectorR);
    ctx.stroke();
  }

  ctx.fillStyle="rgba(255,255,255,.78)";
  ctx.font=`${Math.floor(w*.023)}px -apple-system,sans-serif`;
  ctx.textAlign="center";
  ctx.fillText("INPUT",left+boxW/2,y+w*.008);
  ctx.fillText("TRANSFORM",center,y+w*.008);
  ctx.fillText("OUTPUT",right+boxW/2,y+w*.008);
  ctx.fillText("SELECTOR",center,selectorY-selectorR-w*.018);

  return [
    ["Family grammar","Input → transformation → output"],
    ["Primary hub","Central processing region with satellite modules"],
    ["Variable slots","Input and output remain replaceable"],
    ["Evidence level","Interface structure supported; meaning is user-defined"]
  ];
}
