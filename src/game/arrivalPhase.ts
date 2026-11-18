/**
 * Arrival phase (reception) — moved out of IsoArenaCanvas.tsx (REFACTOR_MAP area 6).
 * Guests walk in from the courtyard, queue at the flower photo wall, pose, then walk through
 * the hall door to their seat. The canvas owns phase timers and drawing; this module owns
 * the arriving guests and the arrival stats.
 */

import type { WeddingGuestActor } from '../components/IsoArenaCanvas';
import { angleToIsoDirection, moveTowardPoint, worldToIso } from './rules';
import { ARRIVAL, arrivalSchedule } from './eventPhases';
import { ARRIVAL_ENTRY, HALL_DOOR, PHOTO_SPOT } from './venueOutside';

export interface ArrivalStats {
  total: number;
  photographed: number;
  gold: number;
  missed: number;
}

export interface ArrivalHost {
  /** Photographer position (guests turn to face him while posing). */
  player: { x: number; y: number };
  /** Take the freshly spawned guests out of the hall list (they re-enter it when seated). */
  takeHallGuests(): WeddingGuestActor[];
  /** A guest reached their seat: put them back in the hall list. */
  seatGuest(g: WeddingGuestActor): void;
  /** The pose ended without a photo. */
  onMissed(g: WeddingGuestActor): void;
  /** Everyone is seated (or the phase ran too long): start the dancing. */
  onAllSeated(): void;
}

export interface ArrivalController {
  readonly guests: WeddingGuestActor[];
  readonly stats: ArrivalStats;
  start(): void;
  /** Anyone still on the way just takes their seat. */
  finishAll(): void;
  update(dt: number, phaseTime: number): void;
}

