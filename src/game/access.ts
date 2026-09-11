import { GALAXIES, getMaps, planetMaxLevel, sectorBossFor } from "./data/galaxies";
import { DIFFICULTY } from "./config";
import { aircraftLevel, canFightSecret, isMapUnlocked, isPlanetUnlocked, mapAccess, planetState, sectorRequiredLevel, type AccessResult, type SaveData } from "./save";
import { translate } from "../i18n";
import type { RunConfig } from "./run-types";

export function availableRushBosses(s: SaveData): string[] {
  const bosses: string[] = [];
  GALAXIES.forEach((galaxy, g) => galaxy.planets.forEach((_, p) => {
    if (planetState(s, g, p).maps === 10 && isMapUnlocked(s, g, p, 9)) bosses.push(sectorBossFor(g, p, 9));
  }));
  return bosses;
}

export function runAccess(s: SaveData, cfg: RunConfig): AccessResult {
  const t = (key: string) => translate(s.settings.language, key);
  if (!["campaign", "daily", "secret", "bossrush", "endless"].includes(cfg.mode)
    || !Number.isInteger(cfg.galaxy) || !Number.isInteger(cfg.planet) || !Number.isInteger(cfg.map)
    || !GALAXIES[cfg.galaxy]?.planets[cfg.planet] || cfg.map < 0 || cfg.map >= 10
    || (cfg.difficulty !== undefined && !Object.prototype.hasOwnProperty.call(DIFFICULTY, cfg.difficulty))) {
    return { ok: false, reason: t("Invalid mission") };
  }
  if (!s.planes.includes(s.selected)) return { ok: false, reason: t("Aircraft not owned") };
  if (cfg.mode === "secret") {
    const gate = canFightSecret(s, cfg.galaxy, cfg.planet);
    if (!gate.ok) return gate;
    const fee = GALAXIES[cfg.galaxy].planets[cfg.planet].secretFee;
    return s.coins >= fee.coins && s.crystals >= fee.crystals ? gate : { ok: false, reason: t("INSUFFICIENT ENTRY FEE") };
  }
  if (cfg.mode === "bossrush") return availableRushBosses(s).length ? { ok: true, reason: "" } : { ok: false, reason: t("CLEAR A PLANET FIRST") };
  if (cfg.mode === "endless") {
    // Survival is training, not a way to visit a still-locked planet.
    if (!isPlanetUnlocked(s, cfg.galaxy, cfg.planet)) return { ok: false, reason: t("Planet locked") };
    return mapAccess(s, cfg.galaxy, cfg.planet, 0);
  }
  if (cfg.mode === "daily" && (!cfg.daily || cfg.daily.galaxy !== cfg.galaxy || cfg.daily.planet !== cfg.planet || cfg.daily.map !== cfg.map)) {
    return { ok: false, reason: t("Invalid mission") };
  }
  return mapAccess(s, cfg.galaxy, cfg.planet, cfg.map);
}

export interface CampaignRoute {
  cfg: RunConfig;
  training: boolean;
  nextLevel: number;
  nextSector: number;
  secret: boolean;
}

export function campaignRoute(s: SaveData): CampaignRoute {
  let replay: RunConfig = { mode: "campaign", galaxy: 0, planet: 0, map: 0 };
  let goal: { g: number; p: number; map: number; secret: boolean } | undefined;
  GALAXIES.forEach((galaxy, g) => galaxy.planets.forEach((planet, p) => {
    if (!isPlanetUnlocked(s, g, p)) return;
    const state = planetState(s, g, p);
    getMaps(planet).forEach((map) => {
      if (isMapUnlocked(s, g, p, map.index)) replay = { mode: "campaign", galaxy: g, planet: p, map: map.index };
    });
    if (!state.secret && !goal) goal = { g, p, map: Math.min(9, state.maps), secret: state.maps >= 10 };
  }));
  if (!goal) return { cfg: replay, training: false, nextLevel: 700, nextSector: 10, secret: false };
  const { g, p, map, secret } = goal;
  const nextLevel = secret ? planetMaxLevel(g, p) : sectorRequiredLevel(g, p, map);
  const training = aircraftLevel(s) < nextLevel;
  const cfg: RunConfig = !training && !secret ? { mode: "campaign", galaxy: g, planet: p, map } : replay;
  return { cfg, training, nextLevel, nextSector: secret ? 11 : map + 1, secret };
}