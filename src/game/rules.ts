import type { IsoDirection } from './spriteExtractor.ts';

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type EnemyArchetype = 'swarmer' | 'kiter' | 'charger';

export interface Vec2 {
  x: number;
  y: number;
}

export interface WaveConfig {
  wave: number;
  stageTitleHe: string;
  stageTitleEn: string;
  spawnBudget: number;
  targetMagnets: number;
  trackDurationSec: number;
  enemySpeedMultiplier: number;
  hazardCount: number;
  archetypeWeights: Record<EnemyArchetype, number>;
}

/**
 * Clamps raw frame delta time to prevent physics tunneling on tab switches or hiccups.
 */
export function clampDt(rawDt: number): number {
  if (!Number.isFinite(rawDt) || rawDt < 0) return 0;
  return Math.min(rawDt, 0.05);
}

/**
 * Computes simulation delta time accounting for hitstop freeze frames (camera flash freeze).
 */
export function computeSimDt(
  clampedDt: number,
  hitstopRemaining: number,
  timeScale = 1.0
): { simDt: number; nextHitstop: number } {
  if (hitstopRemaining > 0) {
    const nextHitstop = Math.max(0, hitstopRemaining - clampedDt);
    return { simDt: 0, nextHitstop };
  }
  return { simDt: clampedDt * timeScale, nextHitstop: 0 };
}

/**
 * Converts 2D world coordinates (x, y) into 2:1 isometric screen coordinates.
 */
export function worldToIso(worldX: number, worldY: number, zLift = 0): Vec2 {
  return {
    x: worldX - worldY,
    y: (worldX + worldY) * 0.5 - zLift,
  };
}

export type FloorObstacle =
  | { kind: 'circle'; x: number; y: number; r: number }
  | { kind: 'box'; minX: number; minY: number; maxX: number; maxY: number };

/**
 * Pushes a moving body (circle of `radius` at `pos`) out of every solid floor object,
 * so characters slide along tables, the bar, the DJ stage etc. instead of walking through them.
 */
export function resolveFloorObstacles(
  pos: Vec2,
  radius: number,
  obstacles: readonly FloorObstacle[]
): Vec2 {
  let x = pos.x;
  let y = pos.y;
  // Two passes handle bodies squeezed between neighbouring obstacles
  for (let pass = 0; pass < 2; pass++) {
    for (const ob of obstacles) {
      if (ob.kind === 'circle') {
        const dx = x - ob.x;
        const dy = y - ob.y;
        const minDist = ob.r + radius;
        const d = Math.hypot(dx, dy);
        if (d < minDist) {
          if (d < 1e-6) {
            y = ob.y + minDist;
          } else {
            x = ob.x + (dx / d) * minDist;
            y = ob.y + (dy / d) * minDist;
          }
        }
      } else {
        const cx = Math.max(ob.minX, Math.min(x, ob.maxX));
        const cy = Math.max(ob.minY, Math.min(y, ob.maxY));
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.hypot(dx, dy);
        if (d >= radius) continue;
        if (d > 1e-6) {
          // Center outside the box but body overlaps an edge/corner
          x = cx + (dx / d) * radius;
          y = cy + (dy / d) * radius;
        } else {
          // Center inside the box: exit through the nearest side
          const exits = [
            { v: x - ob.minX, nx: ob.minX - radius, ny: y },
            { v: ob.maxX - x, nx: ob.maxX + radius, ny: y },
            { v: y - ob.minY, nx: x, ny: ob.minY - radius },
            { v: ob.maxY - y, nx: x, ny: ob.maxY + radius },
          ];
          exits.sort((a, b) => a.v - b.v);
          x = exits[0].nx;
          y = exits[0].ny;
        }
      }
    }
  }
  return { x, y };
}

/**
 * Converts 2:1 isometric screen coordinates (isoX, isoY) back to 2D world coordinates.
 */
export function isoToWorld(isoX: number, isoY: number): Vec2 {
  return {
    x: (isoX + isoY * 2) * 0.5,
    y: (isoY * 2 - isoX) * 0.5,
  };
}

/**
 * Maps a screen-space or isometric angle (in radians, where 0 = East, +PI/2 = South)
 * to one of the 8 cardinal/ordinal isometric directions ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW').
 */
export function angleToIsoDirection(angleRad: number): IsoDirection {
  const twoPi = Math.PI * 2;
  const normalized = ((angleRad % twoPi) + twoPi) % twoPi;
  const sector = Math.round(normalized / (Math.PI / 4)) % 8;
  const map: IsoDirection[] = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  return map[sector];
}

/**
 * Calculates normalized world movement vector from keyboard inputs and/or virtual touch joystick.
 * Supports smooth analog magnitude from touch joystick (0.0 to 1.0) or full keyboard 8-way movement.
 */
export function computeCombinedMovementVector(
  keysHeld: { has: (k: string) => boolean },
  virtualJoyX = 0,
  virtualJoyY = 0
): { normMoveX: number; normMoveY: number; moveMagnitude: number; screenAngle: number; isMoving: boolean } {
  let moveIsoX = virtualJoyX;
  let moveIsoY = virtualJoyY;

  if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) moveIsoY -= 1;
  if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) moveIsoY += 1;
  if (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft')) moveIsoX -= 1;
  if (keysHeld.has('KeyD') || keysHeld.has('ArrowRight')) moveIsoX += 1;

  const rawJoyMag = Math.hypot(moveIsoX, moveIsoY);
  if (rawJoyMag <= 0.001) {
    return {
      normMoveX: 0,
      normMoveY: 0,
      moveMagnitude: 0,
      screenAngle: 0,
      isMoving: false,
    };
  }

  // Convert isometric screen-relative input into world coordinates
  const worldMove = isoToWorld(moveIsoX, moveIsoY * 0.5);
  const moveLen = Math.hypot(worldMove.x, worldMove.y);

  if (moveLen <= 0.001) {
    return {
      normMoveX: 0,
      normMoveY: 0,
      moveMagnitude: 0,
      screenAngle: 0,
      isMoving: false,
    };
  }

  // Calculate screen-space angle for character orientation
  const screenAngle = Math.atan2(moveIsoY, moveIsoX);
  const moveMagnitude = Math.min(1.0, rawJoyMag);

  return {
    normMoveX: (worldMove.x / moveLen) * moveMagnitude,
    normMoveY: (worldMove.y / moveLen) * moveMagnitude,
    moveMagnitude,
    screenAngle,
    isMoving: true,
  };
}

/**
 * Calculates joy/magnet points awarded for photographing a wedding guest archetype with combo multiplier.
 */
