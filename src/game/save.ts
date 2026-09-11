import type { UpgradeKey } from "./data/planes";
import type { DifficultyName, QualityLevel } from "./config";
import type { WingmanSlotSave } from "./data/wingmen";
import { GALAXIES, planetKey, planetMaxLevel, planetOrder } from "./data/galaxies";
import { PLANES } from "./data/planes";
import { isLanguage, translate, type Language } from "../i18n";
import { planeXpForLevel, MAX_AIRFRAME_LEVEL } from "./progression";

export { planetMaxLevel, planetOrder };

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  target: number;
  icon: string;
  reward: { coins: number; crystals: number };
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_blood", name: "FIRST BLOOD", desc: "Destroy 10 enemies", target: 10, icon: "🩸", reward: { coins: 200, crystals: 0 } },
  { id: "air_master", name: "AIR MASTER", desc: "Destroy 100 enemies", target: 100, icon: "✈️", reward: { coins: 800, crystals: 1 } },
  { id: "annihilator", name: "ANNIHILATOR", desc: "Destroy 1000 enemies", target: 1000, icon: "☠️", reward: { coins: 4000, crystals: 6 } },
  { id: "boss_slayer", name: "BOSS SLAYER", desc: "Defeat your first boss", target: 1, icon: "👹", reward: { coins: 1000, crystals: 2 } },
  { id: "boss_hunter", name: "BOSS HUNTER", desc: "Defeat 15 bosses", target: 15, icon: "🗡️", reward: { coins: 3500, crystals: 6 } },
  { id: "warlord", name: "WARLORD BANE", desc: "Defeat 35 sector warlords", target: 35, icon: "⚔️", reward: { coins: 8000, crystals: 12 } },
  { id: "exterminator", name: "EXTERMINATOR", desc: "Defeat 77 bosses", target: 77, icon: "💀", reward: { coins: 20000, crystals: 30 } },
  { id: "combo_master", name: "COMBO MASTER", desc: "Reach combo x50", target: 50, icon: "🔥", reward: { coins: 1200, crystals: 2 } },
  { id: "combo_god", name: "COMBO GOD", desc: "Reach combo x100", target: 100, icon: "⚡", reward: { coins: 3000, crystals: 5 } },
  { id: "collector", name: "COLLECTOR", desc: "Own 3 aircraft", target: 3, icon: "🛩️", reward: { coins: 1500, crystals: 3 } },
  { id: "millionaire", name: "WAR PROFITEER", desc: "Earn 50000 coins", target: 50000, icon: "💰", reward: { coins: 5000, crystals: 8 } },
  { id: "wingman", name: "NOT ALONE", desc: "Deploy 2 wingmen drones", target: 2, icon: "🛰️", reward: { coins: 2000, crystals: 3 } },
  { id: "cartographer", name: "CARTOGRAPHER", desc: "Clear 30 sector maps", target: 30, icon: "🗺️", reward: { coins: 6000, crystals: 8 } },
  { id: "secret", name: "FORBIDDEN KNOWLEDGE", desc: "Defeat a Secret Boss", target: 1, icon: "🔮", reward: { coins: 10000, crystals: 15 } },
  { id: "endless", name: "NO SURRENDER", desc: "Reach wave 25 in Endless", target: 25, icon: "♾️", reward: { coins: 7000, crystals: 10 } },
  { id: "legend", name: "LEGEND", desc: "Conquer every planet", target: 7, icon: "🏆", reward: { coins: 30000, crystals: 60 } },
];

export interface PlanetSave { maps: number; stars: number[]; secret: boolean }
export interface PlaneSave { level: number; xp: number; nodes: Record<string, number>; skin: string; skins: string[]; pilot: string }

export interface SaveData {
  version: number;
  level: number;
  xp: number;
  coins: number;
  crystals: number;
  planes: string[];
  selected: string;
  upgrades: Record<UpgradeKey, number>;
  highScore: number;
  /* --- new progression --- */
  galaxyProgress: number;                       // number of unlocked galaxies (1..2)
  planetProgress: Record<string, PlanetSave>;   // key = `${galaxyIdx}_${planetIdx}`
  talents: Record<string, number>;
  wingmen: [WingmanSlotSave, WingmanSlotSave];
  ownedWingmen: string[];
  planeData: Record<string, PlaneSave>;
  pilots: string[];
  endless: { bestWave: number; bestScore: number; bossRushBest: number };
  daily: { key: string; stars: number; best: number; done: boolean };
  dailyClaims: Record<string, number>;
  appliedRuns: string[];
  leaderboard: { mode: string; score: number; wave: number; date: string; difficulty?: DifficultyName; planeId?: string }[];
  /* --- misc --- */
  worldsCleared: string[];
  stats: { kills: number; bosses: number; secretBosses: number; bestCombo: number; totalCoins: number; games: number; deaths: number; mapsCleared: number };
  achievements: string[];
  settings: {
    language: Language;
    music: number;
    sfx: number;
    muted: boolean;
    quality: QualityLevel;
    difficulty: DifficultyName;
    control: "auto" | "touch" | "mouse" | "keyboard";
    shake: boolean;
    damageNumbers: boolean;
    cinematics: boolean;
  };
}

