import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, type GameState } from './gameState.ts';
import { SYSTEMS, SYSTEM_SLOTS, runSystems, type GameSystem, type SystemSlot } from './systems.ts';
import { barVisitsSystem, type BarGoer } from './hallBarVisits.ts';

test('runSystems runs the systems of one slot once each, in list order, with the same state and dt', () => {
  const state = createGameState();
  const calls: Array<{ name: string; state: GameState; dt: number }> = [];
  const make = (name: string, slot: SystemSlot): GameSystem => ({
    name,
    slot,
    update: (s, dt) => { calls.push({ name, state: s, dt }); },
  });
  const list = [make('first', 'beforeGuestUpdate'), make('early', 'beforeShooting'), make('second', 'beforeGuestUpdate')];

  runSystems(state, 0.016, 'beforeGuestUpdate', list);
  assert.deepEqual(calls.map((c) => c.name), ['first', 'second']);
  calls.length = 0;
  runSystems(state, 0.016, 'beforeShooting', list);
  assert.deepEqual(calls.map((c) => c.name), ['early']);
  for (const c of calls) {
    assert.equal(c.state, state);
    assert.equal(c.dt, 0.016);
  }
});

test('createGameState has the five topics and the starting values', () => {
  const state = createGameState();
  assert.deepEqual(Object.keys(state), ['evening', 'photographer', 'guests', 'station', 'supplies']);
  assert.equal(state.guests.barVisitTimer, 4);
  assert.deepEqual(state.evening, { phase: 'arrival', phaseIntroTimer: 0, phaseTime: 0, danceTimeLeft: 65, vipEvent: null, vipEventSeq: 0, nextVipCooldown: 2.5 });
  assert.deepEqual(state.guests.actors, []);
  assert.deepEqual(state.guests.waiters, []);
});

test('the loop order: VIP moments, then drink waiters, then bar visits, each in the slot where its code ran in tick', () => {
  assert.deepEqual(SYSTEMS.map((s) => s.name), ['vipEvents', 'drinkWaiters', 'barVisits']);
  assert.deepEqual(SYSTEMS.map((s) => s.slot), ['beforeMoodTick', 'beforeShooting', 'beforeGuestUpdate']);
  // Slots are listed in tick order, so list order + slot order agree
  const slotIdx = SYSTEMS.map((s) => SYSTEM_SLOTS.indexOf(s.slot));
  assert.deepEqual(slotIdx, [...slotIdx].sort((a, b) => a - b));
});

test('bar visits: the timer counts down, then sends one dancer to the bar and restarts at 2.5–5.5 s', () => {
  const state = createGameState();
  const dancer = (id: number): BarGoer => ({
    id, x: 0, y: 0, role: 'dancer', direction: 'S', strideDist: 0, dancePhase: 0,
    celebrateTimer: 0, wantsPhotoTimer: 0, speechBubbleText: null, guestActivity: 'dancing',
  });
  state.guests.actors = [1, 2, 3, 4, 5].map(dancer);

  barVisitsSystem.update(state, 1);
  assert.equal(state.guests.barVisitTimer, 3);
  assert.equal(state.guests.actors.filter((g) => g.guestActivity === 'bar').length, 0);

  barVisitsSystem.update(state, 3.5);
  assert.ok(state.guests.barVisitTimer >= 2.5 && state.guests.barVisitTimer <= 5.5);
  assert.equal(state.guests.actors.filter((g) => g.guestActivity === 'bar').length, 1);
});
