/**
 * Outside the hall: entrance door → lobby → courtyard → big parking lot.
 *
 * Layout (world units, the hall floor is the square ±440; the route runs along +x):
 *   hall side door (x≈455) → LOBBY (marble, welcome sign, guest-book table, plants, sofa)
 *   → garden gate (x≈675) → COURTYARD, twice the hall's floor area: a stone path down the middle,
 *     the CEREMONY lawn to the north (chuppah, aisle, rows of white chairs) and a garden to the
 *     south (fountain, olive trees, benches, lamps), string lights over both
 *   → PARKING (two rows of stalls along a central aisle, lamps; the photographer's car).
 *
 * Everything here is procedural Canvas2D in the game's 2:1 projection, except the cars, which are
 * sprites (see PARKED_CARS). Ground layers are drawn under the actors; props are returned as
 * depth-sorted drawables.
 */
import { CHUPPAH_POS, worldToIso } from './rules.ts';
import { BRIDGE_FOOT, POOL_OBSTACLES } from './chuppahIsland.ts';
import { PROP_SPRITES, propFootprint } from './venueProps.ts';

export type Rect = { minX: number; maxX: number; minY: number; maxY: number };

export const HALL_EDGE_X = 440;
/** Inside the hall up to the side door. */
export const HALL_EXIT: Rect = { minX: 250, maxX: 480, minY: 205, maxY: 268 };
export const LOBBY: Rect = { minX: 470, maxX: 660, minY: 100, maxY: 370 };
export const GARDEN_GATE: Rect = { minX: 650, maxX: 700, minY: 170, maxY: 305 };
/** 1100 × 1400 = twice the hall floor (880 × 880). */
export const COURTYARD: Rect = { minX: 690, maxX: 1790, minY: -470, maxY: 930 };
/** Stone path from the garden gate straight across the courtyard to the parking lot. */
export const COURTYARD_PATH: Rect = { minX: 690, maxX: 1790, minY: 164, maxY: 311 };
/**
 * Guests' route (as in real event venues): GUEST PARKING → green buffer → ENTRANCE PLAZA (drop-off,
 * guard booth, gate in the courtyard fence) → reception garden / chuppah garden → lobby → hall.
 */
export const COURTYARD_FENCE_X = 1790;
/** Opening in the courtyard fence (the venue's main gate) on the path. */
export const PLAZA_GATE: Rect = { minX: 1780, maxX: 1812, minY: COURTYARD_PATH.minY, maxY: COURTYARD_PATH.maxY };
export const PLAZA: Rect = { minX: 1800, maxX: 2020, minY: 40, maxY: 430 };
/** Hedges + trees between the plaza and the guest parking; a walkway crosses it on the path line. */
export const BUFFER: Rect = { minX: 2020, maxX: 2090, minY: -70, maxY: 530 };
export const BUFFER_WALK: Rect = { minX: 2010, maxX: 2100, minY: COURTYARD_PATH.minY + 20, maxY: COURTYARD_PATH.maxY - 20 };
export const PARKING: Rect = { minX: 2090, maxX: 2570, minY: -70, maxY: 530 };

/**
 * Back of house (never crosses the guests' route): a service door in the hall corner behind the
 * magnet station → service yard with the kitchen and the vendors' parking (the photographer's car),
 * a service road leaving north. A fence separates it from the courtyard.
 */
export const SERVICE_DOOR_X = HALL_EDGE_X;
export const SERVICE_EXIT: Rect = { minX: 150, maxX: 480, minY: -385, maxY: -325 };
/** The hall floor corner around the magnet station, so the service door is reachable from the floor. */
export const SERVICE_APPROACH: Rect = { minX: 150, maxX: 436, minY: -400, maxY: 0 };
export const SERVICE_YARD: Rect = { minX: 470, maxX: 680, minY: -640, maxY: -170 };
/** At the back of the yard, behind the vendors' cars (so it never hides the service door). */
export const KITCHEN: Rect = { minX: 480, maxX: 676, minY: -636, maxY: -566 };
export const VENDOR_STALLS: Array<{ x: number; y: number }> = [
  { x: 545, y: -440 },
  { x: 630, y: -440 },
];
/** Central driving aisle of the lot (cars park on both sides, trunks/fronts toward it). */
export const PARKING_AISLE: Rect = { minX: PARKING.minX, maxX: PARKING.maxX, minY: 190, maxY: 285 };

/**
 * Ceremony lawn (north of the path): the aisle runs along +x up to the chuppah's golden runway;
 * rows of white chairs on both sides face the chuppah.
 */
export const CEREMONY_AISLE: Rect = { minX: 940, maxX: BRIDGE_FOOT.x, minY: CHUPPAH_POS.y - 29, maxY: CHUPPAH_POS.y + 29 };
export const CEREMONY_CHAIR_ROWS: Array<{ x: number; y0: number; y1: number }> = [0, 1, 2, 3, 4, 5].flatMap((i) => {
  const x = 980 + i * 40;
  return [
    { x, y0: CEREMONY_AISLE.minY - 130, y1: CEREMONY_AISLE.minY - 22 }, // north block
    { x, y0: CEREMONY_AISLE.maxY + 22, y1: CEREMONY_AISLE.maxY + 130 }, // south block
  ];
});
export const CEREMONY_CHAIR_SPACING = 27;

/** Garden (south of the path). */
export const FOUNTAIN_POS = { x: 1040, y: 620 };
export const OLIVE_TREES: Array<[number, number]> = [
  [760, 380], [760, 880], [1200, 720], [1740, 720], [1330, 820], [900, 860], [1660, 860],
  [760, -60], [760, -420], [1720, -420], [1720, 40], [1580, -60],
];
export const BENCHES: Array<{ x0: number; x1: number; y: number }> = [
  { x0: 960, x1: 1015, y: 470 },
  { x0: 1070, x1: 1125, y: 770 },
  { x0: 1380, x1: 1435, y: 700 },
];
export const COURTYARD_LAMPS: Array<[number, number]> = [
  [960, 150], [1240, 150], [1520, 150], [960, 325], [1240, 325], [1520, 325],
];

export const WALKABLE_OUTSIDE: Rect[] = [
  HALL_EXIT, LOBBY, GARDEN_GATE, COURTYARD, PLAZA_GATE, PLAZA, BUFFER_WALK, PARKING, SERVICE_APPROACH, SERVICE_EXIT, SERVICE_YARD,
];

export const insideRect = (r: Rect, x: number, y: number) =>
  x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY;

export function isWalkableOutside(x: number, y: number): boolean {
  return WALKABLE_OUTSIDE.some((r) => insideRect(r, x, y));
}

/** Doorways along the route: when the player pushes against a wall next to one, steer him into it. */
export const DOORWAYS: Rect[] = [HALL_EXIT, GARDEN_GATE, PLAZA_GATE, BUFFER_WALK, SERVICE_EXIT];

/**
 * Door assist: if (x, y) is blocked but a doorway opening is within `reach` along x, returns the y
 * to slide toward (the opening's nearest inner edge), otherwise null.
 */
export function doorwaySlideTarget(x: number, y: number, reach = 46): number | null {
  for (const d of DOORWAYS) {
    if (x < d.minX - reach || x > d.maxX + reach) continue;
    if (y >= d.minY + 6 && y <= d.maxY - 6) continue;
    if (Math.abs(y - (d.minY + d.maxY) / 2) > (d.maxY - d.minY) / 2 + 70) continue;
    return Math.max(d.minY + 8, Math.min(d.maxY - 8, y));
  }
  return null;
}

