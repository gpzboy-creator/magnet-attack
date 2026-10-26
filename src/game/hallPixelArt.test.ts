import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BARTENDER_LOOKS,
  BARTENDER_STATIONS,
  ISLAND_BAR,
  getBartenderPose,
  getIslandBarPieces,
} from './hallPixelArt.ts';

test('bartender crew is 1 man : 3 women', () => {
  const men = BARTENDER_LOOKS.filter((l) => l.gender === 'm').length;
  const women = BARTENDER_LOOKS.filter((l) => l.gender === 'f').length;
  assert.equal(men * 3, women);
});

test('bartenders always stay inside the island ring', () => {
  const inner = ISLAND_BAR.half - ISLAND_BAR.counter;
  for (let i = 0; i < BARTENDER_LOOKS.length; i++) {
    for (let t = 0; t < 60; t += 0.37) {
      const p = getBartenderPose(i, t);
      assert.ok(Math.abs(p.x - ISLAND_BAR.cx) <= inner, `x out of bar at t=${t}`);
      assert.ok(Math.abs(p.y - ISLAND_BAR.cy) <= inner, `y out of bar at t=${t}`);
    }
  }
  for (const st of BARTENDER_STATIONS) {
    assert.ok(Math.max(Math.abs(st.x - ISLAND_BAR.cx), Math.abs(st.y - ISLAND_BAR.cy)) > ISLAND_BAR.towerHalf);
  }
});

test('island counter pieces tile the ring without covering the inside', () => {
  const pieces = getIslandBarPieces();
  const area = pieces.reduce((a, p) => a + p.w * p.d, 0);
  const outer = (2 * ISLAND_BAR.half) ** 2;
  const innerSide = 2 * (ISLAND_BAR.half - ISLAND_BAR.counter);
  assert.ok(Math.abs(area - (outer - innerSide ** 2)) < 1e-6);
});
