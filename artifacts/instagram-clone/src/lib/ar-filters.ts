import * as faceapi from "face-api.js";

// ─── Types & Interfaces ────────────────────────────────────────────────────────

export type FilterCategory =
  | "All"
  | "Trending"
  | "Beauty"
  | "Animals"
  | "Glasses & Masks"
  | "Interactive AR"
  | "Fantasy & Magic"
  | "Neon & Cyber"
  | "Backgrounds & FX";

export interface InteractiveState {
  mouthOpen: boolean;
  smiling: boolean;
  browsRaised: boolean;
  faceCount: number;
  timeMs: number;
}

export interface ARFilter {
  id: string;
  name: string;
  category: FilterCategory;
  emoji: string;
  description: string;
  isTrending?: boolean;
  isInteractive?: boolean;
  tags: string[];
  draw: (
    ctx: CanvasRenderingContext2D,
    landmarks: faceapi.FaceLandmarks68,
    scale: { sx: number; sy: number },
    state: InteractiveState,
    particles: Particle[]
  ) => void;
  backgroundEffect?: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timeMs: number
  ) => void;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: "heart" | "star" | "fire" | "circle" | "sparkle" | "confetti";
}

// ─── Helper Landmark Calculations ─────────────────────────────────────────────

export function getLandmarkScale(
  landmarks: faceapi.FaceLandmarks68,
  s: { sx: number; sy: number }
) {
  const pts = landmarks.positions;
  const leftEyeOuter = pts[36];
  const rightEyeOuter = pts[45];
  const chin = pts[8];
  const nose = pts[30];
  const topBrow = pts[19];

  const faceW = Math.abs(rightEyeOuter.x - leftEyeOuter.x) * s.sx * 2.2;
  const faceH = Math.abs(chin.y - topBrow.y) * s.sy * 1.3;
  const cx = nose.x * s.sx;
  const cy = nose.y * s.sy;

  return { faceW, faceH, cx, cy, pts };
}

export function detectFaceExpressions(
  landmarks: faceapi.FaceLandmarks68,
  s: { sx: number; sy: number }
): { mouthOpen: boolean; smiling: boolean; browsRaised: boolean } {
  const pts = landmarks.positions;
  // Lip landmarks
  const topLip = pts[51];
  const bottomLip = pts[57];
  const leftMouth = pts[48];
  const rightMouth = pts[54];

  // Eyebrows & Eyes
  const leftBrow = pts[19];
  const leftEyeTop = pts[37];

  const mouthHeight = Math.abs(bottomLip.y - topLip.y) * s.sy;
  const mouthWidth = Math.abs(rightMouth.x - leftMouth.x) * s.sx;

  const browEyeDist = Math.abs(leftEyeTop.y - leftBrow.y) * s.sy;
  const eyeDistance = Math.abs(pts[45].x - pts[36].x) * s.sx;

  const mouthOpen = mouthHeight > mouthWidth * 0.38;
  const smiling = mouthWidth > eyeDistance * 0.95 && mouthHeight < mouthWidth * 0.45;
  const browsRaised = browEyeDist > eyeDistance * 0.35;

  return { mouthOpen, smiling, browsRaised };
}

// ─── Drawing Primitives ────────────────────────────────────────────────────────

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.3);
  ctx.bezierCurveTo(-size, -size * 0.2, -size * 1.2, size * 0.5, 0, size);
  ctx.bezierCurveTo(size * 1.2, size * 0.5, size, -size * 0.2, 0, size * 0.3);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.25, size * 0.25);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.25, size * 0.25);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Filter Implementations ────────────────────────────────────────────────────

