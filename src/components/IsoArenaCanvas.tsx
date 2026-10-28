import React, { useEffect, useRef } from 'react';
import {
  EnemyArchetype,
  GameState,
  MAGNET_FRAMES,
  MAX_UPGRADE_LEVEL,
  MagnetDeliveryTrackerState,
  MagnetFrameId,
  PHOTOS_PER_SHEET,
  PhotographerUpgradeLevels,
  UpgradeId,
  VipEventState,
  WaiterActorState,
  angleToIsoDirection,
  calculateBatchPrintBonus,
  CROWD_MOVE_INTERVAL_SEC,
  FloorObstacle,
  GUEST_ACTIVITY_COOLDOWN_SEC,
  calculateTargetGuestBreakdown,
  calculateWorkstationJobTiming,
  clampDt,
  computeCombinedMovementVector,
  computePartyJoyTick,
  computeSimDt,
  createInitialMagnetDeliveryTracker,
  createVipEvent,
  doesShotCountForVipEvent,
  evaluateDancefloorCrowdState,
  evaluateFramePreferenceMatch,
  evaluateGuestJoyFromMagnetDelivery,
  evaluateGuestJoyFromShot,
  getActiveWorkflowObjective,
  getMaxCameraCapacity,
  getPreferredFrameForGuest,
  getUpgradeCost,
  getWaveConfig,
  getWorkstationSheetProgress,
  getWorkstationSpeedMultiplier,
  isoToWorld,
  PLAYER_ACCEL_RATE,
  PLAYER_DASH_RATE,
  PLAYER_DECEL_RATE,
  approachVelocity,
  moveTowardPoint,
  calculateCardTransferTiming,
  chooseWorkstationAction,
  shouldPickUpCameraFromDesk,
  computePhotographerPose,
  getCameraLensScreenOffset,
  isBackFacingDirection,
  stepScaleSpring,
  getCuttingAnimFrame,
  pickNextSocialDanceSpot,
  resolveFloorObstacles,
  stepCrowdJoy,
  stepMagnetDeliveryTracker,
  updateWorkstationChairState,
  worldToIso,
} from '../game/rules';
import { FlashEngine, FlashProjector, isTargetInCone } from '../game/flashEngine';
import {
  SEATED_FRAME,
  SpriteStrip,
  loadCuttingPhotographerSheet,
  loadSeatedPhotographerSheet,
} from '../game/photographerStrips';
import {
  drawPixelGuillotineCutter,
  drawPixelLaptop,
  drawPixelThermalPrinter,
} from '../game/workstationPixelArt';
import {
  drawChuppahRunway,
  drawPixelDjStageAndLedWall,
  drawPixelHatzarChuppah,
} from '../game/venuePixelArt';
import {
  BARTENDER_STATIONS,
  BAR_GUEST_SPOTS,
  BAR_PICKUP_SPOTS,
  BartenderAction,
  BartenderLook,
  DECOR_TABLES,
  ISLAND_BAR,
  LONG_TABLE,
  LONG_TABLE_SEATS,
  LOUNGE,
  RATTAN_HIGH_TABLES,
  drawBarShelfTower,
  drawBartender,
  drawCigaretteSmoke,
  drawGhostChair,
  drawGoboProjections,
  drawHallCeiling,
  drawHallFloor,
  drawHallWalls,
  drawHeldDrink,
  drawIslandBarPiece,
  drawLongBanquetTable,
  drawRattanHighTable,
  drawUplitTree,
  drawVelvetLounge,
  getIslandBarPieces,
  getMovingHeads,
  BARTENDER_LOOKS,
  getBartenderPose,
} from '../game/hallPixelArt';
import {
  CharacterAndSizeConfig,
  DEFAULT_CHARACTER_AND_SIZE_CONFIG,
  ExtractedSpriteFrame,
  IsoAnimState,
  IsoDirection,
  SpriteAtlasSchema,
} from '../game/spriteExtractor';
import { sound } from '../game/sound';
import {
  CAST_LOOKS,
  CastLookId,
  CastSheet,
  GUEST_LOOKS_FEMALE,
  GUEST_LOOKS_MALE,
  EMBRACE_HEIGHT,
  getCastFrame,
  loadCastSheet,
} from '../game/castSprites';
import { DIALOGUE_HE, GuestType, PATIENCE, ATTENTION, PENALTIES, SCORE_REWARDS } from '../game/guestBalance';
import {
  GuestBehaviorState,
  BehaviorEvent,
  assignGuestTypes,
  createBehavior,
  onGuestPhotographed,
  onMagnetDelivered,
  stepBehavior,
  wantsToApproachPhotographer,
} from '../game/guestBehavior';
import { FrameSubject, MagnetLedger, scoreCaptureExtras, scoreFrame } from '../game/photoScoring';
import { HudSnapshot } from './GameHud';
import type { VirtualInputState } from './MobileControls';

interface IsoArenaCanvasProps {
  gameState: GameState;
  atlas: SpriteAtlasSchema;
  sheetCanvas: HTMLCanvasElement | null;
  characterConfig?: CharacterAndSizeConfig;
  weaponMode: 'pulse' | 'scatter';
  selectedFrame?: MagnetFrameId;
  upgradeRequest?: { id: UpgradeId; seq: number } | null;
  runId: number;
  stationTrigger?: number;
  developTrigger?: number;
  cutTrigger?: number;
  callGuestsTrigger?: number;
  takeMagnetTrigger?: number;
  virtualInputRef?: React.MutableRefObject<VirtualInputState>;
  onOpenBoardModal?: () => void;
  onOpenWorkstationModal?: () => void;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onGameOver: (victory: boolean, finalScore: number, wave: number, kills: number) => void;
}

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
  /** Bride & groom: where the pair is heading right now. */
  vipTargetX?: number;
  vipTargetY?: number;
  vipTimer?: number;
}

interface FlashShot {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface FlyingPhotoThumb {
  active: boolean;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  progress: number;
  color: string;
}

interface FlyingMagnet {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  vRot: number;
  life: number;
  maxLife: number;
  isGold: boolean;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface BanquetTableData {
  id: number;
  wx: number;
  wy: number;
  name: string;
  runnerColor: string;
  wineColor: string;
}

const MAX_PARTICLES = 240;
const MAX_PROJECTILES = 60;
const MAX_FLYING_MAGNETS = 30;
const MAX_FLYING_THUMBS = 16;

const DANCER_SPEECH_BUBBLES = [
  '📸 סלפי!',
  '🕺 קצב!',
  '✨ פלאש!',
  '🎉 הופה!',
  '🥂 מזל טוב!',
  '💃 רוקדים!',
];

const TABLE_SPEECH_BUBBLES = [
  '🍷 לחיים!',
  '📸 תמונה!',
  '🥂 מזל טוב!',
  '✨ חייכו!',
];

// 4 Decorated Banquet Tables around the venue perimeter
const BANQUET_TABLES: BanquetTableData[] = [
  { id: 1, wx: -215, wy: -105, name: 'שולחן 1 · משפחת החתן', runnerColor: '#831843', wineColor: '#991b1b' },
  { id: 2, wx: -235, wy: 75, name: 'שולחן 2 · חברים מהאוניברסיטה', runnerColor: '#1e3a8a', wineColor: '#ca8a04' },
  { id: 3, wx: -175, wy: 220, name: 'שולחן 3 · משפחת הכלה', runnerColor: '#831843', wineColor: '#991b1b' },
  { id: 4, wx: 125, wy: 195, name: 'שולחן 4 · החבר\'ה מהעבודה', runnerColor: '#14532d', wineColor: '#ca8a04' },
];

// 4 Social Dancefloor Group Clusters so dancers dance near other people & partners
const DANCE_CLUSTER_CENTERS = [
  { x: -42, y: -32 },
  { x: 42, y: -26 },
  { x: -36, y: 38 },
  { x: 38, y: 36 },
];

// Standing Tripod Magnetic Whiteboard (כן ציור חצובה עם לוח מגנטים לבן - צמוד לרחבת הריקודים)
const TRIPOD_BOARD_POS = { x: 96, y: -22 };
const BOARD_INTERACTION_RADIUS = 85;

// Far-Corner Magnet Production Workstation (עמדת מגנטים בפינת האולם רחוק מהאורחים ומהלוח: שולחן מלבני + מחשב נייד + מדפסת תרמית + ניירות הדבקה + חותך + כסא צלם)
const WORKSTATION_POS = { x: 350, y: 35 };
const WORKSTATION_CHAIR_POS = { x: WORKSTATION_POS.x - 8, y: WORKSTATION_POS.y + 34 };
const STATION_INTERACTION_RADIUS = 95;
const movingHeads = getMovingHeads();
// Where the photographer stands to operate the guillotine cutter (in front of the desk's right end,
// facing up-right toward the cutter at WORKSTATION_POS + (28, 8))
const CUTTER_STAND_POS = { x: WORKSTATION_POS.x + 28, y: WORKSTATION_POS.y + 38 };

// Solid floor objects the photographer can't walk through (world coords, matching the drawn footprints)
const PLAYER_BODY_RADIUS = 9;
const FLOOR_OBSTACLES: FloorObstacle[] = [
  // Long banquet tables (gameplay + decorative)
  ...[...BANQUET_TABLES.map((t) => ({ x: t.wx, y: t.wy })), ...DECOR_TABLES].map((t) => ({
    kind: 'box' as const,
    minX: t.x - LONG_TABLE.length / 2,
    minY: t.y - LONG_TABLE.depth / 2,
    maxX: t.x + LONG_TABLE.length / 2,
    maxY: t.y + LONG_TABLE.depth / 2,
  })),
  // Uplit tree deck + velvet lounge
  { kind: 'circle', x: LOUNGE.treeX, y: LOUNGE.treeY, r: 22 },
  { kind: 'circle', x: LOUNGE.sofaX, y: LOUNGE.sofaY, r: 26 },
  // Rattan high tables along the green wall
  ...RATTAN_HIGH_TABLES.map((t) => ({ kind: 'circle' as const, x: t.x, y: t.y, r: 14 })),
  // Square island bar (counter ring + shelf tower)
  {
    kind: 'box',
    minX: ISLAND_BAR.cx - ISLAND_BAR.half,
    minY: ISLAND_BAR.cy - ISLAND_BAR.half,
    maxX: ISLAND_BAR.cx + ISLAND_BAR.half,
    maxY: ISLAND_BAR.cy + ISLAND_BAR.half,
  },
  // DJ stage platform + booth
  { kind: 'box', minX: -148, minY: -276, maxX: -50, maxY: -228 },
  // Chuppah stage platform
  { kind: 'box', minX: 78, minY: -215, maxX: 152, maxY: -151 },
  // White lounge benches & floral pedestals by the chuppah runway
  { kind: 'circle', x: 36, y: -186, r: 9 },
  { kind: 'circle', x: 68, y: -186, r: 9 },
  { kind: 'circle', x: 36, y: -124, r: 9 },
  { kind: 'circle', x: 68, y: -124, r: 9 },
  { kind: 'circle', x: 20, y: -182, r: 6 },
  { kind: 'circle', x: 20, y: -128, r: 6 },
  // Dancefloor subwoofer
  { kind: 'box', minX: -102, minY: 56, maxX: -76, maxY: 80 },
  // Magnet workstation desk (the chair in front of it stays reachable)
  { kind: 'box', minX: WORKSTATION_POS.x - 70, minY: WORKSTATION_POS.y - 28, maxX: WORKSTATION_POS.x + 46, maxY: WORKSTATION_POS.y + 22 },
  // Tripod magnet board easel
  { kind: 'circle', x: TRIPOD_BOARD_POS.x, y: TRIPOD_BOARD_POS.y, r: 10 },
];

export const IsoArenaCanvas: React.FC<IsoArenaCanvasProps> = ({
  gameState,
  atlas,
  sheetCanvas,
  characterConfig = DEFAULT_CHARACTER_AND_SIZE_CONFIG,
  weaponMode,
  selectedFrame = 'gold',
  upgradeRequest = null,
  runId,
  stationTrigger = 0,
  developTrigger = 0,
  cutTrigger = 0,
  callGuestsTrigger = 0,
  takeMagnetTrigger = 0,
  virtualInputRef,
  onOpenBoardModal,
  onOpenWorkstationModal,
  onHudUpdate,
  onGameOver,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const virtualInputInternalRef = useRef(virtualInputRef);
  virtualInputInternalRef.current = virtualInputRef;

  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  const atlasRef = useRef(atlas);
  atlasRef.current = atlas;

  const sheetCanvasRef = useRef(sheetCanvas);
  sheetCanvasRef.current = sheetCanvas;

  const characterConfigRef = useRef(characterConfig);
  characterConfigRef.current = characterConfig;

  const weaponRef = useRef(weaponMode);
  weaponRef.current = weaponMode;

  const selectedFrameRef = useRef<MagnetFrameId>(selectedFrame);
  selectedFrameRef.current = selectedFrame;

  const callbacksRef = useRef({
    onHudUpdate,
    onGameOver,
    onOpenBoardModal,
    onOpenWorkstationModal,
  });
  callbacksRef.current = {
    onHudUpdate,
    onGameOver,
    onOpenBoardModal,
    onOpenWorkstationModal,
  };

  const stationTriggerRef = useRef(stationTrigger);
  const triggerStationExternalRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (stationTrigger !== stationTriggerRef.current) {
      stationTriggerRef.current = stationTrigger;
      triggerStationExternalRef.current?.();
    }
  }, [stationTrigger]);

