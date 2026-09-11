/* ============================================================
   NANOTECH PASSIVE TREE · PILOTS · SKINS
   ============================================================ */

export type TalentBranch = "CORE" | "OFFENSE" | "DEFENSE" | "UTILITY";

export interface TalentNode {
  id: string;
  branch: TalentBranch;
  name: string;
  desc: string;
  icon: string;
  max: number;
  cost: number;       // crystals per level (base)
  coinCost: number;   // coins per level (base)
  requires?: string;  // node id required at max/1+
  tier: number;       // row in the tree
}

export const TALENTS: TalentNode[] = [
  // CORE
  { id: "core_matrix", branch: "CORE", tier: 0, name: "NANO MATRIX", desc: "+3% all base stats", icon: "🔷", max: 10, cost: 1, coinCost: 900 },
  { id: "core_reactor", branch: "CORE", tier: 1, name: "FUSION REACTOR", desc: "+4% damage & +3% fire rate", icon: "⚛️", max: 10, cost: 2, coinCost: 1600, requires: "core_matrix" },
  { id: "core_ascend", branch: "CORE", tier: 2, name: "ASCENSION", desc: "+6% ALL combat stats", icon: "🌟", max: 5, cost: 5, coinCost: 5200, requires: "core_reactor" },

  // OFFENSE
  { id: "off_overcharge", branch: "OFFENSE", tier: 0, name: "OVERCHARGE", desc: "+5% projectile damage", icon: "🔥", max: 12, cost: 1, coinCost: 800 },
  { id: "off_crit", branch: "OFFENSE", tier: 1, name: "PRECISION AI", desc: "+1.2% crit chance", icon: "🎯", max: 12, cost: 1, coinCost: 1100, requires: "off_overcharge" },
  { id: "off_critdmg", branch: "OFFENSE", tier: 1, name: "LETHALITY", desc: "+8% critical damage", icon: "💀", max: 10, cost: 2, coinCost: 1400, requires: "off_overcharge" },
  { id: "off_pierce", branch: "OFFENSE", tier: 2, name: "PHASE ROUNDS", desc: "+1 pierce every 3 levels", icon: "🌀", max: 6, cost: 3, coinCost: 3000, requires: "off_crit" },
  { id: "off_ultcd", branch: "OFFENSE", tier: 2, name: "ULTIMATE CAPACITOR", desc: "-4% ultimate cooldown", icon: "💥", max: 10, cost: 3, coinCost: 2600, requires: "off_critdmg" },

  // DEFENSE
  { id: "def_plating", branch: "DEFENSE", tier: 0, name: "ABLATIVE PLATING", desc: "+5% max hull", icon: "🛡️", max: 12, cost: 1, coinCost: 800 },
  { id: "def_regen", branch: "DEFENSE", tier: 1, name: "HULL REGENERATION", desc: "+0.45 hull/sec passive", icon: "♻️", max: 10, cost: 2, coinCost: 1500, requires: "def_plating" },
  { id: "def_iframe", branch: "DEFENSE", tier: 1, name: "PHASE SHIELDING", desc: "+6% invulnerability window", icon: "✨", max: 8, cost: 2, coinCost: 1300, requires: "def_plating" },
  { id: "def_shield", branch: "DEFENSE", tier: 2, name: "AEGIS PROTOCOL", desc: "+1 starting shield / 3 levels", icon: "🔰", max: 9, cost: 4, coinCost: 3400, requires: "def_regen" },
  { id: "def_thorn", branch: "DEFENSE", tier: 2, name: "RETALIATION FIELD", desc: "Shockwave when hit (+damage)", icon: "⚡", max: 6, cost: 3, coinCost: 2800, requires: "def_iframe" },

  // UTILITY
  { id: "uti_magnet", branch: "UTILITY", tier: 0, name: "MAGNETIC HARVEST", desc: "+14% loot magnet radius", icon: "🧲", max: 10, cost: 1, coinCost: 700 },
  { id: "uti_greed", branch: "UTILITY", tier: 1, name: "WAR PROFITEER", desc: "+6% coins earned", icon: "💰", max: 12, cost: 1, coinCost: 1000, requires: "uti_magnet" },
  { id: "uti_xp", branch: "UTILITY", tier: 1, name: "COMBAT ANALYTICS", desc: "+6% XP earned", icon: "📈", max: 12, cost: 1, coinCost: 1000, requires: "uti_magnet" },
  { id: "uti_skillcd", branch: "UTILITY", tier: 2, name: "REFLEX BOOSTER", desc: "-4% skill cooldown", icon: "⏱️", max: 10, cost: 3, coinCost: 2400, requires: "uti_greed" },
  { id: "uti_combo", branch: "UTILITY", tier: 2, name: "MOMENTUM CORE", desc: "+0.4s combo window", icon: "🔗", max: 8, cost: 3, coinCost: 2200, requires: "uti_xp" },
];

