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

test('the bar stands left of the dance floor, clear of the floor, the tables and the wall', () => {
  const minX = HALL_BAR.center.x - L.bar.depth / 2;
  const maxX = HALL_BAR.center.x + L.bar.depth / 2;
  const halfLen = L.bar.length / 2;
  assert.ok(maxX < -L.danceFloorRadius - 20, 'room for guests between the floor and the counter');
  assert.ok(minX > -L.hallRadius, 'room for the bartenders behind it');
  for (const t of HALL_TABLES) {
    const dx = Math.max(minX - t.x, 0, t.x - maxX);
    const dy = Math.max(-halfLen - t.y, 0, t.y - halfLen);
    assert.ok(Math.hypot(dx, dy) > L.reach + 20, `table ${t.id} too close to the bar`);
  }
});

test('the layout is symmetric about the middle line', () => {
  // the middle line runs along toDining (world y): mirror (x, y) → (-x, y)
  for (const t of HALL_TABLES) assert.ok(HALL_TABLES.some((o) => Math.abs(o.x + t.x) <= 1 && Math.abs(o.y - t.y) <= 1));
});

test('there is a walkway between neighbouring tables', () => {
  for (const a of HALL_TABLES)
    for (const b of HALL_TABLES) if (a.id < b.id) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 2 * L.reach + 16, `${a.id}/${b.id}`);
});

test('every seat faces its table and uses a matching chair view', () => {
  const views = new Map<string, number>();
  for (const s of ROUND_TABLE_SEATS) {
    assert.ok(s.face.x * -s.dx + s.face.y * -s.dy > 0);
    views.set(s.view, (views.get(s.view) ?? 0) + 1);
  }
  assert.deepEqual([...views.values()], [2, 2, 2, 2]);
});
