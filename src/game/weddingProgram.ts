/**
 * The wedding program: one list that sets the order of the evening (Shahar, 21.11).
 *
 * The list holds every phase the evening will have, including the ones not built yet; the evening
 * plays only the built ones, in list order (eveningFlow.ts asks `phaseAfter` when a phase ends).
 * A new phase = build it, add its id to BUILT_PHASES — the order is already here.
 */

import type { EventPhaseId } from './eventPhases.ts';

export type ProgramPhaseId =
  | 'couple_shoot' // the couple follows the photographer to good spots (planned)
  | 'arrival' // reception: the photo wall and the yard
  | 'ceremony' // the chuppah
  | 'slow_dance' // the couple's first dance, then everyone joins (planned)
  | 'dancing'
  | 'dinner' // guests back at their seats, main course; time to print (planned)
  | 'dancing2'; // the second set; the stars come at its end (planned)

/** The regular wedding. */
export const WEDDING_PROGRAM: readonly ProgramPhaseId[] = [
  'couple_shoot',
  'arrival',
  'ceremony',
  'slow_dance',
  'dancing',
  'dinner',
  'dancing2',
];

/** Phases that exist in the game today. */
export const BUILT_PHASES: readonly EventPhaseId[] = ['arrival', 'ceremony', 'slow_dance', 'dancing', 'dinner', 'dancing2'];

function isBuilt(id: ProgramPhaseId): id is EventPhaseId {
  return (BUILT_PHASES as readonly string[]).includes(id);
}

/** The phases the evening actually plays, in order. */
export function playablePhases(program: readonly ProgramPhaseId[] = WEDDING_PROGRAM): EventPhaseId[] {
  return program.filter(isBuilt);
}

/** The phase after `current` (null = the evening is over: stars). */
export function phaseAfter(current: EventPhaseId, program: readonly ProgramPhaseId[] = WEDDING_PROGRAM): EventPhaseId | null {
  const phases = playablePhases(program);
  const i = phases.indexOf(current);
  return i >= 0 && i < phases.length - 1 ? phases[i + 1] : null;
}
