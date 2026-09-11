export type MovePattern =
  | "straight"
  | "zigzag"
  | "sine"
  | "follow"
  | "circle"
  | "formation"
  | "ambush"
  | "retreat"
  | "drift";

export type FirePattern =
  | "none"
  | "single"
  | "aimed"
  | "cone"
  | "burst"
  | "circle"
  | "spiral"
  | "wave"
  | "rain"
  | "tracking"
  | "cross"
  | "ring"
  | "laser"
  | "missile"
  | "bloom"
  | "serpent"
  | "nova"
  | "vortex"
  | "curtain"
  | "fanblade";

/** Tactical battlefield function — drives AI behaviour, not just stats. */
export type EnemyRole =
  | "skirmisher"   // fast, harassing strafe runs
  | "line"         // standard formation fighter
  | "heavy"        // frontal armour, must be flanked
  | "artillery"    // long range, keeps distance, telegraphed shells
  | "support"      // buffs/shields nearby allies — priority target
  | "kamikaze"     // lock-on dive with telegraph
  | "sniper"       // charges a laser-sight shot
  | "elite";       // enrages, adapts

export interface EnemyTraits {
  /** projects a damage-absorbing aura onto nearby allies */
  auraShield?: number;
  /** boosts fire rate of nearby allies (multiplier) */
  auraRate?: number;
  /** frontal armour: damage taken from below is reduced by this factor */
  frontArmor?: number;
  /** telegraph seconds before its main attack */
  telegraph?: number;
  /** strafes horizontally instead of diving */
  strafe?: boolean;
  /** gains speed+rate below 40% hp */
  enrage?: number;
  /** splits into N smaller units on death */
  splitInto?: { id: string; count: number };
  /** preferred stand-off distance from the player (px) */
  standoff?: number;
  /** dodges incoming player fire */
  evasive?: number;
  /** revives shields of allies */
  repair?: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  role: EnemyRole;
  traits?: EnemyTraits;
  hp: number;
  speed: number;
  radius: number;
  score: number;
  coins: number;
  pattern: MovePattern;
  fire: FirePattern;
  attackRate: number; // seconds between attacks
  bulletSpeed: number;
  damage: number;
  shape:
    | "scout"
    | "fighter"
    | "drone"
    | "heavy"
    | "sniper"
    | "bomber"
    | "kamikaze"
    | "shield"
    | "laser"
    | "missile"
    | "elite"
    | "miniboss";
  color: string;
  accent: string;
  size: number;
  elite?: boolean;
}

