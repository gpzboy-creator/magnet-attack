/**
 * Guest mood ("happy guests") — hearts per guest, the magnet promise, and stars at the end of the evening.
 * Pure logic, no drawing. Design: project log, "מנגנון: אורחים מרוצים" (18.11).
 *
 *   - Every guest starts with 3 hearts (a 4th "gold" heart is a bonus).
 *   - Photographing a guest opens a magnet for them; right after the shot the player may promise it ("זה למגנט").
 *   - Delivering the magnet pays a tip that grows with the guest's hearts:
 *       promised → on time; not promised → a surprise (+1 heart, bigger tip); past the deadline → late.
 *   - At the end of the evening: a broken promise costs 3 hearts (the guest leaves angry),
 *     an unpromised magnet that never came costs 1, and a guest who was never photographed loses 2.
 *   - Stars = share of guests who still have 2+ hearts.
 */

export const MOOD = {
  startHearts: 3,
  /** The 4th heart is a "gold" bonus heart (surprise magnet, gold arrival shot). */
  maxHearts: 4,
  /** Hearts at or above this count as a happy guest for the stars. */
  happyHearts: 2,
  /** Seconds after the shutter click in which the player can promise the magnet. */
  promiseWindowSec: 3,
  /** Captures this close together belong to the same shot (one flash burst hits guests one by one). */
  burstSec: 0.6,
  /** A magnet for a photo taken during the dancing is due this many seconds after the shot. */
  danceDeadlineSec: 75,
  /** Length of the dancing part of the evening (one continuous set). */
  danceSetSec: 240,
  tip: { onTime: 50, surprise: 75, late: 25 },
  hearts: {
    arrivalMissed: -1,
    arrivalGold: 1,
    late: -1,
    surprise: 1,
    brokenPromise: -3,
    notPromisedNotDelivered: -1,
    /** -2 so an unphotographed guest is unhappy: most guests must be photographed to earn stars. */
    neverPhotographed: -2,
  },
  /** Happy-guest share needed for 1 / 2 / 3 stars. */
  starThresholds: [0.6, 0.75, 0.9] as const,
} as const;

export interface GuestMood {
  hearts: number;
  photographed: boolean;
  /** A magnet is owed for a photo of this guest. */
  awaiting: boolean;
  promised: boolean;
  /** Game-clock time the awaited magnet is due; null = due by the end of the evening. */
  deadline: number | null;
  late: boolean;
  delivered: number;
  /** Left angry after a broken promise. */
  left: boolean;
}

export interface MoodBook {
  guests: Map<number, GuestMood>;
  /** Guests in the last shot (one flash burst), open for a promise until `promiseUntil`. */
  lastShot: number[];
  lastShotAt: number;
  promiseUntil: number;
}

export type DeliveryKind = 'on_time' | 'surprise' | 'late';

export interface DeliveryResult {
  kind: DeliveryKind;
  tip: number;
  heartDelta: number;
}

export interface EveningSummary {
  stars: number;
  happyShare: number;
  photographedShare: number;
  guests: number;
  brokenPromises: number;
}

const clampHearts = (h: number) => Math.max(0, Math.min(MOOD.maxHearts, h));

export function createMoodBook(): MoodBook {
  return { guests: new Map(), lastShot: [], lastShotAt: -999, promiseUntil: -1 };
}

export function moodOf(book: MoodBook, id: number): GuestMood {
  let m = book.guests.get(id);
  if (!m) {
    m = {
      hearts: MOOD.startHearts,
      photographed: false,
      awaiting: false,
      promised: false,
      deadline: null,
      late: false,
      delivered: 0,
      left: false,
    };
    book.guests.set(id, m);
  }
  return m;
}

/** Register every guest of the evening up front (so never-photographed guests count too). */
export function registerGuests(book: MoodBook, ids: readonly number[]): void {
  for (const id of ids) moodOf(book, id);
}

/**
 * Guests captured in one shot. Arrival photos are due by the end of the evening;
 * dancing photos get a deadline. Opens the promise window for these guests.
 */
export function onShot(book: MoodBook, ids: readonly number[], now: number, phase: 'arrival' | 'dancing'): void {
  if (ids.length === 0) return;
  for (const id of ids) {
    const m = moodOf(book, id);
    if (m.left) continue;
    m.photographed = true;
    if (m.hearts < MOOD.startHearts) m.hearts = MOOD.startHearts;
    if (!m.awaiting) {
      m.awaiting = true;
      m.promised = false;
      m.late = false;
      m.deadline = phase === 'arrival' ? null : now + MOOD.danceDeadlineSec;
    }
  }
  const sameBurst = now - book.lastShotAt <= MOOD.burstSec;
  book.lastShot = sameBurst ? [...new Set([...book.lastShot, ...ids])] : [...ids];
  book.lastShotAt = now;
  book.promiseUntil = now + MOOD.promiseWindowSec;
}

export function canPromise(book: MoodBook, now: number): boolean {
  return now <= book.promiseUntil && book.lastShot.some((id) => {
    const m = book.guests.get(id);
    return Boolean(m && m.awaiting && !m.promised && !m.left);
  });
}