/** Reception garden (south of the path, by the gate): guests stop at the flower wall to pose. */
export const PHOTO_SPOT = { x: 1400, y: 400 };
export const FLOWER_WALL = { x0: PHOTO_SPOT.x - 34, x1: PHOTO_SPOT.x + 34, y: PHOTO_SPOT.y - 45 };
/** Where arriving guests come in (the main gate from the plaza) and the hall door they go to. */
export const ARRIVAL_ENTRY = { x: COURTYARD_FENCE_X + 4, y: 236 };
/** Reception: a bar with a flower pergola (PixelLab sprite, drawn by the game), two food stations, cocktail tables. */
export const RECEPTION_BAR: Rect = propFootprint(PROP_SPRITES.bar, 1150, 590);
export const FOOD_STATIONS: Rect[] = [
  { minX: 1440, maxX: 1530, minY: 520, maxY: 548 },
  { minX: 1590, maxX: 1680, minY: 520, maxY: 548 },
];
export const COCKTAIL_TABLES: Array<[number, number]> = [[1215, 630], [1330, 560], [1520, 640], [1650, 620]];
export const HALL_DOOR = { x: 445, y: 236 };

/** Stall centres. Row A (north of the aisle) parks trunk-first toward the aisle (+y). */
export const STALL_WIDTH = 120;
export const STALLS_ROW_A: Array<{ x: number; y: number }> = [0, 1, 2, 3].map((i) => ({
  x: PARKING.minX + 75 + i * STALL_WIDTH,
  y: 110,
}));
export const STALLS_ROW_B: Array<{ x: number; y: number }> = [0, 1, 2, 3].map((i) => ({
  x: PARKING.minX + 75 + i * STALL_WIDTH,
  y: 370,
}));

/**
 * The photographer parks in the guests' lot (row A, third stall), trunk toward the aisle: fetching
 * supplies means a run through the lobby, the gardens, the gate and the plaza.
 */
export const PLAYER_CAR = STALLS_ROW_A[2];
export const PLAYER_CAR_TRUNK_SPOT = { x: PLAYER_CAR.x - 6, y: PLAYER_CAR.y + 92 };

/** Guests' cars filling the other stalls (PixelLab hi-bit renders, same angle as the player's car). */
export const PARKED_CAR_SPRITES = [
  'white', 'black-suv', 'red-hatch', 'silver-van', 'blue-hybrid', 'yellow-taxi', 'beige-sedan',
] as const;
export type ParkedCarSprite = (typeof PARKED_CAR_SPRITES)[number];
export const PARKED_CARS: Array<{ x: number; y: number; sprite: ParkedCarSprite }> = [
  // vendors' parking by the service door: the caterer's van and the DJ's car
  { ...VENDOR_STALLS[0], sprite: 'white' },
  { ...VENDOR_STALLS[1], sprite: 'silver-van' },
  // guests' lot
  { ...STALLS_ROW_A[0], sprite: 'black-suv' },
  { ...STALLS_ROW_A[1], sprite: 'blue-hybrid' },
  { ...STALLS_ROW_A[3], sprite: 'white' },
  { ...STALLS_ROW_B[0], sprite: 'red-hatch' },
  { ...STALLS_ROW_B[1], sprite: 'yellow-taxi' },
  { ...STALLS_ROW_B[2], sprite: 'blue-hybrid' },
  { ...STALLS_ROW_B[3], sprite: 'beige-sedan' },
];

function carBox(c: { x: number; y: number }) {
  return { kind: 'box' as const, minX: c.x - 34, minY: c.y - 66, maxX: c.x + 34, maxY: c.y + 60 };
}

/** Props that block walking. */
export const OUTSIDE_OBSTACLES: Array<
  { kind: 'box'; minX: number; minY: number; maxX: number; maxY: number } | { kind: 'circle'; x: number; y: number; r: number }
