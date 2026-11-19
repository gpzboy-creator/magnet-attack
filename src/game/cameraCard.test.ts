import test from 'node:test';
import assert from 'node:assert/strict';
import { cardCopySec, cardLimits, overflowExtraSec } from './cameraCard.ts';

test('soft cap: 12 before the slowdown, really full at 24; the SD upgrade moves both', () => {
  assert.deepEqual(cardLimits(0), { capacity: 12, hardMax: 24 });
  assert.deepEqual(cardLimits(1), { capacity: 18, hardMax: 36 });
});

test('each photo over capacity costs more than the one before: 0.1 ×3, 0.15 ×3, then 0.25', () => {
  assert.equal(overflowExtraSec(12, 12), 0);
  assert.equal(overflowExtraSec(13, 12), 0.1);
  assert.equal(overflowExtraSec(15, 12), 0.3);
  assert.equal(overflowExtraSec(18, 12), 0.75);
  assert.equal(overflowExtraSec(20, 12), 1.25);
  assert.equal(overflowExtraSec(24, 12), 2.25);
});

test('copy time adds the overflow; the turbo station shortens it', () => {
  assert.equal(cardCopySec(2, 12, 12, 1), 2);
  assert.equal(cardCopySec(2, 18, 12, 1), 2.75);
  assert.equal(cardCopySec(2, 18, 12, 2), 2.38);
});
