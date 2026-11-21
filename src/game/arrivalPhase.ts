/**
 * Arrival phase (reception) — moved out of IsoArenaCanvas.tsx (REFACTOR_MAP area 6).
 * Guests walk in from the courtyard, queue at the flower photo wall and pose, then mingle in the
 * reception garden (yardMingle.ts: sides, friend groups, buffet queues, asking the photographer).
 * When everyone has posed and mingled a while, the chuppah is called (ceremonyPhase.ts); after the
 * ceremony they walk through the hall door to their seat.
 * The canvas owns phase timers and drawing; this module owns the arriving guests and the stats.
 */

import type { WeddingGuestActor } from './guestActor';
import { angleToIsoDirection, moveTowardPoint, worldToIso } from './rules';
import { ARRIVAL, arrivalSchedule } from './eventPhases';
import {
  ARRIVAL_ENTRY,
  BENCHES,
  COCKTAIL_TABLES,
  COURTYARD,
  COURTYARD_PATH,
  FOOD_STATIONS,
  FOUNTAIN_POS,
  HALL_DOOR,
  OUTSIDE_OBSTACLES,
  PHOTO_SPOT,
  RECEPTION_BAR,
} from './venueOutside';
import { createCeremony, type CeremonyStage } from './ceremonyPhase';
import { idleCoupleInSuite } from './coupleSuite';
import {
  MINGLE,
  assignSides,
  formGroups,
  memberSpot,
  newAsk,
  placeGroupSpots,
  queueSlot,
  randIn,
  shortestQueue,
  stepAsk,
  type AskState,
  type Hotspot,
  type Point,
  type Side,
} from './yardMingle';

/** Reception garden attractions (south of the path); the crowd gathers around them. */
const barFront = { x: (RECEPTION_BAR.minX + RECEPTION_BAR.maxX) / 2, y: RECEPTION_BAR.maxY + 60 };
const YARD_HOTSPOTS: Hotspot[] = [
  { ...barFront, weight: 3 },
  ...COCKTAIL_TABLES.map(([x, y]) => ({ x, y, weight: 2 })),
  { x: FOUNTAIN_POS.x + 70, y: FOUNTAIN_POS.y - 40, weight: 1.5 },
  ...BENCHES.map((b) => ({ x: (b.x0 + b.x1) / 2, y: b.y + 30, weight: 1 })),
  { x: 1250, y: 460, weight: 1 },
  { x: 1580, y: 450, weight: 1 },
  { x: 1300, y: 760, weight: 1 },
];
const BUFFET_FRONTS: Point[] = FOOD_STATIONS.map((r) => ({ x: (r.minX + r.maxX) / 2, y: r.maxY + 14 }));

/** Open garden ground: inside the courtyard, south of the path, clear of props and the photo wall. */
function isYardFree(p: Point): boolean {
  if (p.x < COURTYARD.minX + 30 || p.x > COURTYARD.maxX - 30) return false;
  if (p.y < COURTYARD_PATH.maxY + 14 || p.y > COURTYARD.maxY - 30) return false;
  if (Math.hypot(p.x - PHOTO_SPOT.x, p.y - PHOTO_SPOT.y) < 70) return false;
  for (const o of OUTSIDE_OBSTACLES) {
    if (o.kind === 'circle') {
      if (Math.hypot(p.x - o.x, p.y - o.y) < o.r + 12) return false;
    } else if (p.x > o.minX - 12 && p.x < o.maxX + 12 && p.y > o.minY - 12 && p.y < o.maxY + 12) {
      return false;
    }
  }
  return true;
}

type YardActivity = 'to_spot' | 'chatting' | 'to_buffet' | 'eating';

interface YardState {
  side: Side;
  group: number;
  spot: Point;
  activity: YardActivity;
  timer: number;
  ask: AskState;
  /** Index of the buffet queue this guest stands in. */
  queue: number | null;
  /** A yard photo of a guest missed at the wall was counted in the stats. */
  counted: boolean;
}

