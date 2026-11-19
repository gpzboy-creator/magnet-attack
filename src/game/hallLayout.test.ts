import test from 'node:test';
import assert from 'node:assert/strict';
import { HALL_BAR, HALL_LAYOUT, HALL_TABLES, ROUND_TABLE_SEATS } from './hallLayout.ts';

const L = HALL_LAYOUT;

test('7 round tables with 8 seats each', () => {
  assert.equal(HALL_TABLES.length, 7);
  assert.equal(ROUND_TABLE_SEATS.length, 8);
});

test('tables with their chairs stay inside the hall and off the dance floor', () => {
  for (const t of HALL_TABLES) {
    const d = Math.hypot(t.x, t.y);
    assert.ok(d + L.reach <= L.hallRadius + 1, `table ${t.id} pokes out of the hall (${d})`);
    assert.ok(d - L.reach > L.danceFloorRadius, `table ${t.id} is on the dance floor`);
  }
});

test('tables (with chairs) do not overlap each other', () => {
  for (const a of HALL_TABLES)
    for (const b of HALL_TABLES) if (a.id < b.id) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 2 * L.reach, `${a.id}/${b.id}`);
});

test('the bar sits between the dance floor and the front row', () => {
  const d = Math.hypot(HALL_BAR.center.x, HALL_BAR.center.y);
  assert.ok(d - L.bar.depth / 2 > L.danceFloorRadius);
  assert.ok(d + L.bar.depth / 2 < L.rows[0].dist - L.reach);
});

test('the layout is symmetric about the middle line', () => {
  // mirror across the axis toDining: swap x and -y around... (x, y) → (-y, -x)
  for (const t of HALL_TABLES) assert.ok(HALL_TABLES.some((o) => Math.abs(o.x + t.y) <= 1 && Math.abs(o.y + t.x) <= 1));
});

test('every seat faces its table and uses a matching chair view', () => {
  const views = new Map<string, number>();
  for (const s of ROUND_TABLE_SEATS) {
    assert.ok(s.face.x * -s.dx + s.face.y * -s.dy > 0);
    views.set(s.view, (views.get(s.view) ?? 0) + 1);
  }
  assert.deepEqual([...views.values()], [2, 2, 2, 2]);
});
