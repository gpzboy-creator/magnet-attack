/**
 * Reception yard mingling (project log, "קבלת פנים בחצר", flow chart of 18.11). Pure logic, no drawing.
 *
 * After posing at the flower wall the guests don't go straight inside: they mingle in the garden
 * until the ceremony is called.
 *   - Every guest is on the groom's or the bride's side (partners together).
 *   - Guests stand in friend groups of 3–5 from the same side.
 *   - Groups gather around the garden's attractions (bar, cocktail tables, fountain, lawn); the
 *     crowd density follows a normal distribution around each spot.
 *   - Some guests queue at the buffet stations, eat, and go back to their group.
 *   - When the photographer comes close, a guest who hasn't been photographed yet turns to him and
 *     asks for a photo. Walk away or wait too long without shooting and the guest loses a heart.
 */

export type Rng = () => number;
export type Side = 'groom' | 'bride';

export interface Point {
  x: number;
  y: number;
}

export const MINGLE = {
  groupMin: 3,
  groupMax: 5,
  /** Spread of a group's members around its spot (world units, one standard deviation). */
  groupSigma: 13,
  /** Spread of group spots around an attraction. */
  hotspotSigma: 34,
  /** Seconds a guest chats before doing something else. */
  chatSec: [8, 18] as [number, number],
  /** Chance that a guest goes to the buffet after chatting. */
  buffetChance: 0.35,
  /** Seconds the guest at the head of a buffet queue is being served. */
  serveSec: [2.5, 4.5] as [number, number],
  queueGap: 15,
  walkSpeed: 52,
  /** A guest who hasn't been photographed asks when the photographer is this close… */
  askRange: 95,
  /** …and feels ignored if he walks this far away, or after `askSec`, without a photo. */
  askLeaveRange: 180,
  askSec: 8,
  /** After the last guest has posed, mingling goes on this long before everyone is called in. */
  afterLastPoseSec: 45,
} as const;

/** Standard normal sample (Box–Muller). */
export function gaussian(rng: Rng): number {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const randIn = (rng: Rng, [a, b]: readonly [number, number]) => a + (b - a) * rng();

export interface MingleGuest {
  id: number;
  partnerId?: number | null;
}

/** Couples share a side; the rest alternate so both sides are about the same size. */
export function assignSides(guests: readonly MingleGuest[], rng: Rng): Map<number, Side> {
  const sides = new Map<number, Side>();
  let groom = 0;
  let bride = 0;
  const order = [...guests].sort(() => rng() - 0.5);
  for (const g of order) {
    if (sides.has(g.id)) continue;
    const side: Side = groom < bride ? 'groom' : bride < groom ? 'bride' : rng() < 0.5 ? 'groom' : 'bride';
    sides.set(g.id, side);
    const partner = g.partnerId != null ? guests.find((o) => o.id === g.partnerId) : undefined;
    let n = 1;
    if (partner && !sides.has(partner.id)) {
      sides.set(partner.id, side);
      n = 2;
    }
    if (side === 'groom') groom += n;
    else bride += n;
  }
  return sides;
}

/** Friend groups of 3–5 from the same side; partners always stay in the same group. */
export function formGroups(guests: readonly MingleGuest[], sides: Map<number, Side>, rng: Rng): number[][] {
  const groups: number[][] = [];
  for (const side of ['groom', 'bride'] as Side[]) {
    // units: a couple or a single guest
    const seen = new Set<number>();
    const units: number[][] = [];
    for (const g of guests) {
      if (sides.get(g.id) !== side || seen.has(g.id)) continue;
      seen.add(g.id);
      const unit = [g.id];
      if (g.partnerId != null && sides.get(g.partnerId) === side && !seen.has(g.partnerId)) {
        seen.add(g.partnerId);
        unit.push(g.partnerId);
      }
      units.push(unit);
    }
    units.sort(() => rng() - 0.5);
    let cur: number[] = [];
    let target = Math.round(randIn(rng, [MINGLE.groupMin, MINGLE.groupMax]));
    for (const unit of units) {
      if (cur.length > 0 && cur.length + unit.length > MINGLE.groupMax) {
        groups.push(cur);
        cur = [];
        target = Math.round(randIn(rng, [MINGLE.groupMin, MINGLE.groupMax]));
      }
      cur.push(...unit);
      if (cur.length >= target) {
        groups.push(cur);
        cur = [];
        target = Math.round(randIn(rng, [MINGLE.groupMin, MINGLE.groupMax]));
      }
    }
    if (cur.length > 0) {
      // a tiny leftover joins the last group of the same side when it still fits
      const last = groups[groups.length - 1];
      if (cur.length < MINGLE.groupMin && last && sides.get(last[0]) === side && last.length + cur.length <= MINGLE.groupMax + 1) {
        last.push(...cur);
      } else {
        groups.push(cur);
      }
    }
  }
  return groups;
}

export interface Hotspot extends Point {
  /** Relative popularity. */
  weight: number;
}

/** A spot for each group: pick an attraction by popularity, then a normal-distributed offset around it. */
export function placeGroupSpots(
  groupCount: number,
  hotspots: readonly Hotspot[],
  isFree: (p: Point) => boolean,
  rng: Rng
): Point[] {
  const total = hotspots.reduce((s, h) => s + h.weight, 0);
  const spots: Point[] = [];
  for (let i = 0; i < groupCount; i++) {
    let spot: Point | null = null;
    for (let tries = 0; tries < 40 && !spot; tries++) {
      let r = rng() * total;
      const h = hotspots.find((o) => (r -= o.weight) <= 0) ?? hotspots[hotspots.length - 1];
      const p = { x: h.x + gaussian(rng) * MINGLE.hotspotSigma, y: h.y + gaussian(rng) * MINGLE.hotspotSigma };
      const crowded = spots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 42);
      if (isFree(p) && (!crowded || tries > 30)) spot = p;
    }
    spots.push(spot ?? { x: hotspots[i % hotspots.length].x, y: hotspots[i % hotspots.length].y });
  }
  return spots;
}