export const talentCost = (n: TalentNode, level: number) => ({
  crystals: Math.max(1, Math.round(n.cost * Math.pow(1.16, level))),
  coins: Math.round(n.coinCost * Math.pow(1.3, level)),
});

export interface TalentBonuses {
  damage: number; fireRate: number; hp: number; crit: number; critDmg: number;
  pierce: number; ultCd: number; skillCd: number; regen: number; iframe: number;
  shields: number; magnet: number; coins: number; xp: number; combo: number; thorns: number;
}

export function computeTalents(levels: Record<string, number>): TalentBonuses {
  const L = (id: string) => levels[id] || 0;
  const core = L("core_matrix") * 0.03;
  const reactor = L("core_reactor");
  const asc = L("core_ascend") * 0.06;
  return {
    damage: 1 + core + asc + L("off_overcharge") * 0.05 + reactor * 0.04,
    fireRate: 1 + core + asc + reactor * 0.03,
    hp: 1 + core + asc + L("def_plating") * 0.05,
    crit: L("off_crit") * 0.012 + asc * 0.1,
    critDmg: 1 + L("off_critdmg") * 0.08,
    pierce: Math.floor(L("off_pierce") / 3),
    ultCd: Math.max(0.35, 1 - L("off_ultcd") * 0.04),
    skillCd: Math.max(0.35, 1 - L("uti_skillcd") * 0.04),
    regen: L("def_regen") * 0.45,
    iframe: 1 + L("def_iframe") * 0.06,
    shields: Math.floor(L("def_shield") / 3),
    magnet: 1 + L("uti_magnet") * 0.14,
    coins: 1 + L("uti_greed") * 0.06,
    xp: 1 + L("uti_xp") * 0.06,
    combo: L("uti_combo") * 0.4,
    thorns: L("def_thorn"),
  };
}

/* ---------------------------- PILOTS ---------------------------- */

export interface PilotDef {
  id: string;
  name: string;
  callsign: string;
  portrait: string;
  color: string;
  perk: string;
  desc: string;
  price: { coins: number; crystals: number };
  bonus: Partial<{
    damage: number; fireRate: number; hp: number; crit: number; critDmg: number;
    speed: number; ultCd: number; skillCd: number; shields: number; coins: number; xp: number; regen: number;
  }>;
}