const KEY = "skyfront_ace_save_v2";
const OLD_KEY = "skyfront_ace_save_v1";

/**
 * Active save slot. "" is the guest/local profile and intentionally reuses the
 * original key, so progress created before accounts existed is never lost.
 */
let activeProfile = "";
export const setActiveProfile = (profile: string) => { activeProfile = profile || ""; };
export const getActiveProfile = () => activeProfile;
const keyFor = (profile = activeProfile) => (profile ? `${KEY}::${profile}` : KEY);

export function hasSave(profile = activeProfile): boolean {
  try {
    return localStorage.getItem(keyFor(profile)) !== null
      || (!profile && localStorage.getItem(OLD_KEY) !== null);
  } catch {
    return false;
  }
}

export function defaultPlaneSave(): PlaneSave {
  return { level: 0, xp: 0, nodes: {}, skin: "default", skins: ["default"], pilot: "rookie" };
}

export function defaultSave(): SaveData {
  return {
    version: 3,
    level: 1,
    xp: 0,
    coins: 1500,
    crystals: 6,
    planes: ["falcon"],
    selected: "falcon",
    upgrades: { damage: 0, health: 0, fireRate: 0, speed: 0, critical: 0, critDamage: 0, missiles: 0, shield: 0 },
    highScore: 0,
    galaxyProgress: 1,
    planetProgress: { "0_0": { maps: 0, stars: [], secret: false } },
    talents: {},
    wingmen: [
      { id: "none", talents: {} },
      { id: "none", talents: {} },
    ],
    ownedWingmen: [],
    planeData: { falcon: defaultPlaneSave() },
    pilots: ["rookie"],
    endless: { bestWave: 0, bestScore: 0, bossRushBest: 0 },
    daily: { key: "", stars: 0, best: 0, done: false },
    dailyClaims: {},
    appliedRuns: [],
    leaderboard: [],
    worldsCleared: [],
    stats: { kills: 0, bosses: 0, secretBosses: 0, bestCombo: 0, totalCoins: 0, games: 0, deaths: 0, mapsCleared: 0 },
    achievements: [],
    settings: {
      language: "es",
      music: 0.4,
      sfx: 0.7,
      muted: false,
      quality: "HIGH",
      difficulty: "NORMAL",
      control: "auto",
      shake: true,
      damageNumbers: true,
      cinematics: true,
    },
  };
}

export function loadGame(profile = activeProfile): SaveData {
  const base = defaultSave();
  try {
    const raw = localStorage.getItem(keyFor(profile));
    if (!raw) {
      // migrate v1 (guest slot only; account slots start fresh)
      const old = profile ? null : localStorage.getItem(OLD_KEY);
      if (old) {
        const d = JSON.parse(old);
        const migrated: SaveData = {
          ...base,
          version: 1,
          level: d.level ?? 1,
          xp: d.xp ?? 0,
          coins: d.coins ?? base.coins,
          crystals: d.crystals ?? base.crystals,
          planes: d.planes ?? base.planes,
          selected: d.selected ?? base.selected,
          upgrades: { ...base.upgrades, ...(d.upgrades || {}) },
          highScore: d.highScore ?? 0,
          achievements: d.achievements ?? [],
          settings: { ...base.settings, ...(d.settings || {}) },
          stats: { ...base.stats, ...(d.stats || {}) },
        };
        for (const p of migrated.planes) migrated.planeData[p] = migrated.planeData[p] || defaultPlaneSave();
        return normalize(migrated);
      }
      return normalize(base);
    }
    const d = JSON.parse(raw);
    return normalize({
      ...base,
      ...d,
      version: d.version ?? 2,
      upgrades: { ...base.upgrades, ...(d.upgrades || {}) },
      stats: { ...base.stats, ...(d.stats || {}) },
      settings: { ...base.settings, ...(d.settings || {}) },
      endless: { ...base.endless, ...(d.endless || {}) },
      daily: { ...base.daily, ...(d.daily || {}) },
      dailyClaims: { ...(d.dailyClaims || {}) },
      appliedRuns: Array.isArray(d.appliedRuns) ? d.appliedRuns.slice(-64) : [],
      planetProgress: { ...base.planetProgress, ...(d.planetProgress || {}) },
      talents: { ...(d.talents || {}) },
      planeData: { ...base.planeData, ...(d.planeData || {}) },
      wingmen: (d.wingmen && d.wingmen.length === 2 ? d.wingmen : base.wingmen) as SaveData["wingmen"],
    });
  } catch {
    return normalize(base);
  }
}