export function calculateKillScore(
  archetype: EnemyArchetype,
  comboCount: number
): number {
  const basePoints: Record<EnemyArchetype, number> = {
    swarmer: 100, // Dancing Guest (רקדן נלהב ברחבה)
    kiter: 175,   // VIP Prop Guest (חובב אביזרים וסלפי)
    charger: 250, // Bride & Groom / Party Lead (חתן כלה / מוביל הרחבה)
  };
  const multiplier = Math.min(4, 1 + Math.floor(Math.max(0, comboCount) / 3) * 0.5);
  return Math.round(basePoints[archetype] * multiplier);
}

/**
 * Multi-knob event progression across wedding stages (Reception -> Chuppah Ceremony -> Dancefloor Party -> Afterparty).
 */
export function getWaveConfig(wave: number): WaveConfig {
  const safeWave = Math.max(1, Math.floor(wave));
  const stages = [
    {
      he: 'שלב 1: קבלת פנים ומגנטים ראשונים',
      en: 'Stage 1: Reception & Welcome Magnets',
      target: 10,
      duration: 65,
    },
    {
      he: 'שלב 2: ריקוד הסלואו והחופה',
      en: 'Stage 2: Chuppah & Slow Dance Portraits',
      target: 15,
      duration: 60,
    },
    {
      he: 'שלב 3: טירוף הרחבה והמגנטים',
      en: 'Stage 3: Peak Dancefloor & Magnet Rush',
      target: 20,
      duration: 55,
    },
    {
      he: 'שלב 4: אפטר פארטי ורקדנים ללא הפסקה',
      en: 'Stage 4: Afterparty & Non-Stop Magnets',
      target: 25,
      duration: 50,
    },
  ];
  const stageMeta = stages[(safeWave - 1) % stages.length];

  const spawnBudget = 6 + (safeWave - 1) * 3;
  const targetMagnets = stageMeta.target + (Math.floor((safeWave - 1) / stages.length) * 5);
  const trackDurationSec = stageMeta.duration;

  const enemySpeedMultiplier = Number(
    Math.min(1.65, 1 + (safeWave - 1) * 0.08).toFixed(2)
  );
  const hazardCount = Math.min(8, Math.floor((safeWave - 1) * 1.5));

  const swarmerWeight = Math.max(0.35, 0.72 - (safeWave - 1) * 0.08);
  const kiterWeight = Math.min(0.38, 0.18 + (safeWave - 1) * 0.05);
  const chargerWeight = Number(
    Math.max(0.1, 1 - swarmerWeight - kiterWeight).toFixed(2)
  );

  return {
    wave: safeWave,
    stageTitleHe: stageMeta.he,
    stageTitleEn: stageMeta.en,
    spawnBudget,
    targetMagnets,
    trackDurationSec,
    enemySpeedMultiplier,
    hazardCount,
    archetypeWeights: {
      swarmer: Number(swarmerWeight.toFixed(2)),
      kiter: Number(kiterWeight.toFixed(2)),
      charger: chargerWeight,
    },
  };
}

export interface MagnetWorkflowState {
  photosInCamera: number;       // 1. Raw photos snapped on dancefloor/tables
  photosOnComputer?: number;    // 1b. Copied from the camera card to the laptop, ready to print
  uncutSheetsAtStation: number; // 2. Developed & laminated onto adhesive magnet sheets at Corner Workstation
  cutMagnetsInHand: number;     // 3. Sliced with the Guillotine Cutter, held by photographer
  magnetsOnBoard: number;       // 4. Stuck onto the Tripod Magnetic Whiteboard next to dancefloor
}

/**
 * Returns the current active objective target ('dancefloor' | 'workstation' | 'board')
 * so the HUD and floor guide arrows can direct the player between the dancefloor,
 * the far-corner workstation, and the tripod magnet board.
 */
export function getActiveWorkflowObjective(
  state: MagnetWorkflowState
):
  | 'dancefloor'
  | 'workstation_transfer'
  | 'workstation_develop'
  | 'workstation_cut'
  | 'board_stick' {
  if (state.cutMagnetsInHand > 0) {
    return 'board_stick';
  }
  if (state.uncutSheetsAtStation > 0) {
    return 'workstation_cut';
  }
  if ((state.photosOnComputer ?? 0) > 0) {
    return 'workstation_develop';
  }
  if (state.photosInCamera > 0) {
    return 'workstation_transfer';
  }
  return 'dancefloor';
}

export interface WorkstationChairState {
  isSeated: boolean;
  wasNearStation: boolean;
  sitGraceTimer: number;
  standUpCooldown: number;
}

/**
 * Pure state machine for the photographer's chair at the Corner Magnet Workstation:
 * - As soon as the photographer approaches the workstation (`!wasNearStation && isNearStation`),
 *   he automatically sits down on the chair (`isSeated = true`, positioned at `chairPos`).
 * - While seated, as soon as the photographer moves (`isMoving || isDashing` after the brief arrival snap),
 *   he immediately stands up from the chair (`isSeated = false`) and moves freely.
 * - If he stops moving while still right at the workstation (and after `standUpCooldown` expires),
 *   he sits back down on the chair (`isSeated = true`).
 */
