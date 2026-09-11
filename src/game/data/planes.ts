export type EvadeStyle = "climb" | "blink" | "anchor" | "burn" | "phase" | "vanish";

export type WeaponType =
  | "BULLETS"
  | "PLASMA"
  | "LASER"
  | "MISSILE"
  | "HOMING"
  | "ELECTRIC"
  | "PIERCING";

export interface PlaneDef {
  id: string;
  name: string;
  role: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";
  desc: string;
  price: number;
  currency: "coins" | "crystals";
  stats: {
    hp: number;
    speed: number;
    damage: number;
    fireRate: number; // shots per second
    crit: number; // 0..1
  };
  weapon: WeaponType;
  skill: { name: string; desc: string; cd: number };
  ultimate: { name: string; desc: string; cd: number };
  /** Signature passive — the real gameplay identity of the airframe. */
  passive: { name: string; desc: string; icon: string };
  /** Per-airframe evasive maneuver flavour (always 30s, always invulnerable). */
  evade: { name: string; desc: string; style: EvadeStyle };
  /** How this airframe benefits from meta systems. */
  synergy: { upgrade: string; talent: string; wingman: string };
  /** visual palette */
  art: {
    body: string;
    bodyDark: string;
    accent: string;
    glass: string;
    engine: string;
    trail: string;
    wingStyle: "delta" | "swept" | "heavy" | "forward" | "stealth" | "arrow";
    size: number;
  };
}

