import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, type GameState } from './gameState.ts';
import { runSystems, type GameSystem } from './systems.ts';

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

test('createGameState has the five topics', () => {
  const state = createGameState();
  assert.deepEqual(Object.keys(state), ['evening', 'photographer', 'guests', 'station', 'supplies']);
});
