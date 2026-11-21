/**
 * The phase engine: starts each phase of the evening in the order of the wedding program.
 *
 * The phases themselves live in their own modules (arrivalPhase.ts, ceremonyPhase.ts, the dance floor
 * still in the component). When one ends it reports here, and `advance` starts the program's next
 * phase (weddingProgram.ts) — no phase knows which one follows it. This file also keeps the evening
 * topic of the state board (gameState.ts) in step: which phase, its title card, its clock, the dance
 * set's time left.
 */

import type { EveningState } from './gameState.ts';
import { PHASE_INTRO_SEC } from './eventPhases.ts';
import { createVipEvent } from './rules.ts';
import type { ArrivalController } from './arrivalPhase.ts';
import { phaseAfter } from './weddingProgram.ts';
import type { EventPhaseId } from './eventPhases.ts';

export interface EveningFlowHost {
  readonly arrival: Pick<
    ArrivalController,
    'start' | 'finishAll' | 'update' | 'startCeremony' | 'callIn' | 'skipReception' | 'stats'
  >;
  /** The bride & groom walk from the bridal suite into the hall. */
  coupleToHall(): void;
  /** Length of the dance set in seconds (?evening= overrides it for testing). */
  danceSetSec(): number;
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
  /** One simulated frame: the arrival runs, or the dance set counts down. */
  update(dt: number): void;
  /** Debug (?phase=dancing | ceremony): jump straight to that phase. */
  debugJump(phase: string | null): void;
  /** The last phase is over: the evening can be settled (stars). */
  eveningOver(): boolean;
}

export function createEveningFlow(evening: EveningState, host: EveningFlowHost): EveningFlow {
  function startArrival() {
    evening.phase = 'arrival';
    evening.phaseIntroTimer = PHASE_INTRO_SEC;
    evening.phaseTime = 0;
    evening.vipEvent = null;
    evening.nextVipCooldown = 9999;
    host.arrival.start();
  }

  /** A hall phase waiting for the guests outside to walk in and sit down. */
  let waitingForHall: EventPhaseId | null = null;

  function startCeremony() {
    host.arrival.startCeremony();
    evening.phase = 'ceremony';
    evening.phaseIntroTimer = PHASE_INTRO_SEC;
    host.fanfare();
  }

  function startDancing() {
    waitingForHall = null;
    host.arrival.finishAll();
    host.coupleToHall();
    evening.phase = 'dancing';
    evening.phaseIntroTimer = PHASE_INTRO_SEC;
    evening.phaseTime = 0;
    evening.danceTimeLeft = host.danceSetSec();
    evening.vipEvent = createVipEvent(evening.vipEventSeq++);
    evening.nextVipCooldown = 5.0;
    host.fanfare();
    const s = host.arrival.stats;
    host.announce(`🚪 קבלת הפנים הסתיימה: צילמת ${s.photographed}/${s.total} אורחים (${s.gold} בזהב ✨)`, 4);
  }

  function enter(phase: EventPhaseId) {
    if (phase === 'arrival') startArrival();
    else if (phase === 'ceremony') startCeremony();
    else {
      // a hall phase: the guests outside walk in first (the current phase stays on screen meanwhile)
      waitingForHall = phase;
      host.arrival.callIn();
    }
  }

  function advance() {
    const next = phaseAfter(evening.phase);
    if (next) enter(next);
  }

  function hallReady() {
    if (waitingForHall === 'dancing') startDancing();
  }

  function update(dt: number) {
    if (evening.phase !== 'dancing') {
      evening.phaseTime += dt;
      host.arrival.update(dt, evening.phaseTime);
    } else {
      evening.danceTimeLeft = Math.max(0, evening.danceTimeLeft - dt);
    }
  }

  function debugJump(phase: string | null) {
    if (phase === 'dancing') startDancing();
    else if (phase === 'ceremony') host.arrival.skipReception();
  }

  return {
    startArrival,
    advance,
    hallReady,
    update,
    debugJump,
    eveningOver: () => evening.phase === 'dancing' && evening.danceTimeLeft <= 0 && phaseAfter('dancing') === null,
  };
}
