/**
 * The phase engine: starts each phase of the evening in the order of the wedding program.
 *
 * The phases themselves live in their own modules (arrivalPhase.ts, ceremonyPhase.ts, crowdControl.ts,
 * the dance floor still in the component). An outdoor phase reports here when it ends; a hall phase
 * runs on a clock. Either way `advance` starts the program's next phase (weddingProgram.ts) — no
 * phase knows which one follows it. This file also keeps the evening topic of the state board
 * (gameState.ts) in step: which phase, its title card, its clock, the time left in a hall phase.
 */

import type { EveningState } from './gameState.ts';
import { HALL_PHASE, PHASE_INTRO_SEC, isDancePhase, isHallPhase, type EventPhaseId } from './eventPhases.ts';
import { createFirstDanceEvent, createVipEvent } from './rules.ts';
import type { ArrivalController } from './arrivalPhase.ts';
import { phaseAfter } from './weddingProgram.ts';

export interface EveningFlowHost {
  readonly arrival: Pick<
    ArrivalController,
    'start' | 'finishAll' | 'update' | 'startCeremony' | 'callIn' | 'skipReception' | 'stats'
  >;
  /** The bride & groom walk from the bridal suite into the hall. */
  coupleToHall(): void;
  /** Length of both dance sets together (seconds); they split it half and half. */
  danceSetSec(): number;
  /** Debug (?evening=N): every hall phase lasts N seconds. */
  debugPhaseSec(): number | null;
  /** Everyone goes back to their chair (`eating`: the main course). */
  seatEveryone(eating: boolean): void;
  /** Everyone gets up and walks onto the dance floor. */
  everyoneUp(): void;
  fanfare(): void;
  /** A message line over the photographer for `sec` seconds. */
  announce(text: string, sec: number): void;
}

export interface EveningFlow {
  startArrival(): void;
  /** The current phase is over: start the program's next one. */
  advance(): void;
  /** Everyone called in from outside is seated: the hall phase that was waiting starts. */
  hallReady(): void;
  /** One simulated frame: the arrival runs, or the hall phase's clock counts down. */
  update(dt: number): void;
  /** Debug (?phase=ceremony | slow_dance | dancing | dinner | dancing2): jump straight to that phase. */
  debugJump(phase: string | null): void;
  /** The last phase is over: the evening can be settled (stars). */
  eveningOver(): boolean;
}

export function createEveningFlow(evening: EveningState, host: EveningFlowHost): EveningFlow {
  /** A hall phase waiting for the guests outside to walk in and sit down. */
  let waitingForHall: EventPhaseId | null = null;

  function startArrival() {
    waitingForHall = null;
    evening.phase = 'arrival';
    evening.phaseIntroTimer = PHASE_INTRO_SEC;
    evening.phaseTime = 0;
    evening.vipEvent = null;
    evening.nextVipCooldown = 9999;
    host.arrival.start();
  }

  function startCeremony() {
    host.arrival.startCeremony();
    evening.phase = 'ceremony';
    evening.phaseIntroTimer = PHASE_INTRO_SEC;
    host.fanfare();
  }

  function hallPhaseSec(phase: EventPhaseId): number {
    const debug = host.debugPhaseSec();
    if (debug) return debug;
    if (phase === 'slow_dance') return HALL_PHASE.slowDanceSec;
    if (phase === 'dinner') return HALL_PHASE.dinnerSec;
    return host.danceSetSec() / 2;
  }

  /** Coming in from outside: whoever is still on the way sits down, the couple walks in, reception summary. */
  function enterHall() {
    host.arrival.finishAll();
    host.coupleToHall();
    const s = host.arrival.stats;
    host.announce(`🚪 קבלת הפנים הסתיימה: צילמת ${s.photographed}/${s.total} אורחים (${s.gold} בזהב ✨)`, 4);
  }

  function startHallPhase(phase: EventPhaseId) {
    waitingForHall = null;
    evening.phase = phase;
    evening.phaseIntroTimer = PHASE_INTRO_SEC;
    evening.phaseTime = 0;
    evening.phaseTimeLeft = hallPhaseSec(phase);
    if (isDancePhase(phase)) {
      host.everyoneUp();
      evening.vipEvent = createVipEvent(evening.vipEventSeq++);
      evening.nextVipCooldown = 5.0;
    } else {
      host.seatEveryone(phase === 'dinner');
      evening.vipEvent = phase === 'slow_dance' ? createFirstDanceEvent(evening.vipEventSeq++, evening.phaseTimeLeft) : null;
      evening.nextVipCooldown = 9999;
    }
    host.fanfare();
  }

  function enter(phase: EventPhaseId) {
    if (phase === 'arrival') startArrival();
    else if (phase === 'ceremony') startCeremony();
    else if (isHallPhase(evening.phase)) startHallPhase(phase);
    else {
      // from outside to the hall: the guests walk in first (the current phase stays on screen meanwhile)
      waitingForHall = phase;
      host.arrival.callIn();
    }
  }

  function advance() {
    const next = phaseAfter(evening.phase);
    if (next) enter(next);
  }

  function hallReady() {
    if (!waitingForHall) return;
    enterHall();
    startHallPhase(waitingForHall);
  }

  function update(dt: number) {
    evening.phaseTime += dt;
    if (!isHallPhase(evening.phase)) {
      host.arrival.update(dt, evening.phaseTime);
      return;
    }
    evening.phaseTimeLeft = Math.max(0, evening.phaseTimeLeft - dt);
    if (evening.phaseTimeLeft <= 0 && phaseAfter(evening.phase)) advance();
  }

  function debugJump(phase: string | null) {
    if (phase === 'ceremony') host.arrival.skipReception();
    else if (phase && isHallPhase(phase as EventPhaseId)) {
      enterHall();
      startHallPhase(phase as EventPhaseId);
    }
  }

  return {
    startArrival,
    advance,
    hallReady,
    update,
    debugJump,
    eveningOver: () => isHallPhase(evening.phase) && evening.phaseTimeLeft <= 0 && phaseAfter(evening.phase) === null,
  };
}