export function updateWorkstationChairState(
  prev: WorkstationChairState,
  params: {
    playerPos: Vec2;
    chairPos: Vec2;
    stationPos: Vec2;
    stationRadius: number;
    isMoving: boolean;
    isDashing: boolean;
    dt: number;
  }
): {
  nextChairState: WorkstationChairState;
  nextPlayerPos: Vec2;
  justSatDown: boolean;
  justStoodUp: boolean;
} {
  const { playerPos, chairPos, stationPos, stationRadius, isMoving, isDashing, dt } = params;
  const distToStation = Math.hypot(playerPos.x - stationPos.x, playerPos.y - stationPos.y);
  const distToChair = Math.hypot(playerPos.x - chairPos.x, playerPos.y - chairPos.y);
  const isNearStation = distToStation < stationRadius || distToChair < stationRadius * 0.75;

  let isSeated = prev.isSeated;
  let sitGraceTimer = Math.max(0, prev.sitGraceTimer - dt);
  let standUpCooldown = Math.max(0, prev.standUpCooldown - dt);
  let justSatDown = false;
  let justStoodUp = false;
  let nextPlayerPos = { x: playerPos.x, y: playerPos.y };

  if (!isNearStation) {
    if (isSeated) {
      justStoodUp = true;
      standUpCooldown = 0.45;
    }
    return {
      nextChairState: {
        isSeated: false,
        wasNearStation: false,
        sitGraceTimer: 0,
        standUpCooldown,
      },
      nextPlayerPos,
      justSatDown: false,
      justStoodUp,
    };
  }

  // Just arrived at the workstation -> automatically sit on the chair (unless standUpCooldown is active)!
  if (!prev.wasNearStation && isNearStation && standUpCooldown <= 0) {
    isSeated = true;
    sitGraceTimer = 0.22;
    standUpCooldown = 0;
    justSatDown = true;
    nextPlayerPos = { x: chairPos.x, y: chairPos.y };
  } else if (isSeated) {
    if (sitGraceTimer > 0) {
      // Brief arrival snap so player visibly sits on the chair upon approaching
      nextPlayerPos = { x: chairPos.x, y: chairPos.y };
    } else if (isMoving || isDashing) {
      // As soon as the photographer moves -> he stands up from the chair!
      isSeated = false;
      justStoodUp = true;
      standUpCooldown = 0.45;
    } else {
      // Remains seated on the chair
      nextPlayerPos = { x: chairPos.x, y: chairPos.y };
    }
  } else {
    // Currently standing inside workstation radius:
    // If the photographer stops moving near the chair/station after standing up cooldown, sit down on the chair
    if (!isMoving && !isDashing && standUpCooldown <= 0 && distToChair < 58) {
      isSeated = true;
      justSatDown = true;
      nextPlayerPos = { x: chairPos.x, y: chairPos.y };
    }
  }

  return {
    nextChairState: {
      isSeated,
      wasNearStation: isNearStation,
      sitGraceTimer,
      standUpCooldown,
    },
    nextPlayerPos,
    justSatDown,
    justStoodUp,
  };
}

export const PHOTOS_PER_SHEET = 4;
export const SECONDS_PER_SHEET = 0.5;

export interface WorkstationJobTiming {
  photoCount: number;
  sheetCount: number;
  totalDurationSec: number;
  durationMs: number;
  secondsPerSheet: number;
  photosPerSheet: number;
}

/**
 * Computes the number of sheets and total duration for printing or cutting magnets:
 * Every 4 photos = 1 sheet, and each sheet takes 0.5 seconds (500ms) at base speed (speedMultiplier = 1).
 */
export function calculateWorkstationJobTiming(
  photoCount: number,
  speedMultiplier = 1
): WorkstationJobTiming {
  const safePhotos = Math.max(0, Math.floor(photoCount));
  const safeSpeed = Math.max(0.25, speedMultiplier);
  const effectiveSecPerSheet = Number((SECONDS_PER_SHEET / safeSpeed).toFixed(3));
  if (safePhotos <= 0) {
    return {
      photoCount: 0,
      sheetCount: 0,
      totalDurationSec: 0,
      durationMs: 0,
      secondsPerSheet: effectiveSecPerSheet,
      photosPerSheet: PHOTOS_PER_SHEET,
    };
  }
  const sheetCount = Math.ceil(safePhotos / PHOTOS_PER_SHEET);
  const totalDurationSec = Number((sheetCount * effectiveSecPerSheet).toFixed(2));
  const durationMs = Math.round(totalDurationSec * 1000);
  return {
    photoCount: safePhotos,
    sheetCount,
    totalDurationSec,
    durationMs,
    secondsPerSheet: effectiveSecPerSheet,
    photosPerSheet: PHOTOS_PER_SHEET,
  };
}

/**
 * Given remaining job time, total duration, and total sheets, computes the active sheet index
 * and within-sheet animation progress (0..1 per sheet).
 */
export function getWorkstationSheetProgress(
  remainingSec: number,
  totalDurationSec: number,
  totalSheets: number
): {
  elapsedSec: number;
  overallProgress: number;
  currentSheet: number;
  completedSheets: number;
  sheetProgress: number;
} {
  if (totalDurationSec <= 0 || totalSheets <= 0) {
    return {
      elapsedSec: 0,
      overallProgress: 0,
      currentSheet: 0,
      completedSheets: 0,
      sheetProgress: 0,
    };
  }
  const secPerSheet = totalDurationSec / totalSheets;
  const clampedRem = Math.max(0, Math.min(totalDurationSec, remainingSec));
  const elapsedSec = totalDurationSec - clampedRem;
  const overallProgress = Math.max(0, Math.min(1, elapsedSec / totalDurationSec));
  const rawSheetFloat = elapsedSec / secPerSheet;
  const completedSheets = Math.min(totalSheets, Math.floor(rawSheetFloat + 1e-6));
  const currentSheet = Math.min(totalSheets, completedSheets + 1);
  const sheetProgress =
    clampedRem <= 0 ? 1 : Math.max(0, Math.min(1, rawSheetFloat - Math.floor(rawSheetFloat)));

  return {
    elapsedSec,
    overallProgress,
    currentSheet,
    completedSheets,
    sheetProgress,
  };
}

// ============================================================================
// 1. VIP MOMENTS (בקשות מיוחדות ורגעי שיא באירוע עם טיימר ובונוס ענק)
// ============================================================================
export type VipEventKind = 'table_toast' | 'chuppah_kiss' | 'hora_frenzy';

export interface VipEventState {
  id: number;
  kind: VipEventKind;
  titleHe: string;
  targetPos: Vec2;
  targetTableId?: number;
  remainingSec: number;
  totalSec: number;
  photosCaptured: number;
  requiredPhotos: number;
  bonusScore: number;
  bonusJoy: number;
  preferredFrame: MagnetFrameId;
}

export function createVipEvent(seqIndex: number): VipEventState {
  const kinds: VipEventKind[] = ['table_toast', 'hora_frenzy', 'chuppah_kiss'];
  const kind = kinds[Math.abs(seqIndex) % kinds.length];

  if (kind === 'table_toast') {
    const tables = [
      { id: 1, wx: -215, wy: -105, name: 'שולחן 1 (משפחת החתן)', frame: 'gold' as MagnetFrameId },
      { id: 2, wx: -235, wy: 75, name: 'שולחן 2 (חברים מהאוניברסיטה)', frame: 'neon' as MagnetFrameId },
      { id: 3, wx: -175, wy: 220, name: 'שולחן 3 (משפחת הכלה)', frame: 'rose' as MagnetFrameId },
      { id: 4, wx: 125, wy: 195, name: 'שולחן 4 (החבר\'ה מהעבודה)', frame: 'vip' as MagnetFrameId },
    ];
    const tbl = tables[Math.abs(seqIndex) % tables.length];
    return {
      id: seqIndex + 1,
      kind: 'table_toast',
      titleHe: `🥂 לחיים ב${tbl.name}! צלם 2 תמונות בשולחן!`,
      targetPos: { x: tbl.wx, y: tbl.wy },
      targetTableId: tbl.id,
      remainingSec: 16,
      totalSec: 16,
      photosCaptured: 0,
      requiredPhotos: 2,
      bonusScore: 650,
      bonusJoy: 20,
      preferredFrame: tbl.frame,
    };
  }

  if (kind === 'chuppah_kiss') {
    return {
      id: seqIndex + 1,
      kind: 'chuppah_kiss',
      titleHe: '💍 רגע שיא בחופה! צלם 2 תמונות של החתן והכלה!',
      targetPos: { x: 115, y: -185 },
      remainingSec: 15,
      totalSec: 15,
      photosCaptured: 0,
      requiredPhotos: 2,
      bonusScore: 800,
      bonusJoy: 25,
      preferredFrame: 'gold',
    };
  }

  return {
    id: seqIndex + 1,
    kind: 'hora_frenzy',
    titleHe: '💃 מעגל הורה סוער! צלם 3 רקדנים במרכז הרחבה!',
    targetPos: { x: 0, y: 0 },
    remainingSec: 15,
    totalSec: 15,
    photosCaptured: 0,
    requiredPhotos: 3,
    bonusScore: 700,
    bonusJoy: 22,
    preferredFrame: 'neon',
  };
}

