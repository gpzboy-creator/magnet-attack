/**
 * The wedding evening as a sequence of phases, like a real event (pure logic, tested).
 *
 *   arrival  — guests arrive through the courtyard into the lobby, stop at the photo wall to pose,
 *              then walk into the hall and sit down. Shoot every guest while they pose.
 *   dancing  — the dance floor game (photograph, print, cut, stick magnets on the board).
 *
 * Planned next (project log): family & couple photo session (keepsake magnets), the chuppah ceremony.
 */

export type EventPhaseId = 'arrival' | 'dancing';

export interface EventPhaseInfo {
  id: EventPhaseId;
  titleHe: string;
  goalHe: string;
}

export const EVENT_PHASES: EventPhaseInfo[] = [
  {
    id: 'arrival',
    titleHe: '🚪 קבלת פנים',
    goalHe: 'האורחים מגיעים! צלם כל אורח כשהוא עוצר לפוזה ליד קיר הצילום בלובי',
  },
  {
    id: 'dancing',
    titleHe: '💃 ריקודים',
    goalHe: 'כולם ברחבה! צלם, הדפס, חתוך והדבק מגנטים על הלוח',
  },
];

export function getPhaseInfo(id: EventPhaseId): EventPhaseInfo {
  return EVENT_PHASES.find((p) => p.id === id) ?? EVENT_PHASES[0];
}

export function nextPhase(id: EventPhaseId): EventPhaseId | null {
  const i = EVENT_PHASES.findIndex((p) => p.id === id);
  return i >= 0 && i < EVENT_PHASES.length - 1 ? EVENT_PHASES[i + 1].id : null;
}

/** Phase title card on screen. */
export const PHASE_INTRO_SEC = 3.2;

/** Arrival tuning. */
export const ARRIVAL = {
  /** Seconds before the first guest walks in. */
  firstDelaySec: 3,
  /** Gap between arriving groups: starts calm and speeds up (a growing stream). */
  gapStartSec: 3.4,
  gapEndSec: 1.3,
  /** A partner arrives right behind. */
  partnerGapSec: 0.6,
  walkSpeed: 64,
  /** Total pose at the photo wall and its sweet spot (seconds into the pose). */
  poseSec: 2.0,
  peakStartSec: 0.5,
  peakEndSec: 1.35,
  /** Spacing of the little queue that forms when guests arrive close together. */
  queueSpacing: 28,
  goldBonus: 150,
  okBonus: 60,
  missPenalty: 30,
  /** Safety: the phase ends after this long even if someone is still walking. */
  maxPhaseSec: 120,
} as const;

/**
 * Arrival times (seconds from the phase start) for `count` guests, in arrival order.
 * Partners (`partnerOf(i)` with a higher index) come right after their partner.
 */
export function arrivalSchedule(count: number, partnerOf: (i: number) => number | null, rng: () => number): number[] {
  const times = new Array<number>(count).fill(-1);
  let t = ARRIVAL.firstDelaySec;
  let groupsPlaced = 0;
  const groupsTotal = Math.max(1, count);
  for (let i = 0; i < count; i++) {
    if (times[i] >= 0) continue;
    times[i] = t;
    const p = partnerOf(i);
    if (p !== null && p > i && p < count && times[p] < 0) times[p] = t + ARRIVAL.partnerGapSec;
    groupsPlaced++;
    const k = Math.min(1, groupsPlaced / groupsTotal);
    const gap = ARRIVAL.gapStartSec + (ARRIVAL.gapEndSec - ARRIVAL.gapStartSec) * k;
    t += gap * (0.8 + rng() * 0.4);
  }
  return times;
}

/** Shot quality for a guest photographed `poseT` seconds into the pose (null = not posing). */
export function rateArrivalShot(poseT: number): 'gold' | 'ok' | null {
  if (poseT < 0 || poseT > ARRIVAL.poseSec) return null;
  if (poseT >= ARRIVAL.peakStartSec && poseT <= ARRIVAL.peakEndSec) return 'gold';
  return 'ok';
}