export const PLANES: PlaneDef[] = [
  {
    id: "falcon",
    name: "FALCON",
    role: "BALANCED",
    rarity: "RARE",
    desc: "Modern multirole fighter. Reliable in every theatre of war.",
    price: 0,
    currency: "coins",
    stats: { hp: 100, speed: 430, damage: 10, fireRate: 7.5, crit: 0.08 },
    weapon: "BULLETS",
    skill: { name: "VULCAN BURST", desc: "Massive spread barrage for 4s", cd: 12 },
    ultimate: { name: "SKY PURGE", desc: "Screen-clearing shockwave", cd: 40 },
    passive: {
      name: "ACE INSTINCT", icon: "🎯",
      desc: "Every 4th volley is a guaranteed critical. Weapon pickups grant +1 extra level below LV3.",
    },
    evade: { name: "COMBAT CLIMB", desc: "Textbook high-G climb. Clean, fast, unbreakable.", style: "climb" },
    synergy: {
      upgrade: "CRITICAL & FIRE RATE — guaranteed crits scale with both.",
      talent: "OFFENSE branch (Precision AI / Lethality) doubles down on the crit identity.",
      wingman: "VULCAN POD — its own crit rolls stack with your guaranteed volley.",
    },
    art: {
      body: "#c9d6e4",
      bodyDark: "#5d7186",
      accent: "#2ee6ff",
      glass: "#0ff0ff",
      engine: "#7ff0ff",
      trail: "#38d8ff",
      wingStyle: "swept",
      size: 1,
    },
  },
  {
    id: "phantom",
    name: "PHANTOM",
    role: "SPEED",
    rarity: "EPIC",
    desc: "Hypersonic interceptor. Fragile hull, impossible to catch.",
    price: 6500,
    currency: "coins",
    stats: { hp: 72, speed: 620, damage: 8, fireRate: 11, crit: 0.14 },
    weapon: "PLASMA",
    skill: { name: "PHASE DASH", desc: "Blink forward, invulnerable 1.6s", cd: 9 },
    ultimate: { name: "SONIC STORM", desc: "360° plasma nova x3", cd: 38 },
    passive: {
      name: "AFTERBURN", icon: "🔥",
      desc: "Builds MOMENTUM while unhit: up to +45% fire rate and +30% speed. Taking a hit resets it.",
    },
    evade: { name: "VECTOR BLINK", desc: "Two-stage blink climb — leaves an after-image swarm.", style: "blink" },
    synergy: {
      upgrade: "SPEED — momentum stacks multiply your top-end velocity.",
      talent: "DEFENSE (Phase Shielding) protects the stack you never want to lose.",
      wingman: "AEGIS DRONE — deletes the chip damage that would break your streak.",
    },
    art: {
      body: "#dfe9ff",
      bodyDark: "#41508a",
      accent: "#7c5cff",
      glass: "#b48cff",
      engine: "#c39bff",
      trail: "#8a5cff",
      wingStyle: "forward",
      size: 0.95,
    },
  },
  {
    id: "titan",
    name: "TITAN",
    role: "TANK",
    rarity: "EPIC",
    desc: "Armored war machine. Slow, unstoppable, devastating.",
    price: 9000,
    currency: "coins",
    stats: { hp: 190, speed: 320, damage: 15, fireRate: 5, crit: 0.06 },
    weapon: "PIERCING",
    skill: { name: "BULWARK", desc: "Absorbing barrier for 6s", cd: 14 },
    ultimate: { name: "SIEGE MODE", desc: "Quad cannons + armor, 8s", cd: 45 },
    passive: {
      name: "REACTIVE ARMOR", icon: "🛡️",
      desc: "Takes 22% less damage. Every hit absorbed releases a retaliation shockwave.",
    },
    evade: { name: "ARMORED ASCENT", desc: "Brutal vertical burn — the shockwave alone clears bullets.", style: "anchor" },
    synergy: {
      upgrade: "HEALTH & SHIELD — more hull means more retaliation triggers.",
      talent: "DEFENSE (Retaliation Field) stacks directly with your armor shockwave.",
      wingman: "MEDIC UNIT — sustain turns your damage reduction into true immortality.",
    },
    art: {
      body: "#b9c2ae",
      bodyDark: "#4e5a45",
      accent: "#ffb020",
      glass: "#ffd479",
      engine: "#ff9b3d",
      trail: "#ff8a2b",
      wingStyle: "heavy",
      size: 1.18,
    },
  },
  {
    id: "thunder",
    name: "THUNDER",
    role: "ASSAULT",
    rarity: "LEGENDARY",
    desc: "Aggressive gunship bristling with missile pods.",
    price: 16000,
    currency: "coins",
    stats: { hp: 120, speed: 420, damage: 16, fireRate: 6.5, crit: 0.12 },
    weapon: "MISSILE",
    skill: { name: "SALVO", desc: "Fires 12 homing missiles", cd: 11 },
    ultimate: { name: "CARPET BOMB", desc: "Saturation bombing run", cd: 42 },
    passive: {
      name: "OVERKILL", icon: "💥",
      desc: "Enemies you destroy detonate for 45% of their max HP as area damage. Chains into crowds.",
    },
    evade: { name: "FLARE BREAK", desc: "Climbs while dumping flare clusters that detonate behind you.", style: "burn" },
    synergy: {
      upgrade: "MISSILES & DAMAGE — bigger kills mean bigger detonations.",
      talent: "OFFENSE (Overcharge) raises every corpse explosion.",
      wingman: "HORNET RACK — homing salvos start the chain reaction for you.",
    },
    art: {
      body: "#d7c7b0",
      bodyDark: "#6b4b34",
      accent: "#ff5722",
      glass: "#ffcc66",
      engine: "#ff7a2f",
      trail: "#ff5722",
      wingStyle: "delta",
      size: 1.08,
    },
  },
  {
    id: "nova",
    name: "NOVA",
    role: "ENERGY",
    rarity: "LEGENDARY",
    desc: "Experimental energy platform. Beams that melt fleets.",
    price: 40,
    currency: "crystals",
    stats: { hp: 108, speed: 450, damage: 13, fireRate: 9, crit: 0.15 },
    weapon: "LASER",
    skill: { name: "PRISM BEAM", desc: "Continuous piercing beam 4s", cd: 12 },
    ultimate: { name: "SUPERNOVA", desc: "Orbital energy detonation", cd: 40 },
    passive: {
      name: "OVERCHARGE", icon: "⚡",
      desc: "Sustained fire charges the core. At full charge shots pierce and arc lightning between targets.",
    },
    evade: { name: "PRISM SHIFT", desc: "Refracts into light and re-forms above — the beam never stops.", style: "phase" },
    synergy: {
      upgrade: "FIRE RATE — charge builds per shot, not per second.",
      talent: "OFFENSE (Phase Rounds) adds pierce on top of overcharge pierce.",
      wingman: "LANCE DRONE — its beam keeps the charge topped up between waves.",
    },
    art: {
      body: "#e7fbff",
      bodyDark: "#1f6f7a",
      accent: "#00ffc8",
      glass: "#7dfff0",
      engine: "#4dffe0",
      trail: "#00ffc8",
      wingStyle: "arrow",
      size: 1.02,
    },
  },
  {
    id: "shadow",
    name: "SHADOW",
    role: "STEALTH",
    rarity: "MYTHIC",
    desc: "Black-project stealth wing. Critical strikes from the dark.",
    price: 90,
    currency: "crystals",
    stats: { hp: 92, speed: 560, damage: 12, fireRate: 10, crit: 0.34 },
    weapon: "ELECTRIC",
    skill: { name: "GHOST VEIL", desc: "Untargetable + 2x crit, 5s", cd: 13 },
    ultimate: { name: "BLACK LOTUS", desc: "Chain lightning annihilation", cd: 40 },
    passive: {
      name: "PREDATOR", icon: "🗡️",
      desc: "Critical hits execute enemies below 18% HP instantly and refund 1.5s of ultimate cooldown.",
    },
    evade: { name: "GHOST STEP", desc: "Dissolves into static, reappears untouchable at altitude.", style: "vanish" },
    synergy: {
      upgrade: "CRITICAL — every point raises execute frequency.",
      talent: "OFFENSE (Precision AI + Lethality) turns executes into a loop.",
      wingman: "VULCAN POD — extra crit sources trigger more executes.",
    },
    art: {
      body: "#5a5f75",
      bodyDark: "#181a26",
      accent: "#ff2d6f",
      glass: "#ff6f9c",
      engine: "#ff2d6f",
      trail: "#ff2d6f",
      wingStyle: "stealth",
      size: 1.04,
    },
  },
];

export const getPlane = (id: string): PlaneDef => PLANES.find((p) => p.id === id) || PLANES[0];

export const UPGRADE_KEYS = [
  "damage",
  "health",
  "fireRate",
  "speed",
  "critical",
  "critDamage",
  "missiles",
  "shield",
] as const;
export type UpgradeKey = (typeof UPGRADE_KEYS)[number];

export const UPGRADE_META: Record<UpgradeKey, { label: string; icon: string; perLevel: string; base: number }> = {
  damage: { label: "DAMAGE", icon: "🔥", perLevel: "+6% damage", base: 300 },
  health: { label: "HEALTH", icon: "❤️", perLevel: "+8% hull", base: 300 },
  fireRate: { label: "FIRE RATE", icon: "⚡", perLevel: "+4% rate", base: 350 },
  speed: { label: "SPEED", icon: "🛫", perLevel: "+3% speed", base: 250 },
  critical: { label: "CRITICAL", icon: "🎯", perLevel: "+1.5% crit chance", base: 400 },
  critDamage: { label: "CRIT DAMAGE", icon: "💥", perLevel: "+5% crit damage", base: 450 },
  missiles: { label: "MISSILES", icon: "🚀", perLevel: "+1 side missile dmg", base: 450 },
  shield: { label: "SHIELD", icon: "🛡️", perLevel: "+1 shield charge/8lv", base: 500 },
};
