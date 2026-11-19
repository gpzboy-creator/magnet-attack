import test from 'node:test';
import assert from 'node:assert/strict';
import { BAR_GUEST_SPOTS, BAR_PICKUP_SPOTS, HALL_BAR_BOX, HALL_BARTENDER_STATIONS, barFacePoint, hallBartenderPose } from './hallBar.ts';
import { HALL_LAYOUT, HALL_TABLES, ROUND_TABLE_SEATS } from './hallLayout.ts';
import { LOUNGE, RATTAN_HIGH_TABLES } from './hallPixelArt.ts';

const inBox = (p: { x: number; y: number }, pad = 0) =>
  p.x > HALL_BAR_BOX.minX - pad && p.x < HALL_BAR_BOX.maxX + pad && p.y > HALL_BAR_BOX.minY - pad && p.y < HALL_BAR_BOX.maxY + pad;

test('the bar is 170 long along y, centred on the dance floor, and its box clears the floor', () => {
  assert.equal(HALL_BAR_BOX.maxY - HALL_BAR_BOX.minY, 170);
  assert.equal(HALL_BAR_BOX.minY + HALL_BAR_BOX.maxY, 0);
  assert.ok(HALL_BAR_BOX.maxX < -HALL_LAYOUT.danceFloorRadius);
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

test('front-side guests face the counter (−x, toward the wall), end guests face it sideways', () => {
  const front = barFacePoint(BAR_GUEST_SPOTS[0]);
  assert.equal(front.y, BAR_GUEST_SPOTS[0].y);
  assert.equal(front.x, HALL_BAR_BOX.maxX);
  const end = barFacePoint(BAR_GUEST_SPOTS[4]);
  assert.equal(end.y, HALL_BAR_BOX.minY);
});

test('bartenders always work behind the counter (wall side), each in their own half', () => {
  for (const st of HALL_BARTENDER_STATIONS) assert.ok(st.x < HALL_BAR_BOX.minX && !inBox(st));
  for (let t = 0; t < 60; t += 0.31) {
    const a = hallBartenderPose(0, t);
    const b = hallBartenderPose(1, t);
    for (const p of [a, b]) {
      assert.ok(p.x < HALL_BAR_BOX.minX, `bartender in front of the bar at t=${t}`);
      assert.ok(p.y >= HALL_BAR_BOX.minY && p.y <= HALL_BAR_BOX.maxY);
    }
    assert.ok(a.y < 0 && b.y > 0, `bartenders crossed at t=${t}`);
  }
});

test('guests at the bar stay off the dance floor and clear of the lounge and high tables', () => {
  for (const s of BAR_GUEST_SPOTS) assert.ok(Math.hypot(s.x, s.y) > HALL_LAYOUT.danceFloorRadius, `spot ${s.x},${s.y} on the floor`);
  for (const o of [...RATTAN_HIGH_TABLES, { x: LOUNGE.sofaX, y: LOUNGE.sofaY }, { x: LOUNGE.treeX, y: LOUNGE.treeY }]) {
    const dx = Math.max(HALL_BAR_BOX.minX - o.x, 0, o.x - HALL_BAR_BOX.maxX);
    const dy = Math.max(HALL_BAR_BOX.minY - o.y, 0, o.y - HALL_BAR_BOX.maxY);
    assert.ok(Math.hypot(dx, dy) > 40, `prop at ${o.x},${o.y} too close to the bar`);
  }
});
