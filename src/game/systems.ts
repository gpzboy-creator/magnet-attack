/**
 * The game loop as a fixed list of systems. See "כיוון הארכיטקטורה" in docs/REFACTOR_MAP.md.
 *
 * Each system is one file's `update(state, dt)`; tick calls runSystems once per simulated frame and
 * the systems run in the order listed here. A new feature = a new system, not new code in tick.
 * Extracted areas join this list as they move out of IsoArenaCanvas.tsx.
 */

import type { GameState } from './gameState.ts';

export interface GameSystem {
  name: string;
  update(state: GameState, dt: number): void;
}

/** The loop order. Keep it explicit: the order is part of the game's behaviour. */
export const SYSTEMS: readonly GameSystem[] = [];

/** Run every system once, in order, on the same state and dt. */
export function runSystems(state: GameState, dt: number, systems: readonly GameSystem[] = SYSTEMS) {
  for (const system of systems) system.update(state, dt);
}