export function doesShotCountForVipEvent(
  event: VipEventState | null,
  shotTarget: { x: number; y: number; role: 'dancer' | 'table_guest'; tableId?: number }
): boolean {
  if (!event || event.remainingSec <= 0) return false;
  if (event.kind === 'table_toast') {
    return shotTarget.role === 'table_guest' && shotTarget.tableId === event.targetTableId;
  }
  if (event.kind === 'chuppah_kiss') {
    const d = Math.hypot(shotTarget.x - event.targetPos.x, shotTarget.y - event.targetPos.y);
    return d <= 135;
  }
  if (event.kind === 'hora_frenzy') {
    return shotTarget.role === 'dancer' && Math.hypot(shotTarget.x, shotTarget.y) <= 145;
  }
  return false;
}

// ============================================================================
// 2. CAMERA SD CARD CAPACITY, BATCH MULTIPLIER & ROAMING WAITERS
// ============================================================================
export const BASE_CAMERA_CAPACITY = 12;

export function getMaxCameraCapacity(sdCardUpgradeLevel: number): number {
  return BASE_CAMERA_CAPACITY + Math.max(0, Math.floor(sdCardUpgradeLevel)) * 6;
}

export function calculateBatchPrintBonus(
  photoCount: number,
  maxCapacity: number
): { multiplier: number; bonusLabelHe: string | null } {
  if (photoCount <= 0) return { multiplier: 1, bonusLabelHe: null };
  if (photoCount >= maxCapacity) {
    return {
      multiplier: 2.0,
      bonusLabelHe: '🔥 כרטיס מלא! בונוס הדפסה כפול x2.0!',
    };
  }
  if (photoCount >= Math.max(6, Math.floor(maxCapacity * 0.65))) {
    return {
      multiplier: 1.5,
      bonusLabelHe: '⚡ הדפסת אצווה גדולה! בונוס x1.5!',
    };
  }
  return { multiplier: 1.0, bonusLabelHe: null };
}

export interface WaiterActorState {
  id: number;
  x: number;
  y: number;
  waypointIdx: number;
  waypoints: Vec2[];
  speed: number;
  trayItem: 'champagne' | 'steak';
  bumpCooldown: number;
}

export function stepWaiterPatrol(
  waiter: WaiterActorState,
  dt: number
): { nextWaiter: WaiterActorState; velocity: Vec2 } {
  const safeDt = Math.max(0, dt);
  const bumpCooldown = Math.max(0, waiter.bumpCooldown - safeDt);
  if (waiter.waypoints.length === 0) {
    return {
      nextWaiter: { ...waiter, bumpCooldown },
      velocity: { x: 0, y: 0 },
    };
  }

  const target = waiter.waypoints[waiter.waypointIdx % waiter.waypoints.length];
  const dx = target.x - waiter.x;
  const dy = target.y - waiter.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 10) {
    const nextIdx = (waiter.waypointIdx + 1) % waiter.waypoints.length;
    return {
      nextWaiter: {
        ...waiter,
        waypointIdx: nextIdx,
        bumpCooldown,
      },
      velocity: { x: 0, y: 0 },
    };
  }

  const vx = (dx / dist) * waiter.speed;
  const vy = (dy / dist) * waiter.speed;
  return {
    nextWaiter: {
      ...waiter,
      x: waiter.x + vx * safeDt,
      y: waiter.y + vy * safeDt,
      bumpCooldown,
    },
    velocity: { x: vx, y: vy },
  };
}

// ============================================================================
// 3. EQUIPMENT UPGRADES (שדרוגי ציוד לעמדה ולצלם)
// ============================================================================
export type UpgradeId = 'turbo_station' | 'pro_sdcard' | 'sneakers';

export interface PhotographerUpgradeLevels {
  turbo_station: number; // Reduces print & cut time per 4 photos
  pro_sdcard: number;    // Increases camera memory capacity + flash range
  sneakers: number;      // Increases movement speed + dash recharge
}

export const MAX_UPGRADE_LEVEL = 3;

export function getUpgradeCost(id: UpgradeId, currentLevel: number): number {
  const baseCosts: Record<UpgradeId, number> = {
    turbo_station: 500,
    pro_sdcard: 450,
    sneakers: 400,
  };
  return baseCosts[id] + Math.max(0, currentLevel) * 350;
}

export function getWorkstationSpeedMultiplier(turboLevel: number): number {
  // Level 0: 1.0x (0.5s/sheet), Level 1: 1.35x, Level 2: 1.7x, Level 3: 2.0x (0.25s/sheet)
  return Number((1 + Math.max(0, Math.min(MAX_UPGRADE_LEVEL, turboLevel)) * 0.35).toFixed(2));
}

// ============================================================================
// 4. MAGNET FRAMES & TABLE PREFERENCES (מסגרות מגנט והעדפות שולחנות/אורחים)
// ============================================================================
export type MagnetFrameId = 'gold' | 'rose' | 'neon' | 'vip';

export interface MagnetFrameConfig {
  id: MagnetFrameId;
  nameHe: string;
  shortHe: string;
  borderColor: string;
  accentColor: string;
  icon: string;
  preferredByHe: string;
}

