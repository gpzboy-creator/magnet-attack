/**
 * Guest archetype balance — every tweakable number for guest personalities,
 * patience / nagging behavior and photo scoring lives here.
 */

/** Guest personality / role. Bride & groom are unique per event (spawned separately). */
export type GuestType =
  | 'bride'
  | 'groom'
  | 'potential_couple'
  | 'attention_seeker'
  | 'impatient_tracker'
  | 'regular';

/** Share of the regular guest pool per type (bride/groom are added on top, exactly one each). */
export const SPAWN_WEIGHTS = {
  potential_couple: 0.2, // whole pairs only (rounded down to an even count)
  attention_seeker: 0.1,
  impatient_tracker: 0.1,
  // the rest are regular guests
} as const;

/** Impatient magnet trackers: patience starts at the shutter click. */
export const PATIENCE = {
  /** Seconds to get their magnet onto the board before they come nagging. */
  timeoutSec: 45,
  /** While nagging: seconds between dialogue lines. */
  nagLineIntervalSec: 3.6,
  /** While nagging: seconds between score / joy deductions. */
  nagPenaltyIntervalSec: 6,
  /** Nagging gives up after this long (bigger one-off penalty, guest goes to sit). */
  nagMaxSec: 45,
  /** How close a nagging guest follows the photographer (world units). */
  followDistance: 26,
} as const;

/** Attention seekers ("צלמוס") */
export const ATTENTION = {
  /** Seconds until the first craving after spawning (random in range). */
  firstCravingSec: [8, 20] as [number, number],
  /** Seconds of calm after being photographed (random in range). */
  calmAfterPhotoSec: [35, 55] as [number, number],
  /** How far in front of the photographer they plant themselves. */
  standInFrontDistance: 34,
  /** Seconds between "צלמוס צלם אותי!" shouts. */
  shoutIntervalSec: 3,
} as const;

/** Points for each subject in the frame at the shutter click. */
export const SCORE_REWARDS = {
  regular: 100,
  potential_couple: 160,
  attention_seeker: 140,
  impatient_tracker: 110,
  bride: 300,
  groom: 300,
  /** Both members of a potential couple in the same frame. */
  coupleTogetherBonus: 250,
  /** DJ alone (no bride / groom in frame). */
  djAlone: 60,
  /** DJ together with the bride and/or groom in frame. */
  djWithCoupleCombo: 600,
  /** Staff (bartender / waiter) in a frame that also has guests. */
  staffWithGuests: 10,
  /** Magnet-frame preference match on a captured guest: share of that guest's reward added. */
  frameMatchShare: 0.5,
  /** Flash got a seated guest up to the dance floor. */
  revivedGuest: 120,
  /** Impatient guest got their magnet before the deadline. */
  onTimeDelivery: 80,
} as const;

/** Frame multipliers applied to the whole frame's subject total. */
export const MULTIPLIERS = {
  brideOrGroom: 2,
  brideAndGroom: 3,
} as const;

/** Business reputation ("לידים") for capturing potential couples. */
export const REPUTATION = {
  coupleTogether: 2,
  coupleMember: 1,
  brideAndGroom: 1,
} as const;

/** Deductions (positive numbers are subtracted). */
export const PENALTIES = {
  /** Each staff member in a frame with no guests (photographing the staff instead of guests). */
  staffOnly: 40,
  /** Impatient guest's deadline passed. */
  patienceExpired: 150,
  patienceExpiredJoy: 4,
  /** Every nagPenaltyIntervalSec while nagging. */
  nagTick: 40,
  nagTickJoy: 1,
  /** Nagging guest gives up. */
  nagGaveUp: 100,
  nagGaveUpJoy: 3,
} as const;

/** Hebrew dialogue lines. */
export const DIALOGUE_HE = {
  attentionShouts: ['צלמוס צלם אותי! 📸', 'פה! פה! צלם אותי!', 'צלמוס! תצלם אותנו! 🙋', 'רגע! עוד אחת שלי!'],
  attentionSatisfied: ['😁 יששש!', '🤩 איזה פלאש!', '😎 תודה צלמוס!'],
  nagLines: ['האם הוא יצא? 🧲', 'מה קורה עם המגנט שלי?', 'נו... איפה המגנט? ⏳', 'עוד הרבה זמן? 😤'],
  impatientDelivered: ['😍 סוף סוף! המגנט שלי!', '🧲 תודה! הוא מושלם!'],
  impatientGaveUp: ['לא נורא... 😒', 'עזוב, כבר לא צריך 😑'],
  coupleHearts: ['💕', '💞', '😍'],
  brideGroomLines: ['💍 תודה שבאתם!', '🥂 לחיים!', '💃 כולם לרחבה!'],
} as const;
