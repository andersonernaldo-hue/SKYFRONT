export type WingmanId = "none" | "laser" | "shield" | "turret" | "missile" | "repair";

export interface WingmanTalent {
  id: string;
  name: string;
  desc: string;
  max: number;
  cost: number; // base cost in coins per level
  /** value added per level */
  step: number;
  stat: "damage" | "rate" | "range" | "special";
}

export interface WingmanDef {
  id: WingmanId;
  name: string;
  role: string;
  icon: string;
  color: string;
  desc: string;
  price: { coins: number; crystals: number };
  base: {
    damage: number;
    rate: number;   // shots per second
    range: number;
    special: number; // shield charge seconds / regen / etc.
  };
  talents: WingmanTalent[];
  shape: "laser" | "shield" | "turret" | "missile" | "repair";
}

const T = (id: string, name: string, desc: string, stat: WingmanTalent["stat"], step: number, cost: number, max = 5): WingmanTalent =>
  ({ id, name, desc, stat, step, cost, max });

export const WINGMEN: WingmanDef[] = [
  {
    id: "laser",
    name: "LANCE DRONE",
    role: "PIERCING BEAM",
    icon: "⚡",
    color: "#2ee6ff",
    desc: "Fires a continuous piercing micro-beam that shreds enemy columns.",
    price: { coins: 4500, crystals: 0 },
    base: { damage: 5.2, rate: 6, range: 620, special: 1 },
    talents: [
      T("l_dmg", "FOCUSED OPTICS", "+18% beam damage", "damage", 0.18, 700),
      T("l_rate", "COOLANT LOOP", "+14% beam frequency", "rate", 0.14, 650),
      T("l_range", "LONG LENS", "+12% range", "range", 0.12, 500),
      T("l_pierce", "PHASE CORE", "+1 pierce target", "special", 1, 1100, 3),
    ],
    shape: "laser",
  },
  {
    id: "turret",
    name: "VULCAN POD",
    role: "AUTO TURRET",
    icon: "🔫",
    color: "#ffd23d",
    desc: "Independently tracks and suppresses the nearest hostile with rapid fire.",
    price: { coins: 3800, crystals: 0 },
    base: { damage: 4.1, rate: 9, range: 560, special: 0.05 },
    talents: [
      T("t_dmg", "AP ROUNDS", "+16% round damage", "damage", 0.16, 650),
      T("t_rate", "SPIN-UP MOTOR", "+18% fire rate", "rate", 0.18, 700),
      T("t_range", "TARGET UPLINK", "+14% tracking range", "range", 0.14, 500),
      T("t_crit", "MARKSMAN AI", "+5% critical chance", "special", 0.05, 1200, 5),
    ],
    shape: "turret",
  },
  {
    id: "shield",
    name: "AEGIS DRONE",
    role: "BARRIER SUPPORT",
    icon: "🛡️",
    color: "#3fa9ff",
    desc: "Projects a rotating barrier that deletes enemy bullets on contact.",
    price: { coins: 6200, crystals: 2 },
    base: { damage: 0, rate: 1, range: 96, special: 6 },
    talents: [
      T("s_radius", "FIELD EXPANDER", "+10% barrier radius", "range", 0.1, 800),
      T("s_rate", "CAPACITOR", "-9% recharge time", "rate", 0.09, 750),
      T("s_uptime", "SUSTAINED FIELD", "+0.7s barrier uptime", "special", 0.7, 900),
      T("s_thorns", "REACTIVE PLATING", "Barrier deals contact damage", "damage", 3.5, 1400, 4),
    ],
    shape: "shield",
  },
  {
    id: "missile",
    name: "HORNET RACK",
    role: "HOMING SALVO",
    icon: "🚀",
    color: "#ff8a3d",
    desc: "Launches guided micro-missiles that hunt targets across the battlefield.",
    price: { coins: 8600, crystals: 3 },
    base: { damage: 13, rate: 0.9, range: 900, special: 1 },
    talents: [
      T("m_dmg", "SHAPED CHARGE", "+20% warhead damage", "damage", 0.2, 900),
      T("m_rate", "AUTO LOADER", "+15% launch rate", "rate", 0.15, 950),
      T("m_track", "SEEKER HEAD", "+18% turn rate", "range", 0.18, 700),
      T("m_count", "TWIN RACK", "+1 missile per salvo", "special", 1, 1800, 3),
    ],
    shape: "missile",
  },
  {
    id: "repair",
    name: "MEDIC UNIT",
    role: "NANITE SUPPORT",
    icon: "➕",
    color: "#10f0a0",
    desc: "Streams repair nanites into your hull and boosts loot magnetism.",
    price: { coins: 7400, crystals: 2 },
    base: { damage: 0, rate: 1, range: 260, special: 0.55 },
    talents: [
      T("r_regen", "NANITE FLOW", "+0.35 hull/sec", "special", 0.35, 1000),
      T("r_magnet", "TRACTOR FIELD", "+22% pickup radius", "range", 0.22, 600),
      T("r_burst", "EMERGENCY WELD", "+4% burst heal on kill streak", "rate", 0.04, 1100),
      T("r_armor", "ABLATIVE COAT", "-3% damage taken", "damage", 0.03, 1500, 5),
    ],
    shape: "repair",
  },
];

export const getWingman = (id: WingmanId) => WINGMEN.find((w) => w.id === id);

export interface WingmanSlotSave {
  id: WingmanId;
  talents: Record<string, number>;
}

export function wingmanStats(def: WingmanDef, talents: Record<string, number>) {
  let damage = def.base.damage;
  let rate = def.base.rate;
  let range = def.base.range;
  let special = def.base.special;
  for (const t of def.talents) {
    const lv = talents[t.id] || 0;
    if (!lv) continue;
    const add = t.step * lv;
    if (t.stat === "damage") damage = t.id === "s_thorns" || t.id === "r_armor" ? damage + add : damage * (1 + add);
    else if (t.stat === "rate") rate = t.id === "s_rate" ? rate / (1 + add) : rate * (1 + add);
    else if (t.stat === "range") range *= 1 + add;
    else special += add;
  }
  return { damage, rate, range, special };
}

export const wingmanTalentCost = (t: WingmanTalent, level: number) => Math.round(t.cost * Math.pow(1.42, level));
