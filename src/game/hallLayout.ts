/**
 * The hall's dining layout (Shahar, 19.11 — approved sketch): the dance floor stays in the middle,
 * the bar stands on the dance floor's left side (by the green wall), and 7 round tables (8 seats
 * each) stand in two staggered rows — 4 then 3 — symmetric about the hall's middle line, in front of
 * the dance floor opposite the DJ (screen down-left); the rows run along the screen's down-right
 * diagonal, like the approved sketch. Rows spread out (19.11: "more room between tables").
 * Pure geometry, tested in hallLayout.test.ts.
 */

export interface Pt {
  x: number;
  y: number;
}

/** Unit vectors: `toDining` points from the dance floor to the tables, `across` runs along the rows. */
export const HALL_AXES = { toDining: { x: 0, y: 1 }, across: { x: 1, y: 0 } } as const;

export const HALL_LAYOUT = {
  /** Walkable hall disk (ARENA_RADIUS in the canvas) and the dance floor radius (hallPixelArt.ts). */
  hallRadius: 390,
  danceFloorRadius: 168,
  /** Round table: cloth radius, chair ring radius, and how far the table + chairs reach. */
  tableRadius: 26,
  chairRing: 34,
  reach: 42,
  rows: [
    { dist: 240, across: [-195, -65, 65, 195] },
    { dist: 322, across: [-130, 0, 130] },
  ],
  /**
   * The hall bar (PixelLab hall-bar-side.png): on the left side of the dance floor (screen
   * up-left, world −x), its long side along world y, the bartenders' backs to the green wall and
   * the counter facing the dancers (Shahar, 19.11 — moved from between the dance floor and the
   * tables). `dist` = how far its centre is from the dance floor centre along −x.
   * 170 × 29 ≈ 3.7 m × 0.63 m: the front face stands ≈ 32 units (0.7 m) off the dance floor edge.
   */
  bar: { dist: 214.5, length: 170, depth: 29 },
} as const;

const at = (dist: number, across: number): Pt => ({
  x: Math.round(HALL_AXES.toDining.x * dist + HALL_AXES.across.x * across),
  y: Math.round(HALL_AXES.toDining.y * dist + HALL_AXES.across.y * across),
});

/** The 7 round tables, front row (4) first. */
export const HALL_TABLES: Array<Pt & { id: number }> = HALL_LAYOUT.rows
  .flatMap((r) => r.across.map((a) => at(r.dist, a)))
  .map((p, i) => ({ id: i + 1, ...p }));

/** Where the bar stands (centre) and the direction it runs (world y). */
export const HALL_BAR = { center: { x: -HALL_LAYOUT.bar.dist, y: 0 }, along: HALL_AXES.toDining };

export type ChairView = 'front' | 'frontMirror' | 'back' | 'backMirror';

/**
 * 8 seats around a round table, offset by 22.5° so none sits on an axis. Each seat says which way
 * the guest faces (toward the table centre) and which cross-back chair view matches it:
 * front = faces +y (screen down-left), frontMirror = +x (down-right), back = −y (up-right),
 * backMirror = −x (up-left).
 */
export const ROUND_TABLE_SEATS: Array<{ dx: number; dy: number; face: Pt; view: ChairView }> = Array.from({ length: 8 }, (_, k) => {
  const a = ((k * 45 + 22.5) * Math.PI) / 180;
  const dx = Math.round(Math.cos(a) * HALL_LAYOUT.chairRing);
  const dy = Math.round(Math.sin(a) * HALL_LAYOUT.chairRing);
  const face = { x: -Math.cos(a), y: -Math.sin(a) };
  const view: ChairView =
    Math.abs(face.x) > Math.abs(face.y) ? (face.x > 0 ? 'frontMirror' : 'backMirror') : face.y > 0 ? 'front' : 'back';
  return { dx, dy, face, view };
});
