/**
 * Outside the hall: entrance door → lobby → courtyard → big parking lot.
 *
 * Layout (world units, the hall floor is the square ±440; the route runs along +x):
 *   hall side door (x≈455) → LOBBY (marble, welcome sign, guest-book table, plants, sofa)
 *   → garden gate (x≈675) → COURTYARD (stone path, lawns, olive trees, fountain, string lights)
 *   → PARKING (two rows of stalls along a central aisle, lamps; the photographer's car).
 *
 * Everything here is procedural Canvas2D in the game's 2:1 projection, except the cars, which are
 * sprites (see PARKED_CARS). Ground layers are drawn under the actors; props are returned as
 * depth-sorted drawables.
 */
import { worldToIso } from './rules.ts';

export type Rect = { minX: number; maxX: number; minY: number; maxY: number };

export const HALL_EDGE_X = 440;
/** Inside the hall up to the side door (passes the workstation corner). */
export const HALL_EXIT: Rect = { minX: 250, maxX: 480, minY: 205, maxY: 268 };
export const LOBBY: Rect = { minX: 470, maxX: 660, minY: 100, maxY: 370 };
export const GARDEN_GATE: Rect = { minX: 650, maxX: 700, minY: 170, maxY: 305 };
export const COURTYARD: Rect = { minX: 690, maxX: 910, minY: 40, maxY: 430 };
export const PARKING: Rect = { minX: 900, maxX: 1380, minY: -70, maxY: 530 };
/** Central driving aisle of the lot (cars park on both sides, trunks/fronts toward it). */
export const PARKING_AISLE: Rect = { minX: 900, maxX: 1380, minY: 190, maxY: 285 };

export const WALKABLE_OUTSIDE: Rect[] = [HALL_EXIT, LOBBY, GARDEN_GATE, COURTYARD, PARKING];

export const insideRect = (r: Rect, x: number, y: number) =>
  x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY;

export function isWalkableOutside(x: number, y: number): boolean {
  return WALKABLE_OUTSIDE.some((r) => insideRect(r, x, y));
}

/** Doorways along the route: when the player pushes against a wall next to one, steer him into it. */
export const DOORWAYS: Rect[] = [HALL_EXIT, GARDEN_GATE];

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

/** Stall centres. Row A (north of the aisle) parks trunk-first toward the aisle (+y). */
export const STALL_WIDTH = 120;
export const STALLS_ROW_A: Array<{ x: number; y: number }> = [0, 1, 2, 3].map((i) => ({
  x: 975 + i * STALL_WIDTH,
  y: 110,
}));
export const STALLS_ROW_B: Array<{ x: number; y: number }> = [0, 1, 2, 3].map((i) => ({
  x: 975 + i * STALL_WIDTH,
  y: 370,
}));

/** The photographer's car (row A, second stall), trunk toward the aisle. */
export const PLAYER_CAR = STALLS_ROW_A[1];
export const PLAYER_CAR_TRUNK_SPOT = { x: PLAYER_CAR.x - 6, y: PLAYER_CAR.y + 92 };

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
  // Courtyard: fountain, olive trees, benches
  { kind: 'circle', x: 800, y: 110, r: 34 },
  { kind: 'circle', x: 735, y: 360, r: 16 },
  { kind: 'circle', x: 870, y: 360, r: 16 },
  { kind: 'circle', x: 735, y: 75, r: 16 },
  { kind: 'circle', x: 870, y: 160, r: 16 },
  { kind: 'box', minX: 775, minY: 330, maxX: 830, maxY: 345 },
  // Photographer's car
  { kind: 'box', minX: PLAYER_CAR.x - 34, minY: PLAYER_CAR.y - 66, maxX: PLAYER_CAR.x + 34, maxY: PLAYER_CAR.y + 60 },
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

  // --- COURTYARD: lawns + stone path + fountain basin ground ring
  ctx.fillStyle = '#4a4740';
  quad(ctx, ox, oy, COURTYARD);
  ctx.fill();
  ctx.fillStyle = '#1f3a25';
  quad(ctx, ox, oy, { minX: COURTYARD.minX + 12, maxX: COURTYARD.maxX - 12, minY: COURTYARD.minY + 12, maxY: GARDEN_GATE.minY - 14 });
  ctx.fill();
  quad(ctx, ox, oy, { minX: COURTYARD.minX + 12, maxX: COURTYARD.maxX - 12, minY: GARDEN_GATE.maxY + 14, maxY: COURTYARD.maxY - 12 });
  ctx.fill();
  // grass texture
  ctx.fillStyle = 'rgba(120, 190, 110, 0.18)';
  for (let i = 0; i < 520; i++) {
    const gx = COURTYARD.minX + 14 + hash(i + 31) * (COURTYARD.maxX - COURTYARD.minX - 28);
    const gy = COURTYARD.minY + 14 + hash(i + 77) * (COURTYARD.maxY - COURTYARD.minY - 28);
    if (gy > GARDEN_GATE.minY - 14 && gy < GARDEN_GATE.maxY + 14) continue;
    const g = p(ox, oy, gx, gy);
    ctx.fillRect(Math.round(g.x), Math.round(g.y), 1, 2);
  }
  // stone path slabs
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.fillStyle = '#6b665b';
  quad(ctx, ox, oy, { minX: COURTYARD.minX, maxX: COURTYARD.maxX, minY: GARDEN_GATE.minY - 6, maxY: GARDEN_GATE.maxY + 6 });
  ctx.fill();
  for (let x = COURTYARD.minX; x < COURTYARD.maxX; x += 22) seg(ctx, ox, oy, x, GARDEN_GATE.minY - 6, x, GARDEN_GATE.maxY + 6);
  seg(ctx, ox, oy, COURTYARD.minX, (GARDEN_GATE.minY + GARDEN_GATE.maxY) / 2, COURTYARD.maxX, (GARDEN_GATE.minY + GARDEN_GATE.maxY) / 2);

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

