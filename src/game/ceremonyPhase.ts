/**
 * The chuppah ceremony, between the reception and the dancing (project log: "שלב טקס החופה").
 *
 *   gather — the chuppah is announced: guests leave the yard and line both edges of the aisle;
 *            the rabbi and the siblings go up to the chuppah, the parents wait in the lobby.
 *   groom  — the groom walks from the bridal suite to the chuppah with his parents beside him.
 *   bride  — then the bride with hers. Behind HER the guests slowly close the aisle: the chairs
 *            near the chuppah fill first, the rest stand in a loose triangle behind the chairs
 *            (base at the chairs, tip toward the start of the aisle).
 *   vows   — everyone presses toward the chuppah; the rabbi marries them.
 *   after  — the couple goes back to the bridal suite (yichud), the guests go into the hall.
 *
 * The family are guests (picked by side), so they are photographed and get hearts like anyone.
 * Pure layout helpers are exported for tests (ceremonyPhase.test.ts); the controller is driven by
 * arrivalPhase.ts (which owns the arriving guests).
 */

import { CHUPPAH_POS, angleToIsoDirection, moveTowardPoint, worldToIso } from './rules.ts';
import { BRIDGE_FOOT, CHUPPAH_SPOTS } from './chuppahIsland.ts';
import { SUITE_SPOTS } from './venueRooms.ts';

export interface Point {
  x: number;
  y: number;
}

/** What the ceremony needs from a person (WeddingGuestActor and the bride & groom fit). */
export interface CeremonyActor {
  id?: number;
  x: number;
  y: number;
  direction: string;
  strideDist: number;
  partnerId?: number | null;
  speechBubbleText: string | null;
  wantsPhotoTimer: number;
}

export const CEREMONY = {
  /** Aisle centre line (world y) and where the chair rows sit (world x, facing +x). */
  aisleY: CHUPPAH_POS.y,
  rowXs: [1060, 1100, 1140, 1180],
  chairsPerSide: 4,
  chairSpacing: 27,
  /** First chair's distance from the aisle centre. */
  chairInner: 51,
  guestSpeed: 78,
  processionSpeed: 62,
  /** Seconds: the gathering ends when everyone is in line, or after this. */
  gatherMaxSec: 24,
  betweenSec: 2.5,
  vowsSec: 20,
  /** A guest closes the aisle this far behind the bride (world units). */
  closeBehind: 18,
  phoneShare: 0.2,
  /** Safety: the ceremony ends after this long whatever happens. */
  maxSec: 170,
} as const;

const CY = CEREMONY.aisleY;

/** The procession route from the bridal suite to the foot of the chuppah's bridge. */
export const SUITE_TO_CHUPPAH: Point[] = [
  { x: 619, y: 394 },
  { x: 619, y: 350 },
  { x: 650, y: 290 },
  { x: 690, y: 240 },
  { x: 915, y: 236 },
  { x: 915, y: CY },
  { x: BRIDGE_FOOT.x, y: CY },
  { x: CHUPPAH_POS.x - 80, y: CY },
];
/** Where the parents wait for their child (in the lobby, on the route). */
export const PARENTS_JOIN_AT = 1;

/** Stage spots under the chuppah (all within the stage top). */
export const STAGE = {
  groom: CHUPPAH_SPOTS.groom,
  bride: CHUPPAH_SPOTS.bride,
  rabbi: CHUPPAH_SPOTS.rabbi,
  groomParents: [{ x: CHUPPAH_POS.x - 34, y: CY - 46 }, { x: CHUPPAH_POS.x - 18, y: CY - 62 }],
  brideParents: [{ x: CHUPPAH_POS.x - 34, y: CY + 46 }, { x: CHUPPAH_POS.x - 18, y: CY + 62 }],
  groomSiblings: [{ x: CHUPPAH_POS.x + 20, y: CY - 66 }, { x: CHUPPAH_POS.x + 38, y: CY - 52 }],
  brideSiblings: [{ x: CHUPPAH_POS.x + 20, y: CY + 66 }, { x: CHUPPAH_POS.x + 38, y: CY + 52 }],
};

// ---------------------------------------------------------------------------
// Pure layout
// ---------------------------------------------------------------------------

