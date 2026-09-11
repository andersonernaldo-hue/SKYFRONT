import { useEffect, useState } from "react";
import type { HudState } from "../game/engine";
import type { PlaneDef } from "../game/data/planes";
import { CONFIG } from "../game/config";
import { useI18n } from "../i18n/react";

export function Hud({
  hud, plane, onPause, onSkill, onUlt, onBomb, onEvade, touch,
}: {
  hud: HudState; plane: PlaneDef; onPause: () => void;
  onSkill: () => void; onUlt: () => void; onBomb: () => void; onEvade: () => void; touch: boolean;
}) {
  const { t, n: fmt } = useI18n();
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const hpColor = hpPct > 55 ? "#10f0a0" : hpPct > 25 ? "#ffb020" : "#ff3355";
  const [comboPop, setComboPop] = useState(0);

  useEffect(() => {
    if (hud.combo > 1) setComboPop((c) => c + 1);
  }, [hud.combo]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {/* Cockpit vignette — darkens edges so HUD text always reads */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 50%, transparent 62%, rgba(0, 12, 26, 0.55) 100%)" }}
      />
      {/* CRITICAL HULL WARNING — unmissable, but not obstructive */}
      {hpPct <= 25 && !hud.paused && (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse-glow"
          style={{ boxShadow: "inset 0 0 120px rgba(255,40,60,0.5)", background: "radial-gradient(circle at 50% 50%, transparent 55%, rgba(255,20,40,0.16) 100%)" }}
        />
      )}

      {/* TOP HEADER BAR (Mobile & PC responsive) */}
      <div className="absolute top-0 left-0 right-0 px-2 sm:px-4 pt-2.5 flex items-start justify-between gap-2 z-20">
        {/* Mission & Score Panel */}
        <div
          className="panel px-3 sm:px-4 py-2 flex-1 max-w-[440px]"
          style={{
            background: "linear-gradient(135deg, rgba(10, 22, 44, 0.92), rgba(4, 10, 22, 0.96))",
            borderColor: "rgba(46, 230, 255, 0.4)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-tech text-[10px] tracking-wider text-cyan-400 font-bold">{t("SCORE")}</span>
              <span className="font-tech text-xl sm:text-2xl font-black text-white glow-text leading-none">
                {fmt(hud.score)}
              </span>
            </div>
            {/* Coins badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/50 border border-amber-400/40 text-amber-300 font-tech text-xs">
              <span className="text-amber-400 animate-pulse">◉</span>
              <span>{fmt(hud.coins)}</span>
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px] sm:text-[11px] font-tech text-slate-300 border-t border-cyan-500/20 pt-1">
            <span className="flex items-center gap-1 text-cyan-200 truncate">
              <span>{hud.worldEmoji}</span>
              <span className="font-bold tracking-wide uppercase truncate">{t(hud.mapName || hud.world)}</span>
            </span>
            <span className="text-slate-400 font-medium truncate max-w-[46%]">
              {hud.mode === "endless" ? (
                <>{t("WAVE")} <span className="text-white font-bold">{hud.wave}</span> ∞</>
              ) : hud.mode === "bossrush" ? (
                <span className="text-rose-300 font-bold">{t("BOSS RUSH")}</span>
              ) : (
                <>{t("WAVE")} <span className="text-white font-bold">{Math.min(hud.wave, hud.waves)}</span>/{hud.waves}</>
              )}
            </span>
          </div>
        </div>

        {/* Tactical Pause Button */}
        <button
          data-uibtn="1"
          onClick={onPause}
          aria-label={t("PAUSE")}
          className="pointer-events-auto hex-btn !px-3.5 !py-2.5 text-xs sm:text-sm flex items-center gap-1.5 border-cyan-400/60 shadow-[0_0_15px_rgba(46,230,255,0.3)] hover:scale-105"
        >
          <span className="text-base leading-none">⏸</span>
          <span className="hidden sm:inline text-[10px] tracking-widest">{t("PAUSE")}</span>
        </button>
      </div>

      {/* COMBAT TELEMETRY (HP & Weapon status) */}
      <div className="absolute top-[78px] sm:top-[82px] left-2 sm:left-4 right-2 sm:right-4 flex items-start justify-between gap-2 z-10">
        {/* Left: Hull Armor Gauge & Weapon Level */}
        <div className="w-[62%] max-w-[340px] panel-soft p-2 sm:p-2.5 rounded border-cyan-400/30">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-tech mb-1">
            <span className="text-slate-300 font-bold flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: hpColor, boxShadow: `0 0 8px ${hpColor}` }} />
              {t("HULL INTEGRITY")}
            </span>
            <span className="font-black" style={{ color: hpColor }}>
              {Math.ceil(hud.hp)} / {hud.maxHp}
            </span>
          </div>

          {/* Segmented HP Bar with tick marks for instant reading */}
          <div className="bar-track h-4 rounded-sm p-[1px] relative">
            <div
              className="bar-fill h-full rounded-sm transition-all"
              style={{
                width: `${hpPct}%`,
                background: `linear-gradient(90deg, ${hpColor} 0%, #ffffff 140%)`,
                boxShadow: `0 0 16px ${hpColor}`,
              }}
            />
            <div className="absolute inset-0 flex pointer-events-none">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex-1 border-r border-black/45 last:border-r-0" />
              ))}
            </div>
          </div>

          {/* Weapon Level Pips & Defenses */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-tech text-[9px] text-cyan-300 mr-1 font-bold">{t("WEAPON")}</span>
              {Array.from({ length: 5 }).map((_, i) => {
                const active = i < hud.weaponLevel;
                return (
                  <div
                    key={i}
                    className="h-2 w-4 sm:w-5 rounded-[1px] transition-all"
                    style={{
                      background: active
                        ? `linear-gradient(180deg, ${plane.art.accent}, #ffffff)`
                        : "rgba(255, 255, 255, 0.08)",
                      boxShadow: active ? `0 0 10px ${plane.art.accent}` : "none",
                      border: active ? `1px solid ${plane.art.accent}` : "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  />
                );
              })}
              <span className="font-tech text-[10px] text-white font-bold ml-1">LV.{hud.weaponLevel}</span>
            </div>

            {/* Defense: shield pips + bomb count */}
            <div className="flex items-center gap-1.5">
              {hud.shield > 0 && (
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: Math.min(4, hud.shield) }).map((_, i) => (
                    <span
                      key={i}
                      className="w-2.5 h-2.5 rotate-45 rounded-[1px]"
                      style={{ background: "#3fa9ff", boxShadow: "0 0 8px #3fa9ff" }}
                    />
                  ))}
                </span>
              )}
              {hud.bombs > 0 && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-400/70 text-rose-200 text-[10px] font-tech font-bold">
                  💣{hud.bombs}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Dynamic Combo Multiplier & Active Buffs */}
        <div className="flex flex-col items-end gap-1.5">
          {hud.combo > 1 && (
            <div
              key={comboPop}
              className="rise panel-soft px-3 py-1.5 flex flex-col items-end border-amber-400/50"
              style={{
                background: "linear-gradient(135deg, rgba(40, 25, 5, 0.85), rgba(15, 10, 0, 0.95))",
                boxShadow: "0 0 20px rgba(255, 176, 32, 0.25)",
              }}
            >
              <div className="flex items-baseline gap-1">
                <span className="font-tech text-[10px] font-bold text-amber-400">COMBO</span>
                <span className="font-tech font-black text-2xl sm:text-3xl text-amber-300 glow-text-gold leading-none">
                  x{hud.combo}
                </span>
              </div>
              <div className="text-[9px] font-tech text-amber-200/80 tracking-wider">
                {hud.multiplier.toFixed(1)}x {t("MULTIPLIER")}
              </div>
              {/* Combo decay meter */}
              <div className="w-24 h-1 bg-black/60 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-amber-400 transition-all duration-75"
                  style={{ width: `${(hud.comboTimer / Math.max(1, hud.comboWindow)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Active Buff Pills */}
          <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
            {hud.buffs.map((b) => (
              <div
                key={b.id}
                className="panel-soft px-2 py-0.5 text-[10px] font-tech rounded flex items-center gap-1 border-cyan-400/40 bg-cyan-950/70 text-cyan-200 animate-pulse"
              >
                <span>{b.label}</span>
                <span className="font-bold">{b.t.toFixed(0)}s</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WINGMEN / EVENT / OBJECTIVE STRIP */}
      <div className="absolute left-2 sm:left-4 flex flex-col gap-1.5 z-10" style={{ top: hud.bossMaxHp > 0 ? 240 : 176 }}>
        {hud.wingmen.length > 0 && (
          <div className="flex gap-1.5">
            {hud.wingmen.map((w, i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-md flex items-center justify-center text-sm relative overflow-hidden"
                style={{
                  background: "rgba(4,10,22,0.8)",
                  border: `1px solid ${w.color}`,
                  boxShadow: `0 0 10px ${w.color}55`,
                }}
              >
                <span className="relative z-10">{w.icon}</span>
                <span
                  className="absolute bottom-0 left-0 right-0 transition-all"
                  style={{ height: `${w.charge * 100}%`, background: w.color, opacity: 0.28 }}
                />
              </div>
            ))}
          </div>
        )}

        {hud.passiveName && (
          <div
            className="panel-soft px-2 py-1 rounded flex items-center gap-2"
            style={{
              borderColor: hud.passiveValue >= 0.999 ? "rgba(255,210,60,0.9)" : `${plane.art.accent}66`,
              boxShadow: hud.passiveValue >= 0.999 ? "0 0 14px rgba(255,210,60,0.5)" : "none",
            }}
          >
            <span className="text-sm leading-none">{hud.passiveIcon}</span>
            <div className="flex flex-col">
              <span className="font-tech text-[8px] tracking-wider text-slate-300 leading-none">{t(hud.passiveName)}</span>
              <div className="w-16 h-1 bg-black/60 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, hud.passiveValue * 100)}%`,
                    background: hud.passiveValue >= 0.999 ? "#ffd23d" : plane.art.accent,
                    boxShadow: `0 0 6px ${hud.passiveValue >= 0.999 ? "#ffd23d" : plane.art.accent}`,
                  }}
                />
              </div>
            </div>
            <span className="font-tech text-[9px] font-bold" style={{ color: hud.passiveValue >= 0.999 ? "#ffd23d" : "#9fb8cc" }}>
              {t(hud.passiveLabel)}
            </span>
          </div>
        )}

        {hud.dailyText && (
          <div
            className="panel-soft px-2.5 py-1 font-tech text-[10px] font-bold rounded"
            style={{ borderColor: hud.dailyOk ? "rgba(46,230,255,0.5)" : "rgba(255,60,80,0.7)", color: hud.dailyOk ? "#7fe6ff" : "#ff7a90" }}
          >
            🎯 {t(hud.dailyText)}
          </div>
        )}
      </div>

      {/* DYNAMIC EVENT BANNER */}
      {hud.eventName && (
        <div className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-4 z-10 rise">
          <div
            className="panel px-3 py-2 text-center"
            style={{ borderColor: hud.empLock > 0 ? "rgba(120,200,255,0.8)" : "rgba(255,176,32,0.7)" }}
          >
            <div className="font-tech text-[10px] font-black tracking-widest text-amber-300 animate-pulse">
              {t(hud.eventName)}
            </div>
            <div className="font-tech text-[9px] text-slate-300">{hud.eventTime.toFixed(0)}s</div>
            {hud.empLock > 0 && (
              <div className="font-tech text-[9px] text-sky-300 mt-0.5 blink">{t("ABILITIES OFFLINE")}</div>
            )}
          </div>
        </div>
      )}

      {/* BOSS HEALTH BAR (EPIC PRESENTATION) */}
      {hud.bossMaxHp > 0 && (
        <div className="absolute top-[152px] sm:top-[160px] left-1/2 -translate-x-1/2 w-[92%] max-w-[540px] rise z-20">
          <div className="panel px-3.5 py-2 border-rose-500/70" style={{ background: "rgba(18, 5, 12, 0.92)" }}>
            <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-xs font-tech mb-1.5">
              <span className="text-rose-400 font-black tracking-widest glow-text-red flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                ⚠ {hud.bossName}
              </span>
              <span className={`font-bold tracking-wider ${hud.bossPhase >= 4 ? "text-amber-400 animate-pulse" : "text-rose-300"}`}>
                {t("PHASE")} {hud.bossPhase} {hud.bossPhase >= 4 ? `/ ${t("ENRAGED")}` : ""}
                {hud.bossPartsTotal > 0 && (
                  <span className="ml-2 text-slate-300">{t("PARTS")} {hud.bossPartsTotal - hud.bossParts}/{hud.bossPartsTotal}</span>
                )}
              </span>
            </div>

            <div className="bar-track h-4 rounded-sm p-[1px] border-rose-500/50 relative">
              <div
                className="bar-fill h-full rounded-sm"
                style={{
                  width: `${Math.max(0, Math.min(100, (hud.bossHp / hud.bossMaxHp) * 100))}%`,
                  background:
                    hud.bossPhase >= 4
                      ? "linear-gradient(90deg, #ff1744 0%, #ff9100 50%, #ffffff 100%)"
                      : "linear-gradient(90deg, #d50000 0%, #ff4081 70%, #ffffff 100%)",
                  boxShadow: "0 0 20px rgba(255, 23, 68, 0.8)",
                }}
              />
              {/* phase thresholds at 70 / 40 / 10 % */}
              {[10, 40, 70].map((pct) => (
                <div
                  key={pct}
                  className="absolute top-0 bottom-0 w-[2px] bg-black/70"
                  style={{ left: `${pct}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM ACTION BUTTONS (MOBILE & PC) */}
      <div className="absolute bottom-5 left-0 right-0 px-3 sm:px-6 flex items-end justify-between z-20">
        {/* Left Ability: Evasive Maneuver + Special Skill */}
        <div className="pointer-events-auto flex flex-col items-center gap-4">
          <AbilityBtn
            label="EVADE"
            hint={touch ? "" : "E"}
            name={plane.evade.name}
            cd={hud.evadeCd}
            max={hud.evadeMax}
            color="#7ff0ff"
            onClick={onEvade}
            icon="🕊"
            small
            active={hud.evadeActive}
          />
          <AbilityBtn
            label="SKILL"
            hint={touch ? "" : "SPACE"}
            name={plane.skill.name}
            cd={hud.skillCd}
            max={hud.skillMax}
            color="#2ee6ff"
            onClick={onSkill}
            icon="⚡"
          />
        </div>

        {/* Right Abilities: Smart Bomb + Ultimate Barrage */}
        <div className="flex items-end gap-3 pointer-events-auto">
          <AbilityBtn
            label="BOMB"
            hint={touch ? "" : "B"}
            name={`x${hud.bombs}`}
            cd={hud.bombs > 0 ? 0 : 1}
            max={1}
            color="#ffb020"
            onClick={onBomb}
            icon="💣"
            small
          />
          <AbilityBtn
            label="ULTIMATE"
            hint={touch ? "" : "SHIFT"}
            name={plane.ultimate.name}
            cd={hud.ultCd}
            max={hud.ultMax}
            color="#ff2d6f"
            onClick={onUlt}
            icon="💥"
          />
        </div>
      </div>

      {CONFIG.DEBUG && (
        <div className="absolute bottom-24 left-3 text-[10px] font-mono text-lime-400 bg-black/70 px-2 py-1 rounded">
          FPS {hud.fps.toFixed(0)} • ENT {hud.entities} • PROJ {hud.projectiles}
        </div>
      )}
    </div>
  );
}

function AbilityBtn({
  label, name, cd, max, color, onClick, icon, hint, small, active,
}: {
  label: string; name: string; cd: number; max: number; color: string;
  onClick: () => void; icon: string; hint?: string; small?: boolean; active?: boolean;
}) {
  const { t } = useI18n();
  const ready = cd <= 0;
  const pct = max > 0 ? Math.max(0, Math.min(100, (1 - cd / max) * 100)) : 100;
  const size = small ? 62 : 82;

  return (
    <button
      data-uibtn="1"
      onClick={onClick}
      aria-label={`${t(label)}: ${ready ? t("READY") : `${Math.ceil(cd)}s`}`}
      aria-disabled={!ready}
      className="group relative flex flex-col items-center justify-center rounded-full transition-all duration-150 active:scale-95 cursor-pointer"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${pct}%, rgba(255,255,255,0.06) ${pct}%)`,
        boxShadow: active
          ? `0 0 34px ${color}, inset 0 0 22px ${color}88`
          : ready
          ? `0 0 25px ${color}88, inset 0 0 15px ${color}44`
          : "0 0 10px rgba(0,0,0,0.5)",
        border: `2px solid ${active ? "#ffffff" : ready ? color : "rgba(255,255,255,0.15)"}`,
      }}
    >
      <span className="absolute inset-[4px] rounded-full bg-[#060e1d]/90 flex flex-col items-center justify-center backdrop-blur-md transition-all group-hover:bg-[#0a1830]">
        <span
          className="transition-transform duration-200 group-hover:scale-110"
          style={{
            fontSize: small ? 20 : 26,
            filter: ready ? `drop-shadow(0 0 6px ${color})` : "grayscale(1) opacity(0.4)",
          }}
        >
          {icon}
        </span>
        {!ready && max > 1 && (
          <span className="font-tech text-[11px] font-bold text-white mt-0.5">{cd < 10 ? cd.toFixed(1) : Math.ceil(cd)}s</span>
        )}
        {ready && (
          <span className="font-tech text-[8px] font-extrabold tracking-widest text-slate-300 mt-0.5">
            {t(label)}
          </span>
        )}
      </span>

      {!small ? (
        <span className="absolute -bottom-5 text-[9px] font-tech font-bold text-slate-300 whitespace-nowrap bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
          {hint ? <span className="text-cyan-400 mr-1">{hint}</span> : null}
          {t(name)}
        </span>
      ) : hint ? (
        <span className="absolute -bottom-4 text-[8px] font-tech font-bold text-cyan-300 whitespace-nowrap bg-black/60 px-1 rounded border border-white/10">
          {hint}
        </span>
      ) : null}
    </button>
  );
}