export interface ArrivalStats {
  total: number;
  photographed: number;
  gold: number;
  missed: number;
  /** Guests who asked for a photo in the yard and didn't get one. */
  ignored: number;
}

export interface ArrivalHost {
  /** Photographer position (guests turn to face him while posing). */
  player: { x: number; y: number };
  /** Take the freshly spawned guests out of the hall list (they re-enter it when seated). */
  takeHallGuests(): WeddingGuestActor[];
  /** A guest reached their seat: put them back in the hall list. */
  seatGuest(g: WeddingGuestActor): void;
  /** The pose ended without a photo ('wall'), or a guest in the yard asked and was ignored ('yard'). */
  onMissed(g: WeddingGuestActor, where: 'wall' | 'yard'): void;
  /** Everyone called in is seated in the hall (or the walk-in ran too long). */
  onAllSeated(): void;
  /** The reception is over (everyone posed and mingled a while): the evening's next phase decides. */
  onReceptionOver(): void;
  /** The chuppah is over (the couple heads back to the suite): the evening's next phase decides. */
  onCeremonyDone(): void;
}

export interface ArrivalController {
  readonly guests: WeddingGuestActor[];
  readonly stats: ArrivalStats;
  /** Groom's or bride's side (assigned at the start of the reception). */
  sideOf(id: number): Side | null;
  /** Still on the way in or at the photo wall. */
  readonly comingCount: number;
  /** Mingling in the garden. */
  readonly yardCount: number;
  start(): void;
  /** Anyone still on the way just takes their seat. */
  finishAll(): void;
  update(dt: number, phaseTime: number): void;
  /** The bride & groom: in the suite during the reception, walking to the chuppah in the ceremony. */
  stepCouple(couple: WeddingGuestActor[], dt: number): void;
  readonly ceremonyStage: CeremonyStage;
  readonly ceremonyLabelHe: string;
  /** The guests in the yard go to the chuppah. */
  startCeremony(): void;
  /** Everyone outside heads for the hall and takes their seat. */
  callIn(): void;
  /** Debug (?phase=ceremony): everyone is in the yard and the reception ends right away. */
  skipReception(): void;
}

