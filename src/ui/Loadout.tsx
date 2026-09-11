import { useMemo, useState } from "react";
import { Btn, Panel, PlaneCanvas, ScreenTitle } from "./common";
import { WINGMEN, getWingman, wingmanStats, wingmanTalentCost, type WingmanId } from "../game/data/wingmen";
import {
  TALENTS, talentCost, PILOTS, SKINS, PLANE_NODES, planeNodeCost, planeXpForLevel,
  getPilot, getSkin, type TalentBranch,
} from "../game/data/talents";
import { getPlane } from "../game/data/planes";
import { defaultPlaneSave, levelCap, type SaveData } from "../game/save";
import { Audio } from "../game/audio";
import { useI18n } from "../i18n/react";

interface Props {
  save: SaveData;
  set: (fn: (s: SaveData) => SaveData) => void;
  back: () => void;
  toast: (m: string, k?: string) => void;
}

type Tab = "wingmen" | "talents" | "plane";

export function Loadout({ save, set, back, toast }: Props) {
  const { t: tr } = useI18n();
  const [tab, setTab] = useState<Tab>("wingmen");
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "wingmen", label: "WINGMEN", icon: "🛰️" },
    { id: "talents", label: "NANOTECH", icon: "🧬" },
    { id: "plane", label: "AIRFRAME", icon: "✈️" },
  ];

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar px-3.5 sm:px-6 py-4 z-10 screen-in">
      <div className="max-w-[680px] mx-auto pb-10">
        <ScreenTitle title="COMBAT LOADOUT" sub="Drones / Nanotech / Airframe" onBack={back} />

        <div className="flex gap-2 mb-3">
          {tabs.map((t) => (
            <button
              data-uibtn="1"
              key={t.id}
              onClick={() => { Audio.playSFX("click"); setTab(t.id); }}
              className="flex-1 panel-soft py-2 rounded font-tech text-[11px] font-bold transition-all cursor-pointer"
              style={{
                borderColor: tab === t.id ? "#2ee6ff" : "rgba(255,255,255,0.12)",
                background: tab === t.id ? "rgba(46,230,255,0.14)" : undefined,
                color: tab === t.id ? "#7fe6ff" : "#c9d7e6",
                boxShadow: tab === t.id ? "0 0 16px rgba(46,230,255,0.25)" : "none",
              }}
            >
              <span className="mr-1">{t.icon}</span>{tr(t.label)}
            </button>
          ))}
        </div>

        {tab === "wingmen" && <WingmenTab save={save} set={set} toast={toast} />}
        {tab === "talents" && <TalentTab save={save} set={set} toast={toast} />}
        {tab === "plane" && <PlaneTab save={save} set={set} toast={toast} />}
      </div>
    </div>
  );
}