export function createArrival(host: ArrivalHost): ArrivalController {
  let arrivingGuests: WeddingGuestActor[] = [];
  const stats: ArrivalStats = { total: 0, photographed: 0, gold: 0, missed: 0 };

  function start() {
    const hall = host.takeHallGuests();
    const partnerIndex = (i: number) => {
      const pid = hall[i].partnerId;
      if (pid == null) return null;
      const j = hall.findIndex((o) => o.id === pid);
      return j >= 0 ? j : null;
    };
    const times = arrivalSchedule(hall.length, partnerIndex, Math.random);
    const order = times.map((t, i) => ({ t, i })).sort((a, b) => a.t - b.t);
    arrivingGuests = hall.map((g, i) => {
      g.arrival = {
        state: 'waiting',
        delay: times[i],
        order: order.findIndex((o) => o.i === i),
        poseT: 0,
        photographed: false,
        seatX: g.x,
        seatY: g.y,
        viaDoor: false,
        poseOffsetY: 0,
      };
      g.x = ARRIVAL_ENTRY.x;
      g.y = ARRIVAL_ENTRY.y;
      g.guestActivity = 'seated';
      g.isSeated = false;
      g.speechBubbleText = null;
      return g;
    });
    stats.total = arrivingGuests.length;
    stats.photographed = 0;
    stats.gold = 0;
    stats.missed = 0;
  }

  function finishArrival(g: WeddingGuestActor) {
    const a = g.arrival;
    if (!a) return;
    g.x = a.seatX;
    g.y = a.seatY;
    g.homeX = a.seatX;
    g.homeY = a.seatY;
    g.guestActivity = 'seated';
    g.isSeated = true;
    g.activityCooldown = 6 + Math.random() * 6;
    g.arrival = undefined;
    host.seatGuest(g);
  }

  function finishAll() {
    for (const g of arrivingGuests) finishArrival(g);
    arrivingGuests = [];
  }

  /** One arriving guest: walk in → queue → pose at the photo wall → walk through the door to the seat. */
  function updateArrivingGuest(g: WeddingGuestActor, dt: number, queueIdx: number, partnerPosing: boolean) {
    const a = g.arrival!;
    const player = host.player;
    g.dancePhase += dt * g.danceTempo;
    g.hitFlashTimer = Math.max(0, g.hitFlashTimer - dt);
    if ((g.flashTintTimer ?? 0) > 0) g.flashTintTimer = Math.max(0, (g.flashTintTimer ?? 0) - dt);
    g.celebrateTimer = Math.max(0, g.celebrateTimer - dt);
    if (g.speechBubbleText) {
      g.wantsPhotoTimer -= dt;
      if (g.wantsPhotoTimer <= 0) g.speechBubbleText = null;
    }
    const walkTo = (tx: number, ty: number, speed: number) => {
      const mv = moveTowardPoint(g, { x: tx, y: ty }, speed, dt, 2);
      const step = Math.hypot(mv.x - g.x, mv.y - g.y);
      if (step > 0.01) {
        const isoA = worldToIso(g.x, g.y);
        const isoB = worldToIso(mv.x, mv.y);
        g.direction = angleToIsoDirection(Math.atan2(isoB.y - isoA.y, isoB.x - isoA.x));
        g.strideDist += step * 1.5;
      }
      g.x = mv.x;
      g.y = mv.y;
      return Math.hypot(tx - g.x, ty - g.y) < 3;
    };
    if (a.state === 'waiting') {
      a.delay -= dt;
      if (a.delay <= 0) {
        a.state = 'walking_in';
        g.y = ARRIVAL_ENTRY.y + (Math.random() - 0.5) * 10;
      }
      return;
    }
    if (a.state === 'walking_in') {
      // Partners pose together side by side; everyone else lines up behind the photo spot
      const slot = partnerPosing ? 0 : queueIdx;
      a.poseOffsetY = partnerPosing ? 22 : 0;
      const tx = PHOTO_SPOT.x + slot * ARRIVAL.queueSpacing;
      const ty = PHOTO_SPOT.y + a.poseOffsetY;
      const arrived = walkTo(tx, ty, ARRIVAL.walkSpeed);
      if (arrived && slot === 0) {
        a.state = 'posing';
        a.poseT = 0;
        g.direction = 'SW';
        g.speechBubbleText = ['📸 צלם אותנו!', '😁 צ׳יז!', '✨ תמונה!', '🥂 לחיים!'][g.id % 4];
        g.wantsPhotoTimer = 1.4;
      } else if (arrived) {
        g.direction = 'W';
      }
      return;
    }
    if (a.state === 'posing') {
      a.poseT += dt;
      g.strideDist += dt * 20;
      // face the photographer when he's around
      const isoG = worldToIso(g.x, g.y);
      const isoP = worldToIso(player.x, player.y);
      if (Math.hypot(player.x - g.x, player.y - g.y) < 260) {
        g.direction = angleToIsoDirection(Math.atan2(isoP.y - isoG.y, isoP.x - isoG.x));
      }
      if (a.poseT >= ARRIVAL.poseSec) {
        if (!a.photographed) {
          stats.missed++;
          host.onMissed(g);
        }
        a.state = 'leaving';
      }
      return;
    }
    // leaving: through the hall door, then to the seat
    if (!a.viaDoor) {
      if (walkTo(HALL_DOOR.x, HALL_DOOR.y + a.poseOffsetY * 0.5, ARRIVAL.walkSpeed * 1.1)) a.viaDoor = true;
      return;
    }
    if (walkTo(a.seatX, a.seatY, ARRIVAL.walkSpeed * 1.2)) finishArrival(g);
  }

  function update(dt: number, phaseTime: number) {
    // queue order: guests walking in / posing, by arrival order
    const line = arrivingGuests
      .filter((g) => g.arrival && (g.arrival.state === 'walking_in' || g.arrival.state === 'posing'))
      .sort((a, b) => a.arrival!.order - b.arrival!.order);
    const leader = line[0];
    line.forEach((g, idx) => {
      const partnerPosing =
        idx === 1 && leader && leader.partnerId === g.id && Math.hypot(leader.x - g.x, leader.y - g.y) < 70;
      updateArrivingGuest(g, dt, idx, Boolean(partnerPosing) || Boolean(idx === 1 && leader?.partnerId === g.id));
    });
    // the rest (waiting / leaving)
    for (const g of [...arrivingGuests]) {
      if (!g.arrival || g.arrival.state === 'walking_in' || g.arrival.state === 'posing') continue;
      updateArrivingGuest(g, dt, 0, false);
    }
    // partners pose together: when the leader poses, a partner standing at the spot poses too
    for (const g of line) {
      const a = g.arrival;
      if (!a || a.state !== 'walking_in' || !leader?.arrival || leader.arrival.state !== 'posing') continue;
      if (leader.partnerId === g.id && Math.hypot(g.x - PHOTO_SPOT.x, g.y - (PHOTO_SPOT.y + 22)) < 4) {
        a.state = 'posing';
        a.poseT = leader.arrival.poseT;
        a.poseOffsetY = 22;
      }
    }
    arrivingGuests = arrivingGuests.filter((g) => g.arrival);
    if ((arrivingGuests.length === 0 && stats.total > 0) || phaseTime > ARRIVAL.maxPhaseSec) {
      host.onAllSeated();
    }
  }

  return {
    get guests() {
      return arrivingGuests;
    },
    stats,
    start,
    finishAll,
    update,
  };
}
