/**
 * Starting and running the phases of the evening (moved out of IsoArenaCanvas.tsx).
 *
 * The phases themselves live in their own modules (arrivalPhase.ts, ceremonyPhase.ts, the dance floor
 * still in the component); this file starts each one and keeps the evening topic of the state board
 * (gameState.ts) in step: which phase, its title card, its clock, the dance set's time left.
 */

import type { EveningState } from './gameState.ts';
import { PHASE_INTRO_SEC } from './eventPhases.ts';
import { createVipEvent } from './rules.ts';
import type { ArrivalController } from './arrivalPhase.ts';

export interface EveningFlowHost {
  readonly arrival: Pick<ArrivalController, 'start' | 'finishAll' | 'update' | 'skipToCeremony' | 'stats'>;
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
  startCeremony(): void;
  startDancing(): void;
  /** One simulated frame: the arrival runs, or the dance set counts down. */
  update(dt: number): void;
  /** Debug (?phase=dancing | ceremony): jump straight to that phase. */
  debugJump(phase: string | null): void;
  /** The dance set has run out (the evening can be settled). */
  danceSetOver(): boolean;
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

  function startCeremony() {
    evening.phase = 'ceremony';
    evening.phaseIntroTimer = PHASE_INTRO_SEC;
    host.fanfare();
  }

  function startDancing() {
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
    else if (phase === 'ceremony') host.arrival.skipToCeremony();
  }

  return {
    startArrival,
    startCeremony,
    startDancing,
    update,
    debugJump,
    danceSetOver: () => evening.phase === 'dancing' && evening.danceTimeLeft <= 0,
  };
}
