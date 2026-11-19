import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CEREMONY,
  SUITE_TO_CHUPPAH,
  closingTargets,
  createCeremony,
  lineSpots,
  pickFamily,
  pointAlong,
  routeLength,
  seatSpots,
  triangleSpots,
  type CeremonyActor,
} from './ceremonyPhase.ts';

const CY = CEREMONY.aisleY;
const seeded = (s = 7) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

test('pointAlong walks the polyline and clamps at the end', () => {
  const route = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
  assert.deepEqual([pointAlong(route, 5).x, pointAlong(route, 5).y], [5, 0]);
  const p = pointAlong(route, 15);
  assert.deepEqual([p.x, p.y, p.hx, p.hy], [10, 5, 0, 1]);
  assert.equal(pointAlong(route, 99).done, true);
  assert.equal(routeLength(route), 20);
});

test('the procession route ends on the aisle, facing the chuppah', () => {
  const end = SUITE_TO_CHUPPAH[SUITE_TO_CHUPPAH.length - 1];
  assert.equal(end.y, CY);
  assert.ok(routeLength(SUITE_TO_CHUPPAH) > 500);
});

test('four rows of chairs, four per side, guests stand clear of the chair strips', () => {
  const seats = seatSpots();
  assert.equal(seats.length, CEREMONY.rowXs.length * CEREMONY.chairsPerSide * 2);
  for (const s of seats) {
    assert.ok(Math.abs(s.y - CY) > 29, 'not on the carpet');
    for (const x of CEREMONY.rowXs) assert.ok(Math.abs(s.x - x) > 7, 'not inside a row of chairs');
  }
});

test('the line-up keeps the carpet free', () => {
  const spots = lineSpots(60);
  assert.equal(spots.length, 60);
  for (const s of spots) assert.ok(Math.abs(s.y - CY) > 29);
});

test('closing: all chairs fill before anyone stands; standers form a triangle behind the chairs', () => {
  const line = lineSpots(50);
  const targets = closingTargets(line, seatSpots(), seeded());
  const seated = targets.filter((p) => p.x > CEREMONY.rowXs[0]);
  const standing = targets.filter((p) => p.x < CEREMONY.rowXs[0]);
  assert.equal(seated.length, seatSpots().length);
  assert.equal(standing.length, 50 - seatSpots().length);
  // a triangle: narrower further from the chairs
  const tri = triangleSpots(60, seeded(3));
  const width = (x0: number, x1: number) => {
    const ys = tri.filter((p) => p.x <= x0 && p.x > x1).map((p) => Math.abs(p.y - CY));
    return ys.length ? Math.max(...ys) : 0;
  };
  const base = CEREMONY.rowXs[0] - 26;
  assert.ok(width(base + 6, base - 30) > width(base - 80, base - 130));
});

test('fewer guests than chairs: everyone sits', () => {
  const line = lineSpots(10);
  const targets = closingTargets(line, seatSpots(), seeded());
  assert.ok(targets.every((p) => p.x > CEREMONY.rowXs[0]));
});

const actor = (id: number, x = 1000, y = 500, partnerId: number | null = null): CeremonyActor => ({
  id,
  x,
  y,
  direction: 'S',
  strideDist: 0,
  partnerId,
  speechBubbleText: null,
  wantsPhotoTimer: 0,
});

test('the parents are a couple from that side when there is one', () => {
  const guests = [actor(1), actor(2, 0, 0, 3), actor(3, 0, 0, 2), actor(4), actor(5, 0, 0, 6), actor(6, 0, 0, 5), actor(7), actor(8), actor(9)];
  const side = (id: number) => (id <= 4 || id === 7 || id === 8 ? 'groom' : 'bride') as 'groom' | 'bride';
  const f = pickFamily(guests, side);
  assert.deepEqual(f.groomParents.sort(), [2, 3]);
  assert.deepEqual(f.brideParents.sort(), [5, 6]);
  assert.ok(f.groomSiblings.every((id) => side(id) === 'groom'));
  const all = [...f.groomParents, ...f.brideParents, ...f.groomSiblings, ...f.brideSiblings, f.rabbi];
  assert.equal(new Set(all).size, all.length, 'nobody has two roles');
});

test('a whole ceremony: groom first, then the bride; the aisle closes behind her; the couple ends in the suite', () => {
  let done = 0;
  const c = createCeremony(() => done++, seeded());
  const guests = Array.from({ length: 30 }, (_, i) => actor(i + 1, 900 + (i % 6) * 40, 400 + Math.floor(i / 6) * 30, null));
  const couple = [actor(100, 640, 580), actor(101, 644, 556)];
  c.start(guests, (id) => (id % 2 ? 'groom' : 'bride'));
  const seen: string[] = [];
  let closedWhileGroom = false;
  for (let i = 0; i < 20000 && c.stage !== 'done'; i++) {
    c.update(guests, 1 / 30);
    c.stepCouple(couple, 1 / 30);
    if (seen[seen.length - 1] !== c.stage) seen.push(c.stage);
    if (c.stage === 'groom') {
      // nobody sits down while the groom walks (the aisle stays open for the bride)
      if (guests.some((g) => g.x > CEREMONY.rowXs[0] + 10 && g.x < 1200 && Math.abs(g.y - CY) > 45 && Math.abs(g.y - CY) < 160)) closedWhileGroom = true;
    }
  }
  assert.deepEqual(seen, ['gather', 'groom', 'bride', 'vows', 'after', 'done']);
  assert.equal(done, 1);
  assert.equal(c.coupleHome, true);
  assert.equal(closedWhileGroom, false);
});
