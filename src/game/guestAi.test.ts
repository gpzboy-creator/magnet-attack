import test from 'node:test';
import assert from 'node:assert/strict';
import { PATIENCE, PENALTIES, SCORE_REWARDS, MULTIPLIERS } from './guestBalance.ts';
import {
  assignGuestTypes,
  createBehavior,
  onGuestPhotographed,
  onMagnetDelivered,
  stepBehavior,
  wantsToApproachPhotographer,
  type GuestBehaviorState,
} from './guestBehavior.ts';
import { MagnetLedger, scoreCaptureExtras, scoreFrame } from './photoScoring.ts';

/** Deterministic RNG for tests */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

test('distribution: couples as whole pairs, ~10% seekers, ~10% trackers, rest regular', () => {
  const pairs: Array<[number, number]> = [[0, 4], [1, 5], [2, 6], [8, 12], [9, 13], [10, 14], [16, 17]];
  const types = assignGuestTypes({ count: 20, partnerPairs: pairs, rng: seeded(7) });
  const count = (t: string) => types.filter((x) => x === t).length;
  assert.equal(count('potential_couple'), 4);
  assert.equal(count('attention_seeker'), 2);
  assert.equal(count('impatient_tracker'), 2);
  assert.equal(count('regular'), 12);
  // Couples come as complete pairs
  for (const [a, b] of pairs) {
    assert.equal(types[a] === 'potential_couple', types[b] === 'potential_couple');
  }
  assert.equal(count('bride') + count('groom'), 0, 'bride & groom are spawned separately');
});

test('attention seeker: craves, shouts, calms down when photographed', () => {
  const rng = seeded(3);
  let st: GuestBehaviorState = createBehavior('attention_seeker', rng);
  assert.equal(wantsToApproachPhotographer(st), null);
  let started = false;
  for (let i = 0; i < 400 && !started; i++) {
    const r = stepBehavior(st, 0.1, rng);
    st = r.state;
    started = r.events.some((e) => e.type === 'start_seeking');
  }
  assert.ok(started);
  assert.equal(wantsToApproachPhotographer(st), 'seek');
  const shot = onGuestPhotographed(st, rng);
  assert.ok(shot.events.some((e) => e.type === 'stop_seeking'));
  assert.equal(wantsToApproachPhotographer(shot.state), null);
});

test('impatient tracker: timer starts at the shot, on-time delivery satisfies', () => {
  const rng = seeded(5);
  let st = createBehavior('impatient_tracker', rng);
  st = onGuestPhotographed(st, rng).state;
  assert.equal(st.kind === 'impatient' && st.phase, 'waiting');
  st = stepBehavior(st, PATIENCE.timeoutSec * 0.5, rng).state;
  const d = onMagnetDelivered(st, rng);
  assert.ok(d.events.some((e) => e.type === 'delivered_on_time'));
  assert.equal(d.state.kind === 'impatient' && d.state.phase, 'satisfied');
});

test('impatient tracker: deadline → nagging with periodic penalties → gives up', () => {
  const rng = seeded(9);
  let st = onGuestPhotographed(createBehavior('impatient_tracker', rng), rng).state;
  const all: string[] = [];
  for (let t = 0; t < PATIENCE.timeoutSec + PATIENCE.nagMaxSec + 2; t += 0.5) {
    const r = stepBehavior(st, 0.5, rng);
    st = r.state;
    r.events.forEach((e) => all.push(e.type));
  }
  assert.equal(all.filter((e) => e === 'patience_expired').length, 1);
  assert.ok(all.filter((e) => e === 'nag_penalty').length >= Math.floor(PATIENCE.nagMaxSec / PATIENCE.nagPenaltyIntervalSec) - 1);
  assert.ok(all.includes('gave_up'));
  assert.equal(st.kind === 'impatient' && st.phase, 'idle');
});

test('impatient tracker: late delivery while nagging ends the nagging', () => {
  const rng = seeded(11);
  let st = onGuestPhotographed(createBehavior('impatient_tracker', rng), rng).state;
  st = stepBehavior(st, PATIENCE.timeoutSec + 0.1, rng).state;
  assert.equal(wantsToApproachPhotographer(st), 'nag');
  const d = onMagnetDelivered(st, rng);
  assert.ok(d.events.some((e) => e.type === 'delivered_late'));
  assert.equal(wantsToApproachPhotographer(d.state), null);
});

