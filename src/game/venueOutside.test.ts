import test from 'node:test';
import assert from 'node:assert/strict';
import { HALL_EXIT, OUTSIDE_OBSTACLES, PLAYER_CAR_TRUNK_SPOT, isWalkableOutside } from './venueOutside.ts';

const R = 10; // player body radius
const blocked = (x: number, y: number) =>
  OUTSIDE_OBSTACLES.some((o) =>
    o.kind === 'box'
      ? x > o.minX - R && x < o.maxX + R && y > o.minY - R && y < o.maxY + R
      : Math.hypot(x - o.x, y - o.y) < o.r + R
  );

test('outside: a walkable route leads from the hall exit through lobby and courtyard to the car trunk', () => {
  const step = 8;
  const start = { x: HALL_EXIT.minX + 20, y: (HALL_EXIT.minY + HALL_EXIT.maxY) / 2 };
  const key = (x: number, y: number) => `${x},${y}`;
  const seen = new Set([key(start.x, start.y)]);
  const q = [start];
  let reached = false;
  while (q.length && !reached) {
    const c = q.shift()!;
    if (Math.hypot(c.x - PLAYER_CAR_TRUNK_SPOT.x, c.y - PLAYER_CAR_TRUNK_SPOT.y) < 30) reached = true;
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const n = { x: c.x + dx, y: c.y + dy };
      const k = key(n.x, n.y);
      if (seen.has(k) || !isWalkableOutside(n.x, n.y) || blocked(n.x, n.y)) continue;
      seen.add(k);
      q.push(n);
    }
  }
  assert.ok(reached);
  assert.ok(!blocked(PLAYER_CAR_TRUNK_SPOT.x, PLAYER_CAR_TRUNK_SPOT.y), 'trunk spot is free');
});
