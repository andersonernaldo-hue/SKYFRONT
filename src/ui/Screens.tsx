import { useState } from "react";
import { Btn, Panel, PlaneCanvas, RarityTag, ScreenTitle, StatRow } from "./common";
import { PLANES, UPGRADE_META, UPGRADE_KEYS, getPlane, type UpgradeKey } from "../game/data/planes";
import { ENEMIES, SQUADS } from "../game/data/enemies";
import { RARITY_COLORS, type QualityLevel } from "../game/config";
import { ACHIEVEMENTS, achievementProgress, upgradeCost, aircraftLevel, defaultPlaneSave, type SaveData } from "../game/save";
import { Audio } from "../game/audio";
import { LanguageSelect, useI18n } from "../i18n/react";
import { DifficultySelector } from "./Difficulty";

interface Props {
  save: SaveData;
  set: (fn: (s: SaveData) => SaveData) => void;
  back: () => void;
  toast: (m: string, kind?: string) => void;
}

/* =============================== HANGAR =============================== */
export function Hangar({ save, set, back, toast }: Props) {
  const { t, n } = useI18n();
  const [sel, setSel] = useState(save.selected);
  const plane = getPlane(sel);
  const owned = save.planes.includes(sel);
  const rc = RARITY_COLORS[plane.rarity];
  const canAfford = plane.currency === "coins" ? save.coins >= plane.price : save.crystals >= plane.price;

  const buy = () => {
    if (!canAfford) return toast("INSUFFICIENT FUNDS", "bad");
    set((s) => s.planes.includes(plane.id) ? s : ({
      ...s,
      coins: plane.currency === "coins" ? s.coins - plane.price : s.coins,
      crystals: plane.currency === "crystals" ? s.crystals - plane.price : s.crystals,
      planes: [...s.planes, plane.id],
      selected: plane.id,
      planeData: { ...s.planeData, [plane.id]: s.planeData[plane.id] || defaultPlaneSave() },
    }));
    Audio.playSFX("achievement");
    toast(t("{name} acquired", { name: plane.name }), "good");
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar px-3.5 sm:px-6 py-4 z-10 screen-in">
      <div className="max-w-[640px] mx-auto pb-10">
        <ScreenTitle title="FLIGHT HANGAR" sub="Advanced Tactical Fighters" onBack={back} />

        {/* 3D Showcase Deck */}
        <Panel className="p-4 sm:p-5 flex flex-col items-center relative overflow-hidden border-cyan-400/40">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div
            className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
            style={{ background: `linear-gradient(to top, ${rc.glow}, transparent)` }}
          />

          <div className="relative animate-floaty">
            <PlaneCanvas plane={plane} size={250} spin />
          </div>

          <div className="relative flex items-center gap-3 -mt-2">
            <h3
              className="font-tech text-3xl font-black tracking-wide"
              style={{ color: rc.main, textShadow: `0 0 20px ${rc.glow}` }}
            >
              {plane.name}
            </h3>
            <RarityTag rarity={plane.rarity} />
          </div>

          <div className="text-xs font-tech text-cyan-300 tracking-widest mt-0.5 uppercase">
            {t("ROLE")}: {t(plane.role)} / {t("LV")} {aircraftLevel(save, plane.id)}
          </div>
          <p className="relative text-xs text-slate-300 text-center max-w-[420px] mt-1.5 leading-relaxed">
            {t(plane.desc)}
          </p>

          {/* Stat Specs */}
          <div className="relative w-full max-w-[440px] mt-4 space-y-1.5 panel-soft p-3 rounded">
            <StatRow label="HULL" value={plane.stats.hp} max={200} color="#10f0a0" />
            <StatRow label="SPEED" value={plane.stats.speed / 3.2} max={200} color="#2ee6ff" />
            <StatRow label="FIREPOWER" value={plane.stats.damage * 8} max={200} color="#ff5722" />
            <StatRow label="CADENCE" value={plane.stats.fireRate * 15} max={200} color="#ffd23d" />
            <StatRow label="CRITICAL" value={plane.stats.crit * 500} max={200} color="#ff2d6f" />
          </div>

          {/* SIGNATURE PASSIVE — the airframe identity */}
          <div
            className="relative w-full max-w-[440px] mt-3 panel-soft p-3 rounded"
            style={{ borderColor: `${rc.main}80`, boxShadow: `0 0 18px ${rc.glow}` }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{plane.passive.icon}</span>
              <div>
                <div className="font-tech text-[9px] tracking-[0.25em] text-slate-400">{t("SIGNATURE PASSIVE")}</div>
                <div className="font-tech text-sm font-black" style={{ color: rc.main }}>{t(plane.passive.name)}</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-200 mt-1.5 leading-snug">{t(plane.passive.desc)}</div>
          </div>

          {/* Abilities Loadout */}
          <div className="relative grid grid-cols-2 gap-2.5 w-full max-w-[440px] mt-2.5">
            <div className="panel-soft p-2.5 rounded border-cyan-400/30">
              <div className="font-tech text-xs text-cyan-300 font-bold flex items-center gap-1">
                <span>⚡</span> {t(plane.skill.name)}
              </div>
              <div className="text-[11px] text-slate-300 mt-1 leading-snug">{t(plane.skill.desc)}</div>
              <div className="text-[9px] font-tech text-slate-400 mt-1">{t("Cooldown")}: {n(plane.skill.cd)}s</div>
            </div>
            <div className="panel-soft p-2.5 rounded border-rose-400/30">
              <div className="font-tech text-xs text-rose-300 font-bold flex items-center gap-1">
                <span>💥</span> {t(plane.ultimate.name)}
              </div>
              <div className="text-[11px] text-slate-300 mt-1 leading-snug">{t(plane.ultimate.desc)}</div>
              <div className="text-[9px] font-tech text-slate-400 mt-1">{t("Cooldown")}: {n(plane.ultimate.cd)}s</div>
            </div>
            <div className="panel-soft p-2.5 rounded col-span-2" style={{ borderColor: "rgba(127,240,255,0.4)" }}>
              <div className="font-tech text-xs font-bold flex items-center gap-1" style={{ color: "#7ff0ff" }}>
                <span>🕊</span> {t(plane.evade.name)} / {t("EVASIVE MANEUVER")}
              </div>
              <div className="text-[11px] text-slate-300 mt-1 leading-snug">{t(plane.evade.desc)}</div>
              <div className="text-[9px] font-tech text-slate-400 mt-1">
                {t("Total invulnerability / Fixed 30s cooldown / Key [E]")}
              </div>
            </div>
          </div>

          {/* SYNERGIES */}
          <div className="relative w-full max-w-[440px] mt-2.5 panel-soft p-3 rounded border-amber-400/30">
            <div className="font-tech text-[10px] tracking-widest text-amber-300 font-bold mb-1.5">{t("BUILD SYNERGIES")}</div>
            <div className="space-y-1 text-[10px] text-slate-300 leading-snug">
              <div><span className="font-tech text-amber-200">{t("UPGRADES")} / </span>{t(plane.synergy.upgrade)}</div>
              <div><span className="font-tech text-cyan-200">{t("TALENTS")} / </span>{t(plane.synergy.talent)}</div>
              <div><span className="font-tech text-emerald-200">{t("WINGMAN")} / </span>{t(plane.synergy.wingman)}</div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="relative mt-5 flex gap-3">
            {owned ? (
              <Btn
                variant={save.selected === plane.id ? "default" : "primary"}
                onClick={() => {
                  set((s) => ({ ...s, selected: plane.id }));
                  toast(t("{name} selected", { name: plane.name }), "good");
                }}
                disabled={save.selected === plane.id}
                className="!px-8 !py-3 font-tech text-base"
              >
                {t(save.selected === plane.id ? "ACTIVE COMBATANT" : "DEPLOY JET")}
              </Btn>
            ) : (
              <Btn
                variant="primary"
                onClick={buy}
                disabled={!canAfford}
                className="!px-8 !py-3 font-tech text-base"
              >
                {t("PURCHASE")} {plane.currency === "coins" ? `◉ ${n(plane.price)}` : `◆ ${n(plane.price)}`}
              </Btn>
            )}
          </div>
        </Panel>

        {/* Hangar Aircraft Carousel Selection */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 stagger">
          {PLANES.map((p) => {
            const own = save.planes.includes(p.id);
            const c = RARITY_COLORS[p.rarity];
            const isChosen = sel === p.id;
            return (
              <button
                data-uibtn="1"
                key={p.id}
                onClick={() => {
                  Audio.playSFX("click");
                  setSel(p.id);
                }}
                className={`panel-soft p-2 flex flex-col items-center relative rounded transition-all cursor-pointer ${
                  isChosen ? "border-cyan-400 bg-cyan-950/60 shadow-[0_0_15px_rgba(46,230,255,0.4)]" : "hover:border-slate-500"
                }`}
              >
                <div className="scale-90 -my-1">
                  <PlaneCanvas plane={p} size={70} />
                </div>
                <span className="font-tech text-[10px] font-bold mt-1" style={{ color: c.main }}>
                  {p.name}
                </span>
                {!own && (
                  <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex flex-col items-center justify-center rounded">
                    <span className="text-base">🔒</span>
                    <span className="font-tech text-[8px] text-amber-300 font-bold mt-0.5">
                      {p.currency === "coins" ? `◉ ${p.price}` : `◆ ${p.price}`}
                    </span>
                  </div>
                )}
                {save.selected === p.id && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#2ee6ff]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =============================== ARSENAL =============================== */
export function Arsenal({ save, back }: Props) {
  const { t } = useI18n();
  const plane = getPlane(save.selected);
  const levels = [
    { lv: 1, label: "SINGLE BEAM", desc: "Standard focused ballistic stream" },
    { lv: 2, label: "DUAL CANNON", desc: "Twin linked parallel heavy rounds" },
    { lv: 3, label: "TRI-SPREAD", desc: "Wide cone angled suppression volley" },
    { lv: 4, label: "OVERCHARGED", desc: "Piercing plasma core with side guns" },
    { lv: 5, label: "HYPER OVERDRIVE", desc: "Max caliber annihilation beam" },
  ];

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar px-3.5 sm:px-6 py-4 z-10 screen-in">
      <div className="max-w-[640px] mx-auto pb-10">
        <ScreenTitle title="WEAPONS LAB" sub={`${plane.name} / ${t("Ordnance Systems")}`} onBack={back} />

        <Panel className="p-4 border-cyan-400/40">
          <div className="flex items-center justify-between mb-3 border-b border-cyan-500/20 pb-2">
            <div>
              <div className="font-tech text-base font-bold text-white">{t("MAIN BATTERY")}: {t(plane.weapon)}</div>
              <div className="text-xs text-slate-300">{t("Active Weapon Progression In Battle")}</div>
            </div>
            <div className="font-tech text-xs text-cyan-300 px-2 py-1 rounded bg-cyan-950 border border-cyan-400/30">
              {t("5 OVERCHARGE LEVELS")}
            </div>
          </div>

          <div className="space-y-2">
            {levels.map((l) => (
              <div key={l.lv} className="panel-soft px-3.5 py-2.5 rounded flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-tech text-xs font-bold text-slate-400 w-12">{t("TIER")} {l.lv}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className="w-3.5 h-2 rounded-[1px]"
                        style={{
                          background: i < l.lv ? plane.art.accent : "rgba(255,255,255,0.12)",
                          boxShadow: i < l.lv ? `0 0 8px ${plane.art.accent}` : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="text-right flex-1 min-w-0">
                  <div className="font-tech text-xs font-bold" style={{ color: plane.art.accent }}>
                    {t(l.label)}
                  </div>
                  <div className="text-[10px] text-slate-400">{t(l.desc)}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* EVASIVE MANEUVER */}
        <Panel className="p-4 mt-3" style={{ borderColor: "rgba(127,240,255,0.5)" }}>
          <div className="font-tech text-sm font-bold mb-2 flex items-center gap-1.5" style={{ color: "#7ff0ff" }}>
            <span>🕊</span> {t("EVASIVE MANEUVER")} / {t(plane.evade.name)}
          </div>
          <div className="text-[11px] text-slate-300 leading-relaxed">
            {t("EVASIVE DESCRIPTION")}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 text-center">
            {[
              ["⏱", "30s", "FIXED COOLDOWN"],
              ["🛡", "100%", "DAMAGE IMMUNITY"],
              ["✦", "1.6s", "MANEUVER TIME"],
              ["★", "+3000", "PERFECT EVASION"],
            ].map(([i, v, l]) => (
              <div key={l} className="panel-soft p-2 rounded" style={{ borderColor: "rgba(127,240,255,0.25)" }}>
                <div className="text-base">{i}</div>
                <div className="font-tech text-xs font-bold text-white">{v}</div>
                <div className="text-[9px] text-slate-400 tracking-wider">{t(l)}</div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-amber-200 mt-2 font-tech">
            {t("EVASIVE BONUS")}
          </div>
        </Panel>

        {/* Combat Drops Codex */}
        <Panel className="p-4 mt-3 border-amber-400/40">
          <div className="font-tech text-sm text-amber-300 font-bold mb-2.5 flex items-center gap-1.5">
            <span>📦</span> {t("TACTICAL DROPS & POWER-UPS")}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              ["🔥", "DAMAGE UP", "+70% damage for 12s"],
              ["🛡️", "FORCE SHIELD", "Absorbs 1 direct hit"],
              ["➕", "NANITE HEAL", "Repairs 30% hull health"],
              ["⁂", "MULTI-SHOT", "+1 Projectile spread"],
              ["≡", "BEAM OVERDRIVE", "Piercing laser conversion"],
              ["»", "AFTERBURNER", "+40% evasive speed"],
              ["🚀", "SEEKER MISSILES", "Autonomous homing micro-salvo"],
              ["💣", "SMART BOMB", "Instant screen tactical wipe"],
            ].map(([i, n, d]) => (
              <div key={n} className="panel-soft p-2.5 rounded border-amber-400/20 flex flex-col justify-between">
                <div className="text-xl mb-1">{i}</div>
                <div className="font-tech text-[11px] font-bold text-amber-200">{t(n)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{t(d)}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* TACTICAL SQUADS */}
        <Panel className="p-4 mt-3" style={{ borderColor: "rgba(255,176,32,0.5)" }}>
          <div className="font-tech text-sm text-amber-300 font-bold mb-2.5 flex items-center gap-1.5">
            <span>⚔</span> {t("TACTICAL SQUADS")} / {t("PRIORITISE YOUR TARGETS")}
          </div>
          <div className="grid gap-2">
            {SQUADS.map((sq) => (
              <div key={sq.id} className="panel-soft p-2.5 rounded border-amber-400/20">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-tech text-[11px] font-bold text-white">{sq.name}</span>
                  <span className="font-tech text-[9px] text-slate-400">
                    {sq.units.map((u) => `${u.count}× ${u.id}`).join(" · ")}
                  </span>
                </div>
                <div className="text-[10px] text-amber-200 mt-0.5">⚠ {t(sq.threat)}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Threat Bestiary */}
        <Panel className="p-4 mt-3 border-rose-400/40">
          <div className="font-tech text-sm text-rose-300 font-bold mb-2.5 flex items-center gap-1.5">
            <span>👾</span> {t("THREAT DATABASE")} ({ENEMIES.length})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ENEMIES.map((e) => {
              const roleColor: Record<string, string> = {
                skirmisher: "#2ee6ff", line: "#9fb8cc", heavy: "#ffb020", artillery: "#ff8a3d",
                support: "#3fd0ff", kamikaze: "#ff2d3d", sniper: "#c86bff", elite: "#ffd23d",
              };
              const tags: string[] = [];
              const tr = e.traits;
              if (tr?.auraShield) tags.push("SHIELD AURA");
              if (tr?.auraRate) tags.push("RATE AURA");
              if (tr?.frontArmor) tags.push("FRONT ARMOR");
              if (tr?.telegraph) tags.push("TELEGRAPH");
              if (tr?.evasive) tags.push("EVASIVE");
              if (tr?.enrage) tags.push("ENRAGE");
              if (tr?.splitInto) tags.push("SPLITS");
              if (tr?.repair) tags.push("REPAIRS");
              return (
                <div key={e.id} className="panel-soft p-2.5 rounded flex items-start gap-2 border-rose-500/20">
                  <span className="w-2.5 h-10 rounded-full shrink-0" style={{ background: e.accent, boxShadow: `0 0 10px ${e.accent}` }} />
                  <div className="min-w-0">
                    <div className="font-tech text-xs font-bold text-white truncate">{t(e.name)}</div>
                    <div className="font-tech text-[9px] uppercase tracking-wider" style={{ color: roleColor[e.role] || "#9fb8cc" }}>
                      {t(e.role)}
                    </div>
                    <div className="text-[9px] text-slate-400 capitalize">{t(e.pattern)} / {t(e.fire)}</div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {tags.map((tg) => (
                          <span key={tg} className="text-[8px] font-tech px-1 rounded bg-black/50 border border-white/15 text-slate-300">{t(tg)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* =============================== UPGRADES =============================== */
export function Upgrades({ save, set, back, toast }: Props) {
  const { t, n } = useI18n();
  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar px-3.5 sm:px-6 py-4 z-10 screen-in">
      <div className="max-w-[640px] mx-auto pb-10">
        <ScreenTitle
          title="ENGINEERING DECK"
          sub={`${t("Available Credits")}: ${n(save.coins)}`}
          onBack={back}
        />

        <div className="grid gap-2.5 stagger">
          {UPGRADE_KEYS.map((k: UpgradeKey) => {
            const meta = UPGRADE_META[k];
            const lv = save.upgrades[k];
            const cost = upgradeCost(lv, meta.base);
            const maxed = lv >= 40;

            return (
              <Panel key={k} className="p-3.5 sm:p-4 rounded flex items-center gap-3.5 border-cyan-400/30">
                <div className="w-12 h-12 rounded bg-cyan-950/70 border border-cyan-400/40 flex items-center justify-center text-2xl shrink-0 shadow-[0_0_12px_rgba(46,230,255,0.15)]">
                  {meta.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-tech text-sm font-bold text-white">{t(meta.label)}</span>
                    <span className="font-tech text-xs text-cyan-300 font-bold">LV.{lv} / 40</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">{t(meta.perLevel)}</div>
                  <div className="mt-1.5 bar-track h-2 rounded-full overflow-hidden">
                    <div
                      className="bar-fill h-full bg-cyan-400 rounded-full"
                      style={{ width: `${(lv / 40) * 100}%`, boxShadow: "0 0 8px #2ee6ff" }}
                    />
                  </div>
                </div>

                <Btn
                  variant={maxed ? "default" : "primary"}
                  disabled={maxed || save.coins < cost}
                  onClick={() => {
                    set((s) => ({
                      ...s,
                      coins: s.coins - cost,
                      upgrades: { ...s.upgrades, [k]: s.upgrades[k] + 1 },
                    }));
                    Audio.playSFX("powerup");
                    toast(t("{name} upgraded to level {level}", { name: t(meta.label), level: lv + 1 }), "good");
                  }}
                  className="!px-4 !py-2.5 !text-xs shrink-0 font-bold"
                >
                  {maxed ? t("MAXED") : `◉ ${n(cost)}`}
                </Btn>
              </Panel>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =============================== ACHIEVEMENTS =============================== */
export function Achievements({ save, set, back, toast }: Props) {
  const { t, n } = useI18n();
  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar px-3.5 sm:px-6 py-4 z-10 screen-in">
      <div className="max-w-[640px] mx-auto pb-10">
        <ScreenTitle
          title="MEDALS & CITATIONS"
          sub={t("{current} of {total} records unlocked", { current: save.achievements.length, total: ACHIEVEMENTS.length })}
          onBack={back}
        />

        <div className="grid gap-2.5 stagger">
          {ACHIEVEMENTS.map((a) => {
            const prog = Math.min(a.target, achievementProgress(a, save));
            const done = prog >= a.target;
            const claimed = save.achievements.includes(a.id);

            return (
              <Panel key={a.id} className="p-3.5 rounded flex items-center gap-3.5 border-slate-700/70">
                <div
                  className="w-12 h-12 rounded bg-black/50 border flex items-center justify-center text-2xl shrink-0"
                  style={{
                    borderColor: done ? "#ffd23d" : "rgba(255,255,255,0.15)",
                    filter: done ? "none" : "grayscale(1) opacity(0.4)",
                  }}
                >
                  {a.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-tech text-sm font-bold text-white">{t(a.name)}</div>
                  <div className="text-xs text-slate-400">{t(a.desc)}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 bar-track h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{ width: `${(prog / a.target) * 100}%` }}
                      />
                    </div>
                    <span className="font-tech text-[10px] text-slate-300 font-bold">
                      {prog}/{a.target}
                    </span>
                  </div>
                </div>

                <Btn
                  disabled={!done || claimed}
                  variant={done && !claimed ? "primary" : "default"}
                  className="!px-3.5 !py-2 !text-xs shrink-0 font-bold"
                  onClick={() => {
                    set((s) => s.achievements.includes(a.id) || achievementProgress(a, s) < a.target ? s : ({
                      ...s,
                      achievements: [...s.achievements, a.id],
                      coins: s.coins + a.reward.coins,
                      crystals: s.crystals + a.reward.crystals,
                    }));
                    Audio.playSFX("achievement");
                    toast(`${t("Rewards claimed")}: +${n(a.reward.coins)} / +${n(a.reward.crystals)}`, "good");
                  }}
                >
                  {claimed ? t("CLAIMED") : `◉ ${n(a.reward.coins)}`}
                </Btn>
              </Panel>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =============================== SETTINGS =============================== */
export function Settings({ save, set, back, toast, onReset }: Props & { onReset: () => void }) {
  const { t } = useI18n();
  const [confirmReset, setConfirmReset] = useState(false);
  const s = save.settings;
  const upd = (patch: Partial<SaveData["settings"]>) =>
    set((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar px-3.5 sm:px-6 py-4 z-10 screen-in">
      <div className="max-w-[560px] mx-auto pb-10">
        <ScreenTitle title="SYSTEM CONFIG" sub="Audio, Controls & Graphics" onBack={back} />

        <Panel className="p-4 sm:p-5 space-y-4 border-cyan-400/40 rounded">
          <div className="pb-4 border-b border-cyan-500/20">
            <LanguageSelect />
            <p className="text-xs text-slate-400 mt-2">{t("Applied instantly and saved on this device.")}</p>
          </div>
          <Slider label="MUSIC VOLUME" value={s.music} onChange={(v) => { upd({ music: v }); Audio.setMusicVolume(v); }} />
          <Slider label="SOUND EFFECTS" value={s.sfx} onChange={(v) => { upd({ sfx: v }); Audio.setSfxVolume(v); }} />

          <Row label="AUDIO MUTE">
            <Toggle on={s.muted} onClick={() => { upd({ muted: !s.muted }); Audio.mute(!s.muted); }} />
          </Row>

          <Row label="SCREEN SHAKE">
            <Toggle on={s.shake} onClick={() => upd({ shake: !s.shake })} />
          </Row>

          <Row label="GRAPHICS QUALITY">
            <Choices
              options={["LOW", "MEDIUM", "HIGH"]}
              value={s.quality}
              onChange={(v) => upd({ quality: v as QualityLevel })}
            />
          </Row>

          <DifficultySelector value={s.difficulty} onChange={(difficulty) => upd({ difficulty })} />
          <p className="text-sm text-slate-300 leading-relaxed">{t("REWARD RULE")}</p>
          <Row label="DAMAGE NUMBERS"><Toggle on={s.damageNumbers} onClick={() => upd({ damageNumbers: !s.damageNumbers })} /></Row>
          <Row label="CINEMATICS"><Toggle on={s.cinematics} onClick={() => upd({ cinematics: !s.cinematics })} /></Row>

          <Row label="INPUT METHOD">
            <Choices
              options={["auto", "touch", "mouse", "keyboard"]}
              value={s.control}
              onChange={(v) => upd({ control: v as any })}
            />
          </Row>

          <div className="panel-soft p-3 rounded text-[11px] text-slate-300 leading-relaxed space-y-1">
            <div className="font-tech text-cyan-300 font-bold">{t("PILOT CONTROLS GUIDE")}</div>
            <div>{t("KEYBOARD GUIDE")}</div>
            <div>{t("TOUCH GUIDE")}</div>
          </div>

          <div className="pt-2">
            <Btn
              variant="danger"
              onClick={() => setConfirmReset(true)}
              className="w-full !py-3 text-xs"
            >
              RESET ALL SAVE DATA
            </Btn>
            {confirmReset && <div className="mt-3 text-sm text-rose-200" role="alert">
              <p>{t("Reset confirmation")}</p>
              <div className="flex gap-2 mt-3">
                <Btn variant="danger" onClick={() => { onReset(); setConfirmReset(false); toast(t("Progress reset")); }}>CONFIRM</Btn>
                <Btn onClick={() => setConfirmReset(false)}>CANCEL</Btn>
              </div>
            </div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3 border-b border-cyan-500/10 pb-2.5">
      <span className="font-tech text-xs text-slate-300 font-bold tracking-wider">{t(label)}</span>
      {children}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      data-uibtn="1"
      onClick={() => { Audio.playSFX("click"); onClick(); }}
      className="w-14 h-7 relative rounded border transition-all cursor-pointer"
      style={{
        borderColor: on ? "#2ee6ff" : "rgba(255,255,255,0.25)",
        background: on ? "rgba(46,230,255,0.2)" : "rgba(0,0,0,0.5)",
      }}
    >
      <span
        className="absolute top-[2px] bottom-[2px] w-6 rounded-sm transition-all"
        style={{
          left: on ? "calc(100% - 26px)" : 2,
          background: on ? "#2ee6ff" : "#64748b",
          boxShadow: on ? "0 0 12px #2ee6ff" : "none",
        }}
      />
    </button>
  );
}

function Choices({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-1 flex-wrap justify-end">
      {options.map((o) => (
        <button
          data-uibtn="1"
          key={o}
          onClick={() => { Audio.playSFX("click"); onChange(o); }}
          className="px-2.5 py-1 font-tech text-[10px] font-bold rounded border transition-all cursor-pointer"
          style={{
            borderColor: value === o ? "#2ee6ff" : "rgba(255,255,255,0.15)",
            color: value === o ? "#2ee6ff" : "rgba(200,225,255,0.65)",
            background: value === o ? "rgba(46,230,255,0.2)" : "rgba(0,0,0,0.4)",
            boxShadow: value === o ? "0 0 10px rgba(46,230,255,0.3)" : "none",
          }}
        >
          {t(o.toUpperCase())}
        </button>
      ))}
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { t } = useI18n();
  return (
    <div className="border-b border-cyan-500/10 pb-2.5">
      <div className="flex justify-between font-tech text-xs text-slate-300 font-bold mb-1.5">
        <span>{t(label)}</span>
        <span className="text-cyan-300">{Math.round(value * 100)}%</span>
      </div>
      <input
        data-uibtn="1"
        type="range"
        aria-label={t(label)}
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-400 cursor-pointer"
      />
    </div>
  );
}
