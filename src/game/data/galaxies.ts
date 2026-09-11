import { BOSSES, type BossDef, type BossPartDef, type BossSignature } from "./worlds";
import type { FirePattern } from "./enemies";
import { sectorBaseReward } from "../progression";

/* ============================================================
   EXTRA BOSSES (galaxy 2 planet boss + 7 SECRET BOSSES)
   ============================================================ */

const PYRO: BossDef = {
  id: "pyrolord",
  name: "PYRO SOVEREIGN",
  title: "INFERNO CORE WARLORD",
  hp: 16800,
  color: "#e8a06b",
  accent: "#ff3b00",
  glow: "#ffb020",
  scale: 1.2,
  variant: 9,
  signature: "sovereign",
  abilityText: "MAGMA ERUPTION — rotating flare rings + sweeping annihilation beam",
  parts: [
    { id: "wl", label: "MAGMA VENT L", hp: 1400, x: -158, y: -6, r: 36, kind: "wing" },
    { id: "wr", label: "MAGMA VENT R", hp: 1400, x: 158, y: -6, r: 36, kind: "wing" },
    { id: "lz", label: "FLARE CANNON", hp: 1500, x: 0, y: 76, r: 30, kind: "laser" },
    { id: "el", label: "THRUSTER L", hp: 1000, x: -92, y: -74, r: 28, kind: "engine" },
    { id: "er", label: "THRUSTER R", hp: 1000, x: 92, y: -74, r: 28, kind: "engine" },
    { id: "core", label: "MAGMA CORE", hp: 4200, x: 0, y: -8, r: 44, kind: "core" },
  ],
  phases: [
    { attacks: ["cone", "rain"], rate: 1.1 },
    { attacks: ["spiral", "burst", "laser"], rate: 0.82 },
    { attacks: ["ring", "cross", "rain", "circle"], rate: 0.58 },
    { attacks: ["spiral", "ring", "circle", "laser", "tracking"], rate: 0.36 },
  ],
  reward: { coins: 4200, crystals: 11, xp: 1800 },
};

/** Secret bosses: brutally harder mirrors of each planet's guardian. */
function secret(
  id: string, name: string, title: string, hp: number,
  color: string, accent: string, glow: string,
  reward: { coins: number; crystals: number; xp: number }
): BossDef {
  return {
    id, name, title, hp, color, accent, glow, scale: 1.34,
    variant: 10,
    signature: "sovereign",
    abilityText: "OMEGA PROTOCOL — all bullet-hell patterns at maximum density",
    parts: [
      { id: "wl", label: "OMEGA ARRAY L", hp: hp * 0.1, x: -178, y: -8, r: 40, kind: "wing" },
      { id: "wr", label: "OMEGA ARRAY R", hp: hp * 0.1, x: 178, y: -8, r: 40, kind: "wing" },
      { id: "lz", label: "ANNIHILATOR", hp: hp * 0.12, x: 0, y: 84, r: 32, kind: "laser" },
      { id: "t1", label: "TURRET A", hp: hp * 0.07, x: -104, y: 44, r: 26, kind: "turret" },
      { id: "t2", label: "TURRET B", hp: hp * 0.07, x: 104, y: 44, r: 26, kind: "turret" },
      { id: "el", label: "DRIVE L", hp: hp * 0.08, x: -108, y: -80, r: 30, kind: "engine" },
      { id: "er", label: "DRIVE R", hp: hp * 0.08, x: 108, y: -80, r: 30, kind: "engine" },
      { id: "core", label: "SINGULARITY", hp: hp * 0.26, x: 0, y: -4, r: 48, kind: "core" },
    ],
    phases: [
      { attacks: ["spiral", "cone", "tracking"], rate: 0.85 },
      { attacks: ["ring", "cross", "laser", "burst"], rate: 0.62 },
      { attacks: ["spiral", "circle", "rain", "tracking", "missile"], rate: 0.44 },
      { attacks: ["spiral", "ring", "cross", "circle", "laser", "rain"], rate: 0.26 },
    ],
    reward,
  };
}

export const SECRET_BOSSES: BossDef[] = [
  secret("sb_sky", "NEMESIS PRIME", "THE SKY THAT NEVER SLEEPS", 42000, "#c8d8ea", "#ff2d6f", "#ff6fa0", { coins: 12000, crystals: 30, xp: 9000 }),
  secret("sb_ocean", "ABYSSAL TYRANT", "WHAT SLEEPS BENEATH", 56000, "#84c6e6", "#00e5ff", "#63e8ff", { coins: 15000, crystals: 34, xp: 12000 }),
  secret("sb_desert", "SOLAR REAPER", "THE STORM GIVEN FORM", 72000, "#f0c98a", "#ff8a2b", "#ffd23d", { coins: 18500, crystals: 38, xp: 16000 }),
  secret("sb_city", "GHOST PROTOCOL", "THE AI THAT DREAMED", 92000, "#c1a8ff", "#ff2df0", "#b567ff", { coins: 23000, crystals: 44, xp: 22000 }),
  secret("sb_ice", "ETERNAL WINTER", "ZERO KELVIN SOVEREIGN", 118000, "#d9f4ff", "#63e8ff", "#a8ecff", { coins: 28000, crystals: 50, xp: 30000 }),
  secret("sb_fire", "HELLFORGE", "THE FIRST FLAME", 148000, "#ffb680", "#ff3b00", "#ffb020", { coins: 34000, crystals: 58, xp: 40000 }),
  secret("sb_orbit", "OMEGA ZERO", "END OF ALL FLIGHT", 195000, "#ffffff", "#ff2d6f", "#ffffff", { coins: 46000, crystals: 75, xp: 55000 }),
];

