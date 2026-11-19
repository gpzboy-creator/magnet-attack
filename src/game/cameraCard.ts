/**
 * Camera card with a soft cap (project log, "רעיון: יותר מ-12 תמונות", answers of 18.11).
 *
 *   - Up to `capacity` photos (12, +6 per SD-card upgrade): normal.
 *   - Above it the photographer may keep shooting up to `hardMax` (2 × capacity) — e.g. to catch
 *     every guest at the reception — but each extra photo makes copying the card slower, step by step:
 *     extras 1–3: +0.2 s each, 4–6: +0.3 s each, 7+: +0.45 s each (19.11: copying is quick, printing is the long step). The turbo station shortens it.
 */

import { getMaxCameraCapacity } from './rules.ts';

export const CARD = {
  hardMaxFactor: 2,
  /** Extra seconds per photo above capacity, by how far over it is. */
  extraSecSteps: [
    { upTo: 3, sec: 0.2 },
    { upTo: 6, sec: 0.3 },
    { upTo: Infinity, sec: 0.45 },
  ],
} as const;

export interface CardLimits {
  /** Photos before the slowdown starts. */
  capacity: number;
  /** The card is really full here. */
  hardMax: number;
}

export function cardLimits(sdCardLevel: number): CardLimits {
  const capacity = getMaxCameraCapacity(sdCardLevel);
  return { capacity, hardMax: capacity * CARD.hardMaxFactor };
}

/** Extra copy time (seconds, before the turbo speed-up) for `photos` on a card of `capacity`. */
export function overflowExtraSec(photos: number, capacity: number): number {
  const over = Math.max(0, Math.floor(photos) - capacity);
  let sec = 0;
  for (let i = 1; i <= over; i++) {
    sec += CARD.extraSecSteps.find((s) => i <= s.upTo)!.sec;
  }
  return Number(sec.toFixed(2));
}

/** Copy time for the whole card, including the overflow slowdown (turbo divides the extra too). */
export function cardCopySec(baseSec: number, photos: number, capacity: number, speedMult: number): number {
  const extra = overflowExtraSec(photos, capacity) / Math.max(0.25, speedMult);
  return Number((baseSec + extra).toFixed(2));
}
