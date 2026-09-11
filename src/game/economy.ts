import { DIFFICULTY, type DifficultyName } from "./config";
import { planetOrder } from "./data/galaxies";
import { sectorBaseReward } from "./progression";
import type { RewardBundle, RewardBreakdown, RunConfig } from "./run-types";

export const emptyReward = (): RewardBundle => ({ coins: 0, crystals: 0, xp: 0 });

export function addRewards(...items: RewardBundle[]): RewardBundle {
  return items.reduce((sum, item) => ({
    coins: sum.coins + item.coins, crystals: sum.crystals + item.crystals, xp: sum.xp + item.xp,
  }), emptyReward());
}

export function scaleReward(base: RewardBundle, difficulty: DifficultyName, coins = 1, xp = 1): RewardBundle {
  const d = DIFFICULTY[difficulty];
  return {
    coins: Math.max(0, Math.floor(base.coins * d.reward * coins)),
    crystals: base.crystals > 0 ? Math.max(1, Math.floor(base.crystals * d.crystalReward)) : 0,
    xp: Math.max(0, Math.floor(base.xp * d.xpReward * xp)),
  };
}

// Around two wins per ten airframe levels on Normal, including combat loot.
export function sectorContract(galaxy: number, planet: number, map: number): RewardBundle {
  const tier = planetOrder(galaxy, planet);
  return sectorBaseReward(tier, map);
}

export function calculateRewards(
  cfg: RunConfig, difficulty: DifficultyName, victory: boolean,
  rawCombat: RewardBundle, firstClear: boolean, coinBonus = 1, xpBonus = 1,
): { total: RewardBundle; breakdown: RewardBreakdown } {
  const contract = cfg.mode === "campaign" || cfg.mode === "daily"
    ? sectorContract(cfg.galaxy, cfg.planet, cfg.map) : emptyReward();
  const first = victory && cfg.mode === "campaign" && firstClear
    ? { coins: Math.round(contract.coins * 0.5), crystals: 1, xp: Math.round(contract.xp * 0.5) }
    : emptyReward();
  const breakdown: RewardBreakdown = {
    combat: scaleReward(rawCombat, difficulty, coinBonus, xpBonus),
    completion: victory ? scaleReward(contract, difficulty, coinBonus, xpBonus) : emptyReward(),
    firstClear: scaleReward(first, difficulty, coinBonus, xpBonus),
    daily: emptyReward(),
    coinMultiplier: DIFFICULTY[difficulty].reward * coinBonus,
    xpMultiplier: DIFFICULTY[difficulty].xpReward * xpBonus,
  };
  return { total: addRewards(breakdown.combat, breakdown.completion, breakdown.firstClear), breakdown };
}