/** "זה למגנט!" — promise the magnet to everyone in the last shot. Returns how many were promised. */
export function promiseLastShot(book: MoodBook, now: number): number {
  if (!canPromise(book, now)) return 0;
  let n = 0;
  for (const id of book.lastShot) {
    const m = book.guests.get(id);
    if (m && m.awaiting && !m.promised && !m.left) {
      m.promised = true;
      n++;
    }
  }
  book.promiseUntil = -1;
  return n;
}

export function onArrivalMissed(book: MoodBook, id: number): void {
  const m = moodOf(book, id);
  m.hearts = clampHearts(m.hearts + MOOD.hearts.arrivalMissed);
}

export function onArrivalGold(book: MoodBook, id: number): void {
  const m = moodOf(book, id);
  m.hearts = clampHearts(m.hearts + MOOD.hearts.arrivalGold);
}

/** Per-frame check: magnets whose deadline just passed cost a heart. Returns the guests that just became late. */
export function tickMood(book: MoodBook, now: number): number[] {
  const justLate: number[] = [];
  for (const [id, m] of book.guests) {
    if (m.awaiting && !m.late && m.deadline != null && now > m.deadline) {
      m.late = true;
      m.hearts = clampHearts(m.hearts + MOOD.hearts.late);
      justLate.push(id);
    }
  }
  return justLate;
}

/** A magnet for this guest reached the board. Null when nothing was owed (an extra copy). */
export function onMagnetDelivered(book: MoodBook, id: number): DeliveryResult | null {
  const m = book.guests.get(id);
  if (!m || !m.awaiting || m.left) return null;
  let result: DeliveryResult;
  if (m.late) {
    result = { kind: 'late', tip: MOOD.tip.late * m.hearts, heartDelta: 0 };
  } else if (m.promised) {
    result = { kind: 'on_time', tip: MOOD.tip.onTime * m.hearts, heartDelta: 0 };
  } else {
    m.hearts = clampHearts(m.hearts + MOOD.hearts.surprise);
    result = { kind: 'surprise', tip: MOOD.tip.surprise * m.hearts, heartDelta: MOOD.hearts.surprise };
  }
  m.awaiting = false;
  m.promised = false;
  m.late = false;
  m.deadline = null;
  m.delivered++;
  return result;
}

export function openMagnets(book: MoodBook): { open: number; promised: number } {
  let open = 0;
  let promised = 0;
  for (const m of book.guests.values()) {
    if (!m.awaiting || m.left) continue;
    open++;
    if (m.promised) promised++;
  }
  return { open, promised };
}

/** Guest joy for the HUD bar: average hearts, 3 hearts = 100%. */
export function joyPercent(book: MoodBook): number {
  if (book.guests.size === 0) return 100;
  let sum = 0;
  for (const m of book.guests.values()) sum += Math.min(MOOD.startHearts, m.hearts);
  return Math.round((sum / (book.guests.size * MOOD.startHearts)) * 100);
}

export function starsForShare(share: number): number {
  return MOOD.starThresholds.filter((t) => share >= t).length;
}

/** End of the evening: apply the closing penalties once, then count stars. */
export function settleEvening(book: MoodBook): EveningSummary {
  let brokenPromises = 0;
  for (const m of book.guests.values()) {
    if (m.awaiting && !m.left) {
      if (m.promised) {
        m.hearts = clampHearts(m.hearts + MOOD.hearts.brokenPromise);
        m.left = true;
        brokenPromises++;
      } else {
        m.hearts = clampHearts(m.hearts + MOOD.hearts.notPromisedNotDelivered);
      }
      m.awaiting = false;
    }
    if (!m.photographed) m.hearts = clampHearts(m.hearts + MOOD.hearts.neverPhotographed);
  }
  return summarize(book, brokenPromises);
}

export function summarize(book: MoodBook, brokenPromises = 0): EveningSummary {
  const n = book.guests.size;
  if (n === 0) return { stars: 0, happyShare: 0, photographedShare: 0, guests: 0, brokenPromises };
  let happy = 0;
  let shot = 0;
  for (const m of book.guests.values()) {
    if (m.hearts >= MOOD.happyHearts) happy++;
    if (m.photographed) shot++;
  }
  const happyShare = happy / n;
  return { stars: starsForShare(happyShare), happyShare, photographedShare: shot / n, guests: n, brokenPromises };
}

/** Station feedback after sticking a batch of magnets on the board. */
export function deliveryFeedbackHe(batch: number, tips: number, kinds: Record<DeliveryKind, number>): string {
  const parts: string[] = [];
  if (kinds.on_time) parts.push(`🤝 ${kinds.on_time} הבטחות קוימו`);
  if (kinds.surprise) parts.push(`🎁 ${kinds.surprise} הפתעות (+❤)`);
  if (kinds.late) parts.push(`⏳ ${kinds.late} באיחור`);
  const head = `🧲 ${batch} מגנטים על הלוח`;
  return tips > 0 ? `${head} · ${parts.join(' · ')} · 💰 טיפ ${tips}` : `${head} (עותקים נוספים — בלי טיפ)`;
}