// assign god-tier variants + signatures to the 6 classic planet guardians
const GUARDIAN_META: Record<string, { variant: number; signature: BossSignature; abilityText: string }> = {
  vulture: { variant: 9, signature: "sovereign", abilityText: "TALON SWEEP — pincer cone barrages + spiral enrage" },
  leviathan: { variant: 9, signature: "stormcaller", abilityText: "TIDAL VORTEX — wave curtains + prism beam" },
  scorpion: { variant: 9, signature: "annihilator", abilityText: "STING BARRAGE — cross bursts + missile monsoon" },
  overdrive: { variant: 9, signature: "laserweaver", abilityText: "NEON LATTICE — laser grid + tracking shards" },
  glacier: { variant: 9, signature: "warden", abilityText: "GLACIAL AEGIS — ice rings + shatter novas" },
  omega: { variant: 9, signature: "sovereign", abilityText: "ORBITAL JUDGEMENT — every pattern, perfected" },
};
for (const b of BOSSES) {
  const m = GUARDIAN_META[b.id];
  if (m) { b.variant = m.variant; b.signature = m.signature; b.abilityText = m.abilityText; }
}

export const ALL_BOSSES: BossDef[] = [...BOSSES, PYRO, ...SECRET_BOSSES];

/* ============================================================
   SECTOR WARLORDS — every sector (0-8) has a unique boss.
   Sector 9 is always the planet guardian (BOSSES / PYRO).
   Total: 63 warlords + 7 guardians + 7 secrets = 77 bosses.
   ============================================================ */

export interface SectorArchetype {
  variant: number;
  signature: BossSignature;
  role: string;
  abilityText: string;
  scale: number;
  parts: (hp: number) => BossPartDef[];
  phases: (tier: number, sector: number) => { attacks: FirePattern[]; rate: number }[];
}

const mkPart = (id: string, label: string, frac: number, x: number, y: number, r: number, kind: BossPartDef["kind"], hp: number): BossPartDef =>
  ({ id, label, hp: Math.round(hp * frac), x, y, r, kind });

