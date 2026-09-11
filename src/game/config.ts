export const CONFIG = {
  DEBUG: false,
  VIRTUAL_W: 720,
  VIRTUAL_H: 1280,
  MAX_DT: 1 / 30,
  PLAYER_BOUND_PAD: 26,
  IFRAMES: 1.1,
};

export type QualityLevel = "LOW" | "MEDIUM" | "HIGH";

export const QUALITY: Record<
  QualityLevel,
  {
    particleMax: number;
    particleScale: number;
    glow: boolean;
    trails: boolean;
    dpr: number;
    stars: number;
  }
> = {
  LOW: { particleMax: 160, particleScale: 0.4, glow: false, trails: false, dpr: 1, stars: 40 },
  MEDIUM: { particleMax: 480, particleScale: 0.75, glow: true, trails: true, dpr: 1.35, stars: 70 },
  HIGH: { particleMax: 1100, particleScale: 1, glow: true, trails: true, dpr: 2, stars: 110 },
};

export type DifficultyName = "EASY" | "NORMAL" | "HARD" | "INSANE";

export const DIFFICULTY: Record<
  DifficultyName,
  {
    enemyHp: number;
    enemySpeed: number;
    spawnRate: number;
    bulletSpeed: number;
    bossHp: number;
    reward: number;
    xpReward: number;
    crystalReward: number;
    scoreReward: number;
  }
> = {
  EASY: { enemyHp: 0.8, enemySpeed: 0.85, spawnRate: 0.85, bulletSpeed: 0.78, bossHp: 0.82, reward: 0.85, xpReward: 0.9, crystalReward: 0.85, scoreReward: 0.8 },
  NORMAL: { enemyHp: 1, enemySpeed: 1, spawnRate: 1, bulletSpeed: 1, bossHp: 1, reward: 1, xpReward: 1, crystalReward: 1, scoreReward: 1 },
  HARD: { enemyHp: 1.2, enemySpeed: 1.12, spawnRate: 1.18, bulletSpeed: 1.12, bossHp: 1.2, reward: 1.45, xpReward: 1.3, crystalReward: 1.25, scoreReward: 1.5 },
  INSANE: { enemyHp: 1.45, enemySpeed: 1.24, spawnRate: 1.35, bulletSpeed: 1.27, bossHp: 1.5, reward: 1.9, xpReward: 1.6, crystalReward: 1.5, scoreReward: 2 },
};

export const RARITY_COLORS: Record<string, { main: string; glow: string; label: string }> = {
  COMMON: { main: "#9fb3c8", glow: "rgba(159,179,200,0.55)", label: "COMMON" },
  RARE: { main: "#3fa9ff", glow: "rgba(63,169,255,0.6)", label: "RARE" },
  EPIC: { main: "#b567ff", glow: "rgba(181,103,255,0.62)", label: "EPIC" },
  LEGENDARY: { main: "#ffb020", glow: "rgba(255,176,32,0.65)", label: "LEGENDARY" },
  MYTHIC: { main: "#ff3d6e", glow: "rgba(255,61,110,0.7)", label: "MYTHIC" },
};
