import test from 'node:test';
import assert from 'node:assert/strict';
import { findStripFrames, isChromaGreen, keyOutGreenInPlace } from './seatedSprite.ts';

test('chroma key removes green background and despills edges', () => {
  const px = new Uint8ClampedArray([
    10, 220, 5, 255, // background green → transparent
    90, 60, 40, 255, // suit brown → kept
    100, 130, 90, 255, // greenish fringe → kept but despilled
  ]);
  keyOutGreenInPlace(px);
  assert.equal(px[3], 0);
  assert.equal(px[7], 255);
  assert.ok(px[9] <= 112 && px[11] === 255, `fringe green should be capped, got ${px[9]}`);
  assert.equal(isChromaGreen(13, 217, 4), true);
  assert.equal(isChromaGreen(120, 90, 70), false);
});

test('strip frames are found at uneven spacing', () => {
  const w = 120;
  const h = 40;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const fill = (x0: number, x1: number, y0: number, y1: number) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) rgba[(y * w + x) * 4 + 3] = 255;
  };
  fill(5, 30, 4, 36);
  fill(40, 62, 8, 36);
  fill(90, 115, 2, 30);
  const frames = findStripFrames(rgba, w, h, { minFrameWidth: 10 });
  assert.deepEqual(frames, [
    { x: 5, y: 4, width: 25, height: 32 },
    { x: 40, y: 8, width: 22, height: 28 },
    { x: 90, y: 2, width: 25, height: 28 },
  ]);
});