export const SECTOR_ARCHETYPES: SectorArchetype[] = [
  {
    variant: 0, signature: "swarmlord", role: "SCOUT CARRIER", scale: 0.74,
    abilityText: "HIVE LAUNCH — deploys escort fighters while firing scatter cones",
    parts: (hp) => [
      mkPart("el", "DRIVE L", 0.09, -88, -34, 24, "engine", hp),
      mkPart("er", "DRIVE R", 0.09, 88, -34, 24, "engine", hp),
      mkPart("hz", "HIVE BAY", 0.14, 0, 34, 26, "laser", hp),
      mkPart("core", "HIVE CORE", 0.3, 0, -8, 32, "core", hp),
    ],
    phases: () => [
      { attacks: ["aimed", "cone"], rate: 1.5 },
      { attacks: ["wave", "burst", "aimed"], rate: 1.15 },
      { attacks: ["ring", "circle", "missile"], rate: 0.9 },
      { attacks: ["ring", "spiral", "missile", "tracking"], rate: 0.62 },
    ],
  },
  {
    variant: 1, signature: "artillery", role: "GUNBATTERY", scale: 0.78,
    abilityText: "SIEGE CANNONADE — staggered burst artillery + shrapnel blooms",
    parts: (hp) => [
      mkPart("t1", "CANNON A", 0.1, -70, 26, 24, "turret", hp),
      mkPart("t2", "CANNON B", 0.1, 70, 26, 24, "turret", hp),
      mkPart("t3", "CANNON C", 0.1, 0, 52, 22, "turret", hp),
      mkPart("el", "DRIVE", 0.08, 0, -62, 24, "engine", hp),
      mkPart("core", "MAGAZINE", 0.28, 0, -10, 32, "core", hp),
    ],
    phases: () => [
      { attacks: ["cone", "burst"], rate: 1.45 },
      { attacks: ["burst", "wave", "cone"], rate: 1.1 },
      { attacks: ["cross", "rain", "bloom"], rate: 0.85 },
      { attacks: ["cross", "bloom", "tracking", "burst"], rate: 0.58 },
    ],
  },
  {
    variant: 2, signature: "stormcaller", role: "STORM FRIGATE", scale: 0.8,
    abilityText: "TEMPEST ARRAY — rain curtains woven into serpent streams",
    parts: (hp) => [
      mkPart("wl", "SAIL L", 0.1, -120, -6, 28, "wing", hp),
      mkPart("wr", "SAIL R", 0.1, 120, -6, 28, "wing", hp),
      mkPart("lz", "STORM ROD", 0.12, 0, 58, 24, "laser", hp),
      mkPart("core", "TEMPEST CORE", 0.3, 0, -8, 33, "core", hp),
    ],
    phases: () => [
      { attacks: ["rain", "wave"], rate: 1.4 },
      { attacks: ["rain", "spiral", "wave"], rate: 1.05 },
      { attacks: ["serpent", "rain", "circle"], rate: 0.8 },
      { attacks: ["serpent", "curtain", "laser", "rain"], rate: 0.55 },
    ],
  },
  {
    variant: 3, signature: "assassin", role: "NIGHT INTERCEPTOR", scale: 0.8,
    abilityText: "PHANTOM EDGE — blinking reposition + fanblade sniper fans",
    parts: (hp) => [
      mkPart("wl", "BLADE L", 0.09, -104, 8, 24, "wing", hp),
      mkPart("wr", "BLADE R", 0.09, 104, 8, 24, "wing", hp),
      mkPart("lz", "FOCUS LENS", 0.13, 0, 44, 24, "laser", hp),
      mkPart("el", "VEIL DRIVE", 0.08, 0, -58, 24, "engine", hp),
      mkPart("core", "PHANTOM CORE", 0.28, 0, -8, 31, "core", hp),
    ],
    phases: () => [
      { attacks: ["aimed", "tracking"], rate: 1.35 },
      { attacks: ["tracking", "burst", "aimed"], rate: 1.0 },
      { attacks: ["fanblade", "tracking", "wave"], rate: 0.78 },
      { attacks: ["fanblade", "vortex", "laser", "tracking"], rate: 0.52 },
    ],
  },
  {
    variant: 4, signature: "dreadnought", role: "DREADNOUGHT", scale: 0.88,
    abilityText: "IRON TIDE — crushing circle novas + spiral grinders",
    parts: (hp) => [
      mkPart("t1", "TURRET L", 0.09, -96, 22, 26, "turret", hp),
      mkPart("t2", "TURRET R", 0.09, 96, 22, 26, "turret", hp),
      mkPart("el", "DRIVE L", 0.08, -70, -58, 26, "engine", hp),
      mkPart("er", "DRIVE R", 0.08, 70, -58, 26, "engine", hp),
      mkPart("core", "IRON HEART", 0.3, 0, -6, 36, "core", hp),
    ],
    phases: () => [
      { attacks: ["cone", "circle"], rate: 1.35 },
      { attacks: ["circle", "spiral", "cone"], rate: 1.0 },
      { attacks: ["nova", "circle", "ring"], rate: 0.75 },
      { attacks: ["nova", "spiral", "ring", "tracking"], rate: 0.5 },
    ],
  },
  {
    variant: 5, signature: "laserweaver", role: "LASER CITADEL", scale: 0.9,
    abilityText: "PRISM LATTICE — triple sweeping beams + orbiting bloom mines",
    parts: (hp) => [
      mkPart("lz", "PRISM A", 0.11, -64, 40, 25, "laser", hp),
      mkPart("lz2", "PRISM B", 0.11, 64, 40, 25, "laser", hp),
      mkPart("lz3", "PRISM C", 0.11, 0, 66, 24, "laser", hp),
      mkPart("core", "LATTICE CORE", 0.3, 0, -12, 35, "core", hp),
    ],
    phases: () => [
      { attacks: ["aimed", "laser"], rate: 1.3 },
      { attacks: ["laser", "cone", "wave"], rate: 0.98 },
      { attacks: ["laser", "cross", "bloom"], rate: 0.72 },
      { attacks: ["laser", "bloom", "vortex", "cross"], rate: 0.48 },
    ],
  },
  {
    variant: 6, signature: "warden", role: "AEGIS BASTION", scale: 0.94,
    abilityText: "BULWARK PROTOCOL — shielded arrays + missile bloom retaliation",
    parts: (hp) => [
      mkPart("wl", "AEGIS L", 0.1, -132, 0, 30, "wing", hp),
      mkPart("wr", "AEGIS R", 0.1, 132, 0, 30, "wing", hp),
      mkPart("t1", "WARDEN GUN", 0.09, 0, 52, 25, "turret", hp),
      mkPart("el", "DRIVE L", 0.07, -64, -62, 24, "engine", hp),
      mkPart("er", "DRIVE R", 0.07, 64, -62, 24, "engine", hp),
      mkPart("core", "BULWARK CORE", 0.26, 0, -8, 36, "core", hp),
    ],
    phases: () => [
      { attacks: ["ring", "wave"], rate: 1.28 },
      { attacks: ["ring", "missile", "cone"], rate: 0.95 },
      { attacks: ["bloom", "ring", "rain"], rate: 0.7 },
      { attacks: ["bloom", "nova", "missile", "ring"], rate: 0.46 },
    ],
  },
  {
    variant: 7, signature: "reaper", role: "VOID REAPER", scale: 0.98,
    abilityText: "HARVEST SPIRAL — vortex scythes + cross guillotines",
    parts: (hp) => [
      mkPart("wl", "SCYTHE L", 0.1, -140, 6, 30, "wing", hp),
      mkPart("wr", "SCYTHE R", 0.1, 140, 6, 30, "wing", hp),
      mkPart("lz", "REAPER EYE", 0.11, 0, 48, 26, "laser", hp),
      mkPart("el", "DIRGE DRIVE", 0.08, 0, -66, 26, "engine", hp),
      mkPart("core", "HARVEST CORE", 0.28, 0, -8, 37, "core", hp),
    ],
    phases: () => [
      { attacks: ["cross", "rain"], rate: 1.25 },
      { attacks: ["cross", "spiral", "burst"], rate: 0.92 },
      { attacks: ["vortex", "cross", "circle"], rate: 0.68 },
      { attacks: ["vortex", "nova", "circle", "laser"], rate: 0.44 },
    ],
  },
  {
    variant: 8, signature: "annihilator", role: "ANNIHILATOR PRIME", scale: 1.04,
    abilityText: "EXTINCTION ARRAY — every advanced pattern at war tempo",
    parts: (hp) => [
      mkPart("wl", "ARRAY L", 0.09, -150, -4, 32, "wing", hp),
      mkPart("wr", "ARRAY R", 0.09, 150, -4, 32, "wing", hp),
      mkPart("t1", "FANG A", 0.08, -84, 40, 25, "turret", hp),
      mkPart("t2", "FANG B", 0.08, 84, 40, 25, "turret", hp),
      mkPart("lz", "EXTINCTION LENS", 0.1, 0, 66, 26, "laser", hp),
      mkPart("el", "DOOM DRIVE", 0.07, 0, -70, 26, "engine", hp),
      mkPart("core", "EXTINCTION CORE", 0.24, 0, -8, 38, "core", hp),
    ],
    phases: () => [
      { attacks: ["spiral", "cone", "aimed"], rate: 1.2 },
      { attacks: ["spiral", "laser", "burst"], rate: 0.88 },
      { attacks: ["vortex", "spiral", "bloom"], rate: 0.64 },
      { attacks: ["vortex", "nova", "bloom", "curtain"], rate: 0.4 },
    ],
  },
];