export const MAGNET_FRAMES: Record<MagnetFrameId, MagnetFrameConfig> = {
  gold: {
    id: 'gold',
    nameHe: 'מסגרת זהב מלכותי',
    shortHe: 'זהב מלכותי',
    borderColor: '#f59e0b',
    accentColor: '#fef3c7',
    icon: '👑',
    preferredByHe: 'שולחן 1 (משפחת החתן) והחופה',
  },
  rose: {
    id: 'rose',
    nameHe: 'מסגרת רומנטית ורודה',
    shortHe: 'רומנטי ורוד',
    borderColor: '#f43f5e',
    accentColor: '#ffe4e6',
    icon: '💖',
    preferredByHe: 'שולחן 3 (משפחת הכלה)',
  },
  neon: {
    id: 'neon',
    nameHe: 'מסגרת מסיבה ניאון',
    shortHe: 'מסיבה ניאון',
    borderColor: '#06b6d4',
    accentColor: '#cffafe',
    icon: '🎉',
    preferredByHe: 'שולחן 2 (חברים) ורחבת הריקודים',
  },
  vip: {
    id: 'vip',
    nameHe: 'מסגרת יוקרה ירוק-זהב',
    shortHe: 'VIP עבודה',
    borderColor: '#10b981',
    accentColor: '#d1fae5',
    icon: '🥂',
    preferredByHe: 'שולחן 4 (החבר\'ה מהעבודה)',
  },
};

export const MAGNET_FRAME_ORDER: MagnetFrameId[] = ['gold', 'rose', 'neon', 'vip'];

export function cycleMagnetFrame(current: MagnetFrameId): MagnetFrameId {
  const idx = MAGNET_FRAME_ORDER.indexOf(current);
  return MAGNET_FRAME_ORDER[(idx + 1) % MAGNET_FRAME_ORDER.length];
}

export function getPreferredFrameForGuest(params: {
  role: 'dancer' | 'table_guest';
  tableId?: number;
  archetype?: EnemyArchetype;
}): MagnetFrameId {
  if (params.role === 'table_guest') {
    if (params.tableId === 1) return 'gold';
    if (params.tableId === 2) return 'neon';
    if (params.tableId === 3) return 'rose';
    if (params.tableId === 4) return 'vip';
  }
  if (params.archetype === 'charger') {
    return 'gold';
  }
  return 'neon';
}

export function evaluateFramePreferenceMatch(
  selectedFrame: MagnetFrameId,
  guestParams: { role: 'dancer' | 'table_guest'; tableId?: number; archetype?: EnemyArchetype }
): { matched: boolean; preferredFrame: MagnetFrameId; scoreMultiplier: number } {
  const preferredFrame = getPreferredFrameForGuest(guestParams);
  const matched = selectedFrame === preferredFrame;
  return {
    matched,
    preferredFrame,
    scoreMultiplier: matched ? 1.5 : 1.0,
  };
}

// ============================================================================
// 5. DANCEFLOOR VS. SEATED RATIO, SOCIAL CLUSTERS & TABLE RECRUITMENT RULES
// ============================================================================
export interface TargetGuestBreakdown {
  targetDancers: number;
  targetRecruiters: number;
  targetSeated: number;
  targetDancerPct: number;
  targetRecruiterPct: number;
  targetSeatedPct: number;
}

/**
 * Computes the target guest distribution based on Party Joy (0..100).
 * - At high Party Joy (>= 75): 80% dancing on the floor, 10% seated at tables,
 *   and 10% approaching tables to pull seated guests onto the dance floor.
 * - As Party Joy drops ("אם המסיבה מבאסת"), the ratio shifts against the dancers
 *   toward the reversed ratio (up to 80% seated, 10% dancing).
 */
export function calculateTargetGuestBreakdown(
  totalGuests: number,
  partyJoy: number
): TargetGuestBreakdown {
  const safeTotal = Math.max(1, Math.round(totalGuests));
  const clampedJoy = Math.max(0, Math.min(100, partyJoy));

  // Normalize joy between 20 (dead party) and 75 (lively party)
  const vibeFactor = Math.max(0, Math.min(1, (clampedJoy - 20) / 55));

  // Seated fraction: 10% when vibeFactor=1 (joy>=75), rising to 80% when vibeFactor=0 (joy<=20)
  const seatedFraction = 0.80 - vibeFactor * 0.70;
  // Dancer fraction: 80% when vibeFactor=1 (joy>=75), dropping to 10% when vibeFactor=0 (joy<=20)
  const dancerFraction = 0.10 + vibeFactor * 0.70;

  const targetSeated = Math.max(1, Math.min(safeTotal - 1, Math.round(safeTotal * seatedFraction)));
  const targetDancers = Math.max(1, Math.min(safeTotal - targetSeated, Math.round(safeTotal * dancerFraction)));
  const targetRecruiters = Math.max(0, safeTotal - targetSeated - targetDancers);

  return {
    targetDancers,
    targetRecruiters,
    targetSeated,
    targetDancerPct: Math.round((targetDancers / safeTotal) * 100),
    targetRecruiterPct: Math.round((targetRecruiters / safeTotal) * 100),
    targetSeatedPct: Math.round((targetSeated / safeTotal) * 100),
  };
}

/** Max change (joy points / sec) of the smoothed crowd vibe that drives seated/dancing targets. */
export const CROWD_JOY_RATE_PER_SEC = 3.5;
/** Minimum gap between two crowd moves (someone sits down / someone gets up). */
export const CROWD_MOVE_INTERVAL_SEC = 0.9;
/** After a guest switches seated <-> dancing, they stay put at least this long. */
export const GUEST_ACTIVITY_COOLDOWN_SEC = 9;

/**
 * Moves the smoothed crowd vibe toward the real partyJoy at a capped rate, so a sudden
 * joy jump (e.g. +48 when magnets are stuck on the board) changes the crowd gradually.
 */
export function stepCrowdJoy(currentCrowdJoy: number, partyJoy: number, dt: number): number {
  const maxStep = CROWD_JOY_RATE_PER_SEC * Math.max(0, dt);
  const diff = partyJoy - currentCrowdJoy;
  if (Math.abs(diff) <= maxStep) return partyJoy;
  return currentCrowdJoy + Math.sign(diff) * maxStep;
}

export interface DancefloorCrowdStats {
  dancerCount: number;
  recruitingCount: number;
  seatedCount: number;
  totalGuests: number;
  dancerPct: number;
  recruitingPct: number;
  seatedPct: number;
  isRatioReversed: boolean;
  isWarningZone: boolean;
  statusHe: string;
}

/**
 * Evaluates current live guest counts on the dance floor vs. seated at tables.
 * Goal: Maintain ~80% dancing / ~10% seated (and ~10% recruiting at tables)
 * and prevent a reversed ratio (where seated guests outnumber dancers).
 */
