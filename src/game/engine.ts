import { CONFIG, DIFFICULTY, QUALITY, type DifficultyName, type QualityLevel } from "./config";
import { getPlane, type PlaneDef } from "./data/planes";
import { ENEMIES, getEnemy, getSquad, type EnemyDef, type FirePattern } from "./data/enemies";
import type { BossDef } from "./data/worlds";
import {
  FORMATIONS, findBoss, getMaps, getPlanet, sectorBossFor, sectorIdentity,
  type MapDef, type MapEventId, type PlanetDef, type SectorIdentity,
} from "./data/galaxies";
import { computePlaneNodes, computeTalents, getPilot, getSkin } from "./data/talents";
import { getWingman, wingmanStats, type WingmanDef } from "./data/wingmen";
import { drawBoss, drawEnemy, drawPlane, drawPowerUp, drawWingman } from "./art";
import { clearSprites, sprite } from "./sprites";
import { Background } from "./background";
import { ParticleSystem } from "./particles";
import { Audio } from "./audio";
import { InputManager } from "./input";
import { defaultPlaneSave, planetState, type SaveData } from "./save";
import { availableRushBosses, runAccess } from "./access";
import { calculateRewards } from "./economy";
import { translate, type Params } from "../i18n";
import type { GameMode, RunConfig, RunResult } from "./run-types";
export type { GameMode, RunConfig, RunResult } from "./run-types";

export interface HudState {
  hp: number; maxHp: number; score: number; combo: number; comboTimer: number; comboWindow: number;
  wave: number; waves: number; world: string; worldEmoji: string; mapName: string;
  weaponLevel: number; skillCd: number; skillMax: number; ultCd: number; ultMax: number;
  evadeCd: number; evadeMax: number; evadeActive: boolean;
  passiveName: string; passiveIcon: string; passiveValue: number; passiveLabel: string;
  bossHp: number; bossMaxHp: number; bossName: string; bossPhase: number; bossParts: number; bossPartsTotal: number;
  coins: number; kills: number; fps: number; entities: number; projectiles: number;
  shield: number; bombs: number; paused: boolean; warning: number; multiplier: number;
  buffs: { id: string; label: string; t: number }[];
  mode: GameMode; eventName: string; eventTime: number; empLock: number;
  wingmen: { icon: string; color: string; charge: number }[];
  dailyText: string; dailyOk: boolean; runTime: number; hits: number;
}