// 1. Dog Filter
function drawDog(ctx: CanvasRenderingContext2D, lm: faceapi.FaceLandmarks68, s: { sx: number; sy: number }) {
  const { faceW, faceH, pts } = getLandmarkScale(lm, s);
  const nose = pts[30];
  const leftBrow = pts[19];
  const rightBrow = pts[24];
  const cx = ((leftBrow.x + rightBrow.x) / 2) * s.sx;
  const topY = Math.min(leftBrow.y, rightBrow.y) * s.sy;

  // Left Ear
  ctx.save();
  ctx.translate(cx - faceW * 0.35, topY - faceH * 0.22);
  ctx.rotate(-0.35);
  ctx.fillStyle = "#8B4513";
  roundRect(ctx, -faceW * 0.15, -faceH * 0.38, faceW * 0.28, faceH * 0.42, 12);
  ctx.fill();
  ctx.fillStyle = "#D2691E";
  roundRect(ctx, -faceW * 0.09, -faceH * 0.3, faceW * 0.18, faceH * 0.3, 8);
  ctx.fill();
  ctx.restore();

  // Right Ear
  ctx.save();
  ctx.translate(cx + faceW * 0.35, topY - faceH * 0.22);
  ctx.rotate(0.35);
  ctx.fillStyle = "#8B4513";
  roundRect(ctx, -faceW * 0.15, -faceH * 0.38, faceW * 0.28, faceH * 0.42, 12);
  ctx.fill();
  ctx.fillStyle = "#D2691E";
  roundRect(ctx, -faceW * 0.09, -faceH * 0.3, faceW * 0.18, faceH * 0.3, 8);
  ctx.fill();
  ctx.restore();

  // Cute Dog Nose
  const nx = nose.x * s.sx;
  const ny = nose.y * s.sy;
  const noseR = faceW * 0.085;
  ctx.beginPath();
  ctx.ellipse(nx, ny, noseR, noseR * 0.72, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(nx - noseR * 0.3, ny - noseR * 0.25, noseR * 0.22, noseR * 0.15, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fill();
}

// 2. Bunny Filter
function drawBunny(ctx: CanvasRenderingContext2D, lm: faceapi.FaceLandmarks68, s: { sx: number; sy: number }) {
  const { faceW, faceH, pts } = getLandmarkScale(lm, s);
  const leftBrow = pts[19];
  const rightBrow = pts[24];
  const cx = ((leftBrow.x + rightBrow.x) / 2) * s.sx;
  const topY = Math.min(leftBrow.y, rightBrow.y) * s.sy;

  const earW = faceW * 0.18;
  const earH = faceH * 0.9;

  for (const side of [-1, 1]) {
    const ex = cx + side * faceW * 0.22;
    ctx.save();
    ctx.translate(ex, topY - earH * 0.42);
    ctx.rotate(side * 0.15);
    ctx.beginPath();
    ctx.ellipse(0, 0, earW / 2, earH / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#e2e2e2";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, earH * 0.06, earW * 0.32, earH * 0.36, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffb6c1";
    ctx.fill();
    ctx.restore();
  }

  // Pink nose
  const nose = pts[30];
  ctx.beginPath();
  ctx.ellipse(nose.x * s.sx, nose.y * s.sy, faceW * 0.05, faceW * 0.04, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#ff69b4";
  ctx.fill();
}

// 3. Cat Filter
function drawCat(ctx: CanvasRenderingContext2D, lm: faceapi.FaceLandmarks68, s: { sx: number; sy: number }) {
  const { faceW, faceH, pts } = getLandmarkScale(lm, s);
  const leftBrow = pts[19];
  const rightBrow = pts[24];
  const nose = pts[30];
  const cx = ((leftBrow.x + rightBrow.x) / 2) * s.sx;
  const topY = Math.min(leftBrow.y, rightBrow.y) * s.sy;

  for (const [side, angle] of [[-1, -0.45], [1, 0.45]] as [number, number][]) {
    const ex = cx + side * faceW * 0.34;
    ctx.save();
    ctx.translate(ex, topY - faceH * 0.15);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-faceW * 0.16, -faceH * 0.32);
    ctx.lineTo(faceW * 0.16, -faceH * 0.32);
    ctx.closePath();
    ctx.fillStyle = "#2d2d2d";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -faceH * 0.04);
    ctx.lineTo(-faceW * 0.09, -faceH * 0.26);
    ctx.lineTo(faceW * 0.09, -faceH * 0.26);
    ctx.closePath();
    ctx.fillStyle = "#ff9ecd";
    ctx.fill();
    ctx.restore();
  }

  // Whiskers
  const nx = nose.x * s.sx;
  const ny = nose.y * s.sy;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(nx - faceW * 0.06, ny + i * faceH * 0.025); ctx.lineTo(nx - faceW * 0.42, ny + i * faceH * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(nx + faceW * 0.06, ny + i * faceH * 0.025); ctx.lineTo(nx + faceW * 0.42, ny + i * faceH * 0.05); ctx.stroke();
  }
}

// 4. Crown Filter
function drawCrown(ctx: CanvasRenderingContext2D, lm: faceapi.FaceLandmarks68, s: { sx: number; sy: number }) {
  const { faceW, pts } = getLandmarkScale(lm, s);
  const leftBrow = pts[17];
  const rightBrow = pts[26];
  const cx = ((leftBrow.x + rightBrow.x) / 2) * s.sx;
  const topY = Math.min(leftBrow.y, rightBrow.y) * s.sy;

  const crownH = faceW * 0.42;
  const crownW = faceW * 0.88;
  const left = cx - crownW / 2;
  const baseY = topY - faceW * 0.1;

  ctx.beginPath();
  ctx.moveTo(left, baseY);
  ctx.lineTo(left, baseY - crownH * 0.6);
  ctx.lineTo(left + crownW * 0.2, baseY - crownH * 0.32);
  ctx.lineTo(left + crownW * 0.35, baseY - crownH);
  ctx.lineTo(left + crownW * 0.5, baseY - crownH * 0.45);
  ctx.lineTo(left + crownW * 0.65, baseY - crownH);
  ctx.lineTo(left + crownW * 0.8, baseY - crownH * 0.32);
  ctx.lineTo(left + crownW, baseY - crownH * 0.6);
  ctx.lineTo(left + crownW, baseY);
  ctx.closePath();

  const grad = ctx.createLinearGradient(left, baseY - crownH, left, baseY);
  grad.addColorStop(0, "#FFD700");
  grad.addColorStop(0.5, "#FFA500");
  grad.addColorStop(1, "#FF8C00");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#B8860B";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Jewels
  const gems = [
    { x: left + crownW * 0.18, y: baseY - crownH * 0.65, r: crownH * 0.09, color: "#ff2a6d" },
    { x: left + crownW * 0.5, y: baseY - crownH * 0.5, r: crownH * 0.12, color: "#05d9e8" },
    { x: left + crownW * 0.82, y: baseY - crownH * 0.65, r: crownH * 0.09, color: "#00ff66" },
    { x: left + crownW * 0.35, y: baseY - crownH * 1.02, r: crownH * 0.08, color: "#ff0055" },
    { x: left + crownW * 0.65, y: baseY - crownH * 1.02, r: crownH * 0.08, color: "#d1f7ff" },
  ];
  gems.forEach((g) => {
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fillStyle = g.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

// 5. Cyber Sunglasses Filter
function drawGlasses(ctx: CanvasRenderingContext2D, lm: faceapi.FaceLandmarks68, s: { sx: number; sy: number }) {
  const { faceW, pts } = getLandmarkScale(lm, s);
  const leftEyeOuter = pts[36];
  const rightEyeOuter = pts[45];
  const eyeY = ((pts[37].y + pts[44].y) / 2) * s.sy;

  const lx = leftEyeOuter.x * s.sx - faceW * 0.05;
  const rx = rightEyeOuter.x * s.sx + faceW * 0.05;
  const w = rx - lx;
  const h = faceW * 0.28;

  ctx.save();
  ctx.translate(lx, eyeY - h * 0.4);

  // Futuristic Visor Frame
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w * 0.95, h);
  ctx.lineTo(w * 0.05, h);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#00f0ff");
  grad.addColorStop(0.5, "#ff007f");
  grad.addColorStop(1, "#7000ff");
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.88;
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#00f0ff";
  ctx.globalAlpha = 1;
  ctx.stroke();

  // Reflection streak
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.15);
  ctx.lineTo(w * 0.45, h * 0.85);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.restore();
}

// 6. Interactive Fire Mouth Filter (Fires particles when mouth opens!)
function drawFireMouth(
  ctx: CanvasRenderingContext2D,
  lm: faceapi.FaceLandmarks68,
  s: { sx: number; sy: number },
  state: InteractiveState,
  particles: Particle[]
) {
  const pts = lm.positions;
  const mouthCenter = pts[62];
  const mx = mouthCenter.x * s.sx;
  const my = mouthCenter.y * s.sy;

  if (state.mouthOpen) {
    // Spawn fire particles
    for (let i = 0; i < 4; i++) {
      particles.push({
        x: mx + (Math.random() - 0.5) * 30,
        y: my,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 8 - 4,
        size: Math.random() * 14 + 8,
        color: ["#ff3300", "#ff9900", "#ffcc00", "#ff0055"][Math.floor(Math.random() * 4)],
        alpha: 1,
        life: 0,
        maxLife: 25 + Math.random() * 15,
        shape: "fire",
      });
    }
  }

  // Draw fire glow around mouth
  if (state.mouthOpen) {
    const grad = ctx.createRadialGradient(mx, my, 5, mx, my, 45);
    grad.addColorStop(0, "rgba(255, 102, 0, 0.8)");
    grad.addColorStop(1, "rgba(255, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(mx, my, 45, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 7. Interactive Heart Smile Filter (Fires heart particles when smiling!)
function drawHeartSmile(
  ctx: CanvasRenderingContext2D,
  lm: faceapi.FaceLandmarks68,
  s: { sx: number; sy: number },
  state: InteractiveState,
  particles: Particle[]
) {
  const { faceW, pts } = getLandmarkScale(lm, s);
  const lx = ((pts[36].x + pts[39].x) / 2) * s.sx;
  const rx = ((pts[42].x + pts[45].x) / 2) * s.sx;
  const ey = pts[37].y * s.sy;
  const size = faceW * 0.14;

  drawHeart(ctx, lx, ey, size, "#ff2a6d");
  drawHeart(ctx, rx, ey, size, "#ff2a6d");

  if (state.smiling) {
    const mouthCenter = pts[62];
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: mouthCenter.x * s.sx + (Math.random() - 0.5) * 50,
        y: mouthCenter.y * s.sy,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 6 - 2,
        size: Math.random() * 12 + 10,
        color: ["#ff0055", "#ff55aa", "#ff99cc"][Math.floor(Math.random() * 3)],
        alpha: 1,
        life: 0,
        maxLife: 30,
        shape: "heart",
      });
    }
  }
}

// 8. Neon Butterfly Halo Filter
function drawNeonButterfly(
  ctx: CanvasRenderingContext2D,
  lm: faceapi.FaceLandmarks68,
  s: { sx: number; sy: number },
  state: InteractiveState
) {
  const { faceW, pts } = getLandmarkScale(lm, s);
  const foreheadY = pts[19].y * s.sy - faceW * 0.25;
  const cx = pts[30].x * s.sx;

  const time = state.timeMs * 0.003;
  ctx.save();
  ctx.translate(cx, foreheadY);

  // Halo Ring
  ctx.beginPath();
  ctx.ellipse(0, 0, faceW * 0.45, faceW * 0.12, 0, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#05d9e8";
  ctx.shadowColor = "#05d9e8";
  ctx.shadowBlur = 15;
  ctx.stroke();

  // Floating Butterflies
  for (let i = 0; i < 3; i++) {
    const angle = time + (i * Math.PI * 2) / 3;
    const bx = Math.cos(angle) * faceW * 0.45;
    const by = Math.sin(angle) * faceW * 0.12;
    const flap = Math.sin(time * 8 + i);

    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(0.8 + flap * 0.2, 1);
    drawSparkle(ctx, 0, 0, faceW * 0.08, "#ff007f");
    ctx.restore();
  }

  ctx.restore();
}

// 9. Anime Sparkle Eyes Filter
function drawAnimeEyes(ctx: CanvasRenderingContext2D, lm: faceapi.FaceLandmarks68, s: { sx: number; sy: number }) {
  const { faceW, pts } = getLandmarkScale(lm, s);
  const leftEye = pts[36];
  const rightEye = pts[45];

  const lx = ((pts[36].x + pts[39].x) / 2) * s.sx;
  const ly = ((pts[37].y + pts[40].y) / 2) * s.sy;
  const rx = ((pts[42].x + pts[45].x) / 2) * s.sx;
  const ry = ((pts[43].y + pts[46].y) / 2) * s.sy;

  const r = faceW * 0.13;

  [
    { x: lx, y: ly },
    { x: rx, y: ry },
  ].forEach((eye) => {
    // Big pupil
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#ff2a8d";
    ctx.fill();

    // Highlights
    ctx.beginPath();
    ctx.arc(eye.x - r * 0.3, eye.y - r * 0.3, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(eye.x + r * 0.3, eye.y + r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 10. Beauty Glow & Soft Makeup Filter
function drawBeautyGlow(ctx: CanvasRenderingContext2D, lm: faceapi.FaceLandmarks68, s: { sx: number; sy: number }) {
  const { faceW, pts } = getLandmarkScale(lm, s);

  // Blush on cheeks
  const leftCheek = pts[2];
  const rightCheek = pts[14];

  [leftCheek, rightCheek].forEach((cheek) => {
    const cx = cheek.x * s.sx;
    const cy = cheek.y * s.sy;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, faceW * 0.18);
    grad.addColorStop(0, "rgba(255, 105, 180, 0.45)");
    grad.addColorStop(1, "rgba(255, 105, 180, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, faceW * 0.18, 0, Math.PI * 2);
    ctx.fill();
  });

  // Soft Lip Tint
  ctx.beginPath();
  const topLipPts = pts.slice(48, 55);
  ctx.moveTo(topLipPts[0].x * s.sx, topLipPts[0].y * s.sy);
  topLipPts.forEach((p) => ctx.lineTo(p.x * s.sx, p.y * s.sy));
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 20, 147, 0.35)";
  ctx.fill();
}

// 11. Angel Wings & Halo Filter
function drawAngel(ctx: CanvasRenderingContext2D, lm: faceapi.FaceLandmarks68, s: { sx: number; sy: number }) {
  const { faceW, pts } = getLandmarkScale(lm, s);
  const cx = pts[30].x * s.sx;
  const haloY = pts[19].y * s.sy - faceW * 0.32;

  // Glowing Golden Halo
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, haloY, faceW * 0.38, faceW * 0.1, 0, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#FFE066";
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 20;
  ctx.stroke();
  ctx.restore();
}

// 12. Devil Horns Filter
function drawDevil(ctx: CanvasRenderingContext2D, lm: faceapi.FaceLandmarks68, s: { sx: number; sy: number }) {
  const { faceW, faceH, pts } = getLandmarkScale(lm, s);
  const leftBrow = pts[19];
  const rightBrow = pts[24];
  const cx = ((leftBrow.x + rightBrow.x) / 2) * s.sx;
  const topY = Math.min(leftBrow.y, rightBrow.y) * s.sy;

  for (const side of [-1, 1]) {
    const hx = cx + side * faceW * 0.28;
    ctx.save();
    ctx.translate(hx, topY - faceH * 0.05);
    ctx.rotate(side * 0.3);
    ctx.beginPath();
    ctx.moveTo(-faceW * 0.08, 0);
    ctx.quadraticCurveTo(-faceW * 0.05, -faceH * 0.35, faceW * 0.08, -faceH * 0.38);
    ctx.quadraticCurveTo(faceW * 0.12, -faceH * 0.15, faceW * 0.08, 0);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, -faceH * 0.38, 0, 0);
    grad.addColorStop(0, "#ff0033");
    grad.addColorStop(1, "#880000");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#ff3333";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

// 13. Matrix Cyber Face Filter
function drawMatrixFace(ctx: CanvasRenderingContext2D, lm: faceapi.FaceLandmarks68, s: { sx: number; sy: number }) {
  const pts = lm.positions;
  ctx.fillStyle = "#00ff66";
  ctx.font = "10px monospace";

  pts.forEach((p, i) => {
    if (i % 2 === 0) {
      const char = String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96));
      ctx.fillText(char, p.x * s.sx, p.y * s.sy);
    }
  });
}

// 14. Starry Galaxy Space Mask
function drawGalaxyMask(ctx: CanvasRenderingContext2D, lm: faceapi.FaceLandmarks68, s: { sx: number; sy: number }) {
  const { faceW, pts } = getLandmarkScale(lm, s);
  const cx = pts[30].x * s.sx;
  const cy = pts[30].y * s.sy;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, faceW * 0.52, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, faceW * 0.52);
  grad.addColorStop(0, "rgba(25, 0, 51, 0.7)");
  grad.addColorStop(0.7, "rgba(102, 0, 102, 0.4)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fill();

  // Floating stars inside mask
  for (let i = 0; i < 12; i++) {
    const sx = cx + (Math.sin(i * 3.5) * faceW * 0.4);
    const sy = cy + (Math.cos(i * 2.1) * faceW * 0.4);
    drawSparkle(ctx, sx, sy, faceW * 0.03, i % 2 === 0 ? "#00ffff" : "#ff00ff");
  }
  ctx.restore();
}

// ─── Synthetic Landmarks Generator & Debug Overlay ──────────────────────────────

export function drawDebugLandmarksMesh(
  ctx: CanvasRenderingContext2D,
  landmarks: faceapi.FaceLandmarks68,
  scale: { sx: number; sy: number }
) {
  const pts = landmarks.positions;
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(0, 255, 204, 0.85)";
  ctx.fillStyle = "#00ffcc";

  // 1. Jaw outline
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const px = pts[i].x * scale.sx;
    const py = pts[i].y * scale.sy;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 2. Eyebrows
  for (const [start, end] of [[17, 21], [22, 26]]) {
    ctx.beginPath();
    for (let i = start; i <= end; i++) {
      const px = pts[i].x * scale.sx;
      const py = pts[i].y * scale.sy;
      if (i === start) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // 3. Nose
  ctx.beginPath();
  for (let i = 27; i <= 30; i++) {
    const px = pts[i].x * scale.sx;
    const py = pts[i].y * scale.sy;
    if (i === 27) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 4. Eyes
  for (const [start, end] of [[36, 41], [42, 47]]) {
    ctx.beginPath();
    for (let i = start; i <= end; i++) {
      const px = pts[i].x * scale.sx;
      const py = pts[i].y * scale.sy;
      if (i === start) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // 5. Mouth
  for (const [start, end] of [[48, 59], [60, 67]]) {
    ctx.beginPath();
    for (let i = start; i <= end; i++) {
      const px = pts[i].x * scale.sx;
      const py = pts[i].y * scale.sy;
      if (i === start) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Draw landmark keypoint dots
  pts.forEach((p, idx) => {
    const px = p.x * scale.sx;
    const py = p.y * scale.sy;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();

    if (idx % 10 === 0) {
      ctx.font = "8px monospace";
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillText(`#${idx}`, px + 3, py - 3);
      ctx.fillStyle = "#00ffcc";
    }
  });

  ctx.restore();
}

export function createSyntheticLandmarks(width: number, height: number): faceapi.FaceLandmarks68 {
  const cx = width / 2;
  const cy = height * 0.42;
  const fw = Math.min(width, height) * 0.45;
  const fh = fw * 1.25;

  const pts: faceapi.Point[] = [];

  // 0-16: Jawline outline
  for (let i = 0; i <= 16; i++) {
    const angle = Math.PI * (0.15 + (i / 16) * 0.7);
    const rx = cx - (fw / 2) * Math.cos(angle);
    const ry = cy + (fh / 2) * Math.sin(angle);
    pts.push(new faceapi.Point(rx, ry));
  }

  // 17-21: Left Eyebrow
  for (let i = 0; i < 5; i++) {
    const rx = cx - fw * 0.35 + (i / 4) * (fw * 0.25);
    const ry = cy - fh * 0.25 - Math.sin((i / 4) * Math.PI) * 8;
    pts.push(new faceapi.Point(rx, ry));
  }

  // 22-26: Right Eyebrow
  for (let i = 0; i < 5; i++) {
    const rx = cx + fw * 0.10 + (i / 4) * (fw * 0.25);
    const ry = cy - fh * 0.25 - Math.sin((i / 4) * Math.PI) * 8;
    pts.push(new faceapi.Point(rx, ry));
  }

  // 27-30: Nose Bridge (index 30 = nose tip)
  for (let i = 0; i < 4; i++) {
    const ry = cy - fh * 0.2 + (i / 3) * (fh * 0.22);
    pts.push(new faceapi.Point(cx, ry));
  }

  // 31-35: Nose Bottom
  for (let i = 0; i < 5; i++) {
    const rx = cx - fw * 0.1 + (i / 4) * (fw * 0.2);
    const ry = cy + fh * 0.03;
    pts.push(new faceapi.Point(rx, ry));
  }

  // 36-41: Left Eye
  const lex = cx - fw * 0.22;
  const ley = cy - fh * 0.12;
  pts.push(new faceapi.Point(lex - 15, ley));
  pts.push(new faceapi.Point(lex - 5, ley - 6));
  pts.push(new faceapi.Point(lex + 5, ley - 6));
  pts.push(new faceapi.Point(lex + 15, ley));
  pts.push(new faceapi.Point(lex + 5, ley + 6));
  pts.push(new faceapi.Point(lex - 5, ley + 6));

  // 42-47: Right Eye
  const rex = cx + fw * 0.22;
  const rey = cy - fh * 0.12;
  pts.push(new faceapi.Point(rex - 15, rey));
  pts.push(new faceapi.Point(rex - 5, rey - 6));
  pts.push(new faceapi.Point(rex + 5, rey - 6));
  pts.push(new faceapi.Point(rex + 15, rey));
  pts.push(new faceapi.Point(rex + 5, rey + 6));
  pts.push(new faceapi.Point(rex - 5, rey + 6));

  // 48-67: Mouth Outer & Inner
  const my = cy + fh * 0.2;
  for (let i = 0; i < 20; i++) {
    const offset = (((i % 12) / 11) - 0.5) * (fw * 0.35);
    pts.push(new faceapi.Point(cx + offset, my + (i >= 12 ? 8 : 0)));
  }

  return new faceapi.FaceLandmarks68(pts, { width, height });
}

// ─── Filter Registry Database ──────────────────────────────────────────────────

export const AR_FILTERS_REGISTRY: ARFilter[] = [
  {
    id: "natural",
    name: "Natural",
    category: "All",
    emoji: "✨",
    description: "Clean camera with no AR overlays",
    tags: ["none", "clean", "original"],
    draw: () => {},
  },
  {
    id: "fire_mouth",
    name: "Fire Breath",
    category: "Interactive AR",
    emoji: "🔥",
    description: "Open your mouth to breathe real-time fire particles!",
    isTrending: true,
    isInteractive: true,
    tags: ["fire", "interactive", "mouth", "particle", "dragon"],
    draw: drawFireMouth,
  },
  {
    id: "heart_smile",
    name: "Heart Burst",
    category: "Interactive AR",
    emoji: "💖",
    description: "Smile to burst interactive heart sparkles!",
    isTrending: true,
    isInteractive: true,
    tags: ["smile", "heart", "love", "interactive", "sparkle"],
    draw: drawHeartSmile,
  },
  {
    id: "dog",
    name: "Puppy Ears",
    category: "Animals",
    emoji: "🐶",
    description: "Cute dog ears & spotty nose",
    isTrending: true,
    tags: ["dog", "puppy", "animal", "cute", "ears"],
    draw: drawDog,
  },
  {
    id: "bunny",
    name: "Fluffy Bunny",
    category: "Animals",
    emoji: "🐰",
    description: "Soft rabbit ears and pink button nose",
    tags: ["bunny", "rabbit", "animal", "pink"],
    draw: drawBunny,
  },
  {
    id: "cat",
    name: "Kitty Whiskers",
    category: "Animals",
    emoji: "😺",
    description: "Cat ears and glowing whiskers",
    tags: ["cat", "kitty", "whiskers", "animal"],
    draw: drawCat,
  },
  {
    id: "crown",
    name: "Golden Crown",
    category: "Glasses & Masks",
    emoji: "👑",
    description: "Royal gold tiara with sparkling jewels",
    isTrending: true,
    tags: ["crown", "gold", "king", "queen", "royal"],
    draw: drawCrown,
  },
  {
    id: "sunglasses",
    name: "Cyber Visor",
    category: "Glasses & Masks",
    emoji: "🕶️",
    description: "Neon reflective futuristic sunglasses",
    isTrending: true,
    tags: ["sunglasses", "glasses", "cyber", "visor", "neon"],
    draw: drawGlasses,
  },
  {
    id: "butterfly_halo",
    name: "Neon Halo",
    category: "Fantasy & Magic",
    emoji: "🦋",
    description: "Floating neon halo with orbiting butterflies",
    isTrending: true,
    tags: ["butterfly", "halo", "neon", "magic", "angel"],
    draw: drawNeonButterfly,
  },
  {
    id: "anime_eyes",
    name: "Anime Sparkles",
    category: "Beauty",
    emoji: "👁️",
    description: "Big expressive anime eyes with glossy highlights",
    tags: ["anime", "manga", "eyes", "sparkle", "cute"],
    draw: drawAnimeEyes,
  },
  {
    id: "beauty_glow",
    name: "Soft Glam",
    category: "Beauty",
    emoji: "🌸",
    description: "Gentle pink blush and radiant skin tint",
    isTrending: true,
    tags: ["beauty", "glam", "blush", "makeup", "skin"],
    draw: BeautyGlowFilterWrapper,
  },
  {
    id: "angel",
    name: "Angel Halo",
    category: "Fantasy & Magic",
    emoji: "😇",
    description: "Glowing heavenly halo above your head",
    tags: ["angel", "halo", "gold", "heaven"],
    draw: drawAngel,
  },
  {
    id: "devil",
    name: "Devil Horns",
    category: "Fantasy & Magic",
    emoji: "😈",
    description: "Fiery red devil horns with glowing aura",
    tags: ["devil", "horns", "red", "fire"],
    draw: drawDevil,
  },
  {
    id: "matrix",
    name: "Cyber Code",
    category: "Neon & Cyber",
    emoji: "💻",
    description: "Matrix green digital rain mapped to face contours",
    tags: ["matrix", "code", "cyber", "neon", "hacker"],
    draw: drawMatrixFace,
  },
  {
    id: "galaxy_mask",
    name: "Galaxy Mask",
    category: "Fantasy & Magic",
    emoji: "🌌",
    description: "Deep space nebula & glowing constellations",
    tags: ["space", "galaxy", "stars", "nebula"],
    draw: drawGalaxyMask,
  },
];

function BeautyGlowFilterWrapper(
  ctx: CanvasRenderingContext2D,
  lm: faceapi.FaceLandmarks68,
  s: { sx: number; sy: number }
) {
  drawBeautyGlow(ctx, lm, s);
}

// ─── Background FX Renderers ───────────────────────────────────────────────────

export function renderBackgroundEffect(
  ctx: CanvasRenderingContext2D,
  effectName: string,
  width: number,
  height: number,
  timeMs: number
) {
  if (effectName === "neon_grid") {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    const offset = (timeMs * 0.05) % step;
    for (let y = offset; y < height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.restore();
  } else if (effectName === "starry_rain") {
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    for (let i = 0; i < 20; i++) {
      const x = (Math.sin(i * 99 + timeMs * 0.001) * 0.5 + 0.5) * width;
      const y = ((timeMs * 0.2 + i * 50) % height);
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