export function evaluateDancefloorCrowdState(
  dancerCount: number,
  recruitingCount: number,
  seatedCount: number,
  partyJoy = 85
): DancefloorCrowdStats {
  const safeDancers = Math.max(0, dancerCount);
  const safeRecruiters = Math.max(0, recruitingCount);
  const safeSeated = Math.max(0, seatedCount);
  const totalGuests = Math.max(1, safeDancers + safeRecruiters + safeSeated);

  const dancerPct = Math.round((safeDancers / totalGuests) * 100);
  const recruitingPct = Math.round((safeRecruiters / totalGuests) * 100);
  const seatedPct = Math.max(0, 100 - dancerPct - recruitingPct);

  // Reversed ratio occurs when seated guests exceed active dancers on the floor
  const isRatioReversed = safeSeated > safeDancers;
  const isWarningZone = !isRatioReversed && (seatedPct >= 30 || partyJoy < 55);

  let statusHe = '🔥 רחבה אש! 80% רוקדים · 10% יושבים';
  if (isRatioReversed) {
    statusHe = '🚨 יחס הפוך! יותר יושבים מרוקדים – צלם בשולחנות וחלק מגנטים!';
  } else if (isWarningZone) {
    statusHe = '⚠️ האורחים מתיישבים! צלם ברחבה ובשולחנות כדי להרים את המסיבה!';
  } else {
    statusHe = `💃 ${dancerPct}% רוקדים · 🤝 ${recruitingPct}% מקימים משולחנות · 🪑 ${seatedPct}% יושבים`;
  }

  return {
    dancerCount: safeDancers,
    recruitingCount: safeRecruiters,
    seatedCount: safeSeated,
    totalGuests,
    dancerPct,
    recruitingPct,
    seatedPct,
    isRatioReversed,
    isWarningZone,
    statusHe,
  };
}

/**
 * Selects a new in-place dance spot around a social group cluster on the dance floor.
 * Dancers stay near other people (in clusters of 3-5) and optionally keep their dance partner
 * right beside them when changing spots.
 */
export function pickNextSocialDanceSpot(params: {
  clusterCenters: Vec2[];
  currentClusterIdx: number;
  memberSlot: number;
  hasPartner: boolean;
  isPartnerSecond: boolean;
  switchCluster: boolean;
}): { spotX: number; spotY: number; nextClusterIdx: number } {
  const centers =
    params.clusterCenters.length > 0
      ? params.clusterCenters
      : [
          { x: -38, y: -28 },
          { x: 36, y: -24 },
          { x: -32, y: 36 },
          { x: 34, y: 34 },
        ];

  const nextClusterIdx = params.switchCluster
    ? (params.currentClusterIdx + 1) % centers.length
    : params.currentClusterIdx % centers.length;
  const center = centers[nextClusterIdx];

  if (params.hasPartner) {
    // Partners stand close facing each other inside the social group
    const baseAngle = ((params.memberSlot % 4) / 4) * Math.PI * 2 + nextClusterIdx * 0.6;
    const pairCenterX = center.x + Math.cos(baseAngle) * 20;
    const pairCenterY = center.y + Math.sin(baseAngle) * 20;
    const partnerOffset = params.isPartnerSecond ? 11 : -11;
    return {
      spotX: Number((pairCenterX + partnerOffset).toFixed(2)),
      spotY: Number((pairCenterY + (params.isPartnerSecond ? 5 : -5)).toFixed(2)),
      nextClusterIdx,
    };
  }

  // Solo dancer stands in a tight social circle with other dancers around them
  const ringAngle = ((params.memberSlot % 5) / 5) * Math.PI * 2 + nextClusterIdx * 0.85;
  const ringRadius = 24 + (params.memberSlot % 2) * 10;
  return {
    spotX: Number((center.x + Math.cos(ringAngle) * ringRadius).toFixed(2)),
    spotY: Number((center.y + Math.sin(ringAngle) * ringRadius).toFixed(2)),
    nextClusterIdx,
  };
}

// ============================================================================
// 6. GUEST JOY DRIVERS: PHOTOGRAPHING THE RIGHT EVENT + ON-TIME MAGNET DELIVERY
//    ("השמחה של האורחים תלויה בצילום האירוע הנכון + הוצאת מגנט בזמן")
// ============================================================================
export const MAGNET_DELIVERY_SLA_SEC = 22;

export interface MagnetDeliveryTrackerState {
  pendingCount: number;        // Total photos/sheets/magnets currently waiting to reach the board
  remainingSec: number;        // Seconds left to deliver the batch to the magnet board on time
  maxSec: number;              // Total SLA window in seconds (22s)
  isLate: boolean;             // True if pendingCount > 0 and remainingSec reached 0
  urgencyLevel: 'idle' | 'on_time' | 'hurry' | 'late';
  statusHe: string;
}

export function createInitialMagnetDeliveryTracker(): MagnetDeliveryTrackerState {
  return {
    pendingCount: 0,
    remainingSec: MAGNET_DELIVERY_SLA_SEC,
    maxSec: MAGNET_DELIVERY_SLA_SEC,
    isLate: false,
    urgencyLevel: 'idle',
    statusHe: '🧲 מוכן לצילום והפקת מגנטים בזמן',
  };
}

/**
 * Advances the Magnet Delivery SLA Timer whenever there are unfulfilled photos in camera,
 * uncut sheets at the workstation, or cut magnets in hand waiting to be placed on the board.
 */
export function stepMagnetDeliveryTracker(
  state: MagnetDeliveryTrackerState,
  currentPendingCount: number,
  dt: number
): { nextState: MagnetDeliveryTrackerState; justBecameLate: boolean } {
  const safePending = Math.max(0, Math.floor(currentPendingCount));
  const safeDt = Math.max(0, dt);

  if (safePending <= 0) {
    return {
      nextState: createInitialMagnetDeliveryTracker(),
      justBecameLate: false,
    };
  }

  // If a new batch of photos just started (was 0, now > 0), start a fresh SLA countdown!
  const startingFresh = state.pendingCount <= 0;
  const prevRem = startingFresh ? state.maxSec : state.remainingSec;
  const nextRem = Math.max(0, Number((prevRem - safeDt).toFixed(3)));
  const isLate = nextRem <= 0;
  const justBecameLate = !startingFresh && !state.isLate && isLate;

  let urgencyLevel: MagnetDeliveryTrackerState['urgencyLevel'] = 'on_time';
  let statusHe = `⏱️ הוצא מגנט בזמן: ${Math.ceil(nextRem)} שנ' (${safePending} בתהליך)`;

  if (isLate) {
    urgencyLevel = 'late';
    statusHe = `🚨 איחור בהוצאת ${safePending} מגנטים! האורחים מתבאסים!`;
  } else if (nextRem <= 8) {
    urgencyLevel = 'hurry';
    statusHe = `⚠️ מהר ללוח! נותרו ${Math.ceil(nextRem)} שנ' להוצאת ${safePending} מגנטים!`;
  }

  return {
    nextState: {
      pendingCount: safePending,
      remainingSec: nextRem,
      maxSec: state.maxSec || MAGNET_DELIVERY_SLA_SEC,
      isLate,
      urgencyLevel,
      statusHe,
    },
    justBecameLate,
  };
}

