type Ctx = CanvasRenderingContext2D;

export interface BgWorld {
  theme: string;
  sky: [string, string, string];
  fog: string;
}
interface Layer {
  items: { x: number; y: number; s: number; r: number; a: number }[];
  speed: number;
}

export class Background {
  world: BgWorld;
  weather: "none" | "storm" | "emp" | "flare" = "none";
  weatherT = 0;
  W: number;
  H: number;
  layers: Layer[] = [];
  stars: { x: number; y: number; s: number; sp: number }[] = [];
  t = 0;

  constructor(world: BgWorld, W: number, H: number, starCount: number) {
    this.world = world;
    this.W = W;
    this.H = H;
    this.build(starCount);
  }

  private rnd(n: number, sp: number, sMin: number, sMax: number): Layer {
    const items = [];
    for (let i = 0; i < n; i++) {
      items.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        s: sMin + Math.random() * (sMax - sMin),
        r: Math.random() * Math.PI * 2,
        a: 0.3 + Math.random() * 0.7,
      });
    }
    return { items, speed: sp };
  }

  build(starCount: number) {
    this.layers = [
      this.rnd(6, 22, 90, 220), // far
      this.rnd(9, 60, 60, 150), // mid
      this.rnd(12, 130, 26, 70), // near objects
      this.rnd(6, 260, 60, 170), // foreground
    ];
    this.stars = [];
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        s: Math.random() * 1.8 + 0.4,
        sp: 30 + Math.random() * 140,
      });
    }
  }

  setWorld(w: BgWorld, starCount: number) {
    this.world = w;
    this.build(starCount);
  }

  update(dt: number, scroll: number) {
    this.t += dt;
    this.weatherT += dt;
    for (const l of this.layers) {
      for (const it of l.items) {
        it.y += l.speed * scroll * dt;
        it.r += dt * 0.1;
        if (it.y - it.s > this.H) {
          it.y = -it.s - Math.random() * 200;
          it.x = Math.random() * this.W;
        }
      }
    }
    for (const s of this.stars) {
      s.y += s.sp * scroll * dt;
      if (s.y > this.H) { s.y = -4; s.x = Math.random() * this.W; }
    }
  }

  // Cached full-screen gradients: they only depend on world + canvas height,
  // so rebuilding them per frame was pure waste (3 gradients x 60fps).
  private gSky: CanvasGradient | null = null;
  private gFog: CanvasGradient | null = null;
  private gVig: CanvasGradient | null = null;
  private gKey = "";

  render(ctx: Ctx, quality: boolean) {
    const w = this.world;
    const key = `${w.sky[0]}|${w.fog}|${this.W}x${this.H}`;
    if (this.gKey !== key) {
      this.gKey = key;
      this.gSky = ctx.createLinearGradient(0, 0, 0, this.H);
      this.gSky.addColorStop(0, w.sky[0]);
      this.gSky.addColorStop(0.55, w.sky[1]);
      this.gSky.addColorStop(1, w.sky[2]);
      this.gFog = ctx.createLinearGradient(0, 0, 0, this.H);
      this.gFog.addColorStop(0, w.fog);
      this.gFog.addColorStop(0.5, "rgba(0,0,0,0)");
      this.gFog.addColorStop(1, w.fog);
      this.gVig = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.28, this.W / 2, this.H / 2, this.H * 0.78);
      this.gVig.addColorStop(0, "rgba(0,0,0,0)");
      this.gVig.addColorStop(1, "rgba(0,0,0,0.55)");
    }
    ctx.fillStyle = this.gSky!;
    ctx.fillRect(0, 0, this.W, this.H);

    if (w.theme === "space" || w.theme === "city" || w.theme === "ice") {
      ctx.fillStyle = "#ffffff";
      for (const s of this.stars) {
        ctx.globalAlpha = 0.3 + Math.random() * 0.5;
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
      ctx.globalAlpha = 1;
    }

    this.layers.forEach((l, li) => {
      for (const it of l.items) this.drawItem(ctx, li, it, quality);
    });

    // atmospheric fog overlay (cached)
    ctx.fillStyle = this.gFog!;
    ctx.fillRect(0, 0, this.W, this.H);
    this.renderWeather(ctx);

    // vignette (cached)
    ctx.fillStyle = this.gVig!;
    ctx.fillRect(0, 0, this.W, this.H);
  }

  renderWeather(ctx: Ctx) {
    if (this.weather === "none") return;
    const t = this.weatherT;
    if (this.weather === "storm") {
      ctx.save();
      ctx.strokeStyle = "rgba(190,225,255,0.32)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 90; i++) {
        const x = ((i * 137.5 + t * 900) % (this.W + 260)) - 130;
        const y = ((i * 211.3 + t * 2400) % (this.H + 200)) - 100;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 22, y + 46);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(10,20,40,0.3)";
      ctx.fillRect(0, 0, this.W, this.H);
      if (Math.sin(t * 3.1) > 0.985) {
        ctx.fillStyle = "rgba(220,240,255,0.35)";
        ctx.fillRect(0, 0, this.W, this.H);
      }
      ctx.restore();
    } else if (this.weather === "emp") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(120,220,255,0.22)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 22; i++) {
        const y = ((i * 73 + t * 260) % this.H);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.W, y + Math.sin(t * 8 + i) * 6);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(40,120,200,0.12)";
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.restore();
    } else if (this.weather === "flare") {
      ctx.save();
      const a = 0.18 + Math.sin(t * 2.2) * 0.1;
      const g = ctx.createLinearGradient(0, 0, 0, this.H);
      g.addColorStop(0, `rgba(255,220,140,${a + 0.16})`);
      g.addColorStop(1, `rgba(255,120,40,${a * 0.3})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.restore();
    }
  }

  private drawItem(ctx: Ctx, layer: number, it: { x: number; y: number; s: number; r: number; a: number }, hq: boolean) {
    const th = this.world.theme;
    ctx.save();
    ctx.translate(it.x, it.y);
    const alpha = it.a * (layer === 3 ? 0.5 : 1);
    ctx.globalAlpha = alpha;
    if (th === "sky") {
      // clouds and mountains
      if (layer === 0) {
        ctx.fillStyle = "rgba(30,60,90,0.55)";
        ctx.beginPath();
        ctx.moveTo(-it.s, it.s * 0.6);
        ctx.lineTo(0, -it.s * 0.5);
        ctx.lineTo(it.s, it.s * 0.6);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(220,240,255,0.5)";
        ctx.beginPath();
        ctx.moveTo(-it.s * 0.3, -it.s * 0.05);
        ctx.lineTo(0, -it.s * 0.5);
        ctx.lineTo(it.s * 0.3, -it.s * 0.05);
        ctx.closePath(); ctx.fill();
      } else {
        cloud(ctx, it.s, layer === 3 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.32)");
      }
    } else if (th === "ocean") {
      if (layer === 1) {
        // carrier / ship
        ctx.fillStyle = "rgba(35,55,70,0.9)";
        ctx.fillRect(-it.s * 0.5, -it.s * 0.18, it.s, it.s * 0.36);
        ctx.fillStyle = "rgba(70,95,115,0.9)";
        ctx.fillRect(-it.s * 0.15, -it.s * 0.4, it.s * 0.3, it.s * 0.25);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        for (let i = -3; i < 4; i++) ctx.fillRect(i * it.s * 0.12, -3, it.s * 0.06, 6);
      } else if (layer === 3) {
        cloud(ctx, it.s, "rgba(200,230,245,0.35)");
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        ctx.ellipse(0, 0, it.s, it.s * 0.16, 0, 0, 7);
        ctx.fill();
      }
    } else if (th === "desert") {
      if (layer === 0) {
        ctx.fillStyle = "rgba(120,70,30,0.5)";
        ctx.beginPath(); ctx.ellipse(0, 0, it.s, it.s * 0.4, it.r, 0, 7); ctx.fill();
      } else if (layer === 1) {
        ctx.fillStyle = "rgba(60,45,30,0.8)";
        ctx.fillRect(-it.s * 0.4, -it.s * 0.3, it.s * 0.8, it.s * 0.6);
        ctx.fillStyle = "rgba(200,160,90,0.6)";
        ctx.fillRect(-it.s * 0.28, -it.s * 0.18, it.s * 0.56, it.s * 0.1);
      } else {
        ctx.fillStyle = "rgba(255,210,150,0.22)";
        ctx.beginPath(); ctx.ellipse(0, 0, it.s * 1.4, it.s * 0.3, it.r, 0, 7); ctx.fill();
      }
    } else if (th === "city") {
      if (layer < 2) {
        const h = it.s * 3;
        ctx.fillStyle = layer === 0 ? "rgba(20,8,45,0.9)" : "rgba(35,12,70,0.95)";
        ctx.fillRect(-it.s * 0.35, -h * 0.5, it.s * 0.7, h);
        ctx.fillStyle = layer === 0 ? "rgba(120,80,255,0.35)" : "rgba(255,60,220,0.45)";
        for (let y = -h * 0.45; y < h * 0.45; y += 14) {
          for (let x = -it.s * 0.25; x < it.s * 0.25; x += 12) {
            if ((x + y + it.r * 20) % 3 < 1.6) ctx.fillRect(x, y, 5, 7);
          }
        }
      } else {
        ctx.strokeStyle = "rgba(0,255,220,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, it.s * 0.5, 0, 7); ctx.stroke();
      }
    } else if (th === "ice") {
      if (layer < 2) {
        ctx.fillStyle = "rgba(150,220,245,0.35)";
        ctx.beginPath();
        ctx.moveTo(-it.s, it.s * 0.5);
        ctx.lineTo(-it.s * 0.2, -it.s * 0.7);
        ctx.lineTo(it.s * 0.4, it.s * 0.1);
        ctx.lineTo(it.s, it.s * 0.5);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath(); ctx.arc(0, 0, it.s * 0.08, 0, 7); ctx.fill();
      }
    } else if (th === "volcano") {
      if (layer === 0) {
        ctx.fillStyle = "rgba(40,10,4,0.85)";
        ctx.beginPath();
        ctx.moveTo(-it.s, it.s * 0.6);
        ctx.lineTo(-it.s * 0.2, -it.s * 0.7);
        ctx.lineTo(it.s * 0.3, it.s * 0.1);
        ctx.lineTo(it.s, it.s * 0.6);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,90,20,0.55)";
        ctx.fillRect(-it.s * 0.3, -it.s * 0.2, it.s * 0.16, it.s * 0.8);
      } else if (layer === 1) {
        const lg = ctx.createLinearGradient(0, -it.s * 0.2, 0, it.s * 0.2);
        lg.addColorStop(0, "rgba(255,180,40,0.85)");
        lg.addColorStop(1, "rgba(200,30,0,0.5)");
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.ellipse(0, 0, it.s * 0.9, it.s * 0.24, it.r, 0, 7);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255,140,40,0.5)";
        ctx.beginPath(); ctx.arc(0, 0, it.s * 0.07, 0, 7); ctx.fill();
      }
    } else {
      // space: nebulas + asteroids
      if (layer < 2 && hq) {
        const ng = ctx.createRadialGradient(0, 0, 2, 0, 0, it.s);
        ng.addColorStop(0, layer === 0 ? "rgba(120,60,255,0.35)" : "rgba(255,60,150,0.22)");
        ng.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = ng;
        ctx.beginPath(); ctx.arc(0, 0, it.s, 0, 7); ctx.fill();
      } else {
        ctx.rotate(it.r);
        ctx.fillStyle = "rgba(90,90,120,0.7)";
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const ang = (i / 7) * Math.PI * 2;
          const rr = it.s * 0.18 * (0.7 + ((i * 37) % 10) / 20);
          ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        }
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function cloud(ctx: Ctx, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-s * 0.4, 0, s * 0.35, 0, 7);
  ctx.arc(0, -s * 0.16, s * 0.46, 0, 7);
  ctx.arc(s * 0.45, 0.04 * s, s * 0.34, 0, 7);
  ctx.arc(s * 0.12, s * 0.2, s * 0.3, 0, 7);
  ctx.fill();
}