/** Where a member stands around the group's spot: a loose ring, jittered normally. */
export function memberSpot(center: Point, idx: number, size: number, rng: Rng, isFree: (p: Point) => boolean): Point {
  const ring = size <= 1 ? 0 : 16 + size * 2;
  for (let tries = 0; tries < 12; tries++) {
    const a = (idx / Math.max(1, size)) * Math.PI * 2 + rng() * 0.5;
    const p = {
      x: center.x + Math.cos(a) * ring + gaussian(rng) * (MINGLE.groupSigma * 0.4),
      y: center.y + Math.sin(a) * ring + gaussian(rng) * (MINGLE.groupSigma * 0.4),
    };
    if (isFree(p)) return p;
  }
  return { ...center };
}

/** Buffet queue: index 0 is served at the station front, the rest line up behind (+y). */
export function queueSlot(front: Point, index: number): Point {
  return { x: front.x, y: front.y + index * MINGLE.queueGap };
}

export function shortestQueue(queues: readonly number[][]): number {
  let best = 0;
  for (let i = 1; i < queues.length; i++) if (queues[i].length < queues[best].length) best = i;
  return best;
}

// ---------------------------------------------------------------------------
// A guest asking the photographer for a photo
// ---------------------------------------------------------------------------

export type AskPhase = 'idle' | 'asking' | 'done' | 'ignored';

export interface AskState {
  phase: AskPhase;
  timer: number;
}

export const newAsk = (): AskState => ({ phase: 'idle', timer: 0 });

export interface AskStep {
  state: AskState;
  event: 'started' | 'ignored' | null;
}

/**
 * One step for a guest who hasn't been photographed yet. `photographed` = a photo of this guest
 * happened this step. Ignored is final (one heart per guest at most).
 */
export function stepAsk(s: AskState, distToPlayer: number, dt: number, photographed: boolean): AskStep {
  if (s.phase === 'done' || s.phase === 'ignored') return { state: s, event: null };
  if (photographed) return { state: { phase: 'done', timer: 0 }, event: null };
  if (s.phase === 'idle') {
    if (distToPlayer <= MINGLE.askRange) return { state: { phase: 'asking', timer: MINGLE.askSec }, event: 'started' };
    return { state: s, event: null };
  }
  const timer = s.timer - dt;
  if (timer <= 0 || distToPlayer > MINGLE.askLeaveRange) return { state: { phase: 'ignored', timer: 0 }, event: 'ignored' };
  return { state: { phase: 'asking', timer }, event: null };
}
