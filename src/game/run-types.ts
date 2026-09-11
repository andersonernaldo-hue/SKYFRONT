import type { DifficultyName } from "./config";
import type { DailyChallenge } from "./data/talents";

export type GameMode = "campaign" | "secret" | "endless" | "bossrush" | "daily";

export interface RunConfig {
  mode: GameMode;
  galaxy: number;
  planet: number;
  map: number;
  daily?: DailyChallenge;
  difficulty?: DifficultyName;
}

export interface RewardBundle { coins: number; crystals: number; xp: number }
export interface RewardBreakdown {
  combat: RewardBundle;
  completion: RewardBundle;
  firstClear: RewardBundle;
  daily: RewardBundle;
  coinMultiplier: number;
  xpMultiplier: number;
}

export interface RunResult extends RewardBundle {
  runId: string;
  planeId: string;
  planeXp: number;
  difficulty: DifficultyName;
  rewards: RewardBreakdown;
  dailyId?: string;
  victory: boolean;
  score: number;
  kills: number;
  bestCombo: number;
  bossKilled: boolean;
  mode: GameMode;
  galaxy: number;
  planet: number;
  map: number;
  wave: number;
  hits: number;
  abilities: number;
  time: number;
  stars: number;
  secretDefeated: boolean;
  bossesDefeated: number;
}