function parkingSign(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y: number) {
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
  ctx.fillText('חניה', b.x, b.y - 82);
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

function stringLights(ctx: CanvasRenderingContext2D, ox: number, oy: number, t: number) {
  const poles = [
    { x: COURTYARD.minX + 10, y: COURTYARD.minY + 10 },
    { x: COURTYARD.maxX - 10, y: COURTYARD.minY + 10 },
    { x: COURTYARD.maxX - 10, y: COURTYARD.maxY - 10 },
    { x: COURTYARD.minX + 10, y: COURTYARD.maxY - 10 },
  ];
  const H = 95;
  ctx.save();
  ctx.fillStyle = '#2a2420';
  for (const pl of poles) {
    const b = p(ox, oy, pl.x, pl.y);
    ctx.fillRect(Math.round(b.x - 1.5), Math.round(b.y - H), 3, H);
  }
  const pairs = [
    [poles[0], poles[2]],
    [poles[1], poles[3]],
    [poles[0], poles[1]],
    [poles[3], poles[2]],
  ];
  pairs.forEach(([a, b], k) => {
    const n = 14;
    ctx.strokeStyle = 'rgba(40, 32, 28, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const sag = Math.sin(u * Math.PI) * 26;
      const q = p(ox, oy, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, H - sag);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    for (let i = 1; i < n; i++) {
      const u = i / n;
      const sag = Math.sin(u * Math.PI) * 26;
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

/** All outside props as depth-sorted drawables (the cars are added by the game). */
export function getOutsideDrawables(ctx: CanvasRenderingContext2D, ox: number, oy: number, t: number): OutsideDrawable[] {
  const at = (x: number, y: number) => worldToIso(x, y).y;
  const list: OutsideDrawable[] = [];
  // Doors
  list.push({ sortY: at(HALL_EDGE_X + 15, HALL_EXIT.maxY), draw: () => doorFrame(ctx, ox, oy, HALL_EDGE_X + 15, HALL_EXIT.minY - 4, HALL_EXIT.maxY + 4, 100, 'לובי ←', true) });
  list.push({ sortY: at(GARDEN_GATE.minX + 25, GARDEN_GATE.maxY), draw: () => doorFrame(ctx, ox, oy, GARDEN_GATE.minX + 25, GARDEN_GATE.minY - 4, GARDEN_GATE.maxY + 4, 96, 'חצר · חניה', true) });
  // Lobby props
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
  // Courtyard
  list.push({ sortY: at(800, 110), draw: () => fountain(ctx, ox, oy, 800, 110, t) });
  for (const [x, y] of [
    [735, 360],
    [870, 360],
    [735, 75],
    [870, 160],
  ]) {
    list.push({ sortY: at(x, y), draw: () => oliveTree(ctx, ox, oy, x, y, t) });
  }
  list.push({ sortY: at(830, 345), draw: () => bench(ctx, ox, oy, 775, 830, 333) });
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
