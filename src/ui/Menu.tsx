import { Btn, PlaneCanvas, RarityTag } from "./common";
import { getPlane } from "../game/data/planes";
import type { SaveData } from "../game/save";
import { aircraftLevel, levelCap } from "../game/save";
import { planeXpForLevel } from "../game/progression";
import { campaignRoute } from "../game/access";
import { LanguageSelect, useI18n } from "../i18n/react";

export type Screen =
  | "menu" | "hangar" | "arsenal" | "upgrades" | "loadout" | "missions" | "modes"
  | "achievements" | "settings" | "game";

export function MainMenu({ save, go, onPlay, accountSlot }: {
  save: SaveData; go: (s: Screen) => void; onPlay: () => void; accountSlot?: React.ReactNode;
}) {
  const { t, n } = useI18n();
  const plane = getPlane(save.selected);
  const currentLevel = aircraftLevel(save);
  const need = planeXpForLevel(currentLevel);
  const xp = save.planeData[save.selected]?.xp ?? 0;
  const route = campaignRoute(save);

  const sectorsCleared = Object.values(save.planetProgress).reduce((a, b) => a + (b.maps || 0), 0);
  const dronesEquipped = save.wingmen.filter((w) => w.id !== "none").length;

  const navItems: { id: Screen; label: string; icon: string; desc: string; badge?: string }[] = [
    { id: "missions", label: "CAMPAIGN", icon: "🗺️", desc: "Galaxies", badge: `${sectorsCleared}/70` },
    { id: "loadout", label: "LOADOUT", icon: "🛰️", desc: "Drones / Tech", badge: `${dronesEquipped}/2` },
    { id: "modes", label: "OPERATIONS", icon: "♾️", desc: "Endless / Daily" },
    { id: "hangar", label: "HANGAR", icon: "✈️", desc: "6 Fighters" },
    { id: "upgrades", label: "UPGRADES", icon: "🔧", desc: "Global Tech" },
    { id: "arsenal", label: "ARSENAL", icon: "⚡", desc: "Codex" },
    { id: "achievements", label: "RECORDS", icon: "🏆", desc: "Awards", badge: `${save.achievements.length}` },
    { id: "settings", label: "CONFIG", icon: "⚙️", desc: "Audio/Video" },
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center overflow-y-auto no-scrollbar z-10 screen-in">
      <div className="w-full max-w-[620px] px-3.5 sm:px-6 pt-3 pb-8 flex flex-col items-center">
        <div className="flex w-full items-center justify-between gap-2 mb-2">
          {accountSlot ?? <span />}
          <LanguageSelect compact />
        </div>
        {/* TOP STATUS BAR: Profile, Rank, Coins & Crystals */}
        <div className="w-full flex items-center justify-between gap-2 panel px-3 py-2 rounded-md mb-2">
          {/* Level & XP */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded bg-cyan-950/80 border border-cyan-400 flex items-center justify-center font-tech font-black text-cyan-300 text-sm shadow-[0_0_10px_rgba(46,230,255,0.3)]">
              {currentLevel}
            </div>
            <div>
              <div className="font-tech text-[9px] text-cyan-400 font-bold tracking-wide">{plane.name} / {t("LV")} {currentLevel}/{levelCap(save)}</div>
              <div className="w-20 sm:w-24 h-1.5 bg-black/60 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-cyan-400 rounded-full"
                  style={{
                    width: `${Math.min(100, (xp / need) * 100)}%`,
                    boxShadow: "0 0 8px #2ee6ff",
                  }}
                />
              </div>
              <div className="text-[9px] text-slate-400 mt-1">{t("COMMANDER")} / {t("LV")} {save.level}</div>
            </div>
          </div>

          {/* Currencies */}
          <div className="flex items-center gap-2 font-tech text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/40 border border-amber-400/40 text-amber-300 shadow-[0_0_8px_rgba(255,180,30,0.15)]">
              <span className="text-amber-400">◉</span>
              <span className="font-bold">{n(save.coins)}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/40 border border-cyan-400/40 text-cyan-300 shadow-[0_0_8px_rgba(46,230,255,0.15)]">
              <span className="text-cyan-400">◆</span>
              <span className="font-bold">{n(save.crystals)}</span>
            </div>
          </div>
        </div>

        {/* LOGO HERO SECTION */}
        <div className="text-center mt-2 relative">
          <div className="inline-block px-3 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[10px] font-tech text-cyan-300 font-semibold tracking-[0.25em] uppercase mb-1">
            {t("Premium Aerial Warfare")}
          </div>
          <h1 className="font-tech text-4xl sm:text-6xl font-black tracking-[0.12em] text-white">
            SKY<span className="text-amber-400 glow-text-gold">FRONT</span>
          </h1>
          <p className="font-tech text-[10px] sm:text-xs text-slate-400 tracking-[0.45em] uppercase">
            {t("Tactical Combat Division")}
          </p>
        </div>

        {/* INTERACTIVE 3D AIRCRAFT HOLOPAD */}
        <div className="relative w-full max-w-[340px] flex flex-col items-center mt-0">
          <div className="relative animate-floaty">
            <PlaneCanvas plane={plane} size={270} spin />
          </div>

          {/* Active Aircraft Info Card */}
          <div className="panel px-4 py-2.5 w-full flex items-center justify-between -mt-6 z-10 border-cyan-400/50 shadow-[0_0_25px_rgba(46,230,255,0.15)]">
            <div>
              <div className="font-tech font-black text-lg text-white leading-tight tracking-wide flex items-center gap-2">
                <span>{plane.name}</span>
                <span className="text-[10px] text-cyan-400 font-semibold px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40">
                  {t(plane.role)}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">
                {t("Primary")}: <span className="text-slate-200 font-bold">{t(plane.weapon)}</span>
              </div>
            </div>
            <RarityTag rarity={plane.rarity} />
          </div>
        </div>

        {/* PRIMARY CALL TO ACTION: BATTLE LAUNCH */}
        <div className="w-full max-w-[340px] mt-4 flex flex-col items-center">
          <Btn
            variant="primary"
            className="w-full !py-4 !text-xl tracking-widest sweep relative overflow-hidden font-black shadow-[0_0_35px_rgba(255,100,0,0.6)]"
            onClick={onPlay}
            icon="⚡"
          >
            {t(route.training ? "TRAIN AIRCRAFT" : route.secret ? "VIEW SECTORS" : "CONTINUE CAMPAIGN")}
          </Btn>
          <span className="text-xs text-slate-300 text-center mt-2 leading-relaxed">
            {route.secret ? `${t("SECRET BOSS")} / ${t("AIRCRAFT")} ${t("LV")} ${route.nextLevel}`
              : t("Sector {sector} at aircraft level {level}", { sector: route.nextSector, level: route.nextLevel })}
          </span>
          {route.training && <p className="text-[11px] text-amber-200 mt-1 text-center">{t("{levels} aircraft levels remaining", { levels: route.nextLevel - currentLevel })}</p>}
        </div>

        {/* NAV HUB GRID */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-5 w-full stagger">
          {navItems.map((item) => (
            <button
              data-uibtn="1"
              key={item.id}
              onClick={() => go(item.id)}
              className="panel-soft p-2.5 sm:p-3 flex flex-col items-center text-center transition-all duration-150 hover:border-cyan-400/60 hover:bg-cyan-950/40 hover:-translate-y-0.5 active:scale-95 group cursor-pointer"
            >
              <div className="text-xl sm:text-2xl mb-1 transition-transform group-hover:scale-110">
                {item.icon}
              </div>
              <div className="font-tech text-[10px] sm:text-xs font-bold text-white tracking-wide">
                {t(item.label)}
              </div>
              <div className="text-[8px] text-slate-400 tracking-wider">
                {t(item.desc)}
              </div>
              {item.badge && (
                <span className="mt-1 px-1.5 py-0.2 rounded-full text-[9px] font-tech font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* CAREER STATS PANEL */}
        <div className="w-full mt-4 panel px-3 py-2.5 grid grid-cols-3 gap-2 text-center border-slate-700/60">
          <Stat label="CAREER SCORE" value={n(save.highScore)} />
          <Stat label="TOTAL KILLS" value={n(save.stats.kills)} />
          <Stat label="SECRET BOSSES" value={String(save.stats.secretBosses)} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="font-tech font-black text-sm sm:text-base text-cyan-200">{value}</div>
      <div className="text-[9px] font-tech tracking-wider text-slate-400">{t(label)}</div>
    </div>
  );
}
