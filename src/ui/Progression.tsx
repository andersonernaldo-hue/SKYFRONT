import { useEffect, useRef, useState } from "react";
import { Btn, Panel, ScreenTitle } from "./common";
import { GALAXIES, getMaps, findBoss, sectorBossFor, planetMaxLevel, sectorIdentity, type PlanetDef } from "../game/data/galaxies";
import { canFightSecret, mapAccess, isPlanetUnlocked, planetState, aircraftLevel, sectorRequiredLevel, type SaveData } from "../game/save";
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

/* ============================ GALAXY MAP ============================ */
export function GalaxyMap({ save, back, launch, toast, set, playCinematic }: Props) {
  const { t } = useI18n();
  const [gi, setGi] = useState(0);
  const [pi, setPi] = useState<number | null>(null);

  if (pi !== null) {
    return (
      <PlanetMap
        save={save} galaxy={gi} planet={pi}
        back={() => setPi(null)}
        launch={launch} toast={toast} set={set} playCinematic={playCinematic}
      />
    );
  }

  const gal = GALAXIES[gi];
  const galUnlocked = gi < save.galaxyProgress;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar px-3.5 sm:px-6 py-4 z-10 screen-in">
      <div className="max-w-[660px] mx-auto pb-10">
        <ScreenTitle title="STAR CHART" sub="Galactic Campaign" onBack={back} />

        {/* galaxy switcher */}
        <div className="flex gap-2 mb-3">
          {GALAXIES.map((g, i) => {
            const unlocked = i < save.galaxyProgress;
            return (
              <button
                data-uibtn="1"
                key={g.id}
                onClick={() => { Audio.playSFX("click"); setGi(i); }}
                className="flex-1 panel-soft px-3 py-2.5 rounded text-left transition-all cursor-pointer"
                style={{
                  borderColor: gi === i ? g.color : "rgba(255,255,255,0.12)",
                  boxShadow: gi === i ? `0 0 18px ${g.color}44` : "none",
                  opacity: unlocked ? 1 : 0.5,
                }}
              >
                <div className="font-tech text-[10px] tracking-widest" style={{ color: g.color }}>
                  {t("GALAXY")} {g.id}
                </div>
                <div className="font-tech text-sm font-black text-white">{g.name}</div>
                <div className="text-[9px] text-slate-400">{t(unlocked ? g.subtitle : "LOCKED")}</div>
              </button>
            );
          })}
        </div>

        <Panel className="p-3 mb-3" >
          <p className="text-xs text-slate-300 leading-relaxed">{t(gal.desc)}</p>
          {!galUnlocked && (
            <p className="text-[11px] text-amber-300 font-tech mt-1.5">
              {t("Complete galaxy {galaxy} first", { galaxy: gal.id - 1 })}
            </p>
          )}
        </Panel>

        {/* planet nodes */}
        <div className="grid gap-3 stagger">
          {gal.planets.map((p, i) => {
            const unlocked = isPlanetUnlocked(save, gi, i);
            const st = planetState(save, gi, i);
            const pct = (st.maps / 10) * 100;
            return (
              <Panel
                key={p.id}
                className={`p-3.5 flex items-center gap-3.5 transition-all ${unlocked ? "" : "opacity-55"}`}
                
              >
                <div
                  className="w-[68px] h-[68px] rounded-full flex items-center justify-center text-3xl shrink-0 border-2"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${p.sky[2]}, ${p.sky[0]})`,
                    borderColor: st.secret ? "#ffd23d" : unlocked ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)",
                    boxShadow: `0 0 22px ${p.fog}`,
                  }}
                >
                  {p.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-tech text-base font-black text-white">{t(p.name)}</span>
                    <span className="text-[9px] font-tech text-amber-300 border border-amber-400/60 px-1.5 rounded">{t("MAX LV")} {planetMaxLevel(gi, i)}</span>
                    {st.secret && <span className="text-[9px] font-tech text-amber-300 border border-amber-400 px-1.5 rounded">{t("MASTERED")}</span>}
                    {!st.secret && st.maps >= 10 && <span className="text-[9px] font-tech text-rose-300 border border-rose-400 px-1.5 rounded">{t("SECRET BOSS")}</span>}
                  </div>
                  <div className="text-[11px] text-slate-300 line-clamp-1">{t(p.desc)}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 bar-track h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#2ee6ff,#fff)", boxShadow: "0 0 8px #2ee6ff" }} />
                    </div>
                    <span className="font-tech text-[10px] text-cyan-300 font-bold">{st.maps}/10</span>
                  </div>
                </div>

                <Btn
                  variant={unlocked ? "primary" : "default"}
                  disabled={!unlocked}
                  onClick={() => setPi(i)}
                  className="!px-4 !py-3 !text-xs shrink-0"
                >
                  {unlocked ? "ENTER" : "🔒"}
                </Btn>
              </Panel>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================ PLANET / 10 MAPS ============================ */
function PlanetMap({
  save, galaxy, planet, back, launch, toast, set, playCinematic,
}: {
  save: SaveData; galaxy: number; planet: number; back: () => void;
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
    <div className="absolute inset-0 overflow-y-auto no-scrollbar px-3.5 sm:px-6 py-4 z-10 screen-in">
      <div className="max-w-[660px] mx-auto pb-10">
        <ScreenTitle title={p.name} sub={`${GALAXIES[galaxy].name} / ${t("SECTOR GRID")}`} onBack={back} />

        <Panel className="p-3 mb-3 flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
            style={{ background: `radial-gradient(circle at 35% 30%, ${p.sky[2]}, ${p.sky[0]})`, boxShadow: `0 0 20px ${p.fog}` }}
          >
            {p.emoji}
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-300">{t(p.desc)}</p>
            <p className="text-[10px] font-tech text-cyan-300 mt-1">
              {t("SECTORS CLEARED")} {st.maps}/10
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-tech text-[9px] text-amber-300 whitespace-nowrap">
                {t("AIRCRAFT")} {t("LV")} {planeLevel}/{planetMaxLevel(galaxy, planet)}
              </span>
              <div className="flex-1 bar-track h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, (planeLevel / planetMaxLevel(galaxy, planet)) * 100)}%`, background: "linear-gradient(90deg,#ffb020,#fff)", boxShadow: "0 0 8px #ffb020" }}
                />
              </div>
              <span className="font-tech text-[9px] text-slate-400">{t("MAX LV")} {planetMaxLevel(galaxy, planet)}</span>
            </div>
          </div>
        </Panel>

        <div className="mb-4">
          <p className="text-sm text-slate-300 leading-relaxed mb-3">{t("PROGRESSION RULE")}</p>
          <DifficultySelector value={save.settings.difficulty} onChange={(difficulty) => set((s) => ({ ...s, settings: { ...s.settings, difficulty } }))} />
        </div>

        {/* 10 map nodes */}
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
                className="panel-soft p-2 rounded flex flex-col items-center text-center transition-all cursor-pointer disabled:cursor-not-allowed"
                style={{
                  borderColor: cleared ? "rgba(16,240,160,0.5)" : unlocked ? "rgba(46,230,255,0.55)" : "rgba(255,255,255,0.1)",
                  opacity: unlocked ? 1 : 0.45,
                  boxShadow: unlocked && !cleared ? "0 0 14px rgba(46,230,255,0.25)" : "none",
                }}
              >
                <div className="flex items-center gap-1">
                    <span className="font-tech text-[10px] text-slate-400">{t("SECTOR")}</span>
                  <span className="font-tech text-sm font-black text-white">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="text-[9px] font-tech text-cyan-200 leading-tight mt-1 min-h-[32px] flex items-center">
                  {t(m.name)}
                </div>
                <div className="text-[9px] font-tech mt-0.5" style={{ color: "#7ff0ff" }}>
                  {ident.icon} {t(ident.label)}
                </div>
                <div className="text-[8px] text-slate-400">
                  {m.waves} {t("WAVES")} + {t("BOSS")}
                </div>
                <div className="text-[8px] font-tech text-rose-300 leading-tight mt-1 min-h-[25px] flex items-center justify-center">
                  {warlord.name}
                </div>
                {m.event !== "none" && (
                  <div className="text-[8px] font-tech text-amber-300 mt-0.5">
                    {t(m.event.toUpperCase())}
                  </div>
                )}
                <div className="mt-1 text-[9px]">
                  {cleared ? (
                    <span className="text-amber-300">{"★".repeat(Math.max(1, stars))}{"☆".repeat(Math.max(0, 3 - Math.max(1, stars)))}</span>
                  ) : unlocked ? (
                    <span className="text-cyan-300 font-tech">{t("READY")}</span>
                  ) : (
                    <span className="text-slate-500">🔒</span>
                  )}
                </div>
                <div className={`sector-level w-full mt-2 ${planeLevel < required ? "is-locked" : ""}`}>
                  {t("AIRCRAFT")} {t("LV")} {required}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">◉ {n(reward.coins)} / +{n(reward.xp)} XP</div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mt-3">{t("FIRST CLEAR NOTE")}</p>

        {/* SECRET BOSS NODE */}
        <Panel
          className="p-4 mt-4 relative overflow-hidden"
          
        >
          <div className="absolute inset-0 grid-bg opacity-20" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(circle at 50% 0%, ${st.secret ? "rgba(255,210,60,0.16)" : "rgba(181,103,255,0.18)"}, transparent 70%)` }}
          />
          <div className="relative flex items-start gap-3">
            <div className="text-4xl">{st.secret ? "🏆" : "☠️"}</div>
            <div className="flex-1">
              <div className="font-tech text-lg font-black text-white tracking-wide">
                {t("SECRET BOSS")} / {boss.name}
              </div>
              <div className="text-[11px] text-purple-200 italic">{t(boss.title)}</div>
              <div className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                {t("SECRET RULE")}
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2.5 text-center">
                <Req ok={st.maps >= 10} label="10 SECTORS" value={`${st.maps}/10`} />
                <Req ok={planeLevel >= planetMaxLevel(galaxy, planet)} label="AIRCRAFT LEVEL" value={`${planeLevel}/${planetMaxLevel(galaxy, planet)}`} />
                <Req ok={canPay} label="ENTRY FEE" value={`${n(p.secretFee.coins)} / ${n(p.secretFee.crystals)}`} />
              </div>

              {st.secret && <p className="text-xs text-amber-300 mt-3">{t("ALREADY DEFEATED")}</p>}
              <Btn variant="danger" className="mt-3 !px-4 !py-3 !text-xs" disabled={!secretGate.ok || !canPay} onClick={payAndFight}>
                {t(st.secret ? "REMATCH" : "CHALLENGE SECRET BOSS")}
              </Btn>
              {!secretGate.ok && <p className="text-xs text-amber-200 mt-2">{secretGate.reason}</p>}
              <p className="text-xs text-slate-400 mt-2">{t("ENTRY PER ATTEMPT")}</p>
            </div>
          </div>
        </Panel>
        <Btn className="mt-4 !text-xs" onClick={() => playCinematic(p, galaxy, planet)}>{t("CINEMATICS")}</Btn>
      </div>
    </div>
  );
}

function Req({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  const { t } = useI18n();
  return (
    <div
      className="panel-soft py-1.5 px-1 rounded"
      style={{ borderColor: ok ? "rgba(16,240,160,0.55)" : "rgba(255,80,100,0.45)" }}
    >
      <div className="font-tech text-[10px] font-bold" style={{ color: ok ? "#10f0a0" : "#ff7a90" }}>
        {ok ? "✔" : "✖"} {value}
      </div>
      <div className="text-[8px] tracking-widest text-slate-400">{t(label)}</div>
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

      {/* travelling stars */}
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
        <h2 className="font-tech text-3xl sm:text-4xl font-black text-white glow-text mt-1">{t(planet.name)}</h2>
        <div className="mt-4 space-y-1 h-24">
          {lines.map((l, i) => (
            <div
              key={i}
              className="font-tech text-xs sm:text-sm text-slate-200 transition-all duration-500"
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
