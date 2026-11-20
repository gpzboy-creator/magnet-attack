import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, type GameState } from './gameState.ts';
import { SYSTEMS, runSystems, type GameSystem } from './systems.ts';
import { barVisitsSystem, type BarGoer } from './hallBarVisits.ts';

test('runSystems runs every system once, in list order, with the same state and dt', () => {
  const state = createGameState();
  const calls: Array<{ name: string; state: GameState; dt: number }> = [];
  const make = (name: string): GameSystem => ({ name, update: (s, dt) => calls.push({ name, state: s, dt }) });

  runSystems(state, 0.016, [make('first'), make('second'), make('third')]);

  assert.deepEqual(calls.map((c) => c.name), ['first', 'second', 'third']);
  for (const c of calls) {
    assert.equal(c.state, state);
    assert.equal(c.dt, 0.016);
  }
});

test('createGameState has the five topics and the starting values', () => {
  const state = createGameState();
  assert.deepEqual(Object.keys(state), ['evening', 'photographer', 'guests', 'station', 'supplies']);
  assert.equal(state.guests.barVisitTimer, 4);
  assert.deepEqual(state.guests.actors, []);
});

test('the loop order: bar visits is the first system', () => {
  assert.deepEqual(SYSTEMS.map((s) => s.name), ['barVisits']);
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