/** A point `d` world units along a polyline (clamped), with the heading of that segment. */
export function pointAlong(route: Point[], d: number): { x: number; y: number; hx: number; hy: number; done: boolean } {
  let left = Math.max(0, d);
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    const hx = (b.x - a.x) / len;
    const hy = (b.y - a.y) / len;
    if (left < len) return { x: a.x + hx * left, y: a.y + hy * left, hx, hy, done: false };
    left -= len;
  }
  const n = route.length;
  const a = route[Math.max(0, n - 2)];
  const b = route[n - 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: b.x, y: b.y, hx: (b.x - a.x) / len, hy: (b.y - a.y) / len, done: true };
}

export function routeLength(route: Point[]): number {
  let s = 0;
  for (let i = 0; i < route.length - 1; i++) s += Math.hypot(route[i + 1].x - route[i].x, route[i + 1].y - route[i].y);
  return s;
}

/** Where a guest stands at a ceremony chair (in front of the seat, facing the chuppah). */
export function seatSpots(): Point[] {
  const out: Point[] = [];
  for (const x of CEREMONY.rowXs) {
    for (let k = 0; k < CEREMONY.chairsPerSide; k++) {
      const off = CEREMONY.chairInner + k * CEREMONY.chairSpacing;
      out.push({ x: x + 14, y: CY - off }, { x: x + 14, y: CY + off });
    }
  }
  return out;
}

/**
 * Line-up spots along both edges of the aisle, best first: the edge right next to the carpet from
 * the chuppah backwards, then further rows back from the carpet (before the chairs).
 */
export function lineSpots(count: number): Point[] {
  const out: Point[] = [];
  for (let x = 1196; x >= 952 && out.length < count; x -= 20) out.push({ x, y: CY - 38 }, { x, y: CY + 38 });
  for (let ring = 0; out.length < count && ring < 12; ring++) {
    const off = 58 + ring * 18;
    for (let x = 1036; x >= 952 && out.length < count; x -= 18) out.push({ x, y: CY - off }, { x, y: CY + off });
  }
  return out.slice(0, count);
}

/** The loose triangle behind the chairs: base along the last row, tip toward the start of the aisle. */
export function triangleSpots(count: number, rng: () => number): Point[] {
  const out: Point[] = [];
  const baseX = CEREMONY.rowXs[0] - 26;
  const halfBase = CEREMONY.chairInner + CEREMONY.chairSpacing * (CEREMONY.chairsPerSide - 1) + 10;
  for (let j = 0; out.length < count && j < 40; j++) {
    const x = baseX - j * 19;
    const hw = Math.max(0, halfBase * (1 - j / 9));
    for (let y = 0; y <= hw && out.length < count; y += 19) {
      const jit = () => (rng() - 0.5) * 10;
      out.push({ x: x + jit(), y: CY + y + 9 + jit() });
      if (out.length < count) out.push({ x: x + jit(), y: CY - y - 9 + jit() });
    }
  }
  return out;
}

/**
 * Who goes where when the aisle closes: the guests nearest the chuppah take the chairs (all chairs
 * fill first), everyone else gets a triangle spot. Returns a target per line spot index.
 */
export function closingTargets(line: Point[], seats: Point[], rng: () => number): Point[] {
  const order = line.map((p, i) => ({ p, i })).sort((a, b) => b.p.x - a.p.x);
  const free = seats.slice();
  const targets: Point[] = new Array(line.length);
  const standers: number[] = [];
  for (const { p, i } of order) {
    if (free.length === 0) {
      standers.push(i);
      continue;
    }
    let best = 0;
    let bd = Infinity;
    free.forEach((s, k) => {
      const d = Math.hypot(s.x - p.x, s.y - p.y) + (Math.sign(s.y - CY) !== Math.sign(p.y - CY) ? 400 : 0);
      if (d < bd) {
        bd = d;
        best = k;
      }
    });
    targets[i] = free.splice(best, 1)[0];
  }
  const tri = triangleSpots(standers.length, rng);
  // nearest-first: the guests closest to the chairs take the base of the triangle
  standers.forEach((i, k) => {
    targets[i] = tri[k];
  });
  return targets;
}

/** During the vows the standing crowd presses toward the chuppah. */
export function squeezeSpot(p: Point, k: number, rng: () => number): Point {
  if (k < 6) {
    // the first few step into the aisle between the chairs
    return { x: CEREMONY.rowXs[0] + 6 + k * 22 + (rng() - 0.5) * 8, y: CY + (k % 2 ? 10 : -10) + (rng() - 0.5) * 6 };
  }
  return { x: p.x + 22 + rng() * 8, y: CY + (p.y - CY) * 0.85 };
}

