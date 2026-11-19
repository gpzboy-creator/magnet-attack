import test from 'node:test';
import assert from 'node:assert/strict';
import { ARRIVAL, arrivalSchedule, nextPhase, rateArrivalShot } from './eventPhases.ts';

test('phases run arrival → ceremony → dancing → end', () => {
  assert.equal(nextPhase('arrival'), 'ceremony');
  assert.equal(nextPhase('ceremony'), 'dancing');
  assert.equal(nextPhase('dancing'), null);
});

test('arrival schedule: everyone gets a time, partners right behind, stream speeds up', () => {
  let s = 3;
  const rng = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const partners: Record<number, number> = { 0: 4, 1: 5 };
  const times = arrivalSchedule(10, (i) => partners[i] ?? null, rng);
  assert.ok(times.every((t) => t >= ARRIVAL.firstDelaySec));
  assert.ok(Math.abs(times[4] - times[0] - ARRIVAL.partnerGapSec) < 1e-9);
  const solo = [0, 1, 2, 3, 6, 7, 8, 9].map((i) => times[i]).sort((a, b) => a - b);
  const firstGap = solo[1] - solo[0];
  const lastGap = solo[solo.length - 1] - solo[solo.length - 2];
  assert.ok(lastGap < firstGap, 'later guests arrive closer together');
});

test('pose rating: gold in the sweet spot, ok otherwise, null outside the pose', () => {
  assert.equal(rateArrivalShot(0.1), 'ok');
  assert.equal(rateArrivalShot((ARRIVAL.peakStartSec + ARRIVAL.peakEndSec) / 2), 'gold');
  assert.equal(rateArrivalShot(ARRIVAL.poseSec + 0.1), null);
  assert.equal(rateArrivalShot(-1), null);
});
