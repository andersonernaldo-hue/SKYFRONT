import type { FirePattern } from "./enemies";

export interface BossPartDef {
  id: string;
  label: string;
  hp: number;
  x: number;
  y: number;
  r: number;
  kind: "engine" | "turret" | "wing" | "core" | "laser";
}

export type BossSignature =
  | "artillery" | "laserweaver" | "swarmlord" | "assassin" | "dreadnought"
  | "stormcaller" | "annihilator" | "warden" | "reaper" | "sovereign";

export interface BossDef {
  id: string;
  name: string;
  title: string;
  hp: number;
  color: string;
  accent: string;
  glow: string;
  scale: number;
  /** 0-9 hull archetype driving god-tier procedural art */
  variant?: number;
  /** signature combat behavior */
  signature?: BossSignature;
  /** short ability description shown in UI */
  abilityText?: string;
  /** sector info when this is a sector boss */
  sector?: { galaxy: number; planet: number; map: number };
  parts: BossPartDef[];
  phases: { attacks: FirePattern[]; rate: number }[];
  reward: { coins: number; crystals: number; xp: number };
}

export const BOSSES: BossDef[] = [
  {
    id: "vulture",
    name: "IRON VULTURE",
    title: "SKY FRONT COMMANDER",
    hp: 4200,
    color: "#9fb0c2",
    accent: "#ff7a2f",
    glow: "#ffb020",
    scale: 1,
    parts: [
      { id: "el", label: "ENGINE L", hp: 500, x: -110, y: -40, r: 30, kind: "engine" },
      { id: "er", label: "ENGINE R", hp: 500, x: 110, y: -40, r: 30, kind: "engine" },
      { id: "tl", label: "TURRET L", hp: 380, x: -62, y: 30, r: 24, kind: "turret" },
      { id: "tr", label: "TURRET R", hp: 380, x: 62, y: 30, r: 24, kind: "turret" },
      { id: "core", label: "CORE", hp: 1200, x: 0, y: -10, r: 34, kind: "core" },
    ],
    phases: [
      { attacks: ["cone", "aimed"], rate: 1.6 },
      { attacks: ["burst", "wave", "aimed"], rate: 1.15 },
      { attacks: ["circle", "spiral", "rain"], rate: 0.85 },
      { attacks: ["spiral", "ring", "cross", "tracking"], rate: 0.55 },
    ],
    reward: { coins: 900, crystals: 3, xp: 420 },
  },
  {
    id: "leviathan",
    name: "LEVIATHAN",
    title: "OCEAN WAR DREADNOUGHT",
    hp: 6200,
    color: "#7fa8c9",
    accent: "#2ee6ff",
    glow: "#2ee6ff",
    scale: 1.08,
    parts: [
      { id: "wl", label: "WING L", hp: 700, x: -140, y: -0, r: 34, kind: "wing" },
      { id: "wr", label: "WING R", hp: 700, x: 140, y: -0, r: 34, kind: "wing" },
      { id: "lz", label: "LASER", hp: 800, x: 0, y: 56, r: 26, kind: "laser" },
      { id: "core", label: "CORE", hp: 1600, x: 0, y: -22, r: 38, kind: "core" },
    ],
    phases: [
      { attacks: ["wave", "aimed"], rate: 1.4 },
      { attacks: ["laser", "cone", "burst"], rate: 1.05 },
      { attacks: ["ring", "rain", "spiral"], rate: 0.8 },
      { attacks: ["spiral", "circle", "laser", "tracking"], rate: 0.5 },
    ],
    reward: { coins: 1400, crystals: 4, xp: 620 },
  },
  {
    id: "scorpion",
    name: "SAND SCORPION",
    title: "DESERT STORM SIEGE UNIT",
    hp: 8600,
    color: "#d0b98a",
    accent: "#ffb020",
    glow: "#ff8a2b",
    scale: 1.12,
    parts: [
      { id: "cl", label: "CLAW L", hp: 900, x: -150, y: 20, r: 36, kind: "turret" },
      { id: "cr", label: "CLAW R", hp: 900, x: 150, y: 20, r: 36, kind: "turret" },
      { id: "el", label: "ENGINE L", hp: 620, x: -70, y: -66, r: 26, kind: "engine" },
      { id: "er", label: "ENGINE R", hp: 620, x: 70, y: -66, r: 26, kind: "engine" },
      { id: "core", label: "CORE", hp: 2100, x: 0, y: -6, r: 40, kind: "core" },
    ],
    phases: [
      { attacks: ["cone", "burst"], rate: 1.3 },
      { attacks: ["cross", "rain", "aimed"], rate: 1 },
      { attacks: ["spiral", "ring", "wave"], rate: 0.72 },
      { attacks: ["circle", "spiral", "cross", "missile"], rate: 0.46 },
    ],
    reward: { coins: 1900, crystals: 5, xp: 820 },
  },
  {
    id: "overdrive",
    name: "NEON OVERDRIVE",
    title: "NEON CITY AI CORE",
    hp: 11000,
    color: "#8f7fd6",
    accent: "#ff2df0",
    glow: "#b567ff",
    scale: 1.1,
    parts: [
      { id: "t1", label: "TURRET A", hp: 800, x: -110, y: 44, r: 26, kind: "turret" },
      { id: "t2", label: "TURRET B", hp: 800, x: 110, y: 44, r: 26, kind: "turret" },
      { id: "lz", label: "PRISM", hp: 1200, x: 0, y: 70, r: 28, kind: "laser" },
      { id: "el", label: "DRIVE L", hp: 800, x: -120, y: -62, r: 28, kind: "engine" },
      { id: "er", label: "DRIVE R", hp: 800, x: 120, y: -62, r: 28, kind: "engine" },
      { id: "core", label: "CORE", hp: 2800, x: 0, y: -10, r: 42, kind: "core" },
    ],
    phases: [
      { attacks: ["wave", "tracking"], rate: 1.2 },
      { attacks: ["spiral", "cross", "laser"], rate: 0.9 },
      { attacks: ["ring", "circle", "rain"], rate: 0.66 },
      { attacks: ["spiral", "ring", "cross", "circle"], rate: 0.42 },
    ],
    reward: { coins: 2600, crystals: 7, xp: 1100 },
  },
  {
    id: "glacier",
    name: "GLACIER FORTRESS",
    title: "FROZEN BASE GUARDIAN",
    hp: 14500,
    color: "#bfe4f5",
    accent: "#63e8ff",
    glow: "#8be9ff",
    scale: 1.16,
    parts: [
      { id: "wl", label: "PYLON L", hp: 1200, x: -160, y: -10, r: 36, kind: "wing" },
      { id: "wr", label: "PYLON R", hp: 1200, x: 160, y: -10, r: 36, kind: "wing" },
      { id: "t1", label: "TURRET A", hp: 900, x: -70, y: 50, r: 26, kind: "turret" },
      { id: "t2", label: "TURRET B", hp: 900, x: 70, y: 50, r: 26, kind: "turret" },
      { id: "core", label: "CORE", hp: 3600, x: 0, y: -20, r: 44, kind: "core" },
    ],
    phases: [
      { attacks: ["cone", "rain"], rate: 1.1 },
      { attacks: ["ring", "wave", "burst"], rate: 0.85 },
      { attacks: ["spiral", "cross", "circle"], rate: 0.6 },
      { attacks: ["spiral", "ring", "laser", "tracking", "circle"], rate: 0.38 },
    ],
    reward: { coins: 3400, crystals: 9, xp: 1500 },
  },
  {
    id: "omega",
    name: "OMEGA ORBITAL",
    title: "FINAL ORBIT ANNIHILATOR",
    hp: 20000,
    color: "#d9dcff",
    accent: "#ff2d6f",
    glow: "#ff2d6f",
    scale: 1.25,
    parts: [
      { id: "wl", label: "ARRAY L", hp: 1600, x: -170, y: 10, r: 38, kind: "wing" },
      { id: "wr", label: "ARRAY R", hp: 1600, x: 170, y: 10, r: 38, kind: "wing" },
      { id: "lz", label: "OMEGA BEAM", hp: 1800, x: 0, y: 80, r: 30, kind: "laser" },
      { id: "el", label: "THRUSTER L", hp: 1100, x: -100, y: -78, r: 30, kind: "engine" },
      { id: "er", label: "THRUSTER R", hp: 1100, x: 100, y: -78, r: 30, kind: "engine" },
      { id: "core", label: "SINGULARITY", hp: 5200, x: 0, y: -8, r: 46, kind: "core" },
    ],
    phases: [
      { attacks: ["spiral", "aimed"], rate: 1 },
      { attacks: ["ring", "cross", "laser"], rate: 0.75 },
      { attacks: ["spiral", "circle", "rain", "tracking"], rate: 0.52 },
      { attacks: ["spiral", "ring", "cross", "circle", "laser"], rate: 0.32 },
    ],
    reward: { coins: 6000, crystals: 15, xp: 2600 },
  },
];