/** Planet palettes for warlords — each planet's bosses look native to it. */
const PLANET_WARLORD_STYLE: Record<string, { color: string; accent: string; glow: string }> = {
  earth: { color: "#9fb6cc", accent: "#ff7a2f", glow: "#ffb020" },
  ocean: { color: "#7fa8c9", accent: "#2ee6ff", glow: "#7ff0ff" },
  desert: { color: "#d0b98a", accent: "#ffb020", glow: "#ff8a2b" },
  city: { color: "#8f7fd6", accent: "#ff2df0", glow: "#b567ff" },
  ice: { color: "#bfe4f5", accent: "#63e8ff", glow: "#a8ecff" },
  fire: { color: "#e8a06b", accent: "#ff3b00", glow: "#ffb020" },
  orbit: { color: "#c9cdf5", accent: "#ff2d6f", glow: "#d58bff" },
};

/** 63 unique warlord names — 9 per planet (sectors 0-8). */
const WARLORD_NAMES: Record<string, [string, string][]> = {
  earth: [
    ["STORM CROW", "VANGUARD OF THE BROKEN SKY"], ["CLOUD REAPER", "HARVESTER OF THE JETSTREAM"],
    ["THUNDERHEAD", "THE LIVING STORM"], ["SKY HAMMER", "SIEGE ARTILLERY OF DAWN"],
    ["STRATOS TYRANT", "KING OF HIGH ALTITUDE"], ["JETSTREAM REAPER", "RIDER OF THE WESTERLIES"],
    ["CUMULUS DREAD", "THE WALL OF CLOUD"], ["ALTITUDE KING", "SOVEREIGN OF THIN AIR"],
    ["SKYFALL REGENT", "HEIR OF THE IRON VULTURE"],
  ],
  ocean: [
    ["TIDE HUNTER", "FANG OF THE SHALLOWS"], ["ABYSSAL SCOUT", "EYE OF THE TRENCH"],
    ["CARRIER'S FANG", "ESCORT OF THE BLACK FLEET"], ["KRAKEN EYE", "THE WATCHER BELOW"],
    ["DEPTH CHARGER", "BREAKER OF HULLS"], ["TSUNAMI HERALD", "VOICE OF THE COMING WAVE"],
    ["NAUTILUS PRIME", "ARMORED NAUTILUS"], ["DROWNED CROWN", "KING OF THE SUNKEN FLEET"],
    ["PELAGIC OVERLORD", "HEIR OF THE LEVIATHAN"],
  ],
  desert: [
    ["DUNE STALKER", "GHOST OF THE ERG"], ["SAND VIPER", "STRIKE FROM NOWHERE"],
    ["MIRAGE ENGINE", "THE LIE THAT KILLS"], ["SUNSCORCH", "NOON GIVEN WEAPONS"],
    ["IRON CARAVAN", "ARMORED SUPPLY TYRANT"], ["GLASS CANNON", "FORGED FROM LIGHTNING SAND"],
    ["DUST COLOSSUS", "THE WALKING DUNE"], ["ANUBIS WING", "JACKAL OF THE WASTES"],
    ["DUNE EMPEROR", "HEIR OF THE SCORPION"],
  ],
  city: [
    ["NEON JACKAL", "PREDATOR OF THE GRID"], ["GRID RUNNER", "ROGUE PROCESS INCARNATE"],
    ["HOLOGHOST", "THE SIGNAL THAT SHOOTS BACK"], ["DATA REAPER", "GARBAGE COLLECTOR OF SOULS"],
    ["CIRCUIT TYRANT", "OVERCLOCKED MONARCH"], ["FIREWALL", "THE LAST PERMISSION DENIED"],
    ["CHROME SERAPH", "ANGEL OF POLISHED STEEL"], ["NULL POINTER", "EXCEPTION MADE FLESH"],
    ["MAINFRAME PROPHET", "HEIR OF THE OVERDRIVE"],
  ],
  ice: [
    ["FROSTBITE", "FIRST TOUCH OF WINTER"], ["GLACIER MAW", "THE HUNGRY ICE"],
    ["WHITEOUT", "WHERE COMPASSES DIE"], ["AURORA LANCE", "LIGHT TURNED LETHAL"],
    ["PERMAFROST", "THE ETERNAL FOUNDATION"], ["CRYO HYDRA", "EVERY HEAD A BLIZZARD"],
    ["ZERO FANATIC", "APOSTLE OF ABSOLUTE ZERO"], ["BLIZZARD THRONE", "SEAT OF THE HOWLING KING"],
    ["WINTER'S HEIR", "HEIR OF THE GLACIER"],
  ],
  fire: [
    ["CINDER IMP", "SPARK OF THE APOCALYPSE"], ["MAGMA HOUND", "IT HUNTS IN RIVERS OF FIRE"],
    ["ASH TITAN", "THE MOUNTAIN THAT WALKS"], ["OBSIDIAN FANG", "GLASS THAT CUTS STEEL"],
    ["PYROCLAST", "THE ERUPTION'S HERALD"], ["FORGE WARDEN", "KEEPER OF THE FIRST FURNACE"],
    ["LAVA SERAPH", "BAPTIZED IN MAGMA"], ["CALDERA KING", "CROWNED IN THE CRATER"],
    ["INFERNO HERALD", "HEIR OF THE PYRO SOVEREIGN"],
  ],
  orbit: [
    ["DEBRIS LORD", "KING OF THE GRAVEYARD ORBIT"], ["GRAVITY ANCHOR", "THE WEIGHT OF NOTHING"],
    ["SOLAR WRAITH", "BURNED BY ITS OWN STAR"], ["VOID SHEPHERD", "HERDER OF LOST SHIPS"],
    ["EVENT EUCLID", "GEOMETER OF THE HORIZON"], ["SINGULARITY ACOLYTE", "PRAYER MADE GRAVITY"],
    ["STATION KEEPER", "LAST CREW OF STATION ZERO"], ["DARK MATTER", "MOST OF THE UNIVERSE"],
    ["OMEGA HERALD", "HEIR OF THE OMEGA ORBITAL"],
  ],
};