/* ============================ WINGMEN ============================ */
function WingmenTab({ save, set, toast }: Omit<Props, "back">) {
  const { t: tr, n: format } = useI18n();
  const [slot, setSlot] = useState(0);
  const cur = save.wingmen[slot];
  const [sel, setSel] = useState<WingmanId>(cur.id === "none" ? "laser" : cur.id);
  const def = getWingman(sel)!;
  const owned = save.ownedWingmen.includes(sel);
  const talents = save.wingmen.find((w) => w.id === sel)?.talents || {};
  const equippedSlot = save.wingmen.findIndex((w) => w.id === sel);
  const stats = wingmanStats(def, talents);

  const buy = () => {
    if (save.coins < def.price.coins || save.crystals < def.price.crystals) return toast("INSUFFICIENT FUNDS", "bad");
    set((s) => ({
      ...s,
      coins: s.coins - def.price.coins,
      crystals: s.crystals - def.price.crystals,
      ownedWingmen: [...s.ownedWingmen, sel],
    }));
    Audio.playSFX("unlock");
    toast(tr("{name} acquired", { name: def.name }), "good");
  };

  const equip = () => {
    set((s) => {
      const w = [...s.wingmen] as SaveData["wingmen"];
      const other = 1 - slot;
      if (w[other].id === sel) w[other] = { id: "none", talents: {} };
      w[slot] = { id: sel, talents: w[slot].id === sel ? w[slot].talents : (w[other].id === sel ? w[other].talents : {}) };
      return { ...s, wingmen: w };
    });
    Audio.playSFX("powerup");
    toast(`${def.name} / ${tr("SLOT")} ${slot + 1}`, "good");
  };

  const unequip = () => {
    set((s) => {
      const w = [...s.wingmen] as SaveData["wingmen"];
      w[slot] = { id: "none", talents: {} };
      return { ...s, wingmen: w };
    });
    toast("SLOT CLEARED");
  };

  const upgradeTalent = (tid: string, cost: number) => {
    if (save.coins < cost) return toast("NOT ENOUGH CREDITS", "bad");
    set((s) => {
      const w = [...s.wingmen] as SaveData["wingmen"];
      const idx = w.findIndex((x) => x.id === sel);
      if (idx < 0) return s;
      const t = { ...w[idx].talents };
      t[tid] = (t[tid] || 0) + 1;
      w[idx] = { ...w[idx], talents: t };
      return { ...s, coins: s.coins - cost, wingmen: w };
    });
    Audio.playSFX("powerup");
  };

  return (
    <>
      {/* slot selector */}
      <div className="flex gap-2 mb-3">
        {[0, 1].map((i) => {
          const w = save.wingmen[i];
          const d = getWingman(w.id);
          return (
            <button
              data-uibtn="1"
              key={i}
              onClick={() => { Audio.playSFX("click"); setSlot(i); if (w.id !== "none") setSel(w.id); }}
              className="flex-1 panel-soft p-2.5 rounded flex items-center gap-2 cursor-pointer transition-all"
              style={{
                borderColor: slot === i ? "#2ee6ff" : "rgba(255,255,255,0.12)",
                boxShadow: slot === i ? "0 0 16px rgba(46,230,255,0.25)" : "none",
              }}
            >
              <div
                className="w-10 h-10 rounded flex items-center justify-center text-lg"
                style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${d ? d.color : "rgba(255,255,255,0.15)"}` }}
              >
                {d ? d.icon : "—"}
              </div>
              <div className="text-left">
                <div className="font-tech text-[9px] text-slate-400">{tr("SLOT")} {i + 1}</div>
                <div className="font-tech text-xs font-bold text-white">{d ? tr(d.name) : tr("EMPTY")}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* drone catalogue */}
      <div className="grid grid-cols-5 gap-2 mb-3 stagger">
        {WINGMEN.map((w) => {
          const own = save.ownedWingmen.includes(w.id);
          return (
            <button
              data-uibtn="1"
              key={w.id}
              onClick={() => { Audio.playSFX("click"); setSel(w.id); }}
              className="panel-soft p-2 rounded flex flex-col items-center cursor-pointer relative"
              style={{
                borderColor: sel === w.id ? w.color : "rgba(255,255,255,0.12)",
                boxShadow: sel === w.id ? `0 0 14px ${w.color}55` : "none",
              }}
            >
              <span className="text-xl">{w.icon}</span>
              <span className="font-tech text-[8px] mt-0.5 text-center leading-tight" style={{ color: w.color }}>
                {w.name.split(" ")[0]}
              </span>
              {!own && <span className="absolute top-0.5 right-0.5 text-[8px]">🔒</span>}
              {save.wingmen.some((x) => x.id === w.id) && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#2ee6ff]" />
              )}
            </button>
          );
        })}
      </div>

      <Panel className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl shrink-0"
            style={{ background: `radial-gradient(circle, ${def.color}33, transparent)`, border: `1px solid ${def.color}` }}
          >
            {def.icon}
          </div>
          <div className="flex-1">
            <div className="font-tech text-lg font-black text-white">{tr(def.name)}</div>
            <div className="font-tech text-[10px] tracking-widest" style={{ color: def.color }}>{tr(def.role)}</div>
            <p className="text-[11px] text-slate-300 mt-1">{tr(def.desc)}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
          <MiniStat label="DMG" value={stats.damage.toFixed(1)} />
          <MiniStat label="RATE" value={`${stats.rate.toFixed(1)}/s`} />
          <MiniStat label="RANGE" value={Math.round(stats.range).toString()} />
          <MiniStat label="SPECIAL" value={stats.special.toFixed(2)} />
        </div>

        <div className="mt-3 flex gap-2">
          {!owned ? (
            <Btn variant="primary" onClick={buy} className="!px-4 !py-2.5 !text-xs">
              {tr("PURCHASE")} {def.price.coins > 0 ? `◉${format(def.price.coins)}` : ""} {def.price.crystals > 0 ? `◆${def.price.crystals}` : ""}
            </Btn>
          ) : equippedSlot === slot ? (
            <Btn variant="danger" onClick={unequip} className="!px-4 !py-2.5 !text-xs">UNEQUIP</Btn>
          ) : (
            <Btn variant="primary" onClick={equip} className="!px-4 !py-2.5 !text-xs">{tr("EQUIP IN SLOT {slot}", { slot: slot + 1 })}</Btn>
          )}
        </div>
      </Panel>

      {/* talent tree */}
      <Panel className="p-4 mt-3">
        <div className="font-tech text-sm font-bold mb-2" style={{ color: def.color }}>
          {tr(def.name)} / {tr("TALENT TREE")}
        </div>
        {!owned && <div className="text-[11px] text-amber-300 mb-2">{tr("Acquire this drone to invest talent points.")}</div>}
        <div className="grid gap-2">
          {def.talents.map((t) => {
            const lv = talents[t.id] || 0;
            const cost = wingmanTalentCost(t, lv);
            const maxed = lv >= t.max;
            const canBuy = owned && !maxed && save.coins >= cost && save.wingmen.some((w) => w.id === sel);
            return (
              <div key={t.id} className="panel-soft p-2.5 rounded flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-tech text-xs font-bold text-white">{tr(t.name)}</span>
                    <span className="font-tech text-[10px]" style={{ color: def.color }}>{lv}/{t.max}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{tr(t.desc)}</div>
                  <div className="flex gap-1 mt-1">
                    {Array.from({ length: t.max }).map((_, i) => (
                      <span
                        key={i}
                        className="h-1.5 flex-1 rounded-full"
                        style={{ background: i < lv ? def.color : "rgba(255,255,255,0.1)", boxShadow: i < lv ? `0 0 6px ${def.color}` : "none" }}
                      />
                    ))}
                  </div>
                </div>
                <Btn
                  variant={canBuy ? "primary" : "default"}
                  disabled={!canBuy}
                  className="!px-3 !py-2 !text-[10px] shrink-0"
                  onClick={() => upgradeTalent(t.id, cost)}
                >
                  {maxed ? tr("MAX") : `◉${format(cost)}`}
                </Btn>
              </div>
            );
          })}
        </div>
        {owned && !save.wingmen.some((w) => w.id === sel) && (
          <div className="text-[10px] text-amber-300 mt-2">{tr("Equip this drone to spend talents on it.")}</div>
        )}
      </Panel>
    </>
  );
}

/* ============================ NANOTECH TALENTS ============================ */
function TalentTab({ save, set, toast }: Omit<Props, "back">) {
  const { t: tr, n: format } = useI18n();
  const branches: { id: TalentBranch; color: string; icon: string }[] = [
    { id: "CORE", color: "#ffffff", icon: "🔷" },
    { id: "OFFENSE", color: "#ff5722", icon: "🔥" },
    { id: "DEFENSE", color: "#3fa9ff", icon: "🛡️" },
    { id: "UTILITY", color: "#ffd23d", icon: "🧲" },
  ];
  const spent = Object.values(save.talents || {}).reduce((a, b) => a + b, 0);

  const buy = (id: string) => {
    const node = TALENTS.find((t) => t.id === id)!;
    const lv = save.talents[id] || 0;
    const cost = talentCost(node, lv);
    if (lv >= node.max) return;
    if (node.requires && (save.talents[node.requires] || 0) < 1) return toast("REQUIRES PARENT NODE", "bad");
    if (save.coins < cost.coins || save.crystals < cost.crystals) return toast("INSUFFICIENT RESOURCES", "bad");
    set((s) => ({
      ...s,
      coins: s.coins - cost.coins,
      crystals: s.crystals - cost.crystals,
      talents: { ...s.talents, [id]: lv + 1 },
    }));
    Audio.playSFX("powerup");
  };

  return (
    <>
      <Panel className="p-3 mb-3 flex items-center justify-between">
        <div>
          <div className="font-tech text-sm font-bold text-white">{tr("NANOTECH IMPLANT GRID")}</div>
          <div className="text-[11px] text-slate-300">{tr("Permanent upgrades applied to every aircraft you fly.")}</div>
        </div>
        <div className="font-tech text-xs text-cyan-300 text-right">
          <div>{spent} {tr("NODES")}</div>
          <div className="text-slate-400 text-[10px]">◉{format(save.coins)} ◆{save.crystals}</div>
        </div>
      </Panel>

      {branches.map((br) => (
        <div key={br.id} className="mb-3">
          <div className="font-tech text-[11px] font-bold mb-1.5 flex items-center gap-1.5" style={{ color: br.color }}>
            <span>{br.icon}</span> {tr(br.id)} / {tr("BRANCH")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TALENTS.filter((t) => t.branch === br.id).map((t) => {
              const lv = save.talents[t.id] || 0;
              const cost = talentCost(t, lv);
              const locked = !!t.requires && (save.talents[t.requires] || 0) < 1;
              const maxed = lv >= t.max;
              const afford = save.coins >= cost.coins && save.crystals >= cost.crystals;
              return (
                <button
                  data-uibtn="1"
                  key={t.id}
                  onClick={() => buy(t.id)}
                  disabled={locked || maxed || !afford}
                  className="panel-soft p-2.5 rounded text-left transition-all cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    borderColor: maxed ? "#ffd23d" : lv > 0 ? br.color : "rgba(255,255,255,0.12)",
                    opacity: locked ? 0.45 : 1,
                    boxShadow: lv > 0 ? `0 0 12px ${br.color}33` : "none",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{t.icon}</span>
                    <span className="font-tech text-[10px]" style={{ color: maxed ? "#ffd23d" : br.color }}>
                      {lv}/{t.max}
                    </span>
                  </div>
                  <div className="font-tech text-[11px] font-bold text-white mt-0.5 leading-tight">{tr(t.name)}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">{tr(t.desc)}</div>
                  <div className="mt-1 flex gap-0.5">
                    {Array.from({ length: t.max }).map((_, i) => (
                      <span key={i} className="h-1 flex-1 rounded-full" style={{ background: i < lv ? br.color : "rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                  <div className="font-tech text-[9px] mt-1" style={{ color: maxed ? "#ffd23d" : afford ? "#10f0a0" : "#ff7a90" }}>
                    {locked ? `${tr("NEEDS")} ${tr(TALENTS.find((x) => x.id === t.requires)?.name || "")}` : maxed ? tr("MAXED") : `◉${format(cost.coins)} ◆${cost.crystals}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

/* ============================ AIRFRAME / PILOT / SKIN ============================ */
function PlaneTab({ save, set, toast }: Omit<Props, "back">) {
  const { t: tr, n: format } = useI18n();
  const planeId = save.selected;
  const plane = getPlane(planeId);
  const pd = save.planeData[planeId] || defaultPlaneSave();
  const need = planeXpForLevel(pd.level);
  const pilot = getPilot(pd.pilot);

  const upNode = (id: string) => {
    const node = PLANE_NODES.find((n) => n.id === id)!;
    const lv = pd.nodes[id] || 0;
    if (lv >= node.max) return;
    const cost = planeNodeCost(node, lv);
    if (save.coins < cost) return toast("NOT ENOUGH CREDITS", "bad");
    set((s) => {
      const data = { ...(s.planeData[planeId] || defaultPlaneSave()) };
      data.nodes = { ...data.nodes, [id]: lv + 1 };
      return { ...s, coins: s.coins - cost, planeData: { ...s.planeData, [planeId]: data } };
    });
    Audio.playSFX("powerup");
  };

  const choosePilot = (id: string) => {
    const p = PILOTS.find((x) => x.id === id)!;
    if (!save.pilots.includes(id)) {
      if (save.coins < p.price.coins || save.crystals < p.price.crystals) return toast("INSUFFICIENT FUNDS", "bad");
      set((s) => ({ ...s, coins: s.coins - p.price.coins, crystals: s.crystals - p.price.crystals, pilots: [...s.pilots, id] }));
      Audio.playSFX("unlock");
      toast(tr("{name} recruited", { name: p.callsign }), "good");
      return;
    }
    set((s) => {
      const data = { ...(s.planeData[planeId] || defaultPlaneSave()), pilot: id };
      return { ...s, planeData: { ...s.planeData, [planeId]: data } };
    });
    Audio.playSFX("click");
  };

  const chooseSkin = (id: string) => {
    const sk = SKINS.find((x) => x.id === id)!;
    if (!pd.skins.includes(id)) {
      if (save.coins < sk.price.coins || save.crystals < sk.price.crystals) return toast("INSUFFICIENT FUNDS", "bad");
      set((s) => {
        const data = { ...(s.planeData[planeId] || defaultPlaneSave()) };
        data.skins = [...data.skins, id];
        data.skin = id;
        return { ...s, coins: s.coins - sk.price.coins, crystals: s.crystals - sk.price.crystals, planeData: { ...s.planeData, [planeId]: data } };
      });
      Audio.playSFX("unlock");
      toast(tr("{name} unlocked", { name: tr(sk.name) }), "good");
      return;
    }
    set((s) => {
      const data = { ...(s.planeData[planeId] || defaultPlaneSave()), skin: id };
      return { ...s, planeData: { ...s.planeData, [planeId]: data } };
    });
    Audio.playSFX("click");
  };

  const previewPlane = useMemo(() => ({ ...plane, art: { ...plane.art, ...(getSkin(pd.skin)?.palette || {}) } }), [plane, pd.skin]);

  return (
    <>
      <Panel className="p-3 flex items-center gap-3">
        <div className="shrink-0 -my-2"><PlaneCanvas plane={previewPlane as any} size={104} spin /></div>
        <div className="flex-1">
          <div className="font-tech text-lg font-black text-white">{plane.name}</div>
          <div className="font-tech text-[10px] text-cyan-300">{tr("AIRFRAME LEVEL {level}", { level: pd.level })} / {levelCap(save)}</div>
          <div className="mt-1.5 bar-track h-2 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, (pd.xp / need) * 100)}%`, boxShadow: "0 0 8px #2ee6ff" }} />
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{format(pd.xp)} / {format(need)} {tr("AIRFRAME XP")}</div>
        </div>
      </Panel>
      <p className="text-sm text-slate-300 leading-relaxed mt-3">{tr("PROGRESSION RULE")}</p>

      {/* nodes */}
      <div className="grid grid-cols-2 gap-2 mt-3 stagger">
        {PLANE_NODES.map((n) => {
          const lv = pd.nodes[n.id] || 0;
          const cost = planeNodeCost(n, lv);
          const maxed = lv >= n.max;
          return (
            <button
              data-uibtn="1"
              key={n.id}
              disabled={maxed || save.coins < cost}
              onClick={() => upNode(n.id)}
              className="panel-soft p-2.5 rounded text-left cursor-pointer disabled:cursor-not-allowed"
              style={{ borderColor: lv > 0 ? "#2ee6ff" : "rgba(255,255,255,0.12)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{n.icon}</span>
                <span className="font-tech text-[10px] text-cyan-300">{lv}/{n.max}</span>
              </div>
              <div className="font-tech text-[11px] font-bold text-white">{tr(n.name)}</div>
              <div className="text-[10px] text-slate-400">{tr(n.desc)}</div>
              <div className="mt-1 flex gap-0.5">
                {Array.from({ length: n.max }).map((_, i) => (
                  <span key={i} className="h-1 flex-1 rounded-full" style={{ background: i < lv ? "#2ee6ff" : "rgba(255,255,255,0.1)" }} />
                ))}
              </div>
              <div className="font-tech text-[9px] mt-1" style={{ color: maxed ? "#ffd23d" : save.coins >= cost ? "#10f0a0" : "#ff7a90" }}>
                {maxed ? tr("MAXED") : `◉${format(cost)}`}
              </div>
            </button>
          );
        })}
      </div>

      {/* pilots */}
      <Panel className="p-3 mt-3">
        <div className="font-tech text-sm font-bold text-white mb-2">{tr("PILOT ASSIGNMENT")} / <span style={{ color: pilot.color }}>{pilot.callsign}</span></div>
        <div className="grid grid-cols-3 gap-2">
          {PILOTS.map((p) => {
            const own = save.pilots.includes(p.id);
            const active = pd.pilot === p.id;
            return (
              <button
                data-uibtn="1"
                key={p.id}
                onClick={() => choosePilot(p.id)}
                className="panel-soft p-2 rounded text-center cursor-pointer relative"
                style={{
                  borderColor: active ? p.color : "rgba(255,255,255,0.12)",
                  boxShadow: active ? `0 0 14px ${p.color}55` : "none",
                }}
              >
                <div className="text-2xl">{p.portrait}</div>
                <div className="font-tech text-[10px] font-bold" style={{ color: p.color }}>{p.callsign}</div>
                <div className="text-[9px] text-slate-400 leading-tight">{tr(p.perk)}</div>
                <div className="text-[8px] text-slate-300 mt-0.5 leading-tight">{tr(p.desc)}</div>
                {!own && (
                  <div className="font-tech text-[9px] text-amber-300 mt-1">
                    {p.price.coins > 0 ? `◉${p.price.coins.toLocaleString()}` : `◆${p.price.crystals}`}
                  </div>
                )}
                {active && <span className="absolute top-1 right-1 text-[9px] text-cyan-300">●</span>}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* skins */}
      <Panel className="p-3 mt-3">
        <div className="font-tech text-sm font-bold text-white mb-2">{tr("CAMOUFLAGE & LIVERIES")}</div>
        <div className="grid grid-cols-4 gap-2">
          {SKINS.map((sk) => {
            const own = pd.skins.includes(sk.id);
            const active = pd.skin === sk.id;
            const c = sk.palette?.accent || "#c9d6e4";
            return (
              <button
                data-uibtn="1"
                key={sk.id}
                onClick={() => chooseSkin(sk.id)}
                className="panel-soft p-2 rounded text-center cursor-pointer"
                style={{ borderColor: active ? c : "rgba(255,255,255,0.12)", boxShadow: active ? `0 0 12px ${c}66` : "none" }}
              >
                <div
                  className="w-full h-6 rounded mb-1"
                  style={{ background: `linear-gradient(90deg, ${sk.palette?.bodyDark || "#5d7186"}, ${sk.palette?.body || "#c9d6e4"}, ${c})` }}
                />
                <div className="font-tech text-[9px] font-bold text-white leading-tight">{tr(sk.name)}</div>
                {!own && (
                  <div className="font-tech text-[8px] text-amber-300">
                    {sk.price.coins > 0 ? `◉${sk.price.coins.toLocaleString()}` : `◆${sk.price.crystals}`}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Panel>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
  return (
    <div className="panel-soft py-1.5 rounded">
      <div className="font-tech text-xs text-cyan-200 font-bold">{value}</div>
      <div className="text-[8px] tracking-widest text-slate-400">{t(label)}</div>
    </div>
  );
}
