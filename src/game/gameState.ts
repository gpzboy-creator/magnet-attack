/**
 * One game-state board (GameState), split by topic. See "כיוון הארכיטקטורה" in docs/REFACTOR_MAP.md.
 *
 * Today most state still lives as `let` variables inside IsoArenaCanvas.tsx. Every "move, don't
 * change" extraction moves its area's variables here (into the matching topic) and its code into a
 * system in systems.ts. Topics that are still empty list what is expected to move into them.
 */

/** The evening: event phase, clocks, score, waves. (still in IsoArenaCanvas.tsx) */
export type EveningState = Record<string, never>;

/** The photographer: position, camera card, dash, chair, carried load. (still in IsoArenaCanvas.tsx) */
export type PhotographerState = Record<string, never>;

/** The guests and what they do on their own: list, AI timers, bar visits. (still in IsoArenaCanvas.tsx) */
export type GuestsState = Record<string, never>;

/** The magnet workstation and board: print queue, sheets, magnets on the board. (still in IsoArenaCanvas.tsx) */
export type StationState = Record<string, never>;

/** Supplies: paper, ink, magnets, the car trunk. (still in IsoArenaCanvas.tsx) */
export type SuppliesState = Record<string, never>;

export interface GameState {
  evening: EveningState;
  photographer: PhotographerState;
  guests: GuestsState;
  station: StationState;
  supplies: SuppliesState;
}

/** A fresh board with the values the game starts with. */
export function createGameState(): GameState {
  return {
    evening: {},
    photographer: {},
    guests: {},
    station: {},
    supplies: {},
  };
}
