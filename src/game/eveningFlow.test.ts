import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from './gameState.ts';
import { createEveningFlow, type EveningFlowHost } from './eveningFlow.ts';
import { HALL_PHASE, PHASE_INTRO_SEC } from './eventPhases.ts';

function setup(debugSec: number | null = null) {
  const state = createGameState();
  const calls: string[] = [];
  const host: EveningFlowHost = {
    arrival: {
      stats: { total: 10, photographed: 7, gold: 2, missed: 3, ignored: 0 },
      start: () => calls.push('arrival.start'),
      finishAll: () => calls.push('arrival.finishAll'),
      update: (_dt, t) => calls.push(`arrival.update@${t}`),
      startCeremony: () => calls.push('arrival.startCeremony'),
      callIn: () => calls.push('arrival.callIn'),
      skipReception: () => calls.push('arrival.skipReception'),
    },
    coupleToHall: () => calls.push('coupleToHall'),
    danceSetSec: () => 240,
    debugPhaseSec: () => debugSec,
    seatEveryone: (eating) => calls.push(eating ? 'seat:eating' : 'seat'),
    everyoneUp: () => calls.push('everyoneUp'),
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

test('the whole evening: reception → chuppah → walk in → slow → dancing → dinner → dancing 2 → stars', () => {
  const { state, calls, flow } = setup();
  flow.startArrival();
  flow.advance(); // the reception is over
  assert.equal(state.evening.phase, 'ceremony');
  assert.ok(calls.includes('arrival.startCeremony'));
  flow.hallReady(); // nobody was called in yet: nothing happens
  assert.equal(state.evening.phase, 'ceremony');
  flow.advance(); // the chuppah is over
  assert.ok(calls.includes('arrival.callIn'));
  assert.equal(state.evening.phase, 'ceremony', 'the chuppah stays on screen while the guests walk in');
  flow.hallReady();
  assert.equal(state.evening.phase, 'slow_dance');
  assert.ok(calls.includes('coupleToHall') && calls.includes('seat'));
  assert.equal(state.evening.vipEvent?.kind, 'first_dance');
  assert.equal(state.evening.phaseTimeLeft, HALL_PHASE.slowDanceSec);

  flow.update(HALL_PHASE.slowDanceSec);
  assert.equal(state.evening.phase, 'dancing');
  assert.ok(calls.includes('everyoneUp'));
  assert.equal(state.evening.phaseTimeLeft, 120, 'the two dance sets share the 4 minutes');

  flow.update(120);
  assert.equal(state.evening.phase, 'dinner');
  assert.ok(calls.includes('seat:eating'));
  assert.equal(state.evening.vipEvent, null);

  flow.update(HALL_PHASE.dinnerSec);
  assert.equal(state.evening.phase, 'dancing2');
  assert.ok(state.evening.vipEvent);
  assert.equal(flow.eveningOver(), false);
  flow.update(121);
  assert.equal(state.evening.phase, 'dancing2');
  assert.equal(flow.eveningOver(), true, 'the stars come at the end of the second set');
});

test('?evening=N: every hall phase lasts N seconds', () => {
  const { state, flow } = setup(8);
  flow.debugJump('slow_dance');
  assert.equal(state.evening.phaseTimeLeft, 8);
  flow.update(8);
  assert.equal(state.evening.phase, 'dancing');
  assert.equal(state.evening.phaseTimeLeft, 8);
});

test('debug jumps: ?phase=dancing, ?phase=dinner and ?phase=ceremony', () => {
  const a = setup();
  a.flow.debugJump('dancing');
  assert.equal(a.state.evening.phase, 'dancing');
  assert.ok(a.calls.some((c) => c.includes('7/10')), 'reception summary on entering the hall');
  const d = setup();
  d.flow.debugJump('dinner');
  assert.equal(d.state.evening.phase, 'dinner');
  const b = setup();
  b.flow.debugJump('ceremony');
  assert.deepEqual(b.calls, ['arrival.skipReception']);
  const c = setup();
  c.flow.debugJump(null);
  assert.deepEqual(c.calls, []);
});