export const ENEMIES: EnemyDef[] = [
  /* ================= GALAXY 1 — SOLARIS EDGE ================= */
  { id: "scout", name: "SCOUT", role: "skirmisher", traits: { strafe: true, evasive: 0.35 },
    hp: 14, speed: 210, radius: 18, score: 40, coins: 2, pattern: "sine", fire: "single", attackRate: 2.2, bulletSpeed: 260, damage: 8, shape: "scout", color: "#8fa6bd", accent: "#ff5d5d", size: 0.8 },

  { id: "fighter", name: "FIGHTER", role: "line",
    hp: 30, speed: 165, radius: 22, score: 70, coins: 3, pattern: "zigzag", fire: "aimed", attackRate: 1.8, bulletSpeed: 290, damage: 10, shape: "fighter", color: "#a2b6c9", accent: "#ff8a3d", size: 1 },

  { id: "drone", name: "DRONE", role: "skirmisher", traits: { evasive: 0.5 },
    hp: 20, speed: 190, radius: 19, score: 55, coins: 2, pattern: "drift", fire: "single", attackRate: 2.6, bulletSpeed: 250, damage: 8, shape: "drone", color: "#7fd0c0", accent: "#26ffd0", size: 0.9 },

  { id: "heavy", name: "HEAVY", role: "heavy", traits: { frontArmor: 0.45 },
    hp: 110, speed: 95, radius: 33, score: 180, coins: 8, pattern: "straight", fire: "cone", attackRate: 2.4, bulletSpeed: 240, damage: 13, shape: "heavy", color: "#9aa08a", accent: "#ffbe3d", size: 1.35 },

  { id: "sniper", name: "SNIPER", role: "sniper", traits: { telegraph: 0.85, standoff: 460 },
    hp: 34, speed: 110, radius: 21, score: 120, coins: 5, pattern: "retreat", fire: "tracking", attackRate: 2.6, bulletSpeed: 470, damage: 15, shape: "sniper", color: "#b2a0c9", accent: "#c86bff", size: 1 },

  { id: "bomber", name: "BOMBER", role: "artillery", traits: { telegraph: 0.7, standoff: 520 },
    hp: 90, speed: 105, radius: 31, score: 165, coins: 7, pattern: "straight", fire: "rain", attackRate: 2.1, bulletSpeed: 200, damage: 14, shape: "bomber", color: "#c2a17a", accent: "#ff6a2b", size: 1.3 },

  { id: "kamikaze", name: "KAMIKAZE", role: "kamikaze", traits: { telegraph: 0.6 },
    hp: 24, speed: 300, radius: 20, score: 95, coins: 4, pattern: "follow", fire: "none", attackRate: 99, bulletSpeed: 0, damage: 20, shape: "kamikaze", color: "#ff8b6b", accent: "#ff2d2d", size: 0.95 },

  { id: "shielder", name: "AEGIS UNIT", role: "support", traits: { auraShield: 0.45, standoff: 300 },
    hp: 70, speed: 120, radius: 26, score: 150, coins: 6, pattern: "formation", fire: "circle", attackRate: 3.2, bulletSpeed: 210, damage: 10, shape: "shield", color: "#7fa8e8", accent: "#3fd0ff", size: 1.15 },

  { id: "laser", name: "LASER UNIT", role: "artillery", traits: { telegraph: 0.9, standoff: 380 },
    hp: 60, speed: 100, radius: 25, score: 160, coins: 6, pattern: "circle", fire: "laser", attackRate: 3.4, bulletSpeed: 0, damage: 18, shape: "laser", color: "#e07fb0", accent: "#ff2d6f", size: 1.1 },

  { id: "missiler", name: "MISSILE UNIT", role: "artillery", traits: { telegraph: 0.55, standoff: 430 },
    hp: 65, speed: 120, radius: 26, score: 170, coins: 7, pattern: "zigzag", fire: "missile", attackRate: 3, bulletSpeed: 180, damage: 16, shape: "missile", color: "#a8b07f", accent: "#ffd23d", size: 1.12 },

  { id: "elite", name: "ELITE", role: "elite", traits: { enrage: 0.5, evasive: 0.3, telegraph: 0.4 },
    hp: 200, speed: 135, radius: 34, score: 400, coins: 18, pattern: "ambush", fire: "spiral", attackRate: 1.6, bulletSpeed: 250, damage: 15, shape: "elite", color: "#d9c56b", accent: "#ffe680", size: 1.4, elite: true },

  { id: "miniboss", name: "MINI BOSS", role: "elite", traits: { enrage: 0.6, frontArmor: 0.3, telegraph: 0.6 },
    hp: 700, speed: 70, radius: 54, score: 1400, coins: 70, pattern: "formation", fire: "burst", attackRate: 1.3, bulletSpeed: 260, damage: 20, shape: "miniboss", color: "#b9a0d6", accent: "#ff4fd8", size: 2.1, elite: true },

  /* ---- G1 tactical variants (not just more HP) ---- */
  { id: "interceptor", name: "INTERCEPTOR", role: "skirmisher", traits: { strafe: true, evasive: 0.6, standoff: 240 },
    hp: 26, speed: 290, radius: 19, score: 90, coins: 4, pattern: "drift", fire: "cone", attackRate: 1.9, bulletSpeed: 330, damage: 10, shape: "scout", color: "#a8d4ff", accent: "#2ee6ff", size: 0.86 },

  { id: "marauder", name: "MARAUDER", role: "line", traits: { splitInto: { id: "drone", count: 2 } },
    hp: 55, speed: 150, radius: 24, score: 130, coins: 6, pattern: "sine", fire: "wave", attackRate: 2.3, bulletSpeed: 265, damage: 11, shape: "fighter", color: "#c7b39a", accent: "#ff9f43", size: 1.05 },

  { id: "bulwark", name: "BULWARK", role: "heavy", traits: { frontArmor: 0.65, auraShield: 0.25 },
    hp: 190, speed: 78, radius: 36, score: 300, coins: 14, pattern: "straight", fire: "curtain", attackRate: 2.6, bulletSpeed: 220, damage: 15, shape: "heavy", color: "#8f9a8a", accent: "#ffd23d", size: 1.45 },

  /* ================= GALAXY 2 — VOID NEXUS ================= */
  { id: "swarmer", name: "SWARMER", role: "skirmisher", traits: { evasive: 0.4 },
    hp: 16, speed: 260, radius: 16, score: 60, coins: 3, pattern: "drift", fire: "single", attackRate: 2.4, bulletSpeed: 300, damage: 9, shape: "drone", color: "#7affc0", accent: "#00ffa0", size: 0.75 },

  { id: "warden", name: "VOID WARDEN", role: "support", traits: { auraShield: 0.6, auraRate: 1.3, repair: 1, standoff: 320 },
    hp: 150, speed: 105, radius: 30, score: 260, coins: 12, pattern: "formation", fire: "ring", attackRate: 2.8, bulletSpeed: 235, damage: 15, shape: "shield", color: "#8f9fd6", accent: "#7c5cff", size: 1.25 },

  { id: "artillery", name: "ARTILLERY", role: "artillery", traits: { telegraph: 0.95, standoff: 560 },
    hp: 130, speed: 80, radius: 32, score: 240, coins: 11, pattern: "retreat", fire: "rain", attackRate: 2.2, bulletSpeed: 225, damage: 17, shape: "bomber", color: "#c9a06b", accent: "#ff8a2b", size: 1.32 },

  { id: "phasewalker", name: "PHASEWALKER", role: "sniper", traits: { telegraph: 0.7, evasive: 0.7, standoff: 400 },
    hp: 90, speed: 230, radius: 24, score: 300, coins: 13, pattern: "ambush", fire: "cross", attackRate: 2, bulletSpeed: 270, damage: 16, shape: "sniper", color: "#d18fff", accent: "#ff2df0", size: 1.08 },

  { id: "pyroling", name: "PYROLING", role: "kamikaze", traits: { telegraph: 0.5, splitInto: { id: "swarmer", count: 2 } },
    hp: 70, speed: 190, radius: 23, score: 210, coins: 9, pattern: "follow", fire: "cone", attackRate: 2.2, bulletSpeed: 280, damage: 18, shape: "kamikaze", color: "#ff9a5b", accent: "#ff3b00", size: 1.05 },

  { id: "voidlance", name: "VOID LANCE", role: "artillery", traits: { telegraph: 1.05, standoff: 420 },
    hp: 175, speed: 120, radius: 30, score: 380, coins: 16, pattern: "circle", fire: "laser", attackRate: 3, bulletSpeed: 0, damage: 22, shape: "laser", color: "#a0e8ff", accent: "#00e5ff", size: 1.22 },

  { id: "juggernaut", name: "JUGGERNAUT", role: "heavy", traits: { frontArmor: 0.55, enrage: 0.45 },
    hp: 420, speed: 70, radius: 42, score: 720, coins: 30, pattern: "straight", fire: "spiral", attackRate: 1.5, bulletSpeed: 250, damage: 22, shape: "elite", color: "#c3c9d6", accent: "#ffd23d", size: 1.7, elite: true },

  /* ---- G2 tactical variants ---- */
  { id: "seraph", name: "VOID SERAPH", role: "elite", traits: { enrage: 0.7, evasive: 0.45, auraRate: 1.25, telegraph: 0.45 },
    hp: 330, speed: 150, radius: 34, score: 620, coins: 26, pattern: "ambush", fire: "bloom", attackRate: 1.5, bulletSpeed: 260, damage: 19, shape: "elite", color: "#e0c9ff", accent: "#c86bff", size: 1.44, elite: true },

  { id: "hexbinder", name: "HEXBINDER", role: "support", traits: { auraRate: 1.5, repair: 2, standoff: 340, evasive: 0.3 },
    hp: 120, speed: 130, radius: 26, score: 300, coins: 14, pattern: "circle", fire: "vortex", attackRate: 3, bulletSpeed: 240, damage: 14, shape: "shield", color: "#9fe8d6", accent: "#00ffc8", size: 1.18 },

  { id: "obliterator", name: "OBLITERATOR", role: "artillery", traits: { telegraph: 1.2, standoff: 600 },
    hp: 260, speed: 66, radius: 38, score: 560, coins: 24, pattern: "retreat", fire: "nova", attackRate: 2.6, bulletSpeed: 250, damage: 24, shape: "bomber", color: "#d6a8a8", accent: "#ff2d3d", size: 1.5 },
];

