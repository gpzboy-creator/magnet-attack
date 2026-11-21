import test from 'node:test';
import assert from 'node:assert/strict';
import type { WeddingGuestActor } from './guestActor.ts';
import { stepCrowd } from './crowdControl.ts';

const guest = (id: number, activity: 'dancing' | 'seated'): WeddingGuestActor =>
  ({
    id, guestActivity: activity, isSeated: activity === 'seated', role: activity === 'seated' ? 'table_guest' : 'dancer',
    danceMove: 'bounce', homeX: 0, homeY: 0, seatX: 100 + id, seatY: 200, danceSpotX: id, danceSpotY: -id,
    speechBubbleText: null, wantsPhotoTimer: 0, activityCooldown: 0, celebrateTimer: 0, seekingMagnet: false,
  }) as unknown as WeddingGuestActor;

test('a dull party: a bored dancer walks back to their seat', () => {
  const guests = Array.from({ length: 10 }, (_, i) => guest(i, 'dancing'));
  const crowd = { crowdJoy: 20, crowdMoveCooldown: 0 };
  stepCrowd(crowd, guests, 20, 0.1, () => 0);
  const sat = guests.filter((g) => g.guestActivity === 'seated');
  assert.equal(sat.length, 1);
  assert.equal(sat[0].homeX, sat[0].seatX);
  assert.ok(crowd.crowdMoveCooldown > 0, 'one move at a time');
});

test('a lively party: a seated guest heads back to the floor', () => {
  const guests = Array.from({ length: 10 }, (_, i) => guest(i, i < 5 ? 'seated' : 'dancing'));
  const crowd = { crowdJoy: 95, crowdMoveCooldown: 0 };
  stepCrowd(crowd, guests, 95, 0.1, () => 0);
  const up = guests.find((g) => g.id < 5 && g.guestActivity === 'dancing');
  assert.ok(up?.isEnteringFloor);
});

test('dinner seats everyone; the next set sends them all back to the floor, a few at a time', async () => {
  const { seatEveryone, everyoneUp } = await import('./crowdControl.ts');
  const guests = Array.from({ length: 6 }, (_, i) => guest(i, 'dancing'));
  seatEveryone(guests, true);
  assert.ok(guests.every((g) => g.guestActivity === 'seated' && g.danceMove === 'eating' && g.homeX === g.seatX));
  const crowd = { crowdJoy: 95, crowdMoveCooldown: 0 };
  stepCrowd(crowd, guests, 95, 0.1, () => 0, true);
  assert.ok(guests.every((g) => g.guestActivity === 'seated'), 'a seated phase holds the crowd');
  everyoneUp(guests, () => 0.5);
  assert.ok(guests.every((g) => g.guestActivity === 'dancing' && g.isEnteringFloor));
  const delays = guests.map((g) => g.arrivalDelayTimer ?? 0);
  assert.ok(delays[5] > delays[0], 'staggered');
});