export const sectorBossId = (g: number, p: number, m: number) => `sector_${g}_${p}_${m}`;

export function generateSectorBoss(
  g: number, p: number, m: number,
  planetId: string, tier: number, planetName: string,
): BossDef {
  const arch = SECTOR_ARCHETYPES[Math.max(0, Math.min(8, m))];
  const style = PLANET_WARLORD_STYLE[planetId] || PLANET_WARLORD_STYLE.earth;
  const [name, title] = (WARLORD_NAMES[planetId] || WARLORD_NAMES.earth)[Math.max(0, Math.min(8, m))];
  const hp = Math.round((700 + m * 380) * (1 + tier * 0.75));
  const scale = arch.scale * (1 + tier * 0.028);
  // sector tempo quickens with depth
  const phases = arch.phases(tier, m).map((ph) => ({
    attacks: ph.attacks,
    rate: Math.max(0.3, ph.rate - tier * 0.035 - m * 0.012),
  }));
  return {
    id: sectorBossId(g, p, m),
    name,
    title: `${title} · SECTOR ${String(m + 1).padStart(2, "0")} — ${planetName}`,
    hp,
    color: style.color,
    accent: style.accent,
    glow: style.glow,
    scale,
    variant: arch.variant,
    signature: arch.signature,
    abilityText: arch.abilityText,
    sector: { galaxy: g, planet: p, map: m },
    parts: arch.parts(hp),
    phases,
    reward: {
      coins: Math.round((200 + m * 120) * (1 + tier * 0.5)),
      crystals: 1 + Math.floor(m / 3) + Math.floor(tier / 2),
      xp: Math.round((150 + m * 90) * (1 + tier * 0.6)),
    },
  };
}

export function findBoss(id: string): BossDef {
  if (id.startsWith("sector_")) {
    const [, gs, ps, ms] = id.split("_");
    const g = parseInt(gs, 10) || 0, p = parseInt(ps, 10) || 0, m = parseInt(ms, 10) || 0;
    const planet = getPlanet(g, p);
    return generateSectorBoss(g, p, m, planet.id, planet.tier, planet.name);
  }
  return ALL_BOSSES.find((b) => b.id === id) || ALL_BOSSES[0];
}

/* ============================================================
   MAPS / PLANETS / GALAXIES
   ============================================================ */

export type MapEventId = "none" | "storm" | "emp" | "elite" | "meteor" | "flare";

export interface MapDef {
  index: number;         // 0..9
  name: string;
  waves: number;
  hpMul: number;
  speedMul: number;
  spawnMul: number;
  event: MapEventId;
  miniBoss: boolean;
  /** every sector ends with a boss fight */
  boss: boolean;
  reward: { coins: number; xp: number };
}

export interface PlanetDef {
  id: string;
  name: string;
  emoji: string;
  theme: "sky" | "ocean" | "desert" | "city" | "ice" | "space" | "volcano";
  sky: [string, string, string];
  fog: string;
  boss: string;
  secretBoss: string;
  secretFee: { coins: number; crystals: number };
  roster: string[];
  desc: string;
  intro: string[];
  tier: number;
  mapNames: string[];
}

