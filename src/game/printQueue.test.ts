import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrintQueue, enqueuePrint, isPrinting, photosInPrinter, printRemainingSec, stepPrint } from './printQueue.ts';

test('photos are split into sheets of 4 and come out one sheet at a time', () => {
  const q = createPrintQueue();
  assert.equal(enqueuePrint(q, 10), 3);
  assert.equal(photosInPrinter(q), 10);
  assert.deepEqual(stepPrint(q, 1.5, 2), []);
  assert.deepEqual(stepPrint(q, 1, 2), [4]);
  assert.deepEqual(stepPrint(q, 10, 2), [4, 2]);
  assert.equal(isPrinting(q), false);
  assert.equal(q.runDone, 3);
});

test('more photos sent while printing join the same run', () => {
  const q = createPrintQueue();
  enqueuePrint(q, 4);
  stepPrint(q, 1, 2);
  enqueuePrint(q, 8);
  assert.equal(q.runSheets, 3);
  assert.equal(printRemainingSec(q, 2), 5);
  stepPrint(q, 5, 2);
  assert.equal(isPrinting(q), false);
});

test('a new run starts counting from zero once the printer was idle', () => {
  const q = createPrintQueue();
  enqueuePrint(q, 4);
  stepPrint(q, 3, 2);
  enqueuePrint(q, 4);
  assert.equal(q.runSheets, 1);
  assert.equal(q.runDone, 0);
});

test('printing a full card takes longer than copying it', async () => {
  const { cardCopySec, cardLimits } = await import('./cameraCard.ts');
  const { calculateCardTransferTiming } = await import('./rules.ts');
  const { capacity } = cardLimits(0);
  for (const photos of [capacity, capacity * 2]) {
    const copy = cardCopySec(calculateCardTransferTiming(photos).totalDurationSec, photos, capacity, 1);
    const q = createPrintQueue();
    enqueuePrint(q, photos);
    assert.ok(printRemainingSec(q, 2) > copy, `${photos} photos: print ${printRemainingSec(q, 2)}s vs copy ${copy}s`);
  }
});
