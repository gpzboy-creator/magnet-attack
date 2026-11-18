/**
 * The bride & groom before the dancing: they wait in the bridal suite during the reception, then make
 * their entrance through the lobby into the hall (suite → lobby → hall door → dance floor).
 * The canvas hands control to its usual couple logic (updateVipCouple) once they reach the floor.
 */

import { angleToIsoDirection, moveTowardPoint, worldToIso } from './rules.ts';
import { SUITE_SPOTS, SUITE_TO_HALL } from './venueRooms.ts';

interface CoupleActor {
  x: number;
  y: number;
  direction: string;
  strideDist: number;
  dancePhase: number;
  danceTempo: number;
  hitFlashTimer: number;
  celebrateTimer: number;
  flashTintTimer?: number;
  wantsPhotoTimer: number;
  speechBubbleText: string | null;
}

const WALK_SPEED = 64;
const placed = new WeakSet<object>();

const tickTimers = (m: CoupleActor, dt: number) => {
  m.dancePhase += dt * m.danceTempo;
  m.hitFlashTimer = Math.max(0, m.hitFlashTimer - dt);
  m.celebrateTimer = Math.max(0, m.celebrateTimer - dt);
  if ((m.flashTintTimer ?? 0) > 0) m.flashTintTimer = Math.max(0, (m.flashTintTimer ?? 0) - dt);
  if (m.speechBubbleText) {
    m.wantsPhotoTimer -= dt;
    if (m.wantsPhotoTimer <= 0) m.speechBubbleText = null;
  }
};

const placeInSuite = (couple: CoupleActor[]) =>
  couple.forEach((m, i) => {
    if (placed.has(m)) return;
    placed.add(m);
    const spot = i === 0 ? SUITE_SPOTS.bride : SUITE_SPOTS.groom;
    m.x = spot.x;
    m.y = spot.y;
    m.direction = 'W';
  });

/** Reception: the couple rests in the bridal suite (placed there on the first call). */
export function idleCoupleInSuite(couple: CoupleActor[], dt: number): void {
  placeInSuite(couple);
  couple.forEach((m) => tickTimers(m, dt));
}

export interface CoupleEntrance {
  active: boolean;
  leg: number[];
}

export const createEntrance = (): CoupleEntrance => ({ active: false, leg: [0, 0] });

export function startEntrance(e: CoupleEntrance, couple: CoupleActor[]): void {
  placeInSuite(couple); // (also when the reception was skipped, e.g. ?phase=dancing)
  e.active = couple.length > 0;
  e.leg = couple.map(() => 0);
  if (couple[0]) {
    couple[0].speechBubbleText = '💍 יוצאים מחדר הכלה!';
    couple[0].wantsPhotoTimer = 2.4;
  }
}

/** Walk the couple along the entrance route. Returns true while the entrance is still running. */
export function stepEntrance(e: CoupleEntrance, couple: CoupleActor[], dt: number): boolean {
  if (!e.active) return false;
  let done = 0;
  couple.forEach((m, i) => {
    tickTimers(m, dt);
    const k = e.leg[i] ?? 0;
    if (k >= SUITE_TO_HALL.length) {
      done++;
      return;
    }
    // the groom walks a step behind and beside the bride
    const wp = SUITE_TO_HALL[k];
    const target = i === 0 ? wp : { x: wp.x + 10, y: wp.y + 12 };
    const mv = moveTowardPoint(m, target, WALK_SPEED, dt, 2);
    const step = Math.hypot(mv.x - m.x, mv.y - m.y);
    if (step > 0.01) {
      const a = worldToIso(m.x, m.y);
      const b = worldToIso(mv.x, mv.y);
      m.direction = angleToIsoDirection(Math.atan2(b.y - a.y, b.x - a.x));
      m.strideDist += step * 1.5;
    }
    m.x = mv.x;
    m.y = mv.y;
    if (Math.hypot(target.x - m.x, target.y - m.y) < 4) e.leg[i] = k + 1;
  });
  if (done === couple.length) {
    e.active = false;
    if (couple[0]) {
      couple[0].speechBubbleText = '🎉 החתן והכלה באולם!';
      couple[0].wantsPhotoTimer = 2.4;
    }
    return false;
  }
  return true;
}
