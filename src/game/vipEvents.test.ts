import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from './gameState.ts';
import { createVipEvent } from './rules.ts';
import { vipEventsSystem } from './vipEvents.ts';
import type { BarGoer } from './hallBarVisits.ts';

const guest = (id: number): BarGoer => ({
  id, x: 0, y: 0, role: 'dancer', direction: 'S', strideDist: 0, dancePhase: 0,
  celebrateTimer: 0, wantsPhotoTimer: 0, speechBubbleText: null, guestActivity: 'dancing',
});

test('VIP moments: the active moment counts down without touching the cooldown', () => {
  const state = createGameState();
  state.evening.phase = 'dancing';
  state.evening.vipEvent = { ...createVipEvent(0), remainingSec: 5 };
  state.evening.nextVipCooldown = 2;
  vipEventsSystem.update(state, 1);
  assert.equal(state.evening.vipEvent?.remainingSec, 4);
  assert.equal(state.evening.nextVipCooldown, 2);
});

test('VIP moments: running out = a "missed it" bubble on guest #seq, no moment, 3.5 s cooldown', () => {
  const state = createGameState();
  state.guests.actors = [1, 2, 3].map(guest);
  state.evening.vipEventSeq = 4; // 4 % 3 = guest index 1
  state.evening.vipEvent = { ...createVipEvent(3), remainingSec: 0.5 };
  vipEventsSystem.update(state, 1);
  assert.equal(state.evening.vipEvent, null);
  assert.equal(state.evening.nextVipCooldown, 3.5);
  assert.equal(state.guests.actors[1].speechBubbleText, '😞 פספסת!');
  assert.equal(state.guests.actors[1].wantsPhotoTimer, 1.4);
  assert.equal(state.guests.actors[0].speechBubbleText, null);
});

test('VIP moments: a new one starts only in the dancing phase, then the cooldown is 4.5 s', () => {
  const state = createGameState();
  vipEventsSystem.update(state, 10); // arrival: nothing happens
  assert.equal(state.evening.vipEvent, null);
  assert.equal(state.evening.nextVipCooldown, 2.5);

  state.evening.phase = 'dancing';
  vipEventsSystem.update(state, 1);
  assert.equal(state.evening.vipEvent, null);
  assert.equal(state.evening.nextVipCooldown, 1.5);
  vipEventsSystem.update(state, 2);
  const started = state.evening.vipEvent as ReturnType<typeof createVipEvent> | null;
  assert.equal(started?.kind, createVipEvent(0).kind);
  assert.equal(state.evening.vipEventSeq, 1);
  assert.equal(state.evening.nextVipCooldown, 4.5);
});
