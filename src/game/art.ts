import type { PlaneDef } from "./data/planes";
import type { EnemyDef } from "./data/enemies";
import type { BossDef } from "./data/worlds";

type Ctx = CanvasRenderingContext2D;

function lerpHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round((((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t));
  const g = Math.round((((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t));
  const bl = Math.round(((pa & 255) * (1 - t) + (pb & 255) * t));
  return `rgb(${r},${g},${bl})`;
}

function poly(ctx: Ctx, pts: number[][], close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

function mirrorPoly(ctx: Ctx, pts: number[][]) {
  poly(ctx, pts.map((p) => [-p[0], p[1]]));
}

/* ============================ PLAYER PLANE ============================ */

export interface SkinPalette {
  body: string; bodyDark: string; accent: string; glass: string; engine: string; trail: string;
}

export interface PlaneDrawOpts {
  t: number;
  thrust?: number; // 0..1
  glow?: boolean;
  banking?: number; // -1..1
  showcase?: boolean;
  skin?: SkinPalette | null;
}

export function drawPlane(ctx: Ctx, def: PlaneDef, o: PlaneDrawOpts) {
  const a = o.skin ? { ...def.art, ...o.skin } : def.art;
  const t = o.t;
  const thrust = o.thrust ?? 1;
  const bank = o.banking ?? 0;
  ctx.save();
  ctx.scale(a.size, a.size);
  // banking = horizontal squash + slight rotation
  ctx.transform(1 - Math.abs(bank) * 0.22, 0, bank * 0.1, 1, 0, 0);

  const bodyGrad = ctx.createLinearGradient(-40, 0, 40, 0);
  bodyGrad.addColorStop(0, "#0d1119");
  bodyGrad.addColorStop(0.18, a.bodyDark);
  bodyGrad.addColorStop(0.38, a.body);
  bodyGrad.addColorStop(0.5, "#ffffff");
  bodyGrad.addColorStop(0.62, a.body);
  bodyGrad.addColorStop(0.82, a.bodyDark);
  bodyGrad.addColorStop(1, "#0d1119");

  /* ---- engine exhaust (behind) ---- */
  drawEngines(ctx, a.engine, a.trail, thrust, t, a.wingStyle, o.glow !== false);

  /* ---- rear stabilizers ---- */
  ctx.fillStyle = a.bodyDark;
  const stab = [
    [10, 30],
    [40, 52],
    [44, 62],
    [12, 52],
  ];
  poly(ctx, stab); ctx.fill();
  mirrorPoly(ctx, stab); ctx.fill();

  /* ---- main wings ---- */
  const wings = wingShape(a.wingStyle);
  const wgrad = ctx.createLinearGradient(0, -20, 0, 60);
  wgrad.addColorStop(0, a.body);
  wgrad.addColorStop(1, a.bodyDark);
  ctx.fillStyle = wgrad;
  poly(ctx, wings); ctx.fill();
  mirrorPoly(ctx, wings); ctx.fill();
  // wing edge highlight
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.2;
  poly(ctx, wings); ctx.stroke();
  mirrorPoly(ctx, wings); ctx.stroke();
  // accent stripes on wings
  ctx.fillStyle = a.accent;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(-52, 16, 22, 3.2);
  ctx.fillRect(30, 16, 22, 3.2);
  ctx.globalAlpha = 1;

  /* ---- underwing missiles / pods ---- */
  drawPylon(ctx, -40, 22, a);
  drawPylon(ctx, 40, 22, a);

  /* ---- fuselage ---- */
  const fus = [
    [0, -58],
    [5.5, -44],
    [8, -20],
    [10, 8],
    [13, 34],
    [10, 54],
    [0, 60],
    [-10, 54],
    [-13, 34],
    [-10, 8],
    [-8, -20],
    [-5.5, -44],
  ];
  ctx.fillStyle = bodyGrad;
  poly(ctx, fus); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // nose cone
  const noseG = ctx.createLinearGradient(0, -62, 0, -30);
  noseG.addColorStop(0, a.accent);
  noseG.addColorStop(1, a.body);
  ctx.fillStyle = noseG;
  poly(ctx, [[0, -64], [5, -48], [0, -42], [-5, -48]]); ctx.fill();

  // panel lines
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-6, -14); ctx.lineTo(-9, 40);
  ctx.moveTo(6, -14); ctx.lineTo(9, 40);
  ctx.moveTo(-9, 12); ctx.lineTo(9, 12);
  ctx.moveTo(-10, 30); ctx.lineTo(10, 30);
  ctx.stroke();
  // rivets
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.arc(-8, -8 + i * 8, 0.9, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -8 + i * 8, 0.9, 0, 7); ctx.fill();
  }
  // animated energy circuits
  if (o.glow !== false) {
    ctx.globalCompositeOperation = "lighter";
    for (const cx of [-1, 1]) {
      const yy = -10 + ((t * 70 + (cx > 0 ? 26 : 0)) % 52);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = a.accent;
      ctx.beginPath(); ctx.arc(cx * 7.5, yy, 1.8, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = a.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-7.5, -10); ctx.lineTo(-7.5, 42);
    ctx.moveTo(7.5, -10); ctx.lineTo(7.5, 42);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---- cockpit ---- */
  const cg = ctx.createLinearGradient(-7, -40, 7, -8);
  cg.addColorStop(0, "#04121f");
  cg.addColorStop(0.45, a.glass);
  cg.addColorStop(1, "#04121f");
  ctx.fillStyle = cg;
  poly(ctx, [[0, -42], [7, -28], [6, -10], [0, -4], [-6, -10], [-7, -28]]);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // canopy reflection
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  poly(ctx, [[-2.5, -36], [1.5, -33], [0.5, -14], [-3.5, -17]]);
  ctx.fill();
  // pilot helmet silhouette + HUD glint
  ctx.fillStyle = "rgba(8,14,22,0.9)";
  ctx.beginPath(); ctx.arc(0, -20, 3.4, 0, 7); ctx.fill();
  ctx.fillStyle = a.glass;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(-2.2, -21.4, 4.4, 1.6);
  ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.3;
  ctx.fillRect(-4.5, -12, 9, 1);
  ctx.globalAlpha = 1;

  /* ---- nose cannons ---- */
  ctx.fillStyle = "#2a2f38";
  ctx.fillRect(-19, -30, 4.5, 26);
  ctx.fillRect(14.5, -30, 4.5, 26);
  ctx.fillStyle = a.accent;
  ctx.fillRect(-19, -32, 4.5, 4);
  ctx.fillRect(14.5, -32, 4.5, 4);

  /* ---- intakes ---- */
  ctx.fillStyle = "#10161f";
  poly(ctx, [[-15, -4], [-9, -4], [-9, 16], [-16, 16]]); ctx.fill();
  poly(ctx, [[15, -4], [9, -4], [9, 16], [16, 16]]); ctx.fill();

  /* ---- navigation lights ---- */
  const blink = (Math.sin(t * 6) + 1) * 0.5;
  light(ctx, -62, 26, "#ff3355", 0.5 + blink * 0.5, o.glow !== false);
  light(ctx, 62, 26, "#33ff77", 0.5 + (1 - blink) * 0.5, o.glow !== false);
  light(ctx, 0, -60, "#ffffff", 0.4 + blink * 0.6, o.glow !== false);

  /* ---- energy glow around hull ---- */
  if (o.glow !== false) {
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = a.accent;
    ctx.globalAlpha = 0.22 + Math.sin(t * 3) * 0.06;
    ctx.lineWidth = 3;
    poly(ctx, fus); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
}

function light(ctx: Ctx, x: number, y: number, color: string, alpha: number, glow: boolean) {
  if (glow) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = g;
    ctx.fillRect(x - 10, y - 10, 20, 20);
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPylon(ctx: Ctx, x: number, y: number, a: PlaneDef["art"]) {
  const s = x < 0 ? -1 : 1;
  ctx.fillStyle = "#2a2f38";
  ctx.fillRect(x - 3, y - 4, 6, 8);
  // missile
  ctx.fillStyle = "#dfe4ea";
  ctx.beginPath();
  ctx.moveTo(x, y - 22);
  ctx.lineTo(x + 4, y - 12);
  ctx.lineTo(x + 4, y + 14);
  ctx.lineTo(x - 4, y + 14);
  ctx.lineTo(x - 4, y - 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = a.accent;
  ctx.fillRect(x - 4, y - 8, 8, 3);
  ctx.fillStyle = "#8b929c";
  ctx.beginPath();
  ctx.moveTo(x + 4 * s, y + 8);
  ctx.lineTo(x + 9 * s, y + 16);
  ctx.lineTo(x + 4 * s, y + 16);
  ctx.closePath();
  ctx.fill();
}

function wingShape(style: PlaneDef["art"]["wingStyle"]): number[][] {
  switch (style) {
    case "delta":
      return [[6, -6], [66, 40], [64, 54], [10, 46]];
    case "forward":
      return [[6, 22], [70, -14], [72, 2], [12, 40]];
    case "heavy":
      return [[6, -14], [78, 8], [80, 40], [56, 50], [12, 48]];
    case "stealth":
      return [[5, -18], [72, 44], [40, 52], [10, 40]];
    case "arrow":
      return [[6, -10], [58, 24], [70, 50], [30, 44], [10, 44]];
    default: // swept
      return [[6, -12], [62, 24], [64, 42], [30, 42], [10, 40]];
  }
}

function drawEngines(ctx: Ctx, color: string, trail: string, thrust: number, t: number, style: string, glow: boolean) {
  const positions = style === "heavy" ? [-22, -8, 8, 22] : [-11, 11];
  const flick = 0.75 + Math.sin(t * 40) * 0.12 + Math.sin(t * 23.3) * 0.1;
  for (const x of positions) {
    // nozzle
    ctx.fillStyle = "#20262f";
    ctx.fillRect(x - 7, 46, 14, 16);
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(x - 5, 56, 10, 6);
    const len = (34 + thrust * 46) * flick;
    if (glow) {
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createLinearGradient(0, 60, 0, 60 + len);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.2, color);
      g.addColorStop(0.6, trail);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 6, 58);
      ctx.quadraticCurveTo(x - 3.5, 60 + len * 0.6, x, 60 + len);
      ctx.quadraticCurveTo(x + 3.5, 60 + len * 0.6, x + 6, 58);
      ctx.closePath();
      ctx.fill();
      // inner core
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.moveTo(x - 2.4, 58);
      ctx.lineTo(x, 60 + len * 0.5);
      ctx.lineTo(x + 2.4, 58);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x - 3, 60, 6, len * 0.5);
    }
  }
}

/* ============================ ENEMIES ============================ */

export function drawEnemy(ctx: Ctx, def: EnemyDef, t: number, hurt: number, glow: boolean) {
  ctx.save();
  ctx.scale(def.size, def.size);
  const body = hurt > 0 ? lerpHex("#ffffff", def.color, 1 - Math.min(1, hurt * 4)) : def.color;
  const dark = "#232a35";
  const s = def.shape;

  const shapes: Record<string, number[][]> = {
    scout: [[0, 30], [10, 8], [34, 12], [30, -6], [9, -14], [7, -22], [-7, -22], [-9, -14], [-30, -6], [-34, 12], [-10, 8]],
    fighter: [[0, 34], [9, 10], [40, 18], [36, -2], [12, -12], [10, -26], [-10, -26], [-12, -12], [-36, -2], [-40, 18], [-9, 10]],
    drone: [[0, 24], [12, 14], [30, 16], [26, -4], [12, -16], [-12, -16], [-26, -4], [-30, 16], [-12, 14]],
    heavy: [[0, 36], [16, 20], [50, 26], [48, 4], [24, -6], [21, -28], [-21, -28], [-24, -6], [-48, 4], [-50, 26], [-16, 20]],
    sniper: [[0, 42], [7, 8], [28, 14], [24, -6], [9, -14], [8, -28], [-8, -28], [-9, -14], [-24, -6], [-28, 14], [-7, 8]],
    bomber: [[0, 32], [20, 22], [52, 14], [50, -6], [19, -14], [17, -30], [-17, -30], [-19, -14], [-50, -6], [-52, 14], [-20, 22]],
    kamikaze: [[0, 34], [13, -2], [26, -22], [8, -14], [0, -20], [-8, -14], [-26, -22], [-13, -2]],
    shield: [[0, 30], [22, 18], [32, -6], [17, -24], [-17, -24], [-32, -6], [-22, 18]],
    laser: [[0, 36], [10, 12], [34, 16], [30, -8], [11, -18], [-11, -18], [-30, -8], [-34, 16], [-10, 12]],
    missile: [[0, 30], [14, 14], [44, 20], [40, -4], [15, -14], [-15, -14], [-40, -4], [-44, 20], [-14, 14]],
    elite: [[0, 44], [14, 16], [54, 24], [50, 0], [22, -10], [17, -32], [-17, -32], [-22, -10], [-50, 0], [-54, 24], [-14, 16]],
    miniboss: [[0, 52], [26, 28], [66, 32], [62, -2], [28, -14], [23, -38], [-23, -38], [-28, -14], [-62, -2], [-66, 32], [-26, 28]],
  };
  const shape = shapes[s] || shapes.fighter;
  let maxX = 0, maxY = 0, minY = 0;
  for (const pt of shape) { maxX = Math.max(maxX, pt[0]); maxY = Math.max(maxY, pt[1]); minY = Math.min(minY, pt[1]); }

  /* ---- rear engines (exhaust points up, enemy flies down) ---- */
  const engX = maxX > 44 ? [-maxX * 0.42, -12, 12, maxX * 0.42] : [-10, 10];
  for (const ex of engX) {
    ctx.fillStyle = "#161b23";
    ctx.fillRect(ex - 5, minY - 4, 10, 12);
    if (glow) {
      ctx.globalCompositeOperation = "lighter";
      const eg = ctx.createLinearGradient(0, minY, 0, minY - 40);
      eg.addColorStop(0, "#ffffff");
      eg.addColorStop(0.25, def.accent);
      eg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = eg;
      const l = 26 + Math.sin(t * 30 + ex) * 5;
      ctx.beginPath();
      ctx.moveTo(ex - 4.5, minY);
      ctx.quadraticCurveTo(ex, minY - l * 0.7, ex, minY - l);
      ctx.quadraticCurveTo(ex, minY - l * 0.7, ex + 4.5, minY);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
  }

  /* ---- tail fins ---- */
  ctx.fillStyle = dark;
  const fin = [[8, minY + 4], [22, minY - 8], [26, minY + 2], [10, minY + 12]];
  poly(ctx, fin); ctx.fill();
  mirrorPoly(ctx, fin); ctx.fill();

  /* ---- main body: god-tier metallic ---- */
  const g = ctx.createLinearGradient(-maxX, 0, maxX, 0);
  g.addColorStop(0, "#10141c");
  g.addColorStop(0.16, dark);
  g.addColorStop(0.36, body);
  g.addColorStop(0.47, "#ffffff");
  g.addColorStop(0.53, "#ffffff");
  g.addColorStop(0.64, body);
  g.addColorStop(0.84, dark);
  g.addColorStop(1, "#10141c");
  ctx.fillStyle = g;
  poly(ctx, shape); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // top specular sweep (animated sheen)
  if (glow) {
    ctx.save();
    poly(ctx, shape); ctx.clip();
    const sx = Math.sin(t * 1.4 + def.size * 5) * maxX * 0.7;
    const sheen = ctx.createLinearGradient(sx - 26, 0, sx + 26, 0);
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0.28)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(-maxX - 30, minY - 30, maxX * 2 + 60, maxY - minY + 60);
    ctx.restore();
  }

  /* ---- panel lines ---- */
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-7, minY + 8); ctx.lineTo(-9, maxY * 0.55);
  ctx.moveTo(7, minY + 8); ctx.lineTo(9, maxY * 0.55);
  ctx.moveTo(-maxX * 0.6, 4); ctx.lineTo(maxX * 0.6, 4);
  ctx.stroke();

  /* ---- wing accents scaled to the actual wing span ---- */
  ctx.fillStyle = def.accent;
  ctx.globalAlpha = 0.9;
  const aw = maxX * 0.34;
  ctx.fillRect(-maxX * 0.86, 2, aw, 3.4);
  ctx.fillRect(maxX * 0.52, 2, aw, 3.4);
  ctx.globalAlpha = 1;
  // animated energy veins converging on the canopy
  if (glow) {
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = def.accent;
    ctx.lineWidth = 1.3;
    for (const vx of [-1, 1]) {
      ctx.globalAlpha = 0.4 + Math.sin(t * 5 + vx * 2 + def.size) * 0.25;
      ctx.beginPath();
      ctx.moveTo(vx * maxX * 0.8, 2);
      ctx.quadraticCurveTo(vx * maxX * 0.35, maxY * 0.1, 0, maxY * 0.28);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  // rivets along the leading edge
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath(); ctx.arc(i * maxX * 0.22, maxY * 0.52, 1.3, 0, 7); ctx.fill();
  }

  /* ---- wingtip pods / missiles ---- */
  if (s === "missile" || s === "bomber" || s === "elite" || s === "heavy" || s === "miniboss") {
    for (const sx of [-1, 1]) {
      const px = sx * maxX * 0.72;
      ctx.fillStyle = "#cfd6de";
      ctx.beginPath();
      ctx.moveTo(px, maxY * 0.55);
      ctx.lineTo(px + 3.5, maxY * 0.2);
      ctx.lineTo(px + 3.5, -10);
      ctx.lineTo(px - 3.5, -10);
      ctx.lineTo(px - 3.5, maxY * 0.2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = def.accent;
      ctx.fillRect(px - 3.5, maxY * 0.1, 7, 3);
    }
  }

  /* ---- canopy ---- */
  const cg = ctx.createLinearGradient(0, -8, 0, maxY * 0.7);
  cg.addColorStop(0, "#05131f");
  cg.addColorStop(0.5, def.accent);
  cg.addColorStop(1, "#05131f");
  ctx.fillStyle = cg;
  poly(ctx, [[0, maxY * 0.62], [6, maxY * 0.3], [5.5, -6], [0, -12], [-5.5, -6], [-6, maxY * 0.3]]);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 0.9; ctx.stroke();
  if (glow) {
    ctx.globalCompositeOperation = "lighter";
    const eg = ctx.createRadialGradient(0, maxY * 0.25, 1, 0, maxY * 0.25, 14);
    eg.addColorStop(0, "#ffffff");
    eg.addColorStop(0.4, def.accent);
    eg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = eg;
    ctx.globalAlpha = 0.5 + Math.sin(t * 4 + def.size) * 0.2;
    ctx.beginPath(); ctx.arc(0, maxY * 0.25, 14, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---- nose guns ---- */
  ctx.fillStyle = "#171c24";
  ctx.fillRect(-14, maxY * 0.35, 4, maxY * 0.5);
  ctx.fillRect(10, maxY * 0.35, 4, maxY * 0.5);
  ctx.fillStyle = def.accent;
  ctx.fillRect(-14, maxY * 0.8, 4, 3.5);
  ctx.fillRect(10, maxY * 0.8, 4, 3.5);

  /* ---- per-class god modules: every enemy reads differently ---- */
  if (s === "scout") {
    // sensor spike + rotating dish
    ctx.fillStyle = "#171c24";
    ctx.fillRect(-1.5, maxY * 0.6, 3, 12);
    ctx.fillStyle = def.accent;
    ctx.beginPath(); ctx.arc(0, maxY * 0.6 + 13, 3, 0, 7); ctx.fill();
    ctx.save();
    ctx.translate(0, -4); ctx.rotate(t * 3);
    ctx.strokeStyle = def.accent; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 4, 0, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1; ctx.restore();
  } else if (s === "fighter") {
    // twin tail booms
    for (const bx of [-1, 1]) {
      ctx.fillStyle = "#1c2129";
      ctx.fillRect(bx * 13 - 2, minY - 2, 4, 14);
      light(ctx, bx * 13, minY - 3, def.accent, 0.6 + Math.sin(t * 8 + bx) * 0.3, glow);
    }
  } else if (s === "drone") {
    // orbiting rotor ring
    ctx.save();
    ctx.translate(0, 0); ctx.rotate(t * 4);
    ctx.fillStyle = "#39424f";
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillRect(20, -1.5, 12, 3);
      ctx.fillStyle = def.accent;
      ctx.beginPath(); ctx.arc(33, 0, 2.4, 0, 7); ctx.fill();
      ctx.fillStyle = "#39424f";
    }
    ctx.restore();
  } else if (s === "heavy") {
    // bolted armor plates
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (const px of [-30, -10, 10, 30]) {
      ctx.fillRect(px - 8, -14, 16, 22);
      ctx.fillStyle = def.accent; ctx.globalAlpha = 0.5;
      ctx.fillRect(px - 8, -14, 16, 2.4);
      ctx.globalAlpha = 1; ctx.fillStyle = "rgba(0,0,0,0.35)";
    }
  } else if (s === "sniper") {
    // long rail barrel + scope glint
    ctx.fillStyle = "#12161d";
    ctx.fillRect(-2.5, maxY * 0.5, 5, 22);
    ctx.fillStyle = def.accent;
    ctx.fillRect(-2.5, maxY * 0.5 + 18, 5, 3);
    ctx.globalAlpha = 0.7 + Math.sin(t * 9) * 0.3;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-1, -2, 2, 8);
    ctx.globalAlpha = 1;
  } else if (s === "bomber") {
    // bomb bay doors + payload
    ctx.fillStyle = "#0d1118";
    ctx.fillRect(-16, maxY * 0.3, 32, 10);
    ctx.fillStyle = def.accent;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.arc(i * 10, maxY * 0.3 + 12, 3.4, 0, 7); ctx.fill();
    }
  } else if (s === "kamikaze") {
    // warning chevrons + nose spikes
    ctx.fillStyle = "#ffd23d";
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(0, maxY * 0.2 + i * 7);
      ctx.lineTo(8, maxY * 0.2 - 4 + i * 7);
      ctx.lineTo(8, maxY * 0.2 - 1 + i * 7);
      ctx.lineTo(0, maxY * 0.2 + 3 + i * 7);
      ctx.lineTo(-8, maxY * 0.2 - 1 + i * 7);
      ctx.lineTo(-8, maxY * 0.2 - 4 + i * 7);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = def.accent;
    for (const sx of [-1, 1]) {
      poly(ctx, [[sx * 10, maxY * 0.4], [sx * 18, maxY * 0.75], [sx * 8, maxY * 0.7]]);
      ctx.fill();
    }
  } else if (s === "missile") {
    // exposed launch tubes
    for (const sx of [-1, 1]) {
      ctx.fillStyle = "#0d1118";
      ctx.fillRect(sx * 22 - 5, maxY * 0.1, 10, 20);
      ctx.fillStyle = def.accent;
      ctx.globalAlpha = 0.6 + Math.sin(t * 6 + sx) * 0.4;
      ctx.fillRect(sx * 22 - 5, maxY * 0.1 + 17, 10, 3);
      ctx.globalAlpha = 1;
    }
  } else if (s === "elite") {
    // gold trim + command crest
    ctx.strokeStyle = "#ffd23d";
    ctx.globalAlpha = 0.8; ctx.lineWidth = 1.6;
    poly(ctx, shape); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffd23d";
    poly(ctx, [[0, -22], [7, -10], [0, -13], [-7, -10]]);
    ctx.fill();
  } else if (s === "miniboss") {
    // rotating turret ring
    ctx.save();
    ctx.translate(0, 6); ctx.rotate(t * 1.2);
    ctx.fillStyle = "#2c333e";
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.fillRect(30, -3, 16, 6);
      ctx.fillStyle = def.accent;
      ctx.fillRect(43, -3, 3, 6);
      ctx.fillStyle = "#2c333e";
    }
    ctx.restore();
  }
  if (s === "shield") {
    // hex barrier facets
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = def.accent;
    ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.12;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2 + t * 0.4;
      ctx.beginPath(); ctx.arc(0, 0, 42, a0, a0 + 0.7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---- lights ---- */
  const blink = (Math.sin(t * 7 + def.size * 3) + 1) * 0.5;
  light(ctx, -maxX * 0.95, 8, "#ff3355", 0.35 + blink * 0.5, glow);
  light(ctx, maxX * 0.95, 8, "#33ff77", 0.35 + (1 - blink) * 0.5, glow);

  if (s === "shield") {
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = def.accent;
    ctx.globalAlpha = 0.3 + Math.sin(t * 4) * 0.12;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 42, 0, 7); ctx.stroke();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = def.accent;
    ctx.beginPath(); ctx.arc(0, 0, 42, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  if (s === "laser") {
    ctx.fillStyle = "#12161d";
    ctx.fillRect(-6, maxY * 0.5, 12, 18);
    ctx.fillStyle = def.accent;
    ctx.globalAlpha = 0.6 + Math.sin(t * 10) * 0.4;
    ctx.beginPath(); ctx.arc(0, maxY * 0.62 + 8, 5, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (def.elite && glow) {
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = def.accent;
    ctx.globalAlpha = 0.22 + Math.sin(t * 5) * 0.1;
    ctx.lineWidth = 4;
    poly(ctx, shape); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
}

/* ============================ BOSS ============================ */

export function drawBoss(
  ctx: Ctx,
  def: BossDef,
  t: number,
  parts: { id: string; hp: number; maxHp: number; dead: boolean }[],
  hurt: number,
  glow: boolean
) {
  ctx.save();
  ctx.scale(def.scale, def.scale);
  const body = hurt > 0 ? "#ffdddd" : def.color;
  const g = ctx.createLinearGradient(-210, 0, 210, 0);
  g.addColorStop(0, "#0e131b");
  g.addColorStop(0.18, "#232b38");
  g.addColorStop(0.42, body);
  g.addColorStop(0.5, "#f4f8ff");
  g.addColorStop(0.58, body);
  g.addColorStop(0.82, "#232b38");
  g.addColorStop(1, "#0e131b");

  const variant = def.variant ?? 9;

  // under-hull aura (god glow)
  if (glow) {
    ctx.globalCompositeOperation = "lighter";
    const aura = ctx.createRadialGradient(0, 0, 60, 0, 0, 340);
    aura.addColorStop(0, "rgba(0,0,0,0)");
    aura.addColorStop(0.72, "rgba(0,0,0,0)");
    aura.addColorStop(0.86, def.glow);
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.28 + Math.sin(t * 2.2) * 0.08;
    ctx.fillStyle = aura;
    ctx.fillRect(-340, -260, 680, 420);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  // outer wing pylons per variant (drawn behind the hull)
  drawBossPylons(ctx, def, variant, t);
  // missile racks
  ctx.fillStyle = "#c9d2dc";
  for (const sx of [-1, 1]) {
    for (let i = 0; i < (variant === 10 ? 5 : 4); i++) {
      const mx = sx * (176 + i * 22);
      ctx.fillStyle = "#c9d2dc";
      ctx.beginPath();
      ctx.moveTo(mx, 60); ctx.lineTo(mx + 5, 40); ctx.lineTo(mx + 5, 6);
      ctx.lineTo(mx - 5, 6); ctx.lineTo(mx - 5, 40);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = def.accent;
      ctx.fillRect(mx - 5, 22, 10, 3);
    }
  }

  // main hull — 11 distinct silhouettes
  const hull = bossHull(variant);
  ctx.fillStyle = g;
  poly(ctx, hull);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // armor plating lines
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1.4;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 40, 60);
    ctx.lineTo(i * 52, -100);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-190, -20); ctx.lineTo(190, -20);
  ctx.stroke();

  // accent stripes
  ctx.fillStyle = def.accent;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(-186, -26, 70, 6);
  ctx.fillRect(116, -26, 70, 6);
  ctx.globalAlpha = 1;

  // inner armour deck
  ctx.fillStyle = "rgba(12,16,24,0.85)";
  poly(ctx, [[0, 88], [64, 44], [92, -18], [58, -74], [-58, -74], [-92, -18], [-64, 44]]);
  ctx.fill();
  ctx.strokeStyle = def.accent;
  ctx.globalAlpha = 0.55; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;

  // energy spine
  const sg = ctx.createLinearGradient(0, -70, 0, 80);
  sg.addColorStop(0, "rgba(0,0,0,0)");
  sg.addColorStop(0.5, def.glow);
  sg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sg;
  ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.2;
  ctx.fillRect(-7, -70, 14, 150);
  ctx.globalAlpha = 1;

  // hazard chevrons near the nose
  ctx.fillStyle = def.accent;
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 60 + i * 13);
    ctx.lineTo(24, 44 + i * 13);
    ctx.lineTo(24, 52 + i * 13);
    ctx.lineTo(0, 68 + i * 13);
    ctx.lineTo(-24, 52 + i * 13);
    ctx.lineTo(-24, 44 + i * 13);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // greebles
  ctx.fillStyle = "#39424f";
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(i * 34 - 8, -66, 16, 10);
    ctx.fillRect(i * 40 - 6, 26, 12, 7);
  }
  // rivet rows
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath(); ctx.arc(i * 34, 78, 2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(i * 30, -82, 2, 0, 7); ctx.fill();
  }

  // animated energy conduits streaming toward the core
  if (glow) {
    ctx.globalCompositeOperation = "lighter";
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const yy = -50 + ((t * 90 + i * 60 + (sx > 0 ? 30 : 0)) % 130);
        ctx.globalAlpha = 0.5 * (1 - Math.abs(yy) / 90);
        ctx.fillStyle = def.glow;
        ctx.beginPath(); ctx.arc(sx * (52 + i * 16), yy, 3.2, 0, 7); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  // variant superstructure — the silhouette personality
  drawBossCrown(ctx, def, variant, t, glow);

  // parts
  for (const p of parts) {
    const d = def.parts.find((x) => x.id === p.id)!;
    if (!d) continue;
    ctx.save();
    ctx.translate(d.x, d.y);
    const ratio = p.dead ? 0 : p.hp / p.maxHp;
    if (p.dead) {
      ctx.fillStyle = "#15181f";
      ctx.beginPath(); ctx.arc(0, 0, d.r * 0.85, 0, 7); ctx.fill();
      ctx.strokeStyle = "#05070a"; ctx.lineWidth = 4; ctx.stroke();
      // torn plating
      ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-d.r * 0.5, -d.r * 0.4); ctx.lineTo(0, 0); ctx.lineTo(d.r * 0.45, -d.r * 0.3);
      ctx.moveTo(-d.r * 0.3, d.r * 0.4); ctx.lineTo(d.r * 0.2, d.r * 0.1);
      ctx.stroke();
      // molten cracks
      if (glow) {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "#ff6a2b";
        ctx.globalAlpha = 0.5 + Math.sin(t * 7 + d.x) * 0.25;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-d.r * 0.4, -d.r * 0.2); ctx.lineTo(d.r * 0.1, d.r * 0.25);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.fillStyle = "rgba(60,60,70,0.5)";
      ctx.beginPath(); ctx.arc(0, -6, d.r * 0.5, 0, 7); ctx.fill();
      ctx.restore();
      continue;
    }
    if (d.kind === "engine") {
      ctx.fillStyle = "#151a22";
      ctx.beginPath(); ctx.arc(0, 0, d.r, 0, 7); ctx.fill();
      ctx.strokeStyle = "#3b4553"; ctx.lineWidth = 4; ctx.stroke();
      if (glow) {
        ctx.globalCompositeOperation = "lighter";
        const eg = ctx.createRadialGradient(0, 0, 2, 0, 0, d.r * 1.4);
        eg.addColorStop(0, "#fff");
        eg.addColorStop(0.35, def.glow);
        eg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = eg;
        ctx.globalAlpha = 0.6 + Math.sin(t * 18 + d.x) * 0.2;
        ctx.beginPath(); ctx.arc(0, 0, d.r * 1.5, 0, 7); ctx.fill();
        // plume
        const pg = ctx.createLinearGradient(0, 0, 0, -130);
        pg.addColorStop(0, def.glow);
        pg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = pg;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(-d.r * 0.6, -130, d.r * 1.2, 130);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    } else if (d.kind === "turret") {
      ctx.fillStyle = "#2c333e";
      ctx.beginPath(); ctx.arc(0, 0, d.r, 0, 7); ctx.fill();
      ctx.strokeStyle = def.accent; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = "#12161d";
      ctx.fillRect(-6, 0, 5, d.r + 16);
      ctx.fillRect(1, 0, 5, d.r + 16);
      ctx.fillStyle = def.accent;
      ctx.beginPath(); ctx.arc(0, 0, d.r * 0.35, 0, 7); ctx.fill();
    } else if (d.kind === "laser") {
      ctx.fillStyle = "#181d26";
      poly(ctx, [[-d.r, -d.r], [d.r, -d.r], [d.r * 0.7, d.r * 1.4], [-d.r * 0.7, d.r * 1.4]]);
      ctx.fill();
      ctx.strokeStyle = def.accent; ctx.lineWidth = 2; ctx.stroke();
      const lg = ctx.createRadialGradient(0, d.r, 1, 0, d.r, d.r);
      lg.addColorStop(0, "#fff");
      lg.addColorStop(0.4, def.accent);
      lg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = lg;
      ctx.globalAlpha = 0.6 + Math.sin(t * 9) * 0.3;
      ctx.beginPath(); ctx.arc(0, d.r, d.r, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (d.kind === "wing") {
      const sx = d.x < 0 ? -1 : 1;
      const wg = ctx.createLinearGradient(0, -d.r, 0, d.r);
      wg.addColorStop(0, "#4a5564");
      wg.addColorStop(0.5, "#2b333f");
      wg.addColorStop(1, "#161c25");
      ctx.fillStyle = wg;
      poly(ctx, [
        [-d.r * 1.1 * sx, -d.r * 1.15], [d.r * 1.25 * sx, -d.r * 0.55],
        [d.r * 1.05 * sx, d.r * 0.95], [-d.r * 0.9 * sx, d.r * 1.1],
      ]);
      ctx.fill();
      ctx.strokeStyle = def.accent; ctx.lineWidth = 2.2; ctx.stroke();
      // vents
      ctx.fillStyle = def.accent;
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.45 + Math.sin(t * 4 + i + d.x) * 0.3;
        ctx.fillRect(-d.r * 0.55, -d.r * 0.55 + i * d.r * 0.5, d.r * 1.1, 5);
      }
      ctx.globalAlpha = 1;
      // armour bolts
      ctx.fillStyle = "#0d1118";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(-d.r * 0.75 + (i * d.r) / 2, -d.r * 0.9, 2.6, 0, 7);
        ctx.fill();
      }
    } else {
      // core
      const pulse = 0.75 + Math.sin(t * 5) * 0.25;
      const cg = ctx.createRadialGradient(0, 0, 2, 0, 0, d.r * 1.6);
      cg.addColorStop(0, "#ffffff");
      cg.addColorStop(0.25, def.accent);
      cg.addColorStop(0.6, def.glow);
      cg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = glow ? "lighter" : "source-over";
      ctx.globalAlpha = 0.55 + pulse * 0.35 * ratio;
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(0, 0, d.r * 1.7, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#0c1016";
      ctx.beginPath(); ctx.arc(0, 0, d.r * 0.72, 0, 7); ctx.fill();
      ctx.strokeStyle = def.accent; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, d.r * 0.72, t * 2, t * 2 + 4.4); ctx.stroke();
      ctx.fillStyle = def.accent;
      ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.arc(0, 0, d.r * 0.42, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
      // rotating rune ring around the core
      if (glow) {
        ctx.strokeStyle = def.glow;
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([10, 7]);
        ctx.lineDashOffset = -t * 40;
        ctx.beginPath(); ctx.arc(0, 0, d.r * 0.95, 0, 7); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }
    // micro HP bar
    if (ratio < 1) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(-d.r * 0.8, -d.r - 12, d.r * 1.6, 4);
      ctx.fillStyle = ratio > 0.5 ? "#10f0a0" : ratio > 0.25 ? "#ffb020" : "#ff3355";
      ctx.fillRect(-d.r * 0.8, -d.r - 12, d.r * 1.6 * Math.max(0, ratio), 4);
    }
    ctx.restore();
  }

  // cockpit / bridge
  ctx.fillStyle = "rgba(10,16,24,0.9)";
  poly(ctx, [[-26, 62], [26, 62], [18, 88], [-18, 88]]);
  ctx.fill();
  ctx.strokeStyle = def.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  // running lights
  for (let i = -2; i <= 2; i++) {
    light(ctx, i * 70, -96, i % 2 === 0 ? "#ff3355" : def.accent, 0.5 + Math.sin(t * 5 + i) * 0.4, glow);
  }
  ctx.restore();
}

/* ======================== BOSS VARIANTS (god-tier) ======================== */

function bossHull(v: number): number[][] {
  switch (v) {
    case 0: // SCOUT CARRIER — wide flat with hive notch
      return [[-40,-110],[40,-110],[110,-80],[190,-52],[228,-8],[200,34],[120,52],[60,86],[20,72],[0,96],[-20,72],[-60,86],[-120,52],[-200,34],[-228,-8],[-190,-52],[-110,-80]];
    case 1: // GUNBATTERY — triple prow
      return [[-70,-104],[70,-104],[120,-60],[190,-44],[208,-6],[150,16],[110,40],[88,84],[44,66],[20,90],[0,70],[-20,90],[-44,66],[-88,84],[-110,40],[-150,16],[-208,-6],[-190,-44],[-120,-60]];
    case 2: // STORM FRIGATE — sleek arrow
      return [[0,-132],[48,-92],[120,-64],[200,-40],[218,-4],[150,8],[90,26],[40,60],[0,78],[-40,60],[-90,26],[-150,8],[-218,-4],[-200,-40],[-120,-64],[-48,-92]];
    case 3: // NIGHT INTERCEPTOR — narrow dagger
      return [[0,-138],[30,-100],[70,-70],[120,-40],[140,-2],[90,22],[44,52],[16,86],[0,104],[-16,86],[-44,52],[-90,22],[-140,-2],[-120,-40],[-70,-70],[-30,-100]];
    case 4: // DREADNOUGHT — bulky octagon
      return [[-80,-112],[80,-112],[150,-70],[210,-30],[222,18],[160,52],[90,80],[30,100],[0,108],[-30,100],[-90,80],[-160,52],[-222,18],[-210,-30],[-150,-70]];
    case 5: // LASER CITADEL — hexagonal fortress
      return [[0,-118],[90,-88],[170,-50],[205,0],[170,50],[90,78],[30,100],[0,110],[-30,100],[-90,78],[-170,50],[-205,0],[-170,-50],[-90,-88]];
    case 6: // AEGIS BASTION — shield wall
      return [[-110,-96],[110,-96],[180,-64],[235,-20],[240,20],[180,44],[110,62],[50,88],[0,98],[-50,88],[-110,62],[-180,44],[-240,20],[-235,-20],[-180,-64]];
    case 7: // VOID REAPER — crescent with horns
      return [[0,-108],[60,-84],[130,-70],[200,-60],[248,-30],[230,10],[160,26],[100,50],[50,80],[0,100],[-50,80],[-100,50],[-160,26],[-230,10],[-248,-30],[-200,-60],[-130,-70],[-60,-84]];
    case 8: // ANNIHILATOR PRIME — spiked extinction crown
      return [[0,-128],[40,-100],[90,-96],[130,-64],[190,-56],[232,-20],[210,20],[150,38],[110,66],[60,88],[0,108],[-60,88],[-110,66],[-150,38],[-210,20],[-232,-20],[-190,-56],[-130,-64],[-90,-96],[-40,-100]];
    case 10: // SECRET APEX — colossal jagged god-hull
      return [[0,-136],[52,-104],[110,-100],[160,-70],[225,-52],[258,-8],[230,30],[170,52],[120,78],[60,96],[0,116],[-60,96],[-120,78],[-170,52],[-230,30],[-258,-8],[-225,-52],[-160,-70],[-110,-100],[-52,-104]];
    default: // 9 GUARDIAN — classic command hull
      return [[0,-120],[70,-96],[120,-60],[200,-40],[212,-6],[150,14],[96,40],[56,86],[0,104],[-56,86],[-96,40],[-150,14],[-212,-6],[-200,-40],[-120,-60],[-70,-96]];
  }
}

function drawBossPylons(ctx: Ctx, def: BossDef, v: number, t: number) {
  const spread = v === 3 ? 0.7 : v === 6 || v === 10 ? 1.12 : 1;
  const sweep = v === 2 ? -26 : v === 7 ? 22 : 0;
  for (const sx of [-1, 1]) {
    ctx.fillStyle = "#1a212b";
    poly(ctx, [
      [sx * 150 * spread, -70], [sx * 262 * spread, -20 + sweep],
      [sx * 276 * spread, 30], [sx * 196 * spread, 46], [sx * 140 * spread, 10],
    ]);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 2; ctx.stroke();
    // pylon energy strip
    ctx.fillStyle = def.accent;
    ctx.globalAlpha = 0.55 + Math.sin(t * 3 + sx) * 0.2;
    ctx.fillRect(sx > 0 ? 150 * spread : -162 * spread, -8 + sweep * 0.4, 12, 34);
    ctx.globalAlpha = 1;
  }
  // variant horns / sails
  if (v === 7 || v === 8 || v === 10) {
    ctx.fillStyle = "#232b38";
    for (const sx of [-1, 1]) {
      poly(ctx, [
        [sx * 190 * spread, -50], [sx * (260 * spread + 26), -110],
        [sx * (238 * spread + 18), -34],
      ]);
      ctx.fill();
      ctx.strokeStyle = def.accent; ctx.lineWidth = 1.6; ctx.stroke();
    }
  }
  if (v === 0) {
    // hive bay doors
    ctx.fillStyle = "#0d1118";
    for (const sx of [-1, 1]) {
      ctx.fillRect(sx * 60 - 22, 44, 44, 18);
      ctx.strokeStyle = def.accent; ctx.lineWidth = 1.4;
      ctx.strokeRect(sx * 60 - 22, 44, 44, 18);
    }
  }
}

function drawBossCrown(ctx: Ctx, def: BossDef, v: number, t: number, glow: boolean) {
  // bridge crown varies by archetype
  ctx.fillStyle = "rgba(10,16,24,0.92)";
  if (v === 1) {
    // triple cannon deck
    for (const ox of [-40, 0, 40]) {
      ctx.fillStyle = "#2c333e";
      ctx.fillRect(ox - 10, 40, 20, 34);
      ctx.fillStyle = "#12161d";
      ctx.fillRect(ox - 4, 66, 8, 22);
      ctx.fillStyle = def.accent;
      ctx.fillRect(ox - 4, 62, 8, 4);
    }
  } else if (v === 5) {
    // prism spire
    ctx.fillStyle = def.accent;
    ctx.globalAlpha = 0.75 + Math.sin(t * 5) * 0.25;
    poly(ctx, [[0, 30], [14, 78], [0, 92], [-14, 78]]);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (v === 3) {
    // assassin eye slit
    ctx.fillStyle = "#05070c";
    ctx.fillRect(-34, 52, 68, 12);
    ctx.fillStyle = def.accent;
    ctx.globalAlpha = 0.8 + Math.sin(t * 6) * 0.2;
    ctx.fillRect(-30, 55, 60, 5);
    ctx.globalAlpha = 1;
  } else {
    poly(ctx, [[-26, 62], [26, 62], [18, 88], [-18, 88]]);
    ctx.fill();
    ctx.strokeStyle = def.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    // bridge windows
    ctx.fillStyle = def.glow;
    ctx.globalAlpha = 0.85;
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 9 - 2.5, 70, 5, 6);
    ctx.globalAlpha = 1;
  }
  if (v === 9 || v === 10) {
    // guardian crown spikes
    ctx.fillStyle = "#39424f";
    for (let i = -3; i <= 3; i++) {
      const bx = i * 26;
      poly(ctx, [[bx - 7, -96], [bx, v === 10 ? -138 : -122], [bx + 7, -96]]);
      ctx.fill();
      ctx.strokeStyle = def.accent; ctx.lineWidth = 1.2; ctx.stroke();
    }
  }
  if (v === 10 && glow) {
    // secret apex halo
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = def.accent;
    ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.2;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 14]);
    ctx.lineDashOffset = t * 60;
    ctx.beginPath(); ctx.ellipse(0, -10, 265, 150, 0, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

/* ============================ POWERUPS ============================ */

export const POWERUP_STYLE: Record<string, { color: string; glyph: string; label: string }> = {
  damage: { color: "#ff5722", glyph: "🔥", label: "DAMAGE" },
  shield: { color: "#3fa9ff", glyph: "🛡", label: "SHIELD" },
  heal: { color: "#3ddc84", glyph: "✚", label: "REPAIR" },
  multi: { color: "#ffd23d", glyph: "⁂", label: "MULTI" },
  laser: { color: "#b567ff", glyph: "≡", label: "LASER" },
  speed: { color: "#2ee6ff", glyph: "»", label: "SPEED" },
  missile: { color: "#ff8a3d", glyph: "▲", label: "MISSILE" },
  bomb: { color: "#ff2d6f", glyph: "✹", label: "BOMB" },
  weapon: { color: "#ffffff", glyph: "★", label: "POWER UP" },
  coin: { color: "#ffc93d", glyph: "◉", label: "COIN" },
};

export function drawPowerUp(ctx: Ctx, kind: string, t: number, glow: boolean) {
  const st = POWERUP_STYLE[kind] || POWERUP_STYLE.weapon;
  const spin = Math.cos(t * 3);
  ctx.save();
  if (glow) {
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
    g.addColorStop(0, st.color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.scale(Math.max(0.18, Math.abs(spin)), 1);
  // capsule
  const bg = ctx.createLinearGradient(0, -16, 0, 16);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(0.4, st.color);
  bg.addColorStop(1, "#10141c");
  ctx.fillStyle = bg;
  poly(ctx, [[-13, -8], [0, -17], [13, -8], [13, 8], [0, 17], [-13, 8]]);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#08101a";
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (Math.abs(spin) > 0.45) ctx.fillText(st.glyph, 0, 1);
}


/* ============================ WINGMEN DRONES ============================ */

export function drawWingman(
  ctx: Ctx,
  shape: "laser" | "shield" | "turret" | "missile" | "repair",
  color: string,
  t: number,
  glow: boolean,
  charge = 0,
  side = 1
) {
  ctx.save();
  ctx.rotate(Math.sin(t * 2 + side) * 0.12);

  // hover glow underneath
  if (glow) {
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(0, 6, 1, 0, 6, 26);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.32 + Math.sin(t * 6 + side) * 0.1;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 6, 26, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  // chassis
  const bg = ctx.createLinearGradient(-14, 0, 14, 0);
  bg.addColorStop(0, "#1b2230");
  bg.addColorStop(0.45, "#7e8b9d");
  bg.addColorStop(0.55, "#cdd7e3");
  bg.addColorStop(1, "#1b2230");
  ctx.fillStyle = bg;
  poly(ctx, [[0, -16], [11, -7], [13, 7], [0, 15], [-13, 7], [-11, -7]]);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // side fins
  ctx.fillStyle = "#28303d";
  poly(ctx, [[11, -5], [20, 2], [20, 8], [12, 6]]); ctx.fill();
  poly(ctx, [[-11, -5], [-20, 2], [-20, 8], [-12, 6]]); ctx.fill();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(13, 1, 6, 2.4);
  ctx.fillRect(-19, 1, 6, 2.4);
  ctx.globalAlpha = 1;

  // module head per role
  ctx.save();
  if (shape === "laser") {
    ctx.fillStyle = "#12161d";
    ctx.fillRect(-3.5, -22, 7, 12);
    const lg = ctx.createLinearGradient(0, -24, 0, -12);
    lg.addColorStop(0, "#fff");
    lg.addColorStop(1, color);
    ctx.fillStyle = lg;
    ctx.fillRect(-2, -24, 4, 8);
  } else if (shape === "turret") {
    ctx.rotate(Math.sin(t * 5) * 0.25);
    ctx.fillStyle = "#12161d";
    ctx.fillRect(-6, -20, 4.5, 13);
    ctx.fillRect(1.5, -20, 4.5, 13);
    ctx.fillStyle = color;
    ctx.fillRect(-6, -21, 4.5, 3);
    ctx.fillRect(1.5, -21, 4.5, 3);
  } else if (shape === "shield") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.3;
    ctx.beginPath(); ctx.arc(0, 0, 19 + Math.sin(t * 3) * 2, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, -14, 4, 0, 7); ctx.fill();
  } else if (shape === "missile") {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = "#cdd7e3";
      ctx.fillRect(sx * 7 - 2.5, -20, 5, 13);
      ctx.fillStyle = color;
      ctx.fillRect(sx * 7 - 2.5, -20, 5, 3);
    }
  } else {
    // repair
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85 + Math.sin(t * 6) * 0.15;
    ctx.fillRect(-2.4, -20, 4.8, 12);
    ctx.fillRect(-7, -15.6, 14, 4.4);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // core eye
  const cg = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 8);
  cg.addColorStop(0, "#ffffff");
  cg.addColorStop(0.35, color);
  cg.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, 7); ctx.fill();

  // charge ring
  if (charge > 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, 11, -Math.PI / 2, -Math.PI / 2 + charge * Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // thruster
  if (glow) {
    ctx.globalCompositeOperation = "lighter";
    const eg = ctx.createLinearGradient(0, 14, 0, 30);
    eg.addColorStop(0, color);
    eg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = eg;
    const l = 12 + Math.sin(t * 24 + side * 2) * 4;
    ctx.beginPath();
    ctx.moveTo(-4, 14); ctx.lineTo(0, 14 + l); ctx.lineTo(4, 14);
    ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
}