test('frame scoring: bride & groom multiplier, DJ combo, couple pair, staff penalty', () => {
  const both = scoreFrame([{ kind: 'bride' }, { kind: 'groom' }, { kind: 'regular' }]);
  assert.equal(both.multiplier, MULTIPLIERS.brideAndGroom);
  assert.equal(both.score, (SCORE_REWARDS.bride + SCORE_REWARDS.groom + SCORE_REWARDS.regular) * MULTIPLIERS.brideAndGroom);

  const combo = scoreFrame([{ kind: 'dj' }, { kind: 'bride' }]);
  assert.ok(combo.tags.includes('dj_combo'));
  assert.equal(combo.score, SCORE_REWARDS.bride * MULTIPLIERS.brideOrGroom + SCORE_REWARDS.djWithCoupleCombo);

  const djAlone = scoreFrame([{ kind: 'dj' }]);
  assert.equal(djAlone.score, SCORE_REWARDS.djAlone);
  assert.ok(djAlone.score < combo.score / 5);

  const pair = scoreFrame([
    { kind: 'potential_couple', coupleId: 1 },
    { kind: 'potential_couple', coupleId: 1 },
  ]);
  assert.equal(pair.score, 2 * SCORE_REWARDS.potential_couple + SCORE_REWARDS.coupleTogetherBonus);
  assert.ok(pair.reputation > 0);

  const staffOnly = scoreFrame([{ kind: 'staff' }, { kind: 'staff' }]);
  assert.equal(staffOnly.score, -2 * PENALTIES.staffOnly);
  assert.ok(staffOnly.tags.includes('staff_only'));

  const staffWithGuests = scoreFrame([{ kind: 'staff' }, { kind: 'regular' }]);
  assert.ok(staffWithGuests.score > SCORE_REWARDS.regular - 1);

  assert.equal(scoreFrame([]).score, 0);
});

test('capture extras: frame match share + revived bonus', () => {
  assert.equal(scoreCaptureExtras({ kind: 'regular', frameMatched: false, revived: false }), 0);
  assert.equal(
    scoreCaptureExtras({ kind: 'regular', frameMatched: true, revived: true }),
    Math.round(SCORE_REWARDS.regular * SCORE_REWARDS.frameMatchShare) + SCORE_REWARDS.revivedGuest
  );
});

test('magnet ledger delivers oldest photos first', () => {
  const ledger = new MagnetLedger();
  ledger.push(7, 1);
  ledger.push(null, 2);
  ledger.push(7, 3);
  ledger.push(9, 4);
  assert.equal(ledger.pendingFor(7), 2);
  const out = ledger.deliver(2);
  assert.deepEqual(out.map((e) => e.guestId), [7, null]);
  assert.equal(ledger.size, 2);
  assert.equal(ledger.pendingFor(7), 1);
  assert.equal(ledger.deliver(10).length, 2);
});

test('cast: bride & groom looks are never assignable to regular guests', async () => {
  const { CAST_LOOKS, GUEST_LOOKS_FEMALE, GUEST_LOOKS_MALE, castViewForDirection } = await import('./castSprites.ts');
  for (const id of [...GUEST_LOOKS_FEMALE, ...GUEST_LOOKS_MALE]) {
    assert.equal(CAST_LOOKS[id].forGuests, true);
    assert.notEqual(id, 'bride');
    assert.notEqual(id, 'groom');
    assert.notEqual(CAST_LOOKS[id].palette.outfit.toLowerCase(), '#f8f4ec', 'no white gown for guests');
  }
  assert.equal(CAST_LOOKS.bride.forGuests, false);
  assert.equal(CAST_LOOKS.groom.forGuests, false);
  assert.deepEqual(castViewForDirection('N'), { view: 'back', flip: false });
  assert.deepEqual(castViewForDirection('W'), { view: 'side', flip: true });
});
