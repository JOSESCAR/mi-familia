(() => {
  // ====== Manejo de errores visibles ======
  const errBox = document.getElementById("err");
  function showError(message, source, line, col, err) {
    errBox.hidden = false;
    errBox.textContent =
      "[ERROR] " + message +
      (source ? "\nFuente: " + source : "") +
      (line ? "\nLínea: " + line + (col ? ", Col: " + col : "") : "") +
      (err && err.stack ? "\nStack:\n" + err.stack : "");
    console.error(message, source, line, col, err);
    return true;
  }
  window.onerror = showError;
  window.addEventListener("unhandledrejection", e =>
    showError("Promise rejection", "", 0, 0, e.reason)
  );

  // ====== Canvas con soporte HiDPI ======
  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d");
  let DPR = Math.max(1, Math.min(3, devicePixelRatio || 1));

  function resize() {
    DPR = Math.max(1, Math.min(3, devicePixelRatio || 1));
    const w = innerWidth, h = innerHeight;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // Dibujar en CSS px
    ctx.imageSmoothingEnabled = false;
    recalcScale();
    buildCity();
  }
  addEventListener("resize", resize, { passive: true });
  resize();

  // ====== Escala de "pixel art" adaptativa ======
  let PX = 2;
  function recalcScale() {
    const base = Math.min(innerWidth, innerHeight);
    PX = Math.max(2, Math.floor(base / 360)); // 2..8 aprox
  }

  // ====== Parallax: ciudad por capas ======
  const cityLayers = [
    { color: "#1a2544", speed: 0.18, buildings: [] },
    { color: "#212c58", speed: 0.32, buildings: [] },
    { color: "#2a3772", speed: 0.55, buildings: [] },
  ];

  function buildCity() {
    const W = innerWidth, H = innerHeight;
    const baseCounts = [16, 12, 9];
    cityLayers.forEach((layer, i) => {
      layer.buildings.length = 0;
      const n = Math.round(baseCounts[i] * (W / 1200 + 0.4));
      for (let k = 0; k < n; k++) {
        const bw = Math.floor((32 + Math.random() * 90) * (PX/2));
        const bh = Math.floor((80 + Math.random() * 240) * (PX/2));
        const x = Math.floor(Math.random() * (W + 200)) - 100;
        const y = H - bh - (50 + i * 16) * PX;
        layer.buildings.push({ x, y, w: bw, h: bh, winSeed: Math.random() });
      }
    });
  }

  // ====== Estrellas ======
  const stars = Array.from({ length: 200 }, () => ({
    x: Math.random(),
    y: Math.random() * 0.6,   // parte superior
    r: Math.random() * 1.6 + 0.4,
    a: Math.random() * 0.8 + 0.2,
    w: Math.random() * Math.PI * 2
  }));

  // ====== Cometa (estrella fugaz) ======
  const comet = { x: 0, y: 0, speed: 10, active: false, trail: [] };
  function triggerComet() {
    const frame = windowFrame;
    comet.active = true;
    comet.trail = [];
    comet.x = frame.x + frame.w + 60;
    comet.y = frame.y + Math.random() * frame.h * 0.45 + 8 * PX;
  }
  addEventListener("click", triggerComet);
  addEventListener("touchstart", (e)=>{ triggerComet(); e.preventDefault(); }, {passive:false});

  // ====== Marco de ventana y escena ======
  let windowFrame = { x: 0, y: 0, w: 0, h: 0 };

  function drawRoom() {
    const W = innerWidth, H = innerHeight;

    // Fondo pared
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0b1228");
    bg.addColorStop(1, "#0a1022");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Ventana central con marco redondeado
    const marginX = Math.max(20 * PX, W * 0.06);
    const marginY = Math.max(16 * PX, H * 0.06);
    const fw = Math.max(320, W - marginX * 2);
    const fh = Math.max(200, Math.min(H * 0.62, H - marginY * 2));
    const fx = (W - fw) / 2;
    const fy = marginY;

    // Hueco (cielo)
    roundRect(fx, fy, fw, fh, 8 * PX, "#081024");

    // Borde de madera (doble tono para relieve)
    roundedStroke(fx, fy, fw, fh, 10 * PX, "#6a3c1f");
    roundedStroke(fx, fy, fw, fh, 6 * PX, "rgba(255,180,120,.08)");

    // Traviesa central
    ctx.fillStyle = "#6a3c1f";
    ctx.fillRect(fx + fw/2 - 2*PX, fy + 2*PX, 4*PX, fh - 4*PX);

    // Repisa
    ctx.fillStyle = "#151b2d";
    ctx.fillRect(fx - 8*PX, fy + fh, fw + 16*PX, 6*PX);
    ctx.fillStyle = "#0f1526";
    ctx.fillRect(fx - 8*PX, fy + fh + 6*PX, fw + 16*PX, 6*PX);

    // Piso (sutil)
    ctx.fillStyle = "#0c1222";
    ctx.fillRect(0, fy + fh + 12*PX, W, H - (fy + fh + 12*PX));

    windowFrame = { x: fx, y: fy, w: fw, h: fh };
  }

  // util: rect redondeado relleno
  function roundRect(x,y,w,h,r,fill) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }
  // util: borde redondeado
  function roundedStroke(x,y,w,h,th,color) {
    ctx.save();
    ctx.lineWidth = th;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x+8*PX,y);
    ctx.lineTo(x+w-8*PX,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+8*PX);
    ctx.lineTo(x+w,y+h-8*PX);
    ctx.quadraticCurveTo(x+w,y+h,x+w-8*PX,y+h);
    ctx.lineTo(x+8*PX,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-8*PX);
    ctx.lineTo(x,y+8*PX);
    ctx.quadraticCurveTo(x,y,x+8*PX,y);
    ctx.stroke();
    ctx.restore();
  }

  // ====== Cielo y ciudad dentro de la ventana ======
  function drawCityAndSky(t) {
    const { x, y, w, h } = windowFrame;

    // recorte a la ventana
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    // cielo
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#09133a");
    g.addColorStop(1, "#030815");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    // estrellas
    for (const s of stars) {
      const twinkle = 0.6 + 0.4 * Math.sin(t / 900 + s.w);
      ctx.globalAlpha = s.a * twinkle;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x + (s.x * w), y + (s.y * h), s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // capas de edificios (parallax)
    cityLayers.forEach((layer, idx) => {
      for (const b of layer.buildings) {
        const shift = (t * layer.speed) % (w + 200);
        const bx = x + ((b.x - shift + w + 200) % (w + 200)) - 100;
        const by = y + (b.y - (innerHeight - h)); // reubicar al marco
        ctx.fillStyle = layer.color;
        ctx.fillRect(bx, by, b.w, b.h);

        // ventanas encendidas (más cerca = más ventanas)
        if (idx > 0) {
          const rand = (seed) => Math.abs(Math.sin(seed * 9999.123));
          ctx.fillStyle = "rgba(255,220,140,.9)";
          const cols = Math.max(2, Math.floor(b.w / (6*PX)));
          const rows = Math.max(2, Math.floor(b.h / (10*PX)));
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if ((r+c) % 3 === 0 && Math.random() < 0.08 + idx*0.02) {
                const wx = bx + 4*PX + c * 6*PX;
                const wy = by + 4*PX + r * 10*PX;
                ctx.fillRect(wx, wy, 2*PX, 2*PX);
              }
            }
          }
        }
      }
    });

    // cometa
    if (comet.active) {
      comet.trail.push({ x: comet.x, y: comet.y });
      if (comet.trail.length > 14) comet.trail.shift();

      for (let i = 0; i < comet.trail.length; i++) {
        const p = comet.trail[i];
        ctx.globalAlpha = i / comet.trail.length * 0.7;
        drawComet(p.x, p.y);
      }
      ctx.globalAlpha = 1;

      drawComet(comet.x, comet.y);
      comet.x -= comet.speed;
      comet.y += comet.speed * 0.18;

      if (comet.x < x - 100 || comet.y > y + h + 60) {
        comet.active = false;
        comet.trail = [];
      }
    } else if (Math.random() < 0.0025) {
      triggerComet();
    }

    // viñeta suave
    const vign = ctx.createRadialGradient(
      x + w/2, y + h/2, Math.min(w,h)*0.2,
      x + w/2, y + h/2, Math.max(w,h)*0.8
    );
    vign.addColorStop(0, "rgba(0,0,0,0)");
    vign.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.fillStyle = vign;
    ctx.fillRect(x, y, w, h);

    ctx.restore();
  }

  function drawComet(cx, cy) {
    const rad = 4 * PX;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad * 3);
    grad.addColorStop(0, "rgba(255,255,210,1)");
    grad.addColorStop(1, "rgba(255,255,210,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 3, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 16; i++) {
      ctx.globalAlpha = Math.max(0, 0.9 - i * 0.06);
      ctx.fillStyle = "rgba(255,240,140,1)";
      ctx.fillRect(cx + i * 6 * PX, cy + (i % 2 ? 1 : -1) * PX, 2 * PX, 1 * PX);
    }
    ctx.globalAlpha = 1;
  }

  // ====== Personajes (pixel art mejorado) ======
  function drawCouple(px, py) {
    const p = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(px + x*PX, py + y*PX, w*PX, h*PX); };
    const sil = "#263047", coatL = "#8b6fd1", coatR = "#d16f8b", shoe = "#d6d6d6";

    // sombra banco
    ctx.fillStyle = "rgba(20,20,20,.55)";
    ctx.beginPath();
    ctx.ellipse(px + 32*PX, py + 62*PX, 26*PX, 3*PX, 0, 0, Math.PI*2);
    ctx.fill();

    // banco
    p(6,58,52,3,"#1a2136");
    p(10,61,44,2,"#131a2c");

    // persona izquierda
    p(12,18,10,8,sil); p(16,26,2,2,sil);
    p(10,28,14,16,coatL); p(12,44,4,14,sil); p(18,44,4,14,sil);
    p(11,58,5,2,shoe); p(18,58,5,2,shoe);

    // persona derecha
    p(36,18,10,8,sil); p(40,26,2,2,sil);
    p(34,28,14,16,coatR); p(36,44,4,14,sil); p(42,44,4,14,sil);
    p(35,58,5,2,shoe); p(42,58,5,2,shoe);

    // brillo entre ambos
    p(30,34,4,4,"rgba(255,195,195,.45)");
  }

  function drawDog(px, py, lookRight) {
    const p = (x,y,w,h,c) => {
      ctx.fillStyle = c;
      if (lookRight) x = 24 - x - w;
      ctx.fillRect(px + x*PX, py + y*PX, w*PX, h*PX);
    };
    const wht = "#f6f7fb", nose = "#444";
    // cuerpo + cabeza
    p(6,12,12,6,wht); p(3,10,5,6,wht);
    // oreja
    p(7,10,3,2,wht); p(9,8,1,2,wht);
    // cola
    p(18,12,3,2,wht); p(20,10,1,2,wht);
    // patas
    p(8,18,2,4,wht); p(14,18,2,4,wht);
    // ojo/nariz
    p(5,12,1,1,nose); p(3,14,1,1,nose);
  }

  // ====== Loop principal ======
  let dogFrame = 0, lastSwitch = performance.now();

  function loop(t) {
    drawRoom();
    drawCityAndSky(t);

    // pareja
    const cw = 64*PX, ch = 64*PX;
    const cx = windowFrame.x + windowFrame.w/2 - cw/2;
    const cy = windowFrame.y + windowFrame.h - ch/2 + 12*PX;
    drawCouple(cx/PX, cy/PX);

    // perrito (animación simple izquierda/derecha)
    if (t - lastSwitch > 550) { dogFrame = (dogFrame + 1) % 2; lastSwitch = t; }
    const dx = windowFrame.x + windowFrame.w/2 - 12*PX;
    const dy = cy + 10*PX;
    drawDog(dx/PX, dy/PX, dogFrame === 1);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
