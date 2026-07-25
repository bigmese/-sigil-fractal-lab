export function prepareCanvas(canvas){
  const width=Math.max(720,Math.floor(canvas.getBoundingClientRect().width*Math.min(devicePixelRatio||1,2)));
  if(canvas.width!==width||canvas.height!==width){
    canvas.width=width;
    canvas.height=width;
  }
  const ctx=canvas.getContext("2d");
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,width,width);
  return ctx;
}

export function drawBackdrop(ctx,a,b){
  const w=ctx.canvas.width;
  const gradient=ctx.createRadialGradient(
    w*(.38+a*.18),w*(.34+b*.16),w*.03,
    w*.5,w*.5,w*.72
  );
  gradient.addColorStop(0,"#272039");
  gradient.addColorStop(.45,"#0d0b14");
  gradient.addColorStop(1,"#040406");
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,w,w);
}

export function glowStroke(ctx,color,width,blur=18){
  ctx.strokeStyle=color;
  ctx.lineWidth=width;
  ctx.shadowColor=color;
  ctx.shadowBlur=blur;
  ctx.lineCap="round";
  ctx.lineJoin="round";
}

export function clearGlow(ctx){ctx.shadowBlur=0}

export function saveCanvas(canvas,name){
  const link=document.createElement("a");
  link.download=name;
  link.href=canvas.toDataURL("image/png");
  link.click();
}
