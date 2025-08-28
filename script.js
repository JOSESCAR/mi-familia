const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Estrellas estáticas
const stars = Array.from({ length: 120 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: Math.random() * 1.5 + 0.5
}));

// Sprites
const parejaImg = new Image(); parejaImg.src = "assets/pareja.png";
const perro1 = new Image(); perro1.src = "assets/perro1.png";
const perro2 = new Image(); perro2.src = "assets/perro2.png";
const estrellaImg = new Image(); estrellaImg.src = "assets/estrella.png";

// Animación de la estrella fugaz
const shootingStar = {
  x: canvas.width + 100,
  y: Math.random() * canvas.height / 2,
  speed: 12,
  active: false
};

// Alternancia de frames del perro
let perroFrame = 0;
let lastSwitch = performance.now();

function drawStars() {
  ctx.fillStyle = "white";
  stars.forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPareja() {
  const w = 150, h = 150;
  ctx.drawImage(parejaImg, canvas.width / 2 - w / 2, canvas.height - h - 30, w, h);
}

function drawPerro(time) {
  if (time - lastSwitch > 600) {
    perroFrame = (perroFrame + 1) % 2;
    lastSwitch = time;
  }
  const img = perroFrame === 0 ? perro1 : perro2;
  ctx.drawImage(img, canvas.width / 2 - 20, canvas.height - 160, 40, 40);
}

function drawShootingStar() {
  if (shootingStar.active) {
    ctx.drawImage(estrellaImg, shootingStar.x, shootingStar.y, 50, 25);
    shootingStar.x -= shootingStar.speed;
    shootingStar.y += shootingStar.speed * 0.2;
    if (shootingStar.x < -60) {
      shootingStar.active = false;
      shootingStar.x = canvas.width + 100;
      shootingStar.y = Math.random() * canvas.height / 3;
    }
  } else if (Math.random() < 0.004) {
    shootingStar.active = true;
  }
}

function loop(time) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStars();
  drawShootingStar();
  drawPareja();
  drawPerro(time);
  requestAnimationFrame(loop);
}

Promise.all([
  new Promise(r => parejaImg.onload = r),
  new Promise(r => perro1.onload = r),
  new Promise(r => perro2.onload = r),
  new Promise(r => estrellaImg.onload = r),
]).then(() => {
  requestAnimationFrame(loop);
});
