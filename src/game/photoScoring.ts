/**
 * Photo scoring ("ScoreManager") + per-photo magnet ledger.
 *
 *  scoreFrame()        — score for everything inside the flash cone at the shutter click:
 *                        archetype rewards, bride/groom frame multiplier, DJ + couple combo,
 *                        potential-couple pair bonus + reputation (leads), staff penalty.
 *  scoreCaptureExtras()— per captured guest extras (magnet-frame preference, revived guest).
 *  MagnetLedger        — FIFO record of who is in each photo as it moves through
 *                        camera → laptop → sheets → hand → board, so a delivered magnet can be
 *                        matched back to the guest who's waiting for it.
 */

import { MULTIPLIERS, PENALTIES, REPUTATION, SCORE_REWARDS, type GuestType } from './guestBalance.ts';

export type FrameSubjectKind = GuestType | 'staff' | 'dj';

export interface FrameSubject {
  kind: FrameSubjectKind;
  /** Potential couples share a coupleId so complete pairs can be detected. */
  coupleId?: number | null;
}

export interface FrameScore {
  score: number;
  reputation: number;
  multiplier: number;
  tags: Array<'bride_groom' | 'bride_or_groom' | 'dj_combo' | 'dj_alone' | 'couple_pair' | 'staff_only' | 'empty'>;
  /** Short Hebrew label for the floating text / toast. */
  labelHe: string;
}

const GUEST_KINDS: ReadonlySet<FrameSubjectKind> = new Set<FrameSubjectKind>([
  'bride',
  'groom',
  'potential_couple',
  'attention_seeker',
  'impatient_tracker',
  'regular',
]);

export function scoreFrame(subjects: readonly FrameSubject[]): FrameScore {
  const guests = subjects.filter((s) => GUEST_KINDS.has(s.kind));
  const staffCount = subjects.filter((s) => s.kind === 'staff').length;
  const hasDj = subjects.some((s) => s.kind === 'dj');
  const hasBride = guests.some((g) => g.kind === 'bride');
  const hasGroom = guests.some((g) => g.kind === 'groom');
  const tags: FrameScore['tags'] = [];
  const labels: string[] = [];

  if (guests.length === 0 && staffCount === 0 && !hasDj) {
    return { score: 0, reputation: 0, multiplier: 1, tags: ['empty'], labelHe: '' };
  }

  // Subject rewards
  let base = 0;
  for (const g of guests) base += SCORE_REWARDS[g.kind as GuestType];

  // Potential couples: complete pairs in the same frame
  let reputation = 0;
  const coupleCounts = new Map<number, number>();
  for (const g of guests) {
    if (g.kind === 'potential_couple' && g.coupleId != null) {
      coupleCounts.set(g.coupleId, (coupleCounts.get(g.coupleId) ?? 0) + 1);
    }
  }
  let pairs = 0;
  let singles = 0;
  for (const n of coupleCounts.values()) {
    if (n >= 2) pairs++;
    else singles++;
  }
  base += pairs * SCORE_REWARDS.coupleTogetherBonus;
  reputation += pairs * REPUTATION.coupleTogether + singles * REPUTATION.coupleMember;
  if (pairs > 0) {
    tags.push('couple_pair');
    labels.push(`💕 זוג פוטנציאלי · +${pairs * REPUTATION.coupleTogether} לידים`);
  } else if (singles > 0) {
    labels.push(`💕 +${singles * REPUTATION.coupleMember} ליד`);
  }

  // Bride & groom multiplier on the whole frame
  let multiplier = 1;
  if (hasBride && hasGroom) {
    multiplier = MULTIPLIERS.brideAndGroom;
    reputation += REPUTATION.brideAndGroom;
    tags.push('bride_groom');
    labels.unshift(`💍 החתן והכלה ×${multiplier}`);
  } else if (hasBride || hasGroom) {
    multiplier = MULTIPLIERS.brideOrGroom;
    tags.push('bride_or_groom');
    labels.unshift(`${hasBride ? '👰 הכלה' : '🤵 החתן'} ×${multiplier}`);
  }
  let score = base * multiplier;

  // DJ
  if (hasDj) {
    if (hasBride || hasGroom) {
      score += SCORE_REWARDS.djWithCoupleCombo;
      tags.push('dj_combo');
      labels.unshift('🎧💍 קומבו די-ג׳יי + הזוג!');
    } else {
      score += SCORE_REWARDS.djAlone;
      if (guests.length === 0) {
        tags.push('dj_alone');
        labels.push('🎧 די-ג׳יי');
      }
    }
  }

  // Staff: fine as background, but photographing them instead of guests costs points
  if (staffCount > 0) {
    if (guests.length === 0) {
      score -= staffCount * PENALTIES.staffOnly;
      tags.push('staff_only');
      labels.push('🍸 צילמת את הצוות במקום האורחים');
    } else {
      score += staffCount * SCORE_REWARDS.staffWithGuests;
    }
  }

  return { score: Math.round(score), reputation, multiplier, tags, labelHe: labels.join(' · ') };
}

/** Extras for one captured guest (on top of the frame score). */
export function scoreCaptureExtras(params: {
  kind: GuestType;
  frameMatched: boolean;
  revived: boolean;
}): number {
  const reward = SCORE_REWARDS[params.kind];
  return (
    (params.frameMatched ? Math.round(reward * SCORE_REWARDS.frameMatchShare) : 0) +
    (params.revived ? SCORE_REWARDS.revivedGuest : 0)
  );
}

// ---------------------------------------------------------------------------
// Magnet ledger
// ---------------------------------------------------------------------------

export interface LedgerEntry {
  /** Guest in the photo (null for event shots without a specific guest). */
  guestId: number | null;
  /** Game time (seconds) of the shutter click. */
  shotAt: number;
}

/**
 * FIFO of photos in the production pipeline. Every stage moves whole batches in order,
 * so the oldest photos are always the first magnets to reach the board.
 */
export class MagnetLedger {
  private entries: LedgerEntry[] = [];

  get size(): number {
    return this.entries.length;
  }

  push(guestId: number | null, shotAt: number): void {
    this.entries.push({ guestId, shotAt });
  }

  /** `count` magnets were stuck on the board → returns the photos they were made from. */
  deliver(count: number): LedgerEntry[] {
    const n = Math.max(0, Math.min(this.entries.length, Math.floor(count)));
    return this.entries.splice(0, n);
  }

  clear(): void {
    this.entries = [];
  }

  /** Photos of a given guest still in the pipeline. */
  pendingFor(guestId: number): number {
    return this.entries.filter((e) => e.guestId === guestId).length;
  }
}
