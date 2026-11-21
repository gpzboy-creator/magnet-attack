/**
 * The bride & groom in the hall (moved out of IsoArenaCanvas.tsx): they roam between the dance floor,
 * the tables and the bar, now and then split up for a short mingle, and turn to the camera when the
 * photographer is close. In a seated hall phase they keep to their spot (eventPhases.ts coupleHallSpot):
 * the middle of the floor for the slow dance, the front of the tables for dinner.
 */

import type { WeddingGuestActor } from './guestActor.ts';
import type { EveningState } from './gameState.ts';
import { CHUPPAH_SPOTS } from './chuppahIsland.ts';
import { HALL_TABLES } from './hallLayout.ts';
import { BAR_GUEST_SPOTS } from './hallBar.ts';
import { DIALOGUE_HE } from './guestBalance.ts';
import { coupleHallSpot } from './eventPhases.ts';
import { angleToIsoDirection, moveTowardPoint, worldToIso } from './rules.ts';

type Point = { x: number; y: number };

const COUPLE_CHUPPAH_SPOTS = [
  CHUPPAH_SPOTS.bride,
  CHUPPAH_SPOTS.groom,
];
export const COUPLE_ROAM_SPOTS = [
  { x: 0, y: 2 }, // middle of the dance floor
  { x: -40, y: -30 },
  { x: 40, y: 34 },
  { x: 30, y: -40 },
];
/** Chance that the next stop is a short separate mingle (they rejoin right after). */
const COUPLE_SPLIT_CHANCE = 0.3;
/** Both are on their marks under the chuppah during the kiss moment (drawn as an embrace). */
export const isCoupleAtChuppah = (vipCouple: WeddingGuestActor[], evening: Pick<EveningState, 'vipEvent'>) =>
  vipCouple.length === 2 &&
  evening.vipEvent?.kind === 'chuppah_kiss' &&
  vipCouple.every(
    (m, i) => Math.hypot(m.x - COUPLE_CHUPPAH_SPOTS[i].x, m.y - COUPLE_CHUPPAH_SPOTS[i].y) < 8
  );

export function createCoupleHall() {
  let coupleRoamIdx = 0;
  /** True while the bride and groom are mingling separately. */
  let coupleSplit = false;
  function update(vipCouple: WeddingGuestActor[], dt: number, evening: Pick<EveningState, 'phase' | 'vipEvent'>, player: Point) {
    const [bride, groom] = vipCouple;
    if (!bride || !groom) return;
    const chuppahMoment = Boolean(evening.vipEvent && evening.vipEvent.kind === 'chuppah_kiss' && evening.vipEvent.remainingSec > 0);
    if (chuppahMoment) coupleSplit = false; // the big moments are always together
    bride.vipTimer = (bride.vipTimer ?? 0) - dt;
    if (!chuppahMoment && bride.vipTimer <= 0) {
      // Next stop: alternate dance-floor spots with visits to a banquet table or the bar
      coupleRoamIdx++;
      let tx: number;
      let ty: number;
      // Mostly together; now and then they mingle separately for a short while
      // (never twice in a row, and always together for the big moments)
      const wasSplit = coupleSplit;
      coupleSplit = !wasSplit && coupleRoamIdx > 1 && Math.random() < COUPLE_SPLIT_CHANCE;
      if (coupleSplit) {
        const tbl = HALL_TABLES[Math.floor(Math.random() * HALL_TABLES.length)];
        const bar = BAR_GUEST_SPOTS[Math.floor(Math.random() * BAR_GUEST_SPOTS.length)];
        tx = tbl.x + 30;
        ty = tbl.y + 26;
        groom.vipTargetX = bar.x + 14;
        groom.vipTargetY = bar.y + 18;
        bride.vipTargetX = tx;
        bride.vipTargetY = ty;
        bride.vipTimer = 9 + Math.random() * 5;
        bride.speechBubbleText = '👰 קופצת לחברות!';
        bride.wantsPhotoTimer = 2;
        groom.speechBubbleText = '🤵 לחיים עם החבר׳ה!';
        groom.wantsPhotoTimer = 2;
        return;
      }
      if (coupleRoamIdx % 3 === 1) {
        const tbl = HALL_TABLES[Math.floor(Math.random() * HALL_TABLES.length)];
        tx = tbl.x + 30;
        ty = tbl.y + 26;
      } else if (coupleRoamIdx % 6 === 5) {
        const spot = BAR_GUEST_SPOTS[BAR_GUEST_SPOTS.length - 1];
        tx = spot.x + 14;
        ty = spot.y + 18;
      } else {
        const spot = COUPLE_ROAM_SPOTS[coupleRoamIdx % COUPLE_ROAM_SPOTS.length];
        tx = spot.x;
        ty = spot.y;
      }
      bride.vipTargetX = tx;
      bride.vipTargetY = ty;
      bride.vipTimer = 11 + Math.random() * 7;
      if (Math.random() < 0.6) {
        const lines = DIALOGUE_HE.brideGroomLines;
        bride.speechBubbleText = lines[Math.floor(Math.random() * lines.length)];
        bride.wantsPhotoTimer = 2;
      }
    }
    vipCouple.forEach((m, i) => {
      m.dancePhase += dt * m.danceTempo;
      m.hitFlashTimer = Math.max(0, m.hitFlashTimer - dt);
      m.celebrateTimer = Math.max(0, m.celebrateTimer - dt);
      if ((m.flashTintTimer ?? 0) > 0) m.flashTintTimer = Math.max(0, (m.flashTintTimer ?? 0) - dt);
      if (m.speechBubbleText) {
        m.wantsPhotoTimer -= dt;
        if (m.wantsPhotoTimer <= 0) m.speechBubbleText = null;
      }
      const target = coupleHallSpot(evening.phase, i) ?? (chuppahMoment
        ? COUPLE_CHUPPAH_SPOTS[i]
        : coupleSplit && i === 1
        ? { x: groom.vipTargetX ?? 0, y: groom.vipTargetY ?? 0 }
        : { x: (bride.vipTargetX ?? 0) - i * 15, y: (bride.vipTargetY ?? 0) - i * 6 });
      const mv = moveTowardPoint(m, target, 58, dt, 3);
      const stepLen = Math.hypot(mv.x - m.x, mv.y - m.y);
      if (stepLen > 0.01) {
        const isoM = worldToIso(m.x, m.y);
        const isoT = worldToIso(target.x, target.y);
        m.direction = angleToIsoDirection(Math.atan2(isoT.y - isoM.y, isoT.x - isoM.x));
        m.strideDist += stepLen * 1.5;
        m.x = mv.x;
        m.y = mv.y;
      } else {
        m.strideDist += dt * 38;
        if (chuppahMoment) {
          m.direction = 'S';
          m.celebrateTimer = Math.max(m.celebrateTimer, 0.3);
          if (i === 0 && !m.speechBubbleText) {
            m.speechBubbleText = '💍 צלם אותנו בחופה!';
            m.wantsPhotoTimer = 3;
          }
        } else {
          // Dance with each other; turn to the camera when the photographer is close
          const other = vipCouple[1 - i];
          const near = Math.hypot(player.x - m.x, player.y - m.y) < 90;
          const fx = near ? player.x : other.x;
          const fy = near ? player.y : other.y;
          const isoM = worldToIso(m.x, m.y);
          const isoF = worldToIso(fx, fy);
          m.direction = angleToIsoDirection(Math.atan2(isoF.y - isoM.y, isoF.x - isoM.x));
        }
      }
    });
  }
  return { update };
}