export interface GalaxyDef {
  id: number;
  name: string;
  subtitle: string;
  color: string;
  desc: string;
  planets: PlanetDef[];
}

/** Planet order determines the cumulative aircraft cap: 100, 200, ... 700. */
export function planetOrder(g: number, p: number): number {
  let order = 0;
  for (let gi = 0; gi < g; gi++) order += GALAXIES[gi].planets.length;
  return order + p;
}
export const planetMaxLevel = (g: number, p: number) => (planetOrder(g, p) + 1) * 100;

/** Sector index → boss id for that sector. 0-8 warlords, 9 = planet guardian. */
export function sectorBossFor(g: number, p: number, m: number): string {
  if (m >= 9) return getPlanet(g, p).boss;
  return sectorBossId(g, p, m);
}

function buildMaps(p: PlanetDef): MapDef[] {
  const events: MapEventId[] = ["none", "none", "storm", "none", "elite", "emp", "none", "meteor", "flare", "none"];
  return p.mapNames.map((name, i) => {
    const t = i / 9;
    return {
      index: i,
      name,
      waves: 3 + Math.round(i * 0.7) + Math.floor(p.tier * 0.4),
      hpMul: (1 + p.tier * 0.42) * (1 + t * 1.15),
      speedMul: 1 + t * 0.22 + p.tier * 0.05,
      spawnMul: 1 + t * 0.4 + p.tier * 0.08,
      event: SECTOR_IDENTITIES[i].event ?? (p.tier >= 3 && events[i] === "none" && i % 3 === 1 ? "elite" : events[i]),
      miniBoss: i === 4 || i === 7,
      boss: true,
      reward: sectorBaseReward(p.tier, i),
    };
  });
}

const P = (d: PlanetDef) => d;