export const PILOTS: PilotDef[] = [
  { id: "rookie", name: "ALEX KANE", callsign: "ROOKIE", portrait: "🧑‍✈️", color: "#9fb3c8", perk: "BALANCED", desc: "Steady hands, no bad habits.", price: { coins: 0, crystals: 0 }, bonus: { damage: 0.03, hp: 0.03 } },
  { id: "viper", name: "M. VOSS", callsign: "VIPER", portrait: "👩‍✈️", color: "#ff2d6f", perk: "AGGRESSOR", desc: "+18% damage, -8% hull. Live fast.", price: { coins: 9000, crystals: 0 }, bonus: { damage: 0.18, hp: -0.08, critDmg: 0.15 } },
  { id: "bulwark", name: "H. STROM", callsign: "BULWARK", portrait: "🧔‍♂️", color: "#3fa9ff", perk: "GUARDIAN", desc: "+22% hull and starts with a shield.", price: { coins: 12000, crystals: 0 }, bonus: { hp: 0.22, shields: 1, regen: 0.3 } },
  { id: "ghost", name: "R. NAKAMURA", callsign: "GHOST", portrait: "🕵️", color: "#b567ff", perk: "ASSASSIN", desc: "+10% crit chance and +25% crit damage.", price: { coins: 0, crystals: 18 }, bonus: { crit: 0.1, critDmg: 0.25, hp: -0.05 } },
  { id: "tempo", name: "L. ORTEGA", callsign: "TEMPO", portrait: "👨‍🚀", color: "#ffd23d", perk: "OVERCLOCK", desc: "+16% fire rate, -20% ability cooldowns.", price: { coins: 0, crystals: 22 }, bonus: { fireRate: 0.16, ultCd: -0.2, skillCd: -0.2 } },
  { id: "baron", name: "V. KOVAC", callsign: "BARON", portrait: "🎖️", color: "#ffb020", perk: "PROFITEER", desc: "+35% coins and +25% XP earned.", price: { coins: 0, crystals: 26 }, bonus: { coins: 0.35, xp: 0.25 } },
];

export const getPilot = (id: string) => PILOTS.find((p) => p.id === id) || PILOTS[0];

/* ---------------------------- SKINS ---------------------------- */

export interface SkinDef {
  id: string;
  name: string;
  price: { coins: number; crystals: number };
  palette: { body: string; bodyDark: string; accent: string; glass: string; engine: string; trail: string };
}

export const SKINS: SkinDef[] = [
  { id: "default", name: "FACTORY", price: { coins: 0, crystals: 0 }, palette: null as any },
  {
    id: "arctic", name: "ARCTIC CAMO", price: { coins: 5000, crystals: 0 },
    palette: { body: "#e9f4ff", bodyDark: "#5b7183", accent: "#7fe8ff", glass: "#bff2ff", engine: "#aef0ff", trail: "#63d6ff" },
  },
  {
    id: "desert", name: "DESERT CAMO", price: { coins: 5000, crystals: 0 },
    palette: { body: "#e2c893", bodyDark: "#6b5433", accent: "#ffb020", glass: "#ffd479", engine: "#ffb45e", trail: "#ff8a2b" },
  },
  {
    id: "midnight", name: "MIDNIGHT OPS", price: { coins: 9500, crystals: 0 },
    palette: { body: "#3c4460", bodyDark: "#0e1120", accent: "#7c5cff", glass: "#a98cff", engine: "#8f6bff", trail: "#5c3cff" },
  },
  {
    id: "crimson", name: "CRIMSON ACE", price: { coins: 0, crystals: 12 },
    palette: { body: "#ffb3b3", bodyDark: "#6b1020", accent: "#ff2d3d", glass: "#ff8f9f", engine: "#ff5a5a", trail: "#ff2d3d" },
  },
  {
    id: "gold", name: "GOLDEN LEGEND", price: { coins: 0, crystals: 25 },
    palette: { body: "#ffe9a8", bodyDark: "#6b4f10", accent: "#ffd23d", glass: "#fff3c4", engine: "#ffdf7a", trail: "#ffb020" },
  },
  {
    id: "void", name: "VOID PRISM", price: { coins: 0, crystals: 40 },
    palette: { body: "#c9f7ff", bodyDark: "#101b3a", accent: "#00ffc8", glass: "#8affe8", engine: "#4dffe0", trail: "#00ffc8" },
  },
];

export const getSkin = (id: string) => SKINS.find((s) => s.id === id) || SKINS[0];

/* ---------------------- PER-PLANE PROGRESSION ---------------------- */

export interface PlaneNode {
  id: string;
  name: string;
  desc: string;
  icon: string;
  max: number;
  cost: number;
  step: number;
  stat: "damage" | "hp" | "speed" | "fireRate" | "crit" | "ability";
}

