export type MusicState =
  | "MENU" | "BATTLE" | "BOSS" | "ENRAGE" | "SECRET" | "VICTORY" | "GAMEOVER" | "CINEMATIC" | "NONE";

/** Procedural WebAudio manager with dynamic intensity layers — no external assets. */
class AudioManager {
  ctx: AudioContext | null = null;
  masterGain!: GainNode;
  musicGain!: GainNode;
  sfxGain!: GainNode;
  musicVol = 0.45;
  sfxVol = 0.7;
  muted = false;
  state: MusicState = "NONE";
  /** 0..1 — drives extra percussion / lead layers. */
  intensity = 0.4;
  /** biome tint (0..6) shifts the scale root. */
  biome = 0;
  private seqTimer: number | null = null;
  private step = 0;
  private lastSfx: Record<string, number> = {};

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.masterGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVol;
    this.musicGain.connect(this.masterGain);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVol;
    this.sfxGain.connect(this.masterGain);
  }
  resume() { this.init(); if (this.ctx?.state === "suspended") this.ctx.resume(); }
  setMusicVolume(v: number) { this.musicVol = v; if (this.musicGain) this.musicGain.gain.value = v; }
  setSfxVolume(v: number) { this.sfxVol = v; if (this.sfxGain) this.sfxGain.gain.value = v; }
  mute(m: boolean) { this.muted = m; if (this.masterGain) this.masterGain.gain.value = m ? 0 : 1; }
  setIntensity(v: number) { this.intensity = Math.max(0, Math.min(1, v)); }
  setBiome(i: number) { this.biome = i % 7; }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, dest: GainNode, slide?: number, detune = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.detune.value = detune;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, filter: number, dest: GainNode, type: BiquadFilterType = "lowpass") {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = type;
    bp.frequency.setValueAtTime(filter, t);
    if (type === "lowpass") bp.frequency.exponentialRampToValueAtTime(Math.max(80, filter * 0.2), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(dest);
    src.start(t);
  }

  /** Boss sonic identity: each signature colours its weapon voice. */
  bossVoice(signature: string, kind: "fire" | "roar" | "charge") {
    if (!this.ctx || this.muted) return;
    const S = this.sfxGain;
    const now = performance.now();
    const key = "bv" + signature + kind;
    if (now - (this.lastSfx[key] || 0) < 70) return;
    this.lastSfx[key] = now;
    const profiles: Record<string, { root: number; wave: OscillatorType; bright: number }> = {
      swarmlord:   { root: 300, wave: "square",   bright: 1.5 },
      artillery:   { root: 120, wave: "sawtooth", bright: 0.55 },
      stormcaller: { root: 210, wave: "triangle", bright: 1.2 },
      assassin:    { root: 520, wave: "square",   bright: 2.1 },
      dreadnought: { root: 92,  wave: "sawtooth", bright: 0.4 },
      laserweaver: { root: 680, wave: "sawtooth", bright: 2.4 },
      warden:      { root: 190, wave: "sine",     bright: 0.9 },
      reaper:      { root: 150, wave: "sawtooth", bright: 0.7 },
      annihilator: { root: 105, wave: "square",   bright: 0.6 },
      sovereign:   { root: 78,  wave: "sawtooth", bright: 0.5 },
    };
    const pf = profiles[signature] || profiles.sovereign;
    if (kind === "fire") {
      this.tone(pf.root * pf.bright, 0.1, pf.wave, 0.055, S, pf.root * 0.6);
    } else if (kind === "charge") {
      this.tone(pf.root * 0.7, 0.5, pf.wave, 0.09, S, pf.root * 2.2 * pf.bright);
      this.noise(0.45, 0.07, 1400 * pf.bright, S, "bandpass");
    } else {
      // roar: phase change / arrival signature
      this.tone(pf.root * 0.5, 1.2, pf.wave, 0.26, S, pf.root * 0.3);
      this.tone(pf.root, 0.9, "sine", 0.12, S, pf.root * 0.55);
      this.noise(1.0, 0.24, 900 * pf.bright, S);
    }
  }

  playSFX(name: string) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    const gate = this.lastSfx[name] || 0;
    const minGap: Record<string, number> = { shoot: 55, hit: 38, pickup: 60, dronefire: 70, damagenum: 30 };
    if (now - gate < (minGap[name] ?? 20)) return;
    this.lastSfx[name] = now;
    const S = this.sfxGain;
    switch (name) {
      case "shoot": this.tone(880, 0.07, "square", 0.055, S, 420); break;
      case "laser": this.tone(1400, 0.15, "sawtooth", 0.06, S, 300); break;
      case "dronefire": this.tone(1650, 0.06, "square", 0.035, S, 900); break;
      case "missile": this.noise(0.2, 0.1, 1600, S); this.tone(220, 0.22, "sawtooth", 0.05, S, 90); break;
      case "hit": this.tone(320, 0.05, "square", 0.045, S, 180); break;
      case "crit": this.tone(1500, 0.09, "square", 0.07, S, 2400); break;
      case "explode": this.noise(0.45, 0.4, 1200, S); this.tone(90, 0.4, "sine", 0.22, S, 40); break;
      case "bigexplode": this.noise(1.0, 0.6, 900, S); this.tone(70, 0.9, "sine", 0.35, S, 28); break;
      case "shockwave": this.noise(0.7, 0.5, 400, S); this.tone(52, 1.1, "sine", 0.4, S, 22); break;
      case "pickup": this.tone(700, 0.09, "triangle", 0.13, S, 1500); break;
      case "powerup": this.tone(500, 0.16, "triangle", 0.15, S, 1800); break;
      case "damage": this.noise(0.3, 0.3, 700, S); this.tone(160, 0.3, "sawtooth", 0.15, S, 60); break;
      case "skill": this.tone(300, 0.35, "sawtooth", 0.15, S, 1600); break;
      case "ultimate": this.tone(120, 0.9, "sawtooth", 0.22, S, 1400); this.noise(0.9, 0.3, 2400, S); break;
      case "warning": this.tone(660, 0.28, "square", 0.16, S); break;
      case "bossArrive": this.tone(44, 1.6, "sine", 0.4, S, 30); this.noise(1.3, 0.4, 700, S); this.tone(120, 1.1, "sawtooth", 0.16, S, 60); break;
      case "lockon": this.tone(1750, 0.07, "square", 0.05, S); setTimeout(()=>this.tone(2100,0.07,"square",0.05,S),90); break;
      case "alarm": this.tone(440, 0.5, "sawtooth", 0.14, S, 880); break;
      case "click": this.tone(1200, 0.05, "square", 0.09, S, 900); break;
      case "combo": this.tone(1000, 0.09, "triangle", 0.11, S, 1600); break;
      case "achievement":
        this.tone(660, 0.12, "triangle", 0.15, S);
        setTimeout(() => this.tone(990, 0.2, "triangle", 0.15, S), 110);
        setTimeout(() => this.tone(1320, 0.28, "triangle", 0.13, S), 230);
        break;
      case "coin": this.tone(1300, 0.06, "square", 0.07, S, 1900); break;
      case "shield": this.tone(400, 0.25, "sine", 0.13, S, 900); break;
      case "phase": this.tone(200, 0.6, "sawtooth", 0.18, S, 800); break;
      /* ---- EVASIVE MANEUVER ---- */
      case "evade":
        // rising whoosh + jet crack
        this.noise(0.55, 0.3, 4200, S, "bandpass");
        this.tone(280, 0.5, "sine", 0.2, S, 1700);
        this.tone(900, 0.22, "triangle", 0.1, S, 2600);
        break;
      case "evadeEnd": this.tone(1500, 0.2, "sine", 0.11, S, 420); this.noise(0.22, 0.12, 2200, S); break;
      case "dodge": this.tone(2100, 0.05, "sine", 0.06, S, 3000); break;
      case "perfectEvade":
        this.tone(784, 0.14, "triangle", 0.17, S);
        setTimeout(() => this.tone(1175, 0.16, "triangle", 0.16, S), 110);
        setTimeout(() => this.tone(1568, 0.3, "triangle", 0.15, S), 230);
        break;
      /* ---- WEAPON IDENTITY ---- */
      case "plasma": this.tone(520, 0.11, "sine", 0.07, S, 1500); break;
      case "electric": this.noise(0.09, 0.07, 5200, S, "highpass"); this.tone(1500, 0.07, "square", 0.045, S, 2600); break;
      case "railgun": this.tone(190, 0.14, "sawtooth", 0.075, S, 70); this.noise(0.1, 0.07, 2600, S); break;
      case "laserBig": this.tone(1900, 0.22, "sawtooth", 0.085, S, 260); break;
      case "aceVolley": this.tone(1320, 0.11, "square", 0.08, S, 2200); break;
      /* ---- PASSIVE IDENTITY ---- */
      case "execute": this.tone(160, 0.28, "sawtooth", 0.18, S, 1400); this.noise(0.24, 0.2, 1800, S); break;
      case "overkill": this.noise(0.5, 0.35, 1500, S); this.tone(110, 0.44, "sine", 0.24, S, 44); break;
      case "armorPlate": this.tone(150, 0.2, "square", 0.16, S, 70); this.noise(0.18, 0.16, 900, S); break;
      case "emp": this.noise(1.2, 0.35, 3000, S, "highpass"); this.tone(1800, 1.0, "sine", 0.1, S, 60); break;
      case "storm": this.noise(2.4, 0.16, 900, S); break;
      case "unlock": this.tone(392, 0.16, "triangle", 0.16, S); setTimeout(() => this.tone(587, 0.3, "triangle", 0.16, S), 150); break;
      case "cinematic": this.tone(98, 1.6, "sine", 0.2, S, 196); this.tone(147, 1.4, "triangle", 0.09, S); break;
      case "secret": this.tone(58, 2.2, "sawtooth", 0.28, S, 42); this.noise(2.0, 0.25, 500, S); break;
    }
  }

  private patterns: Record<string, { root: number[]; bpm: number; wave: OscillatorType; lead: boolean }> = {
    MENU: { root: [55, 82.4, 65.4, 98], bpm: 96, wave: "triangle", lead: false },
    BATTLE: { root: [65.4, 65.4, 87.3, 98], bpm: 150, wave: "sawtooth", lead: true },
    BOSS: { root: [49, 51.9, 49, 43.6], bpm: 172, wave: "square", lead: true },
    ENRAGE: { root: [46.2, 46.2, 43.6, 41.2], bpm: 192, wave: "sawtooth", lead: true },
    SECRET: { root: [36.7, 38.9, 36.7, 32.7], bpm: 178, wave: "sawtooth", lead: true },
    VICTORY: { root: [98, 123.5, 146.8, 196], bpm: 112, wave: "triangle", lead: true },
    GAMEOVER: { root: [65.4, 58.3, 49, 43.6], bpm: 62, wave: "sine", lead: false },
    CINEMATIC: { root: [43.6, 49, 58.3, 43.6], bpm: 74, wave: "sine", lead: false },
  };

  playMusic(state: MusicState, force = false) {
    this.init();
    if (!this.ctx) return;
    if (this.state === state && !force) return;
    this.stopMusic();
    this.state = state;
    if (state === "NONE") return;
    const pat = this.patterns[state];
    if (!pat) return;
    this.step = 0;
    const interval = ((60 / pat.bpm) * 1000) / 2;
    const biomeShift = [0, 2, 3, -2, 5, -4, 7][this.biome] || 0;
    const shift = Math.pow(2, biomeShift / 12);

    const tick = () => {
      if (!this.ctx || this.muted) return;
      const s = this.step++;
      const inten = this.intensity;
      const bar = Math.floor(s / 8) % pat.root.length;
      const root = pat.root[bar] * shift;

      // LAYER 1 — bass foundation (always)
      if (s % 2 === 0) this.tone(root, 0.22, pat.wave, 0.2 + inten * 0.08, this.musicGain);
      // LAYER 2 — kick
      if (s % 4 === 0) this.tone(58, 0.16, "sine", 0.28, this.musicGain, 34);
      // LAYER 3 — hats (intensity > 0.25)
      if (inten > 0.25 && state !== "GAMEOVER" && s % 2 === 1) this.noise(0.045, 0.035 + inten * 0.03, 7000, this.musicGain);
      // LAYER 4 — snare backbeat (intensity > 0.45)
      if (inten > 0.45 && s % 8 === 4) this.noise(0.13, 0.1, 2400, this.musicGain);
      // LAYER 5 — arp lead (intensity > 0.35)
      if (pat.lead && inten > 0.35) {
        const scale = [0, 3, 5, 7, 10, 12, 15];
        const n = scale[(s * 3) % scale.length];
        this.tone(root * 4 * Math.pow(2, n / 12), 0.12, "square", 0.03 + inten * 0.035, this.musicGain);
      }
      // LAYER 6 — high stabs at max intensity
      if (inten > 0.72 && s % 4 === 2) {
        this.tone(root * 8, 0.09, "sawtooth", 0.028, this.musicGain, root * 6);
      }
      // LAYER 7 — dissonant enrage drone
      if ((state === "ENRAGE" || state === "SECRET") && s % 8 === 0) {
        this.tone(root * 1.5, 1.4, "sawtooth", 0.07, this.musicGain, root * 1.42, 18);
      }
      if (state === "MENU" && s % 4 === 2) this.tone(root * 4, 0.5, "sine", 0.045, this.musicGain);
      if (state === "CINEMATIC" && s % 8 === 0) this.tone(root * 3, 1.8, "sine", 0.06, this.musicGain);
    };
    tick();
    this.seqTimer = window.setInterval(tick, interval);
  }

  stopMusic() {
    if (this.seqTimer !== null) { clearInterval(this.seqTimer); this.seqTimer = null; }
    this.state = "NONE";
  }
}

export const Audio = new AudioManager();