export const GALAXIES: GalaxyDef[] = [
  {
    id: 1,
    name: "SOLARIS EDGE",
    subtitle: "HOME SYSTEM · CONTESTED",
    color: "#2ee6ff",
    desc: "The invasion beachhead. Earth and her sister worlds under siege — reclaim them or lose the system.",
    planets: [
      P({
        id: "earth", name: "EARTH", emoji: "🌍", theme: "sky", tier: 0,
        sky: ["#123b63", "#2f7fb5", "#8fd0e8"], fog: "rgba(180,220,245,0.20)",
        boss: "vulture", secretBoss: "sb_sky", secretFee: { coins: 20000, crystals: 10 },
        roster: ["scout", "fighter", "drone", "kamikaze", "heavy"],
        desc: "Humanity's home. Clouds, mountains and endless enemy squadrons. MAX LV 100.",
        intro: ["OPERATION: HOMELAND SHIELD", "They came for Earth first.", "Make them regret it."],
        mapNames: [
          "LOW ORBIT PATROL", "CLOUD CORRIDOR", "MOUNTAIN PASS", "RADAR OUTPOST", "SQUADRON ALPHA",
          "THUNDER RIDGE", "SUPPLY INTERCEPT", "STORM WALL", "HIGH ALTITUDE SIEGE", "IRON VULTURE NEST",
        ],
      }),
      P({
        id: "ocean", name: "OCEAN WAR", emoji: "🌊", theme: "ocean", tier: 1,
        sky: ["#04223a", "#0a5074", "#1ba0b8"], fog: "rgba(80,200,230,0.16)",
        boss: "leviathan", secretBoss: "sb_ocean", secretFee: { coins: 30000, crystals: 14 },
        roster: ["fighter", "drone", "bomber", "sniper", "shielder", "kamikaze"],
        desc: "Carrier fleets and torpedo bombers over black water. MAX LV 200.",
        intro: ["OPERATION: DEEP TIDE", "Their fleet controls the shipping lanes.", "Sink everything that floats."],
        mapNames: [
          "COASTAL SWEEP", "CARRIER SHADOW", "TORPEDO ALLEY", "DEEP BLUE RUN", "FLEET VANGUARD",
          "SUBMARINE PENS", "TYPHOON EYE", "BLOCKADE BREAK", "ABYSS APPROACH", "LEVIATHAN DEPTHS",
        ],
      }),
      P({
        id: "desert", name: "DESERT STORM", emoji: "🏜️", theme: "desert", tier: 2,
        sky: ["#4a2410", "#b3651f", "#f0b567"], fog: "rgba(255,190,120,0.20)",
        boss: "scorpion", secretBoss: "sb_desert", secretFee: { coins: 42000, crystals: 18 },
        roster: ["fighter", "heavy", "sniper", "missiler", "kamikaze", "elite"],
        desc: "Military bases buried in a howling sandstorm. MAX LV 300.",
        intro: ["OPERATION: DRY THUNDER", "Their war factories feed on this sand.", "Burn the supply chain."],
        mapNames: [
          "DUNE RECON", "SANDGLASS FIELD", "REFINERY RAID", "MIRAGE CANYON", "ARMOR COLUMN",
          "SILO COMPLEX", "BLACK OASIS", "ARTILLERY LINE", "STORM'S HEART", "SCORPION PIT",
        ],
      }),
    ],
  },
  {
    id: 2,
    name: "VOID NEXUS",
    subtitle: "DEEP SPACE · UNCHARTED",
    color: "#b567ff",
    desc: "Beyond the heliopause. Alien architecture, impossible physics, and the source of the invasion.",
    planets: [
      P({
        id: "city", name: "NEON CITY", emoji: "🏙️", theme: "city", tier: 3,
        sky: ["#12002e", "#3d0a6b", "#8b1fb0"], fog: "rgba(190,90,255,0.18)",
        boss: "overdrive", secretBoss: "sb_city", secretFee: { coins: 60000, crystals: 24 },
        roster: ["drone", "laser", "shielder", "elite", "swarmer", "phasewalker", "warden"],
        desc: "Skyscrapers, holograms and autonomous drone swarms. MAX LV 400.",
        intro: ["OPERATION: GHOST GRID", "A city that thinks. A city that hunts.", "Cut the mainframe."],
        mapNames: [
          "NEON APPROACH", "HOLOGRAM DISTRICT", "DATA SPIRES", "SERVER CANYON", "DRONE FOUNDRY",
          "SKYLINE PURSUIT", "FIREWALL GATE", "BLACK MARKET RUN", "CORE DISTRICT", "OVERDRIVE NEXUS",
        ],
      }),
      P({
        id: "ice", name: "CRYO BASTION", emoji: "❄️", theme: "ice", tier: 4,
        sky: ["#031e33", "#0d5a77", "#8fdfe8"], fog: "rgba(180,240,255,0.20)",
        boss: "glacier", secretBoss: "sb_ice", secretFee: { coins: 82000, crystals: 30 },
        roster: ["heavy", "laser", "missiler", "elite", "warden", "artillery", "voidlance", "miniboss"],
        desc: "The enemy's arctic stronghold. Zero visibility, zero mercy. MAX LV 500.",
        intro: ["OPERATION: WHITEOUT", "Nothing has ever flown out of this place.", "Be the first."],
        mapNames: [
          "FROZEN APPROACH", "GLACIER TRENCH", "WHITEOUT RUN", "ICE CANNON LINE", "CRYO HANGARS",
          "FROSTBITE PASS", "AURORA BATTERY", "SUBZERO CORE", "SHATTERED SHELF", "GLACIER FORTRESS",
        ],
      }),
      P({
        id: "fire", name: "INFERNO CORE", emoji: "🌋", theme: "volcano", tier: 5,
        sky: ["#1d0400", "#7a1a05", "#ff6a1f"], fog: "rgba(255,120,40,0.22)",
        boss: "pyrolord", secretBoss: "sb_fire", secretFee: { coins: 110000, crystals: 38 },
        roster: ["pyroling", "juggernaut", "artillery", "voidlance", "elite", "phasewalker", "missiler"],
        desc: "A molten forge-world where their fleets are born. MAX LV 600.",
        intro: ["OPERATION: COLD FIRE", "This is where their armada is forged.", "Quench the furnace."],
        mapNames: [
          "ASH CURTAIN", "MAGMA RIVERS", "FORGE LINE", "CINDER FIELDS", "OBSIDIAN GATE",
          "LAVA CATHEDRAL", "ERUPTION RUN", "SMELTER DEPTHS", "CALDERA SIEGE", "PYRO SOVEREIGN",
        ],
      }),
      P({
        id: "orbit", name: "FINAL ORBIT", emoji: "🌌", theme: "space", tier: 6,
        sky: ["#05000f", "#150a35", "#3a1c6b"], fog: "rgba(160,120,255,0.14)",
        boss: "omega", secretBoss: "sb_orbit", secretFee: { coins: 150000, crystals: 50 },
        roster: ["elite", "voidlance", "warden", "phasewalker", "juggernaut", "swarmer", "miniboss"],
        desc: "Above the atmosphere. The last battle for everything. MAX LV 700.",
        intro: ["OPERATION: LAST LIGHT", "No reinforcements. No retreat.", "End it."],
        mapNames: [
          "ORBITAL INSERTION", "DEBRIS FIELD", "SOLAR SAIL WRECK", "GRAVITY WELL", "VOID PICKET",
          "STATION ZERO", "EVENT HORIZON", "SINGULARITY RUN", "LAST STAND", "OMEGA ORBITAL",
        ],
      }),
    ],
  },
];

const MAP_CACHE = new Map<string, MapDef[]>();
export function getMaps(p: PlanetDef): MapDef[] {
  let m = MAP_CACHE.get(p.id);
  if (!m) { m = buildMaps(p); MAP_CACHE.set(p.id, m); }
  return m;
}

export function getPlanet(g: number, p: number): PlanetDef {
  const gal = GALAXIES[Math.max(0, Math.min(GALAXIES.length - 1, g))];
  return gal.planets[Math.max(0, Math.min(gal.planets.length - 1, p))];
}

export const planetKey = (g: number, p: number) => `${g}_${p}`;

/* ============================================================
   FORMATIONS — choreographed enemy waves
   ============================================================ */

export interface FormationSlot { x: number; delay: number; id?: string }
export interface FormationDef {
  id: string;
  name: string;
  build: (count: number, W: number) => FormationSlot[];
}

