import { GALAXIES, planetKey } from "./data/galaxies";
import { makeDaily } from "./data/talents";
import { addRewards, emptyReward } from "./economy";
import { advanceAirframe } from "./progression";
import { defaultPlaneSave, galaxyComplete, levelCap, xpForLevel, type SaveData } from "./save";
import type { RunResult } from "./run-types";

export interface Settlement {
  save: SaveData;
  result: RunResult;
  duplicate: boolean;
  planeBefore: number;
  planeAfter: number;
  unlockedPlanet?: string;
  unlockedGalaxy?: string;
}

// The result is a launch-time snapshot. Later settings/aircraft changes cannot alter its payout.
export function settleRun(s: SaveData, input: RunResult): Settlement {
  const before = s.planeData[input.planeId] || defaultPlaneSave();
  const summary: Settlement = { save: s, result: input, duplicate: false, planeBefore: before.level, planeAfter: before.level };
  if (s.appliedRuns.includes(input.runId)) return { ...summary, duplicate: true };

  const progress = { ...s.planetProgress };
  const key = planetKey(input.galaxy, input.planet);
  const state = { ...(progress[key] || { maps: 0, stars: [], secret: false }) };
  const galaxy = GALAXIES[input.galaxy];
  if (input.victory && input.mode === "campaign" && input.bossKilled) {
    state.stars = [...state.stars];
    state.stars[input.map] = Math.max(state.stars[input.map] || 0, input.hits === 0 ? 3 : input.hits <= 4 ? 2 : 1);
    if (input.map === state.maps) state.maps = Math.min(10, state.maps + 1);
    progress[key] = state;
  }
  if (input.victory && input.mode === "secret" && input.secretDefeated && !state.secret) {
    progress[key] = { ...state, secret: true };
    if (input.planet + 1 < galaxy.planets.length) {
      const nextKey = planetKey(input.galaxy, input.planet + 1);
      progress[nextKey] = progress[nextKey] || { maps: 0, stars: [], secret: false };
      summary.unlockedPlanet = galaxy.planets[input.planet + 1].name;
    }
  }
  let galaxyProgress = s.galaxyProgress;
  if (galaxyProgress < GALAXIES.length && galaxyComplete({ ...s, planetProgress: progress }, galaxyProgress - 1)) {
    const next = GALAXIES[galaxyProgress];
    progress[planetKey(galaxyProgress, 0)] ||= { maps: 0, stars: [], secret: false };
    summary.unlockedGalaxy = next.name;
    galaxyProgress++;
  }

  let daily = { ...s.daily };
  const claims = { ...s.dailyClaims };
  let dailyBonus = emptyReward();
  if (input.mode === "daily" && input.dailyId) {
    const dailyDef = makeDaily(input.dailyId);
    const stars = input.victory ? input.stars : 0;
    const prior = claims[input.dailyId] || 0;
    const gained = Math.max(0, stars - prior);
    if (gained > 0) {
      dailyBonus = { coins: dailyDef.reward.coins * gained, crystals: dailyDef.reward.crystals * gained, xp: dailyDef.reward.xp * gained };
      claims[input.dailyId] = stars;
    }
    if (input.dailyId >= daily.key) {
      daily = {
        key: input.dailyId,
        stars: Math.max(stars, daily.key === input.dailyId ? daily.stars : 0),
        best: Math.max(input.score, daily.key === input.dailyId ? daily.best : 0),
        done: Math.max(prior, stars) > 0,
      };
    }
  }

  const result: RunResult = {
    ...input, ...addRewards(input, dailyBonus),
    planeXp: input.planeXp + dailyBonus.xp,
    rewards: { ...input.rewards, daily: dailyBonus },
  };
  const cap = levelCap({ ...s, galaxyProgress, planetProgress: progress });
  const airframe = advanceAirframe(before.level, before.xp, result.planeXp, Math.max(cap, before.level));
  let level = s.level;
  let xp = s.xp + result.xp;
  while (level < cap && xp >= xpForLevel(level)) { xp -= xpForLevel(level); level++; }
  if (level >= cap) xp = Math.min(xp, xpForLevel(level));

  const nextSave: SaveData = {
    ...s, level, xp, galaxyProgress, planetProgress: progress,
    planeData: { ...s.planeData, [input.planeId]: { ...before, ...airframe } },
    coins: s.coins + result.coins, crystals: s.crystals + result.crystals,
    highScore: Math.max(s.highScore, result.score),
    daily, dailyClaims: Object.fromEntries(Object.entries(claims).sort(([a], [b]) => b.localeCompare(a)).slice(0, 45)),
    appliedRuns: [...s.appliedRuns, result.runId].slice(-64),
    endless: {
      bestWave: result.mode === "endless" ? Math.max(s.endless.bestWave, result.wave) : s.endless.bestWave,
      bestScore: result.mode === "endless" ? Math.max(s.endless.bestScore, result.score) : s.endless.bestScore,
      bossRushBest: result.mode === "bossrush" ? Math.max(s.endless.bossRushBest, result.bossesDefeated) : s.endless.bossRushBest,
    },
    leaderboard: [...s.leaderboard, {
      mode: result.mode, score: result.score, wave: result.wave,
      date: new Date().toISOString().slice(0, 10), difficulty: result.difficulty, planeId: result.planeId,
    }].sort((a, b) => b.score - a.score).slice(0, 50),
    stats: {
      ...s.stats,
      kills: s.stats.kills + result.kills,
      bosses: s.stats.bosses + result.bossesDefeated,
      secretBosses: s.stats.secretBosses + (result.secretDefeated ? 1 : 0),
      bestCombo: Math.max(s.stats.bestCombo, result.bestCombo),
      totalCoins: s.stats.totalCoins + result.coins,
      games: s.stats.games + 1,
      deaths: s.stats.deaths + (result.victory ? 0 : 1),
      mapsCleared: s.stats.mapsCleared + (result.victory && result.mode === "campaign" ? 1 : 0),
    },
  };
  return { ...summary, save: nextSave, result, planeAfter: airframe.level };
}