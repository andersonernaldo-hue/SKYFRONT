import { PlaneCanvas, RarityTag } from "./common";
import { getPlane, PLANES } from "../game/data/planes";
import type { SaveData } from "../game/save";
import { aircraftLevel, levelCap, planetState } from "../game/save";
import { planeXpForLevel } from "../game/progression";
import { campaignRoute } from "../game/access";
import { getPlanet } from "../game/data/galaxies";
import { LanguageSelect, useI18n } from "../i18n/react";

export type Screen =
  | "menu" | "hangar" | "arsenal" | "upgrades" | "loadout" | "missions" | "modes"
  | "achievements" | "settings" | "game";

/**
 * Arcade main menu: hero block on the left, pilot card + sector CTA +
 * pixel button grid on the right (single column on phones).
 */
export function MainMenu({ save, go, onPlay, accountSlot }: {
  save: SaveData; go: (s: Screen) => void; onPlay: () => void; accountSlot?: React.ReactNode;
}) {
  const { t, n } = useI18n();
  const plane = getPlane(save.selected);
  const currentLevel = aircraftLevel(save);
  const need = planeXpForLevel(currentLevel);
  const xp = save.planeData[save.selected]?.xp ?? 0;
  const route = campaignRoute(save);
  const routePlanet = getPlanet(route.cfg.galaxy, route.cfg.planet);
  const routeState = planetState(save, route.cfg.galaxy, route.cfg.planet);

  // One uniform matrix avoids orphan cells and duplicate-looking wide rows.
  const grid: { id: Screen; label: string; icon: string; color: string; badge?: string }[] = [
    { id: "missions", label: "CAMPAIGN", icon: "◈", color: "#ffb020", badge: `${routeState.maps}/10` },
    { id: "modes", label: "OPERATIONS", icon: "∞", color: "#4de8d8" },
    { id: "hangar", label: "HANGAR", icon: "✈", color: "#2ee6ff" },
    { id: "loadout", label: "LOADOUT", icon: "◆", color: "#b567ff" },
    { id: "upgrades", label: "UPGRADES", icon: "⬆", color: "#10f0a0" },
    { id: "arsenal", label: "ARSENAL", icon: "⚡", color: "#ff2d8f" },
    { id: "achievements", label: "RECORDS", icon: "★", color: "#ffd15c", badge: `${save.achievements.length}` },
    { id: "settings", label: "CONFIG", icon: "⚙", color: "#9fb8cc" },
  ];

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar z-10 screen-in">
      <div className="w-full max-w-[1060px] min-h-full mx-auto px-3.5 sm:px-6 pt-3 pb-4 flex flex-col">

        {/* ============ TOP BAR: chips left · currencies/account right ============ */}
        <div className="flex flex-wrap items-center gap-2 mb-3 shrink-0">
          <span className="px-chip" style={{ borderColor: "#2ee6ff55", color: "#7fe6ff" }}>
            {t(routePlanet.name)} · {t("SECTORS")} {routeState.maps}/10
          </span>
          <span className="px-chip hidden sm:inline-flex" style={{ borderColor: "#ffb02055", color: "#ffd76a" }}>
            {t("LV")} {currentLevel}/{levelCap(save)}
          </span>
          <span className="flex-1" />
          <span className="px-chip" style={{ borderColor: "#a3781e", color: "#ffd23d" }}>
            ◉ {n(save.coins)}
          </span>
          <span className="px-chip" style={{ borderColor: "#1e6ba3", color: "#5fd6ff" }}>
            ◆ {n(save.crystals)}
          </span>
          {accountSlot}
          <LanguageSelect compact />
        </div>

        {/* ============ TWO COLUMNS: hero / actions ============ */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-start md:items-center md:flex-1 py-3 md:py-5">

          {/* ---- HERO ---- */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-3 font-tech text-[10px] tracking-[0.28em] font-bold" style={{ color: "#ff5ba8" }}>
              <span className="hidden md:block w-10 h-px" style={{ background: "#ff5ba8" }} />
              {t("MENU TAGLINE")}
            </div>
            <h1 className="neon-title text-[52px] sm:text-[68px] mt-3">
              <span className="line-a block">SKY</span>
              <span className="line-b block">FRONT</span>
            </h1>
            <p className="text-sm text-slate-300 mt-5 leading-relaxed">
              {t("MENU LINE1")}<br />{t("MENU LINE2")}
            </p>

            {/* stat mini boxes */}
            <div className="stat-grid mt-6 max-w-[380px]">
              <div className="stat-box">
                <div className="font-tech text-[8px] tracking-wider text-slate-400">{t("AIRCRAFT")}</div>
                <div className="font-tech text-sm text-cyan-200 mt-1.5">{t("LV")} {currentLevel}</div>
              </div>
              <div className="stat-box">
                <div className="font-tech text-[8px] tracking-wider text-slate-400">{t("RECORD")}</div>
                <div className="font-tech text-sm text-amber-300 mt-1.5">{save.highScore > 0 ? n(save.highScore) : "—"}</div>
              </div>
              <div className="stat-box">
                <div className="font-tech text-[8px] tracking-wider text-slate-400">{t("FLEET")}</div>
                <div className="font-tech text-sm text-emerald-300 mt-1.5">{save.planes.length}/{PLANES.length}</div>
              </div>
            </div>

            {/* experience bar */}
            <div className="w-full max-w-[380px] mt-6">
              <div className="flex justify-between font-tech text-[8px] tracking-wider text-slate-400 mb-1.5">
                <span>{t("EXPERIENCE")}</span>
                <span>{n(Math.floor(xp))} / {n(need)}</span>
              </div>
              <div className="h-1.5 bg-black/70 border border-white/10">
                <div className="h-full" style={{ width: `${Math.min(100, (xp / need) * 100)}%`, background: "#2ee6ff", boxShadow: "0 0 8px #2ee6ff" }} />
              </div>
            </div>
          </div>

          {/* ---- ACTION COLUMN ---- */}
          <div className="flex flex-col gap-2.5">

            {/* current pilot card */}
            <div className="panel p-4">
              <div className="flex items-center justify-between">
                <span className="font-tech text-[8px] tracking-[0.2em] text-slate-400">{t("CURRENT PILOT")}</span>
                <RarityTag rarity={plane.rarity} />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-[104px] h-[104px] shrink-0 border border-white/10 bg-black/40 flex items-center justify-center overflow-hidden">
                  <PlaneCanvas plane={plane} size={120} />
                </div>
                <div className="min-w-0">
                  <div className="font-tech text-base text-white leading-tight">{plane.name}</div>
                  <span className="inline-block font-tech text-[8px] mt-2 px-2 py-1 border border-cyan-400/50 text-cyan-300 bg-cyan-950/40">
                    {t("LV")} {currentLevel}
                  </span>
                </div>
              </div>
              <div className="mt-3 border border-white/10 bg-black/30 px-3 py-2">
                <div className="font-tech text-[9px] text-amber-300">⚡ {t(plane.weapon)} · {t(plane.passive.name)}</div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">{t(plane.desc)}</div>
              </div>
            </div>

            {/* hazard CTA */}
            <button data-uibtn="1" className="hazard-cta" onClick={onPlay}>
              <span className="cta-icon" aria-hidden="true">▶</span>
              {t("PLAY")}
            </button>
            <p className="text-[11px] text-slate-400 text-center -mt-0.5">
              {route.secret
                ? `${t("SECRET BOSS")} · ${t("AIRCRAFT")} ${t("LV")} ${route.nextLevel}`
                : t("Sector {sector} at aircraft level {level}", { sector: route.nextSector, level: route.nextLevel })}
              {route.training && <span className="text-amber-200"> · {t("{levels} aircraft levels remaining", { levels: route.nextLevel - currentLevel })}</span>}
            </p>

            {/* Balanced destination matrix */}
            <div className="opt-grid stagger">
              {grid.map((item) => (
                <button
                  data-uibtn="1"
                  key={item.id}
                  onClick={() => go(item.id)}
                  className="hex-btn opt-cell menu-option"
                  style={{ borderColor: `${item.color}66`, color: item.color }}
                >
                  <span className="menu-option-icon" aria-hidden="true">{item.icon}</span>
                  <span className="menu-option-label">{t(item.label)}</span>
                  {item.badge && <span className="menu-option-badge">{item.badge}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ============ CONTROLS FOOTER ============ */}
        <div className="panel mt-4 px-4 py-3.5 shrink-0 mb-1">
          <div className="font-tech text-[10px] text-cyan-300 mb-3">🎮 {t("CONTROLS")}</div>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[11px] text-slate-300">
            <div className="flex flex-wrap items-center gap-2">
              <span className="kbd">W A S D</span><span>{t("MOVE")}</span>
              <span className="kbd">SPACE</span><span>{t("SKILL")}</span>
              <span className="kbd">E</span><span>{t("EVADE")}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="kbd">SHIFT</span><span>{t("ULTIMATE")}</span>
              <span className="kbd">B</span><span>{t("BOMB")}</span>
              <span className="kbd">ESC</span><span>{t("PAUSE")}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2.5">{t("TOUCH GUIDE")}</p>
        </div>
      </div>
    </div>
  );
}
