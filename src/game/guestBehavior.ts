/**
 * Guest personalities & behavior state machines (pure — no rendering, no game globals).
 *
 *  - assignGuestTypes(): distributes potential couples (whole dance pairs), attention seekers,
 *    impatient magnet trackers and regulars per SPAWN_WEIGHTS.
 *  - Behavior components:
 *      attention seeker:  calm ──timer──▶ seeking ──photographed──▶ calm
 *      impatient tracker: idle ──photographed──▶ waiting ──deadline──▶ nagging ──gave up──▶ idle
 *                                                   └──magnet delivered──▶ satisfied ──▶ idle
 *  - Each step returns events (dialogue lines, penalties) for the game to apply.
 */

import { ATTENTION, DIALOGUE_HE, PATIENCE, SPAWN_WEIGHTS, type GuestType } from './guestBalance.ts';

export type Rng = () => number;

// ---------------------------------------------------------------------------
// Distribution
// ---------------------------------------------------------------------------

/**
 * Assigns a type to each of `count` regular-pool guests.
 * Potential couples are taken as whole pairs from `partnerPairs` (indices into the pool).
 * Bride & groom are NOT part of this pool — they are spawned once, separately.
 */
export function assignGuestTypes(params: {
  count: number;
  partnerPairs: Array<[number, number]>;
  rng: Rng;
}): GuestType[] {
  const { count, partnerPairs, rng } = params;
  const types: GuestType[] = Array.from({ length: count }, () => 'regular');
  const taken = new Set<number>();

  // Couples: whole pairs, ~SPAWN_WEIGHTS.potential_couple of the pool
  const couplePairs = Math.floor((count * SPAWN_WEIGHTS.potential_couple) / 2);
  const pairs = shuffle([...partnerPairs], rng).filter(([a, b]) => a < count && b < count);
  for (const [a, b] of pairs.slice(0, couplePairs)) {
    types[a] = 'potential_couple';
    types[b] = 'potential_couple';
    taken.add(a);
    taken.add(b);
  }

  const free = shuffle(
    Array.from({ length: count }, (_, i) => i).filter((i) => !taken.has(i)),
    rng
  );
  const seekers = Math.max(1, Math.round(count * SPAWN_WEIGHTS.attention_seeker));
  const trackers = Math.max(1, Math.round(count * SPAWN_WEIGHTS.impatient_tracker));
  free.slice(0, seekers).forEach((i) => (types[i] = 'attention_seeker'));
  free.slice(seekers, seekers + trackers).forEach((i) => (types[i] = 'impatient_tracker'));
  return types;
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function between([lo, hi]: [number, number], rng: Rng): number {
  return lo + (hi - lo) * rng();
}

function pick<T>(list: readonly T[], rng: Rng): T {
  return list[Math.floor(rng() * list.length) % list.length];
}

// ---------------------------------------------------------------------------
// Behavior state
// ---------------------------------------------------------------------------

export type AttentionPhase = 'calm' | 'seeking';
export type ImpatientPhase = 'idle' | 'waiting' | 'nagging' | 'satisfied';

export type GuestBehaviorState =
  | { kind: 'none' }
  | { kind: 'attention'; phase: AttentionPhase; timer: number; shoutTimer: number }
  | {
      kind: 'impatient';
      phase: ImpatientPhase;
      /** Seconds left before the deadline (waiting). */
      patienceLeft: number;
      /** Magnets of this guest still in the pipeline. */
      pending: number;
      nagTime: number;
      lineTimer: number;
      penaltyTimer: number;
      satisfiedTimer: number;
    };

export type BehaviorEvent =
  | { type: 'say'; text: string }
  | { type: 'start_seeking' }
  | { type: 'stop_seeking' }
  | { type: 'patience_expired' }
  | { type: 'nag_penalty' }
  | { type: 'gave_up' }
  | { type: 'delivered_on_time' }
  | { type: 'delivered_late' }
  | { type: 'calm_down' };

export function createBehavior(type: GuestType, rng: Rng): GuestBehaviorState {
  if (type === 'attention_seeker') {
    return { kind: 'attention', phase: 'calm', timer: between(ATTENTION.firstCravingSec, rng), shoutTimer: 0 };
  }
  if (type === 'impatient_tracker') {
    return {
      kind: 'impatient',
      phase: 'idle',
      patienceLeft: 0,
      pending: 0,
      nagTime: 0,
      lineTimer: 0,
      penaltyTimer: 0,
      satisfiedTimer: 0,
    };
  }
  return { kind: 'none' };
}

/** Per-frame update. */
export function stepBehavior(
  state: GuestBehaviorState,
  dt: number,
  rng: Rng
): { state: GuestBehaviorState; events: BehaviorEvent[] } {
  const events: BehaviorEvent[] = [];
  const d = Math.max(0, dt);

  if (state.kind === 'attention') {
    if (state.phase === 'calm') {
      const timer = state.timer - d;
      if (timer <= 0) {
        events.push({ type: 'start_seeking' }, { type: 'say', text: pick(DIALOGUE_HE.attentionShouts, rng) });
        return { state: { ...state, phase: 'seeking', timer: 0, shoutTimer: ATTENTION.shoutIntervalSec }, events };
      }
      return { state: { ...state, timer }, events };
    }
    const shoutTimer = state.shoutTimer - d;
    if (shoutTimer <= 0) {
      events.push({ type: 'say', text: pick(DIALOGUE_HE.attentionShouts, rng) });
      return { state: { ...state, shoutTimer: ATTENTION.shoutIntervalSec }, events };
    }
    return { state: { ...state, shoutTimer }, events };
  }

  if (state.kind === 'impatient') {
    if (state.phase === 'waiting') {
      const patienceLeft = state.patienceLeft - d;
      if (patienceLeft <= 0) {
        events.push(
          { type: 'patience_expired' },
          { type: 'say', text: pick(DIALOGUE_HE.nagLines, rng) }
        );
        return {
          state: {
            ...state,
            phase: 'nagging',
            patienceLeft: 0,
            nagTime: 0,
            lineTimer: PATIENCE.nagLineIntervalSec,
            penaltyTimer: PATIENCE.nagPenaltyIntervalSec,
          },
          events,
        };
      }
      return { state: { ...state, patienceLeft }, events };
    }
    if (state.phase === 'nagging') {
      const nagTime = state.nagTime + d;
      if (nagTime >= PATIENCE.nagMaxSec) {
        events.push({ type: 'gave_up' }, { type: 'say', text: pick(DIALOGUE_HE.impatientGaveUp, rng) });
        return { state: { ...state, phase: 'idle', pending: 0, nagTime: 0 }, events };
      }
      let lineTimer = state.lineTimer - d;
      let penaltyTimer = state.penaltyTimer - d;
      if (lineTimer <= 0) {
        events.push({ type: 'say', text: pick(DIALOGUE_HE.nagLines, rng) });
        lineTimer = PATIENCE.nagLineIntervalSec;
      }
      if (penaltyTimer <= 0) {
        events.push({ type: 'nag_penalty' });
        penaltyTimer = PATIENCE.nagPenaltyIntervalSec;
      }
      return { state: { ...state, nagTime, lineTimer, penaltyTimer }, events };
    }
    if (state.phase === 'satisfied') {
      const satisfiedTimer = state.satisfiedTimer - d;
      if (satisfiedTimer <= 0) {
        events.push({ type: 'calm_down' });
        return { state: { ...state, phase: 'idle', satisfiedTimer: 0 }, events };
      }
      return { state: { ...state, satisfiedTimer }, events };
    }
  }
  return { state, events };
}

/** The guest was photographed (photo captured into the camera). */
export function onGuestPhotographed(
  state: GuestBehaviorState,
  rng: Rng
): { state: GuestBehaviorState; events: BehaviorEvent[] } {
  if (state.kind === 'attention') {
    if (state.phase !== 'seeking') return { state, events: [] };
    return {
      state: { ...state, phase: 'calm', timer: between(ATTENTION.calmAfterPhotoSec, rng), shoutTimer: 0 },
      events: [{ type: 'stop_seeking' }, { type: 'say', text: pick(DIALOGUE_HE.attentionSatisfied, rng) }],
    };
  }
  if (state.kind === 'impatient') {
    // The countdown starts at the first shot; more photos while waiting just add pending magnets
    if (state.phase === 'idle' || state.phase === 'satisfied') {
      return {
        state: { ...state, phase: 'waiting', patienceLeft: PATIENCE.timeoutSec, pending: 1, nagTime: 0 },
        events: [],
      };
    }
    return { state: { ...state, pending: state.pending + 1 }, events: [] };
  }
  return { state, events: [] };
}

/** One of this guest's magnets was placed on the board. */
export function onMagnetDelivered(
  state: GuestBehaviorState,
  rng: Rng
): { state: GuestBehaviorState; events: BehaviorEvent[] } {
  if (state.kind !== 'impatient' || (state.phase !== 'waiting' && state.phase !== 'nagging')) {
    return { state, events: [] };
  }
  const pending = Math.max(0, state.pending - 1);
  if (pending > 0) return { state: { ...state, pending }, events: [] };
  const onTime = state.phase === 'waiting';
  return {
    state: { ...state, phase: 'satisfied', pending: 0, satisfiedTimer: 3, nagTime: 0 },
    events: [
      { type: onTime ? 'delivered_on_time' : 'delivered_late' },
      { type: 'say', text: pick(DIALOGUE_HE.impatientDelivered, rng) },
    ],
  };
}

/** True while this guest should walk up to the photographer. */
export function wantsToApproachPhotographer(state: GuestBehaviorState): 'seek' | 'nag' | null {
  if (state.kind === 'attention' && state.phase === 'seeking') return 'seek';
  if (state.kind === 'impatient' && state.phase === 'nagging') return 'nag';
  return null;
}
