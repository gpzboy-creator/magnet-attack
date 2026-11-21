/**
 * The game loop as a fixed list of systems. See "כיוון הארכיטקטורה" in docs/REFACTOR_MAP.md.
 *
 * Each system is one file's `update(state, dt)`; tick calls runSystems once per simulated frame and
 * the systems run in the order listed here. A new feature = a new system, not new code in tick.
 * Extracted areas join this list as they move out of IsoArenaCanvas.tsx.
 *
 * Slots: while most of tick is still inline, a system keeps running at the exact point in tick where
 * its code ran before it moved (move, don't change). tick calls runSystems once per slot; the slots
 * merge as the code between them moves out too.
 */

import type { GameState } from './gameState.ts';
import { barVisitsSystem } from './hallBarVisits.ts';
import { drinkWaitersSystem } from './drinkWaiters.ts';
import { vipEventsSystem } from './vipEvents.ts';

/**
 * Where in tick a system runs (in tick order):
 * - beforeMoodTick: after the photographer's movement, before the guests' magnet deadlines
 *   (both write a guest's speech bubble; the deadline's bubble must win, as before)
 * - beforeShooting: after the guests' magnet deadlines, before aiming/shooting (shooting scores waiters)
 * - beforeGuestUpdate: after the crowd controller (sit/dance/recruit), before the per-guest update
 */
export type SystemSlot = 'beforeMoodTick' | 'beforeShooting' | 'beforeGuestUpdate';
export const SYSTEM_SLOTS: readonly SystemSlot[] = ['beforeMoodTick', 'beforeShooting', 'beforeGuestUpdate'];

export interface GameSystem {
  name: string;
  slot: SystemSlot;
  update(state: GameState, dt: number): void;
}

/** The loop order. Keep it explicit: the order is part of the game's behaviour. */
export const SYSTEMS: readonly GameSystem[] = [vipEventsSystem, drinkWaitersSystem, barVisitsSystem];

/** Run the systems of one slot once, in list order, on the same state and dt. */
export function runSystems(state: GameState, dt: number, slot: SystemSlot, systems: readonly GameSystem[] = SYSTEMS) {
  for (const system of systems) if (system.slot === slot) system.update(state, dt);
}
