/**
 * Drink waiters in the hall (moved out of IsoArenaCanvas.tsx, no behavior change): three waiters in
 * black shirts + aprons pick up a tray at the hall bar, walk to a guest without a drink, serve, and
 * go back to the bar. Bumping into one (trayBump) knocks the photographer back.
 *
 * `mode` + `carrying` + `trayItem` are what a future animated (PixelLab) waiter will be drawn from;
 * the drawing itself is in render/drinkWaiters.ts.
 */

import { moveTowardPoint, type WaiterActorState } from './rules.ts';
import { BAR_PICKUP_SPOTS } from './hallBar.ts';
import { HALL_TABLES } from './hallLayout.ts';
import type { GameState } from './gameState.ts';
import type { GameSystem } from './systems.ts';

export type DrinkWaiter = WaiterActorState & {
  mode: 'to_bar' | 'loading' | 'to_guest' | 'serving';
  targetGuestId: number | null;
  timer: number;
  carrying: boolean;
};

/** The guest fields a waiter reads and writes (a slice of WeddingGuestActor). */
export interface DrinkGuest {
  id: number;
  x: number;
  y: number;
  tableId?: number;
  seekingMagnet?: boolean;
  guestActivity?: 'dancing' | 'recruiting' | 'seated' | 'bar';
  isEnteringFloor?: boolean;
  drinkTimer?: number;
  drinkKind?: number;
  speechBubbleText: string | null;
  wantsPhotoTimer: number;
}

/** Three waiters at the bar's pickup spots; a little faster every wave. */
export function createDrinkWaiters(waveNum: number): DrinkWaiter[] {
  return [0, 1, 2].map((i) => {
    const start = BAR_PICKUP_SPOTS[i % BAR_PICKUP_SPOTS.length];
    return {
      id: i + 1,
      x: start.x - i * 6,
      y: start.y + i * 6,
      waypointIdx: 0,
      waypoints: [],
      speed: 60 + waveNum * 4 + i * 4,
      trayItem: 'champagne' as const,
      bumpCooldown: 0,
      mode: 'loading' as const,
      targetGuestId: null,
      timer: 0.6 + i * 1.1,
      carrying: false,
    };
  });
}

/** One frame of one waiter: bar → loading → guest → serving → bar. */
/** `mainCourse` (dinner): every tray that goes out is a main course plate. */
export function updateDrinkWaiter(wActor: DrinkWaiter, waiters: DrinkWaiter[], guests: DrinkGuest[], simDt: number, mainCourse = false) {
  wActor.bumpCooldown = Math.max(0, wActor.bumpCooldown - simDt);
  if (wActor.mode === 'to_bar') {
    const pick = BAR_PICKUP_SPOTS[wActor.id % BAR_PICKUP_SPOTS.length];
    const mv = moveTowardPoint(wActor, pick, wActor.speed, simDt, 6);
    wActor.x = mv.x;
    wActor.y = mv.y;
    if (mv.arrived) {
      wActor.mode = 'loading';
      wActor.timer = 0.9 + Math.random() * 0.8;
    }
  } else if (wActor.mode === 'loading') {
    wActor.timer -= simDt;
    if (wActor.timer <= 0) {
      // Next guest without a drink that no other waiter is already serving
      const candidates = guests.filter(
        (g) =>
          !g.seekingMagnet &&
          (g.drinkTimer ?? 0) <= 0 &&
          (g.guestActivity === 'seated' || (g.guestActivity === 'dancing' && !g.isEnteringFloor)) &&
          !waiters.some((o) => o !== wActor && o.targetGuestId === g.id)
      );
      if (candidates.length > 0) {
        const tgt = candidates[Math.floor(Math.random() * candidates.length)];
        wActor.targetGuestId = tgt.id;
        wActor.carrying = true;
        wActor.trayItem = mainCourse || Math.random() < 0.5 ? 'steak' : 'champagne';
        wActor.mode = 'to_guest';
      } else {
        wActor.timer = 1.2;
      }
    }
  } else if (wActor.mode === 'to_guest') {
    const tgt = guests.find((g) => g.id === wActor.targetGuestId);
    if (!tgt || tgt.seekingMagnet || tgt.guestActivity === 'bar' || (tgt.drinkTimer ?? 0) > 0) {
      wActor.mode = 'to_bar';
      wActor.targetGuestId = null;
    } else {
      // Approach from the aisle side: seated guests from behind their chair, dancers from the side
      const tbl = HALL_TABLES.find((tb) => tb.id === tgt.tableId);
      const awayY = tgt.guestActivity === 'seated' && tbl ? (tgt.y < tbl.y ? -12 : 12) : 6;
      const mv = moveTowardPoint(wActor, { x: tgt.x + 10, y: tgt.y + awayY }, wActor.speed, simDt, 7);
      wActor.x = mv.x;
      wActor.y = mv.y;
      if (mv.arrived) {
        tgt.drinkTimer = 14 + Math.random() * 10;
        tgt.drinkKind = Math.floor(Math.random() * 4);
        if (!tgt.speechBubbleText && Math.random() < 0.5) {
          tgt.speechBubbleText = Math.random() < 0.5 ? '🥂 תודה!' : '🍷 לחיים!';
          tgt.wantsPhotoTimer = 1.3;
        }
        wActor.carrying = false;
        wActor.mode = 'serving';
        wActor.timer = 0.6;
      }
    }
  } else {
    wActor.timer -= simDt;
    if (wActor.timer <= 0) {
      wActor.mode = 'to_bar';
      wActor.targetGuestId = null;
    }
  }
}

/** Loop system: every waiter, in order (the bump check runs right after it in tick). */
export const drinkWaitersSystem: GameSystem = {
  name: 'drinkWaiters',
  slot: 'beforeShooting',
  update(state: GameState, dt: number) {
    const { waiters, actors } = state.guests;
    const mainCourse = state.evening.phase === 'dinner';
    for (const w of waiters) updateDrinkWaiter(w, waiters, actors, dt, mainCourse);
  },
};

/**
 * Did the photographer walk into this waiter's tray? If so the waiter's cooldown restarts (1.6 s) and
 * the result is the unit push direction for the photographer (tick plays the sound, shake, particles).
 */
export function trayBump(
  wActor: DrinkWaiter,
  player: { x: number; y: number; isSeatedAtStation: boolean }
): { nx: number; ny: number } | null {
  if (player.isSeatedAtStation || wActor.bumpCooldown > 0) return null;
  const wdx = player.x - wActor.x;
  const wdy = player.y - wActor.y;
  const wDist = Math.hypot(wdx, wdy) || 1;
  if (wDist >= 24) return null;
  wActor.bumpCooldown = 1.6;
  return { nx: wdx / wDist, ny: wdy / wDist };
}

/** What the photographer is told after bumping into a tray. */
export const trayBumpMessage = (trayItem: DrinkWaiter['trayItem']) =>
  trayItem === 'champagne'
    ? '🍾 אופס! נתקלת במלצר השמפניה! היזהר מהמגשים באולם!'
    : '🍽️ אופס! נתקלת במלצר המנות! עקוף את המלצרים בריצה!';