/**
 * Computes how much Guest Joy changes when photographing a guest:
 * - Photographing the RIGHT active event ("צילום האירוע הנכון") boosts Guest Joy significantly (+12 to +18).
 * - Photographing a random guest while a specific VIP event is waiting elsewhere gives almost no joy (+1),
 *   reminding the photographer to capture the active event!
 */
export function evaluateGuestJoyFromShot(params: {
  activeVipEvent: VipEventState | null;
  isRightEventShot: boolean;
  isFrameMatched: boolean;
  revivedSeatedGuest: boolean;
}): { joyDelta: number; isRightEvent: boolean; feedbackHe: string } {
  const frameBonus = params.isFrameMatched ? 3 : 0;
  const reviveBonus = params.revivedSeatedGuest ? 3 : 0;

  if (params.activeVipEvent) {
    if (params.isRightEventShot) {
      const joyDelta = 12 + frameBonus + reviveBonus;
      return {
        joyDelta,
        isRightEvent: true,
        feedbackHe: `🎯 צילמת את האירוע הנכון! +${joyDelta}% שמחת אורחים! עכשיו הוצא מגנט בזמן! ⏱️`,
      };
    }
    // Wrong target while an active event is happening!
    const minimalJoy = params.revivedSeatedGuest ? 3 : 1;
    return {
      joyDelta: minimalJoy,
      isRightEvent: false,
      feedbackHe: `⚠️ האורחים מחכים שתצלם את האירוע הפעיל: ${params.activeVipEvent.titleHe}`,
    };
  }

  // No active VIP event at this moment: standard joyful shot
  const joyDelta = 6 + frameBonus + reviveBonus;
  return {
    joyDelta,
    isRightEvent: true,
    feedbackHe: `📸 תמונה יפה (+${joyDelta}% שמחה)! פתח והוצא מגנט ללוח בזמן!`,
  };
}

/**
 * Computes the Guest Joy boost and score bonus when sticking cut magnets onto the Tripod Board:
 * - Delivering ON TIME ("הוצאת מגנט בזמן") gives a massive Joy boost (+14..+18 per magnet) + speed bonus!
 * - Delivering LATE (after the SLA timer expired) gives only a minimal recovery (+4 per magnet).
 */
export function evaluateGuestJoyFromMagnetDelivery(params: {
  batchCount: number;
  deliveryTracker: MagnetDeliveryTrackerState;
}): {
  joyDelta: number;
  scoreBonus: number;
  tier: 'express' | 'on_time' | 'late';
  feedbackHe: string;
} {
  const safeBatch = Math.max(1, Math.floor(params.batchCount));
  const tracker = params.deliveryTracker;

  if (!tracker.isLate && tracker.remainingSec >= tracker.maxSec * 0.45) {
    const joyDelta = Math.min(48, safeBatch * 16 + 8);
    const scoreBonus = safeBatch * 100;
    return {
      joyDelta,
      scoreBonus,
      tier: 'express',
      feedbackHe: `⚡ הוצאת ${safeBatch} מגנטים בזמן שיא (${Math.ceil(tracker.remainingSec)} שנ' רזרבה)! +${joyDelta}% שמחת אורחים! 😍🧲`,
    };
  }

  if (!tracker.isLate && tracker.remainingSec > 0) {
    const joyDelta = Math.min(38, safeBatch * 12 + 5);
    const scoreBonus = safeBatch * 60;
    return {
      joyDelta,
      scoreBonus,
      tier: 'on_time',
      feedbackHe: `✅ הוצאת ${safeBatch} מגנטים בזמן! השמחה ברחבה מזנקת (+${joyDelta}%)! 🎉🧲`,
    };
  }

  const joyDelta = Math.min(16, safeBatch * 4);
  return {
    joyDelta,
    scoreBonus: 0,
    tier: 'late',
    feedbackHe: `⏳ המגנטים יצאו באיחור... (+${joyDelta}% שמחה בלבד). בפעם הבאה הוצא מגנט לפני שהטיימר נגמר!`,
  };
}

/**
 * Updates Guest Joy (partyJoy) each simulation tick based on:
 * 1. Gentle baseline decay when everything is on track.
 * 2. Heavy penalty (-18) if the photographer missed photographing the active VIP event in time.
 * 3. Immediate penalty (-12) + faster drain (-2.2/sec) when magnet delivery is overdue!
 */
export function computePartyJoyTick(params: {
  currentJoy: number;
  dt: number;
  isMagnetDeliveryLate: boolean;
  justBecameLate: boolean;
  justMissedVipEvent: boolean;
}): { nextJoy: number; joyPenaltyReasonHe: string | null } {
  const safeDt = Math.max(0, params.dt);
  let nextJoy = params.currentJoy;
  let joyPenaltyReasonHe: string | null = null;

  // Baseline gentle decay (0.48/sec when on time, +2.2/sec extra drain when magnets are late!)
  const decayRate = 0.48 + (params.isMagnetDeliveryLate ? 2.2 : 0);
  nextJoy -= decayRate * safeDt;

  if (params.justMissedVipEvent) {
    nextJoy -= 18;
    joyPenaltyReasonHe = '😞 פספסת את צילום האירוע הנכון! שמחת האורחים צנחה (-18%) והרוקדים מתיישבים!';
  } else if (params.justBecameLate) {
    nextJoy -= 12;
    joyPenaltyReasonHe = '⏰ איחור בהוצאת המגנטים ללוח! האורחים מתבאסים (-12% שמחה)! מהר לעמדה וללוח!';
  }

  return {
    nextJoy: Math.max(15, Math.min(100, Number(nextJoy.toFixed(2)))),
    joyPenaltyReasonHe,
  };
}


// ============================================================================
// PHOTOGRAPHER MOVEMENT JUICE & CAMERA-FACING HELPERS
// ============================================================================

/** Velocity response rates (1/sec) — higher = snappier. */
export const PLAYER_ACCEL_RATE = 12;
export const PLAYER_DECEL_RATE = 9;
export const PLAYER_DASH_RATE = 40;