export const PLANE_NODES: PlaneNode[] = [
  { id: "p_dmg", name: "WEAPON CORE", desc: "+4% damage", icon: "🔥", max: 20, cost: 600, step: 0.04, stat: "damage" },
  { id: "p_hp", name: "HULL FRAME", desc: "+5% hull", icon: "🛡️", max: 20, cost: 600, step: 0.05, stat: "hp" },
  { id: "p_spd", name: "THRUST VECTOR", desc: "+3% speed", icon: "🛫", max: 15, cost: 520, step: 0.03, stat: "speed" },
  { id: "p_rate", name: "FEED SYSTEM", desc: "+3.5% fire rate", icon: "⚡", max: 20, cost: 680, step: 0.035, stat: "fireRate" },
  { id: "p_crit", name: "TARGETING SUITE", desc: "+1% crit chance", icon: "🎯", max: 15, cost: 750, step: 0.01, stat: "crit" },
  { id: "p_abil", name: "ABILITY MATRIX", desc: "-3% ability cooldowns", icon: "💫", max: 12, cost: 900, step: 0.03, stat: "ability" },
];

export const planeNodeCost = (n: PlaneNode, level: number) => Math.round(n.cost * Math.pow(1.34, level));

export interface PlaneBonuses { damage: number; hp: number; speed: number; fireRate: number; crit: number; ability: number }

export function computePlaneNodes(levels: Record<string, number>): PlaneBonuses {
  const L = (id: string) => levels[id] || 0;
  return {
    damage: 1 + L("p_dmg") * 0.04,
    hp: 1 + L("p_hp") * 0.05,
    speed: 1 + L("p_spd") * 0.03,
    fireRate: 1 + L("p_rate") * 0.035,
    crit: L("p_crit") * 0.01,
    ability: Math.max(0.5, 1 - L("p_abil") * 0.03),
  };
}

export { planeXpForLevel } from "../progression";

/* ---------------------- DAILY CHALLENGES ---------------------- */

export type DailyRule = "nodamage" | "combo" | "time" | "kills" | "noability";

export interface DailyChallenge {
  id: string;
  rule: DailyRule;
  name: string;
  desc: string;
  icon: string;
  target: number;
  starTargets: [number, number, number];
  reward: { coins: number; crystals: number; xp: number };
  planet: number;
  map: number;
  galaxy: number;
}

const DAILY_POOL: { rule: DailyRule; name: string; icon: string; desc: (t: number) => string; targets: [number, number, number] }[] = [
  { rule: "nodamage", name: "UNTOUCHABLE", icon: "👻", desc: (t) => `Finish taking ${t} hits or fewer`, targets: [6, 3, 0] },
  { rule: "combo", name: "CHAIN REACTION", icon: "🔗", desc: (t) => `Reach a x${t} combo`, targets: [15, 30, 50] },
  { rule: "time", name: "BLITZ RUN", icon: "⏱️", desc: (t) => `Clear the sector in ${t}s`, targets: [180, 130, 95] },
  { rule: "kills", name: "PURGE ORDER", icon: "☠️", desc: (t) => `Destroy ${t} hostiles`, targets: [40, 70, 110] },
  { rule: "noability", name: "PURE PILOT", icon: "✋", desc: (t) => `Win using ${t} abilities or fewer`, targets: [6, 3, 0] },
];

/** Deterministic daily challenge from the calendar date. */
export function makeDaily(dateKey: string): DailyChallenge {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) { h ^= dateKey.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rnd = (n: number) => { h = Math.imul(h ^ (h >>> 15), 2246822507); return Math.abs(h) % n; };
  const p = DAILY_POOL[rnd(DAILY_POOL.length)];
  const galaxy = rnd(2);
  const planet = rnd(galaxy === 0 ? 3 : 4);
  const map = 2 + rnd(8);
  return {
    id: dateKey,
    rule: p.rule,
    name: p.name,
    icon: p.icon,
    desc: p.desc(p.targets[1]),
    target: p.targets[2],
    starTargets: p.targets,
    reward: { coins: 3500, crystals: 3, xp: 900 },
    galaxy, planet, map,
  };
}

export const todayKey = () => new Date().toISOString().slice(0, 10);
