import { useEffect, useRef, useState } from "react";
import { Btn, Panel, ScreenTitle } from "./common";
import { GALAXIES, getMaps, findBoss, sectorBossFor, planetMaxLevel, sectorIdentity, type PlanetDef } from "../game/data/galaxies";
import { canFightSecret, mapAccess, isPlanetUnlocked, planetState, aircraftLevel, sectorRequiredLevel, type SaveData } from "../game/save";
import { planeXpForLevel } from "../game/progression";
import { Audio } from "../game/audio";
import type { RunConfig } from "../game/engine";
import { useI18n } from "../i18n/react";
import { DifficultySelector } from "./Difficulty";
import { scaleReward, sectorContract } from "../game/economy";

interface Props {
  save: SaveData;
  back: () => void;
  launch: (cfg: RunConfig) => void;
  toast: (m: string, k?: string) => void;
  set: (fn: (s: SaveData) => SaveData) => void;
  playCinematic: (planet: PlanetDef, g: number, p: number) => void;
}

/** All planets across both galaxies as one flat tab row (reference layout). */
const FLAT: { g: number; p: number; def: PlanetDef }[] = GALAXIES.flatMap((gal, g) =>
  gal.planets.map((def, p) => ({ g, p, def })));

/* ============================ SOLAR SYSTEM ============================ */
export function GalaxyMap({ save, back, launch, toast, set, playCinematic }: Props) {
  const { t, n } = useI18n();
  // default tab: the furthest planet the player can enter
  const furthest = (() => {
    let last = 0;
    FLAT.forEach((item, i) => { if (isPlanetUnlocked(save, item.g, item.p)) last = i; });
    return last;
  })();
  const [tab, setTab] = useState(furthest);
  const sel = FLAT[Math.min(tab, FLAT.length - 1)];
  const planeLevel = aircraftLevel(save);
  const xp = save.planeData[save.selected]?.xp ?? 0;
  const need = planeXpForLevel(planeLevel);
  const cap = planetMaxLevel(sel.g, sel.p);

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar px-3.5 sm:px-6 py-4 z-10 screen-in">
      <div className="max-w-[1020px] mx-auto pb-10">
        <div className="flex items-start justify-between gap-2">
          <ScreenTitle title="SOLAR SYSTEM" sub="SYSTEM SUB" onBack={back} />
          <span className="px-chip mt-1" style={{ borderColor: "#a3781e", color: "#ffd23d" }}>◉ {n(save.coins)}</span>
        </div>

        {/* pilot bar */}
        <div className="panel px-4 py-3 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 font-tech text-[9px]">
            <span className="text-white">{save.planes.includes(save.selected) ? t("AIRCRAFT") : ""} {t("LEVEL")} <span className="text-cyan-300">{planeLevel}</span> / {t("CAP LV")} {cap}</span>
            <span className="text-slate-400">{n(Math.floor(xp))} / {n(need)} EXP</span>
          </div>
          <div className="h-1.5 mt-2 bg-black/70 border border-white/10">
            <div className="h-full" style={{ width: `${Math.min(100, (xp / need) * 100)}%`, background: "#2ee6ff", boxShadow: "0 0 8px #2ee6ff" }} />
          </div>
        </div>

        {/* planet tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
          {FLAT.map((item, i) => {
            const unlocked = isPlanetUnlocked(save, item.g, item.p);
            const st = planetState(save, item.g, item.p);
            return (
              <button
                data-uibtn="1"
                key={item.def.id}
                disabled={!unlocked}
                onClick={() => { Audio.playSFX("click"); setTab(i); }}
                className={`planet-tab shrink-0 ${i === tab ? "active" : ""} ${unlocked ? "" : "locked"}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="planet-orb"
                    style={{ background: `radial-gradient(circle at 32% 28%, ${item.def.sky[2]}, ${item.def.sky[0]} 70%)`, boxShadow: i === tab ? `0 0 14px ${item.def.fog}` : "none" }}
                    aria-hidden="true"
                  />
                  <div className="font-tech text-[10px] text-white flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{t(item.def.name)}</span> {!unlocked && <span aria-hidden="true">🔒</span>}
                  </div>
                </div>
                <div className="font-tech text-[8px] mt-1.5" style={{ color: i === tab ? "#ff9dc6" : "#66738f" }}>
                  {t("CAP LV")} {planetMaxLevel(item.g, item.p)}
                </div>
                <div className="font-tech text-[8px] mt-1" style={{ color: st.secret ? "#ffd23d" : "#66738f" }}>
                  {st.secret ? t("MASTERED") : `${st.maps}/10`}
                </div>
                <div className="tab-underline" />
              </button>
            );
          })}
        </div>

        <PlanetBody
          key={sel.def.id}
          save={save} galaxy={sel.g} planet={sel.p}
          launch={launch} toast={toast} set={set} playCinematic={playCinematic}
        />
      </div>
    </div>
  );
}

/* ============================ PLANET BODY (banner + sectors + secret) ============================ */
function PlanetBody({
  save, galaxy, planet, launch, toast, set, playCinematic,
}: {
  save: SaveData; galaxy: number; planet: number;
  launch: (c: RunConfig) => void; toast: (m: string, k?: string) => void;
  set: (fn: (s: SaveData) => SaveData) => void;
  playCinematic: (p: PlanetDef, g: number, pi: number) => void;
}) {
  const { t, n } = useI18n();
  const p = GALAXIES[galaxy].planets[planet];
  const maps = getMaps(p);
  const st = planetState(save, galaxy, planet);
  const secretGate = canFightSecret(save, galaxy, planet);
  const boss = findBoss(p.secretBoss);
  const planeLevel = aircraftLevel(save);
  const canPay = save.coins >= p.secretFee.coins && save.crystals >= p.secretFee.crystals;

  const payAndFight = () => {
    if (!secretGate.ok) { toast(secretGate.reason, "bad"); return; }
    if (!canPay) { toast("INSUFFICIENT ENTRY FEE", "bad"); return; }
    // Payment and confirmation are centralized, including retries and restarts.
    launch({ mode: "secret", galaxy, planet, map: 9 });
  };

  return (
    <>
      {/* planet banner */}
      <div
        className="relative overflow-hidden border border-white/10 p-4 flex items-center gap-4 mb-4"
        style={{ background: `linear-gradient(105deg, ${p.sky[0]}dd 0%, #3d0a3f99 55%, #0a0f1d 100%)` }}
      >
        <div
          className="w-16 h-16 shrink-0 border border-white/25 flex items-center justify-center text-3xl"
          style={{ background: `radial-gradient(circle at 35% 30%, ${p.sky[2]}, ${p.sky[0]})`, boxShadow: `0 0 24px ${p.fog}` }}
        >
          {p.emoji}
        </div>
        <div className="min-w-0">
          <h3 className="font-tech text-xl sm:text-2xl font-black uppercase" style={{ textShadow: "0 0 18px rgba(46,230,255,0.4)" }}>
            {t(p.name)}
          </h3>
          <p className="text-xs text-slate-200/90 mt-1 line-clamp-1">{t(p.desc)}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-chip !py-1 !text-[8px]" style={{ borderColor: "#ff5ba866", color: "#ff9dc6" }}>
              {t("SECTORS")} {st.maps}/10
            </span>
            <span className="px-chip !py-1 !text-[8px]" style={{ borderColor: "#ffb02055", color: "#ffd76a" }}>
              {t("LV")} {planeLevel}/{planetMaxLevel(galaxy, planet)}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-slate-300 leading-relaxed mb-3">{t("PROGRESSION RULE")}</p>
        <DifficultySelector value={save.settings.difficulty} onChange={(difficulty) => set((s) => ({ ...s, settings: { ...s.settings, difficulty } }))} />
      </div>

      {/* sector grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 stagger">
        {maps.map((m, i) => {
          const access = mapAccess(save, galaxy, planet, i);
          const unlocked = access.ok;
          const cleared = i < st.maps;
          const stars = st.stars?.[i] || 0;
          const warlord = findBoss(sectorBossFor(galaxy, planet, i));
          const ident = sectorIdentity(i);
          const required = sectorRequiredLevel(galaxy, planet, i);
          const reward = scaleReward(sectorContract(galaxy, planet, i), save.settings.difficulty);
          return (
            <button
              data-uibtn="1"
              key={i}
              disabled={!unlocked}
              title={access.reason || `${t("SECTOR REWARD")}: ${n(reward.coins)} ${t("CREDITS")} / ${n(reward.xp)} XP`}
              aria-label={`${t("SECTOR")} ${i + 1}, ${t("AIRCRAFT")} ${t("LV")} ${required}. ${access.reason}`}
              onClick={() => { Audio.playSFX("click"); launch({ mode: "campaign", galaxy, planet, map: i }); }}
              className={`sector-card relative panel-soft text-left cursor-pointer disabled:cursor-not-allowed flex flex-col ${cleared ? "is-cleared" : unlocked ? "is-next" : "is-locked"}`}
              style={{ ["--sc" as any]: cleared ? "#10f0a0" : unlocked ? "#2ee6ff" : "#334155" }}
            >
              <span className="sector-stripe" aria-hidden="true" />
              <div className="p-2.5 flex-1">
                <div className="flex items-start justify-between gap-1">
                  <span className="font-tech text-[8px] text-slate-500">S{i + 1}</span>
                  {!unlocked && <span className="text-xs" aria-hidden="true">🔒</span>}
                </div>
                <div className="font-tech text-[10px] text-cyan-100 leading-relaxed mt-1 min-h-[34px]">
                  {t(m.name)}
                </div>
                <div className="font-tech text-[8px] leading-relaxed mt-1 min-h-[24px] flex items-start gap-1" style={{ color: "#ff5b6e" }}>
                  <span aria-hidden="true" className="opacity-80">☠</span><span>{warlord.name}</span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="font-tech text-[10px]" title={t(ident.label)}>{ident.icon}</span>
                  <span className="text-[10px] tracking-tight" style={{ color: cleared ? "#ffd23d" : "#3a4666" }}>
                    {"★".repeat(Math.max(cleared ? 1 : 0, stars))}{"☆".repeat(Math.max(0, 3 - Math.max(cleared ? 1 : 0, stars)))}
                  </span>
                </div>
                {m.event !== "none" && (
                  <span className="inline-block mt-2 px-2 py-1 font-tech text-[8px] border rounded-sm" style={{ borderColor: "#2ee6ff44", color: "#7fe6ff", background: "#07131f" }}>
                    ⚠ {t(m.event.toUpperCase())}
                  </span>
                )}
              </div>
              <div className={`sector-level w-full flex items-center justify-between font-tech ${planeLevel < required ? "is-locked" : ""}`}>
                <span className="text-[8px]">{unlocked ? (cleared ? t("REPLAY") : t("READY")) : `${t("LEVEL")} ${required}`}</span>
                <span className="text-[8px] text-slate-500">+{n(reward.xp)} XP</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-400 leading-relaxed mt-3">{t("FIRST CLEAR NOTE")}</p>

      {/* SECRET BOSS — left info, right checklist (reference layout) */}
      <Panel className={`p-4 mt-5 relative overflow-hidden secret-panel ${st.secret ? "is-done" : ""}`}>
        <div className="absolute inset-0 grid-bg opacity-15" />
        <div className="secret-scan" aria-hidden="true" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 0% 0%, ${st.secret ? "rgba(255,210,60,0.12)" : "rgba(255,45,90,0.10)"}, transparent 60%)` }}
        />
        <div className="relative grid sm:grid-cols-[1fr_auto] gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-tech text-[9px] tracking-[0.22em]" style={{ color: "#ff5b6e" }}>
              <span className="text-lg leading-none" aria-hidden="true">{st.secret ? "🏆" : "💀"}</span> {t("SECRET BOSS")}
            </div>
            <h3 className="font-tech text-lg sm:text-xl font-black uppercase mt-1.5" style={{ color: "#ff5b6e", textShadow: "0 0 16px rgba(255,45,90,0.4)" }}>
              {boss.name}
            </h3>
            <p className="text-xs text-slate-300 mt-1 italic">{t(boss.title)}</p>
            <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">{t("SECRET RULE")}</p>
            {st.secret && <p className="font-tech text-[8px] text-amber-300 mt-2.5">✔ {t("ALREADY DEFEATED")}</p>}
          </div>
          <div className="sm:w-[260px] flex flex-col gap-1.5 sm:items-end">
            <Req ok={st.maps >= 10} text={`${t("10 SECTORS")} (${st.maps}/10)`} />
            <Req ok={planeLevel >= planetMaxLevel(galaxy, planet)} text={`${t("AIRCRAFT LEVEL")} ${planeLevel}/${planetMaxLevel(galaxy, planet)}`} />
            <Req ok={canPay} text={`${t("ENTRY FEE")} ◉${n(p.secretFee.coins)} ◆${n(p.secretFee.crystals)}`} />
            <button
              data-uibtn="1"
              disabled={!secretGate.ok || !canPay}
              onClick={payAndFight}
              className="hex-btn danger w-full sm:w-auto mt-2 px-6 py-4 !text-[11px]"
              style={secretGate.ok && canPay ? { borderColor: "#ffd23d", color: "#ffd76a", background: "#1c1203" } : undefined}
            >
              ▶ {t(st.secret ? "REMATCH" : "CHALLENGE")} (◉{n(p.secretFee.coins)})
            </button>
            {!secretGate.ok && <p className="text-[11px] text-amber-200 sm:text-right">{secretGate.reason}</p>}
            <p className="text-[10px] text-slate-500 sm:text-right">{t("ENTRY PER ATTEMPT")}</p>
          </div>
        </div>
      </Panel>

      <Btn className="mt-4 !text-[9px] !py-2.5" onClick={() => playCinematic(p, galaxy, planet)}>{t("CINEMATICS")}</Btn>
    </>
  );
}

function Req({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 font-tech text-[9px]" style={{ color: ok ? "#10f0a0" : "#8b96ad" }}>
      <span aria-hidden="true" className="text-[10px]">{ok ? "●" : "○"}</span> {text}
    </div>
  );
}

/* ============================ CINEMATIC ============================ */
export function Cinematic({
  planet, galaxyName, secret, onDone,
}: {
  planet: PlanetDef; galaxyName: string; secret?: boolean; onDone: () => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const doneRef = useRef(false);
  const callback = useRef(onDone);
  callback.current = onDone;
  const finish = () => { if (!doneRef.current) { doneRef.current = true; callback.current(); } };
  const lines = secret
    ? ["SIGNAL DETECTED", "SOMETHING ANCIENT IS AWAKE", "IT HAS BEEN WAITING FOR YOU"]
    : planet.intro;

  useEffect(() => {
    Audio.playMusic("CINEMATIC", true);
    Audio.playSFX("cinematic");
    const timers = [
      setTimeout(() => setStep(1), 1400),
      setTimeout(() => setStep(2), 2800),
      setTimeout(() => setStep(3), 4200),
      setTimeout(finish, 5400),
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      onClick={finish}
      style={{ background: `radial-gradient(circle at 50% 40%, ${planet.sky[1]}, #02040a 75%)` }}
    >
      <div className="absolute inset-0 grid-bg opacity-25" />
      <div className="absolute inset-0 scanlines" />

      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => (
          <span
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              width: 1 + (i % 3),
              height: 1 + (i % 3),
              opacity: 0.2 + ((i % 5) / 8),
              animation: `floaty ${2 + (i % 5)}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <div
        className="relative w-40 h-40 rounded-full flex items-center justify-center text-6xl animate-floaty"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${planet.sky[2]}, ${planet.sky[0]})`,
          boxShadow: `0 0 70px ${planet.fog}, inset -18px -18px 50px rgba(0,0,0,0.6)`,
        }}
      >
        {planet.emoji}
      </div>

      <div className="relative mt-6 text-center px-6">
        <div className="font-tech text-[10px] tracking-[0.5em] text-cyan-300">{galaxyName}</div>
        <h2 className="font-display text-3xl sm:text-4xl text-white glow-text mt-2 uppercase">{t(planet.name)}</h2>
        <div className="mt-4 space-y-2 h-24">
          {lines.map((l, i) => (
            <div
              key={i}
              className="font-tech text-[10px] sm:text-xs text-slate-200 transition-all duration-500"
              style={{ opacity: step > i ? 1 : 0, transform: step > i ? "none" : "translateY(10px)" }}
            >
              {t(l)}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 font-tech text-[10px] text-slate-400 tracking-widest blink">
        {t("TAP TO SKIP")}
      </div>
    </div>
  );
}
