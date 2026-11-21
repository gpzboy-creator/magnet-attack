import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from './gameState.ts';
import { createEveningFlow, type EveningFlowHost } from './eveningFlow.ts';
import { PHASE_INTRO_SEC } from './eventPhases.ts';

function setup() {
  const state = createGameState();
  const calls: string[] = [];
  const host: EveningFlowHost = {
    arrival: {
      stats: { total: 10, photographed: 7, gold: 2, missed: 3, ignored: 0 },
      start: () => calls.push('arrival.start'),
      finishAll: () => calls.push('arrival.finishAll'),
      update: (_dt, t) => calls.push(`arrival.update@${t}`),
      skipToCeremony: () => calls.push('arrival.skipToCeremony'),
    },
    coupleToHall: () => calls.push('coupleToHall'),
    danceSetSec: () => 240,
    fanfare: () => calls.push('fanfare'),
    announce: (text) => calls.push(`announce:${text}`),
  };
  return { state, calls, flow: createEveningFlow(state.evening, host) };
}

test('arrival: title card, clock from zero, no VIP moments, arrival runs with the phase clock', () => {
  const { state, calls, flow } = setup();
  flow.startArrival();
  assert.equal(state.evening.phase, 'arrival');
  assert.equal(state.evening.phaseIntroTimer, PHASE_INTRO_SEC);
  assert.equal(state.evening.vipEvent, null);
  flow.update(0.5);
  flow.update(0.5);
  assert.deepEqual(calls, ['arrival.start', 'arrival.update@0.5', 'arrival.update@1']);
});

test('dancing: couple walks in, dance set starts, a VIP moment is up, reception summary', () => {
  const { state, calls, flow } = setup();
  flow.startDancing();
  assert.equal(state.evening.phase, 'dancing');
  assert.equal(state.evening.danceTimeLeft, 240);
  assert.ok(state.evening.vipEvent);
  assert.ok(calls.includes('coupleToHall') && calls.includes('arrival.finishAll'));
  assert.ok(calls.some((c) => c.includes('7/10')));
  flow.update(239);
  assert.equal(flow.danceSetOver(), false);
  flow.update(5);
  assert.equal(state.evening.danceTimeLeft, 0);
  assert.equal(flow.danceSetOver(), true);
});

test('debug jumps: ?phase=dancing and ?phase=ceremony', () => {
  const a = setup();
  a.flow.debugJump('dancing');
  assert.equal(a.state.evening.phase, 'dancing');
  const b = setup();
  b.flow.debugJump('ceremony');
  assert.deepEqual(b.calls, ['arrival.skipToCeremony']);
  const c = setup();
  c.flow.debugJump(null);
  assert.deepEqual(c.calls, []);
});
