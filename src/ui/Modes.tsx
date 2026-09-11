import { Btn, Panel, ScreenTitle } from "./common";
import { useState } from "react";
import { makeDaily, todayKey } from "../game/data/talents";
import { GALAXIES } from "../game/data/galaxies";
import type { SaveData } from "../game/save";
import type { RunConfig } from "../game/engine";
import { availableRushBosses, runAccess } from "../game/access";
import { useI18n } from "../i18n/react";
import type { DifficultyName } from "../game/config";

export function Modes({
  save, back, launch, toast,
}: {
  save: SaveData; back: () => void; launch: (c: RunConfig) => void; toast: (m: string, k?: string) => void;
}) {
  const { t, n } = useI18n();
  const [boardDifficulty, setBoardDifficulty] = useState<DifficultyName | "all">("all");
  const [boardMode, setBoardMode] = useState("all");
  const daily = makeDaily(todayKey());
  const dailyDone = save.daily.key === daily.id && save.daily.done;
  const dailyStars = save.daily.key === daily.id ? save.daily.stars : 0;
  const dPlanet = GALAXIES[daily.galaxy]?.planets[daily.planet] || GALAXIES[0].planets[0];
  const dailyConfig: RunConfig = { mode: "daily", galaxy: daily.galaxy, planet: daily.planet, map: daily.map, daily };
  const gate = runAccess(save, dailyConfig);
  const dailyLocked = !gate.ok;
  const objective = daily.rule === "nodamage" ? "Hits: at most {target}"
    : daily.rule === "combo" ? "Combo: at least {target}" : daily.rule === "time" ? "Time: at most {target}s"
    : daily.rule === "kills" ? "Kills: at least {target}" : "Abilities: at most {target}";

  const rushReady = availableRushBosses(save).length > 0;
  const board = [...save.leaderboard].filter((item) => (boardDifficulty === "all" || item.difficulty === boardDifficulty) && (boardMode === "all" || item.mode === boardMode))
    .sort((a, b) => b.score - a.score).slice(0, 8);

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar px-3.5 sm:px-6 py-4 z-10 screen-in">
      <div className="max-w-[660px] mx-auto pb-10">
        <ScreenTitle title="OPERATIONS" sub="Endless / Boss Rush / Daily" onBack={back} />

        {/* DAILY CHALLENGE */}
        <Panel className="p-4 relative overflow-hidden border-amber-400/50">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 15% 0%, rgba(255,180,40,0.14), transparent 60%)" }} />
          <div className="relative flex items-start gap-3">
            <div className="text-4xl">{daily.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-tech text-base font-black text-amber-300">{t("DAILY CHALLENGE")}</span>
                <span className="font-tech text-[9px] px-1.5 py-0.5 rounded bg-black/50 border border-amber-400/40 text-amber-200">
                  {daily.id}
                </span>
              </div>
              <div className="font-tech text-sm text-white mt-0.5">{t(daily.name)}</div>
              <div className="text-[11px] text-slate-300">{t(objective, { target: daily.starTargets[2] })}</div>
              <div className="text-[10px] font-tech text-cyan-300 mt-1">
                {dPlanet.emoji} {t(dPlanet.name)} / {t("SECTOR")} {daily.map + 1}
              </div>

              <div className="flex items-center gap-3 mt-2">
                <div className="text-lg tracking-widest">
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ color: i < dailyStars ? "#ffd23d" : "rgba(255,255,255,0.2)" }}>★</span>
                  ))}
                </div>
                <div className="text-[10px] font-tech text-slate-300">
                  {t("DAILY BONUS")} ◉{n(daily.reward.coins)} ◆{daily.reward.crystals}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 mt-2 text-center text-[9px] font-tech">
                {daily.starTargets.map((t, i) => (
                  <div key={i} className="panel-soft py-1 rounded border-amber-400/20">
                    <div className="text-amber-300">{"★".repeat(i + 1)}</div>
                    <div className="text-slate-300">{t}</div>
                  </div>
                ))}
              </div>

              <Btn
                variant="primary"
                className="mt-3 !px-5 !py-2.5 !text-xs"
                disabled={dailyLocked}
                onClick={() => {
                  if (dailyDone) toast(t("DAILY REWARD NOTE"));
                  launch(dailyConfig);
                }}
              >
                {dailyLocked ? "SECTOR LOCKED" : dailyDone ? "REPLAY CHALLENGE" : "ACCEPT CHALLENGE"}
              </Btn>
              <p className="text-xs text-slate-400 mt-2">{t("DAILY REWARD NOTE")}</p>
              {dailyLocked && <p className="text-xs text-amber-200 mt-2">{gate.reason}</p>}
            </div>
          </div>
        </Panel>

        {/* ENDLESS */}
        <Panel className="p-4 mt-3 border-cyan-400/50">
          <div className="flex items-start gap-3">
            <div className="text-4xl">♾️</div>
            <div className="flex-1">
              <div className="font-tech text-base font-black text-cyan-300">{t("ENDLESS SURVIVAL")}</div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                {t("ENDLESS DESCRIPTION")}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-center">
                <div className="panel-soft py-1.5 rounded">
                  <div className="font-tech text-sm text-cyan-200">{save.endless.bestWave}</div>
                  <div className="text-[9px] tracking-widest text-slate-400">{t("BEST WAVE")}</div>
                </div>
                <div className="panel-soft py-1.5 rounded">
                  <div className="font-tech text-sm text-cyan-200">{n(save.endless.bestScore)}</div>
                  <div className="text-[9px] tracking-widest text-slate-400">{t("BEST SCORE")}</div>
                </div>
              </div>
              <Btn
                variant="primary"
                className="mt-3 !px-5 !py-2.5 !text-xs"
                onClick={() => launch({ mode: "endless", galaxy: 0, planet: 0, map: 5 })}
              >
                START ENDLESS RUN
              </Btn>
            </div>
          </div>
        </Panel>

        {/* BOSS RUSH */}
        <Panel className="p-4 mt-3 border-rose-400/50">
          <div className="flex items-start gap-3">
            <div className="text-4xl">👹</div>
            <div className="flex-1">
              <div className="font-tech text-base font-black text-rose-300">{t("BOSS RUSH")}</div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                {t("BOSS RUSH DESCRIPTION")}
              </div>
              <div className="panel-soft py-1.5 rounded mt-2 text-center">
                <div className="font-tech text-sm text-rose-200">{save.endless.bossRushBest}</div>
                <div className="text-[9px] tracking-widest text-slate-400">{t("BEST BOSSES DEFEATED")}</div>
              </div>
              <Btn
                variant="danger"
                className="mt-3 !px-5 !py-2.5 !text-xs"
                disabled={!rushReady}
                onClick={() => launch({ mode: "bossrush", galaxy: 0, planet: 0, map: 9 })}
              >
                {rushReady ? "ENTER THE GAUNTLET" : "CLEAR A PLANET FIRST"}
              </Btn>
            </div>
          </div>
        </Panel>

        {/* LEADERBOARD */}
        <Panel className="p-4 mt-3">
          <div className="font-tech text-sm font-bold text-white mb-2">{t("LOCAL LEADERBOARD")}</div>
          <div className="flex gap-2 flex-wrap mb-3">
            <select className="bg-slate-950 border border-cyan-400/30 rounded p-2 text-xs" value={boardMode} aria-label={t("ALL MODES")} onChange={(e) => setBoardMode(e.target.value)}>
              <option value="all">{t("ALL MODES")}</option>
              {["campaign", "daily", "endless", "bossrush", "secret"].map((mode) => <option key={mode} value={mode}>{t(mode)}</option>)}
            </select>
            <select className="bg-slate-950 border border-cyan-400/30 rounded p-2 text-xs" value={boardDifficulty} aria-label={t("DIFFICULTY LEVEL")}
              onChange={(e) => setBoardDifficulty(e.target.value as DifficultyName | "all")}>
              <option value="all">{t("ALL DIFFICULTIES")}</option>
              {["EASY", "NORMAL", "HARD", "INSANE"].map((d) => <option key={d} value={d}>{t(d)}</option>)}
            </select>
          </div>
          {board.length === 0 ? (
            <div className="text-[11px] text-slate-400">{t("No records yet. Fly a mission to set one.")}</div>
          ) : (
            <div className="grid gap-1">
              {board.map((r, i) => (
                <div key={i} className="panel-soft px-2.5 py-1.5 rounded flex items-center gap-2 text-[11px]">
                  <span className="font-tech font-black w-5" style={{ color: i === 0 ? "#ffd23d" : i === 1 ? "#c9d6e4" : i === 2 ? "#e08a4b" : "#7b8697" }}>
                    {i + 1}
                  </span>
                  <span className="font-tech text-white flex-1">{n(r.score)}</span>
                  <span className="text-cyan-300 uppercase">{t(r.mode)} / {t(r.difficulty || "LEGACY")}</span>
                  {r.wave > 0 && <span className="text-slate-400">W{r.wave}</span>}
                  <span className="text-slate-500">{r.date}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
