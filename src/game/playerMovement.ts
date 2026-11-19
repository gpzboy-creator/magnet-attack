/**
 * Keeping the photographer on walkable ground (moved out of IsoArenaCanvas.tsx).
 * Pure logic, tested in playerMovement.test.ts.
 */

/**
 * The hall floor is a square (drawn ±440, walls on the back two sides); the whole of it is walkable
 * up to a body's width from the edge. Before 19.11 only a 390 circle was, so the floor near the
 * edges and corners looked open but was blocked ("invisible walls").
 */
export const HALL_FLOOR_HALF = 428;
export const insideHallFloor = (x: number, y: number) => Math.abs(x) <= HALL_FLOOR_HALF && Math.abs(y) <= HALL_FLOOR_HALF;

export interface Pt {
  x: number;
  y: number;
}

/**
 * The photographer moved from `prev` to `next`. If `next` isn't walkable, slide along the wall
 * (keep x or keep y), or stay put — and when pushing head-on against a wall right next to a doorway,
 * step along the wall toward the opening (`slideTargetY`; before 19.11 a straight push never reached
 * this, so he got stuck by doors). Returns null when not even `prev` is walkable
 * (the caller then puts him back on his last safe spot instead of teleporting him).
 */
export function constrainToWalkable(
  prev: Pt,
  next: Pt,
  walkable: (x: number, y: number) => boolean,
  slideTargetY: (x: number, y: number) => number | null,
  maxStep: number
): Pt | null {
  if (walkable(next.x, next.y)) return next;
  const moved = (p: Pt) => Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y) > 1e-6;
  if (walkable(next.x, prev.y) && moved({ x: next.x, y: prev.y })) return { x: next.x, y: prev.y };
  if (walkable(prev.x, next.y) && moved({ x: prev.x, y: next.y })) return { x: prev.x, y: next.y };
  if (!walkable(prev.x, prev.y)) return null;
  // blocked head-on (a straight push into the wall): next to a doorway, step toward the opening
  const slideY = slideTargetY(prev.x, prev.y);
  if (slideY !== null) {
    const stepY = Math.sign(slideY - prev.y) * Math.min(Math.abs(slideY - prev.y), maxStep);
    if (walkable(prev.x, prev.y + stepY)) return { x: prev.x, y: prev.y + stepY };
  }
  return prev;
}

/**
 * After the walk, solid furniture pushes him out of its footprint. If that push lands him off the
 * walkable ground (a table by a fence, a car by the yard edge…), keep the walk result instead; if
 * even that isn't walkable, fall back to the last safe spot. Never jumps anywhere else.
 */
export function settlePosition(
  walked: Pt | null,
  pushed: Pt | null,
  lastSafe: Pt,
  walkable: (x: number, y: number) => boolean
): Pt {
  if (pushed && walkable(pushed.x, pushed.y)) return pushed;
  if (walked && walkable(walked.x, walked.y)) return walked;
  return lastSafe;
}