export function createArrival(host: ArrivalHost): ArrivalController {
  let arrivingGuests: WeddingGuestActor[] = [];
  const stats: ArrivalStats = { total: 0, photographed: 0, gold: 0, missed: 0, ignored: 0 };
  const yard = new Map<number, YardState>();
  let groupSpots: Point[] = [];
  let groupMembers: number[][] = [];
  let queues: number[][] = BUFFET_FRONTS.map(() => []);
  let sinceAllPosed = 0;
  let calledIn = false;
  let receptionOver = false;
  let ceremonyHeld = false;
  let sinceCalledIn = 0;
  const ceremony = createCeremony(() => host.onCeremonyDone());

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
    stats.ignored = 0;

    // Yard: sides, friend groups and where each group gathers
    const sides = assignSides(arrivingGuests, Math.random);
    groupMembers = formGroups(arrivingGuests, sides, Math.random);
    groupSpots = placeGroupSpots(groupMembers.length, YARD_HOTSPOTS, isYardFree, Math.random);
    yard.clear();
    queues = BUFFET_FRONTS.map(() => []);
    sinceAllPosed = 0;
    calledIn = false;
    receptionOver = false;
    ceremonyHeld = false;
    sinceCalledIn = 0;
    groupMembers.forEach((members, gi) => {
      members.forEach((id, idx) => {
        yard.set(id, {
          side: sides.get(id) ?? 'groom',
          group: gi,
          spot: memberSpot(groupSpots[gi], idx, members.length, Math.random, isYardFree),
          activity: 'to_spot',
          timer: 0,
          ask: newAsk(),
          queue: null,
          counted: false,
        });
      });
    });
  }

  const leaveQueue = (id: number, y: YardState) => {
    if (y.queue == null) return;
    queues[y.queue] = queues[y.queue].filter((q) => q !== id);
    y.queue = null;
  };

  /** One guest mingling in the yard. */
  function updateMingling(g: WeddingGuestActor, dt: number, walkTo: (tx: number, ty: number, speed: number) => boolean) {
    const y = yard.get(g.id);
    if (!y) return;
    const player = host.player;
    const dist = Math.hypot(player.x - g.x, player.y - g.y);

    // A guest missed at the wall but photographed in the yard counts as photographed
    if (!y.counted && g.photoCount > 0 && !g.arrival?.photographed) {
      y.counted = true;
      stats.photographed++;
    }
    // Asking the photographer (only guests nobody has photographed yet)
    const step = stepAsk(y.ask, dist, dt, g.photoCount > 0);
    if (step.event === 'started') {
      g.speechBubbleText = ['📸 גם אותנו!', '📸 צלם אותנו!', '😁 תמונה?', '🥂 צלם!'][g.id % 4];
      g.wantsPhotoTimer = MINGLE.askSec;
    } else if (step.event === 'ignored') {
      stats.ignored++;
      g.speechBubbleText = '😒';
      g.wantsPhotoTimer = 1.6;
      host.onMissed(g, 'yard');
    } else if (y.ask.phase === 'asking' && step.state.phase === 'done') {
      g.speechBubbleText = '😁';
      g.wantsPhotoTimer = 1.2;
    }
    y.ask = step.state;
    if (y.ask.phase === 'asking') {
      const isoG = worldToIso(g.x, g.y);
      const isoP = worldToIso(player.x, player.y);
      g.direction = angleToIsoDirection(Math.atan2(isoP.y - isoG.y, isoP.x - isoG.x));
      return; // stands still, posing for the photographer
    }

    const speed = MINGLE.walkSpeed;
    if (y.activity === 'to_spot') {
      if (walkTo(y.spot.x, y.spot.y, speed)) {
        y.activity = 'chatting';
        y.timer = randIn(Math.random, MINGLE.chatSec);
        const c = groupSpots[y.group];
        const isoG = worldToIso(g.x, g.y);
        const isoC = worldToIso(c.x, c.y);
        if (Math.hypot(c.x - g.x, c.y - g.y) > 4) g.direction = angleToIsoDirection(Math.atan2(isoC.y - isoG.y, isoC.x - isoG.x));
      }
      return;
    }
    if (y.activity === 'chatting') {
      g.strideDist += dt * 6; // small idle sway
      y.timer -= dt;
      if (y.timer > 0) return;
      if (Math.random() < MINGLE.buffetChance && BUFFET_FRONTS.length > 0) {
        y.queue = shortestQueue(queues);
        queues[y.queue].push(g.id);
        y.activity = 'to_buffet';
      } else {
        const members = groupMembers[y.group];
        y.spot = memberSpot(groupSpots[y.group], members.indexOf(g.id), members.length, Math.random, isYardFree);
        y.activity = 'to_spot';
      }
      return;
    }
    if (y.activity === 'to_buffet' && y.queue != null) {
      const idx = queues[y.queue].indexOf(g.id);
      const slot = queueSlot(BUFFET_FRONTS[y.queue], Math.max(0, idx));
      const arrived = walkTo(slot.x, slot.y, speed);
      if (arrived) g.direction = 'NW';
      if (arrived && idx === 0) {
        y.activity = 'eating';
        y.timer = randIn(Math.random, MINGLE.serveSec);
      }
      return;
    }
    if (y.activity === 'eating') {
      y.timer -= dt;
      if (y.timer > 0) return;
      leaveQueue(g.id, y);
      g.speechBubbleText = ['🍢', '🍣', '🥗', '🍤'][g.id % 4];
      g.wantsPhotoTimer = 1.4;
      const members = groupMembers[y.group];
      y.spot = memberSpot(groupSpots[y.group], members.indexOf(g.id), members.length, Math.random, isYardFree);
      y.activity = 'to_spot';
    }
  }

  /** The reception is over: the host's program decides what comes next (chuppah, or into the hall). */
  function endReception() {
    receptionOver = true;
    host.onReceptionOver();
  }

  /** Everyone in the yard goes to the chuppah. */
  function startCeremony() {
    receptionOver = true;
    ceremonyHeld = true;
    const yardGuests = arrivingGuests.filter((g) => g.arrival?.state === 'mingling');
    for (const g of yardGuests) {
      const y = yard.get(g.id);
      if (y) leaveQueue(g.id, y);
      g.arrival!.state = 'ceremony';
      g.speechBubbleText = g.id % 4 === 0 ? '🔔 חופה!' : null;
      g.wantsPhotoTimer = 1.4;
    }
    ceremony.start(yardGuests, (id) => yard.get(id)?.side ?? null);
  }

  /** Everyone outside heads for the hall door. */
  function callIn() {
    calledIn = true;
    for (const g of arrivingGuests) {
      const a = g.arrival;
      if (!a || (a.state !== 'mingling' && a.state !== 'ceremony')) continue;
      const y = yard.get(g.id);
      if (y) leaveQueue(g.id, y);
      a.state = 'leaving';
      g.speechBubbleText = g.id % 3 === 0 ? '🎉 מזל טוב!' : null;
      g.wantsPhotoTimer = 1.4;
    }
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
    if (a.state === 'ceremony') return; // moved by ceremonyPhase.ts
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
          host.onMissed(g, 'wall');
        }
        // after the photo wall: mingle in the garden (or join the chuppah / go straight in)
        a.state = calledIn ? 'leaving' : ceremonyHeld ? 'ceremony' : 'mingling';
        if (a.state === 'ceremony') ceremony.adopt(g);
      }
      return;
    }
    if (a.state === 'mingling') {
      updateMingling(g, dt, walkTo);
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
    if (receptionOver) ceremony.update(arrivingGuests.filter((g) => g.arrival?.state === 'ceremony'), dt);
    // everyone has posed → mingle a while, then the chuppah is called (after it they go in)
    const stillComing = arrivingGuests.some((g) => g.arrival && g.arrival.state !== 'mingling' && g.arrival.state !== 'leaving');
    if (!stillComing) sinceAllPosed += dt;
    if (!receptionOver && (sinceAllPosed >= MINGLE.afterLastPoseSec || phaseTime > ARRIVAL.maxPhaseSec)) endReception();
    if (calledIn) sinceCalledIn += dt;
    // the hall phase starts once everyone is seated and the couple is back in the suite (or after a safety wait)
    const coupleReady = !ceremonyHeld || ceremony.coupleHome;
    if ((arrivingGuests.length === 0 && stats.total > 0 && coupleReady) || sinceCalledIn > 60) {
      host.onAllSeated();
    }
  }

  function skipReception() {
    for (const g of arrivingGuests) {
      const a = g.arrival;
      if (!a || a.state === 'leaving') continue;
      const y = yard.get(g.id);
      if (y) {
        g.x = y.spot.x;
        g.y = y.spot.y;
      }
      a.state = 'mingling';
    }
    endReception();
  }

  return {
    stepCouple(couple: WeddingGuestActor[], dt: number) {
      idleCoupleInSuite(couple, dt); // places them in the suite once, ticks their timers
      ceremony.stepCouple(couple, dt);
    },
    get ceremonyStage() {
      return ceremony.stage;
    },
    get ceremonyLabelHe() {
      return ceremony.labelHe;
    },
    startCeremony,
    callIn,
    skipReception,
    get guests() {
      return arrivingGuests;
    },
    sideOf: (id: number) => yard.get(id)?.side ?? null,
    get comingCount() {
      return arrivingGuests.filter((g) => g.arrival && (g.arrival.state === 'waiting' || g.arrival.state === 'walking_in' || g.arrival.state === 'posing')).length;
    },
    get yardCount() {
      return arrivingGuests.filter((g) => g.arrival?.state === 'mingling').length;
    },
    stats,
    start,
    finishAll,
    update,
  };
}