  const developTriggerRef = useRef(developTrigger);
  const triggerDevelopExternalRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (developTrigger !== developTriggerRef.current) {
      developTriggerRef.current = developTrigger;
      triggerDevelopExternalRef.current?.();
    }
  }, [developTrigger]);

  const cutTriggerRef = useRef(cutTrigger);
  const triggerCutExternalRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (cutTrigger !== cutTriggerRef.current) {
      cutTriggerRef.current = cutTrigger;
      triggerCutExternalRef.current?.();
    }
  }, [cutTrigger]);

  const callGuestsTriggerRef = useRef(callGuestsTrigger);
  const triggerCallGuestsExternalRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (callGuestsTrigger !== callGuestsTriggerRef.current) {
      callGuestsTriggerRef.current = callGuestsTrigger;
      triggerCallGuestsExternalRef.current?.();
    }
  }, [callGuestsTrigger]);

  const takeMagnetTriggerRef = useRef(takeMagnetTrigger);
  const triggerTakeMagnetExternalRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (takeMagnetTrigger !== takeMagnetTriggerRef.current) {
      takeMagnetTriggerRef.current = takeMagnetTrigger;
      triggerTakeMagnetExternalRef.current?.();
    }
  }, [takeMagnetTrigger]);

  const upgradeSeqRef = useRef(0);
  const triggerUpgradeExternalRef = useRef<((id: UpgradeId) => void) | null>(null);

  useEffect(() => {
    if (upgradeRequest && upgradeRequest.seq !== upgradeSeqRef.current) {
      upgradeSeqRef.current = upgradeRequest.seq;
      triggerUpgradeExternalRef.current?.(upgradeRequest.id);
    }
  }, [upgradeRequest]);

  const simRef = useRef<{
    resetRun: () => void;
  } | null>(null);

  useEffect(() => {
    simRef.current?.resetRun();
  }, [runId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    let viewW = window.innerWidth;
    let viewH = window.innerHeight;
    // Render at the screen's real pixel density (capped at 2x for performance) so nothing gets
    // upscaled and blurred by the browser on retina / phone screens. All drawing stays in CSS pixels.
    let dpr = 1;
    const updateSize = () => {
      if (!canvas) return;
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.round(viewW * dpr);
      canvas.height = Math.round(viewH * dpr);
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(document.body);

    const keysHeld = new Set<string>();
    const keysJustPressed = new Set<string>();
    let mouseDown = false;
    let mouseJustPressed = false;
    let pointerScreenX = viewW * 0.6;
    let pointerScreenY = viewH * 0.45;

    const clearInputs = () => {
      keysHeld.clear();
      keysJustPressed.clear();
      mouseDown = false;
      mouseJustPressed = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      keysHeld.add(e.code);
      keysJustPressed.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const onMouseMove = (e: MouseEvent) => {
      pointerScreenX = e.clientX;
      pointerScreenY = e.clientY;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseDown = true;
        mouseJustPressed = true;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mouseDown = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        pointerScreenX = t.clientX;
        pointerScreenY = t.clientY;
        // If touching on right half of screen without UI button, trigger photo snap
        if (t.clientX >= viewW * 0.45) {
          mouseDown = true;
          mouseJustPressed = true;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        pointerScreenX = t.clientX;
        pointerScreenY = t.clientY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        mouseDown = false;
      }
    };

    const onVisChange = () => {
      if (document.hidden) clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', onVisChange);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: true });

    const particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1,
      size: 3,
      color: '#fef08a',
    }));
    let particleCursor = 0;

    const spawnParticles = (
      x: number,
      y: number,
      count: number,
      color: string,
      speed = 100,
      z = 18
    ) => {
      for (let i = 0; i < count; i++) {
        const p = particles[particleCursor];
        particleCursor = (particleCursor + 1) % MAX_PARTICLES;
        const ang = Math.random() * Math.PI * 2;
        const spd = (0.3 + Math.random() * 0.9) * speed;
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = Math.cos(ang) * spd;
        p.vy = Math.sin(ang) * spd;
        p.vz = 80 + Math.random() * 120;
        p.life = 0.5 + Math.random() * 0.55;
        p.maxLife = p.life;
        p.size = 2.5 + Math.random() * 3.5;
        p.color = color;
      }
    };

    // Paper scrap flakes from guillotine cutter
    const spawnPaperScraps = (x: number, y: number, count = 18) => {
      const colors = ['#ffffff', '#f8fafc', '#fef08a', '#fda4af', '#93c5fd'];
      for (let i = 0; i < count; i++) {
        const p = particles[particleCursor];
        particleCursor = (particleCursor + 1) % MAX_PARTICLES;
        const ang = Math.random() * Math.PI * 2;
        const spd = 60 + Math.random() * 90;
        p.active = true;
        p.x = x + (Math.random() * 14 - 7);
        p.y = y + (Math.random() * 14 - 7);
        p.z = 32;
        p.vx = Math.cos(ang) * spd;
        p.vy = Math.sin(ang) * spd;
        p.vz = 70 + Math.random() * 100;
        p.life = 0.7 + Math.random() * 0.4;
        p.maxLife = p.life;
        p.size = 2 + Math.random() * 3;
        p.color = colors[i % colors.length];
      }
    };

    const projectiles: FlashShot[] = Array.from(
      { length: MAX_PROJECTILES },
      () => ({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0.35,
        color: '#fef08a',
      })
    );
    let projectileCursor = 0;

    // Seated photographer strip (typing at the workstation, no camera in hand)
    let seatedSheet: SpriteStrip | null = null;
    let seatedSheetDisposed = false;
    loadSeatedPhotographerSheet().then((sheetResult) => {
      if (!seatedSheetDisposed) seatedSheet = sheetResult;
    });
    // Standing-at-the-cutter strip (pulling the guillotine lever)
    let cuttingSheet: SpriteStrip | null = null;
    loadCuttingPhotographerSheet().then((sheetResult) => {
      if (!seatedSheetDisposed) cuttingSheet = sheetResult;
    });
    // Wedding cast sheet: bride, groom and guest looks
    let castSheet: CastSheet | null = null;
    loadCastSheet().then((sheetResult) => {
      if (!seatedSheetDisposed) castSheet = sheetResult;
    });

    // ======================================================================
    // CAMERA FLASH ENGINE — pooled light cones + lens flares with hit-test hooks
    // ======================================================================
    const flashEngine = new FlashEngine<WeddingGuestActor>({
      poolSize: 24,
      defaultTargetRadius: 10, // guest body radius in world units
      // HOOK: shutter / flash sound fires exactly when the light is emitted
      onFire: () => {
        sound.playShoot();
      },
      // HOOK: guests caught inside the light cone react (white blow-out + eye blink).
      // Photo capture/scoring is still driven by the flash projectiles, so gameplay balance is unchanged.
      onTargetHit: (guest) => {
        guest.flashTintTimer = 0.22;
      },
    });

    const fireFlashShot = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      color: string,
      life = 0.3
    ) => {
      const pr = projectiles[projectileCursor];
      projectileCursor = (projectileCursor + 1) % MAX_PROJECTILES;
      pr.active = true;
      pr.x = x;
      pr.y = y;
      pr.vx = vx;
      pr.vy = vy;
      pr.life = life;
      pr.maxLife = life;
      pr.color = color;
    };

    const flyingThumbs: FlyingPhotoThumb[] = Array.from(
      { length: MAX_FLYING_THUMBS },
      () => ({
        active: false,
        startX: 0,
        startY: 0,
        targetX: 0,
        targetY: 0,
        currentX: 0,
        currentY: 0,
        progress: 0,
        color: '#ffffff',
      })
    );
    let thumbCursor = 0;

    const spawnFlyingThumb = (sx: number, sy: number, tx: number, ty: number, color = '#ffffff') => {
      const th = flyingThumbs[thumbCursor];
      thumbCursor = (thumbCursor + 1) % MAX_FLYING_THUMBS;
      th.active = true;
      th.startX = sx;
      th.startY = sy;
      th.targetX = tx;
      th.targetY = ty;
      th.currentX = sx;
      th.currentY = sy;
      th.progress = 0;
      th.color = color;
    };

    const flyingMagnets: FlyingMagnet[] = Array.from(
      { length: MAX_FLYING_MAGNETS },
      () => ({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rot: 0,
        vRot: 0,
        life: 0,
        maxLife: 1.0,
        isGold: false,
      })
    );
    let magnetCursor = 0;

    const spawnFlyingMagnet = (
      x: number,
      y: number,
      targetX = TRIPOD_BOARD_POS.x,
      targetY = TRIPOD_BOARD_POS.y,
      isGold = false
    ) => {
      const m = flyingMagnets[magnetCursor];
      magnetCursor = (magnetCursor + 1) % MAX_FLYING_MAGNETS;
      m.active = true;
      m.x = x;
      m.y = y;
      m.z = 24;
      const dx = targetX - x;
      const dy = targetY - y;
      const flightDuration = 0.55;
      m.vx = dx / flightDuration;
      m.vy = dy / flightDuration;
      m.vz = 190;
      m.rot = Math.random() * Math.PI;
      m.vRot = (Math.random() - 0.5) * 8;
      m.life = flightDuration;
      m.maxLife = flightDuration;
      m.isGold = isGold;
    };

    const floorPetals = Array.from({ length: 44 }, (_, i) => ({
      x: Math.cos(i * 1.9) * (35 + (i * 9) % 290),
      y: Math.sin(i * 2.3) * (35 + (i * 11) % 270),
      color:
        i % 4 === 0
          ? '#fda4af'
          : i % 4 === 1
          ? '#f59e0b'
          : i % 4 === 2
          ? '#38bdf8'
          : '#f43f5e',
    }));

    // Track active timeouts so they can be cleanly cancelled on wave reset or unmount
    let activeTimeouts: number[] = [];
    const scheduleTimeout = (fn: () => void, delayMs: number) => {
      const id = window.setTimeout(() => {
        activeTimeouts = activeTimeouts.filter((t) => t !== id);
        fn();
      }, delayMs);
      activeTimeouts.push(id);
    };
    const clearAllTimeouts = () => {
      for (const id of activeTimeouts) {
        window.clearTimeout(id);
      }
      activeTimeouts = [];
    };

    const ARENA_RADIUS = 390;
    const player = {
      x: 10,
      y: 65,
      vx: 0,
      vy: 0,
      partyJoy: 85,
      ghostJoy: 85,
      dashCharge: 1.0,
      dashBufferTimer: 0,
      dashActiveTimer: 0,
      shootCooldown: 0,
      shootAnimTimer: 0,
      bumpFlashTimer: 0,
      scaleX: 1,
      scaleY: 1,
      scaleVelX: 0,
      scaleVelY: 0,
      idleTime: 0,
      wasMoving: false,
      lean: 0,
      // Screen-space offset of the camera lens from the feet, refreshed by the renderer each frame
      lensOffsetX: 0,
      lensOffsetY: -70,
      // Seconds seated at the workstation with no job running (drives the "glance at the party" frame)
      seatedIdleTime: 0,
      // Standing at the guillotine cutter (cutting animation); cleared as soon as he moves
      atCutter: false,
      strideDist: 0,
      direction: 'NE' as IsoDirection,
      animState: 'idle' as IsoAnimState,
      photosInCamera: 0, // Stage 1: Raw photos in camera memory
      photosOnComputer: 0, // Stage 1b: Copied from the camera card to the laptop, ready to print
      cameraOnDesk: false, // Camera put down on the workstation desk (card in the laptop) → can't shoot
      transferAnimTimer: 0,
      transferAnimDuration: 0,
      transferBatch: 0,
      uncutSheetsAtStation: 0, // Stage 2: Printed & laminated onto magnetic sheets at Corner Workstation
      cutMagnetsInHand: 0, // Stage 3: Sliced by Guillotine Cutter, held in hand to stick on Tripod Board
      isNearStation: false,
      isSeatedAtStation: false,
      wasNearStation: false,
      sitGraceTimer: 0,
      standUpCooldown: 0,
      isNearBoard: false,
      stationActionTimer: 0,
      printerAnimTimer: 0,
      printerAnimDuration: 0,
      printerTotalSheets: 0,
      cutterAnimTimer: 0,
      cutterAnimDuration: 0,
      cutterTotalSheets: 0,
      stationActionStep: 0,
      stationFeedbackText: null as string | null,
      stationFeedbackTimer: 0,
    };

    let score = 500; // Wedding photographer advance budget so upgrades are immediately accessible
    let bestScore = 500;
    let combo = 0;
    let comboTimer = 0;
    let wave = 1;
    let magnetsPrintedThisWave = 0;
    let totalMagnetsAllWaves = 0;
    let availableMagnetsOnBoard = 0;
    let pendingBoardSticks = 0;
    let lastStationExecMs = 0;
    let magnetsTakenByGuests = 0;
    let guestMagnetTimer = 2.0;
    // Smoothed "crowd vibe": follows partyJoy gradually so a sudden joy jump
    // (sticking magnets, wave completion, penalties) doesn't reshuffle the whole crowd at once
    let crowdJoy = 90;
    let crowdMoveCooldown = 0;
    let trackTimeRemaining = 65;
    let hitstopRemaining = 0;
    let cameraTrauma = 0;
    let camX = 0;
    let camY = 0;
    let titlePanTime = 0;
    let nextGuestId = 1;
    let guests: WeddingGuestActor[] = [];
    // The unique bride & groom (kept out of the crowd-ratio pool, but photographable like any guest)
    let vipCouple: WeddingGuestActor[] = [];
    // Who is in each photo on its way through camera → laptop → sheets → board (FIFO)
    const magnetLedger = new MagnetLedger();
    // Business reputation ("לידים") from photographing potential couples
    let reputation = 0;
    // Game clock for photo timestamps
    let gameClock = 0;
    let lastAimWX = 1;
    let lastAimWY = 0;
    // Big floating score labels for whole-frame scoring (Hebrew)
    const frameLabels: Array<{ text: string; sub: string; x: number; y: number; life: number; color: string }> = [];
    // Waiters run drinks: pick up at the bar → walk to a guest → serve → back to the bar
    type DrinkWaiter = WaiterActorState & {
      mode: 'to_bar' | 'loading' | 'to_guest' | 'serving';
      targetGuestId: number | null;
      timer: number;
      carrying: boolean;
    };
    let waiters: DrinkWaiter[] = [];
    let barVisitTimer = 4;
    let vipEvent: VipEventState | null = null;
    let vipEventSeq = 0;
    let nextVipCooldown = 2.5;
    let magnetDeliveryTracker: MagnetDeliveryTrackerState = createInitialMagnetDeliveryTracker();
    let upgradeLevels: PhotographerUpgradeLevels = {
      turbo_station: 0,
      pro_sdcard: 0,
      sneakers: 0,
    };
    let endBeatTimer = 0;
    let pendingOutcome: 'victory' | 'defeat' | null = null;
    let discoBeatPhase = 0;
    let chuppahCelebrateTimer = 0;

    // Purchase equipment upgrade
    const purchaseUpgrade = (id: UpgradeId) => {
      const curLvl = upgradeLevels[id];
      if (curLvl >= MAX_UPGRADE_LEVEL) {
        player.stationFeedbackText = 'השדרוג הזה כבר ברמה המקסימלית! ✨';
        player.stationFeedbackTimer = 2.2;
        return;
      }
      const cost = getUpgradeCost(id, curLvl);
      if (score < cost) {
        player.stationFeedbackText = `דרושות ${cost} נקודות לשדרוג זה! צלם עוד אורחים ורגעי VIP 📸`;
        player.stationFeedbackTimer = 2.2;
        sound.playDanceBump();
        return;
      }
      score -= cost;
      upgradeLevels = {
        ...upgradeLevels,
        [id]: curLvl + 1,
      };
      sound.playFanfare(true);
      spawnParticles(player.x, player.y, 28, '#22d3ee', 160, 40);
      const namesHe: Record<UpgradeId, string> = {
        turbo_station: '⚡ מדפסת וחותך טורבו',
        pro_sdcard: '💾 כרטיס זיכרון Pro + עדשה',
        sneakers: '👟 נעלי ריצה לצלם',
      };
      player.stationFeedbackText = `שודרג בהצלחה: ${namesHe[id]} (רמה ${curLvl + 1})! 🎉`;
      player.stationFeedbackTimer = 3.0;
      hudEmitTimer = 1;
    };

    triggerUpgradeExternalRef.current = (id: UpgradeId) => {
      purchaseUpgrade(id);
    };

    // Step 1 at Corner Workstation: put the camera down on the desk, card into the laptop,
    // and copy the photos. While the camera is on the desk the photographer can't shoot.
    const transferCardToComputer = () => {
      if (player.transferAnimTimer > 0) {
        player.stationFeedbackText = `💾 מעביר תמונות למחשב... (${player.transferAnimTimer.toFixed(1)} שנ')`;
        player.stationFeedbackTimer = 1.6;
        return;
      }
      if (player.photosInCamera <= 0) {
        player.stationFeedbackText = 'אין תמונות במצלמה! צלם אורחים ברחבה ובשולחנות 📸';
        player.stationFeedbackTimer = 2.2;
        sound.playDanceBump();
        return;
      }

      const batch = player.photosInCamera;
      const speedMult = getWorkstationSpeedMultiplier(upgradeLevels.turbo_station);
      const job = calculateCardTransferTiming(batch, speedMult);

      player.cameraOnDesk = true;
      player.photosInCamera = 0; // card is in the laptop now
      player.transferBatch = batch;
      player.transferAnimDuration = job.totalDurationSec;
      player.transferAnimTimer = job.totalDurationSec;
      player.stationActionTimer = Math.max(player.stationActionTimer, job.totalDurationSec);
      sound.playDanceBump();
      spawnParticles(WORKSTATION_POS.x - 30, WORKSTATION_POS.y + 6, 10, '#4ade80', 90, 40);

      player.stationFeedbackText = `💾 המצלמה על השולחן והכרטיס במחשב — מעביר ${batch} תמונות (${job.totalDurationSec.toFixed(1)} שנ'). אי אפשר לצלם עכשיו!`;
      player.stationFeedbackTimer = Math.max(2.6, job.totalDurationSec + 0.8);
      hudEmitTimer = 1;
    };

    // Called when the copy finishes: photos are on the laptop, ready for the thermal printer
    const finishCardTransfer = () => {
      player.photosOnComputer += player.transferBatch;
      player.transferBatch = 0;
      sound.playComboChime(1);
      player.stationFeedbackText = player.isSeatedAtStation
        ? `✅ ${player.photosOnComputer} תמונות במחשב! לחץ [E] להדפסה 🖨️ · קום מהכסא כדי לקחת את המצלמה`
        : `✅ ההעברה הסתיימה! קח את המצלמה מהשולחן 📷`;
      player.stationFeedbackTimer = 3;
      hudEmitTimer = 1;
    };

    // Step 2 at Corner Workstation: Print the transferred photos via the Thermal Printer onto magnetic sheets
    // Timing: Every 4 photos = 1 sheet = 0.5 seconds (scaled by turbo_station upgrade)!
    const developAtWorkstation = () => {
      if (player.transferAnimTimer > 0) {
        transferCardToComputer(); // shows the "still copying" message
        return;
      }
      if (player.photosOnComputer <= 0) {
        if (player.photosInCamera > 0) {
          // Photos are still on the camera card → copy them to the laptop first
          transferCardToComputer();
          return;
        }
        player.stationFeedbackText = 'אין תמונות במחשב! צלם אורחים והעבר את התמונות מהמצלמה 📸💾';
        player.stationFeedbackTimer = 2.2;
        sound.playDanceBump();
        return;
      }

      const batch = player.photosOnComputer;
      const maxCap = getMaxCameraCapacity(upgradeLevels.pro_sdcard);
      const batchBonus = calculateBatchPrintBonus(batch, maxCap);
      const speedMult = getWorkstationSpeedMultiplier(upgradeLevels.turbo_station);
      const job = calculateWorkstationJobTiming(batch, speedMult);

      player.photosOnComputer = 0;
      player.uncutSheetsAtStation += batch;
      player.printerAnimDuration = job.totalDurationSec;
      player.printerAnimTimer = job.totalDurationSec;
      player.printerTotalSheets = job.sheetCount;
      player.stationActionTimer = job.totalDurationSec;
      score += Math.round(batch * 60 * batchBonus.multiplier);
      bestScore = Math.max(bestScore, score);

      const sheetIntervalMs = Math.max(120, Math.round(job.secondsPerSheet * 1000));
      for (let s = 0; s < job.sheetCount; s++) {
        scheduleTimeout(() => {
          sound.playMagnetPrint();
          spawnParticles(WORKSTATION_POS.x - 6, WORKSTATION_POS.y + 4, 14, '#38bdf8', 110, 42);
        }, s * sheetIntervalMs);
      }

      const bonusTag = batchBonus.bonusLabelHe ? ` · ${batchBonus.bonusLabelHe}` : '';
      player.stationFeedbackText = `🖨️ מדפיס ${job.sheetCount} דפי מגנט (${batch} תמונות · ${job.totalDurationSec.toFixed(1)} שנ')${bonusTag}! לחץ [E] לחיתוך! ✂️`;
      player.stationFeedbackTimer = Math.max(3.2, job.totalDurationSec + 1.8);
      hudEmitTimer = 1;
    };

    // Step 2 at Corner Workstation: Cut the magnetic sheets using the KW-triO Blue Guillotine Cutter
    // Timing: Every 4 photos = 1 sheet = 0.5 seconds (scaled by turbo_station upgrade)!
    const cutAtWorkstation = () => {
      if (player.uncutSheetsAtStation <= 0) {
        if (player.photosOnComputer > 0 || player.photosInCamera > 0) {
          developAtWorkstation();
          return;
        }
        player.stationFeedbackText = 'אין דפי מגנט לחיתוך! פתח קודם תמונות במדפסת התרמית 🖨️';
        player.stationFeedbackTimer = 2.2;
        sound.playDanceBump();
        return;
      }

      const batch = player.uncutSheetsAtStation;
      const speedMult = getWorkstationSpeedMultiplier(upgradeLevels.turbo_station);
      const job = calculateWorkstationJobTiming(batch, speedMult);
      player.uncutSheetsAtStation = 0;
      player.cutMagnetsInHand += batch;
      player.cutterAnimDuration = job.totalDurationSec;
      player.cutterAnimTimer = job.totalDurationSec;
      player.cutterTotalSheets = job.sheetCount;
      player.stationActionTimer = job.totalDurationSec;

      score += batch * 80;
      bestScore = Math.max(bestScore, score);
      sound.playComboChime(combo + 1);

      // Get up from the chair and step over to the cutter (only when actually at the workstation)
      if (player.isNearStation) {
        player.isSeatedAtStation = false;
        player.atCutter = true;
        player.x = CUTTER_STAND_POS.x;
        player.y = CUTTER_STAND_POS.y;
        player.vx = 0;
        player.vy = 0;
        player.direction = 'NE';
        player.wasNearStation = true;
        player.standUpCooldown = Math.max(player.standUpCooldown, 0.5);
      }

      const sheetIntervalMs = Math.max(120, Math.round(job.secondsPerSheet * 1000));
      for (let s = 0; s < job.sheetCount; s++) {
        // Chop sound lands when the blade slices (≈42% into each sheet), matching the full-cut pose
        scheduleTimeout(() => {
          sound.playMagnetCutter();
          spawnPaperScraps(WORKSTATION_POS.x + 18, WORKSTATION_POS.y + 4, 18);
          spawnParticles(WORKSTATION_POS.x + 18, WORKSTATION_POS.y + 4, 14, '#22d3ee', 120, 40);
        }, Math.round((s + 0.42) * sheetIntervalMs));
      }

      player.stationFeedbackText = `✂️ טראח! נחתכו ${batch} מגנטים (${job.sheetCount} דפים · ${job.totalDurationSec.toFixed(1)} שנ')! רוץ ללוח המגנטים והדבק [E]! 🧲`;
      player.stationFeedbackTimer = Math.max(3.5, job.totalDurationSec + 1.8);
      hudEmitTimer = 1;
    };

    // ======================================================================
    // GUEST PERSONALITIES — apply behavior events (dialogue, penalties, rewards)
    // ======================================================================
    const addFrameLabel = (text: string, x: number, y: number, color: string, sub = '') => {
      if (!text) return;
      // Don't stack on top of a fresh label at the same spot
      const crowded = frameLabels.filter((f) => Math.hypot(f.x - x, f.y - y) < 40 && f.life > 1.2).length;
      frameLabels.push({ text, sub, x: x - crowded * 14, y: y - crowded * 14, life: 2.2, color });
      if (frameLabels.length > 8) frameLabels.shift();
    };

    const applyScoreDelta = (delta: number) => {
      score = Math.max(0, score + delta);
      bestScore = Math.max(bestScore, score);
    };

    const applyBehaviorEvents = (guest: WeddingGuestActor, events: BehaviorEvent[]) => {
      for (const ev of events) {
        switch (ev.type) {
          case 'say':
            guest.speechBubbleText = ev.text;
            guest.wantsPhotoTimer = 2.4;
            break;
          case 'start_seeking':
            sound.playTelegraph();
            break;
          case 'patience_expired':
            applyScoreDelta(-PENALTIES.patienceExpired);
            player.partyJoy = Math.max(0, player.partyJoy - PENALTIES.patienceExpiredJoy);
            addFrameLabel(`-${PENALTIES.patienceExpired}`, guest.x, guest.y, '#f87171', '⏳ האורח מחכה למגנט!');
            player.stationFeedbackText = `⏳ אורח שצילמת מחכה למגנט שלו יותר מ-${PATIENCE.timeoutSec} שנ' — הוא בא לנדנד!`;
            player.stationFeedbackTimer = 2.6;
            break;
          case 'nag_penalty':
            applyScoreDelta(-PENALTIES.nagTick);
            player.partyJoy = Math.max(0, player.partyJoy - PENALTIES.nagTickJoy);
            addFrameLabel(`-${PENALTIES.nagTick}`, guest.x, guest.y, '#fca5a5');
            break;
          case 'gave_up':
            applyScoreDelta(-PENALTIES.nagGaveUp);
            player.partyJoy = Math.max(0, player.partyJoy - PENALTIES.nagGaveUpJoy);
            addFrameLabel(`-${PENALTIES.nagGaveUp}`, guest.x, guest.y, '#f87171', '😒 ויתר על המגנט');
            guest.guestActivity = 'seated';
            guest.activityCooldown = 8;
            break;
          case 'delivered_on_time':
            applyScoreDelta(SCORE_REWARDS.onTimeDelivery);
            guest.celebrateTimer = 1.6;
            addFrameLabel(`+${SCORE_REWARDS.onTimeDelivery}`, guest.x, guest.y, '#4ade80', '🧲 המגנט הגיע בזמן!');
            spawnParticles(guest.x, guest.y, 14, '#4ade80', 110, 36);
            break;
          case 'delivered_late':
            guest.celebrateTimer = 1.0;
            break;
          default:
            break;
        }
      }
    };

    // Step 3 at Tripod Board next to Dancefloor: Stick cut magnets onto the Tripod Whiteboard
    const stickMagnetsOnBoard = () => {
      if (player.cutMagnetsInHand <= 0) {
        player.stationFeedbackText = 'אין לך מגנטים חתוכים ביד! גש לעמדת המגנטים בפינה לפתח ולחתוך 🖨️✂️';
        player.stationFeedbackTimer = 2.5;
        sound.playDanceBump();
        return;
      }

      const batch = player.cutMagnetsInHand;
      player.cutMagnetsInHand = 0;
      magnetsPrintedThisWave += batch;
      totalMagnetsAllWaves += batch;
      availableMagnetsOnBoard += batch;

      combo += batch;
      comboTimer = 5.5;
      sound.playBoardStick();
      sound.playKill();
      sound.playComboChime(combo);

      const startX = player.x;
      const startY = player.y;
      pendingBoardSticks += batch;
      for (let i = 0; i < batch; i++) {
        const launchMagnet = () => {
          pendingBoardSticks = Math.max(0, pendingBoardSticks - 1);
          sound.playBoardStick();
          spawnFlyingMagnet(
            startX,
            startY,
            TRIPOD_BOARD_POS.x + ((i % 2) === 0 ? -6.5 : 6.5),
            TRIPOD_BOARD_POS.y + 2,
            i === 0
          );
        };
        if (i === 0) {
          launchMagnet();
        } else {
          scheduleTimeout(launchMagnet, i * 75);
        }
      }

      // Match the delivered magnets back to the guests in those photos (oldest photos first)
      const delivered = magnetLedger.deliver(batch);
      for (const entry of delivered) {
        if (entry.guestId == null) continue;
        const owner = guests.find((g) => g.id === entry.guestId);
        if (!owner?.behavior) continue;
        const res = onMagnetDelivered(owner.behavior, Math.random);
        owner.behavior = res.state;
        if (res.events.length) applyBehaviorEvents(owner, res.events);
      }

      const deliveryEval = evaluateGuestJoyFromMagnetDelivery({
        batchCount: batch,
        deliveryTracker: magnetDeliveryTracker,
      });

      const gainedScore = batch * 150 + combo * 45 + deliveryEval.scoreBonus;
      score += gainedScore;
      bestScore = Math.max(bestScore, score);

      player.partyJoy = Math.min(100, player.partyJoy + deliveryEval.joyDelta);
      const frameCfg = MAGNET_FRAMES[selectedFrameRef.current];
      player.stationFeedbackText = deliveryEval.feedbackHe;
      player.stationFeedbackTimer = 3.5;

      // Reset delivery SLA timer for the next batch if all items are delivered
      const remainingPending = player.photosInCamera + player.transferBatch + player.photosOnComputer + player.uncutSheetsAtStation + player.cutMagnetsInHand;
      magnetDeliveryTracker =
        remainingPending > 0
          ? {
              ...createInitialMagnetDeliveryTracker(),
              pendingCount: remainingPending,
            }
          : createInitialMagnetDeliveryTracker();

      spawnParticles(TRIPOD_BOARD_POS.x, TRIPOD_BOARD_POS.y, 38, frameCfg.borderColor, 170, 55);
    };

    // Context-sensitive [E] / Action Trigger handler
    const executeStationProduction = () => {
      const nowMs = performance.now();
      if (nowMs - lastStationExecMs < 120) return;
      lastStationExecMs = nowMs;
      keysJustPressed.delete('KeyE');

      // 1. If near the Tripod Magnet Board and holding cut magnets -> Stick them onto the board!
      if (player.isNearBoard && player.cutMagnetsInHand > 0) {
        stickMagnetsOnBoard();
        return;
      }

      // 2. If near the Far-Corner Workstation:
      if (player.isNearStation) {
        const stationAction = chooseWorkstationAction({
          isTransferring: player.transferAnimTimer > 0,
          uncutSheetsAtStation: player.uncutSheetsAtStation,
          photosOnComputer: player.photosOnComputer,
          photosInCamera: player.photosInCamera,
        });
        if (stationAction === 'cut') {
          cutAtWorkstation();
          return;
        }
        if (stationAction === 'busy_transfer' || stationAction === 'transfer') {
          transferCardToComputer();
          return;
        }
        if (stationAction === 'print') {
          developAtWorkstation();
          return;
        }
        player.stationFeedbackText =
          player.cutMagnetsInHand > 0
            ? `יש לך ${player.cutMagnetsInHand} מגנטים חתוכים ביד! רוץ ללוח המגנטים ליד הרחבה להדביק אותם! 🧲🏃‍♂️`
            : 'צלם קודם אורחים ברחבה ובשולחנות ואז בוא לפתח ולחתוך! 📸';
        player.stationFeedbackTimer = 2.5;
        sound.playDanceBump();
        return;
      }

      // 3. If near the Tripod Magnet Board without cut magnets in hand:
      if (player.isNearBoard) {
        if (availableMagnetsOnBoard > 0) {
          callGuestsToBoard();
        } else {
          player.stationFeedbackText =
            player.photosInCamera > 0 || player.photosOnComputer > 0 || player.uncutSheetsAtStation > 0
              ? 'גש לעמדת המגנטים בפינה הימנית לפתח ולחתוך את התמונות! 🖨️✂️'
              : 'צלם אורחים ברחבה, פתח וחתוך בעמדה בפינה, ואז הדבק כאן על הלוח! 📸🧲';
          player.stationFeedbackTimer = 2.6;
          sound.playDanceBump();
        }
        return;
      }
    };

    triggerStationExternalRef.current = () => {
      executeStationProduction();
    };

    triggerDevelopExternalRef.current = () => {
      developAtWorkstation();
    };

    triggerCutExternalRef.current = () => {
      cutAtWorkstation();
    };

    // Option for guests to take their souvenir magnet from the easel board
    const callGuestsToBoard = () => {
      if (availableMagnetsOnBoard <= 0) {
        player.stationFeedbackText = 'הלוח ריק כרגע! צלם אורחים, פתח וחתוך בעמדה בפינה והדבק על הלוח 📸';
        player.stationFeedbackTimer = 2.5;
        sound.playDanceBump();
        return;
      }

      // Find guests who haven't taken a magnet yet
      const eligible = guests.filter((g) => !g.hasMagnet && !g.seekingMagnet);
      if (eligible.length === 0) {
        player.stationFeedbackText = 'כל האורחים ברחבה כבר קיבלו את המגנט שלהם! איזה יופי 🎉';
        player.stationFeedbackTimer = 2.5;
        return;
      }

      // Dispatch guests to the board
      const countToDispatch = Math.min(availableMagnetsOnBoard, eligible.length, 3);
      for (let i = 0; i < countToDispatch; i++) {
        const guest = eligible[i];
        guest.seekingMagnet = true;
        guest.speechBubbleText = '🧲 למגנט!';
        guest.wantsPhotoTimer = 1.4;
      }

      sound.playFanfare(false);
      player.stationFeedbackText = `קראת לאורחים! ${countToDispatch} אורחים רצים לקחת מגנטים 🧲`;
      player.stationFeedbackTimer = 3.0;
      spawnParticles(TRIPOD_BOARD_POS.x, TRIPOD_BOARD_POS.y, 25, '#fbbf24', 120, 60);
    };

    triggerCallGuestsExternalRef.current = () => {
      callGuestsToBoard();
    };

    // Option for player to take a souvenir magnet directly from the board
    const playerTakesMagnet = () => {
      if (availableMagnetsOnBoard <= 0) {
        player.stationFeedbackText = 'הלוח ריק כרגע! צלם אורחים והדפס מגנטים בעמדה 📸';
        player.stationFeedbackTimer = 2.5;
        sound.playDanceBump();
        return;
      }

      availableMagnetsOnBoard--;
      magnetsTakenByGuests++;
      score += 300;
      bestScore = Math.max(bestScore, score);
      player.partyJoy = Math.min(100, player.partyJoy + 20);
      sound.playFanfare(true);
      player.stationFeedbackText = 'לקחת מגנט מזכרת מושלם מהלוח! 🧲✨ (+300 נקודות)';
      player.stationFeedbackTimer = 3.0;
      spawnParticles(player.x, player.y, 24, '#fbbf24', 140, 50);
    };

    triggerTakeMagnetExternalRef.current = () => {
      playerTakesMagnet();
    };

    const spawnWave = (waveNum: number) => {
      clearAllTimeouts();
      const cfg = getWaveConfig(waveNum);
      magnetsPrintedThisWave = 0;
      pendingBoardSticks = 0;
      player.photosInCamera = 0;
      player.photosOnComputer = 0;
      player.uncutSheetsAtStation = 0;
      player.cutMagnetsInHand = 0;
      player.cameraOnDesk = false;
      player.transferAnimTimer = 0;
      player.transferBatch = 0;
      trackTimeRemaining = cfg.trackDurationSec;

      // Spawn first VIP Moment right away so the hall feels alive!
      vipEvent = createVipEvent(vipEventSeq++);
      nextVipCooldown = 5.0;
      magnetDeliveryTracker = createInitialMagnetDeliveryTracker();

      // Three waiters in black shirts + aprons, running drinks from the island bar to the guests
      waiters = [0, 1, 2].map((i) => {
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
      barVisitTimer = 4;
      magnetLedger.clear();

      // Same guests for the whole event – only reset magnet state for the new wave
      if (waveNum > 1 && guests.length > 0) {
        for (const g of guests) {
          g.hasMagnet = false;
          g.seekingMagnet = false;
          // The production pipeline is emptied between stages, so pending magnet waits are cleared too
          if (g.behavior?.kind === 'impatient') g.behavior = createBehavior('impatient_tracker', Math.random);
        }
        return;
      }

      reputation = 0;
      vipCouple = spawnVipCouple();

      guests = [];
      const outfits = characterConfigRef.current.guestOutfits;

      // ======================================================================
      // SPAWN 20 WEDDING GUESTS WITH 80% DANCING / 10% SEATED / 10% RECRUITING
      // - Every guest has an assigned table seat (if the party gets boring)
      //   AND a social cluster + optional dance partner on the dance floor!
      // - At wave start (high joy):
      //   * 16 guests (80%) are dancing in place in 4 social clusters (with partners & friends)
      //   * 2 guests (10%) are seated at banquet tables (Table 1 & Table 3)
      //   * 2 guests (10%) are approaching those tables trying to drag the seated guests to dance!
      // ======================================================================
      // Seats along the long banquet tables (far side faces the viewer, near side faces away)
      const tableSeatsTemplate = LONG_TABLE_SEATS.map((st) => ({
        dx: st.dx,
        dy: st.dy,
        dir: st.dir as IsoDirection,
      }));

      const totalGuests = 20;
      const baseId = nextGuestId;
      nextGuestId += totalGuests;
      let cumulativeArrivalDelay = 0;

      for (let i = 0; i < totalGuests; i++) {
        const guestId = baseId + i;
        const table = BANQUET_TABLES[i % BANQUET_TABLES.length];
        const seatIdx = Math.floor(i / BANQUET_TABLES.length) % tableSeatsTemplate.length;
        const seat = tableSeatsTemplate[seatIdx];
        const seatX = table.wx + seat.dx;
        const seatY = table.wy + seat.dy;

        // Social cluster assignment (4 clusters of 5 guests each)
        const clusterIdx = i % DANCE_CLUSTER_CENTERS.length;
        const memberSlot = Math.floor(i / DANCE_CLUSTER_CENTERS.length);

        // Pair up slots (0,1) and (2,3) in each cluster as dance partners; slot 4 is solo in the group circle
        let partnerId: number | null = null;
        let isPartnerSecond = false;
        if (memberSlot === 0 || memberSlot === 2) {
          partnerId = guestId + DANCE_CLUSTER_CENTERS.length;
          isPartnerSecond = false;
        } else if (memberSlot === 1 || memberSlot === 3) {
          partnerId = guestId - DANCE_CLUSTER_CENTERS.length;
          isPartnerSecond = true;
        }

        const spot = pickNextSocialDanceSpot({
          clusterCenters: DANCE_CLUSTER_CENTERS,
          currentClusterIdx: clusterIdx,
          memberSlot,
          hasPartner: partnerId !== null,
          isPartnerSecond,
          switchCluster: false,
        });

        // Initial 80% / 10% / 10% breakdown:
        // i = 0, 2 (2 guests = 10%): Seated at Table 1 and Table 3
        // i = 1, 3 (2 guests = 10%): Recruiters walking to pull i=0 and i=2 onto the dancefloor
        // i = 4..19 (16 guests = 80%): Dancing in social groups on the dancefloor (staggered entry from spawn points!)
        const isInitiallySeated = i === 0 || i === 2;
        const isInitiallyRecruiting = i === 1 || i === 3;
        const guestActivity: 'dancing' | 'recruiting' | 'seated' = isInitiallySeated
          ? 'seated'
          : isInitiallyRecruiting
          ? 'recruiting'
          : 'dancing';
        const recruitTargetId = i === 1 ? baseId + 0 : i === 3 ? baseId + 2 : null;

        // Staggered arrival: every dancer starts at their current seat and receives a 0.8s–2.5s random delay after the previous guest
        const isStaggeredEntry = !isInitiallySeated && !isInitiallyRecruiting;
        if (isStaggeredEntry) {
          cumulativeArrivalDelay += 0.8 + Math.random() * 1.7;
        }

        const startX = isInitiallyRecruiting ? seatX + 34 : seatX;
        const startY = isInitiallyRecruiting ? seatY + 14 : seatY;

        const outfitIndex = (i + waveNum * 2) % outfits.length;
        const style = outfits[outfitIndex];
        let danceMove: WeddingGuestActor['danceMove'] = 'bounce';
        if (isInitiallySeated) {
          danceMove = i % 2 === 0 ? 'toasting' : 'eating';
        } else if (isInitiallyRecruiting || i % 3 === 1) {
          danceMove = 'wave';
        } else if (i % 4 === 0) {
          danceMove = 'spin';
        }

        const archetype: EnemyArchetype =
          i % 5 === 0 ? 'charger' : i % 2 === 0 ? 'kiter' : 'swarmer';

        guests.push({
          id: guestId,
          role: isInitiallySeated ? 'table_guest' : 'dancer',
          tableId: table.id,
          seatAngle: seatIdx,
          outfitIndex,
          archetype,
          x: startX,
          y: startY,
          homeX: isInitiallySeated ? seatX : spot.spotX,
          homeY: isInitiallySeated ? seatY : spot.spotY,
          seatX,
          seatY,
          seatDir: seat.dir,
          danceSpotX: spot.spotX,
          danceSpotY: spot.spotY,
          clusterIdx,
          memberSlot,
          partnerId,
          isPartnerSecond,
          repositionTimer: 4.5 + (i % 6) * 1.1,
          guestActivity,
          recruitTargetId,
          recruitProgressTimer: 0,
          arrivalDelayTimer: isStaggeredEntry ? cumulativeArrivalDelay : 0,
          isEnteringFloor: isStaggeredEntry,
          vx: 0,
          vy: 0,
          speed: 44 + (i % 3) * 8,
          dancePhase: Math.random() * Math.PI * 2,
          danceTempo: 3.0 + (i % 4) * 0.35,
          danceMove,
          direction: seat.dir,
          strideDist: 0,
          outfitColor: style.outfit,
          hairColor: style.hair,
          isDress: style.isDress,
          hatType: style.hat,
          hasMagnet: false,
          photoCount: 0,
          celebrateTimer: 0,
          hitFlashTimer: 0,
          wantsPhotoTimer: isInitiallyRecruiting ? 1.4 : 0,
          speechBubbleText: isInitiallyRecruiting
            ? '🙌 בוא לרקוד!'
            : null,
          poseTimer: 0,
          isSeated: !isInitiallyRecruiting,
          isSmoker: i % 4 === 1,
        });
      }

      // Personalities: potential couples are whole dance pairs, then attention seekers & magnet trackers
      const partnerPairs: Array<[number, number]> = [];
      guests.forEach((g, idx) => {
        if (g.partnerId != null && !g.isPartnerSecond) {
          const j = guests.findIndex((o) => o.id === g.partnerId);
          if (j >= 0) partnerPairs.push([idx, j]);
        }
      });
      const types = assignGuestTypes({ count: guests.length, partnerPairs, rng: Math.random });
      guests.forEach((g, idx) => {
        g.guestType = types[idx];
        g.behavior = createBehavior(types[idx], Math.random);
        g.coupleId = null;
      });
      for (const [a, b] of partnerPairs) {
        if (types[a] === 'potential_couple' && types[b] === 'potential_couple') {
          const cid = Math.min(guests[a].id, guests[b].id);
          guests[a].coupleId = cid;
          guests[b].coupleId = cid;
        }
      }
    };

    // ======================================================================
    // THE BRIDE & GROOM — unique VIP actors (cast sheet sprites)
    // ======================================================================
    const COUPLE_CHUPPAH_SPOTS = [
      { x: 128, y: -162 }, // bride
      { x: 112, y: -175 }, // groom
    ];
    const COUPLE_ROAM_SPOTS = [
      { x: 0, y: 2 }, // middle of the dance floor
      { x: -40, y: -30 },
      { x: 40, y: 34 },
      { x: 30, y: -40 },
    ];
    let coupleRoamIdx = 0;
    /** True while the bride and groom are mingling separately. */
    let coupleSplit = false;
    /** Chance that the next stop is a short separate mingle (they rejoin right after). */
    const COUPLE_SPLIT_CHANCE = 0.3;
    const isCoupleAtChuppah = () =>
      vipCouple.length === 2 &&
      vipEvent?.kind === 'chuppah_kiss' &&
      vipCouple.every(
        (m, i) => Math.hypot(m.x - COUPLE_CHUPPAH_SPOTS[i].x, m.y - COUPLE_CHUPPAH_SPOTS[i].y) < 8
      );
    function updateVipCouple(dt: number) {
      const [bride, groom] = vipCouple;
      if (!bride || !groom) return;
      const chuppahMoment = Boolean(vipEvent && vipEvent.kind === 'chuppah_kiss' && vipEvent.remainingSec > 0);
      if (chuppahMoment) coupleSplit = false; // the big moments are always together
      bride.vipTimer = (bride.vipTimer ?? 0) - dt;
      if (!chuppahMoment && bride.vipTimer <= 0) {
        // Next stop: alternate dance-floor spots with visits to a banquet table or the bar
        coupleRoamIdx++;
        let tx: number;
        let ty: number;
        // Mostly together; now and then they mingle separately for a short while
        // (never twice in a row, and always together for the big moments)
        const wasSplit = coupleSplit;
        coupleSplit = !wasSplit && coupleRoamIdx > 1 && Math.random() < COUPLE_SPLIT_CHANCE;
        if (coupleSplit) {
          const tbl = BANQUET_TABLES[Math.floor(Math.random() * BANQUET_TABLES.length)];
          const bar = BAR_GUEST_SPOTS[Math.floor(Math.random() * BAR_GUEST_SPOTS.length)];
          tx = tbl.wx + 30;
          ty = tbl.wy + 26;
          groom.vipTargetX = bar.x + 14;
          groom.vipTargetY = bar.y + 18;
          bride.vipTargetX = tx;
          bride.vipTargetY = ty;
          bride.vipTimer = 9 + Math.random() * 5;
          bride.speechBubbleText = '👰 קופצת לחברות!';
          bride.wantsPhotoTimer = 2;
          groom.speechBubbleText = '🤵 לחיים עם החבר׳ה!';
          groom.wantsPhotoTimer = 2;
          return;
        }
        if (coupleRoamIdx % 3 === 1) {
          const tbl = BANQUET_TABLES[Math.floor(Math.random() * BANQUET_TABLES.length)];
          tx = tbl.wx + 30;
          ty = tbl.wy + 26;
        } else if (coupleRoamIdx % 6 === 5) {
          const spot = BAR_GUEST_SPOTS[BAR_GUEST_SPOTS.length - 1];
          tx = spot.x + 14;
          ty = spot.y + 18;
        } else {
          const spot = COUPLE_ROAM_SPOTS[coupleRoamIdx % COUPLE_ROAM_SPOTS.length];
          tx = spot.x;
          ty = spot.y;
        }
        bride.vipTargetX = tx;
        bride.vipTargetY = ty;
        bride.vipTimer = 11 + Math.random() * 7;
        if (Math.random() < 0.6) {
          const lines = DIALOGUE_HE.brideGroomLines;
          bride.speechBubbleText = lines[Math.floor(Math.random() * lines.length)];
          bride.wantsPhotoTimer = 2;
        }
      }
      vipCouple.forEach((m, i) => {
        m.dancePhase += dt * m.danceTempo;
        m.hitFlashTimer = Math.max(0, m.hitFlashTimer - dt);
        m.celebrateTimer = Math.max(0, m.celebrateTimer - dt);
        if ((m.flashTintTimer ?? 0) > 0) m.flashTintTimer = Math.max(0, (m.flashTintTimer ?? 0) - dt);
        if (m.speechBubbleText) {
          m.wantsPhotoTimer -= dt;
          if (m.wantsPhotoTimer <= 0) m.speechBubbleText = null;
        }
        const target = chuppahMoment
          ? COUPLE_CHUPPAH_SPOTS[i]
          : coupleSplit && i === 1
          ? { x: groom.vipTargetX ?? 0, y: groom.vipTargetY ?? 0 }
          : { x: (bride.vipTargetX ?? 0) - i * 15, y: (bride.vipTargetY ?? 0) - i * 6 };
        const mv = moveTowardPoint(m, target, 58, dt, 3);
        const stepLen = Math.hypot(mv.x - m.x, mv.y - m.y);
        if (stepLen > 0.01) {
          const isoM = worldToIso(m.x, m.y);
          const isoT = worldToIso(target.x, target.y);
          m.direction = angleToIsoDirection(Math.atan2(isoT.y - isoM.y, isoT.x - isoM.x));
          m.strideDist += stepLen * 1.5;
          m.x = mv.x;
          m.y = mv.y;
        } else {
          m.strideDist += dt * 38;
          if (chuppahMoment) {
            m.direction = 'S';
            m.celebrateTimer = Math.max(m.celebrateTimer, 0.3);
            if (i === 0 && !m.speechBubbleText) {
              m.speechBubbleText = '💍 צלם אותנו בחופה!';
              m.wantsPhotoTimer = 3;
            }
          } else {
            // Dance with each other; turn to the camera when the photographer is close
            const other = vipCouple[1 - i];
            const near = Math.hypot(player.x - m.x, player.y - m.y) < 90;
            const fx = near ? player.x : other.x;
            const fy = near ? player.y : other.y;
            const isoM = worldToIso(m.x, m.y);
            const isoF = worldToIso(fx, fy);
            m.direction = angleToIsoDirection(Math.atan2(isoF.y - isoM.y, isoF.x - isoM.x));
          }
        }
      });
    }

    function spawnVipCouple(): WeddingGuestActor[] {
      const make = (type: 'bride' | 'groom', id: number, x: number, y: number): WeddingGuestActor => {
        const look = CAST_LOOKS[type];
        return {
          id,
          role: 'dancer',
          outfitIndex: 0,
          archetype: 'charger',
          x,
          y,
          homeX: x,
          homeY: y,
          vx: 0,
          vy: 0,
          speed: 50,
          dancePhase: Math.random() * Math.PI * 2,
          danceTempo: 3.2,
          danceMove: 'bounce',
          direction: 'S',
          strideDist: 0,
          outfitColor: look.palette.outfit,
          hairColor: look.palette.hair,
          isDress: look.palette.isDress,
          hatType: type === 'bride' ? 'veil' : 'none',
          hasMagnet: true,
          photoCount: 0,
          celebrateTimer: 0,
          hitFlashTimer: 0,
          wantsPhotoTimer: 0,
          speechBubbleText: null,
          poseTimer: 0,
          isSeated: false,
          guestActivity: 'dancing',
          guestType: type,
          behavior: { kind: 'none' },
          castLook: type,
          vipTargetX: COUPLE_ROAM_SPOTS[0].x,
          vipTargetY: COUPLE_ROAM_SPOTS[0].y,
          vipTimer: 10,
        };
      };
      return [make('bride', 9001, 6, 4), make('groom', 9002, -8, 2)];
    }

    const resetRun = () => {
      clearInputs();
      player.x = 10;
      player.y = 65;
      player.vx = 0;
      player.vy = 0;
      player.partyJoy = 90;
      player.ghostJoy = 90;
      crowdJoy = 90;
      crowdMoveCooldown = 0;
      player.dashCharge = 1.0;
      player.dashBufferTimer = 0;
      player.dashActiveTimer = 0;
      player.shootCooldown = 0;
      player.shootAnimTimer = 0;
      player.bumpFlashTimer = 0;
      player.scaleX = 1;
      player.scaleY = 1;
      player.scaleVelX = 0;
      player.scaleVelY = 0;
      player.idleTime = 0;
      player.wasMoving = false;
      player.lean = 0;
      player.strideDist = 0;
      player.direction = 'NE';
      player.animState = 'idle';
      player.photosInCamera = 0;
      player.photosOnComputer = 0;
      player.cameraOnDesk = false;
      player.atCutter = false;
      player.transferAnimTimer = 0;
      player.transferAnimDuration = 0;
      player.transferBatch = 0;
      player.uncutSheetsAtStation = 0;
      player.cutMagnetsInHand = 0;
      player.isNearStation = false;
      player.isSeatedAtStation = false;
      player.wasNearStation = false;
      player.sitGraceTimer = 0;
      player.standUpCooldown = 0;
      player.isNearBoard = false;
      player.stationActionTimer = 0;
      player.printerAnimTimer = 0;
      player.cutterAnimTimer = 0;
      player.stationActionStep = 0;
      player.stationFeedbackText = null;
      player.stationFeedbackTimer = 0;

      score = 500;
      combo = 0;
      comboTimer = 0;
      wave = 1;
      magnetsPrintedThisWave = 0;
      totalMagnetsAllWaves = 0;
      availableMagnetsOnBoard = 0;
      pendingBoardSticks = 0;
      magnetsTakenByGuests = 0;
      vipEventSeq = 0;
      upgradeLevels = {
        turbo_station: 0,
        pro_sdcard: 0,
        sneakers: 0,
      };
      hitstopRemaining = 0;
      cameraTrauma = 0;
      pendingOutcome = null;
      endBeatTimer = 0;
      discoBeatPhase = 0;

      for (const p of particles) p.active = false;
      for (const pr of projectiles) pr.active = false;
      flashEngine.clear();
      for (const m of flyingMagnets) m.active = false;
      for (const th of flyingThumbs) th.active = false;

      spawnWave(1);
    };

    resetRun();
    simRef.current = { resetRun };

    const findFrame = (
      dir: IsoDirection,
      st: IsoAnimState
    ): ExtractedSpriteFrame | undefined => {
      const frames = atlasRef.current.frames;
      return (
        frames.find((f) => f.direction === dir && f.state === st) || frames[0]
      );
    };

    // Helper to draw an isometric 3D box with optional zBase elevation
    const drawIsoBox = (
      originX: number,
      originY: number,
      wx: number,
      wy: number,
      w: number,
      d: number,
      h: number,
      topColor: string,
      leftColor: string,
      rightColor: string,
      strokeColor = '#1c1410',
      zBase = 0
    ) => {
      const p01 = worldToIso(wx, wy + d, zBase);
      const p11 = worldToIso(wx + w, wy + d, zBase);
      const t11 = worldToIso(wx + w, wy + d, zBase + h);
      const t01 = worldToIso(wx, wy + d, zBase + h);

      const p10 = worldToIso(wx + w, wy, zBase);
      const t10 = worldToIso(wx + w, wy, zBase + h);
      const t00 = worldToIso(wx, wy, zBase + h);

      ctx.lineWidth = 2;
      ctx.strokeStyle = strokeColor;

      // Left face
      ctx.fillStyle = leftColor;
      ctx.beginPath();
      ctx.moveTo(originX + p01.x, originY + p01.y);
      ctx.lineTo(originX + p11.x, originY + p11.y);
      ctx.lineTo(originX + t11.x, originY + t11.y);
      ctx.lineTo(originX + t01.x, originY + t01.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right face
      ctx.fillStyle = rightColor;
      ctx.beginPath();
      ctx.moveTo(originX + p11.x, originY + p11.y);
      ctx.lineTo(originX + p10.x, originY + p10.y);
      ctx.lineTo(originX + t10.x, originY + t10.y);
      ctx.lineTo(originX + t11.x, originY + t11.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top face
      ctx.fillStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(originX + t00.x, originY + t00.y);
      ctx.lineTo(originX + t10.x, originY + t10.y);
      ctx.lineTo(originX + t11.x, originY + t11.y);
      ctx.lineTo(originX + t01.x, originY + t01.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    // Helper to draw a richly detailed pixel/isometric Wedding Guest (Dancing or Seated)
    const drawWeddingGuestSprite = (
      screenX: number,
      screenY: number,
      guest: WeddingGuestActor,
      stride: number,
      alpha = 1
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(screenX), Math.round(screenY));
      const gScale = characterConfigRef.current.guestScale || 1;
      ctx.scale(gScale, gScale);

      const isSeated = guest.isSeated;
      const isCelebrating = guest.celebrateTimer > 0 || guest.hitFlashTimer > 0;
      const isVipTarget =
        vipEvent !== null &&
        vipEvent.remainingSec > 0 &&
        ((vipEvent.kind === 'table_toast' && guest.tableId === vipEvent.targetTableId) ||
          (vipEvent.kind === 'hora_frenzy' && guest.role === 'dancer'));

      // Soft multi-layered ground shadow
      ctx.fillStyle = 'rgba(15, 10, 8, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 1, isSeated ? 12 : 14, isSeated ? 6 : 7, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isVipTarget) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 1, 16, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Body bobbing & dance groove sway
      const danceHop = !isSeated && isCelebrating ? Math.abs(Math.sin(stride * 0.42)) * 7.5 : 0;
      const grooveSway = !isSeated ? Math.sin(stride * 0.18 + guest.id) * 1.8 : 0;
      const bob = isSeated
        ? Math.sin(stride * 0.15 + guest.id) * 1.4
        : Math.sin(stride * 0.28 + guest.id) * 3.2 - danceHop;

      const seatedYOffset = isSeated ? 10 : 0;

      // Clear acrylic ghost chair under a seated guest
      if (isSeated) {
        drawGhostChair(ctx, 0, 0, guest.direction !== 'NE' && guest.direction !== 'N' && guest.direction !== 'NW');
      }

      const isFlashBlinded = (guest.flashTintTimer ?? 0) > 0;
      let headX = grooveSway * 0.6;
      let headY = -49 + bob + seatedYOffset;

      // Standing guests, bride & groom: drawn from the wedding cast sprite sheet
      const castHit =
        !isSeated && guest.castLook && castSheet ? getCastFrame(castSheet, guest.castLook, guest.direction) : null;
      if (castHit && castSheet) {
        const look = CAST_LOOKS[guest.castLook as CastLookId];
        const fr = castHit.frame;
        const k = look.height / fr.height;
        const dw = fr.width * k;
        const dh = fr.height * k;
        const walkBob = Math.abs(Math.sin(stride * 0.28 + guest.id)) * 1.6;
        const lift = danceHop * 0.8 + walkBob;
        const squash = 1 + Math.sin(stride * 0.28 + guest.id) * 0.018;
        ctx.save();
        ctx.rotate(grooveSway * 0.012);
        ctx.translate(0, -lift);
        ctx.scale(castHit.flip ? -1 : 1, squash);
        // Crisp pixels when the sprite is enlarged on screen; smooth only when it's shrunk
        const screenScale = Math.abs(ctx.getTransform().a) * k;
        ctx.imageSmoothingEnabled = screenScale < 1;
        ctx.drawImage(
          castSheet.canvas,
          fr.x,
          fr.y,
          fr.width,
          fr.height,
          Math.round(-fr.anchorX * dw),
          Math.round(-dh),
          Math.round(dw),
          Math.round(dh)
        );
        ctx.restore();
        headX = grooveSway * 0.6;
        headY = -look.height + 9 - lift;
      } else {
      // Stepping Dance Shoes / Legs
      const leftStep = !isSeated ? Math.sin(stride * 0.32) * 2.5 : 0;
      const rightStep = !isSeated ? -Math.sin(stride * 0.32) * 2.5 : 0;
      ctx.fillStyle = '#18181b';
      if (!isSeated) {
        ctx.fillRect(-7.5 + grooveSway * 0.3, -5 + leftStep, 5.5, 5);
        ctx.fillRect(2 + grooveSway * 0.3, -5 + rightStep, 5.5, 5);
        // Shoe shine highlight
        ctx.fillStyle = '#52525b';
        ctx.fillRect(-6.5 + grooveSway * 0.3, -4 + leftStep, 2, 1.5);
        ctx.fillRect(3 + grooveSway * 0.3, -4 + rightStep, 2, 1.5);
      } else {
        ctx.fillRect(-6, -4, 4.5, 4);
        ctx.fillRect(1.5, -4, 4.5, 4);
      }

      if (guest.isDress) {
        // Multi-layered Shimmering Evening Gown / Bridal Dress
        const skirtFlare = !isSeated
          ? 14 + Math.sin(stride * 0.25 + guest.id) * 2.2
          : 10.5;
        ctx.fillStyle = guest.outfitColor;
        ctx.strokeStyle = '#1c1410';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-7.5 + grooveSway * 0.5, -37 + bob + seatedYOffset);
        ctx.lineTo(7.5 + grooveSway * 0.5, -37 + bob + seatedYOffset);
        ctx.lineTo(skirtFlare + grooveSway, -3 + (isSeated ? 0 : bob * 0.2));
        ctx.lineTo(-skirtFlare + grooveSway, -3 + (isSeated ? 0 : bob * 0.2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Dress pleated fold lines & belt sash
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-3 + grooveSway * 0.5, -26 + bob + seatedYOffset);
        ctx.lineTo(-5 + grooveSway, -4 + (isSeated ? 0 : bob * 0.2));
        ctx.moveTo(3 + grooveSway * 0.5, -26 + bob + seatedYOffset);
        ctx.lineTo(5 + grooveSway, -4 + (isSeated ? 0 : bob * 0.2));
        ctx.stroke();

        // Gold/Silver Waist Sash & Pearl Necklace
        ctx.fillStyle = guest.hatType === 'veil' ? '#fde047' : 'rgba(255, 255, 255, 0.55)';
        ctx.fillRect(-7 + grooveSway * 0.5, -27 + bob + seatedYOffset, 14, 2.5);

        if (guest.hatType === 'veil') {
          // Lush Bridal Rose Bouquet
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(grooveSway * 0.6, -23 + bob + seatedYOffset, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fb7185';
          ctx.beginPath();
          ctx.arc(-2.5 + grooveSway * 0.6, -24.5 + bob + seatedYOffset, 3, 0, Math.PI * 2);
          ctx.arc(2.5 + grooveSway * 0.6, -23 + bob + seatedYOffset, 2.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff1f2';
          ctx.beginPath();
          ctx.arc(grooveSway * 0.6, -21.5 + bob + seatedYOffset, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Tailored Tuxedo / Suit Trousers & Jacket with Lapels and Pocket Square
        ctx.fillStyle = guest.outfitColor;
        ctx.strokeStyle = '#1c1410';
        ctx.lineWidth = 1.7;
        if (!isSeated) {
          ctx.fillRect(-7 + grooveSway * 0.4, -23 + bob + leftStep * 0.4, 6, 19);
          ctx.strokeRect(-7 + grooveSway * 0.4, -23 + bob + leftStep * 0.4, 6, 19);
          ctx.fillRect(1 + grooveSway * 0.4, -23 + bob + rightStep * 0.4, 6, 19);
          ctx.strokeRect(1 + grooveSway * 0.4, -23 + bob + rightStep * 0.4, 6, 19);
        } else {
          ctx.fillRect(-7, -18 + bob, 14, 14);
          ctx.strokeRect(-7, -18 + bob, 14, 14);
        }

        // Jacket Torso
        ctx.fillStyle = guest.outfitColor;
        ctx.beginPath();
        ctx.roundRect(-10.5 + grooveSway * 0.5, -40 + bob + seatedYOffset, 21, 18.5, [3]);
        ctx.fill();
        ctx.stroke();

        // Crisp Dress Shirt V-Front
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(-4.5 + grooveSway * 0.5, -40 + bob + seatedYOffset);
        ctx.lineTo(4.5 + grooveSway * 0.5, -40 + bob + seatedYOffset);
        ctx.lineTo(grooveSway * 0.5, -29 + bob + seatedYOffset);
        ctx.closePath();
        ctx.fill();

        // Silk Tie / Bowtie & Pocket Square
        ctx.fillStyle = guest.id % 2 === 0 ? '#dc2626' : '#f59e0b';
        ctx.fillRect(-1.5 + grooveSway * 0.5, -38.5 + bob + seatedYOffset, 3, 6.5);
        // Pocket square
        ctx.fillStyle = '#fda4af';
        ctx.fillRect(4.5 + grooveSway * 0.5, -35 + bob + seatedYOffset, 3.5, 2);
      }

      // Expressive Animated Arms (Dancing, Waving, or Toasting with Crystal Glass)
      const armSwing = Math.sin(stride * 0.35 + guest.id) * 6;
      ctx.strokeStyle = guest.isDress ? '#eab696' : guest.outfitColor;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';

      if (isCelebrating || isVipTarget) {
        // Both arms raised high in celebration!
        ctx.beginPath();
        ctx.moveTo(-9 + grooveSway * 0.5, -35 + bob + seatedYOffset);
        ctx.lineTo(-15 + grooveSway * 0.5, -50 + bob + seatedYOffset);
        ctx.moveTo(9 + grooveSway * 0.5, -35 + bob + seatedYOffset);
        ctx.lineTo(15 + grooveSway * 0.5, -50 + bob + seatedYOffset);
        ctx.stroke();

        // Raised champagne flute in right hand
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.fillRect(13 + grooveSway * 0.5, -57 + bob + seatedYOffset, 4, 7);
        ctx.strokeRect(13 + grooveSway * 0.5, -57 + bob + seatedYOffset, 4, 7);
      } else if (isSeated) {
        ctx.beginPath();
        ctx.moveTo(8, -32 + bob + seatedYOffset);
        ctx.lineTo(12, -41 + bob + seatedYOffset);
        ctx.stroke();
        // Crystal Wine Glass
        ctx.fillStyle = '#be123c';
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(12.5, -45 + bob + seatedYOffset, 3.2, 0, Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        // Dancing arms (smokers at the bar hold the cigarette up by the face)
        const smokingNow = Boolean(guest.isSmoker && guest.guestActivity === 'bar' && guest.atBarArrived);
        ctx.beginPath();
        ctx.moveTo(-9.5 + grooveSway * 0.5, -35 + bob);
        if (smokingNow) {
          ctx.lineTo(-8 + grooveSway * 0.5, -44 + bob);
        } else {
          ctx.lineTo(-14 + grooveSway * 0.5, -28 + bob - armSwing * 0.5);
        }
        ctx.moveTo(9.5 + grooveSway * 0.5, -35 + bob);
        ctx.lineTo(14 + grooveSway * 0.5, -32 + bob + armSwing * 0.5);
        ctx.stroke();
        if ((guest.drinkTimer ?? 0) > 0) {
          drawHeldDrink(ctx, 14 + grooveSway * 0.5, -32 + bob + armSwing * 0.5, guest.drinkKind ?? guest.id);
        }
        if (smokingNow) {
          drawCigaretteSmoke(ctx, -9 + grooveSway * 0.5, -45 + bob, discoBeatPhase / 2.8, guest.id);
        }
      }
      ctx.lineCap = 'butt';

      // Head with warm skin tone & rosy cheeks
      ctx.fillStyle = '#eab696';
      ctx.strokeStyle = '#1c1410';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(headX, headY, 8.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Styled Hair (curls/side-part/bun)
      ctx.fillStyle = guest.hairColor;
      ctx.beginPath();
      ctx.arc(headX, headY - 2.5, 9, Math.PI * 0.92, Math.PI * 2.08);
      ctx.fill();
      if (guest.isDress) {
        // Side locks / updo curls
        ctx.beginPath();
        ctx.arc(headX - 7.5, headY - 1, 3.2, 0, Math.PI * 2);
        ctx.arc(headX + 7.5, headY - 1, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rosy Cheeks
      ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
      ctx.beginPath();
      ctx.arc(headX - 4.8, headY + 1.5, 2, 0, Math.PI * 2);
      ctx.arc(headX + 4.8, headY + 1.5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (with camera wink when celebrating, squeezed shut when blinded by a flash)
      ctx.fillStyle = '#1c1410';
      if (isFlashBlinded) {
        ctx.fillRect(headX - 4.4, headY - 1, 3, 1.2);
        ctx.fillRect(headX + 1.6, headY - 1, 3, 1.2);
      } else if (isCelebrating) {
        // Happy squinting/winking eyes ^ ^
        ctx.strokeStyle = '#1c1410';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(headX - 3.2, headY - 1, 1.8, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(headX + 3.2, headY - 1, 1.8, Math.PI, 0);
        ctx.stroke();
      } else {
        ctx.fillRect(headX - 4, headY - 2, 2.2, 2.4);
        ctx.fillRect(headX + 1.8, headY - 2, 2.2, 2.4);
        // Eye specular twinkle
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(headX - 3.5, headY - 1.8, 0.9, 0.9);
        ctx.fillRect(headX + 2.3, headY - 1.8, 0.9, 0.9);
      }

      // Joyful Smile
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.arc(headX, headY + 2.5, isCelebrating ? 3.2 : 2.3, 0, Math.PI);
      ctx.fill();

      // Hats / Bridal Tiara & Flowing Lace Veil
      if (guest.hatType === 'green_top' || guest.hatType === 'black_top') {
        const hatCol = guest.hatType === 'green_top' ? '#16a34a' : '#1e293b';
        const bandCol = guest.hatType === 'green_top' ? '#fbbf24' : '#ef4444';
        ctx.fillStyle = hatCol;
        ctx.strokeStyle = '#1c1410';
        ctx.lineWidth = 1.6;
        ctx.fillRect(headX - 11, headY - 9, 22, 3);
        ctx.strokeRect(headX - 11, headY - 9, 22, 3);
        ctx.fillRect(headX - 7, headY - 20, 14, 11);
        ctx.strokeRect(headX - 7, headY - 20, 14, 11);
        ctx.fillStyle = bandCol;
        ctx.fillRect(headX - 7, headY - 12, 14, 3);
      } else if (guest.hatType === 'cone') {
        // Festive Gold/Velvet Kippah or Party Crown
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#1c1410';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(headX, headY - 6.5, 6, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (guest.hatType === 'veil') {
        // Flowing translucent bridal veil + gold tiara crown
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.moveTo(headX - 7, headY - 6);
        ctx.quadraticCurveTo(headX - 14, headY + 8, headX - 10, headY + 22);
        ctx.lineTo(headX + 10, headY + 22);
        ctx.quadraticCurveTo(headX + 14, headY + 8, headX + 7, headY - 6);
        ctx.closePath();
        ctx.fill();
        // Bridal Tiara
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(headX - 5, headY - 7);
        ctx.lineTo(headX - 2.5, headY - 11);
        ctx.lineTo(headX, headY - 8.5);
        ctx.lineTo(headX + 2.5, headY - 11);
        ctx.lineTo(headX + 5, headY - 7);
        ctx.closePath();
        ctx.fill();
      }

      }

      // Personality markers: potential-couple hearts, nagging magnet tracker, VIP crown ring
      if (guest.guestType === 'potential_couple' && !isSeated) {
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = alpha * (0.55 + 0.35 * Math.sin(stride * 0.2 + guest.id));
        ctx.fillText('💕', headX + 11, headY - 9);
        ctx.globalAlpha = alpha;
      } else if (guest.behavior?.kind === 'impatient' && (guest.behavior.phase === 'waiting' || guest.behavior.phase === 'nagging')) {
        // Patience ring above the head (drains while waiting, pulses red while nagging)
        const b = guest.behavior;
        const frac = b.phase === 'waiting' ? Math.max(0, b.patienceLeft / PATIENCE.timeoutSec) : 0;
        const ry = headY - 15;
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.beginPath();
        ctx.arc(headX + 12, ry, 4.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = b.phase === 'nagging' ? (Math.sin(stride) > 0 ? '#ef4444' : '#fca5a5') : frac > 0.35 ? '#22d3ee' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(headX + 12, ry, 4.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (b.phase === 'nagging' ? 1 : frac));
        ctx.stroke();
        ctx.font = '6px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🧲', headX + 12, ry + 2.2);
      } else if (guest.guestType === 'attention_seeker' && guest.behavior?.kind === 'attention' && guest.behavior.phase === 'seeking') {
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🙋', headX + 12, headY - 10 - Math.abs(Math.sin(stride * 0.5)) * 3);
      }

      // Subtle context-aware floating icon (replaces noisy static FUNNS/SHOW text boxes!)
      if (!isCelebrating && !guest.speechBubbleText && (guest.wantsPhotoTimer > 0 || isVipTarget)) {
        const badgeY = headY - 22 + Math.sin(stride * 0.3) * 2;
        ctx.fillStyle = isVipTarget ? 'rgba(251, 191, 36, 0.95)' : 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = isVipTarget ? '#1c1410' : '#f59e0b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(headX, badgeY, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isVipTarget ? '⭐' : '📸', headX, badgeY + 3);
      }

      // CAUGHT IN THE FLASH: additive white blow-out over the body that fades with the timer
      if (isFlashBlinded) {
        const k = Math.min(1, (guest.flashTintTimer ?? 0) / 0.22);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const blow = ctx.createRadialGradient(headX, headY + 14, 2, headX, headY + 14, 34);
        blow.addColorStop(0, `rgba(255, 255, 255, ${0.75 * k})`);
        blow.addColorStop(0.6, `rgba(255, 250, 230, ${0.35 * k})`);
        blow.addColorStop(1, 'rgba(255, 250, 230, 0)');
        ctx.fillStyle = blow;
        ctx.beginPath();
        ctx.ellipse(headX, headY + 16, 18, 36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // SOUVENIR WEDDING MAGNET: Held proudly with selected frame color!
      if (guest.hasMagnet) {
        const frameCol = MAGNET_FRAMES[selectedFrameRef.current].borderColor;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = frameCol;
        ctx.lineWidth = 1.8;
        ctx.fillRect(10.5, headY - 6, 14, 18);
        ctx.strokeRect(10.5, headY - 6, 14, 18);
        ctx.fillStyle = guest.outfitColor;
        ctx.fillRect(12.5, headY - 4, 10, 10);
        ctx.fillStyle = '#eab696';
        ctx.beginPath();
        ctx.arc(17.5, headY - 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = frameCol;
        ctx.font = '6px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('♥', 17.5, headY + 10.5);
      }

      // CELEBRATION OVERLAY: Compact polaroid frame + micro badge when photographed!
      if (isCelebrating) {
        const frameCol = MAGNET_FRAMES[selectedFrameRef.current].borderColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-14, headY - 16, 28, 56);
        ctx.strokeStyle = frameCol;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-15.5, headY - 17.5, 31, 59);

        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 8px "Heebo", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📸 +1', 0, headY - 21);
      } else if (guest.speechBubbleText && guest.wantsPhotoTimer > 0) {
        // Miniaturized Arcade Speech Bubble with Smooth Alpha Fade-Out
        const fadeAlpha = Math.min(1, guest.wantsPhotoTimer / 0.35);
        ctx.save();
        ctx.globalAlpha = fadeAlpha;
        ctx.font = 'bold 7.5px "Heebo", sans-serif';
        const textW = ctx.measureText(guest.speechBubbleText).width;
        const bw = Math.min(92, Math.max(34, textW + 10));
        const bh = 13;
        const byTop = headY - 28;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.roundRect(-bw * 0.5, byTop, bw, bh, [4]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef3c7';
        ctx.textAlign = 'center';
        ctx.fillText(guest.speechBubbleText, 0, byTop + 9.2);
        ctx.restore();
      }

      ctx.restore();
    };

    let lastTime = performance.now();
    let hudEmitTimer = 0;
    let rafId = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = clampDt(rawDt);

      discoBeatPhase += dt * 2.8;
      // Squash & stretch settles back to 1 on a damped spring (slight wobble = more life)
      const springX = stepScaleSpring(player.scaleX, player.scaleVelX, dt);
      const springY = stepScaleSpring(player.scaleY, player.scaleVelY, dt);
      player.scaleX = springX.scale;
      player.scaleVelX = springX.velocity;
      player.scaleY = springY.scale;
      player.scaleVelY = springY.velocity;
      cameraTrauma = Math.max(0, cameraTrauma - dt * 2.5);

      if (player.ghostJoy > player.partyJoy) {
        player.ghostJoy = Math.max(player.partyJoy, player.ghostJoy - dt * 20);
      }

      if (player.stationFeedbackTimer > 0) {
        player.stationFeedbackTimer = Math.max(0, player.stationFeedbackTimer - dt);
        if (player.stationFeedbackTimer === 0) player.stationFeedbackText = null;
      }

      if (player.stationActionTimer > 0) {
        player.stationActionTimer = Math.max(0, player.stationActionTimer - dt);
      }
      if (player.printerAnimTimer > 0) {
        player.printerAnimTimer = Math.max(0, player.printerAnimTimer - dt);
      }
      if (player.transferAnimTimer > 0) {
        player.transferAnimTimer = Math.max(0, player.transferAnimTimer - dt);
        if (player.transferAnimTimer === 0) finishCardTransfer();
      }
      const stationJobRunning =
        player.transferAnimTimer > 0 || player.printerAnimTimer > 0 || player.cutterAnimTimer > 0;
      player.seatedIdleTime =
        player.isSeatedAtStation && !stationJobRunning ? player.seatedIdleTime + dt : 0;
      if (player.cutterAnimTimer > 0) {
        player.cutterAnimTimer = Math.max(0, player.cutterAnimTimer - dt);
      }
      if (chuppahCelebrateTimer > 0) {
        chuppahCelebrateTimer = Math.max(0, chuppahCelebrateTimer - dt);
      }

      if (stateRef.current === 'title') {
        titlePanTime += dt;
        camX = Math.cos(titlePanTime * 0.35) * 18;
        camY = -20 + Math.sin(titlePanTime * 0.35) * 10;
        player.x = 10;
        player.y = 65;
        player.direction = 'NE';
        player.animState =
          Math.floor(titlePanTime * 1.5) % 3 === 0 ? 'shoot' : 'idle';
      } else if (stateRef.current === 'playing') {
        const simStep = computeSimDt(dt, hitstopRemaining, 1.0);
        hitstopRemaining = simStep.nextHitstop;
        const simDt = simStep.simDt;

        if (pendingOutcome) {
          endBeatTimer -= dt;
          if (endBeatTimer <= 0) {
            const isWin = pendingOutcome === 'victory';
            pendingOutcome = null;
            sound.playFanfare(isWin);
            callbacksRef.current.onGameOver(
              isWin,
              score,
              wave,
              totalMagnetsAllWaves
            );
          }
        } else if (simDt > 0) {
          // Track Timer Countdown
          trackTimeRemaining = Math.max(0, trackTimeRemaining - simDt);

          // Check proximity to Far-Corner Magnet Workstation AND Tripod Magnet Board
          const distToStation = Math.hypot(
            player.x - WORKSTATION_POS.x,
            player.y - WORKSTATION_POS.y
          );
          player.isNearStation = distToStation < STATION_INTERACTION_RADIUS;

          const distToBoard = Math.hypot(
            player.x - TRIPOD_BOARD_POS.x,
            player.y - TRIPOD_BOARD_POS.y
          );
          player.isNearBoard = distToBoard < BOARD_INTERACTION_RADIUS;

          // Controls: KeyE for Workstation/Board Action; Space/Shift ALWAYS for Dash
          const vInput = virtualInputInternalRef.current?.current;
          const wantsAction =
            Boolean(vInput?.triggerStation) ||
            ((player.isNearStation || player.isNearBoard) && keysJustPressed.has('KeyE'));

          if (vInput?.triggerStation) {
            vInput.triggerStation = false;
          }

          if (wantsAction && (player.isNearStation || player.isNearBoard)) {
            executeStationProduction();
          }

          if (
            keysJustPressed.has('Space') ||
            keysJustPressed.has('ShiftLeft') ||
            keysJustPressed.has('ShiftRight') ||
            Boolean(vInput?.isDashing)
          ) {
            if (vInput?.isDashing) {
              vInput.isDashing = false;
            }
            player.dashBufferTimer = 0.14;
          } else {
            player.dashBufferTimer = Math.max(0, player.dashBufferTimer - simDt);
          }

          const joyX = vInput?.moveX || 0;
          const joyY = vInput?.moveY || 0;
          const moveResult = computeCombinedMovementVector(keysHeld, joyX, joyY);
          const normMoveX = moveResult.normMoveX;
          const normMoveY = moveResult.normMoveY;

          const sneakerBoost = 1 + upgradeLevels.sneakers * 0.18;
          player.dashCharge = Math.min(1, player.dashCharge + simDt * 0.5 * sneakerBoost);
          if (player.dashBufferTimer > 0 && player.dashCharge >= 0.45) {
            player.dashBufferTimer = 0;
            player.dashCharge -= 0.45;
            player.dashActiveTimer = 0.18;
            player.scaleX = 1.25;
            player.scaleY = 0.8;
            sound.playDash();
            spawnParticles(player.x, player.y, 10, '#fef08a', 140);
          }

          if (player.dashActiveTimer > 0) {
            player.dashActiveTimer = Math.max(0, player.dashActiveTimer - simDt);
          }

          // Standing at the cutter: any movement input leaves it; otherwise don't let the chair grab him
          if (player.atCutter) {
            if (moveResult.isMoving || player.dashActiveTimer > 0) {
              player.atCutter = false;
            } else {
              player.standUpCooldown = Math.max(player.standUpCooldown, 0.5);
              player.wasNearStation = true;
            }
          }

          // Check Workstation Chair Sitting & Standing Up State Machine
          const chairStep = updateWorkstationChairState(
            {
              isSeated: player.isSeatedAtStation,
              wasNearStation: player.wasNearStation,
              sitGraceTimer: player.sitGraceTimer,
              standUpCooldown: player.standUpCooldown,
            },
            {
              playerPos: { x: player.x, y: player.y },
              chairPos: WORKSTATION_CHAIR_POS,
              stationPos: WORKSTATION_POS,
              stationRadius: STATION_INTERACTION_RADIUS,
              isMoving: moveResult.isMoving,
              isDashing: player.dashActiveTimer > 0,
              dt: simDt,
            }
          );

          player.isSeatedAtStation = chairStep.nextChairState.isSeated;
          player.wasNearStation = chairStep.nextChairState.wasNearStation;
          player.sitGraceTimer = chairStep.nextChairState.sitGraceTimer;
          player.standUpCooldown = chairStep.nextChairState.standUpCooldown;

          if (chairStep.justSatDown) {
            player.scaleX = 1.12;
            player.scaleY = 0.88;
            sound.playDanceBump();
            if (!player.stationFeedbackText) {
              player.stationFeedbackText =
                'התיישבת בעמדה 🪑 [E] העברה · הדפסה · חיתוך · זוז כדי לקום';
              player.stationFeedbackTimer = 2.6;
            }
          } else if (chairStep.justStoodUp) {
            player.scaleX = 0.94;
            player.scaleY = 1.08;
            sound.playDanceBump();
          }

          if (player.isSeatedAtStation) {
            player.x = chairStep.nextPlayerPos.x;
            player.y = chairStep.nextPlayerPos.y;
            player.vx = 0;
            player.vy = 0;
            player.strideDist = 0;
            player.isNearStation = true;
          } else {
            const isDashing = player.dashActiveTimer > 0;
            const moveSpeed = (isDashing ? 380 : 165) * sneakerBoost;
            const targetVx = normMoveX * moveSpeed;
            const targetVy = normMoveY * moveSpeed;
            // Smooth acceleration / deceleration instead of instant start & stop
            const accelRate = isDashing ? PLAYER_DASH_RATE : PLAYER_ACCEL_RATE;
            const decelRate = isDashing ? PLAYER_DASH_RATE : PLAYER_DECEL_RATE;
            player.vx = approachVelocity(player.vx, targetVx, simDt, accelRate, decelRate);
            player.vy = approachVelocity(player.vy, targetVy, simDt, accelRate, decelRate);

            const prevX = player.x;
            const prevY = player.y;
            player.x += player.vx * simDt;
            player.y += player.vy * simDt;

            const distFromCenter = Math.hypot(player.x, player.y);
            if (distFromCenter > ARENA_RADIUS) {
              player.x = (player.x / distFromCenter) * ARENA_RADIUS;
              player.y = (player.y / distFromCenter) * ARENA_RADIUS;
            }

            const solved = resolveFloorObstacles(player, PLAYER_BODY_RADIUS, FLOOR_OBSTACLES);
            player.x = solved.x;
            player.y = solved.y;

            if (player.atCutter) {
              // Planted at the cutter while working the lever
              player.x = CUTTER_STAND_POS.x;
              player.y = CUTTER_STAND_POS.y;
              player.vx = 0;
              player.vy = 0;
              player.direction = 'NE';
            }

            // If a wall/obstacle stopped us, keep only the velocity we actually achieved (no "sticky" push)
            if (simDt > 0) {
              const realVx = (player.x - prevX) / simDt;
              const realVy = (player.y - prevY) / simDt;
              if (Math.abs(realVx) < Math.abs(player.vx)) player.vx = realVx;
              if (Math.abs(realVy) < Math.abs(player.vy)) player.vy = realVy;
            }

            // Start / stop squash & stretch + lean into horizontal screen motion
            const wantsToMove = Math.abs(normMoveX) + Math.abs(normMoveY) > 0.01;
            const speedNow = Math.hypot(player.vx, player.vy);
            if (wantsToMove && !player.wasMoving) {
              player.scaleX = 0.93;
              player.scaleY = 1.07;
            } else if (!wantsToMove && player.wasMoving && speedNow > 60) {
              player.scaleX = 1.1;
              player.scaleY = 0.9;
            }
            player.wasMoving = wantsToMove;
            const screenVx = player.vx - player.vy; // iso screen-x velocity
            const targetLean = (screenVx / 330) * 0.08;
            player.lean += (targetLean - player.lean) * Math.min(1, simDt * 10);
          }

          // Update VIP Event Countdown & Check if Photographer Missed the Active Event!
          let justMissedVipEvent = false;
          if (vipEvent && vipEvent.remainingSec > 0) {
            vipEvent = {
              ...vipEvent,
              remainingSec: Math.max(0, vipEvent.remainingSec - simDt),
            };
            if (vipEvent.remainingSec === 0) {
              justMissedVipEvent = true;
              const missedGuest = guests[vipEventSeq % Math.max(1, guests.length)];
              if (missedGuest) {
                missedGuest.speechBubbleText = '😞 פספסת!';
                missedGuest.wantsPhotoTimer = 1.4;
              }
              vipEvent = null;
              nextVipCooldown = 3.5;
            }
          } else {
            nextVipCooldown -= simDt;
            if (nextVipCooldown <= 0) {
              vipEvent = createVipEvent(vipEventSeq++);
              nextVipCooldown = 4.5;
              sound.playTelegraph();
            }
          }

          // Update Magnet Delivery SLA Timer ("הוצאת מגנט בזמן")
          const pendingMagnetsInPipeline =
            player.photosInCamera + player.transferBatch + player.photosOnComputer + player.uncutSheetsAtStation + player.cutMagnetsInHand;
          const deliveryStep = stepMagnetDeliveryTracker(
            magnetDeliveryTracker,
            pendingMagnetsInPipeline,
            simDt
          );
          magnetDeliveryTracker = deliveryStep.nextState;

          if (deliveryStep.justBecameLate && guests.length > 0) {
            const impatientGuest = guests[(wave + pendingMagnetsInPipeline) % guests.length];
            if (impatientGuest) {
              impatientGuest.speechBubbleText = '⏳ איפה המגנט?';
              impatientGuest.wantsPhotoTimer = 1.5;
            }
          }

          // Update Guest Joy (partyJoy) based on Right Event Photography + On-Time Magnet Delivery!
          const joyTick = computePartyJoyTick({
            currentJoy: player.partyJoy,
            dt: simDt,
            isMagnetDeliveryLate: magnetDeliveryTracker.isLate,
            justBecameLate: deliveryStep.justBecameLate,
            justMissedVipEvent,
          });
          player.partyJoy = joyTick.nextJoy;
          if (joyTick.joyPenaltyReasonHe) {
            player.stationFeedbackText = joyTick.joyPenaltyReasonHe;
            player.stationFeedbackTimer = 3.2;
            sound.playDanceBump();
          }

          // Update Roaming Catering Waiters & Check Tray Bump
          for (let wIdx = 0; wIdx < waiters.length; wIdx++) {
            const wActor = waiters[wIdx];
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
                    (g.guestActivity === 'seated' ||
                      (g.guestActivity === 'dancing' && !g.isEnteringFloor)) &&
                    !waiters.some((o) => o !== wActor && o.targetGuestId === g.id)
                );
                if (candidates.length > 0) {
                  const tgt = candidates[Math.floor(Math.random() * candidates.length)];
                  wActor.targetGuestId = tgt.id;
                  wActor.carrying = true;
                  wActor.trayItem = Math.random() < 0.5 ? 'champagne' : 'steak';
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
                const tbl = BANQUET_TABLES.find((tb) => tb.id === tgt.tableId);
                const awayY =
                  tgt.guestActivity === 'seated' && tbl ? (tgt.y < tbl.wy ? -12 : 12) : 6;
                const mv = moveTowardPoint(
                  wActor,
                  { x: tgt.x + 10, y: tgt.y + awayY },
                  wActor.speed,
                  simDt,
                  7
                );
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
            if (!player.isSeatedAtStation && wActor.bumpCooldown <= 0) {
              const wdx = player.x - wActor.x;
              const wdy = player.y - wActor.y;
              const wDist = Math.hypot(wdx, wdy) || 1;
              if (wDist < 24) {
                wActor.bumpCooldown = 1.6;
                player.bumpFlashTimer = 0.35;
                cameraTrauma = Math.min(1, cameraTrauma + 0.25);
                sound.playDanceBump();
                spawnParticles(wActor.x, wActor.y, 12, '#fef08a', 110, 28);
                player.x += (wdx / wDist) * 18;
                player.y += (wdy / wDist) * 18;
                player.stationFeedbackText =
                  wActor.trayItem === 'champagne'
                    ? '🍾 אופס! נתקלת במלצר השמפניה! היזהר מהמגשים באולם!'
                    : '🍽️ אופס! נתקלת במלצר המנות! עקוף את המלצרים בריצה!';
                player.stationFeedbackTimer = 2.2;
              }
            }
          }

          const stepDist = Math.hypot(player.vx * simDt, player.vy * simDt);
          if (stepDist > 0.1) {
            player.strideDist += stepDist;
          } else {
            player.strideDist = 0;
          }

          const worldZoom = Math.max(
            0.65,
            Math.min(1.28, Math.min(viewW / 1120, viewH / 740))
          );
          const playerIso = worldToIso(player.x, player.y);
          const playerScreenX = viewW * 0.5 + (playerIso.x - camX) * worldZoom;
          const playerScreenY = viewH * 0.52 + (playerIso.y - camY - 28) * worldZoom;
          const aimDx = pointerScreenX - playerScreenX;
          const aimDy = pointerScreenY - playerScreenY;
          let aimScreenAngle = Math.atan2(aimDy, aimDx);

          // Photography Snapping (Flash click & capturing photos into camera)
          const wantsShoot =
            mouseDown ||
            mouseJustPressed ||
            keysHeld.has('KeyJ') ||
            keysHeld.has('KeyF') ||
            Boolean(vInput?.isShooting);

          // If seated on the workstation chair, face the workstation table ('NE')!
          if (player.isSeatedAtStation && !wantsShoot) {
            player.direction = 'NE';
          } else if (moveResult.isMoving && !mouseDown && !vInput?.isShooting) {
            aimScreenAngle = moveResult.screenAngle;
            player.direction = angleToIsoDirection(moveResult.screenAngle);
          } else if (vInput?.isShooting && moveResult.isMoving && !mouseDown) {
            aimScreenAngle = moveResult.screenAngle;
            player.direction = angleToIsoDirection(moveResult.screenAngle);
          } else {
            player.direction = angleToIsoDirection(aimScreenAngle);
          }

          {
            // Remember where the camera points (attention seekers plant themselves in front of the lens)
            const aw = isoToWorld(Math.cos(aimScreenAngle), Math.sin(aimScreenAngle));
            const al = Math.hypot(aw.x, aw.y) || 1;
            lastAimWX = aw.x / al;
            lastAimWY = aw.y / al;
          }

          player.shootCooldown = Math.max(0, player.shootCooldown - simDt);
          player.shootAnimTimer = Math.max(0, player.shootAnimTimer - simDt);
          flashEngine.update(simDt * 1000);
          flashEngine.updateAnchor('player', player, {
            x: player.lensOffsetX,
            y: player.lensOffsetY,
          });
          player.bumpFlashTimer = Math.max(0, player.bumpFlashTimer - simDt);

          // Take the camera back from the desk once the copy is done and the photographer is up from the chair
          if (
            shouldPickUpCameraFromDesk({
              cameraOnDesk: player.cameraOnDesk,
              transferRemainingSec: player.transferAnimTimer,
              isSeatedAtStation: player.isSeatedAtStation,
              isNearStation: player.isNearStation,
            })
          ) {
            player.cameraOnDesk = false;
            player.scaleX = 0.94;
            player.scaleY = 1.06;
            sound.playDanceBump();
            player.stationFeedbackText = '📷 לקחת את המצלמה מהשולחן — אפשר לחזור לצלם!';
            player.stationFeedbackTimer = 2;
          }

          if (
            wantsShoot &&
            player.shootCooldown <= 0 &&
            (player.cameraOnDesk || player.isSeatedAtStation || player.atCutter)
          ) {
            // No shooting from the chair (hands are on the laptop) or while the camera is on the desk
            player.shootCooldown = 0.6;
            sound.playDanceBump();
            player.stationFeedbackText = player.atCutter && !player.cameraOnDesk
              ? '✂️ אתה עומד ליד החותך — זוז כדי לחזור לצלם'
              : !player.cameraOnDesk
              ? '🪑 אתה יושב בעמדה ועובד על המחשב — קום מהכסא כדי לצלם'
              : player.transferAnimTimer > 0
                ? `📷 המצלמה על השולחן — ההעברה למחשב עוד לא הסתיימה (${player.transferAnimTimer.toFixed(1)} שנ')`
                : player.isSeatedAtStation
                ? '📷 המצלמה על השולחן — קום מהכסא כדי לקחת אותה'
                : '📷 המצלמה נשארה על שולחן העבודה! חזור לעמדה לקחת אותה';
            player.stationFeedbackTimer = 2.2;
          } else if (wantsShoot && player.shootCooldown <= 0) {
            const maxCap = getMaxCameraCapacity(upgradeLevels.pro_sdcard);
            if (player.photosInCamera >= maxCap) {
              player.shootCooldown = 0.35;
              sound.playDanceBump();
              player.stationFeedbackText = `💾 כרטיס הזיכרון מלא (${maxCap}/${maxCap})! רוץ לעמדה בפינה להעביר למחשב ולהדפיס בבונוס כפול x2! 💾`;
              player.stationFeedbackTimer = 2.4;
            } else {
              const aimWorld = isoToWorld(
                Math.cos(aimScreenAngle),
                Math.sin(aimScreenAngle)
              );
              const aimWLen = Math.hypot(aimWorld.x, aimWorld.y) || 1;
              const dirWX = aimWorld.x / aimWLen;
              const dirWY = aimWorld.y / aimWLen;
              const lensRangeBonus = 1 + upgradeLevels.pro_sdcard * 0.15;

              if (weaponRef.current === 'pulse') {
                // Mode 1: Fast DSLR 35mm Prime Portrait Flash
                player.shootCooldown = 0.18;
                fireFlashShot(
                  player.x + dirWX * 20,
                  player.y + dirWY * 20,
                  dirWX * 560 * lensRangeBonus,
                  dirWY * 560 * lensRangeBonus,
                  MAGNET_FRAMES[selectedFrameRef.current].borderColor,
                  1.0
                );
              } else {
                // Mode 2: Wide Group Shot Multi-Flash
                player.shootCooldown = 0.35;
                const spreadAngles = [-0.25, 0, 0.25];
                for (const offset of spreadAngles) {
                  const cosO = Math.cos(offset);
                  const sinO = Math.sin(offset);
                  const rx = dirWX * cosO - dirWY * sinO;
                  const ry = dirWX * sinO + dirWY * cosO;
                  fireFlashShot(
                    player.x + rx * 20,
                    player.y + ry * 20,
                    rx * 460 * lensRangeBonus,
                    ry * 460 * lensRangeBonus,
                    '#ffffff',
                    0.85
                  );
                }
              }

              // Light cone from the lens toward the aim direction (wide mode = wider, shorter cone)
              const isWide = weaponRef.current !== 'pulse';
              flashEngine.fire({
                origin: { x: player.x, y: player.y },
                angle: Math.atan2(dirWY, dirWX),
                range: (isWide ? 150 : 185) * lensRangeBonus,
                fov: isWide ? 72 : 48,
                duration: 200,
                peakMs: 50,
                color: characterConfigRef.current.photographerStyle?.flashColor,
                lensScreenOffset: { x: player.lensOffsetX, y: player.lensOffsetY },
                layer: isBackFacingDirection(player.direction) ? 'behind' : 'front',
                targets: vipCouple.length ? [...guests, ...vipCouple] : guests,
                tag: isWide ? 'wide' : 'pulse',
                anchorKey: 'player',
              });

              // WHOLE-FRAME SCORE at the shutter click: everyone inside the light cone counts
              // (bride/groom multiplier, DJ combo, potential-couple pairs, staff penalty)
              {
                const cone = {
                  originX: player.x,
                  originY: player.y,
                  angle: Math.atan2(dirWY, dirWX),
                  range: (isWide ? 150 : 185) * lensRangeBonus,
                  halfFov: ((isWide ? 72 : 48) * Math.PI) / 360,
                };
                const subjects: FrameSubject[] = [];
                for (const g of guests) {
                  if (isTargetInCone(cone, g, 10)) {
                    subjects.push({ kind: g.guestType ?? 'regular', coupleId: g.coupleId });
                  }
                }
                for (const g of vipCouple) {
                  if (isTargetInCone(cone, g, 12)) subjects.push({ kind: g.guestType ?? 'regular' });
                }
                const hallNow = discoBeatPhase / 2.8;
                BARTENDER_LOOKS.forEach((_, bi) => {
                  const pose = getBartenderPose(bi, hallNow);
                  if (isTargetInCone(cone, pose, 8)) subjects.push({ kind: 'staff' });
                });
                for (const w of waiters) {
                  if (isTargetInCone(cone, w, 8)) subjects.push({ kind: 'staff' });
                }
                if (isTargetInCone(cone, { x: -95, y: -255 }, 14)) subjects.push({ kind: 'dj' });

                const frame = scoreFrame(subjects);
                if (frame.score !== 0 || frame.reputation > 0) {
                  applyScoreDelta(frame.score);
                  reputation += frame.reputation;
                  const special = frame.tags.some((t) => t !== 'empty');
                  const labelX = player.x + dirWX * 60;
                  const labelY = player.y + dirWY * 60;
                  const color =
                    frame.score < 0
                      ? '#f87171'
                      : frame.tags.includes('dj_combo') || frame.tags.includes('bride_groom')
                      ? '#fbbf24'
                      : frame.tags.includes('couple_pair')
                      ? '#f472b6'
                      : '#e2e8f0';
                  addFrameLabel(`${frame.score >= 0 ? '+' : ''}${frame.score}`, labelX, labelY, color, frame.labelHe);
                  if (special && frame.labelHe) {
                    player.stationFeedbackText = `📸 ${frame.labelHe} (${frame.score >= 0 ? '+' : ''}${frame.score})`;
                    player.stationFeedbackTimer = 2.2;
                  }
                  if (frame.tags.includes('dj_combo') || frame.tags.includes('bride_groom')) {
                    sound.playFanfare(true);
                    cameraTrauma = Math.min(1, cameraTrauma + 0.25);
                  }
                }
              }

              player.shootAnimTimer = 0.15;
              player.scaleX = 0.92;
              player.scaleY = 1.08;
            }
          }

          const playerSpeed = Math.hypot(player.vx, player.vy);
          player.idleTime = playerSpeed < 8 && !player.isSeatedAtStation ? player.idleTime + simDt : 0;

          if (player.shootAnimTimer > 0) {
            player.animState = 'shoot';
          } else if (playerSpeed > 18) {
            const gaitPhase = Math.floor(player.strideDist / 22) % 2;
            player.animState = gaitPhase === 0 ? 'walk_1' : 'walk_2';
          } else {
            player.animState = 'idle';
          }

          if (comboTimer > 0) {
            comboTimer = Math.max(0, comboTimer - simDt);
            if (comboTimer === 0) combo = 0;
          }

          // ====================================================================
          // AUTONOMOUS GUEST MAGNET PICKUP FROM TRIPOD EASEL BOARD
          // ====================================================================
          guestMagnetTimer -= simDt;
          if (guestMagnetTimer <= 0 && availableMagnetsOnBoard > 0) {
            guestMagnetTimer = 3.4;
            const eligible = guests.filter((g) => !g.hasMagnet && !g.seekingMagnet);
            if (eligible.length > 0) {
              const luckyGuest = eligible[Math.floor(Math.random() * eligible.length)];
              luckyGuest.seekingMagnet = true;
              luckyGuest.wantsPhotoTimer = 3.0;
              luckyGuest.speechBubbleText = luckyGuest.role === 'table_guest'
                ? 'אני קופץ ללוח החצובה לקחת מגנט! 🧲'
                : 'הולך ללוח לקחת את המגנט שלי! 💃✨';
            }
          }

          // ====================================================================
          // DYNAMIC 80% DANCING / 10% SEATED / 10% RECRUITING RATIO CONTROLLER
          // - At high Party Joy: 80% dance in place in social groups, 10% sit, 10% pull seated guests
          // - When Party Joy drops ("אם המסיבה מבאסת"), dancers leave the floor to sit at tables!
          // ====================================================================
          crowdJoy = stepCrowdJoy(crowdJoy, player.partyJoy, simDt);
          crowdMoveCooldown = Math.max(0, crowdMoveCooldown - simDt);
          for (const g of guests) {
            if ((g.activityCooldown ?? 0) > 0) {
              g.activityCooldown = Math.max(0, (g.activityCooldown ?? 0) - simDt);
            }
          }
          const targetBreakdown = calculateTargetGuestBreakdown(guests.length, crowdJoy);
          const currentSeated = guests.filter((g) => g.guestActivity === 'seated');
          const currentDancers = guests.filter((g) => g.guestActivity === 'dancing');
          const activeFloorDancers = currentDancers.filter((g) => !g.isEnteringFloor);

          // If the party is getting boring and fewer guests are seated than targetSeated,
          // a dancer gets disappointed and walks back to their table seat!
          const boredDancer =
            currentSeated.length < targetBreakdown.targetSeated &&
            activeFloorDancers.length > 2 &&
            crowdMoveCooldown <= 0
              ? activeFloorDancers.find(
                  (g) =>
                    !g.seekingMagnet &&
                    g.celebrateTimer <= 0 &&
                    (g.activityCooldown ?? 0) <= 0
                )
              : undefined;
          // Only guests who actually reached their chair and haven't just sat down may get up again
          const hypedSeated =
            currentSeated.length > targetBreakdown.targetSeated && crowdMoveCooldown <= 0
              ? currentSeated.find(
                  (g) => g.isSeated && !g.seekingMagnet && (g.activityCooldown ?? 0) <= 0
                )
              : undefined;

          if (boredDancer && Math.random() < simDt * 0.95) {
            crowdMoveCooldown = CROWD_MOVE_INTERVAL_SEC;
            boredDancer.activityCooldown = GUEST_ACTIVITY_COOLDOWN_SEC;
            {
              boredDancer.guestActivity = 'seated';
              boredDancer.isSeated = true;
              boredDancer.role = 'table_guest';
              boredDancer.danceMove = boredDancer.id % 2 === 0 ? 'eating' : 'toasting';
              boredDancer.homeX = boredDancer.seatX ?? boredDancer.homeX;
              boredDancer.homeY = boredDancer.seatY ?? boredDancer.homeY;
              boredDancer.speechBubbleText =
                player.partyJoy < 45
                  ? 'נהיה מבאס ברחבה... הולך לשבת בשולחן 🥱'
                  : 'הולך לנוח קצת בשולחן... צלמו אותנו! 🪑';
              boredDancer.wantsPhotoTimer = 3.0;
            }
          } else if (hypedSeated && Math.random() < simDt * 1.2) {
            // Party Joy is high! Seated guests get hyped and walk back onto the dance floor with a staggered delay!
            crowdMoveCooldown = CROWD_MOVE_INTERVAL_SEC;
            hypedSeated.activityCooldown = GUEST_ACTIVITY_COOLDOWN_SEC;
            {
              const maxQueuedDelay = guests.reduce(
                (maxD, g) => Math.max(maxD, g.arrivalDelayTimer ?? 0),
                0
              );
              hypedSeated.guestActivity = 'dancing';
              hypedSeated.role = 'dancer';
              hypedSeated.danceMove = 'bounce';
              hypedSeated.homeX = hypedSeated.danceSpotX ?? 0;
              hypedSeated.homeY = hypedSeated.danceSpotY ?? 0;
              hypedSeated.isEnteringFloor = true;
              hypedSeated.arrivalDelayTimer = maxQueuedDelay + 0.8 + Math.random() * 1.7;
              hypedSeated.speechBubbleText = 'איזה קצב מטורף! חוזר לרקוד ברחבה! 💃🔥';
              hypedSeated.wantsPhotoTimer = 2.6;
            }
          }

          // Ensure ~10% of guests (targetRecruiters) actively walk to tables to drag seated guests up!
          const updatedSeated = guests.filter((g) => g.guestActivity === 'seated');
          const updatedRecruiters = guests.filter((g) => g.guestActivity === 'recruiting');
          const desiredRecruiters = Math.min(
            updatedSeated.length,
            Math.max(1, targetBreakdown.targetRecruiters)
          );
          if (updatedRecruiters.length < desiredRecruiters && activeFloorDancers.length > 2) {
            const unrecruitedSeat = updatedSeated.find(
              (s) => !updatedRecruiters.some((r) => r.recruitTargetId === s.id)
            );
            const candidate = activeFloorDancers.find(
              (d) => !d.seekingMagnet && d.guestActivity === 'dancing'
            );
            if (unrecruitedSeat && candidate) {
              candidate.guestActivity = 'recruiting';
              candidate.isSeated = false;
              candidate.role = 'dancer';
              candidate.recruitTargetId = unrecruitedSeat.id;
              candidate.recruitProgressTimer = 0;
              candidate.danceMove = 'wave';
              candidate.speechBubbleText = '🙌 בוא לרקוד!';
              candidate.wantsPhotoTimer = 1.3;
            }
          }

          // BAR VISITS: every few seconds a dancer walks to the island bar for a drink
          // (some lean on the counter, smokers light up), then returns to the dance floor
          barVisitTimer -= simDt;
          if (barVisitTimer <= 0) {
            barVisitTimer = 2.5 + Math.random() * 3;
            const atBar = guests.filter((g) => g.guestActivity === 'bar');
            if (atBar.length < 4) {
              const usedSpots = new Set(atBar.map((g) => g.barSpotIdx));
              const freeSpots = BAR_GUEST_SPOTS.map((_, i) => i).filter((i) => !usedSpots.has(i));
              const candidates = guests.filter(
                (g) =>
                  g.guestActivity === 'dancing' &&
                  !g.isEnteringFloor &&
                  !g.seekingMagnet &&
                  g.celebrateTimer <= 0 &&
                  (g.activityCooldown ?? 0) <= 0
              );
              if (freeSpots.length > 0 && candidates.length > 3) {
                const goer = candidates[Math.floor(Math.random() * candidates.length)];
                goer.guestActivity = 'bar';
                goer.barSpotIdx = freeSpots[Math.floor(Math.random() * freeSpots.length)];
                goer.barTimer = 7 + Math.random() * 7;
                goer.atBarArrived = false;
                goer.speechBubbleText = goer.isSmoker ? '🚬 יוצא לבר רגע' : '🍸 לבר!';
                goer.wantsPhotoTimer = 1.4;
              }
            }
          }

          // ====================================================================
          // UPDATE GUESTS (IN-PLACE SOCIAL DANCING, SPOT SWITCHING, RECRUITING & SEATED)
          // ====================================================================

          for (const guest of guests) {
            guest.dancePhase += simDt * guest.danceTempo;
            guest.strideDist += simDt * 38;
            guest.hitFlashTimer = Math.max(0, guest.hitFlashTimer - simDt);
            if ((guest.flashTintTimer ?? 0) > 0) {
              guest.flashTintTimer = Math.max(0, (guest.flashTintTimer ?? 0) - simDt);
            }
            if ((guest.drinkTimer ?? 0) > 0) {
              guest.drinkTimer = Math.max(0, (guest.drinkTimer ?? 0) - simDt);
            }
            guest.celebrateTimer = Math.max(0, guest.celebrateTimer - simDt);
            const dx = player.x - guest.x;
            const dy = player.y - guest.y;
            const dist = Math.hypot(dx, dy) || 1;

            // Personality state machine (attention seeker / impatient magnet tracker)
            if (guest.behavior && guest.behavior.kind !== 'none') {
              const stepped = stepBehavior(guest.behavior, simDt, Math.random);
              guest.behavior = stepped.state;
              if (stepped.events.length) applyBehaviorEvents(guest, stepped.events);
            }
            const approachMode = guest.behavior ? wantsToApproachPhotographer(guest.behavior) : null;
            const canApproach =
              approachMode !== null && !guest.seekingMagnet && !player.isSeatedAtStation && !player.atCutter;

            if (guest.speechBubbleText) {
              guest.wantsPhotoTimer -= simDt;
              if (guest.wantsPhotoTimer <= 0) {
                guest.speechBubbleText = null;
              }
            } else if (dist < 85 && Math.random() < 0.004 && guest.celebrateTimer <= 0) {
              guest.wantsPhotoTimer = 1.25;
              const list = guest.isSeated ? TABLE_SPEECH_BUBBLES : DANCER_SPEECH_BUBBLES;
              guest.speechBubbleText = list[(guest.id + wave) % list.length];
            }

            if (canApproach) {
              // 0. PERSONALITY: attention seeker plants themselves in front of the lens ("צלמוס צלם אותי!"),
              //    impatient tracker follows the photographer around asking about their magnet
              guest.isSeated = false;
              guest.role = 'dancer';
              if (guest.guestActivity === 'seated' || guest.guestActivity === 'bar') {
                guest.guestActivity = 'dancing';
                guest.atBarArrived = false;
                guest.barSpotIdx = undefined;
              }
              let tx: number;
              let ty: number;
              if (approachMode === 'seek') {
                const side = (guest.id % 2 === 0 ? 1 : -1) * 8;
                tx = player.x + lastAimWX * ATTENTION.standInFrontDistance - lastAimWY * side;
                ty = player.y + lastAimWY * ATTENTION.standInFrontDistance + lastAimWX * side;
              } else {
                const ang = Math.atan2(guest.y - player.y, guest.x - player.x);
                tx = player.x + Math.cos(ang) * PATIENCE.followDistance;
                ty = player.y + Math.sin(ang) * PATIENCE.followDistance;
              }
              const mv = moveTowardPoint(guest, { x: tx, y: ty }, approachMode === 'seek' ? 78 : 70, simDt, 3);
              const stepLen = Math.hypot(mv.x - guest.x, mv.y - guest.y);
              guest.x = mv.x;
              guest.y = mv.y;
              guest.strideDist += stepLen * 1.5;
              const isoG = worldToIso(guest.x, guest.y);
              const isoPl = worldToIso(player.x, player.y);
              guest.direction = angleToIsoDirection(Math.atan2(isoPl.y - isoG.y, isoPl.x - isoG.x));
              if (approachMode === 'seek') guest.danceMove = 'wave';
            } else if (guest.seekingMagnet) {
              // 1. Guest walking purposefully towards the tripod whiteboard easel next to the dance floor!
              const targetX = TRIPOD_BOARD_POS.x + ((guest.id % 3) - 1) * 10;
              const targetY = TRIPOD_BOARD_POS.y + 14 + ((guest.id % 2) * 6);
              const tdx = targetX - guest.x;
              const tdy = targetY - guest.y;
              const tDist = Math.hypot(tdx, tdy);

              if (tDist > 16) {
                const spd = 68 * simDt;
                guest.x += (tdx / tDist) * spd;
                guest.y += (tdy / tDist) * spd;
                guest.strideDist += spd * 1.6;
                const isoG = worldToIso(guest.x, guest.y);
                const isoT = worldToIso(targetX, targetY);
                guest.direction = angleToIsoDirection(Math.atan2(isoT.y - isoG.y, isoT.x - isoG.x));
              } else {
                // Arrived at the easel board! Guest takes their magnet & joins the dancefloor!
                guest.seekingMagnet = false;
                guest.hasMagnet = true;
                availableMagnetsOnBoard = Math.max(0, availableMagnetsOnBoard - 1);
                magnetsTakenByGuests++;
                guest.celebrateTimer = 1.4;
                guest.wantsPhotoTimer = 1.4;
                guest.speechBubbleText = '😍 תודה על המגנט!';

                sound.playFanfare(false);
                spawnParticles(guest.x, guest.y, 22, '#fbbf24', 125, 50);

                // Wedding Joy & Score boost
                player.partyJoy = Math.min(100, player.partyJoy + 15);
                score += 250;
                bestScore = Math.max(bestScore, score);
              }
            } else if (guest.guestActivity === 'bar') {
              // 1b. AT THE ISLAND BAR: walk to a free spot, get a drink, lean / smoke / sway, then go back
              guest.isSeated = false;
              guest.role = 'dancer';
              const spot = BAR_GUEST_SPOTS[guest.barSpotIdx ?? 0];
              if (!guest.atBarArrived) {
                const mv = moveTowardPoint(guest, spot, 52, simDt, 4);
                const stepLen = Math.hypot(mv.x - guest.x, mv.y - guest.y);
                if (stepLen > 0) {
                  const isoG = worldToIso(guest.x, guest.y);
                  const isoT = worldToIso(spot.x, spot.y);
                  guest.direction = angleToIsoDirection(Math.atan2(isoT.y - isoG.y, isoT.x - isoG.x));
                  guest.strideDist += stepLen * 1.5;
                }
                guest.x = mv.x;
                guest.y = mv.y;
                if (mv.arrived) {
                  guest.atBarArrived = true;
                  // Bartender hands over a drink
                  guest.drinkTimer = Math.max(guest.drinkTimer ?? 0, (guest.barTimer ?? 8) + 8);
                  guest.drinkKind = guest.id % 4;
                }
              } else {
                // Face the bar; south-side guests sway to the music
                const isoG = worldToIso(guest.x, guest.y);
                const isoB = worldToIso(ISLAND_BAR.cx, ISLAND_BAR.cy);
                guest.direction = angleToIsoDirection(Math.atan2(isoB.y - isoG.y, isoB.x - isoG.x));
                const sway = (guest.barSpotIdx ?? 0) >= 3 ? Math.sin(guest.dancePhase * 1.2) * 1.8 : 0;
                guest.x = spot.x + sway;
                guest.y = spot.y;
                guest.barTimer = (guest.barTimer ?? 0) - simDt;
                if ((guest.barTimer ?? 0) <= 0) {
                  guest.guestActivity = 'dancing';
                  guest.atBarArrived = false;
                  guest.barSpotIdx = undefined;
                  guest.isEnteringFloor = true;
                  guest.arrivalDelayTimer = 0;
                  guest.activityCooldown = 6;
                }
              }
            } else if (guest.guestActivity === 'seated') {
              // 2. SEATED GUEST AT BANQUET TABLE (or walking from dancefloor back to their chair)
              const seatX = guest.seatX ?? guest.homeX;
              const seatY = guest.seatY ?? guest.homeY;
              const dSeat = Math.hypot(seatX - guest.x, seatY - guest.y);
              if (dSeat > 8) {
                // Walking to their table chair
                guest.isSeated = false;
                const walkSpd = 54 * simDt;
                guest.x += ((seatX - guest.x) / dSeat) * walkSpd;
                guest.y += ((seatY - guest.y) / dSeat) * walkSpd;
                guest.strideDist += walkSpd * 1.5;
                const isoG = worldToIso(guest.x, guest.y);
                const isoS = worldToIso(seatX, seatY);
                guest.direction = angleToIsoDirection(Math.atan2(isoS.y - isoG.y, isoS.x - isoG.x));
              } else {
                // Seated in chair at the table
                guest.x = seatX;
                guest.y = seatY;
                guest.isSeated = true;
                guest.role = 'table_guest';

                if (dist < 115) {
                  const isoGuest = worldToIso(guest.x, guest.y);
                  const isoPl = worldToIso(player.x, player.y);
                  guest.direction = angleToIsoDirection(
                    Math.atan2(isoPl.y - isoGuest.y, isoPl.x - isoGuest.x)
                  );
                } else if (guest.seatDir) {
                  guest.direction = guest.seatDir;
                }
              }
            } else if (guest.guestActivity === 'recruiting') {
              // 3. RECRUITER GUEST: Approaches a table and tries to drag a seated guest onto the dancefloor!
              guest.isSeated = false;
              guest.role = 'dancer';
              const targetSeatGuest = guests.find(
                (g) => g.id === guest.recruitTargetId && g.guestActivity === 'seated'
              );

              if (!targetSeatGuest) {
                // Target already stood up! Either pick another seated guest or return to dancing
                const nextSeated = guests.find(
                  (g) =>
                    g.guestActivity === 'seated' &&
                    !guests.some((other) => other.id !== guest.id && other.recruitTargetId === g.id)
                );
                if (nextSeated) {
                  guest.recruitTargetId = nextSeated.id;
                  guest.recruitProgressTimer = 0;
                } else {
                  guest.guestActivity = 'dancing';
                  guest.recruitTargetId = null;
                }
              } else {
                // Stand just behind the seated guest, on the side away from the table
                const seatTbl = BANQUET_TABLES.find((tb) => tb.id === targetSeatGuest.tableId);
                const seatSX = targetSeatGuest.seatX ?? targetSeatGuest.x;
                const seatSY = targetSeatGuest.seatY ?? targetSeatGuest.y;
                const awaySign = seatTbl && seatSY < seatTbl.wy ? -1 : 1;
                const standTargetX = seatSX + 12;
                const standTargetY = seatSY + awaySign * 14;
                const rdx = standTargetX - guest.x;
                const rdy = standTargetY - guest.y;
                const rDist = Math.hypot(rdx, rdy);

                if (rDist > 10) {
                  // Walking over to the banquet table
                  const walkSpd = 58 * simDt;
                  guest.x += (rdx / rDist) * walkSpd;
                  guest.y += (rdy / rDist) * walkSpd;
                  guest.strideDist += walkSpd * 1.6;
                  const isoG = worldToIso(guest.x, guest.y);
                  const isoT = worldToIso(standTargetX, standTargetY);
                  guest.direction = angleToIsoDirection(Math.atan2(isoT.y - isoG.y, isoT.x - isoG.x));
                } else {
                  // Standing right next to the seated guest, tugging & convincing them to get up and dance!
                  const tugBob = Math.sin(discoBeatPhase * 4 + guest.id) * 2.5;
                  guest.x = standTargetX + tugBob;
                  guest.y = standTargetY - tugBob * 0.5;
                  guest.danceMove = 'wave';

                  const isoG = worldToIso(guest.x, guest.y);
                  const isoSeat = worldToIso(targetSeatGuest.x, targetSeatGuest.y);
                  guest.direction = angleToIsoDirection(
                    Math.atan2(isoSeat.y - isoG.y, isoSeat.x - isoG.x)
                  );

                  if (!guest.speechBubbleText && (guest.recruitProgressTimer ?? 0) < 0.1) {
                    guest.speechBubbleText = '🙌 בוא לרקוד!';
                    guest.wantsPhotoTimer = 1.25;
                  }

                  guest.recruitProgressTimer = (guest.recruitProgressTimer ?? 0) + simDt;
                  if (guest.recruitProgressTimer >= 4.6) {
                    guest.recruitProgressTimer = 0;
                    const seatedNowCount = guests.filter((g) => g.guestActivity === 'seated').length;
                    if (crowdJoy >= 55 && seatedNowCount > 2) {
                      // Successfully dragged the seated guest onto the dancefloor!
                      targetSeatGuest.guestActivity = 'dancing';
                      targetSeatGuest.activityCooldown = GUEST_ACTIVITY_COOLDOWN_SEC;
                      targetSeatGuest.isSeated = false;
                      targetSeatGuest.role = 'dancer';
                      targetSeatGuest.danceMove = 'bounce';
                      targetSeatGuest.speechBubbleText = '💃 יאללה!';
                      targetSeatGuest.wantsPhotoTimer = 1.2;

                      guest.guestActivity = 'dancing';
                      guest.recruitTargetId = null;
                      spawnParticles(targetSeatGuest.x, targetSeatGuest.y, 14, '#4ade80', 110, 36);
                    } else if (crowdJoy < 42) {
                      // Party is so boring that the recruiter gives up and sits down too!
                      guest.guestActivity = 'seated';
                      guest.isSeated = true;
                      guest.role = 'table_guest';
                      guest.recruitTargetId = null;
                      guest.speechBubbleText = 'וואלה יבש ברחבה... מתיישב גם 🪑🥱';
                      guest.wantsPhotoTimer = 2.8;
                    }
                  }
                }
              }
            } else {
              // 4. DANCING GUEST ON THE DANCE FLOOR:
              // Staggered organic entry from current seat (0.8s–2.5s delay between each guest),
              // walking from current position to their free spot on the dancefloor!
              const spotX = guest.danceSpotX ?? guest.homeX;
              const spotY = guest.danceSpotY ?? guest.homeY;
              const sdx = spotX - guest.x;
              const sdy = spotY - guest.y;
              const sDist = Math.hypot(sdx, sdy);

              if (guest.isEnteringFloor && (guest.arrivalDelayTimer ?? 0) > 0) {
                const sx = guest.seatX ?? guest.x;
                const sy = guest.seatY ?? guest.y;
                const dSeatWait = Math.hypot(sx - guest.x, sy - guest.y);
                if (dSeatWait > 8) {
                  // Still walking back to the chair – don't sit in mid-air
                  const w = 54 * simDt;
                  guest.x += ((sx - guest.x) / dSeatWait) * w;
                  guest.y += ((sy - guest.y) / dSeatWait) * w;
                  guest.strideDist += w * 1.5;
                  guest.isSeated = false;
                  guest.role = 'dancer';
                  const isoG = worldToIso(guest.x, guest.y);
                  const isoS = worldToIso(sx, sy);
                  guest.direction = angleToIsoDirection(Math.atan2(isoS.y - isoG.y, isoS.x - isoG.x));
                  continue;
                }
                guest.arrivalDelayTimer = Math.max(0, (guest.arrivalDelayTimer ?? 0) - simDt);
                guest.isSeated = true;
                guest.role = 'table_guest';
                guest.direction = guest.seatDir ?? 'S';
                continue;
              }

              guest.isSeated = false;
              guest.role = 'dancer';

              if (sDist > 6) {
                // Smoothly walking from current position to their free spot on the dancefloor
                const moveSpd = guest.speed * simDt;
                guest.x += (sdx / sDist) * moveSpd;
                guest.y += (sdy / sDist) * moveSpd;
                guest.strideDist += moveSpd * 1.5;
                const isoG = worldToIso(guest.x, guest.y);
                const isoSpot = worldToIso(spotX, spotY);
                guest.direction = angleToIsoDirection(
                  Math.atan2(isoSpot.y - isoG.y, isoSpot.x - isoG.x)
                );
              } else {
                if (guest.isEnteringFloor) {
                  guest.isEnteringFloor = false;
                }
                // Dancing IN PLACE at (spotX, spotY) with subtle rhythmic groove
                const grooveX = Math.cos(guest.dancePhase * 1.1 + guest.id) * 2.2;
                const grooveY = Math.sin(guest.dancePhase * 1.1 + guest.id) * 2.2;
                guest.x = spotX + grooveX;
                guest.y = spotY + grooveY;

                // Face photographer if nearby; else face partner or social cluster center!
                const partner =
                  guest.partnerId != null
                    ? guests.find(
                        (p) => p.id === guest.partnerId && p.guestActivity === 'dancing'
                      )
                    : undefined;
                const clusterCenter =
                  DANCE_CLUSTER_CENTERS[(guest.clusterIdx ?? 0) % DANCE_CLUSTER_CENTERS.length];

                if (dist < 85) {
                  const isoGuest = worldToIso(guest.x, guest.y);
                  const isoPl = worldToIso(player.x, player.y);
                  guest.direction = angleToIsoDirection(
                    Math.atan2(isoPl.y - isoGuest.y, isoPl.x - isoGuest.x)
                  );
                } else if (partner) {
                  const isoGuest = worldToIso(guest.x, guest.y);
                  const isoPartner = worldToIso(partner.x, partner.y);
                  guest.direction = angleToIsoDirection(
                    Math.atan2(isoPartner.y - isoGuest.y, isoPartner.x - isoGuest.x)
                  );
                } else if (clusterCenter) {
                  const isoGuest = worldToIso(guest.x, guest.y);
                  const isoCenter = worldToIso(clusterCenter.x, clusterCenter.y);
                  guest.direction = angleToIsoDirection(
                    Math.atan2(isoCenter.y - isoGuest.y, isoCenter.x - isoGuest.x)
                  );
                }
              }

              // Periodic Spot Switching on the Dance Floor (only after arriving on the floor!)
              if (!guest.isEnteringFloor) {
                guest.repositionTimer = (guest.repositionTimer ?? 6.5) - simDt;
              }
              if (!guest.isEnteringFloor && (guest.repositionTimer ?? 6.5) <= 0) {
                guest.repositionTimer = 6.0 + ((guest.id * 3) % 5) * 1.2;

                const partner =
                  guest.partnerId != null
                    ? guests.find(
                        (p) => p.id === guest.partnerId && p.guestActivity === 'dancing'
                      )
                    : undefined;

                // Only primary partner or solo dancer initiates a pair move
                if (!guest.isPartnerSecond || !partner) {
                  const moveWithPartner = Boolean(partner && Math.random() < 0.75);
                  const switchCluster = Math.random() < 0.65;
                  const nextSlot = ((guest.memberSlot ?? 0) + 1) % 5;

                  const nextSpot = pickNextSocialDanceSpot({
                    clusterCenters: DANCE_CLUSTER_CENTERS,
                    currentClusterIdx: guest.clusterIdx ?? 0,
                    memberSlot: nextSlot,
                    hasPartner: moveWithPartner,
                    isPartnerSecond: false,
                    switchCluster,
                  });

                  guest.clusterIdx = nextSpot.nextClusterIdx;
                  guest.memberSlot = nextSlot;
                  guest.danceSpotX = nextSpot.spotX;
                  guest.danceSpotY = nextSpot.spotY;
                  guest.homeX = nextSpot.spotX;
                  guest.homeY = nextSpot.spotY;

                  if (moveWithPartner && partner) {
                    const partnerSpot = pickNextSocialDanceSpot({
                      clusterCenters: DANCE_CLUSTER_CENTERS,
                      currentClusterIdx: partner.clusterIdx ?? 0,
                      memberSlot: nextSlot,
                      hasPartner: true,
                      isPartnerSecond: true,
                      switchCluster,
                    });
                    partner.clusterIdx = nextSpot.nextClusterIdx;
                    partner.memberSlot = nextSlot;
                    partner.danceSpotX = partnerSpot.spotX;
                    partner.danceSpotY = partnerSpot.spotY;
                    partner.homeX = partnerSpot.spotX;
                    partner.homeY = partnerSpot.spotY;
                    partner.repositionTimer = guest.repositionTimer;
                  }
                }
              }

              // Friendly gentle dancefloor nudge (NO DAMAGE!)
              if (dist < 24 && player.bumpFlashTimer <= 0) {
                player.bumpFlashTimer = 0.3;
                sound.playDanceBump();
                guest.speechBubbleText = '🕺 הופה!';
                guest.wantsPhotoTimer = 1.0;
                spawnParticles(guest.x, guest.y, 6, '#fda4af', 80);
                const pushX = (dx / dist) * 10;
                const pushY = (dy / dist) * 10;
                player.x += pushX;
                player.y += pushY;
              }
            }
          }

          // ====================================================================
          // BRIDE & GROOM: dance floor ↔ table visits ↔ bar; under the chuppah for the kiss moment
          // ====================================================================
          gameClock += simDt;
          for (let li = frameLabels.length - 1; li >= 0; li--) {
            frameLabels[li].life -= simDt;
            frameLabels[li].y -= simDt * 14;
            if (frameLabels[li].life <= 0) frameLabels.splice(li, 1);
          }
          updateVipCouple(simDt);

          // ====================================================================
          // UPDATE FLASH SHOTS & PHOTOGRAPH GUESTS (WITH VIP, FRAME PREFERENCES & TABLE REVIVAL)
          // ====================================================================
          const maxCapNow = getMaxCameraCapacity(upgradeLevels.pro_sdcard);
          const photographable = vipCouple.length ? [...guests, ...vipCouple] : guests;
          for (const pr of projectiles) {
            if (!pr.active) continue;
            pr.x += pr.vx * simDt;
            pr.y += pr.vy * simDt;
            pr.life -= simDt;
            if (pr.life <= 0) {
              pr.active = false;
              continue;
            }

            for (const guest of photographable) {
              const d = Math.hypot(pr.x - guest.x, pr.y - guest.y);
              if (d < 32) {
                pr.active = false;
                guest.hitFlashTimer = 0.16;
                guest.celebrateTimer = 1.1;
                guest.photoCount++;

                // Check Magnet Frame Preference Match
                const activeFrame = selectedFrameRef.current;
                const frameEval = evaluateFramePreferenceMatch(activeFrame, {
                  role: guest.role,
                  tableId: guest.tableId,
                  archetype: guest.archetype,
                });

                // If photographing a seated guest (when >10% are seated) or a recruiter at a table,
                // the flash hypes them up to jump onto the dance floor!
                const seatedNow = guests.filter((g) => g.guestActivity === 'seated');
                let revivedToDancefloor = false;
                if (guest.guestActivity === 'seated' && seatedNow.length > 2) {
                  guest.guestActivity = 'dancing';
                  guest.isSeated = false;
                  guest.role = 'dancer';
                  guest.danceMove = 'bounce';
                  revivedToDancefloor = true;
                } else if (guest.guestActivity === 'recruiting' && guest.recruitTargetId != null) {
                  const pulledSeat = guests.find(
                    (g) => g.id === guest.recruitTargetId && g.guestActivity === 'seated'
                  );
                  if (pulledSeat && seatedNow.length > 1) {
                    pulledSeat.guestActivity = 'dancing';
                    pulledSeat.isSeated = false;
                    pulledSeat.role = 'dancer';
                    pulledSeat.danceMove = 'bounce';
                    pulledSeat.speechBubbleText = '💃 לרחבה!';
                    pulledSeat.wantsPhotoTimer = 1.2;
                    guest.guestActivity = 'dancing';
                    guest.recruitTargetId = null;
                    revivedToDancefloor = true;
                  }
                }

                // Clear redundant post-shot speech bubble (the polaroid celebration frame is already shown!)
                guest.speechBubbleText = revivedToDancefloor
                  ? '💃 לרחבה!'
                  : frameEval.matched
                  ? `${MAGNET_FRAMES[activeFrame].icon} x1.5!`
                  : null;
                guest.wantsPhotoTimer = guest.speechBubbleText ? 1.1 : 0;

                // Photo goes into camera memory roll (up to SD card capacity) — remember who's in it
                if (player.photosInCamera < maxCapNow) {
                  player.photosInCamera++;
                  magnetLedger.push(guest.id, gameClock);
                }

                // Personality reactions (attention seeker satisfied / magnet tracker's countdown starts)
                if (guest.behavior) {
                  const res = onGuestPhotographed(guest.behavior, Math.random);
                  guest.behavior = res.state;
                  if (res.events.length) applyBehaviorEvents(guest, res.events);
                }
                if (guest.guestType === 'bride' || guest.guestType === 'groom') {
                  chuppahCelebrateTimer = 1.8;
                }

                // Mini photo thumbnail flies to photographer's camera bag!
                spawnFlyingThumb(
                  guest.x,
                  guest.y,
                  player.x,
                  player.y,
                  MAGNET_FRAMES[activeFrame].borderColor
                );

                // Combo & Score (with Frame Match +50% Bonus + Table Revival Bonus!)
                combo++;
                comboTimer = 4.2;
                sound.playComboChime(combo);

                // Subject rewards come from the whole-frame score at the shutter click;
                // per-capture extras: magnet-frame preference + reviving a seated guest + combo
                const gained =
                  scoreCaptureExtras({
                    kind: guest.guestType ?? 'regular',
                    frameMatched: frameEval.matched,
                    revived: revivedToDancefloor,
                  }) + Math.min(combo, 12) * 10;
                score += gained;
                bestScore = Math.max(bestScore, score);

                // Check if shot counts toward active VIP Moment ("צילום האירוע הנכון")!
                const isRightEventShot = Boolean(
                  vipEvent &&
                    doesShotCountForVipEvent(vipEvent, {
                      x: guest.x,
                      y: guest.y,
                      role: guest.role,
                      tableId: guest.tableId,
                    })
                );

                const shotJoyEval = evaluateGuestJoyFromShot({
                  activeVipEvent: vipEvent,
                  isRightEventShot,
                  isFrameMatched: frameEval.matched,
                  revivedSeatedGuest: revivedToDancefloor,
                });

                // Apply Guest Joy delta based on whether this was the RIGHT event!
                player.partyJoy = Math.min(100, player.partyJoy + shotJoyEval.joyDelta);

                if (vipEvent && isRightEventShot) {
                  const nextCaptured = vipEvent.photosCaptured + 1;
                  if (nextCaptured >= vipEvent.requiredPhotos) {
                    const isVipFrameMatch = activeFrame === vipEvent.preferredFrame;
                    const vipScore = Math.round(
                      vipEvent.bonusScore * (isVipFrameMatch ? 1.5 : 1.0)
                    );
                    score += vipScore;
                    bestScore = Math.max(bestScore, score);
                    player.partyJoy = Math.min(100, player.partyJoy + vipEvent.bonusJoy);
                    if (player.photosInCamera < maxCapNow) {
                      player.photosInCamera++;
                      magnetLedger.push(null, gameClock);
                    }
                    sound.playFanfare(true);
                    spawnParticles(guest.x, guest.y, 36, '#fbbf24', 180, 48);
                    player.stationFeedbackText = `⭐ צילמת את האירוע הנכון! +${vipEvent.bonusJoy}% שמחה ו-+${vipScore} נק'! עכשיו הוצא מגנט ללוח בזמן! ⏱️🧲`;
                    player.stationFeedbackTimer = 3.4;
                    vipEvent = null;
                    nextVipCooldown = 4.5;
                  } else {
                    vipEvent = {
                      ...vipEvent,
                      photosCaptured: nextCaptured,
                    };
                    player.stationFeedbackText = `🎯 צילמת את האירוע הנכון (${nextCaptured}/${vipEvent.requiredPhotos})! +${shotJoyEval.joyDelta}% שמחה!`;
                    player.stationFeedbackTimer = 2.0;
                  }
                } else if (vipEvent && !isRightEventShot) {
                  guest.speechBubbleText =
                    vipEvent.kind === 'table_toast'
                      ? `🥂 לשולחן #${vipEvent.targetTableId}!`
                      : vipEvent.kind === 'chuppah_kiss'
                      ? '💍 לחופה!'
                      : '💃 להורה!';
                  guest.wantsPhotoTimer = 1.3;
                  player.stationFeedbackText = shotJoyEval.feedbackHe;
                  player.stationFeedbackTimer = 2.4;
                } else if (revivedToDancefloor) {
                  player.stationFeedbackText = '💃 הקמת אורח מהשולחן לרחבה! עכשיו פתח והוצא מגנט בזמן!';
                  player.stationFeedbackTimer = 2.0;
                } else {
                  player.stationFeedbackText = shotJoyEval.feedbackHe;
                  player.stationFeedbackTimer = 1.8;
                }

                hitstopRemaining = 0.045;
                cameraTrauma = Math.min(1, cameraTrauma + 0.22);
                spawnParticles(
                  guest.x,
                  guest.y,
                  20,
                  MAGNET_FRAMES[activeFrame].borderColor,
                  140
                );
                break;
              }
            }

          }

          // Update Flying Photo Thumbnails
          for (const th of flyingThumbs) {
            if (!th.active) continue;
            th.progress += simDt * 3.2;
            th.targetX = player.x;
            th.targetY = player.y;
            th.currentX = th.startX + (th.targetX - th.startX) * th.progress;
            th.currentY = th.startY + (th.targetY - th.startY) * th.progress;
            if (th.progress >= 1.0) {
              th.active = false;
              sound.playDanceBump();
            }
          }

          // Check Wave Magnet Quota Completion or DJ Track End
          const cfg = getWaveConfig(wave);
          const quotaMet = magnetsPrintedThisWave >= cfg.targetMagnets;
          const isStickingAnimActive =
            pendingBoardSticks > 0 || flyingMagnets.some((m) => m.active);

          if (quotaMet && !pendingOutcome && !isStickingAnimActive) {
            // Stage Complete! Advancing or Wedding Victory!
            if (wave >= 4) {
              pendingOutcome = 'victory';
              endBeatTimer = 0.8;
            } else {
              wave++;
              player.partyJoy = 100;
              sound.playFanfare(true);
              spawnParticles(0, 0, 50, '#f59e0b', 240);
              spawnWave(wave);
            }
          } else if (trackTimeRemaining <= 0 && !pendingOutcome && !isStickingAnimActive) {
            pendingOutcome = quotaMet ? 'victory' : 'defeat';
            endBeatTimer = 0.6;
          }
        }

        const targetIso = worldToIso(player.x, player.y);
        camX += (targetIso.x * 0.55 - camX) * Math.min(1, dt * 8);
        camY += (targetIso.y * 0.55 - camY) * Math.min(1, dt * 8);
      }

      // Update Flying Magnets
      for (const m of flyingMagnets) {
        if (!m.active) continue;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.z = Math.max(0, m.z + m.vz * dt);
        m.vz -= 310 * dt;
        m.rot += m.vRot * dt;
        m.life -= dt;
        if (m.life <= 0) m.active = false;
      }

      // Update Particles
      for (const p of particles) {
        if (!p.active) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z = Math.max(0, p.z + p.vz * dt);
        p.vz -= 210 * dt;
        p.life -= dt;
        if (p.life <= 0) p.active = false;
      }

      keysJustPressed.clear();
      mouseJustPressed = false;

      // ========================================================================
      // RENDER ISOMETRIC "חצר המלכה" (HATZAR HAMALKA) PIXEL-ART VENUE & DANCE FLOOR
      // ========================================================================
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0f0b18';
      ctx.fillRect(0, 0, viewW, viewH);

      const worldZoom = Math.max(
        0.65,
        Math.min(1.28, Math.min(viewW / 1120, viewH / 740))
      );
      ctx.save();
      ctx.translate(viewW * 0.5, viewH * 0.52);
      ctx.scale(worldZoom, worldZoom);
      ctx.translate(-viewW * 0.5, -viewH * 0.52);

      const shakeMag = cameraTrauma * cameraTrauma * 10;
      const shakeX = (Math.random() * 2 - 1) * shakeMag;
      const shakeY = (Math.random() * 2 - 1) * shakeMag;
      const originX = viewW * 0.5 - camX + shakeX;
      const originY = viewH * 0.52 - camY + shakeY;

      // 1. Hatzar HaMalka Dark Polished Slate Floor, Purple Light Wash Pools & Golden Glass Chuppah Runway
      const floorSize = 440;
      const tileStep = 55;
      drawHallFloor(ctx, originX, originY, floorSize, tileStep);
      drawGoboProjections(ctx, originX, originY, discoBeatPhase / 2.8);
      drawChuppahRunway(ctx, originX, originY, discoBeatPhase);

      // Rose petals & metallic confetti on the floor
      for (const petal of floorPetals) {
        const ptIso = worldToIso(petal.x, petal.y);
        ctx.fillStyle = petal.color;
        ctx.beginPath();
        ctx.ellipse(originX + ptIso.x, originY + ptIso.y, 3, 1.8, petal.x, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Hatzar HaMalka Wood-Slat & LED Walls, Mezzanine Balcony, Giant Rattan Domes, Fairy-Light Curtain & Mirror Spheres
      drawHallWalls(ctx, originX, originY, floorSize, discoBeatPhase / 2.8);

      // ========================================================================
      // DEPTH SORTED SCENE DRAWABLES (Olive Tree, DJ Stage, Bar, Chuppah, Tables, Workstation, Board, Guests, Player)
      // ========================================================================
      interface Drawable {
        sortY: number;
        draw: () => void;
      }
      const drawables: Drawable[] = [];

      const hallT = discoBeatPhase / 2.8;

      // 2A-1. Lounge: uplit white-trunk tree on a wooden deck + curved velvet sofa, armchairs, rug
      const treeIso = worldToIso(LOUNGE.treeX, LOUNGE.treeY);
      drawables.push({
        sortY: treeIso.y,
        draw: () => drawUplitTree(ctx, originX, originY, LOUNGE.treeX, LOUNGE.treeY, hallT),
      });
      const loungeIso = worldToIso(LOUNGE.sofaX, LOUNGE.sofaY);
      drawables.push({
        sortY: loungeIso.y - 20,
        draw: () => drawVelvetLounge(ctx, originX, originY, LOUNGE.sofaX, LOUNGE.sofaY),
      });
      for (const rt of RATTAN_HIGH_TABLES) {
        const rtIso = worldToIso(rt.x, rt.y);
        drawables.push({
          sortY: rtIso.y,
          draw: () => drawRattanHighTable(ctx, originX, originY, rt.x, rt.y),
        });
      }

      // 2A-2. Square black island bar: counter split into pieces for depth, backlit bottle tower,
      // and the bartender crew (1 man : 3 women, all in black) working inside the ring
      for (const piece of getIslandBarPieces()) {
        const pIso = worldToIso(piece.wx + piece.w / 2, piece.wy + piece.d / 2);
        drawables.push({
          sortY: pIso.y,
          draw: () => drawIslandBarPiece(ctx, originX, originY, piece, drawIsoBox, hallT),
        });
      }
      const towerIso = worldToIso(ISLAND_BAR.cx, ISLAND_BAR.cy);
      drawables.push({
        sortY: towerIso.y,
        draw: () => drawBarShelfTower(ctx, originX, originY, drawIsoBox, hallT),
      });
      BARTENDER_LOOKS.forEach((look, bi) => {
        const pose = getBartenderPose(bi, hallT);
        const bIso = worldToIso(pose.x, pose.y);
        drawables.push({
          sortY: bIso.y,
          draw: () =>
            drawBartender(ctx, originX + bIso.x, originY + bIso.y, look, pose.action, hallT, bi + 1),
        });
      });

      // 2A-3. Raised DJ Stage, Giant Animated LED Video Wall & Cyan LED Booth (photos 6 & 13)
      const djIso = worldToIso(-95, -245);
      drawables.push({
        sortY: djIso.y,
        draw: () => {
          drawPixelDjStageAndLedWall(ctx, originX, originY, discoBeatPhase, drawIsoBox);
        },
      });

      // Dancefloor Monitor Subwoofer with Pulsing Bass Rings
      const speakerIso = worldToIso(-88, 68);
      drawables.push({
        sortY: speakerIso.y,
        draw: () => {
          const bassBump = Math.abs(Math.sin(discoBeatPhase * 2)) * 2;
          drawIsoBox(
            originX,
            originY,
            -102,
            56,
            26,
            24,
            28 + bassBump,
            '#334155',
            '#0f172a',
            '#1e293b',
            '#020617'
          );
          const coneIso = worldToIso(-89, 79, 14);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(
            originX + coneIso.x,
            originY + coneIso.y,
            6 + ((discoBeatPhase * 8) % 10),
            0,
            Math.PI * 2
          );
          ctx.stroke();
        },
      });

      // 2B. Long banquet tables (white cloth, flower ball + crystal candelabra), ghost chairs on empty seats
      for (const tbl of BANQUET_TABLES) {
        const tIso = worldToIso(tbl.wx, tbl.wy);
        drawables.push({
          sortY: tIso.y,
          draw: () =>
            drawLongBanquetTable(ctx, originX, originY, tbl.wx, tbl.wy, drawIsoBox, {
              tableNumber: tbl.id * 7 + 1,
              t: hallT,
            }),
        });
        for (const seat of LONG_TABLE_SEATS) {
          const sxw = tbl.wx + seat.dx;
          const syw = tbl.wy + seat.dy;
          const occupied = guests.some(
            (g) => g.isSeated && Math.abs(g.x - sxw) < 5 && Math.abs(g.y - syw) < 5
          );
          if (occupied) continue;
          const cIso = worldToIso(sxw, syw);
          drawables.push({
            sortY: cIso.y - 0.1,
            draw: () => drawGhostChair(ctx, originX + cIso.x, originY + cIso.y, seat.dir === 'SW'),
          });
        }
      }
      // Decorative full tables to give the hall its real scale (static seated guests)
      {
        const outfitsDecor = characterConfigRef.current.guestOutfits;
        DECOR_TABLES.forEach((dt, di) => {
          const dIso = worldToIso(dt.x, dt.y);
          drawables.push({
            sortY: dIso.y,
            draw: () =>
              drawLongBanquetTable(ctx, originX, originY, dt.x, dt.y, drawIsoBox, {
                tableNumber: dt.number,
                t: hallT,
              }),
          });
          LONG_TABLE_SEATS.forEach((seat, si) => {
            const gx = dt.x + seat.dx;
            const gy = dt.y + seat.dy;
            const gIso = worldToIso(gx, gy);
            const style = outfitsDecor[(di * 5 + si * 3) % outfitsDecor.length];
            const dummy: WeddingGuestActor = {
              id: 500 + di * 10 + si,
              role: 'table_guest',
              outfitIndex: 0,
              archetype: 'swarmer',
              x: gx,
              y: gy,
              homeX: gx,
              homeY: gy,
              vx: 0,
              vy: 0,
              speed: 0,
              dancePhase: 0,
              danceTempo: 1,
              danceMove: si % 2 === 0 ? 'eating' : 'toasting',
              direction: seat.dir as IsoDirection,
              strideDist: hallT * 6 + si,
              outfitColor: style?.outfit ?? '#334155',
              hairColor: style?.hair ?? '#1c1410',
              isDress: style?.isDress ?? false,
              hatType: 'none',
              hasMagnet: false,
              photoCount: 0,
              celebrateTimer: 0,
              hitFlashTimer: 0,
              wantsPhotoTimer: 0,
              speechBubbleText: null,
              poseTimer: 0,
              isSeated: true,
            };
            drawables.push({
              sortY: gIso.y,
              draw: () =>
                drawWeddingGuestSprite(originX + gIso.x, originY + gIso.y, dummy, dummy.strideDist),
            });
          });
        });
      }

      // 2C. All-White Draped Chuppah with Baby's-Breath Crown, White Lounge Benches, Lanterns & Floral Pedestals (photos 7, 8, 9)
      const chuppahIso = worldToIso(115, -185);
      drawables.push({
        sortY: chuppahIso.y,
        draw: () => {
          drawPixelHatzarChuppah(ctx, originX, originY, discoBeatPhase, drawIsoBox);
        },
      });

      // VIP Lineup under Chuppah (Bride, Groom, Rabbi & Parents - without sign clutter!)
      const chuppahGuests = [
        { wx: -52, wy: -205, outfit: '#334155', hair: '#3b2314', isDress: false, hat: 'green_top' as const, sign: null },
        { wx: 15, wy: -225, outfit: '#1e293b', hair: '#78350f', isDress: false, hat: 'none' as const, sign: null },
        { wx: 72, wy: -222, outfit: '#574636', hair: '#1c1410', isDress: false, hat: 'none' as const, sign: null },
        // (the bride & groom are real actors now — see vipCouple)
      ];

      for (let idx = 0; idx < chuppahGuests.length; idx++) {
        const cg = chuppahGuests[idx];
        const cgIso = worldToIso(cg.wx, cg.wy);
        drawables.push({
          sortY: cgIso.y,
          draw: () => {
            const dummyGuest: WeddingGuestActor = {
              id: 990 + idx,
              role: 'dancer',
              outfitIndex: idx,
              archetype: 'swarmer',
              x: cg.wx,
              y: cg.wy,
              homeX: cg.wx,
              homeY: cg.wy,
              vx: 0,
              vy: 0,
              speed: 0,
              dancePhase: 0,
              danceTempo: 1,
              danceMove: 'bounce',
              direction: 'S',
              strideDist: titlePanTime * 2 + discoBeatPhase * 2,
              outfitColor: cg.outfit,
              hairColor: cg.hair,
              isDress: cg.isDress,
              hatType: cg.hat,
              hasMagnet: true,
              photoCount: 1,
              celebrateTimer:
                idx >= 3 && (chuppahCelebrateTimer > 0 || vipEvent?.kind === 'chuppah_kiss')
                  ? Math.max(0.5, chuppahCelebrateTimer)
                  : 0,
              hitFlashTimer: chuppahCelebrateTimer > 1.6 && idx >= 3 ? 0.15 : 0,
              wantsPhotoTimer: vipEvent?.kind === 'chuppah_kiss' ? 5 : 0,
              speechBubbleText:
                chuppahCelebrateTimer > 0 && idx === 4
                  ? 'תמונה מושלמת בחופה! 💍✨'
                  : vipEvent?.kind === 'chuppah_kiss' && idx === 4
                  ? '💍 צלם אותנו בחופה!'
                  : null,
              poseTimer: 0,
              isSeated: false,
            };
            drawWeddingGuestSprite(
              originX + cgIso.x,
              originY + cgIso.y,
              dummyGuest,
              titlePanTime * 2 + discoBeatPhase * 2
            );
          },
        });
      }

      // ========================================================================
      // 3A. FAR-CORNER MAGNET PRODUCTION WORKSTATION (Section 5 - שדרוג עמדת המגנטים ב-3D)
      // ========================================================================
      const stationIso = worldToIso(WORKSTATION_POS.x, WORKSTATION_POS.y);
      drawables.push({
        sortY: stationIso.y,
        draw: () => {
          const sx = originX + stationIso.x;
          const sy = originY + stationIso.y;

          // Glowing LED Under-Table Floor Aura
          const hasWorkstationTask =
            player.photosInCamera > 0 ||
            player.photosOnComputer > 0 ||
            player.cameraOnDesk ||
            player.uncutSheetsAtStation > 0;
          const auraRadius = player.isNearStation ? 92 : hasWorkstationTask ? 76 : 58;
          const auraGrad = ctx.createRadialGradient(sx, sy + 6, 10, sx, sy + 6, auraRadius);
          if (player.uncutSheetsAtStation > 0) {
            auraGrad.addColorStop(0, 'rgba(34, 211, 238, 0.48)');
            auraGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
          } else if (player.photosInCamera > 0 || player.isNearStation) {
            auraGrad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
            auraGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
          } else {
            auraGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
            auraGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          }
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.ellipse(sx, sy + 6, auraRadius, auraRadius * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // 1. Fitted Black & Gold Pleated Workstation Table Skirt
          // Desk widened (116 wide) so the camera has room next to the laptop
          drawIsoBox(
            originX,
            originY,
            WORKSTATION_POS.x - 70,
            WORKSTATION_POS.y - 28,
            116,
            50,
            34,
            '#1e293b',
            '#0f172a',
            '#1e1b4b',
            '#f59e0b'
          );

          // Glowing Cyan/Amber LED Strip along the top edge of the workstation table
          drawIsoBox(
            originX,
            originY,
            WORKSTATION_POS.x - 67,
            WORKSTATION_POS.y - 25,
            110,
            44,
            2.5,
            '#0f172a',
            '#38bdf8',
            '#f59e0b',
            '#020617',
            34
          );

          // Compute live sheet-by-sheet animation progress
          const pProg = getWorkstationSheetProgress(
            player.printerAnimTimer,
            player.printerAnimDuration,
            player.printerTotalSheets
          );
          const cProg = getWorkstationSheetProgress(
            player.cutterAnimTimer,
            player.cutterAnimDuration,
            player.cutterTotalSheets
          );
          const isPrintingNow = player.printerAnimTimer > 0;
          const isCuttingNow = player.cutterAnimTimer > 0;
          const idleUncutSheets = Math.ceil(player.uncutSheetsAtStation / PHOTOS_PER_SHEET);

          // Glowing USB Data Cable connecting Laptop to Thermal Printer on table top
          const lapAnchorIso = worldToIso(WORKSTATION_POS.x - 28, WORKSTATION_POS.y - 10, 46);
          const isTransferringNow = player.transferAnimTimer > 0;
          const transferProg =
            player.transferAnimDuration > 0
              ? 1 - player.transferAnimTimer / player.transferAnimDuration
              : 0;
          const prnAnchorIso = worldToIso(WORKSTATION_POS.x - 2, WORKSTATION_POS.y - 4, 48);
          ctx.strokeStyle = isPrintingNow ? '#38bdf8' : '#fbbf24';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(originX + lapAnchorIso.x + 12, originY + lapAnchorIso.y + 6);
          ctx.quadraticCurveTo(
            originX + (lapAnchorIso.x + prnAnchorIso.x) * 0.5,
            originY + lapAnchorIso.y + 16,
            originX + prnAnchorIso.x - 12,
            originY + prnAnchorIso.y + 6
          );
          ctx.stroke();

          // 2. Pixel-Art Laptop + Adhesive Magnet Sheets on the left side of the table
          drawPixelLaptop(
            ctx,
            originX + lapAnchorIso.x - 32,
            originY + lapAnchorIso.y - 24,
            64,
            45,
            {
              isPrinting: isPrintingNow,
              isCutting: isCuttingNow,
              photosInCamera: player.photosInCamera,
              isTransferring: isTransferringNow,
              transferProgress: transferProg,
              photosOnComputer: player.photosOnComputer,
              uncutSheets: idleUncutSheets,
              sheetProgress: isPrintingNow ? pProg.sheetProgress : 0,
              currentSheet: isPrintingNow ? pProg.currentSheet : 1,
              totalSheets: isPrintingNow
                ? player.printerTotalSheets
                : Math.ceil(player.photosOnComputer / PHOTOS_PER_SHEET),
              timeSec: discoBeatPhase,
            },
            { transparentBg: true }
          );

          // 2b. The photographer's DSLR lying on the desk while its card is in the laptop
          if (player.cameraOnDesk) {
            // Left end of the widened desk, clear of the seated photographer so it stays visible
            const camIso = worldToIso(WORKSTATION_POS.x - 62, WORKSTATION_POS.y + 12, 35);
            const cx = Math.round(originX + camIso.x);
            const cy = Math.round(originY + camIso.y);
            ctx.save();
            ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 2, 11, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#111827'; // body
            ctx.fillRect(cx - 9, cy - 9, 18, 10);
            ctx.fillStyle = '#374151'; // grip + top plate
            ctx.fillRect(cx - 9, cy - 9, 4, 10);
            ctx.fillRect(cx - 4, cy - 12, 8, 3);
            ctx.fillStyle = '#e2e8f0'; // speedlight
            ctx.fillRect(cx - 3, cy - 17, 6, 5);
            ctx.fillStyle = '#0f172a'; // lens
            ctx.beginPath();
            ctx.arc(cx + 3, cy - 4, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(cx + 2, cy - 6, 2, 2);
            // Empty card door (open, card is in the laptop) + blinking LED while copying
            ctx.fillStyle = '#f97316';
            ctx.fillRect(cx + 7, cy - 8, 2, 4);
            if (isTransferringNow && Math.floor(discoBeatPhase * 6) % 2 === 0) {
              ctx.fillStyle = '#4ade80';
              ctx.fillRect(cx - 7, cy - 7, 2, 2);
            }
            ctx.restore();
          }

          // 3. Pixel-Art Mitsubishi White Thermal Photo Printer in the center of the table
          drawPixelThermalPrinter(
            ctx,
            originX + prnAnchorIso.x - 35,
            originY + prnAnchorIso.y - 26,
            70,
            48,
            {
              isPrinting: isPrintingNow,
              sheetProgress: isPrintingNow ? pProg.sheetProgress : 0,
              currentSheet: isPrintingNow ? pProg.currentSheet : 1,
              totalSheets: isPrintingNow ? player.printerTotalSheets : 0,
              sheetsInTray: isPrintingNow ? pProg.completedSheets : idleUncutSheets,
              photosQueued: player.photosInCamera,
              timeSec: discoBeatPhase,
            },
            { transparentBg: true }
          );

          // 4. Pixel-Art KW-triO 3925 Blue Guillotine Cutter on the right side of the table
          const cutAnchorIso = worldToIso(WORKSTATION_POS.x + 28, WORKSTATION_POS.y + 8, 46);
          drawPixelGuillotineCutter(
            ctx,
            originX + cutAnchorIso.x - 35,
            originY + cutAnchorIso.y - 26,
            70,
            48,
            {
              isCutting: isCuttingNow,
              cutProgress: isCuttingNow ? cProg.sheetProgress : 0,
              currentSheet: isCuttingNow ? cProg.currentSheet : 1,
              totalSheets: isCuttingNow ? player.cutterTotalSheets : 0,
              uncutSheetsWaiting: isCuttingNow
                ? Math.max(1, player.cutterTotalSheets - cProg.completedSheets)
                : idleUncutSheets,
              cutMagnetsReady: player.cutMagnetsInHand,
              timeSec: discoBeatPhase,
            },
            { transparentBg: true }
          );

          // Conditional Compact Badge above the Corner Table (only when active or player is nearby)
          const showStationBadge =
            isTransferringNow ||
            player.cameraOnDesk ||
            isPrintingNow ||
            isCuttingNow ||
            player.isNearStation ||
            player.isSeatedAtStation ||
            player.uncutSheetsAtStation > 0;
          if (showStationBadge) {
            const badgeIso = worldToIso(WORKSTATION_POS.x + 12, WORKSTATION_POS.y - 18, 92);
            const bx = originX + badgeIso.x;
            const by = originY + badgeIso.y;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            ctx.strokeStyle =
              isPrintingNow || isCuttingNow
                ? '#38bdf8'
                : player.uncutSheetsAtStation > 0
                ? '#22d3ee'
                : '#f59e0b';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.roundRect(bx - 48, by - 13, 96, isTransferringNow || isPrintingNow || isCuttingNow ? 22 : 16, [5]);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle =
              isTransferringNow
                ? '#4ade80'
                : isPrintingNow
                ? '#38bdf8'
                : isCuttingNow
                ? '#fbbf24'
                : '#fef08a';
            ctx.font = 'bold 7.5px "Heebo", sans-serif';
            ctx.textAlign = 'center';
            const badgeTitle = isTransferringNow
              ? `💾 → 💻 ${player.transferBatch} (${player.transferAnimTimer.toFixed(1)}s)`
              : isPrintingNow
              ? `🖨️ ${pProg.currentSheet}/${player.printerTotalSheets} (${player.printerAnimTimer.toFixed(1)}s)`
              : isCuttingNow
              ? `✂️ ${cProg.currentSheet}/${player.cutterTotalSheets} (${player.cutterAnimTimer.toFixed(1)}s)`
              : player.uncutSheetsAtStation > 0
              ? `✂️ [E] חתוך (${player.uncutSheetsAtStation})`
              : player.photosOnComputer > 0
              ? `🖨️ [E] הדפס (${player.photosOnComputer})`
              : player.photosInCamera > 0
              ? `💾 [E] העבר למחשב (${player.photosInCamera})`
              : player.cameraOnDesk
              ? '📷 המצלמה על השולחן'
              : '🪑 עמדת מגנטים';
            ctx.fillText(badgeTitle, bx, by - 2);

            if (isTransferringNow || isPrintingNow || isCuttingNow) {
              const prog = isTransferringNow
                ? transferProg
                : isPrintingNow
                ? pProg.overallProgress
                : cProg.overallProgress;
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(bx - 38, by + 3, 76, 3.5);
              ctx.fillStyle = isTransferringNow ? '#4ade80' : isPrintingNow ? '#38bdf8' : '#fbbf24';
              ctx.fillRect(bx - 38, by + 3, Math.round(76 * prog), 3.5);
            }
          }
        },
      });

      // ========================================================================
      // 3A-CHAIR. PHOTOGRAPHER'S SWIVEL CHAIR AT MAGNET WORKSTATION
      // ========================================================================
      const chairIso = worldToIso(WORKSTATION_CHAIR_POS.x, WORKSTATION_CHAIR_POS.y);
      drawables.push({
        sortY: chairIso.y - 1.5,
        draw: () => {
          const cx = WORKSTATION_CHAIR_POS.x;
          const cy = WORKSTATION_CHAIR_POS.y;
          const baseIso = worldToIso(cx, cy, 0);
          const sx = originX + baseIso.x;
          const sy = originY + baseIso.y;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
          ctx.beginPath();
          ctx.ellipse(sx, sy + 2, 16, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          if (player.isSeatedAtStation) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(sx, sy + 2, 20, 10, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          const legOffsets = [
            { dx: -11, dy: 0 },
            { dx: 11, dy: 0 },
            { dx: 0, dy: -11 },
            { dx: 0, dy: 11 },
            { dx: -8, dy: 8 },
          ];
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2.4;
          for (const leg of legOffsets) {
            const footIso = worldToIso(cx + leg.dx, cy + leg.dy, 1);
            ctx.beginPath();
            ctx.moveTo(sx, sy - 2);
            ctx.lineTo(originX + footIso.x, originY + footIso.y);
            ctx.stroke();

            ctx.fillStyle = '#020617';
            ctx.beginPath();
            ctx.arc(originX + footIso.x, originY + footIso.y + 1, 2, 0, Math.PI * 2);
            ctx.fill();
          }

          const colTop = worldToIso(cx, cy, 13);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(sx, sy - 2);
          ctx.lineTo(originX + colTop.x, originY + colTop.y);
          ctx.stroke();

          drawIsoBox(
            originX,
            originY,
            cx - 10,
            cy - 10,
            20,
            20,
            4.5,
            player.isSeatedAtStation ? '#0284c7' : '#1e293b',
            '#0f172a',
            '#334155',
            '#020617',
            13
          );
        },
      });

      drawables.push({
        sortY: chairIso.y + 2.5,
        draw: () => {
          const cx = WORKSTATION_CHAIR_POS.x;
          const cy = WORKSTATION_CHAIR_POS.y;

          drawIsoBox(
            originX,
            originY,
            cx - 11,
            cy - 6,
            3,
            14,
            7,
            '#334155',
            '#0f172a',
            '#1e293b',
            '#020617',
            17
          );
          drawIsoBox(
            originX,
            originY,
            cx + 8,
            cy - 6,
            3,
            14,
            7,
            '#334155',
            '#0f172a',
            '#1e293b',
            '#020617',
            17
          );

          drawIsoBox(
            originX,
            originY,
            cx - 9,
            cy + 7,
            18,
            4,
            17,
            '#0284c7',
            '#0f172a',
            '#1e293b',
            '#020617',
            17.5
          );
        },
      });

      // ========================================================================
      // 3B. STANDING TRIPOD MAGNETIC WHITEBOARD WITH FAIRY LIGHTS GARLAND (Section 5)
      // ========================================================================
      const boardSortIso = worldToIso(TRIPOD_BOARD_POS.x, TRIPOD_BOARD_POS.y);
      drawables.push({
        sortY: boardSortIso.y,
        draw: () => {
          const bx = TRIPOD_BOARD_POS.x;
          const by = TRIPOD_BOARD_POS.y;
          const baseIso = worldToIso(bx, by, 0);

          const leftFoot = worldToIso(bx - 13, by + 11, 0);
          const rightFoot = worldToIso(bx + 13, by + 11, 0);
          const rearFoot = worldToIso(bx, by - 16, 0);

          const frameBL = worldToIso(bx - 14, by + 2, 28);
          const frameBR = worldToIso(bx + 14, by + 2, 28);
          const frameTL = worldToIso(bx - 14, by + 2, 82);
          const frameTR = worldToIso(bx + 14, by + 2, 82);
          const apex = worldToIso(bx, by - 2, 75);

          const isNearBoard = player.isNearBoard;
          const hasCutMagnetsToStick = player.cutMagnetsInHand > 0;

          // Ground shadow & warm fairy-light floor pool
          ctx.fillStyle = 'rgba(20, 15, 12, 0.45)';
          ctx.beginPath();
          ctx.ellipse(
            originX + baseIso.x,
            originY + baseIso.y + 3,
            isNearBoard || hasCutMagnetsToStick ? 38 : 28,
            isNearBoard || hasCutMagnetsToStick ? 19 : 13,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();

          if (isNearBoard || hasCutMagnetsToStick || availableMagnetsOnBoard > 0) {
            ctx.fillStyle = hasCutMagnetsToStick
              ? 'rgba(74, 222, 128, 0.35)'
              : 'rgba(251, 191, 36, 0.25)';
            ctx.beginPath();
            ctx.ellipse(originX + baseIso.x, originY + baseIso.y + 3, 46, 23, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // Rear & Front Tripod Legs
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 3.6;
          ctx.beginPath();
          ctx.moveTo(originX + rearFoot.x, originY + rearFoot.y);
          ctx.lineTo(originX + apex.x, originY + apex.y);
          ctx.stroke();

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 3.8;
          ctx.beginPath();
          ctx.moveTo(originX + leftFoot.x, originY + leftFoot.y);
          ctx.lineTo(originX + frameBL.x, originY + frameBL.y);
          ctx.lineTo(originX + frameTL.x, originY + frameTL.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(originX + rightFoot.x, originY + rightFoot.y);
          ctx.lineTo(originX + frameBR.x, originY + frameBR.y);
          ctx.lineTo(originX + frameTR.x, originY + frameTR.y);
          ctx.stroke();

          ctx.fillStyle = '#020617';
          for (const foot of [leftFoot, rightFoot, rearFoot]) {
            ctx.beginPath();
            ctx.arc(originX + foot.x, originY + foot.y, 3, 0, Math.PI * 2);
            ctx.fill();
          }

          const shelfL = worldToIso(bx - 11, by + 5, 22);
          const shelfR = worldToIso(bx + 11, by + 5, 22);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(originX + shelfL.x, originY + shelfL.y);
          ctx.lineTo(originX + shelfR.x, originY + shelfR.y);
          ctx.stroke();

          // Crisp White Magnetic Whiteboard Surface
          ctx.beginPath();
          ctx.moveTo(originX + frameBL.x, originY + frameBL.y);
          ctx.lineTo(originX + frameBR.x, originY + frameBR.y);
          ctx.lineTo(originX + frameTR.x, originY + frameTR.y);
          ctx.lineTo(originX + frameTL.x, originY + frameTL.y);
          ctx.closePath();
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 3.2;
          ctx.stroke();

          // Glossy whiteboard reflection
          const sheenTL = worldToIso(bx - 13, by + 2, 80);
          const sheenBR = worldToIso(bx + 13, by + 2, 30);
          const gloss = ctx.createLinearGradient(
            originX + sheenTL.x,
            originY + sheenTL.y,
            originX + sheenBR.x,
            originY + sheenBR.y
          );
          gloss.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
          gloss.addColorStop(0.5, 'rgba(241, 245, 249, 0.1)');
          gloss.addColorStop(1, 'rgba(226, 232, 240, 0.35)');
          ctx.fillStyle = gloss;
          ctx.beginPath();
          ctx.moveTo(originX + frameBL.x, originY + frameBL.y);
          ctx.lineTo(originX + frameBR.x, originY + frameBR.y);
          ctx.lineTo(originX + frameTR.x, originY + frameTR.y);
          ctx.lineTo(originX + frameTL.x, originY + frameTL.y);
          ctx.closePath();
          ctx.fill();

          // Black Top Clamp Bar
          const clampBL = worldToIso(bx - 14, by + 2, 77);
          const clampBR = worldToIso(bx + 14, by + 2, 77);
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(originX + clampBL.x, originY + clampBL.y);
          ctx.lineTo(originX + clampBR.x, originY + clampBR.y);
          ctx.lineTo(originX + frameTR.x, originY + frameTR.y);
          ctx.lineTo(originX + frameTL.x, originY + frameTL.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Twinkling Warm Fairy Lights Garland wrapped around the Easel Frame (Section 5)
          const bulbCoords = [
            frameTL,
            worldToIso(bx - 7, by + 2, 83),
            worldToIso(bx, by + 2, 84),
            worldToIso(bx + 7, by + 2, 83),
            frameTR,
            worldToIso(bx - 14.5, by + 2, 65),
            worldToIso(bx + 14.5, by + 2, 65),
            worldToIso(bx - 14.5, by + 2, 46),
            worldToIso(bx + 14.5, by + 2, 46),
          ];
          for (let bIdx = 0; bIdx < bulbCoords.length; bIdx++) {
            const bIso = bulbCoords[bIdx];
            const twinkle = 0.65 + 0.35 * Math.sin(discoBeatPhase * 3.5 + bIdx * 1.3);
            ctx.fillStyle = `rgba(253, 224, 71, ${twinkle.toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(originX + bIso.x, originY + bIso.y, 2.3, 0, Math.PI * 2);
            ctx.fill();
          }

          // Grid of attached souvenir photo magnets with mini portraits
          const magnetsOnEasel = Math.min(8, Math.max(0, availableMagnetsOnBoard));
          const magnetPalette = [
            '#38bdf8',
            '#fb7185',
            '#a855f7',
            '#fbbf24',
            '#34d399',
            '#f97316',
            '#06b6d4',
            '#ec4899',
          ];
          const activeFrameCfg = MAGNET_FRAMES[selectedFrameRef.current];
          for (let i = 0; i < magnetsOnEasel; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const offX = col === 0 ? -6.5 : 6.5;
            const zH = 70 - row * 11;
            const magIso = worldToIso(bx + offX, by + 2, zH);
            const mx = originX + magIso.x;
            const my = originY + magIso.y;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
            ctx.fillRect(mx - 5.5, my - 6.5, 11, 14);

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = activeFrameCfg.borderColor;
            ctx.lineWidth = 1.5;
            ctx.fillRect(mx - 6, my - 7, 12, 15);
            ctx.strokeRect(mx - 6, my - 7, 12, 15);

            ctx.fillStyle = magnetPalette[i % magnetPalette.length];
            ctx.fillRect(mx - 4.5, my - 5.5, 9, 8.5);

            // Mini guest head & shoulders silhouette inside the magnet
            ctx.fillStyle = '#eab696';
            ctx.beginPath();
            ctx.arc(mx, my - 2.2, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = activeFrameCfg.borderColor;
            ctx.font = 'bold 5px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('♥', mx, my + 5.8);
          }

          // Conditional Micro Badge above Tripod Magnet Board (only when holding magnets, near board, or magnets on board)
          if (hasCutMagnetsToStick || isNearBoard || availableMagnetsOnBoard > 0) {
            const titleIso = worldToIso(bx, by + 2, 91);
            const tx = originX + titleIso.x;
            const ty = originY + titleIso.y;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = hasCutMagnetsToStick
              ? '#4ade80'
              : isNearBoard
              ? '#f59e0b'
              : '#475569';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(tx - 26, ty - 9, 52, 13, [4]);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = hasCutMagnetsToStick ? '#4ade80' : '#fef08a';
            ctx.font = 'bold 7.5px "Heebo", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
              hasCutMagnetsToStick
                ? '🧲 [E] הדבק'
                : `🧲 ${availableMagnetsOnBoard}`,
              tx,
              ty + 0.5
            );
          }
        },
      });

      // ========================================================================
      // PLAYFUL WORKFLOW GUIDE BEACONS ON FLOOR
      // ========================================================================
      if (player.cutMagnetsInHand > 0 && !player.isNearBoard) {
        const plIso = worldToIso(player.x, player.y, 12);
        const bdIso = worldToIso(TRIPOD_BOARD_POS.x, TRIPOD_BOARD_POS.y, 24);
        const sx = originX + plIso.x;
        const sy = originY + plIso.y;
        const ex = originX + bdIso.x;
        const ey = originY + bdIso.y;

        ctx.strokeStyle = 'rgba(74, 222, 128, 0.78)';
        ctx.lineWidth = 3.2;
        ctx.setLineDash([10, 6]);
        ctx.lineDashOffset = -discoBeatPhase * 22;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (
        (player.photosInCamera > 0 ||
          player.photosOnComputer > 0 ||
          player.uncutSheetsAtStation > 0 ||
          player.cameraOnDesk) &&
        !player.isNearStation
      ) {
        const plIso = worldToIso(player.x, player.y, 12);
        const stIso = worldToIso(WORKSTATION_CHAIR_POS.x, WORKSTATION_CHAIR_POS.y, 18);
        const sx = originX + plIso.x;
        const sy = originY + plIso.y;
        const ex = originX + stIso.x;
        const ey = originY + stIso.y;

        ctx.strokeStyle =
          player.uncutSheetsAtStation > 0
            ? 'rgba(34, 211, 238, 0.7)'
            : 'rgba(251, 191, 36, 0.6)';
        ctx.lineWidth = 2.8;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -discoBeatPhase * 18;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Screen projector handed to the flash engine (world x/y + height z → canvas pixels)
      const projectToScreen: FlashProjector = (wx, wy, z) => {
        const p = worldToIso(wx, wy, z);
        return { x: originX + p.x, y: originY + p.y };
      };

      // Render Player (Photographer) - Standing or Seated on Workstation Chair
      const renderPhotographerWithFootAnchor = (
        worldX: number,
        worldY: number,
        dir: IsoDirection,
        st: IsoAnimState,
        bumpFlash: boolean,
        sX = 1,
        sY = 1
      ) => {
        const isSeated = player.isSeatedAtStation;
        const zLift = isSeated ? 4 : 0;
        const isoPos = worldToIso(worldX, worldY, zLift);
        const screenFootX = originX + isoPos.x;
        const screenFootY = originY + isoPos.y;

        ctx.save();
        if (!isSeated) {
          ctx.fillStyle = 'rgba(15, 10, 8, 0.5)';
          ctx.beginPath();
          ctx.ellipse(screenFootX, screenFootY, 16 * sX, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#3e2723';
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 1.5;
          ctx.fillRect(screenFootX - 7, screenFootY - 12, 14, 10);
          ctx.strokeRect(screenFootX - 7, screenFootY - 12, 14, 10);
        }

        // Shoot frames in the sprite art show the camera + flash burst from the front.
        // Facing away, use the direction's normal frame instead; the flash is added procedurally
        // BEHIND the body (FlashEngine 'behind' layer), so nothing bright lands on the back of the head.
        const isBackShot = st === 'shoot' && isBackFacingDirection(dir);
        const frame = findFrame(dir, isBackShot ? 'idle' : st) ?? findFrame(dir, st);
        const sheet = sheetCanvasRef.current;
        if (frame && sheet) {
          const cfg = characterConfigRef.current;
          const scale = cfg.photographerScale || 1.25;
          const wRatio = cfg.photographerWidthRatio || 1;
          const hRatio = cfg.photographerHeightRatio || 1;
          const cellNorm = 128 / Math.max(64, atlasRef.current.spriteSheet.cellHeight || 128);
          const seatedSquashY = isSeated ? 0.86 : 1;

          // Procedural walk bob / sway / lean + idle breathing (standing only)
          const pose = isSeated
            ? { bobY: 0, tilt: 0, breathScaleX: 1, breathScaleY: 1 }
            : computePhotographerPose({
                strideDist: player.strideDist,
                speedRatio: Math.hypot(player.vx, player.vy) / 165,
                idleTime: player.idleTime,
                lean: player.lean,
              });

          const dw = frame.width * cellNorm * scale * wRatio * sX * pose.breathScaleX;
          const dh =
            frame.height * cellNorm * scale * hRatio * sY * seatedSquashY * pose.breathScaleY;
          const dx = -frame.anchorX * dw;
          const dy = -frame.anchorY * dh;

          // Camera lens attachment point for the current facing (relative to the feet).
          // Stored on the player so the flash engine anchors its apex exactly at the lens.
          const lens = getCameraLensScreenOffset(dir, dh);
          player.lensOffsetX = lens.dx + (screenFootX - (originX + worldToIso(worldX, worldY).x));
          player.lensOffsetY = lens.dy + pose.bobY + (screenFootY - (originY + worldToIso(worldX, worldY).y));

          // Back-facing shots fire INTO the scene: drawn UNDER the sprite so the body occludes the source
          flashEngine.render(ctx, projectToScreen, 'behind');

          const seatedStrip = isSeated ? seatedSheet : null;
          const cuttingStrip = !isSeated && player.atCutter ? cuttingSheet : null;
          if (cuttingStrip) {
            // STANDING AT THE CUTTER: lever animation synced to the guillotine's per-sheet progress
            const cutNow = player.cutterAnimTimer > 0;
            const cutProg = getWorkstationSheetProgress(
              player.cutterAnimTimer,
              player.cutterAnimDuration,
              player.cutterTotalSheets
            );
            const cf = cuttingStrip.frames[getCuttingAnimFrame(cutProg.sheetProgress, cutNow)];
            // One scale for the whole strip (from the upright first frame) so bending poses get shorter
            const ref = cuttingStrip.frames[0];
            const standingH = frame.height * cellNorm * scale * hRatio;
            const k = (standingH / ref.height) * sY;
            const cw = cf.width * k * wRatio * sX;
            const ch = cf.height * k;
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(
              cuttingStrip.canvas,
              cf.x,
              cf.y,
              cf.width,
              cf.height,
              screenFootX - cf.anchorX * cw,
              screenFootY - cf.anchorY * ch,
              cw,
              ch
            );
            ctx.restore();
          } else if (seatedStrip) {
            // SEATED AT THE WORKSTATION: dedicated strip (no camera in hand).
            // Typing while a transfer/print/cut runs, idle otherwise, and after a few quiet
            // seconds he turns to glance at the party.
            const jobRunning =
              player.transferAnimTimer > 0 || player.printerAnimTimer > 0 || player.cutterAnimTimer > 0;
            const frameIdx = jobRunning
              ? Math.floor(discoBeatPhase * 3.2) % 2 === 0
                ? SEATED_FRAME.typingA
                : SEATED_FRAME.typingB
              : player.seatedIdleTime > 2.5
              ? SEATED_FRAME.lookAtParty
              : SEATED_FRAME.idle;
            const sf = seatedStrip.frames[frameIdx];
            // Size relative to the standing sprite: a seated adult is ~78% of standing height
            const standingH = frame.height * cellNorm * scale * hRatio;
            const sh = standingH * 0.78 * sY;
            const sw = (sf.width / sf.height) * sh * wRatio * sX;
            ctx.save();
            ctx.imageSmoothingEnabled = true; // downscaled from a large source → smooth to avoid shimmer
            ctx.drawImage(
              seatedStrip.canvas,
              sf.x,
              sf.y,
              sf.width,
              sf.height,
              screenFootX - sf.anchorX * sw,
              screenFootY - sf.anchorY * sh,
              sw,
              sh
            );
            ctx.restore();
          } else {
            // Draw the sprite around its foot anchor so tilt pivots at the feet
            ctx.save();
            ctx.translate(screenFootX, screenFootY + pose.bobY);
            ctx.rotate(pose.tilt);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
              sheet,
              frame.x,
              frame.y,
              frame.width,
              frame.height,
              dx,
              dy,
              dw,
              dh
            );
            ctx.restore();
          }

          // Front/side-facing: the lens is between the body and the viewer → flash renders ON TOP
          flashEngine.render(ctx, projectToScreen, 'front');

          // Golden/Cyan circle under photographer's stance when standing
          if (!isSeated) {
            ctx.strokeStyle = bumpFlash
              ? '#ffffff'
              : player.cutMagnetsInHand > 0
              ? '#4ade80'
              : '#f59e0b';
            ctx.lineWidth = bumpFlash ? 3 : 2;
            ctx.beginPath();
            ctx.ellipse(
              screenFootX,
              screenFootY,
              18 * (scale / 1.25) * wRatio,
              9 * (scale / 1.25),
              0,
              0,
              Math.PI * 2
            );
            ctx.stroke();
          }

          // Micro icon + count badge above photographer (no text words!)
          let miniPillText = '';
          let miniPillBg = '#f59e0b';
          const miniPillFg = '#020617';
          if (!isSeated) {
            if (player.cameraOnDesk) {
              // Reminder: no camera in hand — it's still on the workstation desk
              miniPillText = '📷 ❗';
              miniPillBg = '#f87171';
            } else if (player.cutMagnetsInHand > 0) {
              miniPillText = `🧲 ${player.cutMagnetsInHand}`;
              miniPillBg = '#4ade80';
            } else if (player.uncutSheetsAtStation > 0) {
              miniPillText = `✂️ ${player.uncutSheetsAtStation}`;
              miniPillBg = '#22d3ee';
            } else if (player.photosOnComputer > 0) {
              miniPillText = `💻 ${player.photosOnComputer}`;
              miniPillBg = '#a3e635';
            } else if (player.photosInCamera > 0) {
              miniPillText = `📸 ${player.photosInCamera}`;
              miniPillBg = '#f59e0b';
            }
          }

          if (miniPillText) {
            const pw = 34;
            ctx.fillStyle = miniPillBg;
            ctx.strokeStyle = '#020617';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(screenFootX - pw * 0.5, screenFootY - dh - 14, pw, 12, [4]);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = miniPillFg;
            ctx.font = 'bold 7.5px "Heebo", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(miniPillText, screenFootX, screenFootY - dh - 5.5);
          }
        }
        ctx.restore();
      };

      const playerIso = worldToIso(player.x, player.y);
      drawables.push({
        sortY: playerIso.y,
        draw: () => {
          renderPhotographerWithFootAnchor(
            player.x,
            player.y,
            player.direction,
            player.animState,
            player.bumpFlashTimer > 0,
            player.scaleX,
            player.scaleY
          );
        },
      });

      // Queue Active Guests (Dancing or Seated) with Proximity Culling & Max 2 Active Dialogue Bubbles!
      if (stateRef.current !== 'title') {
        const outfits = characterConfigRef.current.guestOutfits;
        const allowedBubbleGuestIds = new Set(
          guests
            .filter(
              (g) =>
                Boolean(g.speechBubbleText) &&
                g.wantsPhotoTimer > 0 &&
                Math.hypot(g.x - player.x, g.y - player.y) < 145
            )
            .sort(
              (a, b) =>
                Math.hypot(a.x - player.x, a.y - player.y) -
                Math.hypot(b.x - player.x, b.y - player.y)
            )
            .slice(0, 2)
            .map((g) => g.id)
        );

        for (const guest of guests) {
          const eIso = worldToIso(guest.x, guest.y);
          const liveOutfit = outfits[guest.outfitIndex % outfits.length];
          // Cast-sheet look follows the outfit's gender; the seated (procedural) body uses the same palette
          const isDressNow = liveOutfit ? liveOutfit.isDress : guest.isDress;
          const lookPool = isDressNow ? GUEST_LOOKS_FEMALE : GUEST_LOOKS_MALE;
          const castLook = lookPool[guest.id % lookPool.length];
          const lookPalette = CAST_LOOKS[castLook].palette;
          const liveHat = liveOutfit ? liveOutfit.hat : guest.hatType;
          const activeGuest: WeddingGuestActor = {
            ...guest,
            castLook,
            outfitColor: lookPalette.outfit,
            hairColor: lookPalette.hair,
            isDress: isDressNow,
            // Only the bride wears a veil
            hatType: liveHat === 'veil' ? 'none' : liveHat,
            speechBubbleText: allowedBubbleGuestIds.has(guest.id)
              ? guest.speechBubbleText
              : null,
          };

          const leanAngle =
            guest.guestActivity === 'bar' && guest.atBarArrived && (guest.barSpotIdx ?? 0) < 3 ? 0.14 : 0;
          drawables.push({
            sortY: eIso.y,
            draw: () => {
              const gx = originX + eIso.x;
              const gy = originY + eIso.y;
              if (leanAngle) {
                // Leaning on the counter (pivot at the feet)
                ctx.save();
                ctx.translate(gx, gy);
                ctx.rotate(leanAngle);
                ctx.translate(-gx, -gy);
              }
              drawWeddingGuestSprite(gx, gy, activeGuest, guest.strideDist, 1);
              if (leanAngle) ctx.restore();
            },
          });
        }

        // The bride & groom (embracing under the chuppah during the kiss moment)
        if (castSheet?.embrace && isCoupleAtChuppah()) {
          const [bride, groom] = vipCouple;
          const mx = (bride.x + groom.x) / 2;
          const my = (bride.y + groom.y) / 2;
          const mIso = worldToIso(mx, my);
          const sheetNow = castSheet;
          drawables.push({
            sortY: mIso.y,
            draw: () => {
              const fr = sheetNow.embrace!;
              const k = EMBRACE_HEIGHT / fr.height;
              const dw = fr.width * k;
              const dh = fr.height * k;
              const gx = originX + mIso.x;
              const gy = originY + mIso.y;
              const gScale = characterConfigRef.current.guestScale || 1;
              ctx.save();
              ctx.translate(gx, gy);
              ctx.scale(gScale, gScale);
              ctx.fillStyle = 'rgba(15, 10, 8, 0.45)';
              ctx.beginPath();
              ctx.ellipse(0, 1, 18, 8, 0, 0, Math.PI * 2);
              ctx.fill();
              const sway = Math.sin(discoBeatPhase * 0.8) * 0.02;
              ctx.rotate(sway);
              ctx.drawImage(sheetNow.canvas, fr.x, fr.y, fr.width, fr.height, -fr.anchorX * dw, -dh, dw, dh);
              ctx.rotate(-sway);
              // Floating hearts
              ctx.font = '10px sans-serif';
              ctx.textAlign = 'center';
              for (let h = 0; h < 3; h++) {
                const t = (discoBeatPhase * 0.5 + h / 3) % 1;
                ctx.globalAlpha = 1 - t;
                ctx.fillText('💗', Math.sin(t * 6 + h) * 10, -dh - 4 - t * 22);
              }
              ctx.globalAlpha = 1;
              if (bride.speechBubbleText && chuppahCelebrateTimer > 0) {
                ctx.font = 'bold 9px sans-serif';
                ctx.fillStyle = '#fde68a';
                ctx.fillText('תמונה מושלמת בחופה! 💍✨', 0, -dh - 30);
              }
              ctx.restore();
            },
          });
        } else {
          for (const m of vipCouple) {
            const mIso = worldToIso(m.x, m.y);
            const snapshot: WeddingGuestActor = { ...m };
            drawables.push({
              sortY: mIso.y,
              draw: () => drawWeddingGuestSprite(originX + mIso.x, originY + mIso.y, snapshot, snapshot.strideDist, 1),
            });
          }
        }

        // Queue Roaming Catering Waiters with Silver Trays
        for (const wActor of waiters) {
          const wIso = worldToIso(wActor.x, wActor.y);
          drawables.push({
            sortY: wIso.y,
            draw: () => {
              const sx = originX + wIso.x;
              const sy = originY + wIso.y;
              const bob = Math.sin(discoBeatPhase * 2.6 + wActor.id) * 2.2;

              ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
              ctx.beginPath();
              ctx.ellipse(sx, sy, 12, 6, 0, 0, Math.PI * 2);
              ctx.fill();

              // Black trousers + black shirt + khaki apron (like the venue's waiters)
              ctx.fillStyle = '#0b0b0e';
              ctx.fillRect(sx - 6, sy - 18 + bob * 0.3, 5, 18);
              ctx.fillRect(sx + 1, sy - 18 - bob * 0.3, 5, 18);
              ctx.fillStyle = '#121216';
              ctx.fillRect(sx - 9, sy - 38 + bob, 18, 20);
              ctx.fillStyle = '#a1885f';
              ctx.fillRect(sx - 7, sy - 24 + bob, 14, 12);
              ctx.fillStyle = 'rgba(0,0,0,0.25)';
              ctx.fillRect(sx - 7, sy - 24 + bob, 14, 1.5);

              ctx.fillStyle = '#d6a27c';
              ctx.strokeStyle = '#0f172a';
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.arc(sx, sy - 46 + bob, 7.2, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#1e1612';
              ctx.beginPath();
              ctx.arc(sx, sy - 48 + bob, 7.4, Math.PI, Math.PI * 2);
              ctx.fill();

              // Arm up to the tray (only while carrying), otherwise at the side
              ctx.strokeStyle = '#121216';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(sx + 8, sy - 34 + bob);
              ctx.lineTo(wActor.carrying ? sx + 13 : sx + 10, wActor.carrying ? sy - 41 + bob : sy - 22 + bob);
              ctx.stroke();

              if (wActor.carrying) {
                ctx.fillStyle = '#cbd5e1';
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.ellipse(sx + 14, sy - 42 + bob, 10, 4.2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Three drinks on the tray
                const cols = ['rgba(190,18,60,0.85)', 'rgba(254,240,138,0.9)', 'rgba(244,114,182,0.85)'];
                cols.forEach((c, k) => {
                  ctx.fillStyle = c;
                  ctx.fillRect(sx + 8 + k * 4.5, sy - 50 + bob, 2.6, 5);
                  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                  ctx.lineWidth = 0.6;
                  ctx.strokeRect(sx + 8 + k * 4.5, sy - 50 + bob, 2.6, 5);
                });
              }
            },
          });
        }
      }

      // Camera flash rays are depth-sorted with actors, so a shot fired "into" the scene
      // (photographer facing away) passes BEHIND the photographer instead of over his head.
      for (const pr of projectiles) {
        if (!pr.active) continue;
        const prGround = worldToIso(pr.x, pr.y);
        drawables.push({
          sortY: prGround.y,
          draw: () => {
            const pIso = worldToIso(pr.x, pr.y, 44); // lens height
            const sx = originX + pIso.x;
            const sy = originY + pIso.y;
            const fade = Math.max(0, Math.min(1, pr.life / pr.maxLife));

            ctx.save();
            ctx.globalAlpha = 0.35 + fade * 0.65;
            const glow = ctx.createRadialGradient(sx, sy, 1, sx, sy, 14);
            glow.addColorStop(0, '#ffffff');
            glow.addColorStop(0.5, pr.color);
            glow.addColorStop(1, 'rgba(253, 224, 71, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(sx, sy, 14, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = pr.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          },
        });
      }

      // Depth sort all isometric actors
      drawables.sort((a, b) => a.sortY - b.sortY);
      for (const d of drawables) d.draw();

      // Ceiling-hung chandeliers, mirror spheres & fairy-light curtain always render above floor actors
      drawHallCeiling(ctx, originX, originY, discoBeatPhase / 2.8);

      // Whole-frame score labels (Hebrew, RTL) floating above the photographed area
      if (frameLabels.length) {
        ctx.save();
        ctx.textAlign = 'center';
        for (const fl of frameLabels) {
          const li = worldToIso(fl.x, fl.y, 70);
          const a = Math.min(1, fl.life / 0.5);
          const lx = originX + li.x;
          const ly = originY + li.y;
          ctx.globalAlpha = a;
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = 'rgba(10, 8, 20, 0.85)';
          ctx.fillStyle = fl.color;
          // Main line: the score (or a short Hebrew notice); sub line: the Hebrew frame breakdown
          const isNumber = /^[+-]?\d+$/.test(fl.text);
          ctx.direction = isNumber ? 'ltr' : 'rtl';
          ctx.font = isNumber ? 'bold 16px "Heebo", "Assistant", sans-serif' : 'bold 12px "Heebo", "Assistant", sans-serif';
          ctx.strokeText(fl.text, lx, ly);
          ctx.fillText(fl.text, lx, ly);
          if (fl.sub) {
            ctx.direction = 'rtl';
            ctx.font = 'bold 11px "Heebo", "Assistant", sans-serif';
            ctx.strokeText(fl.sub, lx, ly + 14);
            ctx.fillText(fl.sub, lx, ly + 14);
          }
        }
        ctx.restore();
      }

      // ========================================================================
      // VOLUMETRIC MOVING-HEAD CONCERT SPOTLIGHTS & LASER BEAMS (Section 1)
      // ========================================================================
      {
        ctx.save();
        // Thin blue / warm-yellow beams from the truss moving heads, sweeping the dance floor
        ctx.globalCompositeOperation = 'lighter';
        const bt = discoBeatPhase / 2.8;
        for (const head of movingHeads) {
          const speed = 0.35 + (head.phase % 1) * 0.3;
          const tx = Math.sin(bt * speed + head.phase) * 150;
          const ty = Math.cos(bt * speed * 0.8 + head.phase * 1.3) * 120;
          const src = worldToIso(head.x, head.y, head.z);
          const dst = worldToIso(tx, ty, 0);
          const sx = originX + src.x;
          const sy = originY + src.y;
          const dx = originX + dst.x;
          const dy = originY + dst.y;
          const col = head.warm ? '255, 214, 120' : '150, 175, 255';
          const bGrad = ctx.createLinearGradient(sx, sy, dx, dy);
          bGrad.addColorStop(0, `rgba(${col}, 0.32)`);
          bGrad.addColorStop(1, `rgba(${col}, 0.05)`);
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.moveTo(sx - 1.5, sy);
          ctx.lineTo(sx + 1.5, sy);
          ctx.lineTo(dx + 9, dy);
          ctx.lineTo(dx - 9, dy);
          ctx.closePath();
          ctx.fill();
          // Small hot spot where the beam hits the floor
          ctx.fillStyle = `rgba(${col}, 0.22)`;
          ctx.beginPath();
          ctx.ellipse(dx, dy, 12, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Render VIP Moment Golden Spotlight & Target Ring in World
      if (stateRef.current !== 'title' && vipEvent && vipEvent.remainingSec > 0) {
        const vIso = worldToIso(vipEvent.targetPos.x, vipEvent.targetPos.y, 0);
        const vx = originX + vIso.x;
        const vy = originY + vIso.y;
        const pulseR = 64 + Math.sin(discoBeatPhase * 3) * 6;

        const spotGrad = ctx.createRadialGradient(vx, vy - 18, 8, vx, vy, pulseR + 18);
        spotGrad.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
        spotGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.ellipse(vx, vy, pulseR + 16, (pulseR + 16) * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 5]);
        ctx.beginPath();
        ctx.ellipse(vx, vy, pulseR, pulseR * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        const tagY = vy - 74;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(vx - 32, tagY - 9, 64, 14, [4]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 7.5px "Heebo", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          `⭐ ${vipEvent.photosCaptured}/${vipEvent.requiredPhotos} · ${Math.ceil(vipEvent.remainingSec)}s`,
          vx,
          tagY + 0.5
        );
      }

      // ========================================================================
      // 4. FLYING POLAROID SNAPSHOT EFFECT (Section 4 - אפקט צילום פולארויד חי)
      // ========================================================================
      for (const th of flyingThumbs) {
        if (!th.active) continue;
        // Parabolic 3D arc into the photographer's camera!
        const arcZ = 28 + Math.sin(th.progress * Math.PI) * 56;
        const thIso = worldToIso(th.currentX, th.currentY, arcZ);
        const sx = originX + thIso.x;
        const sy = originY + thIso.y;
        const rot = (1 - th.progress) * 0.65 * Math.sin(th.progress * Math.PI * 3);
        const cardScale = 0.85 + Math.sin(th.progress * Math.PI) * 0.45;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rot);
        ctx.scale(cardScale, cardScale);

        // Drop shadow
        ctx.fillStyle = 'rgba(2, 6, 23, 0.35)';
        ctx.fillRect(-9, -11, 20, 25);

        // Polaroid Card Body & Selected Magnet Frame Border
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = th.color;
        ctx.lineWidth = 2.2;
        ctx.fillRect(-10, -13, 20, 25);
        ctx.strokeRect(-10, -13, 20, 25);

        // Inner Photo Portrait (Guest silhouette + party backdrop)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-7.5, -10.5, 15, 14);
        ctx.fillStyle = th.color;
        ctx.beginPath();
        ctx.arc(0, -1, 4.5, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#eab696';
        ctx.beginPath();
        ctx.arc(0, -5.5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Bottom Polaroid Caption Heart
        ctx.fillStyle = th.color;
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('♥ VIP', 0, 9.5);

        ctx.restore();
      }

      // Render Flying Souvenir Magnets with 3D Spin & Portrait
      for (const m of flyingMagnets) {
        if (!m.active) continue;
        const mIso = worldToIso(m.x, m.y, m.z);
        const sx = originX + mIso.x;
        const sy = originY + mIso.y;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(m.rot);

        const activeFrameColor = MAGNET_FRAMES[selectedFrameRef.current].borderColor;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = m.isGold ? '#eab308' : activeFrameColor;
        ctx.lineWidth = 2.2;
        ctx.fillRect(-10, -13, 20, 26);
        ctx.strokeRect(-10, -13, 20, 26);

        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-8, -11, 16, 15);
        ctx.fillStyle = '#eab696';
        ctx.beginPath();
        ctx.arc(0, -5, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = activeFrameColor;
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('♥', 0, 10);

        ctx.restore();
      }

      // ========================================================================
      // 6. 3D TUMBLING CONFETTI RIBBONS, CHAMPAGNE BUBBLES & VIGNETTE (Section 6)
      // ========================================================================
      for (let pIdx = 0; pIdx < particles.length; pIdx++) {
        const p = particles[pIdx];
        if (!p.active) continue;
        const pIso = worldToIso(p.x, p.y, p.z);
        const px = originX + pIso.x;
        const py = originY + pIso.y;
        const lifeRatio = Math.max(0, p.life / p.maxLife);

        ctx.save();
        ctx.globalAlpha = lifeRatio;
        ctx.translate(px, py);
        // 3D tumbling ribbon rotation & width flutter
        const tumble = discoBeatPhase * 4 + pIdx * 1.3;
        ctx.rotate(tumble * 0.6);
        const ribbonW = Math.max(1.5, p.size * 1.4 * Math.abs(Math.cos(tumble)));
        const ribbonH = p.size * 0.75;
        ctx.fillStyle = p.color;
        ctx.fillRect(-ribbonW * 0.5, -ribbonH * 0.5, ribbonW, ribbonH);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // Floating Translucent Champagne / Soap Bubbles near Chuppah & Dancefloor
      for (let b = 0; b < 10; b++) {
        const bPhase = (discoBeatPhase * 0.55 + b * 0.73) % 4;
        const bxWorld = Math.sin(b * 2.1 + discoBeatPhase * 0.3) * 135 + (b % 2 === 0 ? 55 : -15);
        const byWorld = Math.cos(b * 1.7 + discoBeatPhase * 0.25) * 125 - 45;
        const bzWorld = 12 + bPhase * 28;
        const bIso = worldToIso(bxWorld, byWorld, bzWorld);
        const bsx = originX + bIso.x;
        const bsy = originY + bIso.y;
        const bRad = 3.2 + (b % 3) * 1.4;

        ctx.strokeStyle = 'rgba(224, 242, 254, 0.42)';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bsx, bsy, bRad, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Specular bubble highlight dot
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.arc(bsx - bRad * 0.35, bsy - bRad * 0.35, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Visual Tug-of-War / Table Recruitment Indicator for Recruiters pulling Seated Guests
      if (stateRef.current !== 'title') {
        for (const rec of guests) {
          if (rec.guestActivity !== 'recruiting' || rec.recruitTargetId == null) continue;
          const targetSeat = guests.find(
            (g) => g.id === rec.recruitTargetId && g.guestActivity === 'seated'
          );
          if (!targetSeat) continue;
          const distToSeat = Math.hypot(rec.x - targetSeat.x, rec.y - targetSeat.y);
          if (distToSeat < 60) {
            const rIso = worldToIso(rec.x, rec.y, 26);
            const sIso = worldToIso(targetSeat.x, targetSeat.y, 22);
            const rx = originX + rIso.x;
            const ry = originY + rIso.y;
            const tx = originX + sIso.x;
            const ty = originY + sIso.y;

            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.0;
            ctx.setLineDash([4, 4]);
            ctx.lineDashOffset = -discoBeatPhase * 16;
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.quadraticCurveTo((rx + tx) * 0.5, Math.min(ry, ty) - 10, tx, ty);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }
        }
      }

      // Restore worldZoom transform before drawing screen-space vignette
      ctx.restore();

      // Subtle Cinematic Warm Ballroom Vignette around Screen Perimeter
      {
        const vig = ctx.createRadialGradient(
          viewW * 0.5,
          viewH * 0.5,
          Math.min(viewW, viewH) * 0.36,
          viewW * 0.5,
          viewH * 0.5,
          Math.max(viewW, viewH) * 0.72
        );
        vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vig.addColorStop(1, 'rgba(12, 6, 4, 0.42)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, viewW, viewH);
      }

      // Update HUD at regular cadence
      hudEmitTimer += dt;
      if (hudEmitTimer >= 0.08) {
        hudEmitTimer = 0;
        const waveCfg = getWaveConfig(wave);
        const activeObjective = getActiveWorkflowObjective({
          photosInCamera: player.photosInCamera,
          photosOnComputer: player.photosOnComputer + player.transferBatch,
          uncutSheetsAtStation: player.uncutSheetsAtStation,
          cutMagnetsInHand: player.cutMagnetsInHand,
          magnetsOnBoard: availableMagnetsOnBoard,
        });
        const dancerCount = guests.filter((g) => g.guestActivity === 'dancing').length;
        const recruitingCount = guests.filter((g) => g.guestActivity === 'recruiting').length;
        const seatedCount = guests.filter((g) => g.guestActivity === 'seated').length;
        const crowdStats = evaluateDancefloorCrowdState(
          dancerCount,
          recruitingCount,
          seatedCount,
          player.partyJoy
        );
        callbacksRef.current.onHudUpdate({
          hp: player.partyJoy,
          maxHp: 100,
          ghostHp: player.ghostJoy,
          dashCharge: player.dashCharge,
          score,
          leads: reputation,
          naggingGuests: guests.filter((g) => g.behavior?.kind === 'impatient' && g.behavior.phase === 'nagging').length,
          bestScore,
          combo,
          wave,
          magnetsPrinted: magnetsPrintedThisWave,
          targetMagnets: waveCfg.targetMagnets,
          trackTimeSec: Math.round(trackTimeRemaining),
          stageTitleHe: waveCfg.stageTitleHe,
          photosInCamera: player.photosInCamera,
          photosOnComputer: player.photosOnComputer,
          photosTransferring: player.transferBatch,
          transferRemainingSec: player.transferAnimTimer,
          cameraOnDesk: player.cameraOnDesk,
          maxPhotosInCamera: getMaxCameraCapacity(upgradeLevels.pro_sdcard),
          uncutSheetsAtStation: player.uncutSheetsAtStation,
          cutMagnetsInHand: player.cutMagnetsInHand,
          activeWorkflowObjective: activeObjective,
          isAtMagnetStation: player.isNearStation,
          isSeatedAtStation: player.isSeatedAtStation,
          stationFeedbackText: player.stationFeedbackText,
          availableMagnetsOnBoard,
          totalMagnetsPrinted: totalMagnetsAllWaves,
          magnetsTakenByGuests,
          isNearBoard: player.isNearBoard,
          vipEvent: vipEvent ? { ...vipEvent } : null,
          selectedFrame: selectedFrameRef.current,
          upgradeLevels: { ...upgradeLevels },
          crowdStats,
          magnetDeliveryTracker: { ...magnetDeliveryTracker },
          weaponMode: weaponRef.current,
        });
      }

      if (isHeadless) {
        setTimeout(() => {
          rafId = requestAnimationFrame(tick);
        }, keysHeld.size > 0 ? 30 : 120);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      clearAllTimeouts();
      cancelAnimationFrame(rafId);
      seatedSheetDisposed = true;
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', onVisChange);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 overflow-hidden bg-stone-950">
      <canvas
        ref={canvasRef}
        data-testid="iso-arena-canvas"
        tabIndex={0}
        className="w-full h-full block focus:outline-none cursor-crosshair"
      />
    </div>
  );
};