> = [
  // Lobby: guest-book table, welcome easel, plants, sofa
  { kind: 'box', minX: 575, minY: 118, maxX: 630, maxY: 150 },
  { kind: 'circle', x: 520, y: 135, r: 12 },
  { kind: 'circle', x: 488, y: 115, r: 10 },
  { kind: 'circle', x: 642, y: 115, r: 10 },
  { kind: 'circle', x: 488, y: 355, r: 10 },
  { kind: 'circle', x: 642, y: 355, r: 10 },
  { kind: 'box', minX: 525, minY: 330, maxX: 605, maxY: 360 },
  // Reception garden: flower photo wall, bar, food stations, cocktail tables
  { kind: 'box', minX: FLOWER_WALL.x0, minY: FLOWER_WALL.y - 5, maxX: FLOWER_WALL.x1, maxY: FLOWER_WALL.y + 5 },
  { kind: 'box', ...RECEPTION_BAR },
  ...FOOD_STATIONS.map((r) => ({ kind: 'box' as const, ...r })),
  ...COCKTAIL_TABLES.map(([x, y]) => ({ kind: 'circle' as const, x, y, r: 9 })),
  // Plaza: guard booth; buffer hedges (both sides of the walkway)
  { kind: 'box', minX: 1940, minY: 70, maxX: 1990, maxY: 120 },
  // Back of house: the kitchen building
  { kind: 'box', ...KITCHEN },
  // Courtyard: fountain, olive trees, benches, lamps
  { kind: 'circle', x: FOUNTAIN_POS.x, y: FOUNTAIN_POS.y, r: 34 },
  ...OLIVE_TREES.map(([x, y]) => ({ kind: 'circle' as const, x, y, r: 16 })),
  ...BENCHES.map((b) => ({ kind: 'box' as const, minX: b.x0, minY: b.y - 3, maxX: b.x1, maxY: b.y + 12 })),
  ...COURTYARD_LAMPS.map(([x, y]) => ({ kind: 'circle' as const, x, y, r: 5 })),
  // The chuppah's pool (open where the footbridge crosses)
  ...POOL_OBSTACLES,
  // Ceremony: each row of white chairs is one solid strip (walk between the rows / down the aisle)
  ...CEREMONY_CHAIR_ROWS.map((r) => ({ kind: 'box' as const, minX: r.x - 7, minY: r.y0 - 6, maxX: r.x + 7, maxY: r.y1 + 6 })),
  // Photographer's car
  carBox(PLAYER_CAR),
  // Guests' cars
  ...PARKED_CARS.map(carBox),
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function p(ox: number, oy: number, x: number, y: number, z = 0) {
  const i = worldToIso(x, y, z);
  return { x: ox + i.x, y: oy + i.y };
}

function quad(ctx: CanvasRenderingContext2D, ox: number, oy: number, r: Rect, z = 0) {
  const a = p(ox, oy, r.minX, r.minY, z);
  const b = p(ox, oy, r.maxX, r.minY, z);
  const c = p(ox, oy, r.maxX, r.maxY, z);
  const d = p(ox, oy, r.minX, r.maxY, z);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
}

function seg(ctx: CanvasRenderingContext2D, ox: number, oy: number, x0: number, y0: number, x1: number, y1: number, z = 0) {
  const a = p(ox, oy, x0, y0, z);
  const b = p(ox, oy, x1, y1, z);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function hash(n: number) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

/** Vertical wall face along y = const (a "back" wall seen from the front). */
function wallAlongX(ctx: CanvasRenderingContext2D, ox: number, oy: number, x0: number, x1: number, y: number, h: number, fill: string) {
  const a = p(ox, oy, x0, y, 0);
  const b = p(ox, oy, x1, y, 0);
  const c = p(ox, oy, x1, y, h);
  const d = p(ox, oy, x0, y, h);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Ground layers (under everything)
// ---------------------------------------------------------------------------

export function drawOutsideGround(ctx: CanvasRenderingContext2D, ox: number, oy: number, t: number) {
  ctx.save();
  ctx.lineWidth = 1;

  // --- BACK OF HOUSE: service road + yard asphalt, vendor stalls, service corridor from the hall
  ctx.fillStyle = '#26282d';
  quad(ctx, ox, oy, { minX: 560, maxX: 680, minY: SERVICE_YARD.minY - 260, maxY: SERVICE_YARD.minY });
  ctx.fill();
  ctx.fillStyle = '#2b2d33';
  quad(ctx, ox, oy, SERVICE_YARD);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 260; i++) {
    const g = p(ox, oy, SERVICE_YARD.minX + hash(i + 3001) * (SERVICE_YARD.maxX - SERVICE_YARD.minX), SERVICE_YARD.minY + hash(i + 4001) * (SERVICE_YARD.maxY - SERVICE_YARD.minY));
    ctx.fillRect(Math.round(g.x), Math.round(g.y), 2, 1);
  }
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= VENDOR_STALLS.length; i++) {
    const x = VENDOR_STALLS[0].x - 45 + i * 85;
    seg(ctx, ox, oy, x, VENDOR_STALLS[0].y - 80, x, VENDOR_STALLS[0].y + 70);
  }
  // loading-zone hatching in front of the kitchen
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
  ctx.lineWidth = 1.5;
  for (let x = KITCHEN.minX; x < KITCHEN.maxX; x += 16) seg(ctx, ox, oy, x, KITCHEN.maxY + 8, x + 12, KITCHEN.maxY + 26);
  // planted strip between the yard and the lobby
  ctx.fillStyle = '#1f3a25';
  quad(ctx, ox, oy, { minX: SERVICE_YARD.minX, maxX: SERVICE_YARD.maxX + 8, minY: SERVICE_YARD.maxY, maxY: LOBBY.minY - 6 });
  ctx.fill();
  ctx.fillStyle = '#3d4049';
  quad(ctx, ox, oy, { minX: HALL_EDGE_X - 4, maxX: SERVICE_YARD.minX, minY: SERVICE_EXIT.minY, maxY: SERVICE_EXIT.maxY });
  ctx.fill();

  // --- ENTRANCE PLAZA: light stone paving, drop-off bay; BUFFER: lawn strip + walkway
  ctx.fillStyle = '#8b8577';
  quad(ctx, ox, oy, PLAZA);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 1;
  for (let x = PLAZA.minX; x < PLAZA.maxX; x += 30) seg(ctx, ox, oy, x, PLAZA.minY, x, PLAZA.maxY);
  for (let y = PLAZA.minY; y < PLAZA.maxY; y += 30) seg(ctx, ox, oy, PLAZA.minX, y, PLAZA.maxX, y);
  // drop-off bay (asphalt, curb, painted label)
  const bay: Rect = { minX: 1850, maxX: PLAZA.maxX, minY: 340, maxY: PLAZA.maxY };
  ctx.fillStyle = '#2a2d33';
  quad(ctx, ox, oy, bay);
  ctx.fill();
  ctx.strokeStyle = '#d6d3cc';
  ctx.lineWidth = 2;
  seg(ctx, ox, oy, bay.minX, bay.minY, bay.maxX, bay.minY);
  seg(ctx, ox, oy, bay.minX, bay.minY, bay.minX, bay.maxY);
  {
    const c = p(ox, oy, (bay.minX + bay.maxX) / 2, (bay.minY + bay.maxY) / 2);
    ctx.save();
    ctx.font = 'bold 11px "Heebo", sans-serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillStyle = 'rgba(250, 250, 240, 0.55)';
    ctx.fillText('הורדת נוסעים', c.x, c.y + 4);
    ctx.restore();
  }
  ctx.fillStyle = '#1f3a25';
  quad(ctx, ox, oy, BUFFER);
  ctx.fill();
  ctx.fillStyle = '#8b8577';
  quad(ctx, ox, oy, BUFFER_WALK);
  ctx.fill();

  // --- PARKING: curb + asphalt + aisle + stall lines + wheel stops
  ctx.fillStyle = '#5b616b';
  quad(ctx, ox, oy, { minX: PARKING.minX - 6, maxX: PARKING.maxX + 6, minY: PARKING.minY - 6, maxY: PARKING.maxY + 6 });
  ctx.fill();
  ctx.fillStyle = '#22252b';
  quad(ctx, ox, oy, PARKING);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let i = 0; i < 700; i++) {
    const g = p(ox, oy, PARKING.minX + hash(i) * (PARKING.maxX - PARKING.minX), PARKING.minY + hash(i + 999) * (PARKING.maxY - PARKING.minY));
    ctx.fillRect(Math.round(g.x), Math.round(g.y), 2, 1);
  }
  // Aisle direction arrows
  ctx.strokeStyle = 'rgba(235, 235, 220, 0.35)';
  ctx.lineWidth = 2;
  for (let x = PARKING.minX + 80; x < PARKING.maxX - 40; x += 160) {
    const cy = (PARKING_AISLE.minY + PARKING_AISLE.maxY) / 2;
    seg(ctx, ox, oy, x, cy, x + 40, cy);
    seg(ctx, ox, oy, x + 40, cy, x + 30, cy - 8);
    seg(ctx, ox, oy, x + 40, cy, x + 30, cy + 8);
  }
  // Stall lines
  ctx.strokeStyle = 'rgba(235, 235, 220, 0.75)';
  for (const row of [STALLS_ROW_A, STALLS_ROW_B]) {
    const north = row === STALLS_ROW_A;
    const y0 = north ? row[0].y - 85 : row[0].y - 80;
    const y1 = north ? row[0].y + 80 : row[0].y + 85;
    for (let i = 0; i <= row.length; i++) {
      const x = row[0].x - STALL_WIDTH / 2 + i * STALL_WIDTH;
      seg(ctx, ox, oy, x, y0, x, y1);
    }
    const endY = north ? y0 : y1;
    seg(ctx, ox, oy, row[0].x - STALL_WIDTH / 2, endY, row[row.length - 1].x + STALL_WIDTH / 2, endY);
    ctx.fillStyle = '#8a8f99';
    for (const s of row) {
      const wy = north ? y0 + 10 : y1 - 16;
      quad(ctx, ox, oy, { minX: s.x - 24, maxX: s.x + 24, minY: wy, maxY: wy + 6 });
      ctx.fill();
    }
  }

  // --- COURTYARD: stone border, lawns north (ceremony) and south (garden), stone path in the middle
  ctx.fillStyle = '#4a4740';
  quad(ctx, ox, oy, COURTYARD);
  ctx.fill();
  ctx.fillStyle = '#1f3a25';
  quad(ctx, ox, oy, { minX: COURTYARD.minX + 12, maxX: COURTYARD.maxX - 12, minY: COURTYARD.minY + 12, maxY: COURTYARD_PATH.minY - 8 });
  ctx.fill();
  quad(ctx, ox, oy, { minX: COURTYARD.minX + 12, maxX: COURTYARD.maxX - 12, minY: COURTYARD_PATH.maxY + 8, maxY: COURTYARD.maxY - 12 });
  ctx.fill();
  // mowing stripes
  ctx.fillStyle = 'rgba(90, 150, 80, 0.07)';
  for (let x = COURTYARD.minX + 12; x < COURTYARD.maxX - 12; x += 80) {
    quad(ctx, ox, oy, { minX: x, maxX: Math.min(x + 40, COURTYARD.maxX - 12), minY: COURTYARD.minY + 12, maxY: COURTYARD_PATH.minY - 8 });
    ctx.fill();
    quad(ctx, ox, oy, { minX: x, maxX: Math.min(x + 40, COURTYARD.maxX - 12), minY: COURTYARD_PATH.maxY + 8, maxY: COURTYARD.maxY - 12 });
    ctx.fill();
  }
  // grass texture
  ctx.fillStyle = 'rgba(120, 190, 110, 0.18)';
  for (let i = 0; i < 3600; i++) {
    const gx = COURTYARD.minX + 14 + hash(i + 31) * (COURTYARD.maxX - COURTYARD.minX - 28);
    const gy = COURTYARD.minY + 14 + hash(i + 77) * (COURTYARD.maxY - COURTYARD.minY - 28);
    if (gy > COURTYARD_PATH.minY - 8 && gy < COURTYARD_PATH.maxY + 8) continue;
    const g = p(ox, oy, gx, gy);
    ctx.fillRect(Math.round(g.x), Math.round(g.y), 1, 2);
  }
  // stone path slabs
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.fillStyle = '#6b665b';
  quad(ctx, ox, oy, COURTYARD_PATH);
  ctx.fill();
  for (let x = COURTYARD_PATH.minX; x < COURTYARD_PATH.maxX; x += 22) seg(ctx, ox, oy, x, COURTYARD_PATH.minY, x, COURTYARD_PATH.maxY);
  for (const y of [COURTYARD_PATH.minY + 49, COURTYARD_PATH.minY + 98]) seg(ctx, ox, oy, COURTYARD_PATH.minX, y, COURTYARD_PATH.maxX, y);
  // a short path from the main path up to the ceremony aisle
  ctx.fillStyle = '#6b665b';
  quad(ctx, ox, oy, { minX: CEREMONY_AISLE.minX - 50, maxX: CEREMONY_AISLE.minX, minY: CEREMONY_AISLE.minY, maxY: COURTYARD_PATH.minY });
  ctx.fill();
  // ceremony aisle: white carpet with rose petals, leading to the chuppah's golden runway
  ctx.fillStyle = '#f1ede4';
  quad(ctx, ox, oy, CEREMONY_AISLE);
  ctx.fill();
  ctx.strokeStyle = 'rgba(201, 165, 74, 0.8)';
  ctx.lineWidth = 1.5;
  quad(ctx, ox, oy, { minX: CEREMONY_AISLE.minX + 3, maxX: CEREMONY_AISLE.maxX, minY: CEREMONY_AISLE.minY + 3, maxY: CEREMONY_AISLE.maxY - 3 });
  ctx.stroke();
  for (let i = 0; i < 160; i++) {
    const g = p(
      ox,
      oy,
      CEREMONY_AISLE.minX + 6 + hash(i + 501) * (CEREMONY_AISLE.maxX - CEREMONY_AISLE.minX - 12),
      CEREMONY_AISLE.minY + 6 + hash(i + 907) * (CEREMONY_AISLE.maxY - CEREMONY_AISLE.minY - 12)
    );
    ctx.fillStyle = i % 3 === 0 ? '#f9a8d4' : i % 3 === 1 ? '#fecdd3' : '#ffffff';
    ctx.fillRect(Math.round(g.x), Math.round(g.y), 2, 1);
  }

  // --- LOBBY: marble tiles + rug + back wall
  ctx.fillStyle = '#cdbfa8';
  quad(ctx, ox, oy, LOBBY);
  ctx.fill();
  const tile = 30;
  for (let x = LOBBY.minX; x < LOBBY.maxX; x += tile) {
    for (let y = LOBBY.minY; y < LOBBY.maxY; y += tile) {
      const v = Math.floor(hash(x * 0.13 + y * 0.71) * 14);
      ctx.fillStyle = `rgb(${200 + v}, ${188 + v}, ${168 + v})`;
      quad(ctx, ox, oy, { minX: x + 1, maxX: Math.min(LOBBY.maxX, x + tile) - 1, minY: y + 1, maxY: Math.min(LOBBY.maxY, y + tile) - 1 });
      ctx.fill();
    }
  }
  // warm light pool from the chandelier
  const lc = p(ox, oy, (LOBBY.minX + LOBBY.maxX) / 2, (LOBBY.minY + LOBBY.maxY) / 2);
  const pool = ctx.createRadialGradient(lc.x, lc.y, 5, lc.x, lc.y, 170);
  pool.addColorStop(0, 'rgba(255, 220, 160, 0.22)');
  pool.addColorStop(1, 'rgba(255, 220, 160, 0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.ellipse(lc.x, lc.y, 170, 85, 0, 0, Math.PI * 2);
  ctx.fill();
  // runner rug along the route
  ctx.fillStyle = '#6b1d2b';
  quad(ctx, ox, oy, { minX: LOBBY.minX, maxX: LOBBY.maxX, minY: 214, maxY: 259 });
  ctx.fill();
  ctx.strokeStyle = '#c9a54a';
  ctx.lineWidth = 1.5;
  quad(ctx, ox, oy, { minX: LOBBY.minX + 4, maxX: LOBBY.maxX - 4, minY: 218, maxY: 255 });
  ctx.stroke();
  // back wall (north side) with sconces + framed mirror
  wallAlongX(ctx, ox, oy, LOBBY.minX, LOBBY.maxX, LOBBY.minY, 110, '#3a2e29');
  ctx.strokeStyle = 'rgba(201, 165, 74, 0.6)';
  ctx.lineWidth = 2;
  seg(ctx, ox, oy, LOBBY.minX, LOBBY.minY, LOBBY.maxX, LOBBY.minY, 110);
  seg(ctx, ox, oy, LOBBY.minX, LOBBY.minY, LOBBY.maxX, LOBBY.minY, 18);
  for (const sx of [LOBBY.minX + 40, LOBBY.maxX - 40]) {
    const s = p(ox, oy, sx, LOBBY.minY, 72);
    const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, 24);
    g.addColorStop(0, 'rgba(255, 220, 150, 0.9)');
    g.addColorStop(1, 'rgba(255, 220, 150, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 24, 0, Math.PI * 2);
    ctx.fill();
  }
  // mirror
  const m0 = p(ox, oy, 545, LOBBY.minY, 34);
  const m1 = p(ox, oy, 585, LOBBY.minY, 34);
  const m2 = p(ox, oy, 585, LOBBY.minY, 92);
  const m3 = p(ox, oy, 545, LOBBY.minY, 92);
  ctx.fillStyle = '#8fa3b5';
  ctx.strokeStyle = '#c9a54a';
  ctx.beginPath();
  ctx.moveTo(m0.x, m0.y);
  ctx.lineTo(m1.x, m1.y);
  ctx.lineTo(m2.x, m2.y);
  ctx.lineTo(m3.x, m3.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  void t;

  // --- WALKWAY from the hall to the lobby door
  ctx.fillStyle = '#3d4049';
  quad(ctx, ox, oy, { minX: HALL_EDGE_X - 4, maxX: LOBBY.minX, minY: HALL_EXIT.minY, maxY: HALL_EXIT.maxY });
  ctx.fill();
  ctx.fillStyle = '#7c2d12';
  quad(ctx, ox, oy, { minX: HALL_EDGE_X - 30, maxX: HALL_EDGE_X - 4, minY: HALL_EXIT.minY + 10, maxY: HALL_EXIT.maxY - 10 });
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Props (depth-sorted)
// ---------------------------------------------------------------------------

export interface OutsideDrawable {
  sortY: number;
  draw: () => void;
}

function doorFrame(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y0: number, y1: number, h: number, label: string, glass: boolean) {
  ctx.save();
  ctx.fillStyle = '#2b2622';
  const post = (y: number) => {
    const a = p(ox, oy, x, y, 0);
    const b = p(ox, oy, x, y, h);
    ctx.fillRect(Math.round(a.x - 3), Math.round(b.y), 6, Math.round(a.y - b.y));
  };
  post(y0);
  post(y1);
  // lintel
  const l0 = p(ox, oy, x, y0, h);
  const l1 = p(ox, oy, x, y1, h);
  ctx.strokeStyle = '#2b2622';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(l0.x, l0.y);
  ctx.lineTo(l1.x, l1.y);
  ctx.stroke();
  ctx.strokeStyle = '#c9a54a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(l0.x, l0.y + 4);
  ctx.lineTo(l1.x, l1.y + 4);
  ctx.stroke();
  if (glass) {
    // two glass door leaves swung open against the posts
    ctx.fillStyle = 'rgba(160, 200, 230, 0.22)';
    ctx.strokeStyle = 'rgba(200, 220, 240, 0.6)';
    ctx.lineWidth = 1;
    for (const [yy, dir] of [
      [y0, 1],
      [y1, -1],
    ] as const) {
      const a = p(ox, oy, x, yy, 0);
      const b = p(ox, oy, x + 22, yy + dir * 4, 0);
      const c = p(ox, oy, x + 22, yy + dir * 4, h - 8);
      const d = p(ox, oy, x, yy, h - 8);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // label
  const mid = p(ox, oy, x, (y0 + y1) / 2, h + 16);
  ctx.font = 'bold 10px "Heebo", sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(10,8,20,0.85)';
  ctx.strokeText(label, mid.x, mid.y);
  ctx.fillStyle = '#fde68a';
  ctx.fillText(label, mid.x, mid.y);
  ctx.restore();
}

function pottedPlant(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y: number) {
  const b = p(ox, oy, x, y);
  ctx.fillStyle = '#e7e2d6';
  ctx.fillRect(Math.round(b.x - 7), Math.round(b.y - 16), 14, 16);
  ctx.fillStyle = '#1f5130';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(b.x + Math.cos(a) * 7, b.y - 30 + Math.sin(a) * 6, 7, 10, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#2f6d40';
  ctx.beginPath();
  ctx.arc(b.x, b.y - 34, 8, 0, Math.PI * 2);
  ctx.fill();
}

function oliveTree(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y: number, t: number) {
  const b = p(ox, oy, x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(b.x, b.y + 2, 24, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4b3a2a';
  ctx.beginPath();
  ctx.moveTo(b.x - 4, b.y);
  ctx.lineTo(b.x + 4, b.y);
  ctx.lineTo(b.x + 6, b.y - 46);
  ctx.lineTo(b.x - 3, b.y - 46);
  ctx.closePath();
  ctx.fill();
  const sway = Math.sin(t * 1.3 + x) * 1.5;
  const greens = ['#2e4a32', '#3b5e3c', '#4f7449'];
  [
    [-14, -58, 18],
    [12, -60, 17],
    [0, -74, 20],
    [-6, -48, 14],
    [10, -46, 12],
  ].forEach(([dx, dy, r], i) => {
    ctx.fillStyle = greens[i % greens.length];
    ctx.beginPath();
    ctx.arc(b.x + dx + sway, b.y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // uplight
  const g = ctx.createRadialGradient(b.x, b.y - 50, 2, b.x, b.y - 50, 34);
  g.addColorStop(0, 'rgba(255, 230, 170, 0.18)');
  g.addColorStop(1, 'rgba(255, 230, 170, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(b.x, b.y - 50, 34, 0, Math.PI * 2);
  ctx.fill();
}

function fountain(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y: number, t: number) {
  const c = p(ox, oy, x, y);
  ctx.fillStyle = '#8b8678';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, 46, 23, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a9a394';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y - 6, 46, 23, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e4f6b';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y - 6, 39, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180, 220, 255, 0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const r = ((t * 12 + i * 12) % 36) + 2;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - 6, r, r / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#b8b2a2';
  ctx.fillRect(Math.round(c.x - 4), Math.round(c.y - 34), 8, 28);
  ctx.fillStyle = 'rgba(200, 230, 255, 0.7)';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t;
    const k = (t * 2 + i / 6) % 1;
    ctx.fillRect(Math.round(c.x + Math.cos(a) * 14 * k), Math.round(c.y - 36 + 30 * k * k - 10 * k), 2, 2);
  }
}

function bench(ctx: CanvasRenderingContext2D, ox: number, oy: number, x0: number, x1: number, y: number) {
  ctx.fillStyle = '#5a3d27';
  for (let z = 10; z <= 14; z += 4) {
    const a = p(ox, oy, x0, y, z);
    const b = p(ox, oy, x1, y, z);
    const c = p(ox, oy, x1, y + 12, z);
    const d = p(ox, oy, x0, y + 12, z);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#2b2b2b';
  for (const xx of [x0 + 4, x1 - 4]) {
    const a = p(ox, oy, xx, y + 6, 0);
    ctx.fillRect(Math.round(a.x - 1), Math.round(a.y - 12), 2, 12);
  }
}

function streetLamp(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y: number, t: number) {
  const b = p(ox, oy, x, y);
  const f = 0.9 + Math.sin(t * 7.3 + x) * 0.05;
  const pool = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, 150);
  pool.addColorStop(0, `rgba(255, 214, 140, ${0.22 * f})`);
  pool.addColorStop(1, 'rgba(255, 214, 140, 0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, 150, 75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1f2329';
  ctx.fillRect(Math.round(b.x - 2), Math.round(b.y - 120), 4, 120);
  ctx.fillRect(Math.round(b.x - 2), Math.round(b.y - 120), 22, 4);
  ctx.fillStyle = '#2d333b';
  ctx.fillRect(Math.round(b.x + 14), Math.round(b.y - 120), 12, 6);
  const g = ctx.createRadialGradient(b.x + 20, b.y - 112, 1, b.x + 20, b.y - 112, 26);
  g.addColorStop(0, `rgba(255, 230, 170, ${f})`);
  g.addColorStop(1, 'rgba(255, 230, 170, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(b.x + 20, b.y - 112, 26, 0, Math.PI * 2);
  ctx.fill();
}

function parkingSign(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y: number, caption = 'חניה') {
  const b = p(ox, oy, x, y);
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(Math.round(b.x - 1.5), Math.round(b.y - 54), 3, 54);
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(Math.round(b.x - 15), Math.round(b.y - 78), 30, 26);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(Math.round(b.x - 13.5), Math.round(b.y - 76.5), 27, 23);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('P', b.x, b.y - 59);
  ctx.font = 'bold 8px "Heebo", sans-serif';
  ctx.direction = 'rtl';
  ctx.fillText(caption, b.x, b.y - 82);
}

function welcomeEasel(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y: number) {
  const b = p(ox, oy, x, y);
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(b.x - 10, b.y);
  ctx.lineTo(b.x - 4, b.y - 50);
  ctx.moveTo(b.x + 10, b.y);
  ctx.lineTo(b.x + 4, b.y - 50);
  ctx.stroke();
  ctx.fillStyle = '#f5efe3';
  ctx.fillRect(Math.round(b.x - 18), Math.round(b.y - 66), 36, 30);
  ctx.strokeStyle = '#c9a54a';
  ctx.strokeRect(Math.round(b.x - 16.5), Math.round(b.y - 64.5), 33, 27);
  ctx.fillStyle = '#5b3a2a';
  ctx.font = 'bold 7px "Heebo", sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('ברוכים', b.x, b.y - 54);
  ctx.fillText('הבאים 💍', b.x, b.y - 44);
}

function guestBookTable(ctx: CanvasRenderingContext2D, ox: number, oy: number, r: Rect) {
  const h = 22;
  const top = (z: number) => {
    const a = p(ox, oy, r.minX, r.minY, z);
    const b = p(ox, oy, r.maxX, r.minY, z);
    const c = p(ox, oy, r.maxX, r.maxY, z);
    const d = p(ox, oy, r.minX, r.maxY, z);
    return [a, b, c, d];
  };
  const [a0, , c0, d0] = top(0);
  const [a, b, c, d] = top(h);
  // front skirt (white linen)
  ctx.fillStyle = '#e9e4da';
  ctx.beginPath();
  ctx.moveTo(d.x, d.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(c0.x, c0.y);
  ctx.lineTo(d0.x, d0.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d6d0c4';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(d.x, d.y);
  ctx.lineTo(d0.x, d0.y);
  ctx.lineTo(a0.x, a0.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f7f3ea';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fill();
  // guest book + candles
  const mid = p(ox, oy, (r.minX + r.maxX) / 2, (r.minY + r.maxY) / 2, h);
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(Math.round(mid.x - 8), Math.round(mid.y - 3), 16, 5);
  ctx.fillStyle = '#fef3c7';
  for (const dx of [-16, 16]) {
    ctx.fillRect(Math.round(mid.x + dx - 1), Math.round(mid.y - 12), 3, 10);
    ctx.fillStyle = 'rgba(255, 200, 90, 0.9)';
    ctx.beginPath();
    ctx.arc(mid.x + dx + 0.5, mid.y - 14, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
  }
}

function sofa(ctx: CanvasRenderingContext2D, ox: number, oy: number, r: Rect) {
  const seat = 12;
  const back = 26;
  const face = (x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, col: string) => {
    const a = p(ox, oy, x0, y0, z0);
    const b = p(ox, oy, x1, y1, z0);
    const c = p(ox, oy, x1, y1, z1);
    const d = p(ox, oy, x0, y0, z1);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  };
  face(r.minX, r.maxY, r.maxX, r.maxY, 0, seat, '#3f1d2e'); // back panel along the wall side (+y)
  face(r.minX, r.maxY, r.maxX, r.maxY, seat, back, '#5b2a42');
  const s0 = p(ox, oy, r.minX, r.minY, seat);
  const s1 = p(ox, oy, r.maxX, r.minY, seat);
  const s2 = p(ox, oy, r.maxX, r.maxY, seat);
  const s3 = p(ox, oy, r.minX, r.maxY, seat);
  ctx.fillStyle = '#6d3350';
  ctx.beginPath();
  ctx.moveTo(s0.x, s0.y);
  ctx.lineTo(s1.x, s1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.lineTo(s3.x, s3.y);
  ctx.closePath();
  ctx.fill();
  face(r.minX, r.minY, r.maxX, r.minY, 0, seat, '#4a2236');
}

/** Courtyard string lights: zig-zag strands between poles along the path, and a canopy over the ceremony. */
const LIGHT_STRANDS: Array<[{ x: number; y: number }, { x: number; y: number }]> = (() => {
  const out: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
  const north = COURTYARD_PATH.minY - 14;
  const south = COURTYARD_PATH.maxY + 14;
  const xs = [710, 960, 1240, 1520, 1770];
  for (let i = 0; i < xs.length - 1; i++) {
    out.push([{ x: xs[i], y: north }, { x: xs[i + 1], y: south }]);
    out.push([{ x: xs[i], y: south }, { x: xs[i + 1], y: north }]);
  }
  const c = [
    { x: 940, y: CEREMONY_AISLE.minY - 170 },
    { x: 1440, y: CEREMONY_AISLE.minY - 170 },
    { x: 1440, y: CEREMONY_AISLE.maxY + 170 },
    { x: 940, y: CEREMONY_AISLE.maxY + 170 },
  ];
  out.push([c[0], c[2]], [c[1], c[3]], [c[0], c[1]], [c[3], c[2]]);
  return out;
})();

function stringLights(ctx: CanvasRenderingContext2D, ox: number, oy: number, t: number) {
  const H = 95;
  ctx.save();
  ctx.fillStyle = '#2a2420';
  const poles = new Map<string, { x: number; y: number }>();
  for (const [a, b] of LIGHT_STRANDS) for (const q of [a, b]) poles.set(`${q.x},${q.y}`, q);
  for (const pl of poles.values()) {
    const b = p(ox, oy, pl.x, pl.y);
    ctx.fillRect(Math.round(b.x - 1.5), Math.round(b.y - H), 3, H);
  }
  LIGHT_STRANDS.forEach(([a, b], k) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(8, Math.round(len / 22));
    const sagAmp = Math.min(40, 10 + len * 0.05);
    ctx.strokeStyle = 'rgba(40, 32, 28, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const sag = Math.sin(u * Math.PI) * sagAmp;
      const q = p(ox, oy, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, H - sag);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    for (let i = 1; i < n; i++) {
      const u = i / n;
      const sag = Math.sin(u * Math.PI) * sagAmp;
      const q = p(ox, oy, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, H - sag - 3);
      const tw = 0.65 + 0.35 * Math.sin(t * 3 + i * 1.7 + k);
      ctx.fillStyle = `rgba(255, 214, 140, ${tw})`;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}

/** Solid iso box: top, +y face (toward the viewer, left) and +x face (toward the viewer, right). */
function isoBox(ctx: CanvasRenderingContext2D, ox: number, oy: number, r: Rect, h: number, top: string, faceY: string, faceX: string, z0 = 0) {
  const poly = (pts: Array<[number, number, number]>, fill: string) => {
    ctx.beginPath();
    pts.forEach(([wx, wy, wz], i) => {
      const q = p(ox, oy, wx, wy, wz);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  poly([[r.minX, r.maxY, z0], [r.maxX, r.maxY, z0], [r.maxX, r.maxY, h], [r.minX, r.maxY, h]], faceY);
  poly([[r.maxX, r.minY, z0], [r.maxX, r.maxY, z0], [r.maxX, r.maxY, h], [r.maxX, r.minY, h]], faceX);
  poly([[r.minX, r.minY, h], [r.maxX, r.minY, h], [r.maxX, r.maxY, h], [r.minX, r.maxY, h]], top);
}

function label(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color = '#fde68a', size = 11) {
  ctx.save();
  ctx.font = `bold ${size}px "Heebo", sans-serif`;
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Black iron fence segment along x = const (posts + two rails). */
function fenceAlongY(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y0: number, y1: number, h = 46) {
  ctx.save();
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2;
  seg(ctx, ox, oy, x, y0, x, y1, h);
  seg(ctx, ox, oy, x, y0, x, y1, h * 0.45);
  ctx.lineWidth = 1.2;
  for (let y = y0; y <= y1; y += 12) {
    const a = p(ox, oy, x, y, 0);
    const b = p(ox, oy, x, y, h + 4);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function guardBooth(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const r: Rect = { minX: 1940, maxX: 1990, minY: 70, maxY: 120 };
  isoBox(ctx, ox, oy, r, 62, '#e7e5e4', '#a8a29e', '#d6d3d1');
  // window band
  isoBox(ctx, ox, oy, { minX: r.minX, maxX: r.maxX + 0.5, minY: r.minY, maxY: r.maxY + 0.5 }, 52, 'rgba(0,0,0,0)', 'rgba(125, 211, 252, 0.55)', 'rgba(125, 211, 252, 0.45)', 30);
  isoBox(ctx, ox, oy, { minX: r.minX - 4, maxX: r.maxX + 4, minY: r.minY - 4, maxY: r.maxY + 4 }, 68, '#44403c', '#292524', '#3f3f46', 62);
  const c = p(ox, oy, (r.minX + r.maxX) / 2, r.maxY, 82);
  label(ctx, c.x, c.y, 'אבטחה', '#e0f2fe', 10);
}

function kitchen(ctx: CanvasRenderingContext2D, ox: number, oy: number, t: number) {
  const r = KITCHEN;
  isoBox(ctx, ox, oy, r, 90, '#57534e', '#78716c', '#a8a29e');
  // lit windows on the +y face
  for (let x = r.minX + 18; x < r.maxX - 20; x += 40) {
    const flicker = 0.75 + 0.25 * Math.sin(t * 2 + x);
    isoBox(ctx, ox, oy, { minX: x, maxX: x + 22, minY: r.maxY, maxY: r.maxY + 0.5 }, 70, 'rgba(0,0,0,0)', `rgba(254, 240, 138, ${0.55 * flicker})`, 'rgba(0,0,0,0)', 44);
  }
  // service door on the -y side faces the yard lane; on the +x face: a steel door
  isoBox(ctx, ox, oy, { minX: r.maxX, maxX: r.maxX + 0.5, minY: r.minY + 30, maxY: r.minY + 62 }, 72, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', '#94a3b8');
  const c = p(ox, oy, (r.minX + r.maxX) / 2, r.maxY, 106);
  label(ctx, c.x, c.y, 'מטבח · שירות', '#fde68a', 11);
}

function foodStation(ctx: CanvasRenderingContext2D, ox: number, oy: number, r: Rect, name: string) {
  isoBox(ctx, ox, oy, r, 30, '#fafaf9', '#e7e5e4', '#d6d3d1');
  for (let i = 0; i < 3; i++) {
    const x = r.minX + 16 + i * ((r.maxX - r.minX - 32) / 2);
    const b = p(ox, oy, x, (r.minY + r.maxY) / 2, 30);
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y - 3, 9, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y - 6, 8, 4, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  const c = p(ox, oy, (r.minX + r.maxX) / 2, r.maxY, 56);
  label(ctx, c.x, c.y, name, '#fef3c7', 10);
}

function cocktailTable(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y: number) {
  const b = p(ox, oy, x, y, 0);
  const top = p(ox, oy, x, y, 38);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5f5f4';
  ctx.beginPath();
  ctx.moveTo(top.x - 10, top.y);
  ctx.lineTo(top.x - 5, b.y);
  ctx.lineTo(top.x + 5, b.y);
  ctx.lineTo(top.x + 10, top.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(top.x, top.y, 11, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(Math.round(top.x - 1), Math.round(top.y - 6), 2, 5);
}

/** White folding ceremony chair (seat + back), facing +x toward the chuppah. */
function ceremonyChair(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y: number) {
  const face = (pts: Array<[number, number, number]>, fill: string) => {
    ctx.beginPath();
    pts.forEach(([wx, wy, wz], i) => {
      const q = p(ox, oy, wx, wy, wz);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  ctx.save();
  // shadow
  const s0 = p(ox, oy, x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(s0.x, s0.y, 9, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // legs
  ctx.strokeStyle = '#d6d3d1';
  ctx.lineWidth = 1.2;
  for (const [dx, dy] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
    const a = p(ox, oy, x + dx, y + dy, 0);
    const b = p(ox, oy, x + dx, y + dy, 14);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // seat
  face([[x - 7, y - 7, 14], [x + 7, y - 7, 14], [x + 7, y + 7, 14], [x - 7, y + 7, 14]], '#fafaf9');
  face([[x - 7, y + 7, 14], [x + 7, y + 7, 14], [x + 7, y + 7, 12], [x - 7, y + 7, 12]], '#d6d3d1');
  // back (on the -x side, so the seat faces the chuppah)
  face([[x - 7, y - 7, 14], [x - 7, y + 7, 14], [x - 7, y + 7, 34], [x - 7, y - 7, 34]], '#f5f5f4');
  ctx.strokeStyle = 'rgba(168, 162, 158, 0.9)';
  ctx.lineWidth = 1;
  seg(ctx, ox, oy, x - 7, y - 7, x - 7, y + 7, 27);
  seg(ctx, ox, oy, x - 7, y - 7, x - 7, y + 7, 20);
  ctx.restore();
}

function flowerWall(ctx: CanvasRenderingContext2D, ox: number, oy: number, t: number) {
  const { x0, x1, y } = FLOWER_WALL;
  const H = 84;
  // panel
  wallAlongX(ctx, ox, oy, x0, x1, y, H, '#2d4a33');
  // flowers: white + blush roses in a dense grid
  const cols = ['#fdf2f8', '#fbcfe8', '#ffffff', '#f9a8d4', '#fde68a'];
  for (let i = 0; i < 90; i++) {
    const u = hash(i * 3.1) * (x1 - x0 - 4) + 2;
    const z = hash(i * 7.7) * (H - 8) + 4;
    const q = p(ox, oy, x0 + u, y, z);
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.arc(q.x, q.y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // neon sign
  const mid = p(ox, oy, (x0 + x1) / 2, y, H * 0.62);
  ctx.save();
  ctx.font = 'bold 11px "Heebo", sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.shadowColor = '#f472b6';
  ctx.shadowBlur = 8 + Math.sin(t * 3) * 2;
  ctx.fillStyle = '#fff1f8';
  ctx.fillText('Love ♥', mid.x, mid.y);
  ctx.restore();
  // floor marker for the pose spot
  const s = p(ox, oy, PHOTO_SPOT.x, PHOTO_SPOT.y);
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, 22, 11, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/** All outside props as depth-sorted drawables (the cars are added by the game). */
export function getOutsideDrawables(ctx: CanvasRenderingContext2D, ox: number, oy: number, t: number): OutsideDrawable[] {
  const at = (x: number, y: number) => worldToIso(x, y).y;
  const list: OutsideDrawable[] = [];
  // Doors
  list.push({ sortY: at(HALL_EDGE_X + 15, HALL_EXIT.maxY), draw: () => doorFrame(ctx, ox, oy, HALL_EDGE_X + 15, HALL_EXIT.minY - 4, HALL_EXIT.maxY + 4, 100, 'לובי ←', true) });
  list.push({ sortY: at(GARDEN_GATE.minX + 25, GARDEN_GATE.maxY), draw: () => doorFrame(ctx, ox, oy, GARDEN_GATE.minX + 25, GARDEN_GATE.minY - 4, GARDEN_GATE.maxY + 4, 96, 'חצר · קבלת פנים', true) });
  // Lobby props
  // Back of house
  list.push({ sortY: at(SERVICE_DOOR_X + 15, SERVICE_EXIT.maxY), draw: () => doorFrame(ctx, ox, oy, SERVICE_DOOR_X + 15, SERVICE_EXIT.minY - 4, SERVICE_EXIT.maxY + 4, 100, 'שירות · ספקים', false) });
  list.push({ sortY: at(KITCHEN.maxX, KITCHEN.maxY), draw: () => kitchen(ctx, ox, oy, t) });
  {
    const r: Rect = { minX: SERVICE_YARD.minX + 30, maxX: SERVICE_YARD.maxX, minY: SERVICE_YARD.maxY + 4, maxY: SERVICE_YARD.maxY + 22 };
    list.push({ sortY: at(r.maxX, r.maxY), draw: () => isoBox(ctx, ox, oy, r, 22, '#2f6b3a', '#1f4d29', '#285c33') });
  }
  for (let y = SERVICE_YARD.minY; y < SERVICE_YARD.maxY; y += 70) {
    const y1 = Math.min(SERVICE_YARD.maxY, y + 70);
    list.push({ sortY: at(SERVICE_YARD.maxX + 6, y1), draw: () => fenceAlongY(ctx, ox, oy, SERVICE_YARD.maxX + 6, y, y1) });
  }
  list.push({ sortY: at(SERVICE_YARD.minX + 30, VENDOR_STALLS[0].y + 70), draw: () => parkingSign(ctx, ox, oy, SERVICE_YARD.minX + 14, VENDOR_STALLS[0].y + 76, 'ספקים בלבד') });
  // Courtyard fence along the plaza with the venue's main gate
  for (const [y0, y1] of [
    [COURTYARD.minY, PLAZA_GATE.minY],
    [PLAZA_GATE.maxY, COURTYARD.maxY],
  ]) {
    for (let y = y0; y < y1; y += 80) {
      const ye = Math.min(y1, y + 80);
      list.push({ sortY: at(COURTYARD_FENCE_X, ye), draw: () => fenceAlongY(ctx, ox, oy, COURTYARD_FENCE_X, y, ye) });
    }
  }
  list.push({ sortY: at(COURTYARD_FENCE_X + 2, PLAZA_GATE.maxY), draw: () => doorFrame(ctx, ox, oy, COURTYARD_FENCE_X + 2, PLAZA_GATE.minY - 4, PLAZA_GATE.maxY + 4, 120, 'ברוכים הבאים', false) });
  list.push({ sortY: at(1990, 120), draw: () => guardBooth(ctx, ox, oy) });
  // Buffer: hedges on both sides of the walkway, trees behind them
  for (const [y0, y1] of [
    [BUFFER.minY, BUFFER_WALK.minY - 6],
    [BUFFER_WALK.maxY + 6, BUFFER.maxY],
  ]) {
    for (let y = y0; y < y1; y += 60) {
      const r: Rect = { minX: BUFFER.minX + 8, maxX: BUFFER.maxX - 8, minY: y, maxY: Math.min(y1, y + 60) };
      list.push({ sortY: at(r.maxX, r.maxY), draw: () => isoBox(ctx, ox, oy, r, 28, '#2f6b3a', '#1f4d29', '#285c33') });
    }
  }
  for (const y of [-40, 60, 360, 470]) list.push({ sortY: at(BUFFER.minX + 35, y), draw: () => oliveTree(ctx, ox, oy, BUFFER.minX + 35, y, t) });
  for (const [x, y] of [[PLAZA.minX + 20, PLAZA.minY + 20], [PLAZA.maxX - 20, PLAZA.minY + 20]] as Array<[number, number]>) {
    list.push({ sortY: at(x, y), draw: () => streetLamp(ctx, ox, oy, x, y, t) });
  }
  // Reception garden by the gate: flower photo wall, bar, food stations, cocktail tables
  list.push({ sortY: at(PHOTO_SPOT.x, FLOWER_WALL.y), draw: () => flowerWall(ctx, ox, oy, t) });
  FOOD_STATIONS.forEach((r, i) => list.push({ sortY: at(r.maxX, r.maxY), draw: () => foodStation(ctx, ox, oy, r, i === 0 ? 'עמדת סושי' : 'עמדת גריל') }));
  for (const [x, y] of COCKTAIL_TABLES) list.push({ sortY: at(x, y), draw: () => cocktailTable(ctx, ox, oy, x, y) });
  list.push({ sortY: at(520, 135), draw: () => welcomeEasel(ctx, ox, oy, 520, 135) });
  list.push({ sortY: at(630, 150), draw: () => guestBookTable(ctx, ox, oy, { minX: 575, maxX: 630, minY: 118, maxY: 150 }) });
  for (const [x, y] of [
    [488, 115],
    [642, 115],
    [488, 355],
    [642, 355],
  ]) {
    list.push({ sortY: at(x, y), draw: () => pottedPlant(ctx, ox, oy, x, y) });
  }
  list.push({ sortY: at(605, 360), draw: () => sofa(ctx, ox, oy, { minX: 525, maxX: 605, minY: 330, maxY: 360 }) });
  // Courtyard: garden (south)
  list.push({ sortY: at(FOUNTAIN_POS.x, FOUNTAIN_POS.y), draw: () => fountain(ctx, ox, oy, FOUNTAIN_POS.x, FOUNTAIN_POS.y, t) });
  for (const [x, y] of OLIVE_TREES) list.push({ sortY: at(x, y), draw: () => oliveTree(ctx, ox, oy, x, y, t) });
  for (const bn of BENCHES) list.push({ sortY: at(bn.x1, bn.y + 12), draw: () => bench(ctx, ox, oy, bn.x0, bn.x1, bn.y) });
  for (const [x, y] of COURTYARD_LAMPS) list.push({ sortY: at(x, y), draw: () => streetLamp(ctx, ox, oy, x, y, t) });
  // Ceremony (north): rows of white chairs facing the chuppah
  for (const r of CEREMONY_CHAIR_ROWS) {
    for (let y = r.y0; y <= r.y1 + 0.1; y += CEREMONY_CHAIR_SPACING) {
      list.push({ sortY: at(r.x, y), draw: () => ceremonyChair(ctx, ox, oy, r.x, y) });
    }
  }
  list.push({ sortY: at(COURTYARD.maxX, COURTYARD.maxY) + 400, draw: () => stringLights(ctx, ox, oy, t) });
  // Parking
  for (const [x, y] of [
    [PARKING.minX + 30, PARKING.minY + 30],
    [PARKING.maxX - 30, PARKING.minY + 30],
    [PARKING.minX + 30, PARKING.maxY - 30],
    [PARKING.maxX - 30, PARKING.maxY - 30],
  ]) {
    list.push({ sortY: at(x, y), draw: () => streetLamp(ctx, ox, oy, x, y, t) });
  }
  list.push({ sortY: at(PARKING.minX + 12, PARKING_AISLE.minY - 10), draw: () => parkingSign(ctx, ox, oy, PARKING.minX + 12, PARKING_AISLE.minY - 10) });
  return list;
}