type Bullet = {
  active: boolean; x: number; y: number; vx: number; vy: number; r: number;
  dmg: number; friendly: boolean; life: number; color: string; kind: string;
  pierce: number; homing: number; target: any; rot: number; crit: boolean; w: number; h: number;
  spin: number; hitIds: number;
};
type EnemyE = {
  active: boolean; def: EnemyDef; x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number; t: number; fireT: number; hurt: number; seed: number;
  homeX: number; homeY: number; state: string; laserT: number; laserOn: boolean;
  elite: boolean; scale: number; uid: number; armorShown: boolean;
  /* tactical AI */
  tele: number; teleMax: number; auraShield: number; auraRate: number;
  enraged: boolean; dodgeT: number; strafeDir: number; markX: number; markY: number;
};
type PowerUp = { active: boolean; x: number; y: number; vy: number; vx: number; kind: string; t: number };
type BossPart = { id: string; hp: number; maxHp: number; dead: boolean };
type Wing = {
  slot: number; def: WingmanDef | null; stats: { damage: number; rate: number; range: number; special: number };
  talents: Record<string, number>; x: number; y: number; fireT: number; charge: number; active: boolean;
};

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
let UID = 1;

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: InputManager;
  W = 720; H = 1280;
  dpr = 2;
  quality: QualityLevel = "HIGH";
  difficulty: DifficultyName = "NORMAL";
  save: SaveData;
  onHud: (h: HudState) => void;
  onEnd: (r: RunResult) => void;
  onEvent: (type: string, data?: any) => void;

  running = false; paused = false; over = false;
  time = 0; lastTs = 0; raf = 0;
  fps = 60; fpsFrames = 0; fpsTimer = 0; lowFps = 0; hudTimer = 0;

  cfg: RunConfig = { mode: "campaign", galaxy: 0, planet: 0, map: 0 };
  private runId = "";
  private flownPlaneId = "falcon";
  private firstClear = false;
  private enemyXpEarned = 0;
  planet!: PlanetDef;
  mapDef!: MapDef;
  ident!: SectorIdentity;
  bg!: Background;
  fx!: ParticleSystem;

  plane!: PlaneDef;
  skinPalette: any = null;
  load = {
    maxHp: 100, speed: 430, damage: 10, fireRate: 7.5, crit: 0.08, critDmg: 2.1, pierce: 0,
    ultCdMul: 1, skillCdMul: 1, regen: 0, iframeMul: 1, shields: 0, magnet: 1,
    coinMul: 1, xpMul: 1, comboWindow: 3, thorns: 0, dmgTakenMul: 1,
  };

  player = {
    x: 360, y: 1000, vx: 0, vy: 0, hp: 100, maxHp: 100, r: 20,
    invuln: 0, shield: 0, bombs: 1, weaponLevel: 1, fireT: 0, thrust: 1, bank: 0,
    skillCd: 0, ultCd: 0, skillT: 0, ultT: 0, stealth: 0, barrier: 0,
    dmgBuff: 0, speedBuff: 0, multiBuff: 0, laserBuff: 0, missileBuff: 0, beamT: 0,
    critMul: 1, dead: false, boost: 0,
    // EVASIVE MANEUVER
    evadeCd: 0, evadeT: 0, evadePhase: 0, evadeHomeX: 0, evadeHomeY: 0,
    evadeDodges: 0, evadeBossDodge: false, evadeTrailT: 0,
    // passive identity state
    volley: 0, momentum: 0, charge: 0,
  };

  wings: Wing[] = [];
  bullets: Bullet[] = [];
  eBullets: Bullet[] = [];
  enemies: EnemyE[] = [];
  powerups: PowerUp[] = [];
  boss: {
    active: boolean; def: BossDef; x: number; y: number; hp: number; maxHp: number;
    parts: BossPart[]; phase: number; t: number; fireT: number; hurt: number;
    entering: boolean; dying: number; attackIdx: number; laserOn: number; secret: boolean;
  } | null = null;

  bossQueue: string[] = [];
  bossesDefeated = 0;
  bossRushDelay = 0;
  bossXpEarned = 0;
  bossSigT = 0;
  bossSpecial = 0;
  waveStall = 0;

  wave = 0; waveTimer = 0;
  spawnQueue: { t: number; id: string; x: number; elite?: boolean }[] = [];
  score = 0; kills = 0; coinsEarned = 0; crystalsEarned = 0;
  combo = 0; comboTimer = 0; bestCombo = 0;
  hitsTaken = 0; abilitiesUsed = 0; runTime = 0;
  shake = 0; flash = 0; flashColor = "255,80,80"; warning = 0; bossKilled = false;
  secretDefeated = false;
  slowmo = 0; scroll = 1; hitStop = 0; overkillGuard = false; splitGuard = false;
  /** Pause-safe deferred callbacks (replaces setTimeout — no leaks, respects pause). */
  private timers: { t: number; fn: () => void }[] = [];
  /** Live entity counters — avoids per-frame array allocations. */
  private nEnemies = 0; private nPBullets = 0; private nEBullets = 0;
  private trailsOn = true;
  private auraTick = 0;

  /* camera */
  cam = { x: 360, y: 640, zoom: 1, tx: 360, ty: 640, tz: 1, killCam: 0, kickX: 0, kickY: 0, roll: 0 };
  /** Directional recoil impulse — reads as force, not noise. */
  private kickVX = 0; private kickVY = 0;

  /* dynamic events */
  evt: { id: MapEventId; t: number; cooldown: number; name: string } = { id: "none", t: 0, cooldown: 14, name: "" };
  empLock = 0;
  wind = 0;

  constructor(canvas: HTMLCanvasElement, save: SaveData, callbacks: {
    onHud: (h: HudState) => void; onEnd: (r: RunResult) => void; onEvent: (t: string, d?: any) => void;
  }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.save = save;
    this.onHud = callbacks.onHud;
    this.onEnd = callbacks.onEnd;
    this.onEvent = callbacks.onEvent;
    this.quality = save.settings.quality;
    this.difficulty = save.settings.difficulty;
    this.input = new InputManager(canvas, (cx, cy) => this.toVirtual(cx, cy));
    const q = QUALITY[this.quality];
    this.fx = new ParticleSystem(q.particleMax, q.particleScale);
    this.fx.localize = (text) => this.text(text);
    for (let i = 0; i < 700; i++) this.bullets.push(this.blankBullet());
    for (let i = 0; i < 1100; i++) this.eBullets.push(this.blankBullet());
    for (let i = 0; i < 110; i++) this.enemies.push({ active: false } as EnemyE);
    for (let i = 0; i < 70; i++) this.powerups.push({ active: false } as PowerUp);
    this.resize();
  }

  private text(source: string, params?: Params) {
    return translate(this.save.settings.language, source, params);
  }

  /** Schedule a callback in `sec` game-seconds. Cancelled on run restart/destroy. */
  private after(sec: number, fn: () => void) {
    if (this.timers.length > 240) return; // hard cap, never unbounded
    this.timers.push({ t: sec, fn });
  }
  private runTimers(dt: number) {
    if (!this.timers.length) return;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      tm.t -= dt;
      if (tm.t <= 0) {
        this.timers.splice(i, 1);
        if (this.running && !this.over) tm.fn();
      }
    }
  }
  /** Recount live entities once per frame instead of allocating filters everywhere. */
  private recount() {
    let a = 0, b = 0, c = 0;
    const en = this.enemies, pb = this.bullets, eb = this.eBullets;
    for (let i = 0; i < en.length; i++) if (en[i].active) a++;
    for (let i = 0; i < pb.length; i++) if (pb[i].active) b++;
    for (let i = 0; i < eb.length; i++) if (eb[i].active) c++;
    this.nEnemies = a; this.nPBullets = b; this.nEBullets = c;
  }

  /**
   * Unified impact director. `power` 0..1 maps to a *proportional* response:
   * shake, directional kick, flash and (optionally) a brief zoom punch.
   * Shake is intentionally capped and decays fast so it never becomes noise.
   */
  impact(power: number, opts: { flash?: string; zoom?: number; dirX?: number; dirY?: number; freeze?: number } = {}) {
    const q = Math.max(0, Math.min(1, power));
    // curved so light hits stay subtle and only real events shake hard
    this.shake = Math.min(1.15, Math.max(this.shake, q * q * 1.05 + q * 0.12));
    if (opts.dirX || opts.dirY) {
      const mag = 10 + q * 26;
      this.kickVX += (opts.dirX || 0) * mag;
      this.kickVY += (opts.dirY || 0) * mag;
    }
    if (opts.flash) { this.flash = Math.max(this.flash, 0.25 + q * 0.6); this.flashColor = opts.flash; }
    if (opts.zoom) this.cam.tz = Math.max(this.cam.tz, 1 + opts.zoom * q);
    if (opts.freeze) this.hitStop = Math.max(this.hitStop, opts.freeze);
  }

  /** Brief, elegant slow motion — never stacks, never overstays. */
  cinematic(duration: number, zoom = 0) {
    this.slowmo = Math.max(this.slowmo, Math.min(1.1, duration));
    if (zoom) this.cam.tz = Math.max(this.cam.tz, 1 + zoom);
  }

  private blankBullet(): Bullet {
    return { active: false, x: 0, y: 0, vx: 0, vy: 0, r: 4, dmg: 1, friendly: true, life: 3, color: "#fff", kind: "bullet", pierce: 0, homing: 0, target: null, rot: 0, crit: false, w: 6, h: 14, spin: 0, hitIds: 0 };
  }

  /* ============================ setup ============================ */

  toVirtual(cx: number, cy: number) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * this.W, y: ((cy - r.top) / r.height) * this.H };
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const q = QUALITY[this.quality];
    const dpr = Math.min(window.devicePixelRatio || 1, q.dpr);
    this.W = 720;
    this.H = clamp(Math.round((720 * r.height) / Math.max(1, r.width)), 860, 1500);
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.dpr = dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.bg) { this.bg.W = this.W; this.bg.H = this.H; }
    this.cam.tx = this.cam.x = this.W / 2;
    this.cam.ty = this.cam.y = this.H / 2;
  }

  setQuality(q: QualityLevel) {
    this.quality = q;
    const Q = QUALITY[q];
    this.fx.setLimits(Q.particleMax, Q.particleScale);
    this.resize();
    if (this.bg) this.bg.build(Q.stars);
  }

  /** Aggregate every progression source into the active loadout. */
  buildLoadout() {
    const s = this.save;
    this.plane = getPlane(s.selected);
    const pd = s.planeData[s.selected] || defaultPlaneSave();
    const tal = computeTalents(s.talents || {});
    const nodes = computePlaneNodes(pd.nodes || {});
    const pilot = getPilot(pd.pilot);
    const pb = pilot.bonus;
    const up = s.upgrades;
    const st = this.plane.stats;
    // Slower stat growth supports the new 0-700 airframe ladder without runaway damage.
    const planeLv = 1 + Math.min(100, pd.level) * 0.012 + Math.max(0, pd.level - 100) * 0.003;

    this.skinPalette = getSkin(pd.skin)?.palette || null;

    this.load = {
      maxHp: Math.round(st.hp * (1 + up.health * 0.08) * tal.hp * nodes.hp * (1 + (pb.hp || 0)) * planeLv),
      speed: st.speed * (1 + up.speed * 0.03) * nodes.speed * (1 + (pb.speed || 0)),
      damage: st.damage * (1 + up.damage * 0.06) * tal.damage * nodes.damage * (1 + (pb.damage || 0)) * planeLv,
      fireRate: st.fireRate * (1 + up.fireRate * 0.04) * tal.fireRate * nodes.fireRate * (1 + (pb.fireRate || 0)),
      // CRIT CHANCE: base + upgrades + talents + airframe nodes + pilot perk.
      // Hard-capped at 75% so a maxed build still misses 1 in 4 shots.
      crit: Math.min(0.75, Math.max(0, st.crit + up.critical * 0.015 + tal.crit + nodes.crit + (pb.crit || 0))),
      // CRIT DAMAGE: multiplier applied on a critical hit (2.1 = +110% damage).
      // Capped at 5x so numbers stay readable and bosses remain paced.
      // +5% of the base multiplier per upgrade level, then talent/pilot multipliers.
      critDmg: Math.min(5, Math.max(1.3, (2.1 + up.critDamage * 0.105) * (tal.critDmg + (pb.critDmg || 0)))),
      pierce: tal.pierce,
      ultCdMul: tal.ultCd * nodes.ability * (1 + (pb.ultCd || 0)),
      skillCdMul: tal.skillCd * nodes.ability * (1 + (pb.skillCd || 0)),
      regen: tal.regen + (pb.regen || 0),
      iframeMul: tal.iframe,
      shields: Math.floor(up.shield / 8) + tal.shields + (pb.shields || 0),
      magnet: tal.magnet,
      coinMul: tal.coins * (1 + (pb.coins || 0)),
      xpMul: tal.xp * (1 + (pb.xp || 0)),
      comboWindow: 3 + tal.combo,
      thorns: tal.thorns,
      dmgTakenMul: 1,
    };

    // wingmen
    this.wings = (s.wingmen || []).slice(0, 2).map((w, i) => {
      const def = w && w.id !== "none" ? getWingman(w.id) || null : null;
      const talents = (w && w.talents) || {};
      const stats = def ? wingmanStats(def, talents) : { damage: 0, rate: 1, range: 0, special: 0 };
      if (def?.id === "repair") {
        this.load.regen += stats.special;
        this.load.magnet *= 1 + (stats.range / def.base.range - 1);
        const armor = talents["r_armor"] || 0;
        this.load.dmgTakenMul *= Math.max(0.5, 1 - armor * 0.03);
      }
      return {
        slot: i, def, stats, talents,
        x: this.W / 2 + (i === 0 ? -70 : 70), y: this.H - 180,
        fireT: Math.random() * 0.4, charge: 0, active: !!def,
      };
    });
  }

  startRun(cfg: RunConfig): boolean {
    const access = runAccess(this.save, cfg);
    if (!access.ok) { this.onEvent("accessDenied", access.reason); return false; }
    if (this.running && !this.over && !this.paused) return false;
    this.stop();
    this.cfg = { ...cfg, difficulty: cfg.difficulty ?? this.save.settings.difficulty };
    this.difficulty = this.cfg.difficulty!;
    this.runId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.flownPlaneId = this.save.selected;
    this.firstClear = cfg.mode === "campaign" && planetState(this.save, cfg.galaxy, cfg.planet).maps === cfg.map;
    if (cfg.mode === "secret") {
      const fee = getPlanet(cfg.galaxy, cfg.planet).secretFee;
      this.save = { ...this.save, coins: this.save.coins - fee.coins, crystals: this.save.crystals - fee.crystals };
      this.onEvent("entryPaid", this.save);
    }
    this.planet = getPlanet(cfg.galaxy, cfg.planet);
    const maps = getMaps(this.planet);
    this.mapDef = maps[clamp(cfg.map, 0, maps.length - 1)];
    this.ident = sectorIdentity(cfg.mode === "campaign" || cfg.mode === "daily" ? cfg.map : 5);

    const Q = QUALITY[this.quality];
    this.bg = new Background(this.planet, this.W, this.H, Q.stars);
    this.bg.weather = "none";
    Audio.setBiome(cfg.galaxy * 3 + cfg.planet);

    this.buildLoadout();
    const L = this.load;
    Object.assign(this.player, {
      x: this.W / 2, y: this.H - 220, vx: 0, vy: 0, hp: L.maxHp, maxHp: L.maxHp,
      r: 20 * this.plane.art.size, invuln: 1.5, shield: L.shields, bombs: 1 + Math.floor(L.shields / 2),
      weaponLevel: 1, fireT: 0, thrust: 1, bank: 0, skillCd: 0, ultCd: 0, skillT: 0, ultT: 0,
      stealth: 0, barrier: 0, dmgBuff: 0, speedBuff: 0, multiBuff: 0, laserBuff: 0, missileBuff: 0,
      beamT: 0, critMul: 1, dead: false, boost: 0,
      evadeCd: 0, evadeT: 0, evadePhase: 0, evadeHomeX: 0, evadeHomeY: 0,
      evadeDodges: 0, evadeBossDodge: false, evadeTrailT: 0,
      volley: 0, momentum: 0, charge: 0,
    });

    this.bullets.forEach((b) => (b.active = false));
    this.eBullets.forEach((b) => (b.active = false));
    this.enemies.forEach((e) => (e.active = false));
    this.powerups.forEach((p) => (p.active = false));
    this.fx.clear();
    this.boss = null;
    this.bossQueue = [];
    this.bossesDefeated = 0;
    this.bossRushDelay = 0;
    this.bossXpEarned = 0;
    this.enemyXpEarned = 0;
    this.bossSigT = 0;
    this.bossSpecial = 0;
    this.waveStall = 0;
    this.timers.length = 0;
    this.dmgAcc.clear(); this.dmgFlush = 0;
    // New sector: drop cached sprites from other palettes so memory stays flat.
    clearSprites();
    this.wave = 0; this.waveTimer = 1.4; this.spawnQueue = [];
    this.score = 0; this.kills = 0; this.coinsEarned = 0; this.crystalsEarned = 0;
    this.combo = 0; this.comboTimer = 0; this.bestCombo = 0; this.bossKilled = false;
    this.secretDefeated = false;
    this.hitsTaken = 0; this.abilitiesUsed = 0; this.runTime = 0;
    this.shake = 0; this.flash = 0; this.warning = 0; this.over = false; this.paused = false;
    this.time = 0; this.empLock = 0; this.wind = 0; this.hitStop = 0;
    this.input.reset();
    this.cam = { x: this.W / 2, y: this.H / 2, zoom: 1, tx: this.W / 2, ty: this.H / 2, tz: 1, killCam: 0, kickX: 0, kickY: 0, roll: 0 };
    this.kickVX = 0; this.kickVY = 0;
    this.evt = { id: this.mapDef.event, t: 0, cooldown: 16, name: "" };

    if (cfg.mode === "secret") {
      this.startBoss(this.planet.secretBoss, true);
    } else if (cfg.mode === "bossrush") {
      this.bossQueue = this.buildBossRushQueue();
      this.startBoss(this.bossQueue.shift()!, false);
    }

    Audio.setIntensity(0.45);
    Audio.playMusic(cfg.mode === "secret" ? "SECRET" : cfg.mode === "bossrush" ? "BOSS" : "BATTLE", true);
    this.start();
    this.pushHud();
    return true;
  }

  private buildBossRushQueue(): string[] {
    return availableRushBosses(this.save);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.input.enabled = true;
    this.lastTs = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }
  stop() { this.running = false; this.input.enabled = false; cancelAnimationFrame(this.raf); }
  setPaused(p: boolean) {
    if (!this.running || this.over) return;
    this.paused = p;
    this.lastTs = performance.now();
    if (p) Audio.stopMusic();
    else Audio.playMusic(this.musicForState(), true);
    this.pushHud();
  }
  destroy() { this.stop(); this.timers.length = 0; this.input.destroy(); Audio.stopMusic(); }

  private musicForState() {
    if (this.boss?.active) {
      if (this.boss.secret) return "SECRET" as const;
      return this.boss.phase >= 3 ? ("ENRAGE" as const) : ("BOSS" as const);
    }
    return "BATTLE" as const;
  }

  loop = (ts: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const clockDt = Math.max(0, (ts - this.lastTs) / 1000);
    let dt = clockDt;
    this.lastTs = ts;
    if (dt > CONFIG.MAX_DT) dt = CONFIG.MAX_DT;
    this.fpsFrames++; this.fpsTimer += clockDt;
    if (this.fpsTimer > 0.4) {
      this.fps = this.fpsFrames / this.fpsTimer; this.fpsFrames = 0; this.fpsTimer = 0;
      if (!this.paused && !this.over) {
        if (this.fps < 44) this.lowFps += 1; else this.lowFps = Math.max(0, this.lowFps - 1);
        if (this.lowFps > 6) {
          this.lowFps = 0;
          if (this.quality === "HIGH") { this.setQuality("MEDIUM"); this.onEvent("quality", "MEDIUM"); }
          else if (this.quality === "MEDIUM") { this.setQuality("LOW"); this.onEvent("quality", "LOW"); }
        }
      }
    }
    if (this.input.consumePause() && !this.over) this.setPaused(!this.paused);
    if (!this.paused && !this.over) {
      if (this.hitStop > 0) { this.hitStop = Math.max(0, this.hitStop - dt); dt *= 0.12; }
      else if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.32; }
      this.update(dt, clockDt);
    }
    this.render();
    this.hudTimer += dt;
    if (this.hudTimer > 0.1) { this.hudTimer = 0; this.pushHud(); }
  };

  /* ============================ update ============================ */

  update(dt: number, clockDt = dt) {
    if (this.paused || this.over) return;
    this.time += dt;
    this.runTime += clockDt;
    // Cooldowns use active-play time, including evasion and cinematic slow motion.
    this.player.skillCd = Math.max(0, this.player.skillCd - clockDt);
    this.player.ultCd = Math.max(0, this.player.ultCd - clockDt);
    this.player.evadeCd = Math.max(0, this.player.evadeCd - clockDt);
    this.recount();
    this.trailsOn = QUALITY[this.quality].trails;
    this.runTimers(dt);
    if (this.over) return;
    const D = DIFFICULTY[this.difficulty];
    this.updateEvents(dt);
    this.bg.update(dt, this.scroll);
    this.updatePlayer(dt);
    this.updateWingmen(dt);
    this.updateSpawn(dt, D);
    this.updateEnemies(dt, D);
    this.updateBoss(dt, D);
    this.updateBullets(dt);
    this.updatePowerups(dt);
    this.fx.update(dt);
    this.flushDamage(dt);
    this.collide();
    this.updateCamera(dt);
    this.updateMusicIntensity();

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * (3.2 + this.shake * 2.4));
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.4);
    if (this.warning > 0) this.warning = Math.max(0, this.warning - dt);
    if (this.empLock > 0) this.empLock = Math.max(0, this.empLock - dt);

    // daily time-limit failure is judged at the end; nothing here
  }

  private updateMusicIntensity() {
    const hpFrac = this.player.hp / Math.max(1, this.player.maxHp);
    let i = Math.max(this.ident?.intensity ?? 0.35, 0.35 + Math.min(0.3, this.nEnemies / 24));
    if (this.boss?.active) i = 0.75 + (this.boss.phase >= 3 ? 0.25 : this.boss.phase * 0.05);
    if (hpFrac < 0.3) i = Math.min(1, i + 0.12);
    i = Math.min(1, i + Math.min(0.2, this.combo / 120));
    Audio.setIntensity(i);
    const want = this.musicForState();
    if (!this.paused && Audio.state !== want && Audio.state !== "VICTORY" && Audio.state !== "GAMEOVER") {
      Audio.playMusic(want);
    }
  }

  private updateCamera(dt: number) {
    const c = this.cam;
    if (c.killCam > 0) {
      c.killCam -= dt;
      if (c.killCam <= 0) { c.tz = 1; c.tx = this.W / 2; c.ty = this.H / 2; }
    } else if (!this.boss?.active) {
      // subtle follow + boost punch-in
      const boost = this.player.boost;
      c.tz = 1 + boost * 0.06;
      c.tx = this.W / 2 + (this.player.x - this.W / 2) * 0.06;
      c.ty = this.H / 2 + (this.player.y - this.H / 2) * 0.04;
    } else {
      c.tz = 1.02;
      c.tx = this.W / 2 + (this.player.x - this.W / 2) * 0.03;
      c.ty = this.H / 2;
    }
    const k = Math.min(1, dt * (c.killCam > 0 ? 4.5 : 3));
    c.x += (c.tx - c.x) * k;
    c.y += (c.ty - c.y) * k;
    c.zoom += (c.tz - c.zoom) * k;
    // critically-damped recoil spring — punchy, settles clean
    this.kickVX += -c.kickX * 240 * dt;
    this.kickVY += -c.kickY * 240 * dt;
    const damp = Math.pow(0.0022, dt);
    this.kickVX *= damp; this.kickVY *= damp;
    c.kickX += this.kickVX * dt;
    c.kickY += this.kickVY * dt;
    // subtle roll follows player banking for a sense of flight
    const wantRoll = this.player.dead ? 0 : this.player.bank * 0.012 + (this.evading ? 0.02 : 0);
    c.roll += (wantRoll - c.roll) * Math.min(1, dt * 4);
  }

  /* ---------------------- dynamic events ---------------------- */

  private updateEvents(dt: number) {
    const e = this.evt;
    if (e.id === "none") return;
    if (e.t > 0) {
      e.t -= dt;
      if (e.id === "storm") {
        this.wind = Math.sin(this.time * 0.6) * 150;
        if (Math.random() < 0.4) this.fx.spawn({ x: Math.random() * this.W, y: -10, vx: -120, vy: 900, life: 0.5, size: 2, color: "rgba(200,230,255,0.6)", kind: "streak" });
      }
      if (e.id === "flare" && Math.random() < 0.5) this.fx.ember(Math.random() * this.W, this.H + 10, "#ffb020");
      if (e.t <= 0) {
        this.bg.weather = "none";
        this.wind = 0;
        this.empLock = 0;
        this.onEvent("eventEnd", e.name);
      }
      return;
    }
    e.cooldown -= dt;
    if (e.cooldown <= 0 && this.wave >= 2) {
      e.cooldown = 34;
      this.triggerEvent(e.id);
    }
  }

  triggerEvent(id: MapEventId) {
    const e = this.evt;
    switch (id) {
      case "storm":
        e.t = 15; e.name = "ION STORM";
        this.bg.weather = "storm";
        Audio.playSFX("storm");
        break;
      case "emp":
        e.t = 9; e.name = "EMP BURST";
        this.bg.weather = "emp";
        this.empLock = 9;
        this.flash = 0.9; this.flashColor = "120,200,255";
        Audio.playSFX("emp");
        break;
      case "flare":
        e.t = 13; e.name = "SOLAR FLARE";
        this.bg.weather = "flare";
        this.flash = 0.6; this.flashColor = "255,220,150";
        break;
      case "meteor":
        e.t = 14; e.name = "METEOR SHOWER";
        Audio.playSFX("alarm");
        break;
      case "elite": {
        e.t = 6; e.name = "ELITE SQUADRON";
        Audio.playSFX("alarm");
        const roster = this.planet.roster;
        const eliteId = roster.includes("elite") ? "elite" : roster[roster.length - 1];
        const f = FORMATIONS[3];
        f.build(3, this.W).forEach((slot) => this.spawnQueue.push({ t: slot.delay, id: eliteId, x: slot.x, elite: true }));
        break;
      }
      default: return;
    }
    this.impact(0.45, { zoom: 0.04 });
    this.onEvent("eventStart", e.name);
  }

  private meteorTick(dt: number) {
    if (this.evt.id !== "meteor" || this.evt.t <= 0) return;
    if (Math.random() < dt * 2.4) {
      this.spawnBullet({
        x: 60 + Math.random() * (this.W - 120), y: -60,
        vx: (Math.random() - 0.5) * 90, vy: 260 + Math.random() * 160,
        dmg: 22, color: "#ff8a3d", kind: "meteor", r: 20, w: 40, h: 40, life: 9,
      }, false);
    }
  }

  /* ---------------------- player ---------------------- */

  private updatePlayer(dt: number) {
    const p = this.player;
    if (p.dead) return;
    const L = this.load;
    const baseSpeed = L.speed * (p.speedBuff > 0 ? 1.4 : 1) * (this.plane.id === "phantom" ? 1 + p.momentum * 0.3 : 1);
    const ctrl = this.save.settings.control;
    const ax = this.input.axis();
    const useKeys = ax.x !== 0 || ax.y !== 0;
    const wantPointer = (ctrl === "auto" || ctrl === "touch" || ctrl === "mouse") && this.input.pointerActive && !useKeys;

    const prevX = p.x, prevY = p.y;
    if (p.evadeT > 0) {
      this.updateEvade(dt);
      p.vx = (p.x - prevX) / Math.max(0.0001, dt);
      p.vy = (p.y - prevY) / Math.max(0.0001, dt);
      p.bank += (clamp(p.vx / 400, -1, 1) - p.bank) * Math.min(1, dt * 8);
      p.boost = 1;
      p.thrust = 1.6;
      p.fireT -= dt;
      if (p.fireT <= 0) { p.fireT = 1 / this.load.fireRate; this.fireWeapon(); }
      this.meteorTick(dt);
      return;
    }
    if (wantPointer) {
      const tx = this.input.pointerX;
      const ty = this.input.pointerY - (this.input.pointerMode === "touch" ? 70 : 0);
      const k = 1 - Math.pow(0.0009, dt);
      const nx = p.x + (tx - p.x) * k;
      const ny = p.y + (ty - p.y) * k;
      const maxStep = baseSpeed * 1.9 * dt;
      const ddx = nx - p.x, ddy = ny - p.y;
      const dl = Math.hypot(ddx, ddy);
      const sc = dl > maxStep ? maxStep / dl : 1;
      p.x += ddx * sc; p.y += ddy * sc;
      p.vx = (p.x - prevX) / Math.max(0.0001, dt);
      p.vy = (p.y - prevY) / Math.max(0.0001, dt);
    } else {
      p.vx += (ax.x * baseSpeed - p.vx) * Math.min(1, dt * 12);
      p.vy += (ax.y * baseSpeed - p.vy) * Math.min(1, dt * 12);
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    if (this.wind !== 0) p.x += this.wind * dt * 0.35;

    const pad = CONFIG.PLAYER_BOUND_PAD;
    p.x = clamp(p.x, pad, this.W - pad);
    p.y = clamp(p.y, pad + 60, this.H - pad);
    p.bank += (clamp(p.vx / 400, -1, 1) - p.bank) * Math.min(1, dt * 8);
    const spd = Math.hypot(p.vx, p.vy) / Math.max(1, baseSpeed);
    p.boost += (clamp(spd * (p.speedBuff > 0 ? 1.3 : 1), 0, 1) - p.boost) * Math.min(1, dt * 5);
    p.thrust = 0.7 + clamp(-p.vy / 500, 0, 0.5) + Math.abs(p.vx) / 1600;

    const dec = (v: number) => Math.max(0, v - dt);
    p.invuln = dec(p.invuln);
    p.skillT = dec(p.skillT); p.ultT = dec(p.ultT); p.stealth = dec(p.stealth);
    p.barrier = dec(p.barrier); p.dmgBuff = dec(p.dmgBuff); p.speedBuff = dec(p.speedBuff);
    p.multiBuff = dec(p.multiBuff); p.laserBuff = dec(p.laserBuff); p.missileBuff = dec(p.missileBuff);
    p.beamT = dec(p.beamT);

    // passive hull regeneration
    if (L.regen > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + L.regen * dt);

    // ---- AIRFRAME PASSIVE IDENTITY ----
    if (this.plane.id === "phantom") {
      // AFTERBURN: momentum builds while unhit
      p.momentum = Math.min(1, p.momentum + dt * 0.11);
      if (p.momentum > 0.98 && Math.random() < dt * 3) {
        this.fx.spawn({ x: p.x + (Math.random() - 0.5) * 40, y: p.y + 40, vy: 180, life: 0.3, size: 4, color: this.plane.art.trail, kind: "spark" });
      }
    } else if (this.plane.id === "nova") {
      // OVERCHARGE decays slowly when not firing
      p.charge = Math.max(0, p.charge - dt * 0.12);
    }

    // engine trails + hyper speed streaks
    const Q = QUALITY[this.quality];
    if (Q.trails) {
      const size = this.plane.art.size;
      const trailCol = this.skinPalette?.trail || this.plane.art.trail;
      for (const ox of [-11 * size, 11 * size]) this.fx.trail(p.x + ox, p.y + 58 * size, trailCol, 4 + Math.random() * 3);
      if (p.boost > 0.55 && Math.random() < p.boost) {
        for (let i = 0; i < 2; i++) this.fx.streak(Math.random() * this.W, -20 + Math.random() * this.H, 60 + Math.random() * 120, "rgba(190,235,255,0.6)");
      }
    }

    if (this.input.consumeSkill()) this.useSkill();
    if (this.input.consumeUlt()) this.useUltimate();
    if (this.input.consumeEvade()) this.useEvade();

    p.fireT -= dt;
    if (p.fireT <= 0) {
      const rateMul = (p.skillT > 0 && this.plane.id === "falcon" ? 2 : 1) * (p.speedBuff > 0 ? 1.25 : 1)
        * (this.plane.id === "phantom" ? 1 + p.momentum * 0.45 : 1);
      p.fireT = 1 / (L.fireRate * rateMul);
      this.fireWeapon();
    }
    if (p.beamT > 0) this.fireBeam(dt);
    this.meteorTick(dt);
  }

  private playerDamage() {
    const p = this.player;
    return this.load.damage * (p.dmgBuff > 0 ? 1.7 : 1) * (1 + (p.weaponLevel - 1) * 0.14);
  }

  private rollCrit() {
    const c = this.load.crit * this.player.critMul * (this.player.stealth > 0 ? 2 : 1);
    return Math.random() < c;
  }

  private spawnBullet(o: Partial<Bullet>, friendly: boolean) {
    const arr = friendly ? this.bullets : this.eBullets;
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      if (b.active) continue;
      // Manual field reset: the old blankBullet()+Object.assign pattern
      // allocated two objects per shot and caused GC hitches in bullet hell.
      b.active = true; b.friendly = friendly;
      b.x = o.x ?? 0; b.y = o.y ?? 0; b.vx = o.vx ?? 0; b.vy = o.vy ?? 0;
      b.r = o.r ?? 4; b.dmg = o.dmg ?? 1; b.life = o.life ?? 3;
      b.color = o.color ?? "#fff"; b.kind = o.kind ?? "bullet";
      b.pierce = o.pierce ?? 0; b.homing = o.homing ?? 0;
      b.target = null; b.rot = 0; b.crit = o.crit ?? false;
      b.w = o.w ?? 6; b.h = o.h ?? 14; b.spin = o.spin ?? 0; b.hitIds = 0;
      return b;
    }
    return null;
  }


  private fireWeapon() {
    const p = this.player;
    const lvl = p.weaponLevel + (p.multiBuff > 0 ? 1 : 0);
    const type = p.laserBuff > 0 ? "LASER" : this.plane.weapon;
    const dmg = this.playerDamage();
    // FALCON — ACE INSTINCT: every 4th volley is a guaranteed critical
    p.volley++;
    const aceVolley = this.plane.id === "falcon" && p.volley % 4 === 0;
    // NOVA — OVERCHARGE: sustained fire charges the core
    if (this.plane.id === "nova") p.charge = Math.min(1, p.charge + 0.035);
    const overcharged = this.plane.id === "nova" && p.charge >= 1;
    const crit = aceVolley || this.rollCrit();
    const d = crit ? dmg * this.load.critDmg : dmg;
    const col = this.skinPalette?.accent || this.plane.art.accent;
    const y = p.y - 40;
    const gp = this.load.pierce + (overcharged ? 2 : 0);
    Audio.playSFX(
      type === "LASER" ? (overcharged ? "laserBig" : "laser")
      : type === "MISSILE" ? "missile"
      : type === "PLASMA" ? "plasma"
      : type === "ELECTRIC" ? "electric"
      : type === "PIERCING" ? "railgun"
      : "shoot"
    );
    if (aceVolley) { Audio.playSFX("aceVolley"); this.fx.spawn({ x: p.x, y: y - 10, kind: "ring", life: 0.26, size: 22, color: "#ffd23d" }); }
    if (overcharged) {
      this.fx.spawn({ x: p.x, y: y - 6, kind: "ring", life: 0.3, size: 26, color: col });
      p.charge = Math.max(0, p.charge - 0.02);
    }

    const spread = (n: number, arc: number, cb: (ang: number, i: number) => void) => {
      for (let i = 0; i < n; i++) cb(-Math.PI / 2 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * arc), i);
    };
    const shots = Math.min(5, lvl);

    if (type === "LASER" || (type === "PIERCING" && lvl >= 4)) {
      const n = shots >= 4 ? 3 : shots >= 2 ? 2 : 1;
      spread(n, 0.22, (a) => {
        this.spawnBullet({ x: p.x, y, vx: Math.cos(a) * 1400, vy: Math.sin(a) * 1400, dmg: d * 0.75, color: col, kind: "laser", r: 7, w: 9 + shots * 2, h: 46, pierce: 2 + shots + gp, life: 1.4, crit }, true);
      });
    } else if (type === "MISSILE") {
      const n = Math.min(4, 1 + Math.floor(shots / 2));
      for (let i = 0; i < n; i++) {
        const ox = (i - (n - 1) / 2) * 26;
        this.spawnBullet({ x: p.x + ox, y, vx: ox * 1.5, vy: -520, dmg: d * 1.2, color: "#ff8a3d", kind: "missile", r: 8, w: 10, h: 26, homing: 3.4, life: 3, crit, pierce: gp }, true);
      }
      spread(Math.max(1, shots - 1), 0.34, (a) => {
        this.spawnBullet({ x: p.x, y, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, dmg: d * 0.55, color: col, kind: "bullet", r: 5, w: 7, h: 16, life: 2, crit, pierce: gp }, true);
      });
    } else if (type === "ELECTRIC") {
      spread(shots, 0.5, (a, i) => {
        this.spawnBullet({ x: p.x, y, vx: Math.cos(a) * 1000, vy: Math.sin(a) * 1000, dmg: d * 0.8, color: col, kind: "electric", r: 9, w: 12, h: 20, life: 1.6, pierce: (shots >= 4 ? 2 : 0) + gp, crit, spin: i }, true);
      });
    } else if (type === "PLASMA") {
      spread(shots, 0.42, (a) => {
        this.spawnBullet({ x: p.x, y, vx: Math.cos(a) * 1100, vy: Math.sin(a) * 1100, dmg: d * 0.8, color: col, kind: "plasma", r: 9, w: 14, h: 18, life: 1.8, crit, pierce: gp }, true);
      });
    } else if (type === "PIERCING") {
      spread(shots, 0.3, (a) => {
        this.spawnBullet({ x: p.x, y, vx: Math.cos(a) * 980, vy: Math.sin(a) * 980, dmg: d, color: col, kind: "pierce", r: 7, w: 10, h: 30, pierce: 1 + Math.floor(shots / 2) + gp, life: 2, crit }, true);
      });
    } else {
      spread(shots, 0.36, (a) => {
        this.spawnBullet({ x: p.x, y, vx: Math.cos(a) * 1050, vy: Math.sin(a) * 1050, dmg: d, color: col, kind: "bullet", r: 6, w: 8, h: 20, life: 2, crit, pierce: gp }, true);
      });
    }

    if (this.save.upgrades.missiles > 0 && Math.random() < 0.25) {
      for (const ox of [-34, 34]) {
        this.spawnBullet({ x: p.x + ox, y: p.y, vx: ox * 3, vy: -420, dmg: dmg * 0.3 * this.save.upgrades.missiles, color: "#ffd23d", kind: "missile", r: 6, w: 8, h: 20, homing: 3, life: 2.6 }, true);
      }
    }
    // muzzle flash + directional recoil scaled by weapon class
    const heavyGun = type === "MISSILE" || type === "PIERCING";
    this.fx.spawn({ x: p.x, y: y - 6, kind: "flash", life: 0.07, size: heavyGun ? 26 : 16, color: col });
    if (QUALITY[this.quality].glow) {
      for (let i = 0; i < (heavyGun ? 3 : 2); i++) {
        this.fx.spawn({
          x: p.x + (Math.random() - 0.5) * 16, y: y - 4,
          vx: (Math.random() - 0.5) * 90, vy: -120 - Math.random() * 90,
          life: 0.14, size: 2 + Math.random() * 2.4, color: "#ffffff", kind: "spark", drag: 0.86,
        });
      }
    }
    this.kickVY += heavyGun ? 3.2 : 1.5;
  }

  private fireBeam(dt: number) {
    const p = this.player;
    const dmg = this.playerDamage() * 26 * dt;
    const halfW = 26;
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (Math.abs(e.x - p.x) < halfW + e.def.radius && e.y < p.y) this.damageEnemy(e, dmg, true);
    }
    if (this.boss?.active && !this.boss.entering) {
      const b = this.boss;
      for (const part of b.parts) {
        if (part.dead) continue;
        const pd = b.def.parts.find((x) => x.id === part.id)!;
        const px = b.x + pd.x * b.def.scale, py = b.y + pd.y * b.def.scale;
        if (Math.abs(px - p.x) < halfW + pd.r && py < p.y) this.damageBossPart(part, dmg * 0.6, false);
      }
    }
    if (Math.random() < 0.6) this.fx.spawn({ x: p.x + (Math.random() - 0.5) * 30, y: p.y - 100 - Math.random() * 400, kind: "spark", life: 0.2, size: 4, color: this.plane.art.accent });
  }

  /* ---------------------- wingmen ---------------------- */

  private updateWingmen(dt: number) {
    const p = this.player;
    for (const w of this.wings) {
      if (!w.active || !w.def) continue;
      const side = w.slot === 0 ? -1 : 1;
      const tx = p.x + side * 78;
      const ty = p.y + 34 + Math.sin(this.time * 2.4 + w.slot) * 10;
      const k = Math.min(1, dt * 6.5);
      w.x += (tx - w.x) * k;
      w.y += (ty - w.y) * k;
      if (p.dead) continue;

      if (w.def.id === "shield") {
        // rotating barrier: destroys enemy bullets in radius
        const radius = w.stats.range;
        w.charge = 0.5 + Math.sin(this.time * 2) * 0.5;
        for (const b of this.eBullets) {
          if (!b.active || b.kind === "meteor") continue;
          if ((b.x - w.x) ** 2 + (b.y - w.y) ** 2 < radius * radius) {
            b.active = false;
            this.fx.hit(b.x, b.y, w.def.color);
          }
        }
        const thorns = w.stats.damage;
        if (thorns > 0) {
          for (const e of this.enemies) {
            if (!e.active) continue;
            if ((e.x - w.x) ** 2 + (e.y - w.y) ** 2 < radius * radius) this.damageEnemy(e, thorns * dt * 6, true);
          }
        }
        continue;
      }
      if (w.def.id === "repair") {
        w.charge = (this.time % 2) / 2;
        if (Math.random() < dt * 6) this.fx.spawn({ x: w.x + (Math.random() - 0.5) * 20, y: w.y, vx: (p.x - w.x) * 0.8, vy: (p.y - w.y) * 0.8, life: 0.4, size: 3, color: w.def.color, kind: "spark" });
        continue;
      }

      w.fireT -= dt;
      w.charge = 1 - clamp(w.fireT * w.stats.rate, 0, 1);
      if (w.fireT > 0) continue;
      w.fireT = 1 / Math.max(0.15, w.stats.rate);

      const target = this.nearestTargetInRange(w.x, w.y, w.stats.range);
      if (w.def.id === "laser") {
        const pierce = 1 + (w.talents["l_pierce"] || 0);
        this.spawnBullet({ x: w.x, y: w.y - 16, vx: 0, vy: -1250, dmg: w.stats.damage, color: w.def.color, kind: "laser", r: 5, w: 7, h: 34, pierce, life: 1.2 }, true);
      } else if (w.def.id === "turret") {
        if (!target) continue;
        const a = Math.atan2(target.y - w.y, target.x - w.x);
        const crit = Math.random() < w.stats.special;
        this.spawnBullet({ x: w.x, y: w.y, vx: Math.cos(a) * 980, vy: Math.sin(a) * 980, dmg: w.stats.damage * (crit ? 2 : 1), color: w.def.color, kind: "bullet", r: 5, w: 6, h: 14, life: 1.6, crit }, true);
      } else if (w.def.id === "missile") {
        const count = 1 + (w.talents["m_count"] || 0);
        for (let i = 0; i < count; i++) {
          this.spawnBullet({
            x: w.x + (i - (count - 1) / 2) * 12, y: w.y - 10, vx: (i - (count - 1) / 2) * 60, vy: -420,
            dmg: w.stats.damage, color: w.def.color, kind: "missile", r: 7, w: 9, h: 22,
            homing: 2.6 * (1 + (w.talents["m_track"] || 0) * 0.18), life: 3.4,
          }, true);
        }
      }
      Audio.playSFX("dronefire");
    }
  }

  private nearestTargetInRange(x: number, y: number, range: number): any {
    let best: any = null, bd = range * range;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    if (!best && this.boss?.active && !this.boss.entering) return { x: this.boss.x, y: this.boss.y };
    return best;
  }

  /* ---------------------- abilities ---------------------- */

  /* ==================== MANIOBRA EVASIVA AÉREA ====================
     30s exact cooldown. Total invulnerability for the whole maneuver.
     Phase 0: explosive climb   Phase 1: apex hover   Phase 2: controlled return
     ================================================================ */
  static readonly EVADE_CD = 30;
  static readonly EVADE_CLIMB = 0.52;
  static readonly EVADE_APEX = 0.46;
  static readonly EVADE_RETURN = 0.62;
  static readonly EVADE_TOTAL = 1.6;

  /** True while the aircraft is untouchable by ANY damage source. */
  get evading() { return this.player.evadeT > 0; }

  useEvade() {
    if (!this.running || this.paused || this.over) return;
    const p = this.player;
    if (p.dead || p.evadeCd > 0 || p.evadeT > 0) return;
    if (this.empLock > 0) { this.onEvent("empBlocked"); return; }

    p.evadeCd = GameEngine.EVADE_CD;         // EXACT 30s — never reduced
    p.evadeT = GameEngine.EVADE_TOTAL;
    p.evadePhase = 0;
    p.evadeHomeX = p.x;
    p.evadeHomeY = p.y;
    p.evadeDodges = 0;
    p.evadeBossDodge = false;
    p.evadeTrailT = 0;
    p.invuln = Math.max(p.invuln, GameEngine.EVADE_TOTAL + 0.35);

    // --- activation feedback ---
    const col = this.skinPalette?.accent || this.plane.art.accent;
    this.impact(0.4, { flash: "170,235,255", zoom: 0.09, dirY: -1 });
    this.cinematic(0.26);
    Audio.playSFX("evade");
    this.fx.shockwave(p.x, p.y, 150, col, 0.5);
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * 0.5 + (Math.random() - 0.5) * 1.6;
      this.fx.spawn({
        x: p.x, y: p.y, vx: Math.cos(a) * (120 + Math.random() * 200),
        vy: Math.sin(a) * (120 + Math.random() * 240),
        life: 0.45, size: 3 + Math.random() * 4, color: col, kind: "spark",
      });
    }
    this.fx.floatText(p.x, p.y - 74, "EVADE!", col);
    this.onEvent("evade");
  }

  private updateEvade(dt: number) {
    const p = this.player;
    const col = this.skinPalette?.accent || this.plane.art.accent;
    const trail = this.skinPalette?.trail || this.plane.art.trail;
    const CLIMB = GameEngine.EVADE_CLIMB;
    const APEX = GameEngine.EVADE_APEX;
    const RET = GameEngine.EVADE_RETURN;
    const TOTAL = GameEngine.EVADE_TOTAL;

    p.evadeT = Math.max(0, p.evadeT - dt);
    const elapsed = TOTAL - p.evadeT;
    const apexY = CONFIG.PLAYER_BOUND_PAD + 96;

    // easing helpers
    const easeOutQuint = (u: number) => 1 - Math.pow(1 - u, 5);
    const easeInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

    if (elapsed < CLIMB) {
      // ---- PHASE 0 : explosive climb ----
      p.evadePhase = 0;
      const u = easeOutQuint(elapsed / CLIMB);
      p.y = p.evadeHomeY + (apexY - p.evadeHomeY) * u;
      // slight S-curve drift so it reads as a maneuver, not a teleport
      p.x = p.evadeHomeX + Math.sin(u * Math.PI) * 46 * (p.evadeHomeX < this.W / 2 ? 1 : -1);
    } else if (elapsed < CLIMB + APEX) {
      // ---- PHASE 1 : apex hover, player may steer slightly ----
      p.evadePhase = 1;
      const u = (elapsed - CLIMB) / APEX;
      p.y = apexY - Math.sin(u * Math.PI) * 16;
      const ax = this.input.axis();
      const steer = this.input.pointerActive && ax.x === 0
        ? clamp((this.input.pointerX - p.x) * 3.2, -420, 420)
        : ax.x * 420;
      p.x = clamp(p.x + steer * dt, CONFIG.PLAYER_BOUND_PAD, this.W - CONFIG.PLAYER_BOUND_PAD);
    } else {
      // ---- PHASE 2 : controlled descent back to station ----
      p.evadePhase = 2;
      const u = easeInOutCubic(Math.min(1, (elapsed - CLIMB - APEX) / RET));
      const targetY = clamp(p.evadeHomeY, this.H * 0.45, this.H - CONFIG.PLAYER_BOUND_PAD);
      p.y = apexY + (targetY - apexY) * u;
      const ax = this.input.axis();
      const wantX = this.input.pointerActive && ax.x === 0 ? this.input.pointerX : p.evadeHomeX;
      p.x += (wantX - p.x) * Math.min(1, dt * 4.5);
    }

    p.x = clamp(p.x, CONFIG.PLAYER_BOUND_PAD, this.W - CONFIG.PLAYER_BOUND_PAD);
    p.y = clamp(p.y, CONFIG.PLAYER_BOUND_PAD, this.H - CONFIG.PLAYER_BOUND_PAD);
    p.invuln = Math.max(p.invuln, p.evadeT + 0.3);

    // ---- energy trail + speed distortion ----
    p.evadeTrailT += dt;
    const Q = QUALITY[this.quality];
    if (Q.trails) {
      for (let i = 0; i < 3; i++) {
        this.fx.spawn({
          x: p.x + (Math.random() - 0.5) * 22, y: p.y + 26 + Math.random() * 40,
          vx: (Math.random() - 0.5) * 60, vy: 200 + Math.random() * 260,
          life: 0.4, size: 4 + Math.random() * 5, color: col, kind: "trail", drag: 0.9,
        });
      }
      if (p.evadePhase === 0 || p.evadePhase === 2) {
        for (let i = 0; i < 2; i++) {
          this.fx.streak(Math.random() * this.W, Math.random() * this.H, 90 + Math.random() * 170, "rgba(200,245,255,0.7)");
        }
      }
      // after-image ghosts
      if (p.evadeTrailT > 0.055) {
        p.evadeTrailT = 0;
        this.fx.spawn({ x: p.x, y: p.y + 30, kind: "ring", life: 0.34, size: 20, color: trail });
      }
    }

    // ---- destroy incoming fire on contact (visual proof of invulnerability) ----
    const dodgeR = 74;
    for (const b of this.eBullets) {
      if (!b.active) continue;
      const dx = b.x - p.x, dy = b.y - p.y;
      if (dx * dx + dy * dy < dodgeR * dodgeR) {
        b.active = false;
        p.evadeDodges++;
        if (this.boss?.active) p.evadeBossDodge = true;
        this.fx.hit(b.x, b.y, col);
        if (p.evadeDodges % 6 === 0) Audio.playSFX("dodge");
      }
    }

    // ---- maneuver end ----
    if (p.evadeT <= 0) {
      p.evadePhase = 3;
      p.invuln = Math.max(p.invuln, 0.45);
      this.cam.tz = 1;
      this.fx.shockwave(p.x, p.y, 120, col, 0.4);
      Audio.playSFX("evadeEnd");
      if (p.evadeDodges >= 4) {
        const perfect = p.evadeBossDodge;
        this.fx.floatText(this.W / 2, this.H * 0.34, perfect ? "PERFECT EVASION!" : "EVASIÓN PERFECTA", perfect ? "#ffd23d" : "#7ff0ff");
        this.addScore(perfect ? 3000 : 1200);
        this.impact(perfect ? 0.55 : 0.32, { flash: perfect ? "255,220,120" : "150,235,255", zoom: perfect ? 0.08 : 0 });
        if (perfect) this.cinematic(0.42, 0.06);
        Audio.playSFX(perfect ? "perfectEvade" : "combo");
        if (perfect) {
          // reward skilful boss dodging with tempo
          p.ultCd = Math.max(0, p.ultCd - 3);
          this.fx.shockwave(p.x, p.y, 210, "#ffd23d", 0.6);
        }
        this.onEvent("perfectEvade", { dodges: p.evadeDodges, boss: perfect });
      }
    }
  }

  useSkill() {
    if (!this.running || this.paused || this.over) return;
    const p = this.player;
    if (p.skillCd > 0 || p.dead) return;
    if (this.empLock > 0) { this.onEvent("empBlocked"); return; }
    p.skillCd = this.plane.skill.cd * this.load.skillCdMul;
    this.abilitiesUsed++;
    Audio.playSFX("skill");
    this.flash = 0.4; this.flashColor = "120,220,255";
    switch (this.plane.id) {
      case "falcon": p.skillT = 4; p.multiBuff = 4; break;
      case "phantom":
        p.invuln = 1.6; p.skillT = 1.6; p.y = Math.max(160, p.y - 280);
        for (let i = 0; i < 24; i++) this.fx.spawn({ x: p.x, y: p.y + i * 12, kind: "spark", life: 0.4, size: 6, color: this.plane.art.trail, vx: (Math.random() - 0.5) * 200 });
        break;
      case "titan": p.barrier = 6; p.skillT = 6; break;
      case "thunder":
        for (let i = 0; i < 12; i++) {
          const a = -Math.PI / 2 + (i / 11 - 0.5) * 1.8;
          this.spawnBullet({ x: p.x, y: p.y - 20, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, dmg: this.playerDamage() * 1.6, color: "#ff5722", kind: "missile", r: 9, w: 12, h: 28, homing: 4.5, life: 4 }, true);
        }
        Audio.playSFX("missile");
        break;
      case "nova": p.beamT = 4; p.skillT = 4; break;
      case "shadow": p.stealth = 5; p.skillT = 5; break;
    }
    this.onEvent("skill");
  }

  useUltimate() {
    if (!this.running || this.paused || this.over) return;
    const p = this.player;
    if (p.ultCd > 0 || p.dead) return;
    if (this.empLock > 0) { this.onEvent("empBlocked"); return; }
    p.ultCd = this.plane.ultimate.cd * this.load.ultCdMul;
    p.ultT = 1.4;
    this.abilitiesUsed++;
    Audio.playSFX("ultimate");
    Audio.playSFX("shockwave");
    this.impact(1, { flash: "255,255,255", zoom: 0.13, freeze: 0.08 });
    this.cinematic(0.62, 0.1);
    const dmg = this.playerDamage() * 26;
    for (const b of this.eBullets) {
      if (!b.active) continue;
      b.active = false;
      this.fx.spawn({ x: b.x, y: b.y, kind: "spark", life: 0.3, size: 4, color: "#ffd23d" });
    }
    this.fx.shockwave(p.x, p.y, 260, this.plane.art.accent, 0.8);
    for (const e of this.enemies) if (e.active) this.damageEnemy(e, dmg, true);
    if (this.boss?.active) for (const part of this.boss.parts) if (!part.dead) this.damageBossPart(part, dmg * 0.4, false);
    const ultBursts = this.quality === "LOW" ? 8 : this.quality === "MEDIUM" ? 13 : 18;
    for (let i = 0; i < ultBursts; i++) {
      this.after(i * 0.055, () => {
        this.fx.explosion(Math.random() * this.W, Math.random() * this.H * 0.8, 40 + Math.random() * 40, this.plane.art.accent, "#ffffff");
      });
    }
    this.onEvent("ultimate");
  }

  useBomb() {
    if (!this.running || this.paused || this.over) return;
    const p = this.player;
    if (p.bombs <= 0 || p.dead) return;
    p.bombs--;
    this.abilitiesUsed++;
    this.impact(0.85, { flash: "255,200,120", zoom: 0.07, freeze: 0.06 });
    this.cinematic(0.3);
    for (const b of this.eBullets) b.active = false;
    this.fx.shockwave(p.x, p.y, 340, "#ffb020", 0.9);
    for (const e of this.enemies) if (e.active) this.damageEnemy(e, this.playerDamage() * 10, true);
    Audio.playSFX("shockwave");
  }

  /* ---------------------- spawning ---------------------- */

  private updateSpawn(dt: number, D: typeof DIFFICULTY["NORMAL"]) {
    if (this.cfg.mode === "secret" || this.cfg.mode === "bossrush") return;
    if (this.boss?.active) return;
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      const q = this.spawnQueue[i];
      q.t -= dt;
      if (q.t <= 0) { this.spawnEnemy(q.id, q.x, q.elite); this.spawnQueue.splice(i, 1); }
    }
    this.waveTimer -= dt;
    const alive = this.nEnemies;
    // gate scales with sector density, and a hard timer guarantees progression
    const gate = 16 + (this.ident?.density ?? 0) * 3;
    this.waveStall += dt;
    const forced = this.waveStall > 14;
    if (this.waveTimer <= 0 && this.spawnQueue.length === 0 && (alive < gate || forced)) {
      this.waveStall = 0;
      const totalWaves = this.cfg.mode === "endless" ? Infinity : this.mapDef.waves;
      if (this.wave >= totalWaves) {
        const bossId = sectorBossFor(this.cfg.galaxy, this.cfg.planet, this.cfg.map);
        this.startBoss(bossId, false);
        return;
      }
      this.wave++;
      this.buildWave(this.wave, D);
      const spawnMul = this.mapDef.spawnMul * D.spawnRate * (this.cfg.mode === "endless" ? 1 + this.wave * 0.03 : 1);
      this.waveTimer = (Math.max(2.2, 5.4 - this.wave * 0.14) * (this.ident?.tempo ?? 1)) / spawnMul;
      this.onEvent("wave", this.wave);

      if (this.cfg.mode === "endless") {
        if (this.wave % 10 === 0) { this.startBoss(this.endlessBoss(), false); return; }
        if (this.wave % 5 === 0) this.spawnEnemy("miniboss", this.W / 2, true);
      } else if (this.mapDef.miniBoss && this.wave === Math.max(2, Math.floor(this.mapDef.waves / 2))) {
        this.spawnEnemy("miniboss", this.W / 2, true);
        this.onEvent("miniboss");
      }
    }
  }

  private endlessBoss(): string {
    const pool = ["vulture", "leviathan", "scorpion", "overdrive", "glacier", "pyrolord", "omega"];
    return pool[Math.min(pool.length - 1, Math.floor(this.wave / 10) - 1)] || "vulture";
  }

  private buildWave(wave: number, D: typeof DIFFICULTY["NORMAL"]) {
    const roster = this.planet.roster;
    const ident = this.ident;
    const endlessScale = this.cfg.mode === "endless" ? Math.min(10, Math.floor(wave / 2)) : 0;
    const count = Math.min(18, 4 + Math.floor(wave * 0.85) + Math.floor(this.planet.tier * 0.55) + endlessScale + (ident?.density ?? 0));
    const spd = Math.max(0.6, D.spawnRate);

    /* ---- TACTICAL SQUAD WAVE: forces target prioritisation ---- */
    const squadIds = ident?.squads ?? [];
    const wantSquad = squadIds.length > 0 && wave >= 2 && (wave % 2 === 0 || ident.flavor === "fortress" || ident.flavor === "elite");
    if (wantSquad) {
      const sq = getSquad(squadIds[(wave + this.mapDef.index) % squadIds.length]);
      if (sq) {
        const laneY: Record<string, number> = { front: 0, mid: 0.34, back: 0.62 };
        let placed = 0;
        for (const u of sq.units) {
          const n = u.count + (this.planet.tier >= 4 ? 1 : 0);
          for (let i = 0; i < n; i++) {
            const spread = (i - (n - 1) / 2) * 92;
            const lane = laneY[u.slot];
            this.spawnQueue.push({
              t: (lane * 1.1 + i * 0.13) / spd,
              id: u.id,
              x: clamp(this.W / 2 + spread + (u.slot === "back" ? 0 : (Math.random() - 0.5) * 60), 70, this.W - 70),
            });
            placed++;
          }
        }
        // top up with local roster so planets keep their own flavour
        const filler = Math.max(0, Math.floor(count * 0.4) - placed);
        for (let i = 0; i < filler; i++) {
          this.spawnQueue.push({ t: 1.2 + i * 0.16, id: roster[Math.floor(Math.random() * roster.length)], x: 90 + Math.random() * (this.W - 180) });
        }
        this.onEvent("squad", { name: sq.name, threat: sq.threat });
        return;
      }
    }

    /* ---- choreographed formation wave ---- */
    const form = FORMATIONS[(wave + this.mapDef.index) % FORMATIONS.length];
    const slots = form.build(count, this.W);
    const primary = roster[Math.floor(Math.random() * roster.length)];
    // pick a complementary support/heavy anchor so waves have structure
    const anchor = roster.find((r) => { const d = getEnemy(r); return d.role === "support" || d.role === "heavy"; });
    slots.forEach((slot, i) => {
      let id = Math.random() < 0.7 ? primary : roster[Math.floor(Math.random() * roster.length)];
      if (anchor && i === Math.floor(slots.length / 2) && wave >= 3) id = anchor;
      if (wave % 5 === 0 && i === 0 && roster.includes("elite")) id = "elite";
      this.spawnQueue.push({ t: slot.delay / spd, id, x: slot.x });
    });
    this.onEvent("formation", form.name);
  }

  private spawnEnemy(id: string, x: number, elite = false) {
    const def = getEnemy(id);
    const D = DIFFICULTY[this.difficulty];
    for (const e of this.enemies) {
      if (e.active) continue;
      e.active = true;
      e.def = def;
      e.uid = UID++;
      const endless = this.cfg.mode === "endless" ? 1 + this.wave * 0.14 : 1;
      const eliteMul = elite ? 2.4 : 1;
      e.maxHp = e.hp = def.hp * D.enemyHp * this.mapDef.hpMul * endless * eliteMul;
      e.x = clamp(x, 60, this.W - 60);
      e.y = -70 - Math.random() * 90;
      e.vx = 0; e.vy = def.speed * D.enemySpeed;
      e.t = 0; e.fireT = 0.7 + Math.random() * def.attackRate;
      e.hurt = 0; e.seed = Math.random() * 100;
      e.homeX = e.x; e.homeY = 140 + Math.random() * 280;
      e.state = "enter"; e.laserT = 0; e.laserOn = false;
      e.elite = elite || !!def.elite;
      e.scale = elite && !def.elite ? 1.25 : 1;
      e.tele = 0; e.teleMax = def.traits?.telegraph || 0;
      e.auraShield = 0; e.auraRate = 1;
      e.enraged = false; e.dodgeT = 0;
      e.strafeDir = Math.random() < 0.5 ? -1 : 1;
      e.markX = 0; e.markY = 0; e.armorShown = false;
      if (def.traits?.standoff) e.homeY = clamp(this.H - def.traits.standoff, 110, this.H * 0.55);
      return e;
    }
    return null;
  }

  /** Support units project shields / fire-rate buffs onto nearby allies. */
  private updateAuras() {
    const list = this.enemies;
    for (const e of list) { if (e.active) { e.auraShield = 0; e.auraRate = 1; } }
    for (const src of list) {
      if (!src.active) continue;
      const tr = src.def.traits;
      if (!tr || (!tr.auraShield && !tr.auraRate)) continue;
      const R = 190, R2 = R * R;
      for (const o of list) {
        if (!o.active || o === src) continue;
        if ((o.x - src.x) ** 2 + (o.y - src.y) ** 2 > R2) continue;
        if (tr.auraShield) o.auraShield = Math.max(o.auraShield, tr.auraShield);
        if (tr.auraRate) o.auraRate = Math.max(o.auraRate, tr.auraRate);
      }
      // support units repair allies
      if (tr.repair) {
        for (const o of list) {
          if (!o.active || o === src || o.hp >= o.maxHp) continue;
          if ((o.x - src.x) ** 2 + (o.y - src.y) ** 2 > R2) continue;
          o.hp = Math.min(o.maxHp, o.hp + tr.repair * o.maxHp * 0.02 * (1 / 60));
        }
      }
    }
  }

  private updateEnemies(dt: number, D: typeof DIFFICULTY["NORMAL"]) {
    const p = this.player;
    const speedMul = this.mapDef.speedMul;
    this.auraTick = (this.auraTick + 1) % 3;
    if (this.auraTick === 0) this.updateAuras();
    for (const e of this.enemies) {
      if (!e.active) continue;
      e.t += dt;
      if (e.hurt > 0) e.hurt -= dt;
      if (e.dodgeT > 0) e.dodgeT -= dt;
      const def = e.def;
      const tr = def.traits;
      // ELITE ENRAGE — behaviour change, not a stat bump
      if (tr?.enrage && !e.enraged && e.hp < e.maxHp * 0.4) {
        e.enraged = true;
        this.fx.shockwave(e.x, e.y, 90, def.accent, 0.45);
        this.fx.floatText(e.x, e.y - 30, "ENRAGED", "#ff4d5e");
        Audio.playSFX("phase");
      }
      const enrageMul = e.enraged ? 1 + (tr?.enrage || 0) * 0.5 : 1;
      const sp = def.speed * D.enemySpeed * speedMul * enrageMul;
      switch (def.pattern) {
        case "straight": e.y += sp * dt; break;
        case "sine": e.y += sp * dt; e.x = e.homeX + Math.sin(e.t * 2.6 + e.seed) * 110; break;
        case "zigzag": e.y += sp * dt; e.x += Math.sign(Math.sin(e.t * 1.7 + e.seed)) * sp * 0.85 * dt; break;
        case "drift": e.y += sp * 0.7 * dt; e.x += Math.sin(e.t * 3.1 + e.seed) * 170 * dt + Math.cos(e.t * 1.3) * 60 * dt; break;
        case "follow": {
          const dx = p.x - e.x, dy = p.y - e.y;
          const l = Math.hypot(dx, dy) || 1;
          e.x += (dx / l) * sp * dt; e.y += (dy / l) * sp * dt;
          break;
        }
        case "circle":
          if (e.y < e.homeY) e.y += sp * dt;
          else { e.x = e.homeX + Math.cos(e.t * 1.5) * 130; e.y = e.homeY + Math.sin(e.t * 1.5) * 60; }
          break;
        case "formation":
          if (e.y < e.homeY) e.y += sp * dt;
          else { e.x = e.homeX + Math.sin(e.t * 1.1) * 70; e.y = e.homeY + Math.sin(e.t * 0.7) * 24; }
          break;
        case "retreat":
          if (e.state === "enter") { e.y += sp * dt; if (e.y > e.homeY) e.state = "hold"; }
          else {
            e.y += Math.sin(e.t * 0.9) * 26 * dt;
            e.x += Math.cos(e.t * 0.8 + e.seed) * 90 * dt;
            if (Math.abs(p.x - e.x) < 90) e.x += Math.sign(e.x - p.x) * sp * dt;
          }
          break;
        case "ambush":
          if (e.state === "enter") { e.y += sp * 1.5 * dt; if (e.y > e.homeY) e.state = "hold"; }
          else {
            e.x += clamp(p.x - e.x, -1, 1) * sp * 0.5 * dt;
            e.y += Math.sin(e.t * 1.4) * 60 * dt;
            if (Math.sin(e.t * 0.5) > 0.96) e.y += sp * dt;
          }
          break;
      }
      /* ---------- ROLE LAYER: tactical positioning ---------- */
      if (tr?.strafe && e.y > 90) {
        e.x += e.strafeDir * sp * 0.9 * dt;
        if (e.x < 80 || e.x > this.W - 80) e.strafeDir *= -1;
        e.y += Math.sin(e.t * 2.2) * 24 * dt;
      }
      if (tr?.standoff && e.state !== "enter") {
        // artillery / snipers hold range and slide to keep line of fire
        const want = clamp(this.H - tr.standoff, 100, this.H * 0.55);
        e.y += (want - e.y) * Math.min(1, dt * 1.4);
        e.x += Math.sign(p.x - e.x) * sp * 0.35 * dt;
      }
      if (tr?.evasive && e.dodgeT <= 0) {
        // juke away from the closest incoming player bullet
        for (const b of this.bullets) {
          if (!b.active) continue;
          const dx = b.x - e.x, dy = b.y - e.y;
          if (dy > 0 || dy < -260 || Math.abs(dx) > 46) continue;
          e.x += Math.sign(dx || 1) * -1 * sp * tr.evasive * 2.2 * dt * 60 * dt;
          e.dodgeT = 0.55;
          break;
        }
      }
      if (this.wind !== 0) e.x += this.wind * dt * 0.2;
      e.x = clamp(e.x, 40, this.W - 40);
      if (e.y > this.H + 90) { e.active = false; continue; }

      if (e.hp / e.maxHp < 0.35 && Math.random() < 0.25) {
        this.fx.spawn({ x: e.x, y: e.y - 10, vy: -30, life: 0.6, size: 8, color: "rgba(60,60,70,0.5)", kind: "smoke" });
      }

      /* ---------- TELEGRAPHED ATTACKS ---------- */
      if (e.tele > 0) {
        e.tele -= dt;
        if (def.role === "kamikaze") {
          // lock-on: freeze aim then dive
          e.markX = p.x; e.markY = p.y;
        }
        if (e.tele <= 0) {
          if (def.role === "kamikaze") { e.state = "dive"; Audio.playSFX("alarm"); }
          else this.enemyAttack(e, def.fire, D);
        }
      }
      // kamikaze dive commit — locked vector, no more homing
      if (e.state === "dive") {
        const dx = e.markX - e.x, dy = e.markY - e.y;
        const l = Math.hypot(dx, dy) || 1;
        e.x += (dx / l) * sp * 2.1 * dt;
        e.y += (dy / l) * sp * 2.1 * dt;
        if (Math.random() < 0.6) this.fx.spawn({ x: e.x, y: e.y, vy: -60, life: 0.3, size: 5, color: def.accent, kind: "spark" });
      }

      e.fireT -= dt;
      if (e.fireT <= 0 && e.y > 40 && e.y < this.H - 200 && e.tele <= 0 && e.state !== "dive") {
        const flare = this.evt.id === "flare" && this.evt.t > 0 ? 0.7 : 1;
        const rateBoost = e.auraRate * enrageMul;
        e.fireT = (def.attackRate * flare) / ((0.8 + this.planet.tier * 0.05) * rateBoost);
        if (e.teleMax > 0) {
          e.tele = e.teleMax;
          e.markX = p.x; e.markY = p.y;
          if (def.role === "artillery" || def.role === "sniper") Audio.playSFX("lockon");
        } else {
          this.enemyAttack(e, def.fire, D);
        }
      }
      if (e.laserOn) {
        e.laserT -= dt;
        if (e.laserT <= 0) e.laserOn = false;
        else if (Math.abs(p.x - e.x) < 22 && p.y > e.y && p.invuln <= 0 && !this.evading) this.hurtPlayer(def.damage * dt * 3);
      }
    }
  }

  private enemyAttack(e: EnemyE, pattern: FirePattern, D: typeof DIFFICULTY["NORMAL"]) {
    const p = this.player;
    const def = e.def;
    const sp = def.bulletSpeed * D.bulletSpeed;
    const dmg = def.damage * (1 + this.planet.tier * 0.06);
    const col = def.accent;
    const aim = Math.atan2(p.y - e.y, p.x - e.x);
    const shot = (a: number, speed = sp, kind = "eb", extra: Partial<Bullet> = {}) =>
      this.spawnBullet({ x: e.x, y: e.y + 14, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, color: col, kind, r: 7, w: 9, h: 16, life: 6, ...extra }, false);

    switch (pattern) {
      case "none": break;
      case "single": shot(Math.PI / 2); break;
      case "aimed": shot(aim); break;
      case "cone": for (let i = -2; i <= 2; i++) shot(aim + i * 0.16); break;
      case "burst":
        for (let k = 0; k < 3; k++) this.after(k * 0.13, () => { if (e.active && this.running && !this.paused) for (let i = -1; i <= 1; i++) shot(aim + i * 0.2); });
        break;
      case "circle": { const n = 12; for (let i = 0; i < n; i++) shot((i / n) * Math.PI * 2); break; }
      case "spiral": { const base = e.t * 3; for (let i = 0; i < 4; i++) shot(base + (i / 4) * Math.PI * 2); break; }
      case "wave": for (let i = 0; i < 7; i++) shot(Math.PI / 2 + (i - 3) * 0.22, sp * (0.7 + i * 0.06)); break;
      case "rain": for (let i = 0; i < 5; i++) shot(Math.PI / 2 + (Math.random() - 0.5) * 1.1, sp * (0.6 + Math.random() * 0.8)); break;
      case "tracking": shot(aim, sp, "sniper", { r: 6, w: 6, h: 30, color: "#ff4d6d" }); break;
      case "cross": for (let i = 0; i < 4; i++) { shot((i / 4) * Math.PI * 2 + e.t); shot((i / 4) * Math.PI * 2 + Math.PI / 4 + e.t); } break;
      case "ring": { const n = 18; for (let i = 0; i < n; i++) shot((i / n) * Math.PI * 2 + e.t * 0.4, sp * 0.8); break; }
      case "laser": e.laserOn = true; e.laserT = 1.1; Audio.playSFX("laser"); break;
      case "missile":
        for (const ox of [-18, 18]) this.spawnBullet({ x: e.x + ox, y: e.y + 10, vx: ox * 2, vy: 160, dmg, color: "#ffd23d", kind: "emissile", r: 8, w: 10, h: 24, homing: 1.6, life: 6 }, false);
        Audio.playSFX("missile");
        break;
      case "bloom": { const n = 10; for (let i = 0; i < n; i++) shot((i / n) * Math.PI * 2 + e.t, sp * 0.75); break; }
      case "serpent": for (let i = 0; i < 6; i++) shot(Math.PI / 2 + Math.sin(e.t * 3 + i) * 0.5, sp * (0.8 + i * 0.07)); break;
      case "nova": { const n = 14; for (let i = 0; i < n; i++) shot((i / n) * Math.PI * 2, sp * 0.9); shot(aim, sp * 1.2); break; }
      case "vortex": for (let i = 0; i < 8; i++) { shot(e.t * 2 + (i / 8) * Math.PI * 2, sp * 0.8); shot(-e.t * 2 + (i / 8) * Math.PI * 2, sp * 0.8); } break;
      case "curtain": for (let i = 0; i < 9; i++) shot(Math.PI / 2 + (i - 4) * 0.15, sp * (0.7 + (i % 3) * 0.18)); break;
      case "fanblade": for (let i = -3; i <= 3; i++) shot(aim + i * 0.22, sp * 1.1, "sniper", { color: "#ff4d6d", w: 6, h: 26 }); break;
    }
  }

  /* ---------------------- boss ---------------------- */

  startBoss(bossId: string, secret: boolean) {
    const def = findBoss(bossId);
    const D = DIFFICULTY[this.difficulty];
    const endless = this.cfg.mode === "endless" ? 1 + this.wave * 0.1 : 1;
    const hp = def.hp * D.bossHp * endless * (this.cfg.mode === "bossrush" ? 0.8 : 1);
    this.boss = {
      active: true, def, x: this.W / 2, y: -240, hp, maxHp: hp,
      parts: def.parts.map((p) => ({ id: p.id, hp: p.hp * D.bossHp * endless, maxHp: p.hp * D.bossHp * endless, dead: false })),
      phase: 0, t: 0, fireT: 2.4, hurt: 0, entering: true, dying: 0, attackIdx: 0, laserOn: 0, secret,
    };
    this.warning = secret ? 4.2 : 3.2;
    this.impact(secret ? 0.7 : 0.5, { flash: secret ? "180,60,255" : "255,60,60" });
    Audio.playSFX(secret ? "secret" : "warning");
    Audio.playMusic(secret ? "SECRET" : "BOSS", true);
    this.onEvent("boss", { name: def.name, title: def.title, secret });
  }

  private updateBoss(dt: number, D: typeof DIFFICULTY["NORMAL"]) {
    if (this.bossRushDelay > 0) {
      this.bossRushDelay -= dt;
      if (this.bossRushDelay <= 0) {
        const next = this.bossQueue.shift();
        if (next) this.startBoss(next, false);
        else this.endRun(true);
      }
      return;
    }
    const b = this.boss;
    if (!b || !b.active) return;
    b.t += dt;
    if (b.hurt > 0) b.hurt -= dt;
    if (b.dying > 0) {
      b.dying -= dt;
      this.shake = Math.max(this.shake, 0.6);
      this.cam.tx = b.x; this.cam.ty = b.y; this.cam.tz = 1.5; this.cam.killCam = b.dying;
      if (Math.random() < 0.7) {
        this.fx.explosion(b.x + (Math.random() - 0.5) * 380, b.y + (Math.random() - 0.5) * 190, 40 + Math.random() * 50, b.def.glow, "#fff");
        Audio.playSFX("explode");
      }
      if (b.dying <= 0) this.finishBoss();
      return;
    }
    if (b.entering) {
      // ENTRY SEQUENCE — heavy descent, engine flare, ground-shaking arrival
      b.y += 120 * dt;
      if (Math.random() < 0.5) {
        this.fx.spawn({ x: b.x + (Math.random() - 0.5) * 300, y: b.y - 90, vy: -120,
          life: 0.5, size: 10, color: b.def.glow, kind: "trail" });
      }
      this.shake = Math.max(this.shake, 0.16);
      if (b.y >= 240) {
        b.y = 240; b.entering = false;
        this.impact(0.9, { flash: "255,255,255", zoom: 0.1, dirY: 1, freeze: 0.07 });
        this.cinematic(0.45, 0.08);
        this.fx.shockwave(b.x, b.y, 300, b.def.accent, 0.8);
        Audio.playSFX("bossArrive");
        Audio.bossVoice(b.def.signature || "sovereign", "roar");
        this.onEvent("bossReady", { name: b.def.name, title: b.def.title, ability: b.def.abilityText });
      }
      return;
    }
    const mob = this.bossMobility();
    b.x = this.W / 2 + Math.sin(b.t * 0.55 * mob) * (this.W / 2 - 190) * mob;
    b.y = 240 + Math.sin(b.t * 0.9 * mob) * 26;

    const ratio = b.hp / b.maxHp;
    const newPhase = ratio > 0.7 ? 0 : ratio > 0.4 ? 1 : ratio > 0.1 ? 2 : 3;
    if (newPhase !== b.phase) {
      b.phase = newPhase;
      this.impact(0.75, { flash: "255,120,120", zoom: 0.09, freeze: 0.06 });
      this.cinematic(0.4, 0.07);
      Audio.playSFX("phase");
      Audio.bossVoice(b.def.signature || "sovereign", "roar");
      Audio.playMusic(b.secret ? "SECRET" : newPhase >= 3 ? "ENRAGE" : "BOSS", true);
      this.onEvent("phase", newPhase + 1);
      this.fx.shockwave(b.x, b.y, 200, b.def.accent, 0.7);
      if (newPhase === 3) {
        // FINAL PHASE SPECIAL — telegraphed screen-wide desperation attack
        this.bossSpecial = 1.4;
        this.onEvent("bossSpecial", b.def.name);
        Audio.playSFX("alarm");
        Audio.bossVoice(b.def.signature || "sovereign", "charge");
      }
    }

    // DESPERATION ATTACK resolve
    if (this.bossSpecial > 0) {
      this.bossSpecial -= dt;
      this.shake = Math.max(this.shake, 0.3);
      if (this.bossSpecial <= 0) {
        const n = 44;
        for (let ring = 0; ring < 3; ring++) {
          this.after(ring * 0.22, () => {
            if (!b.active || b.dying > 0) return;
            for (let i = 0; i < n; i++) {
              const a = (i / n) * Math.PI * 2 + ring * 0.09;
              this.spawnBullet({
                x: b.x, y: b.y, vx: Math.cos(a) * (220 + ring * 55) * D.bulletSpeed,
                vy: Math.sin(a) * (220 + ring * 55) * D.bulletSpeed,
                dmg: 16, color: b.def.accent, kind: "eb", r: 9, w: 12, h: 18, life: 8,
              }, false);
            }
            this.fx.shockwave(b.x, b.y, 230 + ring * 60, b.def.accent, 0.5);
            Audio.playSFX("shockwave");
          });
        }
        this.impact(0.95, { flash: "255,120,120", zoom: 0.06 });
      }
      return;
    }

    b.fireT -= dt;
    const ph = b.def.phases[b.phase];
    if (b.fireT <= 0) {
      b.fireT = ph.rate / D.spawnRate;
      // FUNCTIONAL PARTS: destroyed hardware removes the patterns it powered
      const banned = this.disabledPatterns();
      let pool = ph.attacks.filter((a) => !banned.has(a));
      if (!pool.length) pool = ["aimed"];
      this.bossAttack(pool[b.attackIdx % pool.length], D);
      b.attackIdx++;
    }
    if (b.laserOn > 0) {
      b.laserOn -= dt;
      if (Math.abs(this.player.x - b.x) < 46 && this.player.y > b.y && this.player.invuln <= 0 && !this.evading) this.hurtPlayer(30 * dt);
    }
    if (b.phase >= 1 && this.cfg.mode !== "bossrush" && Math.random() < dt * 0.3) {
      this.spawnEnemy(this.planet.roster[Math.floor(Math.random() * this.planet.roster.length)], 100 + Math.random() * (this.W - 200));
    }
    this.bossSignature(dt, D);
  }

  /** Distinct per-archetype behaviors — every warlord fights differently. */
  private bossSignature(dt: number, D: typeof DIFFICULTY["NORMAL"]) {
    const b = this.boss;
    if (!b || !b.active || b.entering || b.dying > 0) return;
    const sig = b.def.signature;
    if (!sig) return;
    this.bossSigT -= dt;
    const p = this.player;
    if (sig === "swarmlord" && this.bossSigT <= 0) {
      this.bossSigT = 7;
      for (const ox of [-90, 90]) {
        const id = this.planet.roster[Math.floor(Math.random() * this.planet.roster.length)];
        const e = this.spawnEnemy(id, b.x + ox);
        if (e) { e.y = b.y + 60; e.homeY = 320 + Math.random() * 160; }
      }
      this.onEvent("formation", "ESCORT LAUNCH");
    } else if (sig === "assassin" && this.bossSigT <= 0) {
      this.bossSigT = 8;
      this.fx.explosion(b.x, b.y, 60, b.def.accent, "#fff");
      b.x = 150 + Math.random() * (this.W - 300);
      this.fx.explosion(b.x, b.y, 60, b.def.accent, "#fff");
      Audio.playSFX("phase");
    } else if (sig === "warden" && this.bossSigT <= 0) {
      this.bossSigT = 9;
      // defensive pulse: erase nearby player projectiles
      for (const bl of this.bullets) {
        if (bl.active && (bl.x - b.x) ** 2 + (bl.y - b.y) ** 2 < 260 * 260) {
          bl.active = false;
          this.fx.hit(bl.x, bl.y, b.def.accent);
        }
      }
      this.fx.shockwave(b.x, b.y, 200, b.def.accent, 0.5);
      Audio.playSFX("shield");
    } else if (sig === "stormcaller" && this.bossSigT <= 0) {
      this.bossSigT = 10;
      this.wind = (Math.random() < 0.5 ? -1 : 1) * (140 + Math.random() * 120);
      this.after(3.5, () => { if (this.boss === b) this.wind = 0; });
      this.onEvent("formation", "WIND SHEAR");
    } else if (sig === "dreadnought" && this.bossSigT <= 0) {
      this.bossSigT = 11;
      // ramming charge telegraph + lunge
      this.shake = Math.max(this.shake, 0.5);
      Audio.playSFX("warning");
      const sx = b.x;
      this.after(0.0004, () => {
        if (!this.running || this.paused || this.boss !== b || b.dying > 0) return;
        b.x = p.x;
        this.fx.shockwave(sx, b.y, 120, b.def.accent, 0.4);
        this.shake = Math.max(this.shake, 0.7);
      });
    } else if (sig === "reaper" && this.bossSigT <= 0) {
      this.bossSigT = 6.5;
      for (let i = 0; i < 4; i++) {
        this.spawnBullet({ x: b.x + (i - 1.5) * 60, y: b.y + 40, vx: (i - 1.5) * 40, vy: 170, dmg: 14, color: "#ffd23d", kind: "emissile", r: 8, w: 10, h: 24, homing: 2, life: 6 }, false);
      }
      Audio.playSFX("missile");
    } else if ((sig === "annihilator" || sig === "sovereign") && this.bossSigT <= 0 && b.phase >= 2) {
      this.bossSigT = 8;
      // extinction pulse: double ring + shake
      for (const [n, off] of [[20, 0], [20, 0.16]] as const) {
        for (let i = 0; i < n; i++) {
          this.spawnBullet({ x: b.x, y: b.y, vx: Math.cos((i / n) * Math.PI * 2 + off) * 260 * D.bulletSpeed, vy: Math.sin((i / n) * Math.PI * 2 + off) * 260 * D.bulletSpeed, dmg: 13, color: b.def.accent, kind: "eb", r: 8, w: 11, h: 18, life: 7 }, false);
        }
      }
      this.shake = Math.max(this.shake, 0.6);
      Audio.playSFX("shockwave");
    }
  }

  /** Which attack patterns are offline because their hardware was destroyed. */
  private disabledPatterns(): Set<FirePattern> {
    const out = new Set<FirePattern>();
    const b = this.boss;
    if (!b) return out;
    const dead = (kind: string) =>
      b.parts.filter((p) => b.def.parts.find((d) => d.id === p.id)?.kind === kind).every((p) => p.dead) &&
      b.def.parts.some((d) => d.kind === kind);
    if (dead("laser")) { out.add("laser"); out.add("curtain"); }
    if (dead("turret")) { out.add("cone"); out.add("burst"); out.add("fanblade"); }
    if (dead("wing")) { out.add("missile"); out.add("rain"); }
    return out;
  }

  /** Engines destroyed → the boss can barely manoeuvre. */
  private bossMobility(): number {
    const b = this.boss;
    if (!b) return 1;
    const engines = b.def.parts.filter((d) => d.kind === "engine");
    if (!engines.length) return 1;
    const aliveE = engines.filter((d) => !b.parts.find((p) => p.id === d.id)?.dead).length;
    return 0.25 + 0.75 * (aliveE / engines.length);
  }

  private bossAttack(pattern: FirePattern, D: typeof DIFFICULTY["NORMAL"]) {
    const b = this.boss!;
    const p = this.player;
    const alive = b.parts.filter((x) => !x.dead);
    const sources = alive.length
      ? alive.map((pt) => {
          const d = b.def.parts.find((x) => x.id === pt.id)!;
          return { x: b.x + d.x * b.def.scale, y: b.y + d.y * b.def.scale };
        })
      : [{ x: b.x, y: b.y }];
    const secretMul = b.secret ? 1.25 : 1;
    const sp = 250 * D.bulletSpeed * (1 + b.phase * 0.08) * secretMul;
    const dmg = (12 + b.phase * 3 + this.planet.tier * 1.6) * secretMul;
    const col = b.def.accent;
    const shoot = (s: { x: number; y: number }, a: number, speed = sp, kind = "eb", extra: Partial<Bullet> = {}) =>
      this.spawnBullet({ x: s.x, y: s.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, color: col, kind, r: 8, w: 11, h: 18, life: 7, ...extra }, false);

    const main = sources[Math.floor(Math.random() * sources.length)];
    const aim = Math.atan2(p.y - main.y, p.x - main.x);
    Audio.bossVoice(b.def.signature || "sovereign", "fire");
    switch (pattern) {
      case "aimed": for (const s of sources) shoot(s, Math.atan2(p.y - s.y, p.x - s.x)); break;
      case "cone": for (const s of sources) for (let i = -3; i <= 3; i++) shoot(s, Math.atan2(p.y - s.y, p.x - s.x) + i * 0.13); break;
      case "burst":
        for (let k = 0; k < 4; k++)
          this.after(k * 0.11, () => { if (this.running && !this.paused && b.active) for (const s of sources) shoot(s, Math.atan2(p.y - s.y, p.x - s.x) + (Math.random() - 0.5) * 0.4); });
        break;
      case "circle": { const n = (22 + b.phase * 6) * (b.secret ? 1.4 : 1); for (let i = 0; i < n; i++) shoot(main, (i / n) * Math.PI * 2, sp * 0.8); break; }
      case "spiral":
        for (let k = 0; k < (b.secret ? 14 : 9); k++)
          this.after(k * 0.07, () => {
            if (!b.active) return;
            const base = b.t * 4 + k * 0.4;
            const arms = 4 + b.phase + (b.secret ? 2 : 0);
            for (let i = 0; i < arms; i++) shoot({ x: b.x, y: b.y }, base + (i / arms) * Math.PI * 2, sp * 0.85);
          });
        break;
      case "wave": for (let i = 0; i < 13; i++) shoot({ x: b.x, y: b.y + 40 }, Math.PI / 2 + (i - 6) * 0.13, sp * (0.65 + Math.abs(i - 6) * 0.06)); break;
      case "rain":
        for (let i = 0; i < (b.secret ? 24 : 16); i++)
          this.spawnBullet({ x: 40 + Math.random() * (this.W - 80), y: -20, vx: (Math.random() - 0.5) * 60, vy: sp * (0.55 + Math.random() * 0.5), dmg, color: col, kind: "eb", r: 7, w: 9, h: 16, life: 8 }, false);
        break;
      case "tracking":
        for (let i = 0; i < 5; i++)
          this.after(i * 0.12, () => { if (b.active) shoot(main, Math.atan2(p.y - main.y, p.x - main.x), sp * 1.5, "sniper", { color: "#ff4d6d", w: 6, h: 32 }); });
        break;
      case "cross":
        for (let i = 0; i < 8; i++) shoot(main, (i / 8) * Math.PI * 2 + b.t, sp);
        this.after(0.2, () => { if (b.active) for (let i = 0; i < 8; i++) shoot(main, (i / 8) * Math.PI * 2 + b.t + 0.4, sp); });
        break;
      case "ring": {
        const n = b.secret ? 34 : 26;
        for (let ring = 0; ring < (b.secret ? 3 : 2); ring++)
          this.after(ring * 0.26, () => { if (b.active) for (let i = 0; i < n; i++) shoot({ x: b.x, y: b.y }, (i / n) * Math.PI * 2 + ring * 0.12, sp * (0.7 + ring * 0.25)); });
        break;
      }
      case "laser": b.laserOn = 1.6; Audio.playSFX("laser"); break;
      case "missile":
        for (const s of sources) this.spawnBullet({ x: s.x, y: s.y, vx: 0, vy: 150, dmg, color: "#ffd23d", kind: "emissile", r: 9, w: 11, h: 26, homing: 1.8, life: 7 }, false);
        Audio.playSFX("missile");
        break;
      case "bloom": {
        // flower: 3 staggered rings with rotation offsets
        for (let ring = 0; ring < 3; ring++) {
          const n = 12 + b.phase * 2;
          const off = b.t * 0.8 + ring * 0.26;
          for (let i = 0; i < n; i++) shoot({ x: b.x, y: b.y }, (i / n) * Math.PI * 2 + off, sp * (0.62 + ring * 0.16));
        }
        break;
      }
      case "serpent": {
        // twin sine streams sweeping across the arena
        for (let i = 0; i < 16; i++) {
          const a = Math.PI / 2 + Math.sin(b.t * 2.4 + i * 0.55) * 0.75;
          shoot({ x: b.x + Math.sin(i * 0.8) * 120, y: b.y + 30 }, a, sp * (0.75 + (i % 4) * 0.1));
        }
        break;
      }
      case "nova": {
        // point-blank nova + aimed spear
        const n = 18 + b.phase * 4;
        for (let i = 0; i < n; i++) shoot({ x: b.x, y: b.y }, (i / n) * Math.PI * 2, sp * 0.9);
        for (let i = -1; i <= 1; i++) shoot(main, aim + i * 0.12, sp * 1.5, "sniper", { color: "#ff4d6d", w: 7, h: 34 });
        this.shake = Math.max(this.shake, 0.35);
        break;
      }
      case "vortex": {
        // counter-rotating double spiral
        for (let k = 0; k < 6; k++)
          this.after(k * 0.09, () => {
            if (!b.active) return;
            const base = b.t * 5 + k * 0.35;
            for (let i = 0; i < 5; i++) {
              shoot({ x: b.x, y: b.y }, base + (i / 5) * Math.PI * 2, sp * 0.8);
              shoot({ x: b.x, y: b.y }, -base + (i / 5) * Math.PI * 2, sp * 0.8);
            }
          });
        break;
      }
      case "curtain": {
        // full-width curtain with speed lanes
        for (let i = 0; i < 15; i++) {
          shoot({ x: 50 + (this.W - 100) * (i / 14), y: b.y + 50 }, Math.PI / 2 + Math.sin(i * 1.3) * 0.1, sp * (0.6 + (i % 5) * 0.12));
        }
        break;
      }
      case "fanblade": {
        // wide sniper fan, twice
        for (let i = -4; i <= 4; i++) shoot(main, aim + i * 0.17, sp * 1.25, "sniper", { color: "#ff4d6d", w: 6, h: 30 });
        this.after(0.32, () => { if (b.active) for (let i = -4; i <= 4; i++) shoot(main, Math.atan2(p.y - main.y, p.x - main.x) + i * 0.17, sp * 1.25, "sniper", { color: "#ff4d6d", w: 6, h: 30 }); });
        break;
      }
      default: shoot(main, Math.atan2(p.y - main.y, p.x - main.x)); break;
    }
  }

  private damageBossBody(dmg: number, crit: boolean) {
    const b = this.boss!;
    b.hp = Math.max(0, b.hp - dmg);
    b.hurt = 0.06;
    this.showDamage(b.x + (Math.random() - 0.5) * 120, b.y + 40, dmg, crit, 900002);
    if (b.hp <= 0 && b.dying <= 0) this.beginBossDeath();
  }

  private beginBossDeath() {
    const b = this.boss!;
    b.dying = 2.8;
    Audio.playSFX("bigexplode");
    Audio.stopMusic();
    this.cinematic(1.1, 0.12);
    this.impact(1, { flash: "255,255,255", freeze: 0.1 });
    this.cam.killCam = 2.8;
    this.onEvent("killcam", b.def.name);
  }

  private damageBossPart(part: BossPart, dmg: number, crit: boolean) {
    const b = this.boss!;
    part.hp -= dmg;
    b.hp = Math.max(0, b.hp - dmg);
    b.hurt = 0.06;
    if (part.hp <= 0 && !part.dead) {
      part.dead = true;
      const d = b.def.parts.find((x) => x.id === part.id)!;
      const px = b.x + d.x * b.def.scale, py = b.y + d.y * b.def.scale;
      this.fx.shockwave(px, py, 90, b.def.glow, 0.5);
      this.fx.explosion(px, py, 70, b.def.glow, "#fff");
      Audio.playSFX("explode");
      this.impact(0.5, { dirX: d.x > 0 ? -1 : 1, freeze: 0.04 });
      this.addScore(1500);
      this.fx.floatText(px, py, `${d.label} DESTROYED`, "#ffd23d");
      const consequence =
        d.kind === "engine" ? "MOBILITY REDUCED" :
        d.kind === "turret" ? "CANNON PATTERNS OFFLINE" :
        d.kind === "laser" ? "BEAM SYSTEMS OFFLINE" :
        d.kind === "wing" ? "MISSILE RACKS OFFLINE" : "";
      if (consequence) {
        this.onEvent("partLost", { label: d.label, effect: consequence });
        this.fx.floatText(px, py + 26, consequence, "#7ff0ff");
      }
      if (b.parts.every((x) => x.dead)) {
        b.hp = Math.min(b.hp, b.maxHp * 0.25);
        this.fx.floatText(b.x, b.y, "CORE EXPOSED", "#ff4d6d");
      }
    }
    if (b.hp <= 0 && b.dying <= 0) this.beginBossDeath();
    if (crit) Audio.playSFX("crit");
  }

  private finishBoss() {
    const b = this.boss!;
    b.active = false;
    this.bossKilled = true;
    this.bossesDefeated++;
    const r = b.def.reward;
    this.coinsEarned += r.coins;
    this.crystalsEarned += r.crystals;
    this.bossXpEarned += r.xp;
    this.addScore(20000 + this.planet.tier * 5000);
    // staged finale: three expanding waves instead of one saturating blast
    this.fx.shockwave(b.x, b.y, 240, b.def.glow, 0.75);
    this.fx.explosion(b.x, b.y, 130, b.def.glow, "#ffffff");
    this.after(0.18, () => this.fx.shockwave(b.x, b.y, 340, b.def.accent, 0.85));
    this.after(0.4, () => { this.fx.shockwave(b.x, b.y, 460, b.def.glow, 1.0); this.fx.explosion(b.x, b.y, 110, b.def.accent, "#ffffff"); });
    this.flash = 0.85;
    this.cam.killCam = 0; this.cam.tz = 1;

    if (this.cfg.mode === "secret") { this.secretDefeated = true; this.endRun(true); return; }
    if (this.cfg.mode === "bossrush") {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.35);
      this.player.shield = Math.min(4, this.player.shield + 1);
      if (this.bossQueue.length) { this.boss = null; this.bossRushDelay = 2.4; this.onEvent("rushNext", this.bossQueue.length); return; }
      this.endRun(true); return;
    }
    if (this.cfg.mode === "endless") { this.boss = null; this.waveTimer = 2.4; return; }
    this.endRun(true);
  }

  /* ---------------------- bullets / loot ---------------------- */

  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.life -= dt;
      if (b.life <= 0) { b.active = false; continue; }
      if (b.homing > 0) {
        if (!b.target || !b.target.active) b.target = this.nearestTarget(b.x, b.y);
        if (b.target) {
          const want = Math.atan2(b.target.y - b.y, b.target.x - b.x);
          const cur = Math.atan2(b.vy, b.vx);
          let diff = want - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const na = cur + clamp(diff, -b.homing * dt, b.homing * dt);
          const spd = Math.hypot(b.vx, b.vy) || 400;
          b.vx = Math.cos(na) * spd; b.vy = Math.sin(na) * spd;
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.rot = Math.atan2(b.vy, b.vx);
      // per-weapon trails so every projectile is instantly readable
      if (this.trailsOn) {
        if (b.kind === "missile") {
          this.fx.trail(b.x, b.y, "#ff9b3d", 5);
          if (Math.random() < 0.35) this.fx.spawn({ x: b.x, y: b.y, vy: 40, life: 0.5, size: 6, color: "rgba(90,90,100,0.5)", kind: "smoke" });
        } else if (b.kind === "plasma" && Math.random() < 0.5) {
          this.fx.trail(b.x, b.y, b.color, 5);
        } else if (b.kind === "laser" && Math.random() < 0.28) {
          this.fx.spawn({ x: b.x, y: b.y, life: 0.14, size: 4, color: b.color, kind: "trail" });
        } else if (b.kind === "electric" && Math.random() < 0.45) {
          this.fx.spawn({ x: b.x + (Math.random() - 0.5) * 12, y: b.y, life: 0.12, size: 2.4, color: "#ffffff", kind: "spark" });
        }
      }
      if (b.x < -40 || b.x > this.W + 40 || b.y < -60 || b.y > this.H + 60) b.active = false;
    }
    for (const b of this.eBullets) {
      if (!b.active) continue;
      b.life -= dt;
      if (b.life <= 0) { b.active = false; continue; }
      if (b.homing > 0 && this.player.stealth <= 0) {
        const want = Math.atan2(this.player.y - b.y, this.player.x - b.x);
        const cur = Math.atan2(b.vy, b.vx);
        let diff = want - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const na = cur + clamp(diff, -b.homing * dt, b.homing * dt);
        const spd = Math.hypot(b.vx, b.vy) || 200;
        b.vx = Math.cos(na) * spd; b.vy = Math.sin(na) * spd;
      }
      if (this.wind !== 0) b.x += this.wind * dt * 0.12;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.rot = Math.atan2(b.vy, b.vx);
      if (b.kind === "meteor") {
        this.fx.trail(b.x, b.y, "#ff6a2b", 8);
        if (Math.random() < 0.3) this.fx.ember(b.x, b.y, "#ffb020");
      } else if (this.trailsOn && b.kind === "emissile" && Math.random() < 0.55) {
        this.fx.trail(b.x, b.y, "#ffd23d", 4);
      } else if (this.trailsOn && b.kind === "sniper" && Math.random() < 0.3) {
        this.fx.spawn({ x: b.x, y: b.y, life: 0.12, size: 3, color: b.color, kind: "trail" });
      }
      if (b.x < -70 || b.x > this.W + 70 || b.y < -90 || b.y > this.H + 90) b.active = false;
    }
  }

  private nearestTarget(x: number, y: number): any {
    let best: any = null, bd = 1e9;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    if (!best && this.boss?.active && !this.boss.entering) return { x: this.boss.x, y: this.boss.y, active: true };
    return best;
  }

  private dropLoot(x: number, y: number, def: EnemyDef, elite: boolean) {
    const chance = elite ? 1 : 0.15 + (def.hp > 60 ? 0.12 : 0);
    if (Math.random() < chance) {
      const kinds = ["weapon", "weapon", "damage", "shield", "heal", "multi", "laser", "speed", "missile", "bomb"];
      this.spawnPowerUp(x, y, kinds[Math.floor(Math.random() * kinds.length)]);
    }
    if (Math.random() < 0.55) this.spawnPowerUp(x + (Math.random() - 0.5) * 30, y, "coin");
  }

  private spawnPowerUp(x: number, y: number, kind: string) {
    for (const p of this.powerups) {
      if (p.active) continue;
      p.active = true; p.x = x; p.y = y; p.vy = 110 + Math.random() * 40; p.vx = (Math.random() - 0.5) * 60;
      p.kind = kind; p.t = Math.random() * 3;
      return;
    }
  }

  private updatePowerups(dt: number) {
    const pl = this.player;
    const magnetR = 190 * this.load.magnet;
    for (const p of this.powerups) {
      if (!p.active) continue;
      p.t += dt;
      const dx = pl.x - p.x, dy = pl.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < magnetR) { p.x += (dx / dist) * 460 * dt; p.y += (dy / dist) * 460 * dt; }
      else { p.x += p.vx * dt; p.y += p.vy * dt; }
      if (Math.random() < 0.25) this.fx.spawn({ x: p.x, y: p.y, kind: "spark", life: 0.3, size: 2.5, color: "#fff", vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40 });
      if (p.y > this.H + 40) { p.active = false; continue; }
      if (dist < 44) { p.active = false; this.applyPowerUp(p.kind); }
    }
  }

  private applyPowerUp(kind: string) {
    const p = this.player;
    switch (kind) {
      case "coin":
        this.coinsEarned += 5 + this.planet.tier * 2;
        this.addScore(50);
        Audio.playSFX("coin");
        return;
      case "weapon":
        if (p.weaponLevel < 5) { p.weaponLevel++; this.fx.floatText(p.x, p.y - 60, `WEAPON LV.${p.weaponLevel}`, "#ffd23d"); }
        else { this.addScore(2000); this.fx.floatText(p.x, p.y - 60, "+2000", "#ffd23d"); }
        break;
      case "damage": p.dmgBuff = 12; this.fx.floatText(p.x, p.y - 60, "DAMAGE UP", "#ff5722"); break;
      case "shield": p.shield = Math.min(4, p.shield + 1); this.fx.floatText(p.x, p.y - 60, "SHIELD", "#3fa9ff"); Audio.playSFX("shield"); break;
      case "heal": p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3); this.fx.floatText(p.x, p.y - 60, "+HULL", "#3ddc84"); break;
      case "multi": p.multiBuff = 14; this.fx.floatText(p.x, p.y - 60, "MULTI SHOT", "#ffd23d"); break;
      case "laser": p.laserBuff = 12; this.fx.floatText(p.x, p.y - 60, "LASER", "#b567ff"); break;
      case "speed": p.speedBuff = 12; this.fx.floatText(p.x, p.y - 60, "SPEED", "#2ee6ff"); break;
      case "missile": p.missileBuff = 14; this.fx.floatText(p.x, p.y - 60, "MISSILES", "#ff8a3d"); break;
      case "bomb": p.bombs = Math.min(5, p.bombs + 1); this.fx.floatText(p.x, p.y - 60, "BOMB", "#ff2d6f"); break;
    }
    Audio.playSFX("powerup");
    this.flash = 0.25; this.flashColor = "255,255,255";
  }

  /* ---------------------- collision ---------------------- */

  /** Accumulates rapid hits into a single rolling number per target. */
  private dmgAcc = new Map<number, { v: number; t: number; crit: boolean; x: number; y: number }>();
  private dmgFlush = 0;

  private showDamage(x: number, y: number, dmg: number, crit: boolean, uid = 0) {
    if (!this.save.settings.damageNumbers) return;
    const cur = this.dmgAcc.get(uid);
    if (cur) {
      cur.v += dmg; cur.x = x; cur.y = y;
      cur.crit = cur.crit || crit;   // a crit anywhere in the burst colours the total
    } else {
      this.dmgAcc.set(uid, { v: dmg, t: 0, crit, x, y });
    }
  }

  private flushDamage(dt: number) {
    if (!this.dmgAcc.size) return;
    this.dmgFlush -= dt;
    if (this.dmgFlush > 0) return;
    this.dmgFlush = 0.16;
    // hard cap on simultaneous numbers: show the biggest hits, drop the noise
    const entries = [...this.dmgAcc.entries()].sort((a, b) => b[1].v - a[1].v);
    const MAX = this.quality === "LOW" ? 3 : 5;
    for (let i = 0; i < entries.length; i++) {
      const [uid, d] = entries[i];
      if (i < MAX) this.fx.damage(d.x, d.y, d.v, d.crit);
      this.dmgAcc.delete(uid);
    }
  }

  private collide() {
    const p = this.player;
    for (const b of this.bullets) {
      if (!b.active) continue;
      for (const e of this.enemies) {
        if (!e.active) continue;
        const rr = e.def.radius * e.def.size * e.scale * 0.9 + b.r;
        if (Math.abs(b.x - e.x) < rr && Math.abs(b.y - e.y) < rr) {
          this.damageEnemy(e, b.dmg, false, b.crit, b.y, b.x);
          this.fx.hit(b.x, b.y, b.color);
          if (b.pierce > 0) b.pierce--;
          else { b.active = false; break; }
        }
      }
      if (!b.active) continue;
      const bs = this.boss;
      if (bs?.active && !bs.entering && bs.dying <= 0) {
        const allDead = bs.parts.every((x) => x.dead);
        if (allDead) {
          const hw = 210 * bs.def.scale, hh = 118 * bs.def.scale;
          if (Math.abs(b.x - bs.x) < hw + b.r && Math.abs(b.y - bs.y) < hh + b.r) {
            this.damageBossBody(b.dmg * 1.6, b.crit);
            this.fx.hit(b.x, b.y, b.color);
            if (b.pierce > 0) b.pierce--;
            else b.active = false;
          }
          continue;
        }
        for (const part of bs.parts) {
          if (part.dead) continue;
          const d = bs.def.parts.find((x) => x.id === part.id)!;
          const px = bs.x + d.x * bs.def.scale, py = bs.y + d.y * bs.def.scale;
          const rr = d.r * bs.def.scale + b.r;
          if (Math.abs(b.x - px) < rr && Math.abs(b.y - py) < rr) {
            this.damageBossPart(part, b.dmg, b.crit);
            this.showDamage(b.x, b.y, b.dmg, b.crit, 900001);
            this.fx.hit(b.x, b.y, b.color);
            if (b.pierce > 0) b.pierce--;
            else b.active = false;
            break;
          }
        }
      }
    }
    if (p.dead) return;
    const pr = p.r * 0.62;
    for (const b of this.eBullets) {
      if (!b.active) continue;
      const rr = pr + b.r * (b.kind === "meteor" ? 0.8 : 0.7);
      if (Math.abs(b.x - p.x) < rr && Math.abs(b.y - p.y) < rr) {
        b.active = false;
        if (b.kind === "meteor") this.fx.explosion(b.x, b.y, 50, "#ff8a3d", "#fff");
        this.hurtPlayer(b.dmg);
      }
    }
    const evading = this.evading;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const rr = e.def.radius * e.def.size * e.scale * 0.7 + pr;
      if (Math.abs(e.x - p.x) < rr && Math.abs(e.y - p.y) < rr) {
        if (evading) {
          // slicing through hostiles mid-maneuver: they take the hit, we take nothing
          this.damageEnemy(e, this.playerDamage() * 2.2, false, true);
          p.evadeDodges++;
          continue;
        }
        this.hurtPlayer(e.def.damage);
        this.damageEnemy(e, e.def.pattern === "follow" ? 9999 : 30, true);
      }
    }
  }

  private damageEnemy(e: EnemyE, dmg: number, silent: boolean, crit = false, fromY?: number, fromX?: number) {
    const tr = e.def.traits;
    let inc = dmg;
    // FRONTAL ARMOUR — shots from directly below are deflected; flank to hurt it
    if (tr?.frontArmor) {
      const srcY = fromY ?? this.player.y;
      const srcX = fromX ?? this.player.x;
      const frontal = srcY > e.y && Math.abs(srcX - e.x) < e.def.radius * e.def.size * 1.6;
      if (frontal) {
        inc *= 1 - tr.frontArmor;
        if (!silent && Math.random() < 0.3) {
          this.fx.spawn({ x: e.x + (Math.random() - 0.5) * 30, y: e.y + 16, kind: "spark", life: 0.2, size: 3, color: "#cfe0f0" });
        }
        // label only once per unit, not every deflected shot
        if (!silent && !e.armorShown) {
          e.armorShown = true;
          this.fx.floatText(e.x, e.y + 24, "ARMOR", "#9fb8cc");
        }
      }
    }
    // SUPPORT AURA — absorbs damage until the support unit dies
    if (e.auraShield > 0) {
      inc *= 1 - e.auraShield;
      if (!silent && Math.random() < 0.3) {
        this.fx.spawn({ x: e.x, y: e.y, kind: "ring", life: 0.2, size: 22, color: "#3fd0ff" });
      }
    }
    e.hp -= inc;
    const dmgShown = inc;
    e.hurt = crit ? 0.16 : 0.09;
    // knockback reaction — enemies visibly flinch
    const kb = Math.min(14, inc / Math.max(1, e.maxHp) * 90) * (crit ? 1.8 : 1);
    e.y -= kb * 0.5;
    e.x += (Math.random() - 0.5) * kb * 0.4;

    // SHADOW — PREDATOR: crits execute wounded targets
    if (crit && this.plane.id === "shadow" && e.hp > 0 && e.hp < e.maxHp * 0.18 && !e.def.elite) {
      e.hp = 0;
      this.player.ultCd = Math.max(0, this.player.ultCd - 1.5);
      this.fx.floatText(e.x, e.y - 26, "EXECUTE", "#ff2d6f");
      this.fx.shockwave(e.x, e.y, 60, "#ff2d6f", 0.32);
      Audio.playSFX("execute");
    }

    if (!silent) {
      this.showDamage(e.x, e.y - e.def.radius * 0.5, dmgShown, crit, e.uid);
      if (crit) {
        Audio.playSFX("crit");
        this.fx.spawn({ x: e.x, y: e.y, kind: "ring", life: 0.3, size: 26, color: "#ffd23d" });
        this.fx.spawn({ x: e.x, y: e.y, kind: "flash", life: 0.13, size: 30, color: "#fff6c4" });
        for (let i = 0; i < 5; i++) {
          const a = Math.random() * Math.PI * 2;
          this.fx.spawn({ x: e.x, y: e.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, life: 0.24, size: 2.6, color: "#ffd23d", kind: "spark" });
        }
        this.hitStop = Math.max(this.hitStop, 0.035);
      } else Audio.playSFX("hit");
    }
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: EnemyE) {
    e.active = false;
    const def = e.def;
    this.kills++;
    this.combo++;
    this.comboTimer = this.load.comboWindow;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    if ([5, 10, 25, 50, 100, 200].includes(this.combo)) {
      Audio.playSFX("combo");
      this.fx.floatText(this.W / 2, this.H * 0.35, `COMBO x${this.combo}!`, "#ffd23d");
      this.onEvent("combo", this.combo);
    }
    this.addScore(Math.round(def.score * this.comboMultiplier() * (e.elite ? 2 : 1)));
    this.coinsEarned += Math.round(def.coins * (e.elite ? 2.2 : 1));
    this.enemyXpEarned += Math.round((8 + this.planet.tier * 3) * (e.elite ? 3 : 1));
    const size = def.radius * def.size * e.scale;
    this.fx.explosion(e.x, e.y, size * 1.3, def.accent, "#ffcc66");
    if (e.elite) {
      this.fx.shockwave(e.x, e.y, size * 2.4, def.accent, 0.5);
      for (let i = 0; i < 4; i++)
        this.after(i * 0.09, () => this.running && this.fx.explosion(e.x + (Math.random() - 0.5) * 90, e.y + (Math.random() - 0.5) * 90, size, def.accent, "#fff"));
      this.impact(0.5, { freeze: 0.05 });
      Audio.playSFX("bigexplode");
    } else {
      // proportional to the size of what just died
      this.impact(Math.min(0.24, 0.05 + size / 320));
      Audio.playSFX("explode");
    }
    // SPLITTERS — dying units fracture into smaller hostiles
    const spl = def.traits?.splitInto;
    if (spl && !this.splitGuard) {
      this.splitGuard = true;
      for (let i = 0; i < spl.count; i++) {
        const child = this.spawnEnemy(spl.id, e.x + (i - (spl.count - 1) / 2) * 42);
        if (child) {
          child.y = e.y;
          child.homeY = Math.max(140, e.y + 40);
          child.maxHp = child.hp = child.maxHp * 0.75;
          this.fx.spawn({ x: child.x, y: child.y, kind: "ring", life: 0.3, size: 20, color: def.accent });
        }
      }
      this.splitGuard = false;
    }

    this.dropLoot(e.x, e.y, def, e.elite);

    // THUNDER — OVERKILL: corpses detonate
    if (this.plane.id === "thunder" && !this.overkillGuard) {
      this.overkillGuard = true;
      const blast = e.maxHp * 0.45;
      const radius = 92 + size * 1.1;
      this.fx.shockwave(e.x, e.y, radius, "#ff5722", 0.42);
      Audio.playSFX("overkill");
      for (const o of this.enemies) {
        if (!o.active || o === e) continue;
        if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 < radius * radius) this.damageEnemy(o, blast, true);
      }
      if (this.boss?.active && !this.boss.entering) {
        for (const part of this.boss.parts) {
          if (part.dead) continue;
          const d = this.boss.def.parts.find((x) => x.id === part.id)!;
          const px = this.boss.x + d.x * this.boss.def.scale, py = this.boss.y + d.y * this.boss.def.scale;
          if ((px - e.x) ** 2 + (py - e.y) ** 2 < radius * radius) this.damageBossPart(part, blast * 0.4, false);
        }
      }
      this.overkillGuard = false;
    }
  }

  comboMultiplier() { return 1 + Math.min(4, Math.floor(this.combo / 10) * 0.5); }
  addScore(v: number) { this.score += v; }

  hurtPlayer(dmg: number) {
    const p = this.player;
    // MANIOBRA EVASIVA — absolute immunity to every damage source, present or future
    if (p.evadeT > 0) {
      p.evadeDodges++;
      if (this.boss?.active) p.evadeBossDodge = true;
      this.fx.hit(p.x, p.y - 10, this.skinPalette?.accent || this.plane.art.accent);
      return;
    }
    if (p.dead || p.invuln > 0 || p.barrier > 0) {
      if (p.barrier > 0) this.fx.hit(p.x, p.y - 20, "#ffd23d");
      return;
    }
    if (p.shield > 0) {
      p.shield--;
      p.invuln = 1.2 * this.load.iframeMul;
      this.fx.shockwave(p.x, p.y, 90, "#3fa9ff", 0.4);
      this.impact(0.3, { flash: "120,200,255" });
      Audio.playSFX("shield");
      return;
    }
    this.hitsTaken++;
    p.momentum = 0; // PHANTOM afterburn streak broken
    let inDmg = dmg * this.load.dmgTakenMul;
    if (this.plane.id === "titan") {
      // TITAN — REACTIVE ARMOR: 22% reduction + retaliation shockwave
      inDmg *= 0.78;
      const rdmg = this.playerDamage() * 2.4;
      this.fx.shockwave(p.x, p.y, 150, "#ffb020", 0.42);
      this.impact(0.3, { flash: "255,190,80" });
      Audio.playSFX("armorPlate");
      for (const e of this.enemies) {
        if (!e.active) continue;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 150 * 150) this.damageEnemy(e, rdmg, true);
      }
      for (const b of this.eBullets) {
        if (b.active && (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < 120 * 120) b.active = false;
      }
    }
    p.hp -= inDmg;
    this.combo = 0;
    p.invuln = CONFIG.IFRAMES * this.load.iframeMul;
    Audio.playSFX("damage");
    this.impact(0.5, { flash: "255,60,60", dirY: 1, freeze: 0.045 });
    this.fx.explosion(p.x, p.y, 34, "#ff4d4d", "#ffb020");

    // retaliation field talent
    if (this.load.thorns > 0) {
      const dmgOut = this.playerDamage() * this.load.thorns * 1.5;
      this.fx.shockwave(p.x, p.y, 170, "#ffd23d", 0.45);
      for (const e of this.enemies) {
        if (!e.active) continue;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 170 * 170) this.damageEnemy(e, dmgOut, true);
      }
      for (const b of this.eBullets) {
        if (b.active && (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < 150 * 150) b.active = false;
      }
    }

    if (p.hp <= 0) {
      p.hp = 0; p.dead = true;
      this.fx.shockwave(p.x, p.y, 260, "#ff6b2d", 0.9);
      this.fx.explosion(p.x, p.y, 130, "#ff6b2d", "#fff");
      this.cam.tx = p.x; this.cam.ty = p.y; this.cam.tz = 1.55; this.cam.killCam = 1.6;
      Audio.playSFX("bigexplode");
      Audio.stopMusic();
      this.impact(1, { flash: "255,120,80", freeze: 0.09 });
      this.cinematic(1.0);
      this.after(1.6, () => this.running && this.endRun(false));
    }
  }

  /* ---------------------- run end ---------------------- */

  private computeStars(): number {
    const d = this.cfg.daily;
    if (!d) return 0;
    let stars = 0;
    const [s1, s2, s3] = d.starTargets;
    const val =
      d.rule === "nodamage" ? this.hitsTaken :
      d.rule === "combo" ? this.bestCombo :
      d.rule === "time" ? this.runTime :
      d.rule === "kills" ? this.kills :
      this.abilitiesUsed;
    const lower = d.rule === "nodamage" || d.rule === "time" || d.rule === "noability";
    const pass = (target: number) => (lower ? val <= target : val >= target);
    if (pass(s1)) stars = 1;
    if (pass(s2)) stars = 2;
    if (pass(s3)) stars = 3;
    return stars;
  }

  endRun(victory: boolean) {
    if (this.over) return;
    this.over = true;
    Audio.playMusic(victory ? "VICTORY" : "GAMEOVER", true);
    // XP is earned by combat and objectives, not by endlessly farming score effects.
    const rewards = calculateRewards(this.cfg, this.difficulty, victory, {
      coins: this.coinsEarned, crystals: this.crystalsEarned, xp: this.enemyXpEarned + this.bossXpEarned,
    }, this.firstClear, this.load.coinMul, this.load.xpMul);
    this.onEnd({
      ...rewards.total, rewards: rewards.breakdown,
      runId: this.runId, planeId: this.flownPlaneId, planeXp: rewards.total.xp,
      difficulty: this.difficulty, dailyId: this.cfg.daily?.id,
      victory, score: Math.round(this.score * DIFFICULTY[this.difficulty].scoreReward), kills: this.kills,
      bestCombo: this.bestCombo, bossKilled: this.bossKilled,
      mode: this.cfg.mode, galaxy: this.cfg.galaxy, planet: this.cfg.planet, map: this.cfg.map,
      wave: this.wave, hits: this.hitsTaken, abilities: this.abilitiesUsed, time: this.runTime,
      stars: victory ? this.computeStars() : 0,
      secretDefeated: this.secretDefeated, bossesDefeated: this.bossesDefeated,
    });
  }

  /* ============================ render ============================ */

  render() {
    const ctx = this.ctx;
    const glow = QUALITY[this.quality].glow;
    ctx.save();
    const c = this.cam;
    if (this.save.settings.shake) {
      if (this.shake > 0.002) {
        // 2-octave noise: less jitter, more "weight"
        const s = this.shake * this.shake * 22;
        const t = this.time * 46;
        ctx.translate(
          (Math.sin(t * 1.7) * 0.6 + (Math.random() - 0.5) * 0.8) * s,
          (Math.cos(t * 2.3) * 0.6 + (Math.random() - 0.5) * 0.8) * s
        );
      }
      if (c.kickX || c.kickY) ctx.translate(c.kickX, c.kickY);
    }
    // camera transform
    ctx.translate(this.W / 2, this.H / 2);
    if (c.roll) ctx.rotate(c.roll);
    ctx.scale(c.zoom, c.zoom);
    ctx.translate(-c.x, -c.y);

    this.bg.render(ctx, glow);

    for (const p of this.powerups) {
      if (!p.active) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      drawPowerUp(ctx, p.kind, p.t, glow);
      ctx.restore();
    }

    for (const e of this.enemies) {
      if (!e.active) continue;
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.scale !== 1) ctx.scale(e.scale, e.scale);
      this.drawEnemyCached(ctx, e.def, e.t, e.hurt, glow);
      if (e.elite && glow) {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "#ffd23d";
        ctx.globalAlpha = 0.25 + Math.sin(this.time * 6) * 0.12;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, e.def.radius * e.def.size + 10, 0, 7); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();
      if (e.laserOn) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createLinearGradient(e.x - 20, 0, e.x + 20, 0);
        g.addColorStop(0, "rgba(255,45,111,0)");
        g.addColorStop(0.5, e.def.accent);
        g.addColorStop(1, "rgba(255,45,111,0)");
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.42 + Math.sin(this.time * 26 + e.uid) * 0.08;
        ctx.fillRect(e.x - 20, e.y, 40, this.H);
        ctx.restore();
      }
      /* ---------- TELEGRAPH VISUALS ---------- */
      if (e.tele > 0 && e.teleMax > 0) {
        const k = 1 - e.tele / e.teleMax;
        ctx.save();
        ctx.globalCompositeOperation = glow ? "lighter" : "source-over";
        const role = e.def.role;
        if (role === "sniper") {
          // laser sight snapping onto the player
          ctx.strokeStyle = e.def.accent;
          ctx.globalAlpha = 0.25 + k * 0.55;
          ctx.lineWidth = 1 + k * 1.6;
          ctx.setLineDash([12, 8]);
          ctx.lineDashOffset = -this.time * 90;
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.markX, e.markY); ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 0.4 + k * 0.5;
          ctx.beginPath(); ctx.arc(e.markX, e.markY, 20 - k * 12, 0, 7); ctx.stroke();
        } else if (role === "artillery") {
          // impact marker on the ground
          ctx.strokeStyle = e.def.accent;
          ctx.globalAlpha = 0.35 + Math.sin(this.time * 22) * 0.25;
          ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.arc(e.markX, e.markY, 46 * (1 - k) + 14, 0, 7); ctx.stroke();
          ctx.globalAlpha = 0.12 + k * 0.2;
          ctx.fillStyle = e.def.accent;
          ctx.beginPath(); ctx.arc(e.markX, e.markY, 46 * (1 - k) + 14, 0, 7); ctx.fill();
        } else if (role === "kamikaze") {
          // dive vector warning
          ctx.strokeStyle = "#ff2d3d";
          ctx.globalAlpha = 0.4 + Math.sin(this.time * 26) * 0.3;
          ctx.lineWidth = 2 + k * 3;
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.markX, e.markY); ctx.stroke();
        } else {
          // generic charge-up flare
          ctx.globalAlpha = k * 0.7;
          const cgr = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, 34 * k + 8);
          cgr.addColorStop(0, "#ffffff");
          cgr.addColorStop(0.4, e.def.accent);
          cgr.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = cgr;
          ctx.beginPath(); ctx.arc(e.x, e.y, 34 * k + 8, 0, 7); ctx.fill();
        }
        ctx.restore();
      }

      /* ---------- SUPPORT AURA LINKS ---------- */
      if (glow && (e.def.traits?.auraShield || e.def.traits?.auraRate)) {
        ctx.save();
        ctx.globalCompositeOperation = glow ? "lighter" : "source-over";
        ctx.strokeStyle = e.def.accent;
        ctx.globalAlpha = 0.18 + Math.sin(this.time * 3) * 0.07;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(e.x, e.y, 190, 0, 7); ctx.stroke();
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.2;
        for (const o of this.enemies) {
          if (!o.active || o === e) continue;
          if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 > 190 * 190) continue;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          ctx.lineTo(o.x, o.y);
          ctx.stroke();
        }
        ctx.restore();
      }
      // shielded units show their bubble
      if (e.auraShield > 0) {
        ctx.save();
        ctx.globalCompositeOperation = glow ? "lighter" : "source-over";
        ctx.strokeStyle = "#3fd0ff";
        ctx.globalAlpha = 0.35 + Math.sin(this.time * 5 + e.uid) * 0.15;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.def.radius * e.def.size * e.scale + 12, 0, 7); ctx.stroke();
        ctx.restore();
      }
      // enraged elites burn
      if (e.enraged) {
        ctx.save();
        ctx.globalCompositeOperation = glow ? "lighter" : "source-over";
        ctx.globalAlpha = 0.3 + Math.sin(this.time * 9 + e.uid) * 0.15;
        const rg = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, 56);
        rg.addColorStop(0, "#ff4d5e");
        rg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(e.x, e.y, 56, 0, 7); ctx.fill();
        ctx.restore();
      }

      if (e.maxHp > 60 && e.hp < e.maxHp) {
        const w = 54;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(e.x - w / 2, e.y - e.def.radius * e.def.size * e.scale - 16, w, 5);
        ctx.fillStyle = e.elite ? "#ffd23d" : "#ff4d5e";
        ctx.fillRect(e.x - w / 2, e.y - e.def.radius * e.def.size * e.scale - 16, w * (e.hp / e.maxHp), 5);
      }
    }

    const b = this.boss;
    if (b?.active) {
      ctx.save();
      ctx.translate(b.x, b.y);
      if (b.secret && glow) {
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(0, 0, 40, 0, 0, 330);
        g.addColorStop(0, b.def.accent);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 0.22 + Math.sin(this.time * 3) * 0.08;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 330, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      drawBoss(ctx, b.def, b.t, b.parts, b.hurt, glow);
      ctx.restore();
      if (b.laserOn > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createLinearGradient(b.x - 46, 0, b.x + 46, 0);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.34, b.def.accent);
        g.addColorStop(0.5, "#ffffff");
        g.addColorStop(0.66, b.def.accent);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.34 + Math.sin(this.time * 30) * 0.06;
        ctx.fillRect(b.x - 46, b.y, 92, this.H);
        ctx.restore();
      }
    }

    for (const bl of this.bullets) if (bl.active && bl.y > -60 && bl.y < this.H + 60) this.drawBullet(ctx, bl, glow);

    // wingmen
    for (const w of this.wings) {
      if (!w.active || !w.def) continue;
      ctx.save();
      ctx.translate(w.x, w.y);
      drawWingman(ctx, w.def.shape, w.def.color, this.time, glow, w.charge, w.slot === 0 ? -1 : 1);
      ctx.restore();
      if (w.def.id === "shield") {
        ctx.save();
        ctx.globalCompositeOperation = glow ? "lighter" : "source-over";
        ctx.strokeStyle = w.def.color;
        ctx.globalAlpha = 0.28 + Math.sin(this.time * 3 + w.slot) * 0.1;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(w.x, w.y, w.stats.range, 0, 7); ctx.stroke();
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = w.def.color;
        ctx.beginPath(); ctx.arc(w.x, w.y, w.stats.range, 0, 7); ctx.fill();
        ctx.restore();
      }
    }

    const p = this.player;
    if (!p.dead) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const ev = p.evadeT > 0;
      if (!ev && p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0) ctx.globalAlpha = 0.4;
      if (p.stealth > 0) ctx.globalAlpha = 0.42;
      if (ev) {
        // motion-blur after-images stacked behind the climb
        const evCol = this.skinPalette?.accent || this.plane.art.accent;
        for (let i = 3; i >= 1; i--) {
          ctx.save();
          ctx.globalAlpha = 0.13 * i;
          ctx.translate(0, i * (p.evadePhase === 2 ? -16 : 20));
          ctx.scale(1 - i * 0.04, 1 - i * 0.02);
          drawPlane(ctx, this.plane, { t: this.time - i * 0.03, thrust: 1.7, glow, banking: p.bank, skin: this.skinPalette });
          ctx.restore();
        }
        if (glow) {
          ctx.globalCompositeOperation = "lighter";
          const eg = ctx.createRadialGradient(0, 0, 8, 0, 0, 88);
          eg.addColorStop(0, "rgba(255,255,255,0.5)");
          eg.addColorStop(0.45, evCol);
          eg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.globalAlpha = 0.42 + Math.sin(this.time * 22) * 0.14;
          ctx.fillStyle = eg;
          ctx.beginPath(); ctx.arc(0, 0, 88, 0, 7); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
      }
      drawPlane(ctx, this.plane, { t: this.time, thrust: p.thrust, glow, banking: p.bank, skin: this.skinPalette });
      ctx.globalAlpha = 1;
      if (p.evadeT > 0) {
        // hex invulnerability field
        const evCol = this.skinPalette?.accent || this.plane.art.accent;
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = evCol;
        ctx.lineWidth = 2.4;
        for (let r = 0; r < 3; r++) {
          ctx.globalAlpha = 0.5 - r * 0.13;
          const rad = 46 + r * 13 + Math.sin(this.time * 9 + r) * 3;
          ctx.beginPath();
          for (let i = 0; i <= 6; i++) {
            const a = (i / 6) * Math.PI * 2 + this.time * (1.6 + r * 0.5);
            const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      if (p.barrier > 0 || p.shield > 0) {
        ctx.globalCompositeOperation = "lighter";
        const rad = 56;
        const cc = p.barrier > 0 ? "255,210,60" : "63,169,255";
        const g = ctx.createRadialGradient(0, 0, rad * 0.6, 0, 0, rad);
        g.addColorStop(0, `rgba(${cc},0.05)`);
        g.addColorStop(0.8, `rgba(${cc},0.35)`);
        g.addColorStop(1, `rgba(${cc},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, rad, 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(${cc},${0.5 + Math.sin(this.time * 8) * 0.25})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, rad * 0.92, 0, 7); ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();
      if (p.beamT > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createLinearGradient(p.x - 30, 0, p.x + 30, 0);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.5, this.plane.art.accent);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.5 + Math.sin(this.time * 34) * 0.08;
        ctx.fillRect(p.x - 26, 0, 52, p.y - 40);
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillRect(p.x - 6, 0, 12, p.y - 40);
        ctx.restore();
      }
    }

    for (const bl of this.eBullets) if (bl.active && bl.y > -70 && bl.y < this.H + 70) this.drawBullet(ctx, bl, glow);
    this.fx.render(ctx, glow);
    ctx.restore();

    // radial speed blur overlay
    if (this.player.boost > 0.5 && QUALITY[this.quality].glow) this.drawRadialBlur(ctx, (this.player.boost - 0.5) * 2);
    if (this.empLock > 0) this.drawEmpOverlay(ctx);
    if (this.flash > 0) {
      // eased + capped so it reads as a punch, never a white-out
      const a = Math.min(0.42, this.flash * this.flash * 0.44);
      ctx.fillStyle = `rgba(${this.flashColor},${a})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
    if (this.warning > 0) this.drawWarning(ctx);
    if (CONFIG.DEBUG) this.drawDebug(ctx);
  }

  private blurGrad: CanvasGradient | null = null;
  private blurGradH = 0;
  private drawRadialBlur(ctx: CanvasRenderingContext2D, amt: number) {
    if (!this.blurGrad || this.blurGradH !== this.H) {
      this.blurGradH = this.H;
      this.blurGrad = ctx.createRadialGradient(this.W / 2, this.H * 0.55, this.H * 0.2, this.W / 2, this.H * 0.55, this.H * 0.7);
      this.blurGrad.addColorStop(0, "rgba(0,0,0,0)");
      this.blurGrad.addColorStop(1, "rgba(180,225,255,0.9)");
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.1 * amt;
    ctx.fillStyle = this.blurGrad;
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.restore();
  }

  private drawEmpOverlay(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 0.18 + Math.sin(this.time * 20) * 0.06;
    ctx.fillStyle = "rgba(60,150,255,0.5)";
    for (let i = 0; i < 8; i++) {
      const y = ((this.time * 260 + i * 137) % this.H);
      ctx.fillRect(0, y, this.W, 2.5);
    }
    ctx.restore();
  }

  /**
   * Enemy hulls contain ~8 gradients each. They are cached as a short frame
   * loop (6 frames) per archetype, so 40 enemies cost 40 drawImage calls
   * instead of ~320 gradient rebuilds per frame. Engine flames, blinking
   * lights and shield pulses are baked per frame, keeping them animated.
   */
  private static readonly E_FRAMES = 6;
  private static readonly E_CYCLE = 0.96;
  private drawEnemyCached(ctx: CanvasRenderingContext2D, def: EnemyDef, t: number, hurt: number, glow: boolean) {
    const hurtNow = hurt > 0;
    const frame = hurtNow ? 0 : Math.floor(((t % GameEngine.E_CYCLE) / GameEngine.E_CYCLE) * GameEngine.E_FRAMES);
    const box = Math.ceil(190 * def.size);
    const ss = 1.5; // supersample: crisp under devicePixelRatio scaling
    const spr = sprite(
      `e|${def.id}|${frame}|${hurtNow ? 1 : 0}|${glow ? 1 : 0}`,
      box * ss, box * ss,
      (c) => {
        c.scale(ss, ss);
        c.translate(box / 2, box / 2);
        drawEnemy(c, def, hurtNow ? 0.37 : (frame / GameEngine.E_FRAMES) * GameEngine.E_CYCLE + 0.11, hurtNow ? 0.12 : 0, glow);
      },
    );
    if (spr) ctx.drawImage(spr, -box / 2, -box / 2, box, box);
    else drawEnemy(ctx, def, t, hurt, glow);
  }

  /**
   * Bullets are the hottest draw path (hundreds per frame). Each unique
   * kind/colour/size is rasterised once at 2x and then blitted, instead of
   * rebuilding 1-3 gradients per bullet per frame.
   */
  private drawBullet(ctx: CanvasRenderingContext2D, b: Bullet, glow: boolean) {
    const pad = 26, tail = 24;
    const sw = Math.max(b.w, b.r * 3.4) + pad * 2;
    const sh = b.h + pad * 2 + tail;
    const cx = sw / 2, cy = pad + b.h / 2;
    const spr = sprite(`p|${b.kind}|${b.color}|${b.w}|${b.h}|${b.r}`, sw * 2, sh * 2, (c) => {
      c.scale(2, 2);
      c.translate(cx, cy);
      this.paintBullet(c, b);
    });
    if (spr) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot + Math.PI / 2);
      if (glow && b.kind !== "meteor") ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(spr, -cx, -cy, sw, sh);
      ctx.restore();
      return;
    }
    // Fallback (no offscreen canvas available): original immediate-mode path.
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot + Math.PI / 2);
    if (glow) ctx.globalCompositeOperation = "lighter";
    this.paintBullet(ctx, b);
    ctx.restore();
  }

  /** Paints one bullet centred at the origin, pointing up. */
  private paintBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
    const w = b.w, h = b.h;
    if (b.kind === "meteor") {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, w * 0.6);
      g.addColorStop(0, "#fff6d0");
      g.addColorStop(0.4, "#ff8a3d");
      g.addColorStop(1, "#3a1608");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, w * 0.5, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(255,180,80,0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (b.kind === "laser" || b.kind === "pierce") {
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, b.color);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillRect(-w / 6, -h / 2, w / 3, h);
    } else if (b.kind === "missile" || b.kind === "emissile") {
      ctx.fillStyle = "#dfe4ea";
      ctx.beginPath();
      ctx.moveTo(0, -h / 2); ctx.lineTo(w / 2, 0); ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2); ctx.lineTo(-w / 2, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = b.color;
      ctx.fillRect(-w / 2, -2, w, 4);
      const fg = ctx.createLinearGradient(0, h / 2, 0, h / 2 + 22);
      fg.addColorStop(0, "#fff");
      fg.addColorStop(0.4, "#ff9b3d");
      fg.addColorStop(1, "rgba(255,60,0,0)");
      ctx.fillStyle = fg;
      ctx.fillRect(-w / 3, h / 2, (w * 2) / 3, 22);
    } else if (b.kind === "electric") {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) ctx.lineTo(((i % 2 === 0 ? 1 : -1) * w) / 2.6, -h / 2 + (h / 5) * i);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (b.kind === "plasma") {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, w);
      g.addColorStop(0, "#fff");
      g.addColorStop(0.35, b.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, w, h * 0.7, 0, 0, 7); ctx.fill();
    } else if (b.kind === "sniper") {
      ctx.fillStyle = b.color;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(-w / 4, -h / 2, w / 2, h * 0.6);
    } else if (b.kind === "eb") {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, b.r * 1.6);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.4, b.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, b.r * 1.7, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(0, 0, b.r * 0.45, 0, 7); ctx.fill();
    } else {
      const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.5, b.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, 7); ctx.fill();
    }
  }

  private drawWarning(ctx: CanvasRenderingContext2D) {
    const w = this.warning;
    const secret = !!this.boss?.secret;
    const a = Math.min(1, w * 1.4) * (0.55 + Math.sin(this.time * 18) * 0.45);
    const col = secret ? "180,60,255" : "255,40,60";
    ctx.save();
    ctx.fillStyle = `rgba(${col},${0.14 * a})`;
    ctx.fillRect(0, 0, this.W, this.H);
    const y = this.H * 0.4;
    ctx.fillStyle = "rgba(8,0,12,0.78)";
    ctx.fillRect(0, y - 78, this.W, 168);
    ctx.strokeStyle = `rgba(${col},${a})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, y - 78); ctx.lineTo(this.W, y - 78);
    ctx.moveTo(0, y + 90); ctx.lineTo(this.W, y + 90);
    ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.rect(0, y - 78, this.W, 168); ctx.clip();
    ctx.globalAlpha = 0.16 * a;
    ctx.fillStyle = secret ? "#b567ff" : "#ff2d3d";
    for (let i = -20; i < 40; i++) {
      ctx.save();
      ctx.translate(i * 40 + ((this.time * 60) % 80), y);
      ctx.rotate(-0.5);
      ctx.fillRect(-10, -150, 20, 320);
      ctx.restore();
    }
    ctx.restore();
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(${col},${a})`;
    ctx.font = "900 58px Orbitron, system-ui, sans-serif";
    ctx.fillText(this.text(secret ? "SECRET BOSS" : "WARNING"), this.W / 2, y - 12, this.W - 48);
    ctx.fillStyle = "#fff";
    ctx.font = "800 28px Orbitron, system-ui, sans-serif";
    ctx.fillText(this.boss?.def.name || this.text("INCOMING BOSS"), this.W / 2, y + 30, this.W - 48);
    ctx.font = "600 17px Rajdhani, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,220,235,0.9)";
    ctx.fillText(this.text(this.boss?.def.title || "PREPARE FOR COMBAT"), this.W / 2, y + 62, this.W - 48);
    ctx.restore();
  }

  private drawDebug(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(8, 200, 220, 140);
    ctx.fillStyle = "#0f0";
    ctx.font = "13px monospace";
    const lines = [
      `FPS ${this.fps.toFixed(1)}`,
      `ENT ${this.nEnemies}`,
      `PB ${this.nPBullets}`,
      `EB ${this.nEBullets}`,
      `PART ${this.fx.count}`,
      `WAVE ${this.wave}/${this.mapDef?.waves}`,
      `MODE ${this.cfg.mode}`,
    ];
    lines.forEach((l, i) => ctx.fillText(l, 16, 220 + i * 16));
    ctx.restore();
  }

  /** 0..1 meter for the active airframe passive (drives the HUD ring). */
  passiveMeter(): number {
    const p = this.player;
    switch (this.plane.id) {
      case "falcon": return (p.volley % 4) / 4;
      case "phantom": return p.momentum;
      case "nova": return p.charge;
      case "titan": return Math.min(1, p.hp / Math.max(1, p.maxHp));
      case "thunder": return Math.min(1, this.combo / 20);
      case "shadow": return Math.min(1, this.load.crit * 3);
      default: return 0;
    }
  }
  passiveMeterLabel(): string {
    const p = this.player;
    switch (this.plane.id) {
      case "falcon": return `${4 - (p.volley % 4)}`;
      case "phantom": return `${Math.round(p.momentum * 100)}%`;
      case "nova": return p.charge >= 1 ? "MAX" : `${Math.round(p.charge * 100)}%`;
      case "titan": return "ARMOR";
      case "thunder": return "BLAST";
      case "shadow": return "HUNT";
      default: return "";
    }
  }

  pushHud() {
    const p = this.player;
    const b = this.boss;
    const buffs: { id: string; label: string; t: number }[] = [];
    if (p.dmgBuff > 0) buffs.push({ id: "dmg", label: "🔥", t: p.dmgBuff });
    if (p.multiBuff > 0) buffs.push({ id: "multi", label: "⁂", t: p.multiBuff });
    if (p.laserBuff > 0) buffs.push({ id: "laser", label: "≡", t: p.laserBuff });
    if (p.speedBuff > 0) buffs.push({ id: "spd", label: "»", t: p.speedBuff });
    if (p.barrier > 0) buffs.push({ id: "bar", label: "🛡", t: p.barrier });
    if (p.stealth > 0) buffs.push({ id: "stl", label: "👻", t: p.stealth });

    const d = this.cfg.daily;
    let dailyText = "", dailyOk = true;
    if (d) {
      if (d.rule === "nodamage") { dailyText = `HITS ${this.hitsTaken}/${d.starTargets[0]}`; dailyOk = this.hitsTaken <= d.starTargets[0]; }
      else if (d.rule === "combo") { dailyText = `COMBO ${this.bestCombo}/${d.starTargets[2]}`; dailyOk = true; }
      else if (d.rule === "time") { dailyText = `TIME ${this.runTime.toFixed(0)}s/${d.starTargets[0]}s`; dailyOk = this.runTime <= d.starTargets[0]; }
      else if (d.rule === "kills") { dailyText = `KILLS ${this.kills}/${d.starTargets[2]}`; dailyOk = true; }
      else { dailyText = `ABILITIES ${this.abilitiesUsed}/${d.starTargets[0]}`; dailyOk = this.abilitiesUsed <= d.starTargets[0]; }
    }

    this.onHud({
      hp: p.hp, maxHp: p.maxHp, score: Math.round(this.score * DIFFICULTY[this.difficulty].scoreReward), combo: this.combo, comboTimer: this.comboTimer,
      comboWindow: this.load.comboWindow,
      wave: this.wave, waves: this.cfg.mode === "endless" ? 0 : this.mapDef.waves,
      world: this.planet.name, worldEmoji: this.planet.emoji, mapName: this.mapDef.name,
      weaponLevel: p.weaponLevel, skillCd: p.skillCd, skillMax: this.plane.skill.cd * this.load.skillCdMul,
      ultCd: p.ultCd, ultMax: this.plane.ultimate.cd * this.load.ultCdMul,
      evadeCd: p.evadeCd, evadeMax: GameEngine.EVADE_CD, evadeActive: p.evadeT > 0,
      passiveName: this.plane.passive.name, passiveIcon: this.plane.passive.icon,
      passiveValue: this.passiveMeter(), passiveLabel: this.passiveMeterLabel(),
      bossHp: b?.active ? b.hp : 0, bossMaxHp: b?.active ? b.maxHp : 0,
      bossName: b?.active ? b.def.name : "", bossPhase: b?.active ? b.phase + 1 : 0,
      bossParts: b?.active ? b.parts.filter((x) => !x.dead).length : 0,
      bossPartsTotal: b?.active ? b.parts.length : 0,
      coins: Math.floor(this.coinsEarned * DIFFICULTY[this.difficulty].reward * this.load.coinMul), kills: this.kills, fps: this.fps,
      entities: this.nEnemies,
      projectiles: this.nPBullets + this.nEBullets,
      shield: p.shield, bombs: p.bombs, paused: this.paused, warning: this.warning,
      multiplier: this.comboMultiplier(), buffs,
      mode: this.cfg.mode, eventName: this.evt.t > 0 ? this.evt.name : "", eventTime: Math.max(0, this.evt.t),
      empLock: this.empLock,
      wingmen: this.wings.filter((w) => w.def).map((w) => ({ icon: w.def!.icon, color: w.def!.color, charge: w.charge })),
      dailyText, dailyOk, runTime: this.runTime, hits: this.hitsTaken,
    });
  }
}

export { ENEMIES };