export interface WorldDef {
  id: number;
  name: string;
  emoji: string;
  theme: "sky" | "ocean" | "desert" | "city" | "ice" | "space";
  sky: [string, string, string];
  fog: string;
  boss: string;
  waves: number;
  roster: string[];
  desc: string;
}

export const WORLDS: WorldDef[] = [
  {
    id: 1, name: "SKY FRONT", emoji: "☁️", theme: "sky",
    sky: ["#123b63", "#2f7fb5", "#8fd0e8"], fog: "rgba(180,220,245,0.20)",
    boss: "vulture", waves: 8, roster: ["scout", "fighter", "drone", "kamikaze", "heavy"],
    desc: "Clouds, mountains and endless enemy squadrons.",
  },
  {
    id: 2, name: "OCEAN WAR", emoji: "🌊", theme: "ocean",
    sky: ["#04223a", "#0a5074", "#1ba0b8"], fog: "rgba(80,200,230,0.16)",
    boss: "leviathan", waves: 9, roster: ["fighter", "drone", "bomber", "sniper", "shielder", "kamikaze"],
    desc: "Carrier fleets and torpedo bombers over black water.",
  },
  {
    id: 3, name: "DESERT STORM", emoji: "🏜️", theme: "desert",
    sky: ["#4a2410", "#b3651f", "#f0b567"], fog: "rgba(255,190,120,0.20)",
    boss: "scorpion", waves: 10, roster: ["fighter", "heavy", "sniper", "missiler", "kamikaze", "elite"],
    desc: "Military bases buried in a howling sandstorm.",
  },
  {
    id: 4, name: "NEON CITY", emoji: "🏙️", theme: "city",
    sky: ["#12002e", "#3d0a6b", "#8b1fb0"], fog: "rgba(190,90,255,0.18)",
    boss: "overdrive", waves: 11, roster: ["drone", "laser", "shielder", "elite", "sniper", "missiler"],
    desc: "Skyscrapers, holograms and autonomous drone swarms.",
  },
  {
    id: 5, name: "FROZEN BASE", emoji: "❄️", theme: "ice",
    sky: ["#031e33", "#0d5a77", "#8fdfe8"], fog: "rgba(180,240,255,0.20)",
    boss: "glacier", waves: 12, roster: ["heavy", "laser", "missiler", "elite", "shielder", "bomber", "miniboss"],
    desc: "The enemy's arctic stronghold. Zero visibility, zero mercy.",
  },
  {
    id: 6, name: "FINAL ORBIT", emoji: "🌌", theme: "space",
    sky: ["#05000f", "#150a35", "#3a1c6b"], fog: "rgba(160,120,255,0.14)",
    boss: "omega", waves: 13, roster: ["elite", "laser", "missiler", "sniper", "kamikaze", "miniboss", "shielder"],
    desc: "Above the atmosphere. The last battle for the planet.",
  },
];

export const getBoss = (id: string) => BOSSES.find((b) => b.id === id) || BOSSES[0];
