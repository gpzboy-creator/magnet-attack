import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MINGLE,
  assignSides,
  formGroups,
  gaussian,
  newAsk,
  placeGroupSpots,
  queueSlot,
  shortestQueue,
  stepAsk,
} from './yardMingle.ts';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const guests = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  partnerId: i < 8 ? (i % 2 === 0 ? i + 2 : i) : null, // 1-2, 3-4, 5-6, 7-8 are couples
}));

test('sides: couples share a side, both sides about equal', () => {
  const sides = assignSides(guests, seeded(1));
  for (const [a, b] of [[1, 2], [3, 4], [5, 6], [7, 8]]) assert.equal(sides.get(a), sides.get(b));
  const groom = [...sides.values()].filter((s) => s === 'groom').length;
  assert.ok(Math.abs(groom - 10) <= 1, `groom side ${groom}`);
});

test('groups: same side, 3–5 people (small leftovers merge), couples together, everyone in one group', () => {
  const rng = seeded(2);
  const sides = assignSides(guests, rng);
  const groups = formGroups(guests, sides, rng);
  const all = groups.flat().sort((a, b) => a - b);
  assert.deepEqual(all, guests.map((g) => g.id));
  for (const g of groups) {
    assert.ok(g.length >= 1 && g.length <= MINGLE.groupMax + 1, `size ${g.length}`);
    assert.equal(new Set(g.map((id) => sides.get(id))).size, 1, 'one side per group');
  }
  for (const [a, b] of [[1, 2], [3, 4], [5, 6], [7, 8]]) {
    assert.ok(groups.some((g) => g.includes(a) && g.includes(b)), `couple ${a}-${b} together`);
  }
});

test('density: group spots spread normally around the attractions and avoid blocked ground', () => {
  const rng = seeded(3);
  const hot = [{ x: 0, y: 0, weight: 1 }];
  const blocked = (p: { x: number; y: number }) => p.x > 60;
  const spots = placeGroupSpots(30, hot, (p) => !blocked(p), rng);
  assert.equal(spots.length, 30);
  assert.ok(spots.every((p) => !blocked(p)));
  const meanDist = spots.reduce((s, p) => s + Math.hypot(p.x, p.y), 0) / spots.length;
  assert.ok(meanDist > 15 && meanDist < 90, `mean distance ${meanDist.toFixed(1)}`);
  // gaussian sanity
  const r = seeded(4);
  const xs = Array.from({ length: 4000 }, () => gaussian(r));
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
  assert.ok(Math.abs(mean) < 0.06 && Math.abs(sd - 1) < 0.06, `mean ${mean} sd ${sd}`);
});

test('buffet: queue lines up behind the station, newcomers pick the shortest line', () => {
  assert.deepEqual(queueSlot({ x: 10, y: 100 }, 2), { x: 10, y: 100 + 2 * MINGLE.queueGap });
  assert.equal(shortestQueue([[1, 2], [3], [4, 5, 6]]), 1);
});

test('asking: starts when the photographer is near; a photo ends it; waiting or walking away = ignored once', () => {
  let s = newAsk();
  let r = stepAsk(s, MINGLE.askRange + 10, 0.1, false);
  assert.equal(r.state.phase, 'idle');
  r = stepAsk(r.state, 50, 0.1, false);
  assert.equal(r.event, 'started');
  assert.equal(stepAsk(r.state, 50, 0.1, true).state.phase, 'done');
  const left = stepAsk(r.state, MINGLE.askLeaveRange + 1, 0.1, false);
  assert.equal(left.event, 'ignored');
  s = r.state;
  for (let t = 0; t < MINGLE.askSec + 1; t += 0.5) {
    r = stepAsk(s, 50, 0.5, false);
    s = r.state;
    if (r.event === 'ignored') break;
  }
  assert.equal(s.phase, 'ignored');
  assert.equal(stepAsk(s, 50, 0.1, false).event, null, 'only once');
});