/** Tactical squad templates — force the player to prioritise targets. */
export interface SquadDef { id: string; name: string; units: { id: string; count: number; slot: "front" | "mid" | "back" }[]; threat: string }

export const SQUADS: SquadDef[] = [
  { id: "phalanx", name: "PHALANX", threat: "Kill the AEGIS first — it shields the whole line",
    units: [{ id: "shielder", count: 1, slot: "mid" }, { id: "heavy", count: 2, slot: "front" }, { id: "missiler", count: 2, slot: "back" }] },
  { id: "hunterkiller", name: "HUNTER-KILLER", threat: "Snipers pin you while interceptors flank",
    units: [{ id: "sniper", count: 2, slot: "back" }, { id: "interceptor", count: 3, slot: "front" }] },
  { id: "siege", name: "SIEGE BATTERY", threat: "Artillery behind an armoured wall",
    units: [{ id: "bulwark", count: 1, slot: "front" }, { id: "bomber", count: 2, slot: "back" }, { id: "fighter", count: 2, slot: "mid" }] },
  { id: "swarmrush", name: "SWARM RUSH", threat: "Overwhelming numbers — use area damage",
    units: [{ id: "swarmer", count: 6, slot: "front" }, { id: "kamikaze", count: 2, slot: "mid" }] },
  { id: "voidcell", name: "VOID CELL", threat: "The HEXBINDER repairs everything — break it",
    units: [{ id: "hexbinder", count: 1, slot: "back" }, { id: "warden", count: 1, slot: "mid" }, { id: "phasewalker", count: 2, slot: "front" }] },
  { id: "annihilation", name: "ANNIHILATION WING", threat: "Elite escort with heavy support",
    units: [{ id: "seraph", count: 1, slot: "mid" }, { id: "juggernaut", count: 1, slot: "front" }, { id: "obliterator", count: 1, slot: "back" }] },
  { id: "lancers", name: "LANCE FORMATION", threat: "Beams from range, armour up close",
    units: [{ id: "voidlance", count: 2, slot: "back" }, { id: "heavy", count: 2, slot: "front" }] },
  { id: "wolfpack", name: "WOLFPACK", threat: "Fast splitters — they multiply when killed",
    units: [{ id: "marauder", count: 3, slot: "mid" }, { id: "interceptor", count: 2, slot: "front" }] },
];

export const getSquad = (id: string) => SQUADS.find((s) => s.id === id);

export const getEnemy = (id: string) => ENEMIES.find((e) => e.id === id) || ENEMIES[0];
