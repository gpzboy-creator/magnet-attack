/**
 * VIP moments ("צילום האירוע הנכון"): the countdown of the active moment, the "missed it" bubble
 * when it runs out, and a new moment every few seconds during the dancing phase.
 * Moved as-is from IsoArenaCanvas.tsx (move, don't change). State: state.evening.vipEvent*.
 *
 * Still in IsoArenaCanvas.tsx: scoring a shot against the moment (shooting loop), the moment's
 * start/stop on phase changes, and drawing the golden target ring.
 */

import { isDancePhase } from './eventPhases.ts';
import { createVipEvent } from './rules.ts';
import { sound } from './sound.ts';
import type { GameState } from './gameState.ts';
import type { GameSystem } from './systems.ts';

/** Loop system: count the active VIP moment down; when none is active in the dancing phase, start the next. */
export const vipEventsSystem: GameSystem = {
  name: 'vipEvents',
  slot: 'beforeMoodTick',
  update(state: GameState, dt: number) {
    const ev = state.evening;
    const guests = state.guests.actors;
    if (ev.vipEvent && ev.vipEvent.remainingSec > 0) {
      ev.vipEvent = {
        ...ev.vipEvent,
        remainingSec: Math.max(0, ev.vipEvent.remainingSec - dt),
      };
      if (ev.vipEvent.remainingSec === 0) {
        const missedGuest = guests[ev.vipEventSeq % Math.max(1, guests.length)];
        if (missedGuest) {
          missedGuest.speechBubbleText = '😞 פספסת!';
          missedGuest.wantsPhotoTimer = 1.4;
        }
        ev.vipEvent = null;
        ev.nextVipCooldown = 3.5;
      }
    } else if (isDancePhase(ev.phase)) {
      ev.nextVipCooldown -= dt;
      if (ev.nextVipCooldown <= 0) {
        ev.vipEvent = createVipEvent(ev.vipEventSeq++);
        ev.nextVipCooldown = 4.5;
        sound.playTelegraph();
      }
    }
  },
};