export const FORMATIONS: FormationDef[] = [
  {
    id: "vee", name: "V FORMATION",
    build: (n, W) => Array.from({ length: n }, (_, i) => {
      const half = (n - 1) / 2;
      const o = i - half;
      return { x: W / 2 + o * 78, delay: Math.abs(o) * 0.13 };
    }),
  },
  {
    id: "line", name: "ASSAULT LINE",
    build: (n, W) => Array.from({ length: n }, (_, i) => ({ x: (W / (n + 1)) * (i + 1), delay: i * 0.07 })),
  },
  {
    id: "column", name: "STRIKE COLUMN",
    build: (n, W) => Array.from({ length: n }, (_, i) => ({ x: W / 2 + Math.sin(i * 1.1) * 60, delay: i * 0.28 })),
  },
  {
    id: "pincer", name: "PINCER",
    build: (n, W) => Array.from({ length: n }, (_, i) => ({
      x: i % 2 === 0 ? 90 + Math.floor(i / 2) * 46 : W - 90 - Math.floor(i / 2) * 46,
      delay: Math.floor(i / 2) * 0.2,
    })),
  },
  {
    id: "diamond", name: "DIAMOND",
    build: (n, W) => Array.from({ length: n }, (_, i) => {
      const ring = Math.floor(i / 4), k = i % 4;
      const r = 70 + ring * 56;
      return { x: W / 2 + Math.cos((k / 4) * Math.PI * 2) * r, delay: ring * 0.24 + k * 0.05 };
    }),
  },
  {
    id: "wall", name: "SIEGE WALL",
    build: (n, W) => Array.from({ length: n }, (_, i) => ({ x: 80 + ((W - 160) / Math.max(1, n - 1)) * i, delay: 0 })),
  },
  {
    id: "snake", name: "SERPENT",
    build: (n, W) => Array.from({ length: n }, (_, i) => ({ x: W / 2 + Math.sin(i * 0.7) * (W * 0.32), delay: i * 0.16 })),
  },
  {
    id: "spearhead", name: "SPEARHEAD",
    build: (n, W) => Array.from({ length: n }, (_, i) => {
      const row = Math.floor(Math.sqrt(i));
      return { x: W / 2 + (i - row * row - row) * 66, delay: row * 0.2 };
    }),
  },
];


/* ============================================================
   SECTOR IDENTITY — each of the 10 sectors plays differently
   ============================================================ */

export type SectorFlavor =
  | "patrol" | "swarm" | "fortress" | "ambush" | "elite"
  | "hazard" | "survival" | "siege" | "gauntlet" | "finale";

export interface SectorIdentity {
  flavor: SectorFlavor;
  label: string;
  icon: string;
  desc: string;
  /** squad templates preferred in this sector */
  squads: string[];
  /** wave pacing multiplier (lower = faster waves) */
  tempo: number;
  /** extra simultaneous enemies */
  density: number;
  /** music intensity floor 0..1 */
  intensity: number;
  /** forced dynamic event, overrides map default when set */
  event?: MapEventId;
}

export const SECTOR_IDENTITIES: SectorIdentity[] = [
  { flavor: "patrol", label: "PATROL SWEEP", icon: "🛩", tempo: 1.15, density: 0, intensity: 0.35,
    desc: "Light contact. Learn the local hostiles.", squads: [] },
  { flavor: "swarm", label: "SWARM", icon: "🐝", tempo: 0.78, density: 4, intensity: 0.55,
    desc: "Overwhelming numbers of light craft.", squads: ["swarmrush", "wolfpack"] },
  { flavor: "hazard", label: "HAZARD ZONE", icon: "🌩", tempo: 1.0, density: 1, intensity: 0.5, event: "storm",
    desc: "The environment fights alongside them.", squads: ["hunterkiller"] },
  { flavor: "ambush", label: "AMBUSH", icon: "🎯", tempo: 0.92, density: 2, intensity: 0.6,
    desc: "They strike from the flanks without warning.", squads: ["hunterkiller", "wolfpack"] },
  { flavor: "elite", label: "ELITE INVASION", icon: "☠", tempo: 1.05, density: 1, intensity: 0.7, event: "elite",
    desc: "Veteran squadrons with escort support.", squads: ["annihilation", "voidcell"] },
  { flavor: "fortress", label: "FORTRESS LINE", icon: "🛡", tempo: 1.1, density: 2, intensity: 0.62, event: "emp",
    desc: "Shielded walls of armour. Break the support first.", squads: ["phalanx", "lancers"] },
  { flavor: "gauntlet", label: "GAUNTLET", icon: "⚔", tempo: 0.72, density: 3, intensity: 0.72,
    desc: "Relentless back-to-back formations. No breathing room.", squads: ["wolfpack", "hunterkiller", "swarmrush"] },
  { flavor: "siege", label: "SIEGE BATTERY", icon: "💥", tempo: 1.0, density: 2, intensity: 0.68, event: "meteor",
    desc: "Long-range artillery hammers your airspace.", squads: ["siege", "lancers"] },
  { flavor: "survival", label: "SURVIVAL RUN", icon: "🔥", tempo: 0.68, density: 4, intensity: 0.8, event: "flare",
    desc: "Endless pressure. Stay alive until the warlord shows.", squads: ["swarmrush", "phalanx", "voidcell"] },
  { flavor: "finale", label: "GUARDIAN APPROACH", icon: "👹", tempo: 1.2, density: 1, intensity: 0.85,
    desc: "The planet's guardian awaits. Full escort deployment.", squads: ["annihilation", "phalanx"] },
];

export const sectorIdentity = (m: number) => SECTOR_IDENTITIES[Math.max(0, Math.min(9, m))];
