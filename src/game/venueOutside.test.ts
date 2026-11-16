import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SERVICE_APPROACH,
  VENDOR_STALLS,
  COURTYARD_FENCE_X,
  PARKING,
  PHOTO_SPOT,
  PLAZA,
  SERVICE_EXIT,
  CEREMONY_AISLE,
  CEREMONY_CHAIR_ROWS,
  COURTYARD,
  COURTYARD_PATH,
  HALL_EXIT,
  OUTSIDE_OBSTACLES,
  PLAYER_CAR_TRUNK_SPOT,
  isWalkableOutside,
  insideRect,
} from './venueOutside.ts';
import { CHUPPAH_POS } from './rules.ts';

const R = 10; // player body radius
const blocked = (x: number, y: number) =>
  OUTSIDE_OBSTACLES.some((o) =>
    o.kind === 'box'
      ? x > o.minX - R && x < o.maxX + R && y > o.minY - R && y < o.maxY + R
      : Math.hypot(x - o.x, y - o.y) < o.r + R
  );

function reachable(start: { x: number; y: number }, goal: { x: number; y: number }, radius = 30) {
  const step = 8;
  const key = (x: number, y: number) => `${x},${y}`;
  const seen = new Set([key(start.x, start.y)]);
  const q = [start];
  while (q.length) {
    const c = q.shift()!;
    if (Math.hypot(c.x - goal.x, c.y - goal.y) < radius) return true;
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const n = { x: c.x + dx, y: c.y + dy };
      const k = key(n.x, n.y);
      if (seen.has(k) || !isWalkableOutside(n.x, n.y) || blocked(n.x, n.y)) continue;
      seen.add(k);
      q.push(n);
    }
  }
  return false;
}

test('back of house: the service door leads to the vendors\' parking, fenced off from the gardens', () => {
  const start = { x: SERVICE_APPROACH.minX + 140, y: SERVICE_APPROACH.maxY - 20 }; // hall floor by the station
  assert.ok(reachable(start, { x: VENDOR_STALLS[1].x - 6, y: VENDOR_STALLS[1].y + 92 }), 'station corner -> service door -> vendor stalls');
  assert.ok(!reachable(start, PHOTO_SPOT, 20), 'no way from the yard into the guests\' gardens');
});

test('photographer\'s car is in the guests\' lot: hall door -> lobby -> gardens -> gate -> plaza -> trunk', () => {
  assert.ok(insideRect(PARKING, PLAYER_CAR_TRUNK_SPOT.x, PLAYER_CAR_TRUNK_SPOT.y));
  assert.ok(reachable({ x: HALL_EXIT.minX + 20, y: 236 }, PLAYER_CAR_TRUNK_SPOT));
  assert.ok(!blocked(PLAYER_CAR_TRUNK_SPOT.x, PLAYER_CAR_TRUNK_SPOT.y), 'trunk spot is free');
});

test('guests: parking -> buffer walkway -> plaza -> main gate -> reception garden -> lobby -> hall exit', () => {
  const parking = { x: PARKING.minX + 40, y: 236 };
  assert.ok(reachable(parking, { x: PLAZA.minX + 60, y: 236 }), 'parking to plaza');
  assert.ok(reachable(parking, PHOTO_SPOT), 'plaza through the gate to the photo wall');
  assert.ok(reachable(PHOTO_SPOT, { x: HALL_EXIT.minX + 20, y: 236 }), 'garden to the hall');
  // the plaza and the courtyard only connect through the gate
  assert.ok(!isWalkableOutside(COURTYARD_FENCE_X + 5, COURTYARD_PATH.minY - 30));
});

test('courtyard is twice the hall floor and holds the chuppah ceremony', () => {
  const hallArea = 880 * 880;
  const area = (COURTYARD.maxX - COURTYARD.minX) * (COURTYARD.maxY - COURTYARD.minY);
  assert.ok(area >= 1.95 * hallArea, `area ${area}`);
  assert.ok(insideRect(COURTYARD, CHUPPAH_POS.x, CHUPPAH_POS.y), 'chuppah stands in the courtyard');
  // the aisle is free and reachable from the path (walk straight up from the path into the aisle)
  const ax = CEREMONY_AISLE.minX - 25;
  for (let y = COURTYARD_PATH.minY; y >= (CEREMONY_AISLE.minY + CEREMONY_AISLE.maxY) / 2; y -= 4) {
    assert.ok(isWalkableOutside(ax, y) && !blocked(ax, y), `blocked at ${ax},${y}`);
  }
  for (let x = CEREMONY_AISLE.minX; x < CEREMONY_AISLE.maxX; x += 6) {
    assert.ok(!blocked(x, (CEREMONY_AISLE.minY + CEREMONY_AISLE.maxY) / 2), `aisle blocked at x=${x}`);
  }
  // chairs stay off the main path
  for (const r of CEREMONY_CHAIR_ROWS) assert.ok(r.y1 + 6 < COURTYARD_PATH.minY && r.y0 > COURTYARD.minY);
});

test('chuppah island: the bridge leads from the aisle to the stage, the water blocks', async () => {
  const { BRIDGE_FOOT, STAGE_RADIUS, POOL_RADIUS, groundZ, STAGE_TOP_Z } = await import('./chuppahIsland.ts');
  // walk along the bridge axis from the aisle to the stage centre
  for (let x = BRIDGE_FOOT.x - 20; x <= CHUPPAH_POS.x; x += 4) {
    assert.ok(isWalkableOutside(x, CHUPPAH_POS.y) && !blocked(x, CHUPPAH_POS.y), `bridge/stage blocked at x=${x}`);
  }
  // the water ring is blocked everywhere except the bridge
  const mid = (STAGE_RADIUS + POOL_RADIUS) / 2;
  for (const deg of [0, 45, 90, 135, 225, 270, 315]) {
    const a = (deg * Math.PI) / 180;
    assert.ok(blocked(CHUPPAH_POS.x + Math.cos(a) * mid, CHUPPAH_POS.y + Math.sin(a) * mid), `water open at ${deg}°`);
  }
  assert.equal(groundZ(CHUPPAH_POS.x, CHUPPAH_POS.y), STAGE_TOP_Z);
  assert.equal(groundZ(BRIDGE_FOOT.x - 30, CHUPPAH_POS.y), 0);
});
