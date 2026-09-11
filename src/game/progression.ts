// Campaign levels are cumulative across planets, not reset on travel.
export const LEVELS_PER_SECTOR = 10;
export const SECTORS_PER_PLANET = 10;
export const MAX_AIRFRAME_LEVEL = 700;

export function planeXpForLevel(level: number): number {
  return Math.round(120 + Math.max(0, Math.min(MAX_AIRFRAME_LEVEL, level)) * 12);
}

export function xpForTenLevels(start: number): number {
  let xp = 0;
  for (let level = start; level < start + LEVELS_PER_SECTOR; level++) xp += planeXpForLevel(level);
  return xp;
}

export function sectorBaseReward(planetIndex: number, sectorIndex: number) {
  return {
    coins: 500 + sectorIndex * 140 + planetIndex * 550,
    crystals: 1 + Math.floor(sectorIndex / 4) + Math.floor(planetIndex / 2),
    xp: Math.round(xpForTenLevels(planetIndex * 100 + sectorIndex * 10) * 0.45),
  };
}

export function advanceAirframe(level: number, xp: number, earned: number, cap: number) {
  level = Math.max(0, Math.min(cap, Math.floor(level)));
  xp = Math.max(0, xp) + Math.max(0, earned);
  while (level < cap && xp >= planeXpForLevel(level)) {
    xp -= planeXpForLevel(level);
    level++;
  }
  return { level, xp: level >= cap ? Math.min(xp, planeXpForLevel(cap)) : xp };
}