import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOOD,
  canPromise,
  createMoodBook,
  joyPercent,
  moodOf,
  onArrivalGold,
  onArrivalMissed,
  onMagnetDelivered,
  onShot,
  openMagnets,
  promiseLastShot,
  registerGuests,
  settleEvening,
  starsForShare,
  tickMood,
} from './guestMood.ts';

test('promise window: only right after the shot, only for guests in it', () => {
  const b = createMoodBook();
  onShot(b, [1], 10, 'dancing');
  onShot(b, [2], 10.2, 'dancing'); // same flash burst
  assert.deepEqual(b.lastShot, [1, 2]);
  assert.equal(canPromise(b, 10.2 + MOOD.promiseWindowSec + 0.1), false);
  assert.equal(promiseLastShot(b, 11), 2);
  assert.equal(moodOf(b, 1).promised, true);
  assert.equal(canPromise(b, 11), false, 'window closes after promising');
  assert.deepEqual(openMagnets(b), { open: 2, promised: 2 });
});

test('delivery: promised on time, unpromised surprise (+1 heart), late after the deadline (-1 heart)', () => {
  const b = createMoodBook();
  onShot(b, [1], 0, 'dancing');
  promiseLastShot(b, 1);
  const onTime = onMagnetDelivered(b, 1)!;
  assert.equal(onTime.kind, 'on_time');
  assert.equal(onTime.tip, MOOD.tip.onTime * 3);

  onShot(b, [2], 0, 'dancing');
  const surprise = onMagnetDelivered(b, 2)!;
  assert.equal(surprise.kind, 'surprise');
  assert.equal(moodOf(b, 2).hearts, 4);
  assert.equal(surprise.tip, MOOD.tip.surprise * 4);

  onShot(b, [3], 0, 'dancing');
  assert.deepEqual(tickMood(b, MOOD.danceDeadlineSec + 1), [3]);
  assert.equal(moodOf(b, 3).hearts, 2);
  assert.equal(onMagnetDelivered(b, 3)!.kind, 'late');
  assert.equal(onMagnetDelivered(b, 3), null, 'nothing owed any more');
});

test('arrival photos have no deadline; gold adds a heart, a miss costs one', () => {
  const b = createMoodBook();
  onShot(b, [1], 0, 'arrival');
  assert.deepEqual(tickMood(b, 9999), []);
  onArrivalGold(b, 1);
  assert.equal(moodOf(b, 1).hearts, 4);
  onArrivalMissed(b, 2);
  assert.equal(moodOf(b, 2).hearts, 2);
  onShot(b, [2], 5, 'dancing');
  assert.equal(moodOf(b, 2).hearts, 3, 'a photo later in the evening restores the guest');
});

test('end of evening: broken promise -3 and leaves, unpromised -1, never photographed -2', () => {
  const b = createMoodBook();
  registerGuests(b, [1, 2, 3, 4]);
  onShot(b, [1], 0, 'arrival');
  promiseLastShot(b, 0);
  onShot(b, [2], 0, 'arrival');
  onShot(b, [3], 0, 'arrival');
  onMagnetDelivered(b, 3);
  const s = settleEvening(b);
  assert.equal(moodOf(b, 1).hearts, 0);
  assert.equal(moodOf(b, 1).left, true);
  assert.equal(moodOf(b, 2).hearts, 2);
  assert.equal(moodOf(b, 4).hearts, 1, 'never photographed = unhappy');
  assert.equal(s.brokenPromises, 1);
  assert.equal(s.happyShare, 0.5);
  assert.equal(s.stars, 0);
});

test('stars and joy', () => {
  assert.equal(starsForShare(0.59), 0);
  assert.equal(starsForShare(0.6), 1);
  assert.equal(starsForShare(0.9), 3);
  const b = createMoodBook();
  registerGuests(b, [1, 2]);
  assert.equal(joyPercent(b), 100);
  onArrivalMissed(b, 1);
  assert.equal(joyPercent(b), 83);
});