export function normalize(s: SaveData): SaveData {
  const legacy = s.version < 3;
  const finite = (n: unknown, fallback = 0) => typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : fallback;
  s.planes = Array.isArray(s.planes) ? [...new Set(s.planes)].filter((id) => PLANES.some((p) => p.id === id)) : ["falcon"];
  if (!s.planes.length) s.planes = ["falcon"];
  if (!s.planes.includes(s.selected)) s.selected = s.planes[0];
  s.settings.language = isLanguage(s.settings.language) ? s.settings.language : "es";
  if (!["EASY", "NORMAL", "HARD", "INSANE"].includes(s.settings.difficulty)) s.settings.difficulty = "NORMAL";
  if (!["LOW", "MEDIUM", "HIGH"].includes(s.settings.quality)) s.settings.quality = "MEDIUM";
  s.galaxyProgress = Math.max(1, Math.min(GALAXIES.length, Math.floor(finite(s.galaxyProgress, 1))));
  s.coins = Math.floor(finite(s.coins));
  s.crystals = Math.floor(finite(s.crystals));
  s.level = Math.max(1, Math.min(MAX_AIRFRAME_LEVEL, Math.floor(finite(s.level, 1))));
  s.xp = finite(s.xp);
  s.dailyClaims ??= {};
  s.appliedRuns ??= [];
  for (const state of Object.values(s.planetProgress)) {
    state.maps = Math.min(10, Math.floor(finite(state.maps)));
    state.stars = Array.isArray(state.stars) ? state.stars.slice(0, 10).map((v) => Math.min(3, finite(v))) : [];
    state.secret = state.secret === true;
  }
  for (const p of s.planes) if (!s.planeData[p]) s.planeData[p] = defaultPlaneSave();
  for (const k of Object.keys(s.planeData)) {
    const pd = s.planeData[k];
    if (!pd.skins) pd.skins = ["default"];
    if (!pd.skin) pd.skin = "default";
    if (!pd.pilot) pd.pilot = "rookie";
    if (!pd.nodes) pd.nodes = {};
    pd.level = Math.min(MAX_AIRFRAME_LEVEL, Math.floor(finite(pd.level)));
    pd.xp = finite(pd.xp);
    if (legacy) {
      const oldCost = 260 * Math.pow(1.22, Math.max(0, pd.level - 1));
      pd.xp = Math.round(Math.min(1, pd.xp / oldCost) * planeXpForLevel(pd.level));
    }
  }
  if (!s.planetProgress["0_0"]) s.planetProgress["0_0"] = { maps: 0, stars: [], secret: false };
  if (!s.pilots.includes("rookie")) s.pilots.push("rookie");
  if (legacy) {
    // Keep completed sectors reachable for the veteran aircraft after migration.
    let veteranFloor = 0;
    GALAXIES.forEach((galaxy, g) => galaxy.planets.forEach((_, p) => {
      if (!isPlanetUnlocked(s, g, p)) return;
      const state = planetState(s, g, p);
      veteranFloor = Math.max(veteranFloor, sectorRequiredLevel(g, p, Math.max(0, state.maps - 1)));
      if (state.secret) veteranFloor = Math.max(veteranFloor, planetMaxLevel(g, p));
    }));
    s.planeData[s.selected].level = Math.max(s.planeData[s.selected].level, veteranFloor);
    if (s.daily.done && s.daily.key) s.dailyClaims[s.daily.key] = Math.max(1, s.daily.stars);
  }
  s.version = 3;
  return s;
}

export function saveGame(d: SaveData, profile = activeProfile) {
  try { localStorage.setItem(keyFor(profile), JSON.stringify(d)); return true; } catch { return false; }
}

/** Clears only the given slot, so resetting one account never touches another. */
export function resetGame(profile = activeProfile): SaveData {
  try {
    localStorage.removeItem(keyFor(profile));
    if (!profile) localStorage.removeItem(OLD_KEY);
  } catch { /* noop */ }
  return defaultSave();
}

/**
 * Pilot XP curve — supports the full 100→700 planetary ladder.
 * Fast early game, steady mid game, prestigious endgame.
 */
export const xpForLevel = (lv: number) => {
  if (lv <= 1) return 250;
  const n = lv - 1;
  if (lv <= 100) return Math.round(250 + n * 32 + Math.pow(n, 1.32) * 2.5);
  if (lv <= 400) return Math.round(5200 + (n - 100) * 46);
  return Math.round(19000 + (n - 400) * 60);
};

