type Ctx = CanvasRenderingContext2D;

export interface Particle {
  active: boolean;
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
  kind: "spark" | "smoke" | "frag" | "ring" | "flash" | "text" | "trail" | "shock" | "dmg" | "streak" | "ember";
  rot: number; vr: number; drag: number; text?: string;
}

export class ParticleSystem {
  localize: (text: string) => string = (text) => text;
  pool: Particle[] = [];
  max: number;
  scale: number;
  constructor(max: number, scale: number) {
    this.max = max;
    this.scale = scale;
    for (let i = 0; i < max; i++) this.pool.push(this.blank());
  }
  private blank(): Particle {
    return { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: "#fff", kind: "spark", rot: 0, vr: 0, drag: 0.9 };
  }
  setLimits(max: number, scale: number) {
    this.max = max;
    this.scale = scale;
    while (this.pool.length < max) this.pool.push(this.blank());
    // deactivate anything outside the new budget and resync counters
    let live = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (i >= max) this.pool[i].active = false;
      else if (this.pool[i].active) live++;
    }
    this.live = live;
    this.cursor = 0;
  }
  private cursor = 0;
  /** O(1) amortised allocation — no full-pool scan per particle. */
  private get(): Particle | null {
    const max = this.max;
    for (let n = 0; n < max; n++) {
      const i = this.cursor;
      this.cursor = (i + 1) % max;
      const p = this.pool[i];
      if (!p.active) return p;
    }
    return null;
  }
  spawn(o: Partial<Particle>) {
    const p = this.get();
    if (!p) return;
    p.active = true;
    this.live++;
    p.x = o.x || 0; p.y = o.y || 0;
    p.vx = o.vx || 0; p.vy = o.vy || 0;
    p.life = p.maxLife = o.life || 0.5;
    p.size = o.size || 3;
    p.color = o.color || "#fff";
    p.kind = o.kind || "spark";
    p.rot = o.rot || 0;
    p.vr = o.vr || 0;
    p.drag = o.drag ?? 0.92;
    p.text = o.text;
  }

  explosion(x: number, y: number, size: number, color = "#ffb020", accent = "#ff4d2d") {
    const n = Math.round(size * 1.4 * this.scale);
    // core flash + double shell ring reads the blast size instantly
    // core flash is clamped; the *scale* of a blast is sold by rings + debris,
    // not by an ever-larger white disc (which used to clip the whole frame)
    this.spawn({ x, y, kind: "flash", life: 0.16, size: Math.min(78, size * 1.5), color: "#ffffff" });
    this.spawn({ x, y, kind: "ring", life: 0.42, size: size * 0.7, color });
    if (size > 90) {
      this.spawn({ x, y, kind: "ring", life: 0.62, size: size * 1.15, color: accent });
      this.spawn({ x, y, kind: "ring", life: 0.85, size: size * 1.7, color });
    }
    if (size > 42 && this.scale > 0.5) {
      this.spawn({ x, y, kind: "shock", life: 0.34, size: size * 0.85, color: accent });
      // lingering fireball
      for (let i = 0; i < Math.round(4 * this.scale); i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * size * 0.4;
        this.spawn({
          x: x + Math.cos(a) * r, y: y + Math.sin(a) * r,
          vx: Math.cos(a) * 30, vy: Math.sin(a) * 30 - 24,
          life: 0.32 + Math.random() * 0.3, size: Math.min(46, size * (0.3 + Math.random() * 0.3)),
          color, kind: "flash", drag: 0.9,
        });
      }
    }
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (60 + Math.random() * 300) * (size / 30);
      this.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.3 + Math.random() * 0.55, size: 1.6 + Math.random() * (size * 0.14),
        color: Math.random() < 0.5 ? color : accent, kind: "spark", drag: 0.9,
      });
    }
    for (let i = 0; i < Math.round(n * 0.4); i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn({
        x, y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 - 20,
        life: 0.6 + Math.random() * 0.7, size: size * (0.25 + Math.random() * 0.4),
        color: "rgba(50,50,60,0.55)", kind: "smoke", drag: 0.95,
      });
    }
    for (let i = 0; i < Math.round(n * 0.25); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 220;
      this.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.5, size: 3 + Math.random() * 5,
        color: "#8b939e", kind: "frag", rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, drag: 0.94,
      });
    }
  }

  hit(x: number, y: number, color: string) {
    for (let i = 0; i < Math.round(6 * this.scale) + 2; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 160;
      this.spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.16 + Math.random() * 0.2, size: 1.5 + Math.random() * 2.4, color, kind: "spark" });
    }
  }

  /** Cosmetic-only spawn: skipped automatically under particle pressure. */
  private cosmeticOk() { return this.live < this.max * 0.82; }

  trail(x: number, y: number, color: string, size = 5) {
    if (!this.cosmeticOk()) return;
    this.spawn({ x, y, vx: (Math.random() - 0.5) * 20, vy: 60 + Math.random() * 60, life: 0.28, size, color, kind: "trail", drag: 0.9 });
  }

  floatText(x: number, y: number, text: string, color: string) {
    this.spawn({ x, y, vy: -74, life: 0.72, size: 15, color, kind: "text", text: this.localize(text), drag: 0.95 });
  }

  /** Floating damage number with slight scatter. */
  damage(x: number, y: number, amount: number, crit: boolean) {
    this.spawn({
      x: x + (Math.random() - 0.5) * 26, y: y - 8,
      vx: (Math.random() - 0.5) * 90, vy: -125 - Math.random() * 55,
      life: crit ? 0.6 : 0.46, size: crit ? 21 : 14,
      color: crit ? "#ffd23d" : "#ffffff", kind: "dmg",
      text: crit ? `${Math.round(amount)}!` : String(Math.round(amount)), drag: 0.93,
    });
  }

  /** Expanding thermal shockwave ring (bomb / ultimate / boss death). */
  shockwave(x: number, y: number, radius: number, color: string, life = 0.55) {
    this.spawn({ x, y, kind: "shock", life, size: radius, color });
    this.spawn({ x, y, kind: "flash", life: 0.2, size: radius * 0.7, color: "#ffffff" });
    const n = Math.round(18 * this.scale) + 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const sp = radius * 2.4;
      this.spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.3, size: 3 + Math.random() * 4, color, kind: "spark", drag: 0.88 });
    }
  }

  /** Speed streaks for boost / hyper-velocity. */
  streak(x: number, y: number, len: number, color: string) {
    if (!this.cosmeticOk()) return;
    this.spawn({ x, y, vy: 900 + Math.random() * 500, life: 0.22, size: len, color, kind: "streak", drag: 1 });
  }

  ember(x: number, y: number, color: string) {
    if (!this.cosmeticOk()) return;
    this.spawn({ x, y, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 70, life: 0.9 + Math.random(), size: 1.5 + Math.random() * 2.4, color, kind: "ember", drag: 0.985 });
  }

  update(dt: number) {
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; this.live--; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      p.rot += p.vr * dt;
      if (p.kind === "smoke") p.vy -= 14 * dt;
    }
  }

  render(ctx: Ctx, glow: boolean) {
    ctx.save();
    if (glow) ctx.globalCompositeOperation = "lighter";
    // HDR-style rolloff: heavy particle load dims each additive sprite so the
    // frame never clips to solid white during ultimates / boss deaths
    const load = this.pressure;
    const ceiling = load > 0.45 ? Math.max(0.42, 1 - (load - 0.45) * 1.15) : 1;
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const k = p.life / p.maxLife;
      if (p.kind === "smoke") {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = k * 0.5 * (0.6 + ceiling * 0.4);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.6 - k), 0, 7);
        ctx.fill();
        if (glow) ctx.globalCompositeOperation = "lighter";
        continue;
      }
      if (p.kind === "text") {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = p.color;
        ctx.font = `900 ${p.size}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(0,0,0,0.7)";
        ctx.lineWidth = 3;
        ctx.strokeText(p.text || "", p.x, p.y);
        ctx.fillText(p.text || "", p.x, p.y);
        if (glow) ctx.globalCompositeOperation = "lighter";
        continue;
      }
      ctx.globalAlpha = k * ceiling;
      if (p.kind === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * k + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (2.4 - k * 1.4), 0, 7);
        ctx.stroke();
      } else if (p.kind === "flash") {
        // budgeted: white core only on the brightest part of the life curve,
        // and alpha falls off fast so overlapping blasts cannot saturate to pure white
        const r = Math.min(140, p.size * (1.6 - k));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, k > 0.62 ? "#ffffff" : p.color);
        g.addColorStop(0.42, p.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = k * k * 0.85 * ceiling;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
      } else if (p.kind === "shock") {
        const prog = 1 - k;
        const r = p.size * (0.25 + prog * 1.5);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = k * 0.75;
        ctx.lineWidth = Math.min(14, (10 * k + 2) * (1 - prog * 0.45));
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.globalAlpha = k * k;
        ctx.lineWidth = 3 * k + 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.86, 0, 7); ctx.stroke();
      } else if (p.kind === "streak") {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = k * 0.55;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.size);
        ctx.stroke();
      } else if (p.kind === "dmg") {
        ctx.globalCompositeOperation = "source-over";
        const pop = Math.min(1, (1 - k) * 5);
        ctx.globalAlpha = Math.min(1, k * 2.4);
        ctx.font = `900 ${p.size * (0.7 + pop * 0.3)}px Orbitron, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = "rgba(0,0,0,0.8)";
        ctx.strokeText(p.text || "", p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text || "", p.x, p.y);
        if (glow) ctx.globalCompositeOperation = "lighter";
      } else if (p.kind === "frag") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.kind === "trail" ? k : 1), 0, 7);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  clear() { for (const p of this.pool) p.active = false; this.live = 0; this.cursor = 0; }
  live = 0;
  get count() { return this.live; }
  /** 0..1 pool pressure — used to shed non-essential effects under load. */
  get pressure() { return this.live / Math.max(1, this.max); }
}
