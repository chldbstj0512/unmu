export type CairnStone = {
  y: number;
  sx: number;
  sy: number;
  sz: number;
  rot: number;
  ox: number;
  oz: number;
  color: string;
};

const STONE_COLORS = ["#e4d9c8", "#d2c4b2", "#f3ecdf", "#c4b5a4", "#b7a894", "#efe4d4"];

const VISIBLE_CAP = 24;

export function cairnStones(count: number): CairnStone[] {
  const n = Math.max(0, Math.min(VISIBLE_CAP, Math.floor(count)));
  const stones: CairnStone[] = [];
  let y = 0.02;
  for (let i = 0; i < n; i += 1) {
    const shrink = 1 - (i / Math.max(1, n)) * 0.62;
    const sy = 0.13 + ((i * 3) % 4) * 0.02;
    const sx = (0.78 - (i % 3) * 0.05) * shrink;
    const sz = (0.58 - (i % 2) * 0.06) * shrink;
    const rot = ((i * 37) % 50) * 0.02 - 0.4;
    const ox = Math.sin(i * 1.7) * 0.035 * shrink;
    const oz = Math.cos(i * 1.3) * 0.03 * shrink;
    stones.push({
      y: y + sy / 2,
      sx,
      sy,
      sz,
      rot,
      ox,
      oz,
      color: STONE_COLORS[i % STONE_COLORS.length] ?? STONE_COLORS[0],
    });
    y += sy * 0.9;
  }
  return stones;
}