export interface Family {
  groomParents: number[];
  brideParents: number[];
  groomSiblings: number[];
  brideSiblings: number[];
  rabbi: number | null;
}

/** Pick the family from the guests: parents are a couple (partners) on that side when possible. */
export function pickFamily(guests: CeremonyActor[], sideOf: (id: number) => 'groom' | 'bride' | null): Family {
  const taken = new Set<number>();
  const ids = guests.map((g) => g.id ?? -1).filter((id) => id >= 0);
  const take = (n: number, pred: (id: number) => boolean) => {
    const out: number[] = [];
    for (const id of ids) {
      if (out.length >= n) break;
      if (!taken.has(id) && pred(id)) {
        out.push(id);
        taken.add(id);
      }
    }
    return out;
  };
  const partnerOf = new Map(guests.map((g) => [g.id ?? -1, g.partnerId ?? null]));
  const parents = (side: 'groom' | 'bride') => {
    for (const id of ids) {
      const p = partnerOf.get(id);
      if (p == null || taken.has(id) || taken.has(p) || sideOf(id) !== side) continue;
      if (!ids.includes(p)) continue;
      taken.add(id);
      taken.add(p);
      return [id, p];
    }
    return take(2, (id) => sideOf(id) === side);
  };
  const groomParents = parents('groom');
  const brideParents = parents('bride');
  const groomSiblings = take(2, (id) => sideOf(id) === 'groom');
  const brideSiblings = take(2, (id) => sideOf(id) === 'bride');
  const rabbi = take(1, () => true)[0] ?? null;
  return { groomParents, brideParents, groomSiblings, brideSiblings, rabbi };
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export type CeremonyStage = 'idle' | 'gather' | 'groom' | 'bride' | 'vows' | 'after' | 'done';

interface CrowdRole {
  kind: 'crowd';
  line: Point;
  close: Point;
  squeeze: Point;
  closed: boolean;
  phone: 'none' | 'video' | 'flash';
  cheered: boolean;
}
interface FamilyRole {
  kind: 'stage' | 'parent';
  /** Route to the stage (stage people) or to the lobby meeting point (parents). */
  path: Point[];
  leg: number;
  spot: Point;
  /** Parents: which procession, and which side of their child (-1 / +1). */
  of?: 'groom' | 'bride';
  flank?: number;
}
type Role = CrowdRole | FamilyRole;

export interface CeremonyController {
  readonly stage: CeremonyStage;
  readonly labelHe: string;
  /** True once the couple is back in the bridal suite after the ceremony. */
  readonly coupleHome: boolean;
  start(guests: CeremonyActor[], sideOf: (id: number) => 'groom' | 'bride' | null): void;
  /** A late guest (still posing when the chuppah was called) joins the back of the crowd. */
  adopt(g: CeremonyActor): void;
  update(guests: CeremonyActor[], dt: number): void;
  /** Bride = couple[0], groom = couple[1]. */
  stepCouple(couple: CeremonyActor[], dt: number): void;
}

export function createCeremony(onDone: () => void, rng: () => number = Math.random): CeremonyController {
  let stage: CeremonyStage = 'idle';
  let t = 0;
  const roles = new Map<number, Role>();
  let family: Family = { groomParents: [], brideParents: [], groomSiblings: [], brideSiblings: [], rabbi: null };
  let groomD = 0;
  let brideD = 0;
  let brideX = -Infinity;
  let coupleHome = false;
  let backLeg = 0;
  const routeLen = routeLength(SUITE_TO_CHUPPAH);
  const joinD = routeLength(SUITE_TO_CHUPPAH.slice(0, PARENTS_JOIN_AT + 1));
  let extraLine = 0;
  let groomX = -Infinity;
  /** The couple's own clock (waiting under the chuppah, the vows). */
  let coupleT = 0;
  let totalT = 0;

  const walk = (g: CeremonyActor, to: Point, speed: number, dt: number) => {
    const mv = moveTowardPoint(g, to, speed, dt, 2);
    const step = Math.hypot(mv.x - g.x, mv.y - g.y);
    if (step > 0.01) {
      const a = worldToIso(g.x, g.y);
      const b = worldToIso(mv.x, mv.y);
      g.direction = angleToIsoDirection(Math.atan2(b.y - a.y, b.x - a.x));
      g.strideDist += step * 1.5;
    }
    g.x = mv.x;
    g.y = mv.y;
    return Math.hypot(to.x - g.x, to.y - g.y) < 3;
  };
  const face = (g: CeremonyActor, p: Point) => {
    const a = worldToIso(g.x, g.y);
    const b = worldToIso(p.x, p.y);
    if (Math.hypot(b.x - a.x, b.y - a.y) > 1) g.direction = angleToIsoDirection(Math.atan2(b.y - a.y, b.x - a.x));
  };
  const say = (g: CeremonyActor, text: string, sec: number) => {
    g.speechBubbleText = text;
    g.wantsPhotoTimer = sec;
  };
  /** From the yard onto the lawn: through the connector at x≈915, then to the spot. */
  const viaLawn = (g: CeremonyActor, spot: Point): Point[] => (g.y > 150 ? [{ x: 915 + (rng() - 0.5) * 30, y: 236 }, spot] : [spot]);

  function start(guests: CeremonyActor[], sideOf: (id: number) => 'groom' | 'bride' | null) {
    stage = 'gather';
    t = 0;
    roles.clear();
    groomD = 0;
    brideD = 0;
    brideX = -Infinity;
    coupleHome = false;
    backLeg = 0;
    coupleT = 0;
    totalT = 0;
    groomX = -Infinity;
    family = pickFamily(guests, sideOf);
    const stageRole = (g: CeremonyActor, spot: Point): FamilyRole => ({
      kind: 'stage',
      path: [...viaLawn(g, { x: 915, y: CY }).slice(0, -1), { x: 915, y: CY }, { x: BRIDGE_FOOT.x, y: CY }, { x: CHUPPAH_POS.x - 80, y: CY }, spot],
      leg: 0,
      spot,
    });
    const meet = SUITE_TO_CHUPPAH[PARENTS_JOIN_AT];
    const parentRole = (of: 'groom' | 'bride', k: number): FamilyRole => {
      const flank = k === 0 ? -1 : 1;
      const spot = { x: meet.x + flank * 16, y: meet.y - 10 };
      return { kind: 'parent', path: [{ x: 690, y: 240 }, { x: 650, y: 290 }, spot], leg: 0, spot, of, flank };
    };
    const byId = new Map(guests.map((g) => [g.id ?? -1, g]));
    family.groomParents.forEach((id, k) => roles.set(id, parentRole('groom', k)));
    family.brideParents.forEach((id, k) => roles.set(id, parentRole('bride', k)));
    const stagePeople: Array<[number | null, Point]> = [
      [family.rabbi, STAGE.rabbi],
      ...family.groomSiblings.map((id, k) => [id, STAGE.groomSiblings[k]] as [number, Point]),
      ...family.brideSiblings.map((id, k) => [id, STAGE.brideSiblings[k]] as [number, Point]),
    ];
    for (const [id, spot] of stagePeople) {
      const g = id == null ? null : byId.get(id);
      if (g && id != null) roles.set(id, stageRole(g, spot));
    }
    if (family.rabbi != null) {
      const r = byId.get(family.rabbi);
      if (r) say(r, '📜 הרב', 3);
    }
    // the crowd: nearest guests take the best line spots
    const crowd = guests.filter((g) => !roles.has(g.id ?? -1));
    const spots = lineSpots(crowd.length);
    const closes = closingTargets(spots, seatSpots(), rng);
    const standers = closes.map((c, i) => ({ c, i })).filter(({ c }) => c.x < CEREMONY.rowXs[0]).sort((a, b) => b.c.x - a.c.x);
    const rank = new Map(standers.map(({ i }, k) => [i, k]));
    const free = spots.map((_, i) => i);
    crowd
      .slice()
      .sort((a, b) => Math.hypot(a.x - 915, a.y - CY) - Math.hypot(b.x - 915, b.y - CY))
      .forEach((g) => {
        const i = free.shift();
        if (i == null) return;
        const r = rng();
        const k = rank.get(i);
        roles.set(g.id ?? -1, {
          kind: 'crowd',
          line: spots[i],
          close: closes[i],
          squeeze: k == null ? closes[i] : squeezeSpot(closes[i], k, rng),
          closed: false,
          phone: r < CEREMONY.phoneShare * 0.6 ? 'video' : r < CEREMONY.phoneShare ? 'flash' : 'none',
          cheered: false,
        });
        (roles.get(g.id ?? -1) as CrowdRole & { path?: Point[] }).path = viaLawn(g, spots[i]);
      });
  }

  function adopt(g: CeremonyActor) {
    if (stage === 'idle' || roles.has(g.id ?? -1)) return;
    const k = extraLine++;
    const side = k % 2 ? 1 : -1;
    const spot = { x: 952 - Math.floor(k / 2) * 18, y: CY + side * (110 + (k % 5) * 6) };
    roles.set(g.id ?? -1, { kind: 'crowd', line: spot, close: spot, squeeze: { x: spot.x + 20, y: spot.y }, closed: true, phone: 'none', cheered: false });
  }

  const processionPos = (d: number, flank: number) => {
    const p = pointAlong(SUITE_TO_CHUPPAH, d);
    // parents walk beside their child (perpendicular to the heading)
    return { x: p.x - p.hy * 15 * flank - p.hx * 4, y: p.y + p.hx * 15 * flank - p.hy * 4, done: p.done };
  };

  function update(guests: CeremonyActor[], dt: number) {
    if (stage === 'idle' || stage === 'done') return;
    t += dt;
    totalT += dt;
    // safety: never hold the evening hostage (e.g. no couple on stage)
    if (totalT > CEREMONY.maxSec && stage !== 'after') {
      stage = 'done';
      coupleHome = true;
      onDone();
      return;
    }
    let inLine = 0;
    let crowdCount = 0;
    for (const g of guests) {
      const role = roles.get(g.id ?? -1);
      if (!role) continue;
      if (role.kind === 'crowd') {
        crowdCount++;
        const path = (role as CrowdRole & { path?: Point[] }).path;
        // gather → line spot (along its path); closing behind the bride; squeeze in the vows
        if (path && path.length > 1) {
          if (walk(g, path[0], CEREMONY.guestSpeed, dt)) path.shift();
          continue;
        }
        if (!role.closed && brideX > role.line.x + CEREMONY.closeBehind && (stage === 'bride' || stage === 'vows')) role.closed = true;
        const target = stage === 'vows' && role.closed ? role.squeeze : role.closed ? role.close : role.line;
        const arrived = walk(g, target, role.closed ? CEREMONY.guestSpeed * 0.55 : CEREMONY.guestSpeed, dt);
        if (arrived) {
          inLine++;
          if (role.closed || stage === 'vows') face(g, { x: CHUPPAH_POS.x, y: CY });
          else face(g, { x: role.line.x - 40, y: CY });
          // phones up as the bride / groom walk by
          const passing = (stage === 'groom' && Math.abs(groomX - role.line.x) < 90) || (stage === 'bride' && Math.abs(brideX - role.line.x) < 90);
          if (passing && !role.cheered) {
            role.cheered = true;
            if (role.phone === 'video') say(g, '📱', 3);
            else if (role.phone === 'flash') say(g, '📸⚡', 2);
            else if (rng() < 0.25) say(g, ['👏', '😍', '🥹'][Math.floor(rng() * 3)], 1.6);
          }
          if (stage === 'bride' && role.cheered && Math.abs(brideX - role.line.x) > 120) role.cheered = false;
        }
        continue;
      }
      if (role.kind === 'stage') {
        if (role.leg < role.path.length) {
          if (walk(g, role.path[role.leg], CEREMONY.guestSpeed, dt)) role.leg++;
        } else face(g, { x: CHUPPAH_POS.x, y: CY });
        continue;
      }
      // parents: wait in the lobby, then walk beside their child, then take their place under the chuppah
      const d = role.of === 'groom' ? groomD : brideD;
      const walking = (role.of === 'groom' && stage !== 'gather') || (role.of === 'bride' && (stage === 'bride' || stage === 'vows' || stage === 'after'));
      if (!walking || d < joinD) {
        if (role.leg < role.path.length) {
          if (walk(g, role.path[role.leg], CEREMONY.guestSpeed, dt)) role.leg++;
        } else face(g, SUITE_TO_CHUPPAH[0]);
        continue;
      }
      const p = processionPos(d, role.flank ?? 1);
      if (!p.done) {
        walk(g, p, CEREMONY.processionSpeed * 1.6, dt);
      } else {
        const spots = role.of === 'groom' ? STAGE.groomParents : STAGE.brideParents;
        if (walk(g, spots[(role.flank ?? 1) < 0 ? 0 : 1], CEREMONY.guestSpeed * 0.6, dt)) face(g, { x: CHUPPAH_POS.x, y: CY });
      }
    }
    if (stage === 'gather' && (t >= CEREMONY.gatherMaxSec || (crowdCount > 0 && inLine >= crowdCount * 0.9 && t > 6))) {
      stage = 'groom';
      t = 0;
    }
  }

  function stepCouple(couple: CeremonyActor[], dt: number) {
    const [bride, groom] = couple;
    if (!bride || !groom) return;
    if (stage === 'idle' || stage === 'gather' || stage === 'done') return;
    const lead = (m: CeremonyActor, d: number, spot: Point) => {
      const p = pointAlong(SUITE_TO_CHUPPAH, d);
      if (d <= 0) return;
      if (!p.done) walk(m, p, CEREMONY.processionSpeed * 1.6, dt);
      else if (walk(m, spot, CEREMONY.processionSpeed * 0.6, dt)) face(m, { x: CHUPPAH_POS.x + 40, y: CY });
    };
    if (stage === 'groom') {
      if (groomD === 0) say(groom, '🤵 החתן נכנס!', 2.4);
      groomD = Math.min(routeLen, groomD + CEREMONY.processionSpeed * dt);
      groomX = pointAlong(SUITE_TO_CHUPPAH, groomD).x;
      if (groomD >= routeLen && Math.hypot(groom.x - STAGE.groom.x, groom.y - STAGE.groom.y) < 4) {
        coupleT += dt;
        if (coupleT > CEREMONY.betweenSec) {
          stage = 'bride';
          coupleT = 0;
          say(bride, '👰 הכלה נכנסת!', 2.4);
        }
      }
    }
    if (stage === 'bride') {
      brideD = Math.min(routeLen, brideD + CEREMONY.processionSpeed * dt);
      const bp = pointAlong(SUITE_TO_CHUPPAH, brideD);
      if (bp.y <= CY + 1) brideX = bp.x; // only along the aisle
      if (brideD >= routeLen && Math.hypot(bride.x - STAGE.bride.x, bride.y - STAGE.bride.y) < 4) {
        stage = 'vows';
        coupleT = 0;
        brideX = Infinity;
        say(groom, '💍 הרי את מקודשת לי', 3);
      }
    }
    if (stage === 'groom' || stage === 'bride' || stage === 'vows') {
      lead(groom, groomD, STAGE.groom);
      lead(bride, brideD, STAGE.bride);
    }
    if (stage === 'vows') {
      coupleT += dt;
      if (coupleT > CEREMONY.vowsSec * 0.75 && !bride.speechBubbleText) say(bride, '🍷🥂 מזל טוב!', 2.5);
      if (coupleT >= CEREMONY.vowsSec) {
        stage = 'after';
        coupleT = 0;
        say(groom, '💥 שבירת הכוס! מזל טוב!', 2.5);
        onDone();
      }
    }
    if (stage === 'after') {
      // back to the bridal suite (yichud), the reverse of the route
      const back = [...SUITE_TO_CHUPPAH].reverse();
      const targets = [SUITE_SPOTS.bride, SUITE_SPOTS.groom];
      let home = 0;
      couple.forEach((m, i) => {
        const leg = Math.min(backLeg, back.length);
        const to = leg < back.length ? { x: back[leg].x + i * 8, y: back[leg].y + i * 10 } : targets[i];
        if (walk(m, to, 70, dt) && leg >= back.length) home++;
        if (i === 0 && leg < back.length && Math.hypot(m.x - to.x, m.y - to.y) < 4) backLeg++;
      });
      if (home === 2) {
        coupleHome = true;
        stage = 'done';
      }
    }
  }

  const LABEL: Record<CeremonyStage, string> = {
    idle: '',
    gather: '🔔 הכרזה על החופה! האורחים מסתדרים לאורך השביל',
    groom: '🤵 החתן נכנס לחופה עם ההורים',
    bride: '👰 הכלה נכנסת עם ההורים — צלם את הכניסה!',
    vows: '💍 טקס החופה',
    after: '🎉 מזל טוב! הזוג לחדר הייחוד, האורחים לאולם',
    done: '🎉 מזל טוב! האורחים נכנסים לאולם',
  };

  return {
    get stage() {
      return stage;
    },
    get labelHe() {
      return LABEL[stage];
    },
    get coupleHome() {
      return coupleHome;
    },
    start,
    adopt,
    update,
    stepCouple,
  };
}
