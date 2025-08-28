(() => {
  // ====== ERRORES VISIBLES ======
  const errBox = document.getElementById("err");
  function showError(message, source, line, col, err){
    if (!errBox) return false;
    errBox.hidden = false;
    errBox.textContent = "[ERROR] " + message +
      (source? "\nFuente: "+source:"") +
      (line? "\nLínea: "+line+(col? ", Col: "+col:""):"") +
      (err && err.stack? "\nStack:\n"+err.stack:"");
    console.error(message, source, line, col, err);
    return true;
  }
  window.onerror = showError;
  window.addEventListener("unhandledrejection", e => showError("Promise rejection","",0,0,e.reason));

  // ====== ESCALA PIXEL (usa var para evitar TDZ) ======
  var PX = 2; // <-- ¡con var!
  function recalcScale(){
    const base = Math.min(innerWidth, innerHeight);
    PX = Math.max(2, Math.floor(base/360));
  }

  // ====== CANVAS HIDPI ======
  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d");
  let DPR = Math.max(1, Math.min(3, devicePixelRatio || 1));

  // ====== DATOS DE ESCENA (definidos antes de resize) ======
  const cityLayers = [
    { color:"#1a2544", speed:0.18, buildings:[] },
    { color:"#212c58", speed:0.32, buildings:[] },
    { color:"#2a3772", speed:0.55, buildings:[] },
  ];
  function buildCity(){
    const W=innerWidth, H=innerHeight;
    const base=[16,12,9];
    cityLayers.forEach((L,i)=>{
      L.buildings.length=0;
      const n=Math.round(base[i]*(W/1200+0.4));
      for(let k=0;k<n;k++){
        const bw=Math.floor((32+Math.random()*90)*(PX/2));
        const bh=Math.floor((80+Math.random()*240)*(PX/2));
        const x=Math.floor(Math.random()*(W+200))-100;
        const y=H-bh-(50+i*16)*PX;
        L.buildings.push({x,y,w:bw,h:bh});
      }
    });
  }

  const stars = Array.from({length:200},()=>({
    x: Math.random(), y: Math.random()*0.6, r: Math.random()*1.6+0.4,
    a: Math.random()*0.8+0.2, w: Math.random()*Math.PI*2
  }));
  const comet = { x:0,y:0,speed:10,active:false,trail:[] };
  let windowFrame={x:0,y:0,w:0,h:0};

  // ====== RESIZE (se define y luego se llama) ======
  function resize(){
    DPR = Math.max(1, Math.min(3, devicePixelRatio || 1));
    const w = innerWidth, h = innerHeight;
    canvas.width  = Math.floor(w*DPR);
    canvas.height = Math.floor(h*DPR);
    canvas.style.width  = w+"px";
    canvas.style.height = h+"px";
    ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.imageSmoothingEnabled = false;

    recalcScale();    // PX ya existe (var evita TDZ)
    buildCity();
  }
  addEventListener("resize", resize, {passive:true});
  resize();

  // ====== HELPERS DE DIBUJO ======
  function roundRect(x,y,w,h,r,fill){
    ctx.save(); ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); ctx.restore();
  }
  function roundedStroke(x,y,w,h,th,color){
    ctx.save(); ctx.lineWidth=th; ctx.strokeStyle=color; ctx.beginPath();
    ctx.moveTo(x+8*PX,y); ctx.lineTo(x+w-8*PX,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+8*PX);
    ctx.lineTo(x+w,y+h-8*PX);
    ctx.quadraticCurveTo(x+w,y+h,x+w-8*PX,y+h);
    ctx.lineTo(x+8*PX,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-8*PX);
    ctx.lineTo(x,y+8*PX);
    ctx.quadraticCurveTo(x,y,x+8*PX,y);
    ctx.stroke(); ctx.restore();
  }
  function drawSprite(grid, ox, oy, scale = 1){
    const s = PX*scale;
    for(let y=0;y<grid.length;y++){
      for(let x=0;x<grid[0].length;x++){
        const c = grid[y][x]; if(!c) continue;
        ctx.fillStyle = c; ctx.fillRect(ox + x*s, oy + y*s, s, s);
      }
    }
    ctx.fillStyle = "#000";
    for(let y=0;y<grid.length;y++){
      for(let x=0;x<grid[0].length;x++){
        if(!grid[y][x]) continue;
        const nb = [[1,0],[-1,0],[0,1],[0,-1]];
        for(const [dx,dy] of nb){
          const nx=x+dx, ny=y+dy;
          if(ny<0||ny>=grid.length||nx<0||nx>=grid[0].length||!grid[ny][nx]){
            const sPX = PX*scale;
            ctx.fillRect(ox + x*sPX, oy + y*sPX, 1, sPX);
            ctx.fillRect(ox + x*sPX, oy + y*sPX, sPX, 1);
            ctx.fillRect(ox + (x+1)*sPX-1, oy + y*sPX, 1, sPX);
            ctx.fillRect(ox + x*sPX, oy + (y+1)*sPX-1, sPX, 1);
            break;
          }
        }
      }
    }
  }

  // ====== SPRITES ======
  const skin = "#f0bfa1", hairD="#3d3d3d", hairB="#5a3b28";
  const hoodie="#1e72e6", hoodieDark="#1555ad";
  const skirt="#f4f4a6", shoe="#333", dogW="#ffffff", dogG="#e8e8e8";

  function makeCouple(breathePhase=0){
    const w=32,h=32, G = Array.from({length:h},()=>Array(w).fill(null));
    const add=(x,y,w,h,c)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)G[y+j]?.[x+i]=c;};
    add(6,28,20,1,"rgba(0,0,0,.4)"); add(8,29,16,1,"rgba(0,0,0,.4)");
    add(15,10,2,2,skin);
    add(14,6,4,4,hairD); add(14,8,4,2,hairD);
    const b = Math.round(Math.sin(breathePhase)*1);
    add(10,12+b,12,10,hoodie); add(10,16+b,12,1,hoodieDark); add(10,22+b,12,2,hoodieDark);
    add(18,16+b,8,3,hoodie);
    add(20,10,2,2,skin); add(20,8,4,4,hairB);
    add(18,12,10,8,hoodie); add(22,20,6,8,skirt);
    add(12,22+b,2,6,shoe); add(18,22+b,2,6,shoe); add(22,26,2,6,shoe);
    return G;
  }
  function makeDog(frame=0){
    const w=24,h=16, G = Array.from({length:h},()=>Array(w).fill(null));
    const add=(x,y,w,h,c)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)G[y+j]?.[x+i]=c;};
    add(6,6,12,6,dogW); add(3,4,5,6,dogW); add(8,4,2,2,dogW);
    if(frame===0){ add(18,6,3,2,dogW); add(21,5,1,2,dogG); }
    else         { add(18,7,3,2,dogW); add(21,8,1,2,dogG); }
    add(8,12,2,3,dogG); add(14,12,2,3,dogG);
    add(5,6,1,1,"#333"); add(4,8,1,1,"#333");
    return G;
  }

  // ====== INTERACCIÓN ======
  function triggerComet(){ const f=windowFrame; comet.active=true; comet.trail=[]; comet.x=f.x+f.w+60; comet.y=f.y+Math.random()*f.h*0.45+8*PX; }
  addEventListener("click", triggerComet);
  addEventListener("touchstart",(e)=>{triggerComet(); e.preventDefault();},{passive:false});

  // ====== ESCENA ======
  function drawRoom(){
    const W=innerWidth,H=innerHeight;
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,"#0b1228"); bg.addColorStop(1,"#0a1022");
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    const mx=Math.max(16*PX, W*0.06), my=Math.max(12*PX,H*0.06);
    const fw=Math.max(320, W - mx*2);
    const fh=Math.max(220, Math.min(H*0.64, H - my*2));
    const fx=(W - fw)/2, fy=my;

    roundRect(fx,fy,fw,fh,8*PX,"#071022");
    roundedStroke(fx,fy,fw,fh,10*PX,"#6a3c1f");
    roundedStroke(fx,fy,fw,fh,6*PX,"rgba(255,180,120,.08)");
    ctx.fillStyle="#6a3c1f"; ctx.fillRect(fx+fw/2-2*PX, fy+2*PX, 4*PX, fh-4*PX);

    ctx.fillStyle="#151b2d"; ctx.fillRect(fx-8*PX, fy+fh, fw+16*PX, 6*PX);
    ctx.fillStyle="#0f1526"; ctx.fillRect(fx-8*PX, fy+fh+6*PX, fw+16*PX, 6*PX);
    ctx.fillStyle="#0c1222"; ctx.fillRect(0, fy+fh+12*PX, W, H-(fy+fh+12*PX));

    windowFrame={x:fx,y:fy,w:fw,h:fh};
  }

  function drawCityAndSky(t){
    const {x,y,w,h}=windowFrame;
    ctx.save(); ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();

    const g=ctx.createLinearGradient(0,y,0,y+h);
    g.addColorStop(0,"#09133a"); g.addColorStop(1,"#030815");
    ctx.fillStyle=g; ctx.fillRect(x,y,w,h);

    for(const s of stars){
      const tw=0.6+0.4*Math.sin(t/900+s.w);
      ctx.globalAlpha=s.a*tw; ctx.fillStyle="#fff";
      ctx.beginPath(); ctx.arc(x+s.x*w, y+s.y*h, s.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;

    cityLayers.forEach(L=>{
      for(const b of L.buildings){
        const shift=(t*L.speed)%(w+200);
        const bx=x+((b.x-shift+w+200)%(w+200))-100;
        const by=y+(b.y-(innerHeight-h));
        ctx.fillStyle=L.color; ctx.fillRect(bx,by,b.w,b.h);
      }
    });

    function drawComet(cx,cy){
      const rad=4*PX;
      const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,rad*3);
      grad.addColorStop(0,"rgba(255,255,210,1)");
      grad.addColorStop(1,"rgba(255,255,210,0)");
      ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(cx,cy,rad*3,0,Math.PI*2); ctx.fill();
      for(let i=0;i<16;i++){
        ctx.globalAlpha=Math.max(0,0.9-i*0.06);
        ctx.fillStyle="rgba(255,240,140,1)";
        ctx.fillRect(cx+i*6*PX, cy+(i%2?1:-1)*PX, 2*PX, 1*PX);
      }
      ctx.globalAlpha=1;
    }
    if(comet.active){
      comet.trail.push({x:comet.x,y:comet.y});
      if(comet.trail.length>14) comet.trail.shift();
      for(let i=0;i<comet.trail.length;i++){
        const p=comet.trail[i];
        ctx.globalAlpha=i/comet.trail.length*0.7; drawComet(p.x,p.y);
      }
      ctx.globalAlpha=1; drawComet(comet.x,comet.y);
      comet.x -= comet.speed; comet.y += comet.speed*0.18;
      if(comet.x < x-100 || comet.y > y+h+60){ comet.active=false; comet.trail=[]; }
    } else if (Math.random()<0.0025){ triggerComet(); }

    const vign=ctx.createRadialGradient(x+w/2,y+h/2,Math.min(w,h)*0.2, x+w/2,y+h/2,Math.max(w,h)*0.8);
    vign.addColorStop(0,"rgba(0,0,0,0)"); vign.addColorStop(1,"rgba(0,0,0,0.22)");
    ctx.fillStyle=vign; ctx.fillRect(x,y,w,h);

    ctx.restore();
  }

  // ====== LOOP ======
  function makeCouple(breathePhase=0){ /* definido arriba */ }
  function makeDog(frame=0){ /* definido arriba */ }

  let dogFrame=0, lastSwitch=performance.now();
  function loop(t){
    drawRoom();
    drawCityAndSky(t);

    const breathe = (t/1000) % (2*Math.PI);
    const couple = makeCouple(breathe);
    const cw = 64*PX, ch = 64*PX;
    const cx = windowFrame.x + windowFrame.w/2 - cw/2;
    const cy = windowFrame.y + windowFrame.h - ch/2 + 10*PX;
    drawSprite(couple, cx, cy, 2);

    if (t - lastSwitch > 450){ dogFrame=(dogFrame+1)%2; lastSwitch=t; }
    const dog = makeDog(dogFrame);
    const dx = windowFrame.x + windowFrame.w/2 - 12*PX;
    const dy = cy + 12*PX;
    drawSprite(dog, dx, dy, 2);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
