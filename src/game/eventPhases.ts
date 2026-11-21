/**
 * The phases of the wedding evening, like a real event (pure logic, tested).
 * Their order is set by the wedding program (weddingProgram.ts); eveningFlow.ts starts each one.
 *
 *   arrival  — guests arrive through the courtyard into the lobby, stop at the photo wall to pose,
 *              then walk into the hall and sit down. Shoot every guest while they pose.
 *   ceremony — the chuppah (ceremonyPhase.ts): the groom, then the bride, walk in with their parents.
 *   dancing  — the dance floor game (photograph, print, cut, stick magnets on the board).
 */

export type EventPhaseId = 'arrival' | 'ceremony' | 'dancing';

export interface EventPhaseInfo {
  id: EventPhaseId;
  titleHe: string;
  goalHe: string;
}

export const EVENT_PHASES: EventPhaseInfo[] = [
  {
    id: 'arrival',
    titleHe: '🚪 קבלת פנים',
    goalHe: 'האורחים מגיעים! צלם כל אורח בפוזה ליד קיר הפרחים, ואחר כך את מי שמבקש תמונה בחצר',
  },
  {
    id: 'ceremony',
    titleHe: '💍 חופה',
    goalHe: 'החתן נכנס עם ההורים, אחריו הכלה עם ההורים. צלם את הכניסות ואת הטקס!',
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
  walkSpeed: 84,
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