/**
 * Frame-rate independent exponential approach of one velocity component toward its target.
 * Speeding up uses `accelRate`, slowing down / reversing uses `decelRate`.
 */
export function approachVelocity(
  current: number,
  target: number,
  dt: number,
  accelRate: number,
  decelRate: number
): number {
  const speedingUp = Math.abs(target) > Math.abs(current) && Math.sign(target) === Math.sign(current || target);
  const rate = speedingUp ? accelRate : decelRate;
  const t = 1 - Math.exp(-rate * Math.max(0, dt));
  const next = current + (target - current) * t;
  // Snap tiny residual drift to zero so the idle pose kicks in cleanly
  return Math.abs(next) < 0.5 && target === 0 ? 0 : next;
}

/**
 * Damped spring step for squash & stretch scale (overshoots slightly, then settles at 1).
 */
export function stepScaleSpring(
  scale: number,
  velocity: number,
  dt: number,
  stiffness = 340,
  damping = 15
): { scale: number; velocity: number } {
  const safeDt = Math.min(Math.max(0, dt), 1 / 30);
  const accel = stiffness * (1 - scale) - damping * velocity;
  const nextVel = velocity + accel * safeDt;
  return { scale: scale + nextVel * safeDt, velocity: nextVel };
}

/** Directions where the photographer's back is to the viewer (camera points into the scene). */
export function isBackFacingDirection(dir: IsoDirection): boolean {
  return dir === 'N' || dir === 'NE' || dir === 'NW';
}

/** Screen-space angle each iso facing direction points at (0 = screen right, +PI/2 = screen down). */
export const ISO_DIRECTION_SCREEN_ANGLE: Record<IsoDirection, number> = {
  E: 0,
  SE: Math.PI * 0.25,
  S: Math.PI * 0.5,
  SW: Math.PI * 0.75,
  W: Math.PI,
  NW: -Math.PI * 0.75,
  N: -Math.PI * 0.5,
  NE: -Math.PI * 0.25,
};

/**
 * Where the camera lens sits relative to the sprite's foot anchor, in screen pixels,
 * given the drawn sprite height. Also reports whether the lens is in front of the body
 * (draw flash on top of the sprite) or behind it (draw flash under the sprite).
 */
export function getCameraLensScreenOffset(
  dir: IsoDirection,
  spriteHeight: number
): { dx: number; dy: number; angle: number; lensInFront: boolean } {
  const angle = ISO_DIRECTION_SCREEN_ANGLE[dir] ?? 0;
  const reach = spriteHeight * 0.13;
  return {
    dx: Math.cos(angle) * reach,
    // Speedlight sits on the camera raised to the face (~90% up the shoot frame);
    // iso foreshortening halves the vertical reach
    dy: -spriteHeight * 0.9 + Math.sin(angle) * reach * 0.5,
    angle,
    lensInFront: !isBackFacingDirection(dir),
  };
}

/**
 * Procedural pose offsets for the photographer sprite:
 * walk bob + sway/tilt scaled by speed, and a gentle breathing cycle when idle.
 */
export function computePhotographerPose(params: {
  strideDist: number;
  speedRatio: number;
  idleTime: number;
  lean: number;
}): { bobY: number; tilt: number; breathScaleX: number; breathScaleY: number } {
  const speed = Math.max(0, Math.min(1.6, params.speedRatio));
  const walkWeight = Math.min(1, speed);
  // Two bounces per gait cycle (one per footstep); stride frames switch every 22 world units
  const stepPhase = (params.strideDist / 22) * Math.PI;
  const bobY = -Math.abs(Math.sin(stepPhase)) * 3.2 * walkWeight;
  const sway = Math.sin(stepPhase) * 0.045 * walkWeight;
  const tilt = sway + Math.max(-0.12, Math.min(0.12, params.lean));

  // Breathing fades in after the photographer has stood still for a moment
  const breathWeight = speed < 0.05 ? Math.min(1, params.idleTime / 0.6) : 0;
  const breath = Math.sin(params.idleTime * 2.4) * breathWeight;
  return {
    bobY,
    tilt,
    breathScaleX: 1 - breath * 0.012,
    breathScaleY: 1 + breath * 0.022,
  };
}

// ============================================================================
// CAMERA → COMPUTER CARD TRANSFER (step before printing)
// ============================================================================

/** Fixed overhead of inserting the card / mounting it on the laptop. */
export const CARD_TRANSFER_BASE_SEC = 0.6;
/** Copy time per photo. */
export const CARD_TRANSFER_SEC_PER_PHOTO = 0.12;

/**
 * How long copying the camera's card to the laptop takes. The turbo-station upgrade
 * (speedMultiplier > 1) also speeds up the card reader.
 */
export function calculateCardTransferTiming(
  photoCount: number,
  speedMultiplier = 1
): { totalDurationSec: number; secondsPerPhoto: number } {
  const count = Math.max(0, Math.floor(photoCount));
  const mult = Math.max(0.1, speedMultiplier);
  const secondsPerPhoto = CARD_TRANSFER_SEC_PER_PHOTO / mult;
  const totalDurationSec = Number(((CARD_TRANSFER_BASE_SEC + count * CARD_TRANSFER_SEC_PER_PHOTO) / mult).toFixed(2));
  return { totalDurationSec, secondsPerPhoto };
}

/**
 * The camera sits on the desk (card in the laptop) from the moment a transfer starts.
 * The photographer takes it back automatically once the copy has finished, he has left
 * the chair, and he is still at the workstation. If he walks away mid-transfer the camera
 * stays on the desk until he comes back.
 */
export function shouldPickUpCameraFromDesk(params: {
  cameraOnDesk: boolean;
  transferRemainingSec: number;
  isSeatedAtStation: boolean;
  isNearStation: boolean;
}): boolean {
  return (
    params.cameraOnDesk &&
    params.transferRemainingSec <= 0 &&
    !params.isSeatedAtStation &&
    params.isNearStation
  );
}

export type WorkstationActionKind = 'busy_transfer' | 'cut' | 'print' | 'transfer' | 'none';

/**
 * Which job the [E] action starts at the workstation. Finishing work further down the
 * pipeline comes first: cut ready sheets → print transferred photos → copy the camera card.
 */
export function chooseWorkstationAction(state: {
  isTransferring: boolean;
  uncutSheetsAtStation: number;
  photosOnComputer: number;
  photosInCamera: number;
}): WorkstationActionKind {
  if (state.uncutSheetsAtStation > 0) return 'cut';
  if (state.isTransferring) return 'busy_transfer';
  if (state.photosOnComputer > 0) return 'print';
  if (state.photosInCamera > 0) return 'transfer';
  return 'none';
}
