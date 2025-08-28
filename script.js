(function(){
  // --- Captura de errores visibles ---
  function showError(msg, src, line, col, err){
    const box = document.createElement('div');
    box.className = 'err';
    box.textContent = '[ERROR] ' + msg +
      (line ? ('\nLínea: ' + line + (col? (', Col: '+col):'')) : '') +
      (src? ('\nFuente: ' + src) : '') +
      (err && err.stack ? ('\nStack:\n' + err.stack) : '');
    document.body.appendChild(box);
    console.error(msg, src, line, col, err);
    return true;
  }
  window.onerror = showError;
  window.addEventListener('unhandledrejection', e => showError('Promise rejection', '', 0, 0, e.reason));

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  function fit(){ canvas.width = innerWidth; canvas.height = innerHeight; ctx.imageSmoothingEnabled = false; }
  addEventListener('resize', fit); fit();

  // Test rápido
  ctx.fillStyle = '#111'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#0f0'; ctx.fillRect(10,10,120,8);
  ctx.fillStyle = '#9cf'; ctx.font = '16px system-ui, Arial'; ctx.fillText('Inicializando animación…', 10, 36);

  // --- Estrellas ---
  const stars = Array.from({length:140}, ()=>({
    x: Math.random()*canvas.width,
    y: Math.random()*canvas.height,
    r: Math.random()*1.5 + 0.5,
    a: Math.random()*0.8 + 0.2,
    w: Math.random()*Math.PI*2
  }));

  function drawStars(t){
    for(const s of stars){
      ctx.globalAlpha = s.a*(0.6+0.4*Math.sin(t/1000+s.w));
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  // --- Sprites pixel art ---
  const PX=2;
  function drawPareja(px,py){
    const p=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(px+x*PX,py+y*PX,w*PX,h*PX);};
    const sil='#46566e',accL='#7b61ad',accR='#ad617b',shoe='#d6d6d6';
    ctx.fillStyle='rgba(30,30,30,.55)';
    ctx.beginPath();ctx.ellipse(px+30*PX,py+58*PX,18*PX,2.5*PX,0,0,Math.PI*2);ctx.fill();
    // izquierda
    p(14,16,8,8,sil); p(17,24,2,2,sil);
    p(12,26,12,14,accL); p(14,40,8,4,sil);
    p(14,44,3,12,sil); p(19,44,3,12,sil);
    p(13,56,4,2,shoe); p(19,56,4,2,shoe);
    // derecha
    p(36,16,8,8,sil); p(39,24,2,2,sil);
    p(34,26,12,14,accR); p(36,40,8,4,sil);
    p(36,44,3,12,sil); p(41,44,3,12,sil);
    p(35,56,4,2,shoe); p(41,56,4,2,shoe);
    // brillo
    p(28,30,4,4,'rgba(255,196,196,.45)');
  }
  function drawDog(px,py,lookRight){
    const p=(x,y,w,h,c)=>{ctx.fillStyle=c;if(lookRight){x=24-x-w;}ctx.fillRect(px+x*PX,py+y*PX,w*PX,h*PX);};
    const wht='#f5f5f5',nose='#555';
    p(6,10,12,6,wht);p(3,8,5,6,wht);
    p(7,8,3,2,wht);p(9,6,1,2,wht);
    p(18,10,3,2,wht);p(20,8,1,2,wht);
    p(8,16,2,4,wht);p(14,16,2,4,wht);
    p(5,10,1,1,nose);p(3,12,1,1,nose);
  }
  function drawComet(x,y,scale){
    const rad=4*scale;
    const grad=ctx.createRadialGradient(x,y,0,x,y,rad*3);
    grad.addColorStop(0,'rgba(255,255,210,1)');
    grad.addColorStop(1,'rgba(255,255,210,0)');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,rad*3,0,Math.PI*2);ctx.fill();
    for(let i=0;i<14;i++){
      ctx.globalAlpha=Math.max(0,.9-i*0.07);
      ctx.fillStyle='rgba(255,240,140,1)';
      ctx.fillRect(x+i*6*scale,y+(i%2?1:-1)*scale,2*scale,1*scale);
    }
    ctx.globalAlpha=1;
  }

  // --- Estado ---
  const shootingStar={x:canvas.width+100,y:Math.random()*canvas.height/2,speed:10,active:false,trail:[]};
  let perroFrame=0,lastSwitch=performance.now();

  // --- Loop ---
  function loop(t){
    const g=ctx.createLinearGradient(0,0,0,canvas.height);
    g.addColorStop(0,'#02030a');g.addColorStop(1,'#000000');
    ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
    drawStars(t);

    if(shootingStar.active){
      shootingStar.trail.push({x:shootingStar.x,y:shootingStar.y});
      if(shootingStar.trail.length>10)shootingStar.trail.shift();
      for(let i=0;i<shootingStar.trail.length;i++){
        const p=shootingStar.trail[i];
        ctx.globalAlpha=i/shootingStar.trail.length*0.7;
        drawComet(p.x,p.y,1);
      }
      ctx.globalAlpha=1;
      drawComet(shootingStar.x,shootingStar.y,1);
      shootingStar.x-=shootingStar.speed;
      shootingStar.y+=shootingStar.speed*0.2;
      if(shootingStar.x<-80){
        shootingStar.active=false;
        shootingStar.x=canvas.width+100;
        shootingStar.y=Math.random()*canvas.height/3;
        shootingStar.trail=[];
      }
    } else if(Math.random()<0.004){shootingStar.active=true;}

    const px=canvas.width/2-75,py=canvas.height-150-30;
    drawPareja(px,py);
    if(t-lastSwitch>600){perroFrame=(perroFrame+1)%2;lastSwitch=t;}
    drawDog(canvas.width/2-20,canvas.height-160,perroFrame===1);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
