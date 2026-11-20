/**
 * A guest on the floor (dancer, table guest, arriving guest, bride & groom) — the shape of every
 * actor in the guest list. Moved out of IsoArenaCanvas.tsx (no behavior change) so game/ and
 * render/ modules can use it without importing from components/ (see importBoundaries.test.ts).
 */

import type { EnemyArchetype } from './rules';
import type { IsoDirection } from './spriteExtractor';
import type { GuestType } from './guestBalance';
import type { GuestBehaviorState } from './guestBehavior';
import type { CastLookId } from './castSprites';

export interface WeddingGuestActor {
  id: number;
  role: 'dancer' | 'table_guest';
  tableId?: number;
  seatAngle?: number;
  outfitIndex: number;
  archetype: EnemyArchetype;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  speed: number;
  dancePhase: number;
  danceTempo: number;
  danceMove: 'bounce' | 'spin' | 'wave' | 'hora' | 'eating' | 'toasting';
  direction: IsoDirection;
  strideDist: number;
  outfitColor: string;
  hairColor: string;
  isDress: boolean;
  hatType: 'none' | 'green_top' | 'black_top' | 'cone' | 'veil';

  // Wedding Joy & Magnet Mechanics
  hasMagnet: boolean;
  photoCount: number;
  celebrateTimer: number;
  hitFlashTimer: number;
  wantsPhotoTimer: number;
  speechBubbleText: string | null;
  poseTimer: number;
  isSeated: boolean;
  seekingMagnet?: boolean;

  // Social Dancefloor Clusters, Partners, Table Seats & Recruitment Mechanics
  seatX?: number;
  seatY?: number;
  seatDir?: IsoDirection;
  danceSpotX?: number;
  danceSpotY?: number;
  clusterIdx?: number;
  memberSlot?: number;
  partnerId?: number | null;
  isPartnerSecond?: boolean;
  repositionTimer?: number;
  guestActivity?: 'dancing' | 'recruiting' | 'seated' | 'bar';
  recruitTargetId?: number | null;
  recruitProgressTimer?: number;
  arrivalDelayTimer?: number;
  isEnteringFloor?: boolean;
  // Seconds left of the "caught in the camera flash" reaction (white blow-out + eye blink)
  flashTintTimer?: number;
  // Bar life: drink in hand, bar visit spot/time, smoker
  drinkTimer?: number;
  drinkKind?: number;
  barSpotIdx?: number;
  barTimer?: number;
  atBarArrived?: boolean;
  isSmoker?: boolean;
  // Seconds before this guest may switch between seated <-> dancing again (prevents flip-flopping)
  activityCooldown?: number;
  // Personality / role (guestBalance.ts) + behavior state machine (guestBehavior.ts)
  guestType?: GuestType;
  behavior?: GuestBehaviorState;
  /** Potential couples share a coupleId (lowest member id). */
  coupleId?: number | null;
  /** Sprite look from the wedding cast sheet (bride & groom fixed; guests derived from outfit). */
  castLook?: CastLookId;
  /** Arrival phase: walking in from the courtyard, posing at the photo wall, going to the seat. */
  arrival?: {
    state: 'waiting' | 'walking_in' | 'posing' | 'mingling' | 'ceremony' | 'leaving';
    delay: number;
    order: number;
    poseT: number;
    photographed: boolean;
    seatX: number;
    seatY: number;
    viaDoor: boolean;
    poseOffsetY: number;
  };
  /** Bride & groom: where the pair is heading right now. */
  vipTargetX?: number;
  vipTargetY?: number;
  vipTimer?: number;
}
