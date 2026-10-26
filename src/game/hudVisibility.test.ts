import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFadeOpacity,
  computeHudLayout,
  computeHudScale,
  hasMeaningfulChange,
  HUD_FADE_MS,
  HUD_HOLD_MS,
  HUD_SCALE_MAX,
  HUD_SCALE_MIN,
} from './hudVisibility.ts';

test('fade: full while recent, eases to idle, forced visible wins', () => {
  assert.equal(computeFadeOpacity({ msSinceChange: 0, idleOpacity: 0.3 }), 1);
  assert.equal(computeFadeOpacity({ msSinceChange: HUD_HOLD_MS, idleOpacity: 0.3 }), 1);
  const mid = computeFadeOpacity({ msSinceChange: HUD_HOLD_MS + HUD_FADE_MS / 2, idleOpacity: 0.3 });
  assert.ok(Math.abs(mid - 0.65) < 1e-9);
  assert.equal(computeFadeOpacity({ msSinceChange: 1e9, idleOpacity: 0.3 }), 0.3);
  assert.equal(computeFadeOpacity({ msSinceChange: 1e9, idleOpacity: 0 }), 0);
  assert.equal(computeFadeOpacity({ msSinceChange: 1e9, idleOpacity: 0.3, forceVisible: true }), 1);
});

test('scale follows the limiting dimension and is clamped', () => {
  assert.equal(computeHudScale(1280, 800), 1);
  assert.equal(computeHudScale(1920, 1080), 1.35 > HUD_SCALE_MAX ? HUD_SCALE_MAX : 1.35);
  assert.equal(computeHudScale(1920, 1200), 1.3);
  assert.equal(computeHudScale(390, 844), HUD_SCALE_MIN);
  assert.equal(computeHudScale(2560, 800), 1); // ultrawide: height-limited
});

test('compact layout on phones in either orientation', () => {
  assert.equal(computeHudLayout(390, 844), 'compact');
  assert.equal(computeHudLayout(844, 390), 'compact');
  assert.equal(computeHudLayout(1280, 800), 'regular');
});

test('meaningful change threshold', () => {
  assert.equal(hasMeaningfulChange(50, 50.3), false);
  assert.equal(hasMeaningfulChange(50, 51), true);
});
