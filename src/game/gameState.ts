/**
 * One game-state board (GameState), split by topic. See "כיוון הארכיטקטורה" in docs/REFACTOR_MAP.md.
 *
 * Today most state still lives as `let` variables inside IsoArenaCanvas.tsx. Every "move, don't
 * change" extraction moves its area's variables here (into the matching topic) and its code into a
 * system in systems.ts. Topics that are still empty list what is expected to move into them.
 */

import type { BarGoer } from './hallBarVisits.ts';
import type { DrinkGuest, DrinkWaiter } from './drinkWaiters.ts';
import type { VipEventState } from './rules.ts';
import type { EventPhaseId } from './eventPhases.ts';

/** The evening: event phase, dance set clock, VIP moments. (score, waves: still in IsoArenaCanvas.tsx) */
export interface EveningState {
  /** The current phase of the evening (eventPhases.ts). */
  phase: EventPhaseId;
  /** Seconds left on the phase title card (PHASE_INTRO_SEC when a phase starts). */
  phaseIntroTimer: number;
  /** Seconds since the current phase started (drives the arrival schedule). */
  phaseTime: number;
  /** Seconds left in the current hall phase; it moves on at 0, after the last one the evening is settled (eveningFlow.ts). */
  phaseTimeLeft: number;
  /** The active VIP moment ("צילום האירוע הנכון"), or null between moments (vipEvents.ts). */
  vipEvent: VipEventState | null;
  /** Counts the VIP moments created; picks the next kind and the guest who says "missed it". */
  vipEventSeq: number;
  /** Seconds until the next VIP moment starts (dancing phase only). */
  nextVipCooldown: number;
}

/** The photographer: position, camera card, dash, chair, carried load. (still in IsoArenaCanvas.tsx) */
export type PhotographerState = Record<string, never>;

/** The guests, what they do on their own, and the hall staff serving them. */
export interface GuestsState {
  /**
   * TEMPORARY BRIDGE: the guest list itself still lives in IsoArenaCanvas.tsx (`guests`, ~80 uses).
   * tick points this at it right before runSystems; it disappears when the guests topic moves here.
   */
  actors: Array<BarGoer & DrinkGuest>;
  /** Smoothed crowd vibe: follows partyJoy gradually so a joy jump doesn't reshuffle the crowd at once (crowdControl.ts). */
  crowdJoy: number;
  /** Seconds until the next crowd move (someone sits down / gets up). */
  crowdMoveCooldown: number;
  /** Seconds until the next bar visit is considered (hallBarVisits.ts). */
  barVisitTimer: number;
  /** The drink waiters (drinkWaiters.ts); created per wave by createDrinkWaiters. */
  waiters: DrinkWaiter[];
}

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
    evening: { phase: 'arrival', phaseIntroTimer: 0, phaseTime: 0, phaseTimeLeft: 65, vipEvent: null, vipEventSeq: 0, nextVipCooldown: 2.5 },
    photographer: {},
    guests: { actors: [], crowdJoy: 90, crowdMoveCooldown: 0, barVisitTimer: 4, waiters: [] },
    station: {},
    supplies: {},
  };
}
