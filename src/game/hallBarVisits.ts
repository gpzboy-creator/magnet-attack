/**
 * Guests visiting the hall bar during the dancing (moved out of IsoArenaCanvas.tsx, no behavior
 * change), now at the hall bar (hallBar.ts): every few seconds a dancer walks to a free spot at the bar for a drink — some lean on the
 * counter, smokers light up, the ones on the front side sway — then goes back to the dance floor.
 */

import { angleToIsoDirection, moveTowardPoint, worldToIso } from './rules.ts';
import type { IsoDirection } from './spriteExtractor.ts';
import { BAR_GUEST_SPOTS, barFacePoint } from './hallBar.ts';

/** The guest fields the bar visit reads and writes (a slice of WeddingGuestActor). */
export interface BarGoer {
  id: number;
  x: number;
  y: number;
  role: 'dancer' | 'table_guest';
  direction: IsoDirection;
  strideDist: number;
  dancePhase: number;
  celebrateTimer: number;
  wantsPhotoTimer: number;
  speechBubbleText: string | null;
  seekingMagnet?: boolean;
  isSeated?: boolean;
  guestActivity?: 'dancing' | 'recruiting' | 'seated' | 'bar';
  isEnteringFloor?: boolean;
  arrivalDelayTimer?: number;
  activityCooldown?: number;
  drinkTimer?: number;
  drinkKind?: number;
  barSpotIdx?: number;
  barTimer?: number;
  atBarArrived?: boolean;
  isSmoker?: boolean;
}

/** Seconds until the next bar visit is considered. */
export const nextBarVisitDelay = () => 2.5 + Math.random() * 3;

/** Send one idle dancer to a free bar spot (at most 4 guests at the bar, and keep 4+ dancing). */
export function sendGuestToBar(guests: BarGoer[]) {
  const atBar = guests.filter((g) => g.guestActivity === 'bar');
  if (atBar.length < 4) {
    const usedSpots = new Set(atBar.map((g) => g.barSpotIdx));
    const freeSpots = BAR_GUEST_SPOTS.map((_, i) => i).filter((i) => !usedSpots.has(i));
    const candidates = guests.filter(
      (g) =>
        g.guestActivity === 'dancing' &&
        !g.isEnteringFloor &&
        !g.seekingMagnet &&
        g.celebrateTimer <= 0 &&
        (g.activityCooldown ?? 0) <= 0
    );
    if (freeSpots.length > 0 && candidates.length > 3) {
      const goer = candidates[Math.floor(Math.random() * candidates.length)];
      goer.guestActivity = 'bar';
      goer.barSpotIdx = freeSpots[Math.floor(Math.random() * freeSpots.length)];
      goer.barTimer = 7 + Math.random() * 7;
      goer.atBarArrived = false;
      goer.speechBubbleText = goer.isSmoker ? '🚬 יוצא לבר רגע' : '🍸 לבר!';
      goer.wantsPhotoTimer = 1.4;
    }
  }
}

/** One frame of a guest whose activity is 'bar': walk to the spot, get a drink, stay, go back. */
export function updateGuestAtBar(guest: BarGoer, simDt: number) {
  guest.isSeated = false;
  guest.role = 'dancer';
  const spot = BAR_GUEST_SPOTS[guest.barSpotIdx ?? 0];
  if (!guest.atBarArrived) {
    const mv = moveTowardPoint(guest, spot, 52, simDt, 4);
    const stepLen = Math.hypot(mv.x - guest.x, mv.y - guest.y);
    if (stepLen > 0) {
      const isoG = worldToIso(guest.x, guest.y);
      const isoT = worldToIso(spot.x, spot.y);
      guest.direction = angleToIsoDirection(Math.atan2(isoT.y - isoG.y, isoT.x - isoG.x));
      guest.strideDist += stepLen * 1.5;
    }
    guest.x = mv.x;
    guest.y = mv.y;
    if (mv.arrived) {
      guest.atBarArrived = true;
      // Bartender hands over a drink
      guest.drinkTimer = Math.max(guest.drinkTimer ?? 0, (guest.barTimer ?? 8) + 8);
      guest.drinkKind = guest.id % 4;
    }
  } else {
    // Face the counter; guests along the front sway to the music
    const isoG = worldToIso(guest.x, guest.y);
    const face = barFacePoint(spot);
    const isoB = worldToIso(face.x, face.y);
    guest.direction = angleToIsoDirection(Math.atan2(isoB.y - isoG.y, isoB.x - isoG.x));
    const sway = (guest.barSpotIdx ?? 0) < 4 ? Math.sin(guest.dancePhase * 1.2) * 1.8 : 0;
    guest.x = spot.x + sway;
    guest.y = spot.y;
    guest.barTimer = (guest.barTimer ?? 0) - simDt;
    if ((guest.barTimer ?? 0) <= 0) {
      guest.guestActivity = 'dancing';
      guest.atBarArrived = false;
      guest.barSpotIdx = undefined;
      guest.isEnteringFloor = true;
      guest.arrivalDelayTimer = 0;
      guest.activityCooldown = 6;
    }
  }
}
