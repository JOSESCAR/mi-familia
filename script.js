(() => {
  // ---------- Utilidades de error visibles ----------
  const errBox = document.getElementById('err');
  function showError(message, source, line, col, err) {
    errBox.hidden = false;
    errBox.textContent =
      '[ERROR] ' + message +
      (source ? '\nFuente: ' + source : '') +
      (line ? '\nLínea: ' + line + (col ? ', Col: ' + col : '') : '') +
      (err && err.stack ? '\nStack:\n' + err.stack : '');
    console.error(message, source, line, col, err);
    return true;
  }
  window.onerror = showError;
  window.addEventListener('unhandledrejection', e =>
    showError('Promise rejection', '', 0, 0, e.reason)
  );

  // ---------- Canvas ----------
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d'); // API 2D simple
  function fit() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    ctx.imageSmoothingEnabled = false; // pixel nítido
  }
  addEventListener('resize', fit);
  fit();

  // ---------- Parámetros ----------
  // "Tamaño de pixel" virtual para construir sprites
  const PX = Math.max(2, Math.floor(Math.min(canvas.width, canvas.height) / 400));

  // Capas ciudad (parallax)
  const cityLayers = [
    { color: '#1c2a4a', speed: 0.2, buildings: [] }, // más lejos
    { color: '#213058', speed: 0.35, buildings: [] },
    { color: '#28396d', speed: 0.55, buildings: [] } // más cerca
  ];

  // Genera edificios rectangulares pixelados para cada capa
  function buildCity() {
    const H = canvas.height;
    const W = canvas.width;
    const baseCounts = [14, 11, 9];
    cityLayers.forEach((layer, i) => {
      layer.buildings.length = 0;
      const n = baseCounts[i] * (W / 1280);
      for (let k = 0; k < n; k++) {
        const bw = Math.floor((30 + Math.random() * 90) * PX / 2);
        const bh = Math.floor((80 + Math.random() * 220) * PX / 2);
        const x = Math.floor(Math.random() * (W + 200)) - 100;
        const y = H - bh - (40 + i * 12) * PX;
        layer.buildings.push({ x, y, w: bw, h: bh });
      }
    });
  }
  buildCity();

  // Estrellas
  const stars = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * (canvas.height * 0.6),
    r: Math.random() * 1.5 + 0.5,
    a: Math.random() * 0.8 + 0.2,
    w: Math.random() * Math.PI * 2
  }));

  // Estrella fugaz
  const comet = {
    x: canvas.width + 120,
    y: Math.random() * canvas.height * 0.35 + 20 * PX,
    speed: 9,
    active: false,
    trail: []
  };

  // ---------- Dibujo de la habitación / ventana ----------
  function drawRoom() {
    const W = canvas.width, H = canvas.height;

    // Pared oscura
    ctx.fillStyle = '#0e1323';
    ctx.fillRect(0, 0, W, H);

    // Ventana (marco)
    const margin = 28 * PX;
    const frameW = W - margin * 2;
    const frameH = Math.floor(H * 0.55);
    const frameX = margin;
    const frameY = margin;

    // Hueco ventana (cielo)
    ctx.fillStyle = '#08102a';
    ctx.fillRect(frameX, frameY, frameW, frameH);

    // Marcos madera
    ctx.fillStyle = '#5b311d';
    // borde exterior
    ctx.fillRect(frameX - 4 * PX, frameY - 4 * PX, frameW + 8 * PX, 4 * PX);               // top
    ctx.fillRect(frameX - 4 * PX, frameY + frameH, frameW + 8 * PX, 6 * PX);                // bottom
    ctx.fillRect(frameX - 4 * PX, frameY - 4 * PX, 4 * PX, frameH + 10 * PX);               // left
    ctx.fillRect(frameX + frameW, frameY - 4 * PX, 4 * PX, frameH + 10 * PX);               // right
    // travesaño vertical central (dos hojas)
    ctx.fillRect(frameX + Math.floor(frameW / 2) - 2 * PX, frameY, 4 * PX, frameH);

    // Repisas y piso
    ctx.fillStyle = '#151a2c';
    ctx.fillRect(0, Math.floor(H * 0.62), W, H * 0.38); // piso
    // mesa baja
    ctx.fillStyle = '#1b223a';
    ctx.fillRect(margin, H - 90 * PX, 220 * PX, 10 * PX);
    ctx.fillRect(margin + 10 * PX, H - 80 * PX, 200 * PX, 4 * PX);

    // “Luz” tenue de la ciudad entrando
    const glow = ctx.createLinearGradient(0, frameY, 0, frameY + frameH);
    glow.addColorStop(0, 'rgba(20,30,80,0.35)');
    glow.addColorStop(1, 'rgba(20,30,80,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(frameX, frameY, frameW, frameH);

    return { frameX, frameY, frameW, frameH };
  }

  // ---------- Dibujo de ciudad y estrellas dentro de la ventana ----------
  function drawCityAndSky(frame, t) {
    const { frameX, frameY, frameW, frameH } = frame;

    // Cielo gradiente
    const g = ctx.createLinearGradient(0, frameY, 0, frameY + frameH);
    g.addColorStop(0, '#0a1130');
    g.addColorStop(1, '#020712');
    ctx.fillStyle = g;
    ctx.fillRect(frameX, frameY, frameW, frameH);

    // Estrellas
    ctx.save();
    ctx.beginPath();
    ctx.rect(frameX, frameY, frameW, frameH);
    ctx.clip();
    for (const s of stars) {
      const twinkle = 0.6 + 0.4 * Math.sin(t / 900 + s.w);
      ctx.globalAlpha = s.a * twinkle;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(frameX + s.x % frameW, frameY + s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Capas de edificios (parallax)
    cityLayers.forEach((layer, i) => {
      ctx.fillStyle = layer.color;
      for (const b of layer.buildings) {
        const x = frameX + ((b.x - (t * layer.speed) % (frameW + 200) + frameW + 200) % (frameW + 200)) - 100;
        const y = frameY + b.y - (canvas.height - frameH); // ajusta a ventana
        ctx.fillRect(x, y, b.w, b.h);

        // Ventanas puntuales
        if (i > 0 && Math.random() < 0.06) {
          ctx.fillStyle = 'rgba(255,215,120,0.9)';
          const winW = 2 * PX, winH = 2 * PX;
          for (let r = 0; r < 6; r++) {
            const wx = x + 6 * PX + (Math.floor(Math.random() * (b.w - 12 * PX)));
            const wy = y + 6 * PX + r * (winH + 3 * PX);
            ctx.fillRect(wx, wy, winW, winH);
          }
          ctx.fillStyle = layer.color;
        }
      }
    });

    // Estrella fugaz
    if (comet.active) {
      comet.trail.push({ x: comet.x, y: comet.y });
      if (comet.trail.length > 12) comet.trail.shift();

      // rastro
      for (let i = 0; i < comet.trail.length; i++) {
        const p = comet.trail[i];
        ctx.globalAlpha = i / comet.trail.length * 0.6;
        drawComet(p.x, p.y, 1);
      }
      ctx.globalAlpha = 1;

      drawComet(comet.x, comet.y, 1);
      comet.x -= comet.speed;
      comet.y += comet.speed * 0.18;

      const out = comet.x < frameX - 80 || comet.y > frameY + frameH + 40;
      if (out) {
        comet.active = false;
        comet.trail = [];
      }
    } else if (Math.random() < 0.003) {
      // reinicio aleatorio dentro de la ventana
      comet.active = true;
      comet.x = frameX + frameW + 60;
      comet.y = frameY + Math.random() * frameH * 0.4 + 10 * PX;
    }

    ctx.restore();
  }

  // Dibuja un “cometa” pixelado (cabeza + cola)
  function drawComet(x, y, scale) {
    const rad = 4 * PX * scale;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad * 3);
    grad.addColorStop(0, 'rgba(255,255,210,1)');
    grad.addColorStop(1, 'rgba(255,255,210,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, rad * 3, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 14; i++) {
      ctx.globalAlpha = Math.max(0, 0.9 - i * 0.07);
      ctx.fillStyle = 'rgba(255,240,140,1)';
      ctx.fillRect(x + i * 6 * PX, y + (i % 2 ? 1 : -1) * PX, 2 * PX, 1 * PX);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Personajes (pixel art a mano) ----------
  function drawCouple(px, py) {
    const p = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(px + x * PX, py + y * PX, w * PX, h * PX);
    };
    const sil = '#2b3144', coatL = '#7b61ad', coatR = '#ad617b', shoe = '#cfcfcf';

    // sombras asiento
    ctx.fillStyle = 'rgba(20,20,20,.5)';
    ctx.beginPath(); ctx.ellipse(px + 32 * PX, py + 62 * PX, 24 * PX, 3 * PX, 0, 0, Math.PI * 2); ctx.fill();

    // persona izquierda (sentada mirando ventana)
    p(12, 18, 10, 8, sil);   // cabeza
    p(16, 26, 2, 2, sil);    // cuello
    p(10, 28, 14, 16, coatL);// torso
    p(12, 44, 4, 14, sil);   // pierna izq
    p(18, 44, 4, 14, sil);   // pierna der
    p(11, 58, 5, 2, shoe);   // zapatos
    p(18, 58, 5, 2, shoe);

    // persona derecha
    p(36, 18, 10, 8, sil);
    p(40, 26, 2, 2, sil);
    p(34, 28, 14, 16, coatR);
    p(36, 44, 4, 14, sil);
    p(42, 44, 4, 14, sil);
    p(35, 58, 5, 2, shoe);
    p(42, 58, 5, 2, shoe);

    // pequeño brillo entre ambos
    p(30, 34, 4, 4, 'rgba(255,190,190,.45)');
  }

  function drawDog(px, py, lookRight) {
    const p = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      if (lookRight) x = 24 - x - w;
      ctx.fillRect(px + x * PX, py + y * PX, w * PX, h * PX);
    };
    const wht = '#f5f5f5', nose = '#555';

    // cuerpo y cabeza
    p(6, 12, 12, 6, wht);
    p(3, 10, 5, 6, wht);
    // oreja
    p(7, 10, 3, 2, wht); p(9, 8, 1, 2, wht);
    // cola
    p(18, 12, 3, 2, wht); p(20, 10, 1, 2, wht);
    // patas
    p(8, 18, 2, 4, wht); p(14, 18, 2, 4, wht);
    // ojo y nariz
    p(5, 12, 1, 1, nose);
    p(3, 14, 1, 1, nose);
  }

  // ---------- Loop principal ----------
  let dogFrame = 0, lastSwitch = performance.now();

  function loop(t) {
    // Redimensiona si hace falta (por si cambió PX mucho en móviles landscape/portrait)
    if (canvas.width !== innerWidth || canvas.height !== innerHeight) {
      fit();
      buildCity();
    }

    // Dibuja habitación + obtiene marco de ventana
    const frame = drawRoom();

    // Cielo/ciudad dentro del hueco
    drawCityAndSky(frame, t);

    // Pareja sentada frente a la ventana
    const coupleW = 64 * PX, coupleH = 64 * PX;
    const cx = frame.frameX + frame.frameW / 2 - coupleW / 2;
    const cy = frame.frameY + frame.frameH - coupleH / 2 + 12 * PX;
    drawCouple(cx / PX, cy / PX); // pasa en coordenadas “de rejilla”

    // Perrito al centro (parpadeo/alternancia)
    if (t - lastSwitch > 550) { dogFrame = (dogFrame + 1) % 2; lastSwitch = t; }
    const dogLookRight = dogFrame === 1;
    const dx = frame.frameX + frame.frameW / 2 - 12 * PX;
    const dy = cy + 10 * PX;
    drawDog(dx / PX, dy / PX, dogLookRight);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
