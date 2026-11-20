import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDrinkWaiters,
  drinkWaitersSystem,
  trayBump,
  trayBumpMessage,
  updateDrinkWaiter,
  type DrinkGuest,
  type DrinkWaiter,
} from './drinkWaiters.ts';
import { BAR_PICKUP_SPOTS } from './hallBar.ts';
import { createGameState } from './gameState.ts';

const guest = (id: number, over: Partial<DrinkGuest> = {}): DrinkGuest => ({
  id, x: 100, y: 100, guestActivity: 'dancing', speechBubbleText: null, wantsPhotoTimer: 0, ...over,
});
const waiter = (over: Partial<DrinkWaiter> = {}): DrinkWaiter => ({ ...createDrinkWaiters(1)[0], ...over });

test('createDrinkWaiters: three waiters loading at the bar, faster every wave', () => {
  const ws = createDrinkWaiters(2);
  assert.equal(ws.length, 3);
  assert.deepEqual(ws.map((w) => w.mode), ['loading', 'loading', 'loading']);
  assert.deepEqual(ws.map((w) => w.speed), [68, 72, 76]);
  assert.deepEqual(ws.map((w) => Math.round(w.timer * 10) / 10), [0.6, 1.7, 2.8]);
  assert.equal(ws[0].x, BAR_PICKUP_SPOTS[0].x);
});

test('loading: picks a guest without a drink that no other waiter is serving', () => {
  const other = waiter({ id: 2, targetGuestId: 1, mode: 'to_guest' });
  const w = waiter({ timer: 0.1 });
  const guests = [
    guest(1),
    guest(2, { drinkTimer: 5 }),
    guest(3, { seekingMagnet: true }),
    guest(4, { isEnteringFloor: true }),
    guest(5, { guestActivity: 'recruiting' }),
    guest(6, { guestActivity: 'seated' }),
  ];
  updateDrinkWaiter(w, [w, other], guests, 0.2);
  assert.equal(w.mode, 'to_guest');
  assert.equal(w.targetGuestId, 6);
  assert.equal(w.carrying, true);
});

test('loading: nobody to serve → wait 1.2 s and look again', () => {
  const w = waiter({ timer: 0.1 });
  updateDrinkWaiter(w, [w], [guest(1, { drinkTimer: 3 })], 0.2);
  assert.equal(w.mode, 'loading');
  assert.equal(w.timer, 1.2);
});

test('to_guest: reaching the guest serves a drink, then back to the bar after 0.6 s', () => {
  const g = guest(1);
  const w = waiter({ mode: 'to_guest', targetGuestId: 1, carrying: true, x: g.x + 10, y: g.y + 6 });
  updateDrinkWaiter(w, [w], [g], 0.016);
  assert.ok((g.drinkTimer ?? 0) >= 14 && (g.drinkTimer ?? 0) <= 24);
  assert.equal(w.mode, 'serving');
  assert.equal(w.carrying, false);
  updateDrinkWaiter(w, [w], [g], 0.7);
  assert.equal(w.mode, 'to_bar');
  assert.equal(w.targetGuestId, null);
});

test('to_guest: the guest went to the bar → the waiter turns back', () => {
  const w = waiter({ mode: 'to_guest', targetGuestId: 1, carrying: true });
  updateDrinkWaiter(w, [w], [guest(1, { guestActivity: 'bar' })], 0.016);
  assert.equal(w.mode, 'to_bar');
});

test('the system runs every waiter on the state board', () => {
  const state = createGameState();
  state.guests.waiters = createDrinkWaiters(1).map((w) => ({ ...w, bumpCooldown: 1 }));
  drinkWaitersSystem.update(state, 0.25);
  assert.deepEqual(state.guests.waiters.map((w) => w.bumpCooldown), [0.75, 0.75, 0.75]);
});

test('trayBump: close photographer is pushed away once, then a 1.6 s cooldown', () => {
  const w = waiter({ x: 0, y: 0 });
  const player = { x: 10, y: 0, isSeatedAtStation: false };
  assert.deepEqual(trayBump(w, player), { nx: 1, ny: 0 });
  assert.equal(w.bumpCooldown, 1.6);
  assert.equal(trayBump(w, player), null);
  assert.equal(trayBump(waiter({ x: 0, y: 0 }), { x: 30, y: 0, isSeatedAtStation: false }), null);
  assert.equal(trayBump(waiter({ x: 0, y: 0 }), { ...player, isSeatedAtStation: true }), null);
  assert.match(trayBumpMessage('steak'), /המנות/);
});
