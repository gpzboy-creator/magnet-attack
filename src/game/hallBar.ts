/**
 * The hall bar (stage 3 of the hall redesign, Shahar 19.11): a long wooden counter with a marble top
 * standing across the hall between the dance floor and the front row of tables (hallLayout.ts
 * HALL_BAR). The X-panel front faces the tables (+y), where guests stand; two bartenders work behind
 * it on the dance floor side, like the reception garden bar. Pure geometry, tested in hallBar.test.ts.
 */

import { HALL_BAR, HALL_LAYOUT, type Pt } from './hallLayout.ts';
import type { BartenderAction } from './hallPixelArt.ts';

const { length, depth } = HALL_LAYOUT.bar;
const c = HALL_BAR.center;

/** Floor footprint of the counter — also its collision box. */
export const HALL_BAR_BOX = {
  minX: c.x - length / 2,
  maxX: c.x + length / 2,
  minY: c.y - depth / 2,
  maxY: c.y + depth / 2,
} as const;

/** Spots where guests stand at the bar: four along the front (table side), one at each end. */
export const BAR_GUEST_SPOTS: Pt[] = [
  { x: c.x - 36, y: HALL_BAR_BOX.maxY + 10 },
  { x: c.x - 12, y: HALL_BAR_BOX.maxY + 10 },
  { x: c.x + 12, y: HALL_BAR_BOX.maxY + 10 },
  { x: c.x + 36, y: HALL_BAR_BOX.maxY + 10 },
  { x: HALL_BAR_BOX.minX - 11, y: c.y + 4 },
  { x: HALL_BAR_BOX.maxX + 11, y: c.y + 4 },
];

/** Where waiters pick up drinks: just past each end of the counter. */
export const BAR_PICKUP_SPOTS: Pt[] = [
  { x: HALL_BAR_BOX.minX - 12, y: HALL_BAR_BOX.minY + 2 },
  { x: HALL_BAR_BOX.maxX + 12, y: HALL_BAR_BOX.minY + 2 },
];

/** The point on the counter a guest at `spot` faces (nearest point of the footprint). */
export function barFacePoint(spot: Pt): Pt {
  return {
    x: Math.min(HALL_BAR_BOX.maxX, Math.max(HALL_BAR_BOX.minX, spot.x)),
    y: Math.min(HALL_BAR_BOX.maxY, Math.max(HALL_BAR_BOX.minY, spot.y)),
  };
}

/** Where the bartenders work: a strip behind the counter (dance floor side). */
export const HALL_BARTENDER_STATIONS: Pt[] = [-66, -42, -18, 18, 42, 66].map((dx) => ({ x: c.x + dx, y: HALL_BAR_BOX.minY - 9 }));

/** Bartender `i` (0 or 1) at time `t`: walks between stations in their half, then shakes / pours / serves. */
export function hallBartenderPose(i: number, t: number): Pt & { action: BartenderAction } {
  const half = i === 0 ? HALL_BARTENDER_STATIONS.slice(0, 3) : HALL_BARTENDER_STATIONS.slice(3);
  const period = 4.4 + i * 0.8;
  const shifted = t + i * 1.9;
  const cycle = Math.floor(shifted / period);
  const local = shifted - cycle * period;
  // bartender 0 works the left half, bartender 1 the right half, so they never cross
  const order = i === 0 ? [0, 1, 2, 1] : [2, 1, 0, 1];
  const pick = (k: number) => half[order[((k % 4) + 4) % 4]];
  const from = pick(cycle - 1);
  const to = pick(cycle);
  if (local < 0.9) {
    const k = local / 0.9;
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, action: 'walk' };
  }
  const actions: BartenderAction[] = ['shake', 'pour', 'serve'];
  return { ...to, action: actions[(cycle + i) % 3] };
}
