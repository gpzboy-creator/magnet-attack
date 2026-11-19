import test from 'node:test';
import assert from 'node:assert/strict';
import { BAR_GUEST_SPOTS, BAR_PICKUP_SPOTS, HALL_BAR_BOX, HALL_BARTENDER_STATIONS, barFacePoint, hallBartenderPose } from './hallBar.ts';
import { HALL_LAYOUT, HALL_TABLES, ROUND_TABLE_SEATS } from './hallLayout.ts';

const inBox = (p: { x: number; y: number }, pad = 0) =>
  p.x > HALL_BAR_BOX.minX - pad && p.x < HALL_BAR_BOX.maxX + pad && p.y > HALL_BAR_BOX.minY - pad && p.y < HALL_BAR_BOX.maxY + pad;

test('the bar is 170 long, centred on the hall axis, and its box clears the dance floor', () => {
  assert.equal(HALL_BAR_BOX.maxX - HALL_BAR_BOX.minX, 170);
  assert.equal(HALL_BAR_BOX.minX + HALL_BAR_BOX.maxX, 0);
  assert.ok(HALL_BAR_BOX.minY > HALL_LAYOUT.danceFloorRadius);
});

test('guest and pickup spots stand outside the counter, clear of tables and chairs', () => {
  for (const s of [...BAR_GUEST_SPOTS, ...BAR_PICKUP_SPOTS]) {
    assert.ok(!inBox(s, 6), `spot ${s.x},${s.y} touches the bar`);
    for (const t of HALL_TABLES) {
      assert.ok(Math.hypot(s.x - t.x, s.y - t.y) > HALL_LAYOUT.tableRadius + 8, `spot near table ${t.id}`);
      for (const seat of ROUND_TABLE_SEATS) {
        assert.ok(Math.hypot(s.x - t.x - seat.dx, s.y - t.y - seat.dy) > 12, `spot on a chair of table ${t.id}`);
      }
    }
  }
});

test('front-side guests face the counter (−y), end guests face it sideways', () => {
  const front = barFacePoint(BAR_GUEST_SPOTS[0]);
  assert.equal(front.x, BAR_GUEST_SPOTS[0].x);
  assert.equal(front.y, HALL_BAR_BOX.maxY);
  const end = barFacePoint(BAR_GUEST_SPOTS[4]);
  assert.equal(end.x, HALL_BAR_BOX.minX);
});

test('bartenders always work behind the counter, each in their own half', () => {
  for (const st of HALL_BARTENDER_STATIONS) assert.ok(st.y < HALL_BAR_BOX.minY && !inBox(st));
  for (let t = 0; t < 60; t += 0.31) {
    const a = hallBartenderPose(0, t);
    const b = hallBartenderPose(1, t);
    for (const p of [a, b]) {
      assert.ok(p.y < HALL_BAR_BOX.minY, `bartender in front of the bar at t=${t}`);
      assert.ok(p.x >= HALL_BAR_BOX.minX && p.x <= HALL_BAR_BOX.maxX);
    }
    assert.ok(a.x < 0 && b.x > 0, `bartenders crossed at t=${t}`);
  }
});