export function upgradeCost(level: number, base: number) {
  return Math.round(base * Math.pow(1.35, level));
}

/* ------------------- progression helpers ------------------- */

export function planetState(s: SaveData, g: number, p: number): PlanetSave {
  return s.planetProgress[planetKey(g, p)] || { maps: 0, stars: [], secret: false };
}

export function isPlanetUnlocked(s: SaveData, g: number, p: number): boolean {
  if (!Number.isInteger(g) || !Number.isInteger(p) || !GALAXIES[g]?.planets[p] || g >= s.galaxyProgress) return false;
  if (g > 0 && !galaxyComplete(s, g - 1)) return false;
  if (p === 0) return true;
  const prev = planetState(s, g, p - 1);
  return prev.secret;
}

export function isMapUnlocked(s: SaveData, g: number, p: number, m: number): boolean {
  return mapAccess(s, g, p, m).ok;
}

export const aircraftLevel = (s: SaveData, id = s.selected) => s.planeData[id]?.level ?? 0;
export const sectorRequiredLevel = (g: number, p: number, m: number) => planetOrder(g, p) * 100 + m * 10;

export interface AccessResult { ok: boolean; reason: string; requiredLevel?: number }

export function mapAccess(s: SaveData, g: number, p: number, m: number): AccessResult {
  const t = (source: string, params = {}) => translate(s.settings.language, source, params);
  if (!Number.isInteger(m) || m < 0 || m >= 10 || !GALAXIES[g]?.planets[p]) return { ok: false, reason: t("Invalid mission") };
  if (!s.planes.includes(s.selected)) return { ok: false, reason: t("Aircraft not owned") };
  if (!isPlanetUnlocked(s, g, p)) return { ok: false, reason: t("Planet locked") };
  const requiredLevel = sectorRequiredLevel(g, p, m);
  if (m > planetState(s, g, p).maps) return { ok: false, reason: t("Previous sector required"), requiredLevel };
  const current = aircraftLevel(s);
  if (current < requiredLevel) return { ok: false, reason: t("Aircraft level {required} required (current: {current})", { required: requiredLevel, current }), requiredLevel };
  return { ok: true, reason: "", requiredLevel };
}

export function canFightSecret(s: SaveData, g: number, p: number): { ok: boolean; reason: string } {
  const t = (source: string, params = {}) => translate(s.settings.language, source, params);
  if (!isPlanetUnlocked(s, g, p)) return { ok: false, reason: t("Planet locked") };
  const st = planetState(s, g, p);
  if (st.maps < 10) return { ok: false, reason: t("Clear all 10 sectors ({current}/10)", { current: st.maps }) };
  const need = planetMaxLevel(g, p);
  if (aircraftLevel(s) < need) return { ok: false, reason: t("Aircraft level {required} required (current: {current})", { required: need, current: aircraftLevel(s) }) };
  return { ok: true, reason: "" };
}

/** Highest pilot level allowed by current campaign progress. */
export function levelCap(s: SaveData): number {
  let furthest = 0;
  for (let g = 0; g < s.galaxyProgress; g++) {
    const gal = GALAXIES[g];
    if (!gal) continue;
    for (let p = 0; p < gal.planets.length; p++) {
      if (!isPlanetUnlocked(s, g, p)) break;
      furthest = Math.max(furthest, planetOrder(g, p));
    }
  }
  return (furthest + 1) * 100;
}

export function galaxyComplete(s: SaveData, g: number): boolean {
  const gal = GALAXIES[g];
  if (!gal) return false;
  return gal.planets.every((_, pi) => planetState(s, g, pi).secret);
}

export function totalMapsCleared(s: SaveData): number {
  return Object.values(s.planetProgress).reduce((a, b) => a + (b.maps || 0), 0);
}

export function achievementProgress(a: Achievement, s: SaveData): number {
  switch (a.id) {
    case "first_blood":
    case "air_master":
    case "annihilator": return s.stats.kills;
    case "boss_slayer":
    case "boss_hunter":
    case "warlord":
    case "exterminator": return s.stats.bosses;
    case "combo_master":
    case "combo_god": return s.stats.bestCombo;
    case "collector": return s.planes.length;
    case "millionaire": return s.stats.totalCoins;
    case "wingman": return s.wingmen.filter((w) => w.id !== "none").length;
    case "cartographer": return totalMapsCleared(s);
    case "secret": return s.stats.secretBosses;
    case "endless": return s.endless.bestWave;
    case "legend": return Object.values(s.planetProgress).filter((p) => p.secret).length;
    default: return 0;
  }
}
