/**
 * Event-hall art (modern ballroom): dark slate floor with gobo projections, living green wall,
 * beige/dark slat panels with gold-green LED fiber screens, ceiling trusses with moving heads,
 * long white banquet tables with ghost chairs, flower centerpieces & crystal candelabras,
 * a black island bar with a backlit bottle tower, bartenders, and an uplit-tree lounge.
 *
 * All drawing is procedural Canvas2D in the game's 2:1 isometric projection (worldToIso).
 */

import { worldToIso } from './rules.ts';

export type IsoBoxFn = (
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
  strokeColor?: string,
  zBase?: number
) => void;

// ---------------------------------------------------------------------------
// Layout constants (world units) shared with gameplay
// ---------------------------------------------------------------------------

export const HALL_WALL_HEIGHT = 205;
export const DANCE_FLOOR_RADIUS = 168;

/** Square island bar in the middle-right of the hall. */
export const ISLAND_BAR = {
  cx: 248,
  cy: -98,
  half: 46, // outer half-size
  counter: 14, // counter depth
  height: 30,
  towerHalf: 15,
  towerHeight: 74,
} as const;

/** Spots just outside the counter where guests stand / lean at the bar. */
export const BAR_GUEST_SPOTS: Array<{ x: number; y: number }> = [
  { x: ISLAND_BAR.cx - ISLAND_BAR.half - 11, y: ISLAND_BAR.cy - 28 },
  { x: ISLAND_BAR.cx - ISLAND_BAR.half - 11, y: ISLAND_BAR.cy },
  { x: ISLAND_BAR.cx - ISLAND_BAR.half - 11, y: ISLAND_BAR.cy + 28 },
  { x: ISLAND_BAR.cx - 28, y: ISLAND_BAR.cy + ISLAND_BAR.half + 11 },
  { x: ISLAND_BAR.cx, y: ISLAND_BAR.cy + ISLAND_BAR.half + 11 },
  { x: ISLAND_BAR.cx + 28, y: ISLAND_BAR.cy + ISLAND_BAR.half + 11 },
];

/** Where waiters pick up drinks (outside two corners of the island). */
export const BAR_PICKUP_SPOTS: Array<{ x: number; y: number }> = [
  { x: ISLAND_BAR.cx - ISLAND_BAR.half - 12, y: ISLAND_BAR.cy - ISLAND_BAR.half + 4 },
  { x: ISLAND_BAR.cx + ISLAND_BAR.half - 4, y: ISLAND_BAR.cy + ISLAND_BAR.half + 12 },
];

/** Stations inside the island ring where bartenders work. */
export const BARTENDER_STATIONS: Array<{ x: number; y: number }> = [
  { x: ISLAND_BAR.cx - 24, y: ISLAND_BAR.cy + 22 },
  { x: ISLAND_BAR.cx, y: ISLAND_BAR.cy + 25 },
  { x: ISLAND_BAR.cx + 24, y: ISLAND_BAR.cy + 22 },
  { x: ISLAND_BAR.cx + 25, y: ISLAND_BAR.cy },
  { x: ISLAND_BAR.cx - 25, y: ISLAND_BAR.cy },
  { x: ISLAND_BAR.cx - 22, y: ISLAND_BAR.cy - 24 },
  { x: ISLAND_BAR.cx + 22, y: ISLAND_BAR.cy - 24 },
];

/** Long banquet table footprint (long axis along world x). */
export const LONG_TABLE = { length: 88, depth: 30, height: 26 } as const;

/**
 * Seats around a long table (5 per table): 3 on the far (north) side facing the viewer,
 * 2 on the near (south) side with their backs to the viewer.
 */
export const LONG_TABLE_SEATS: Array<{ dx: number; dy: number; dir: 'SW' | 'NE' }> = [
  { dx: -28, dy: -24, dir: 'SW' },
  { dx: 0, dy: -24, dir: 'SW' },
  { dx: 28, dy: -24, dir: 'SW' },
  { dx: -15, dy: 24, dir: 'NE' },
  { dx: 15, dy: 24, dir: 'NE' },
];

/** Decorative full tables that fill out the hall (static seated guests, no gameplay). */
export const DECOR_TABLES: Array<{ x: number; y: number; number: number }> = [
  { x: -310, y: -15, number: 12 },
  { x: 15, y: 292, number: 25 },
  { x: 205, y: 292, number: 40 },
];

/** Uplit tree + velvet lounge (replaces the old olive tree corner). */
export const LOUNGE = { treeX: -250, treeY: -240, sofaX: -205, sofaY: -205 } as const;

/** Rattan high tables along the green wall. */
export const RATTAN_HIGH_TABLES: Array<{ x: number; y: number }> = [
  { x: -372, y: -150 },
  { x: -372, y: 150 },
];

/** Ceiling trusses over the dance floor; moving heads hang from them. */
export const HALL_TRUSSES: Array<{ cx: number; cy: number; w: number; d: number; z: number }> = [
  { cx: -55, cy: -45, w: 110, d: 66, z: 178 },
  { cx: 65, cy: -30, w: 110, d: 66, z: 178 },
];

export interface MovingHead {
  x: number;
  y: number;
  z: number;
  warm: boolean;
  phase: number;
}

/** Moving-head fixtures (corners + mid-edges of each truss), alternating cold blue / warm yellow. */
export function getMovingHeads(): MovingHead[] {
  const heads: MovingHead[] = [];
  HALL_TRUSSES.forEach((t, ti) => {
    const hw = t.w / 2;
    const hd = t.d / 2;
    const pts = [
      [-hw, -hd],
      [0, -hd],
      [hw, -hd],
      [hw, hd],
      [0, hd],
      [-hw, hd],
    ];
    pts.forEach(([ox, oy], i) => {
      heads.push({ x: t.cx + ox, y: t.cy + oy, z: t.z - 6, warm: (i + ti) % 2 === 0, phase: i * 1.07 + ti * 2.3 });
    });
  });
  return heads;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function hash(n: number): number {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function iso(originX: number, originY: number, x: number, y: number, z = 0) {
  const p = worldToIso(x, y, z);
  return { x: originX + p.x, y: originY + p.y };
}

function polygon(ctx: CanvasRenderingContext2D, pts: Array<{ x: number; y: number }>) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

/** Iso ellipse for a world-space circle of radius r at height z. */
function isoCircle(ctx: CanvasRenderingContext2D, sx: number, sy: number, r: number) {
  ctx.beginPath();
  ctx.ellipse(sx, sy, r * Math.SQRT2, r * Math.SQRT2 * 0.5, 0, 0, Math.PI * 2);
}

// ---------------------------------------------------------------------------
// 1. FLOOR — large dark slate tiles + polished sheen
// ---------------------------------------------------------------------------

export function drawHallFloor(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  floorSize: number,
  tileStep: number
) {
  // Rectangular 2:1 slate tiles in a staggered (running-bond) layout like the venue floor
  const tileW = tileStep;
  const tileD = tileStep / 2;
  let row = 0;
  for (let gy = -floorSize; gy < floorSize; gy += tileD, row++) {
    const offset = row % 2 === 0 ? 0 : tileW / 2;
    for (let gx = -floorSize - offset; gx < floorSize; gx += tileW) {
      const x0 = Math.max(-floorSize, gx);
      const x1 = Math.min(floorSize, gx + tileW);
      if (x1 <= x0) continue;
      const shade = Math.floor(hash(gx * 0.37 + gy * 1.91) * 7);
      ctx.fillStyle = `rgb(${38 + shade}, ${40 + shade}, ${47 + shade})`;
      ctx.strokeStyle = 'rgba(150, 160, 180, 0.13)';
      ctx.lineWidth = 1;
      polygon(ctx, [
        iso(originX, originY, x0, gy),
        iso(originX, originY, x1, gy),
        iso(originX, originY, x1, gy + tileD),
        iso(originX, originY, x0, gy + tileD),
      ]);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Polished stone sheen across the middle of the hall (reflects the stage lights)
  const c = iso(originX, originY, 0, 0);
  const sheen = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, 420);
  sheen.addColorStop(0, 'rgba(180, 190, 220, 0.10)');
  sheen.addColorStop(1, 'rgba(180, 190, 220, 0)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, 420, 210, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Gobo projections on the dance floor: drifting cool-white dots and two rotating warm
 * swirl gobos. Drawn right after the floor so dancers stand on top of the light.
 */
export function drawGoboProjections(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  t: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Soft overall wash marking the dance floor
  const c = iso(originX, originY, 0, 0);
  const wash = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, DANCE_FLOOR_RADIUS * 1.45);
  wash.addColorStop(0, 'rgba(120, 140, 255, 0.13)');
  wash.addColorStop(1, 'rgba(120, 140, 255, 0)');
  ctx.fillStyle = wash;
  isoCircle(ctx, c.x, c.y, DANCE_FLOOR_RADIUS);
  ctx.fill();

  // Drifting cool dots
  for (let i = 0; i < 16; i++) {
    const a = t * (0.18 + hash(i) * 0.22) + i * 2.1;
    const rr = DANCE_FLOOR_RADIUS * (0.25 + 0.65 * hash(i + 9));
    const wx = Math.cos(a) * rr;
    const wy = Math.sin(a * 1.3 + i) * rr * 0.85;
    const p = iso(originX, originY, wx, wy);
    const r = 7 + hash(i + 3) * 6;
    const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r * 1.6);
    const cold = i % 3 !== 0;
    g.addColorStop(0, cold ? 'rgba(200, 215, 255, 0.55)' : 'rgba(255, 230, 150, 0.5)');
    g.addColorStop(1, 'rgba(200, 215, 255, 0)');
    ctx.fillStyle = g;
    isoCircle(ctx, p.x, p.y, r);
    ctx.fill();
  }

  // Two rotating warm swirl gobos (arcs of light)
  const swirls = [
    { x: -55, y: 35, r: 46, s: 0.6 },
    { x: 60, y: -20, r: 40, s: -0.5 },
  ];
  ctx.lineCap = 'round';
  for (const sw of swirls) {
    const p = iso(originX, originY, sw.x, sw.y);
    for (let k = 0; k < 5; k++) {
      const start = t * sw.s + k * ((Math.PI * 2) / 5);
      ctx.strokeStyle = `rgba(255, 210, 110, ${0.28 - k * 0.02})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, sw.r * Math.SQRT2, sw.r * Math.SQRT2 * 0.5, 0, start, start + 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, sw.r * 0.6 * Math.SQRT2, sw.r * 0.6 * Math.SQRT2 * 0.5, 0, -start, -start + 0.6);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. WALLS — living green wall (left) + slat panels with LED fiber screens (right)
// ---------------------------------------------------------------------------

interface WallLayer {
  canvas: HTMLCanvasElement;
  minX: number;
  minY: number;
}
let wallLayerCache: { key: string; layer: WallLayer } | null = null;

const LEAF_PALETTE = ['#264d23', '#2f5d2a', '#3b6e2f', '#4a7f35', '#5e9440', '#7aa94a', '#5a3a36', '#6b4540'];

/** Static wall art rendered once into an offscreen canvas in iso-local coordinates. */
function buildWallLayer(floorSize: number): WallLayer | null {
  if (typeof document === 'undefined') return null;
  const H = HALL_WALL_HEIGHT;
  const minX = -2 * floorSize - 4;
  const maxX = 2 * floorSize + 4;
  const minY = -floorSize - H - 6;
  const maxY = 4;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(maxX - minX);
  canvas.height = Math.ceil(maxY - minY);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const P = (x: number, y: number, z: number) => {
    const p = worldToIso(x, y, z);
    return { x: p.x - minX, y: p.y - minY };
  };
  const fs = floorSize;

  // --- Right-back wall (y = -fs): vertical slat panels, beige / dark / taupe -------------
  ctx.fillStyle = '#2c2a2e';
  polygon(ctx, [P(-fs, -fs, 0), P(fs, -fs, 0), P(fs, -fs, H), P(-fs, -fs, H)]);
  ctx.fill();
  let x = -fs;
  let i = 0;
  while (x < fs) {
    const w = 10 + Math.floor(hash(i * 3.3) * 26);
    const x1 = Math.min(fs, x + w);
    const kind = hash(i * 7.1);
    const color = kind < 0.45 ? '#cbbfae' : kind < 0.7 ? '#9d907f' : kind < 0.85 ? '#3a3532' : '#1c1a1d';
    // Panels stop short of the floor and the ceiling like the real wall cladding
    const zTop = H - 10 - Math.floor(hash(i * 1.9) * 3) * 6;
    ctx.fillStyle = color;
    polygon(ctx, [P(x, -fs + 1, 6), P(x1, -fs + 1, 6), P(x1, -fs + 1, zTop), P(x, -fs + 1, zTop)]);
    ctx.fill();
    // Thin shadow gap between panels
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const a = P(x1, -fs + 1, 6);
    const b = P(x1, -fs + 1, zTop);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    x = x1 + 2;
    i++;
  }
  // Warm downlight scallops on the slats
  for (let k = 0; k < 9; k++) {
    const sx = -fs + 60 + k * ((2 * fs - 120) / 8);
    const p = P(sx, -fs + 2, H - 30);
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y + 50, 90);
    g.addColorStop(0, 'rgba(255, 236, 200, 0.35)');
    g.addColorStop(1, 'rgba(255, 236, 200, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 50, 40, 90, -0.46, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Left-back wall (x = -fs): living green wall ----------------------------------------
  ctx.fillStyle = '#16301a';
  polygon(ctx, [P(-fs, -fs, 0), P(-fs, fs, 0), P(-fs, fs, H), P(-fs, -fs, H)]);
  ctx.fill();
  // Dark planter trough along the base
  ctx.fillStyle = '#121214';
  polygon(ctx, [P(-fs + 1, -fs, 0), P(-fs + 1, fs, 0), P(-fs + 1, fs, 9), P(-fs + 1, -fs, 9)]);
  ctx.fill();
  // Spotlights hitting the foliage (brighter patches)
  const spots = [-300, -120, 60, 240].map((y, k) => ({ y, z: 150 - (k % 2) * 30 }));
  const light = (y: number, z: number) => {
    let l = 0.55;
    for (const s of spots) {
      const d = Math.hypot((y - s.y) / 120, (z - s.z) / 90);
      l += Math.max(0, 0.75 - d * 0.6);
    }
    return Math.min(1.35, l);
  };
  const shadeColor = (hex: string, k: number) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * k));
    const g = Math.min(255, Math.round(((n >> 8) & 255) * k));
    const b = Math.min(255, Math.round((n & 255) * k));
    return `rgb(${r},${g},${b})`;
  };
  for (let n = 0; n < 2600; n++) {
    const y = -fs + hash(n * 1.13) * 2 * fs;
    const z = 9 + hash(n * 2.71) * (H - 14);
    // Reddish-leaf clusters in a few patches, like the photos
    const inRedPatch = Math.hypot((y + 40) / 70, (z - 120) / 40) < 1 || Math.hypot((y - 180) / 60, (z - 100) / 35) < 1;
    const base = inRedPatch && hash(n * 5.3) < 0.6
      ? LEAF_PALETTE[6 + (n % 2)]
      : LEAF_PALETTE[Math.floor(hash(n * 3.7) * 6)];
    const p = P(-fs + 1.5, y, z);
    ctx.fillStyle = shadeColor(base, light(y, z));
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 2.2 + hash(n * 4.1) * 2.6, 1.4 + hash(n * 6.3) * 1.4, hash(n * 8.9) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hanging ferns (bright yellow-green cascades) along the top
  for (let f = 0; f < 9; f++) {
    const y0 = -fs + 60 + f * ((2 * fs - 120) / 8) + (hash(f) - 0.5) * 40;
    for (let s = 0; s < 22; s++) {
      const yy = y0 + (hash(f * 31 + s) - 0.5) * 50;
      const top = P(-fs + 2, yy, H - 8 - hash(f + s) * 20);
      const len = 22 + hash(s * 3 + f) * 40;
      ctx.strokeStyle = hash(f * 7 + s) < 0.5 ? 'rgba(170, 205, 90, 0.9)' : 'rgba(130, 180, 70, 0.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.quadraticCurveTo(top.x + 3, top.y + len * 0.5, top.x - 2 + hash(s) * 4, top.y + len);
      ctx.stroke();
    }
  }
  // Corner seam between the two walls
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const c0 = P(-fs, -fs, 0);
  const c1 = P(-fs, -fs, H);
  ctx.moveTo(c0.x, c0.y);
  ctx.lineTo(c1.x, c1.y);
  ctx.stroke();

  return { canvas, minX, minY };
}

/** LED fiber "swirl" content (gold/green strands with bright tips), clipped to a wall panel. */
export function drawFiberSwirls(
  ctx: CanvasRenderingContext2D,
  map: (u: number, v: number) => { x: number; y: number },
  w: number,
  h: number,
  t: number,
  seed: number
) {
  ctx.fillStyle = '#07070a';
  polygon(ctx, [map(0, 0), map(w, 0), map(w, h), map(0, h)]);
  ctx.fill();
  ctx.save();
  polygon(ctx, [map(0, 0), map(w, 0), map(w, h), map(0, h)]);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const bundles = 3;
  for (let b = 0; b < bundles; b++) {
    const cx = w * (0.2 + 0.3 * b) + Math.sin(t * 0.4 + seed + b) * w * 0.05;
    const cy = h * (0.35 + 0.3 * hash(seed + b));
    for (let s = 0; s < 11; s++) {
      const rot = t * (0.5 + 0.1 * b) * (b % 2 ? -1 : 1) + s * 0.55 + seed;
      const rad = h * (0.18 + 0.04 * s);
      ctx.beginPath();
      let last = map(cx, cy);
      for (let k = 0; k <= 8; k++) {
        const a = rot + k * 0.22;
        const rr = rad * (0.4 + k * 0.08);
        const pt = map(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8);
        if (k === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
        last = pt;
      }
      const green = (s + b) % 4 === 0;
      ctx.strokeStyle = green ? 'rgba(74, 222, 128, 0.55)' : 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 248, 220, 0.95)';
      ctx.fillRect(last.x - 1.2, last.y - 1.2, 2.4, 2.4);
    }
  }
  ctx.restore();
}

/** LED screen panels on the right-back wall (world x ranges, z band). */
export const LED_WALL_PANELS: Array<{ x0: number; x1: number }> = [
  { x0: -330, x1: -200 },
  { x0: -40, x1: 80 },
  { x0: 100, x1: 220 },
  { x0: 245, x1: 365 },
];

export function drawHallWalls(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  floorSize: number,
  t: number
) {
  const key = String(floorSize);
  if (!wallLayerCache || wallLayerCache.key !== key) {
    const layer = buildWallLayer(floorSize);
    if (layer) wallLayerCache = { key, layer };
  }
  if (wallLayerCache) {
    const { canvas, minX, minY } = wallLayerCache.layer;
    ctx.drawImage(canvas, Math.round(originX + minX), Math.round(originY + minY));
  }

  // Live LED fiber screens on the slat wall
  const fs = floorSize;
  LED_WALL_PANELS.forEach((pnl, idx) => {
    const z0 = 92;
    const hgt = 74;
    const map = (u: number, v: number) => iso(originX, originY, pnl.x0 + u, -fs + 2, z0 + hgt - v);
    drawFiberSwirls(ctx, map, pnl.x1 - pnl.x0, hgt, t, idx * 1.7);
  });
}

// ---------------------------------------------------------------------------
// 3. CEILING — trusses with moving heads (drawn after actors)
// ---------------------------------------------------------------------------

export function drawHallCeiling(ctx: CanvasRenderingContext2D, originX: number, originY: number, t: number) {
  ctx.save();
  for (const tr of HALL_TRUSSES) {
    const hw = tr.w / 2;
    const hd = tr.d / 2;
    const corners = [
      iso(originX, originY, tr.cx - hw, tr.cy - hd, tr.z),
      iso(originX, originY, tr.cx + hw, tr.cy - hd, tr.z),
      iso(originX, originY, tr.cx + hw, tr.cy + hd, tr.z),
      iso(originX, originY, tr.cx - hw, tr.cy + hd, tr.z),
    ];
    // Double-rail black truss with a light gold glint (like the photos)
    ctx.strokeStyle = 'rgba(11, 11, 14, 0.7)';
    ctx.lineWidth = 2.5;
    polygon(ctx, corners);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(202, 166, 92, 0.45)';
    ctx.lineWidth = 1;
    polygon(ctx, corners);
    ctx.stroke();
    // Suspension wires up to the ceiling
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    for (const c of corners) {
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x, c.y - 40);
      ctx.stroke();
    }
  }
  // Moving-head fixtures (dark bodies with a lit lens that blinks with the beat)
  for (const h of getMovingHeads()) {
    const p = iso(originX, originY, h.x, h.y, h.z);
    ctx.fillStyle = '#111114';
    ctx.fillRect(p.x - 4, p.y - 2, 8, 7);
    const on = Math.sin(t * 2 + h.phase) > -0.6;
    ctx.fillStyle = on ? (h.warm ? '#fde68a' : '#c7d2fe') : '#334155';
    ctx.fillRect(p.x - 2, p.y + 4, 4, 2);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. LONG BANQUET TABLE + GHOST CHAIR
// ---------------------------------------------------------------------------

/** Clear acrylic "ghost" Chiavari chair (seat + ladder back). */
export function drawGhostChair(ctx: CanvasRenderingContext2D, sx: number, sy: number, facingViewer: boolean) {
  ctx.save();
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.75)';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.16)';
  ctx.lineWidth = 1;
  // Legs
  ctx.beginPath();
  ctx.moveTo(sx - 6, sy);
  ctx.lineTo(sx - 6, sy - 12);
  ctx.moveTo(sx + 6, sy);
  ctx.lineTo(sx + 6, sy - 12);
  ctx.stroke();
  // Seat cushion (cream) + clear frame
  ctx.fillStyle = 'rgba(245, 240, 225, 0.85)';
  ctx.fillRect(sx - 8, sy - 15, 16, 4);
  ctx.strokeRect(sx - 8, sy - 15, 16, 4);
  // Ladder back: behind the seat when facing the viewer, in front when facing away
  const backY = facingViewer ? sy - 15 : sy - 12;
  ctx.fillStyle = 'rgba(226, 232, 240, 0.14)';
  ctx.fillRect(sx - 7, backY - 18, 14, 18);
  ctx.strokeRect(sx - 7, backY - 18, 14, 18);
  ctx.beginPath();
  for (let k = 1; k < 4; k++) {
    ctx.moveTo(sx - 7, backY - k * 4.5);
    ctx.lineTo(sx + 7, backY - k * 4.5);
  }
  ctx.stroke();
  ctx.restore();
}

function drawFlowerBall(ctx: CanvasRenderingContext2D, sx: number, sy: number, r: number, seed: number) {
  // Gold stand
  ctx.strokeStyle = '#c8a24a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - 34);
  ctx.stroke();
  ctx.fillStyle = '#c8a24a';
  ctx.fillRect(sx - 4, sy - 1, 8, 2);
  // Greenery + white blooms
  const cy = sy - 34 - r * 0.7;
  for (let i = 0; i < 26; i++) {
    const a = hash(seed + i) * Math.PI * 2;
    const d = Math.sqrt(hash(seed + i * 3)) * r;
    const bx = sx + Math.cos(a) * d;
    const by = cy + Math.sin(a) * d * 0.85;
    ctx.fillStyle = i % 5 === 0 ? '#5b7a43' : hash(seed + i * 7) < 0.5 ? '#ffffff' : '#ece9df';
    ctx.beginPath();
    ctx.arc(bx, by, i % 5 === 0 ? 2 : 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCandelabra(ctx: CanvasRenderingContext2D, sx: number, sy: number, t: number, seed: number) {
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - 30);
  for (const dx of [-9, -5, 5, 9]) {
    ctx.moveTo(sx, sy - 18);
    ctx.quadraticCurveTo(sx + dx, sy - 18, sx + dx, sy - 28);
  }
  ctx.stroke();
  for (const dx of [-9, -5, 0, 5, 9]) {
    const fy = sy - (dx === 0 ? 33 : 31);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(sx + dx - 0.8, fy, 1.6, 3);
    const flick = 0.7 + 0.3 * Math.sin(t * 9 + dx + seed);
    ctx.fillStyle = `rgba(253, 224, 71, ${flick})`;
    ctx.beginPath();
    ctx.arc(sx + dx, fy - 1.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawLongBanquetTable(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  cx: number,
  cy: number,
  drawIsoBox: IsoBoxFn,
  opts: { tableNumber: number; t: number; accent?: string }
) {
  const { length: L, depth: D, height: Ht } = LONG_TABLE;
  const x0 = cx - L / 2;
  const y0 = cy - D / 2;

  // Soft shadow under the cloth
  const c = iso(originX, originY, cx, cy);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 3, L * 0.95, L * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // White floor-length tablecloth
  drawIsoBox(originX, originY, x0, y0, L, D, Ht, '#f7f6f2', '#e7e3da', '#d4cec2', 'rgba(120,110,95,0.6)');

  // Place settings along both long sides: plates, glasses, napkins
  for (let k = 0; k < 6; k++) {
    const px = x0 + 8 + k * ((L - 16) / 5);
    for (const side of [-1, 1]) {
      const py = cy + side * (D / 2 - 6);
      const p = iso(originX, originY, px, py, Ht + 0.5);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 4.2, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Wine glass
      const gp = iso(originX, originY, px + 4, py - side * 4, Ht);
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.9)';
      ctx.beginPath();
      ctx.moveTo(gp.x, gp.y);
      ctx.lineTo(gp.x, gp.y - 4);
      ctx.stroke();
      ctx.fillStyle = k % 2 ? 'rgba(190, 18, 60, 0.75)' : 'rgba(254, 249, 195, 0.65)';
      ctx.fillRect(gp.x - 1.4, gp.y - 7, 2.8, 3);
    }
  }
  // A couple of green water bottles down the middle
  for (const fx of [-0.18, 0.12]) {
    const b = iso(originX, originY, cx + fx * L, cy, Ht);
    ctx.fillStyle = '#166534';
    ctx.fillRect(b.x - 1.5, b.y - 9, 3, 9);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(b.x - 1, b.y - 11, 2, 2);
  }

  // Centerpieces: tall flower ball on a gold stand + crystal candelabra
  const f = iso(originX, originY, cx - L * 0.25, cy, Ht);
  drawFlowerBall(ctx, f.x, f.y, 12, opts.tableNumber * 13);
  const cd = iso(originX, originY, cx + L * 0.25, cy, Ht);
  drawCandelabra(ctx, cd.x, cd.y, opts.t, opts.tableNumber);

  // Gold table-number card on the near corner
  const n = iso(originX, originY, x0 + 6, cy + D / 2 - 4, Ht);
  ctx.fillStyle = '#3f2d14';
  ctx.fillRect(n.x - 5, n.y - 9, 10, 9);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 7px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(opts.tableNumber), n.x, n.y - 2);
}

// ---------------------------------------------------------------------------
// 5. ISLAND BAR (counter split into short pieces for correct depth sorting)
// ---------------------------------------------------------------------------

export interface BarPiece {
  wx: number;
  wy: number;
  w: number;
  d: number;
  /** Outer faces get the warm under-lip LED strip. */
  front: boolean;
}

/** Counter ring split into ~23-unit pieces so bartenders/guests sort correctly around it. */
export function getIslandBarPieces(): BarPiece[] {
  const { cx, cy, half, counter } = ISLAND_BAR;
  const pieces: BarPiece[] = [];
  const x0 = cx - half;
  const y0 = cy - half;
  const size = half * 2;
  const n = 4;
  const step = size / n;
  for (let k = 0; k < n; k++) {
    // North (back) and South (front) runs
    pieces.push({ wx: x0 + k * step, wy: y0, w: step, d: counter, front: false });
    pieces.push({ wx: x0 + k * step, wy: y0 + size - counter, w: step, d: counter, front: true });
  }
  for (let k = 0; k < n; k++) {
    const yy = y0 + counter + k * ((size - 2 * counter) / n);
    const len = (size - 2 * counter) / n;
    // West (back) and East (front) runs between the corners
    pieces.push({ wx: x0, wy: yy, w: counter, d: len, front: false });
    pieces.push({ wx: x0 + size - counter, wy: yy, w: counter, d: len, front: true });
  }
  return pieces;
}

export function drawIslandBarPiece(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  piece: BarPiece,
  drawIsoBox: IsoBoxFn,
  t: number
) {
  const H = ISLAND_BAR.height;
  drawIsoBox(originX, originY, piece.wx, piece.wy, piece.w, piece.d, H, '#2b2b31', '#0d0d10', '#121216', 'rgba(0, 0, 0, 0)');
  // Glossy black top edge highlight
  const a = iso(originX, originY, piece.wx, piece.wy + piece.d, H);
  const b = iso(originX, originY, piece.wx + piece.w, piece.wy + piece.d, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  if (piece.front) {
    // Warm LED strip under the counter lip
    const glow = 0.55 + 0.15 * Math.sin(t * 2 + piece.wx * 0.1);
    ctx.strokeStyle = `rgba(253, 230, 138, ${glow})`;
    ctx.lineWidth = 1.2;
    const l0 = iso(originX, originY, piece.wx, piece.wy + piece.d, H - 3);
    const l1 = iso(originX, originY, piece.wx + piece.w, piece.wy + piece.d, H - 3);
    const r0 = iso(originX, originY, piece.wx + piece.w, piece.wy, H - 3);
    ctx.beginPath();
    ctx.moveTo(l0.x, l0.y);
    ctx.lineTo(l1.x, l1.y);
    ctx.lineTo(r0.x, r0.y);
    ctx.stroke();
  }
  // A few glasses / bottles on the counter top
  if (hash(piece.wx * 1.7 + piece.wy * 0.3) < 0.3) {
    const g = iso(originX, originY, piece.wx + piece.w / 2, piece.wy + piece.d / 2, H);
    ctx.fillStyle = hash(piece.wx) < 0.5 ? 'rgba(254, 240, 138, 0.8)' : 'rgba(244, 114, 182, 0.75)';
    ctx.fillRect(g.x - 1.5, g.y - 5, 3, 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.strokeRect(g.x - 1.5, g.y - 5, 3, 4);
  }
}

const BOTTLE_COLORS = ['#b45309', '#d97706', '#15803d', '#e5e7eb', '#7f1d1d', '#1d4ed8', '#a16207', '#f8fafc', '#0e7490'];

/** Backlit bottle-shelf tower in the middle of the island. */
export function drawBarShelfTower(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  drawIsoBox: IsoBoxFn,
  t: number
) {
  const { cx, cy, towerHalf: h, towerHeight: Z } = ISLAND_BAR;
  // Warm floor wash inside the bar ring
  const fl = iso(originX, originY, cx, cy, 0);
  const wash = ctx.createRadialGradient(fl.x, fl.y, 4, fl.x, fl.y, 70);
  wash.addColorStop(0, 'rgba(255, 220, 160, 0.28)');
  wash.addColorStop(1, 'rgba(255, 220, 160, 0)');
  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.ellipse(fl.x, fl.y, 70, 35, 0, 0, Math.PI * 2);
  ctx.fill();
  // Inner back-light glow
  const c = iso(originX, originY, cx, cy, Z * 0.5);
  const glow = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 60);
  glow.addColorStop(0, 'rgba(255, 250, 235, 0.35)');
  glow.addColorStop(1, 'rgba(255, 250, 235, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 60, 0, Math.PI * 2);
  ctx.fill();

  drawIsoBox(originX, originY, cx - h, cy - h, 2 * h, 2 * h, Z, '#0f0f12', '#f4efe3', '#e9e2d2', '#050507');

  // Shelves + bottles on the two visible faces (+y face and +x face)
  const faces: Array<(u: number, z: number) => { x: number; y: number }> = [
    (u, z) => iso(originX, originY, cx - h + u, cy + h + 0.5, z),
    (u, z) => iso(originX, originY, cx + h + 0.5, cy + h - u, z),
  ];
  faces.forEach((map, fi) => {
    for (const shelfZ of [8, 30, 52]) {
      const s0 = map(0, shelfZ);
      const s1 = map(2 * h, shelfZ);
      ctx.strokeStyle = '#111114';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(s0.x, s0.y);
      ctx.lineTo(s1.x, s1.y);
      ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const u = 3 + k * ((2 * h - 6) / 5);
        const base = map(u, shelfZ);
        const col = BOTTLE_COLORS[Math.floor(hash(k * 3 + shelfZ + fi * 17) * BOTTLE_COLORS.length)];
        const tall = 11 + Math.floor(hash(k + shelfZ * 2 + fi) * 5);
        ctx.fillStyle = col;
        ctx.fillRect(base.x - 1.6, base.y - tall, 3.2, tall);
        ctx.fillRect(base.x - 0.8, base.y - tall - 3, 1.6, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(base.x - 1, base.y - tall + 1, 0.8, tall - 3);
      }
    }
    // Black frame verticals
    const v0b = map(0, 0);
    const v0t = map(0, Z);
    ctx.strokeStyle = '#0a0a0c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(v0b.x, v0b.y);
    ctx.lineTo(v0t.x, v0t.y);
    ctx.stroke();
  });
  // Subtle sparkle on glass
  const sp = iso(originX, originY, cx + h, cy + h, 40 + Math.sin(t * 3) * 10);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(sp.x - 0.5, sp.y - 0.5, 1.5, 1.5);
}

// ---------------------------------------------------------------------------
// 6. BARTENDERS
// ---------------------------------------------------------------------------

export interface BartenderLook {
  gender: 'f' | 'm';
  hair: string;
  skin: string;
  longHair: boolean;
}

export type BartenderAction = 'shake' | 'pour' | 'serve' | 'walk';

/**
 * Bartender in all-black: women in a black strapless top and black mini skirt,
 * men in a black shirt and trousers. Drawn at feet (sx, sy).
 */
export function drawBartender(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  look: BartenderLook,
  action: BartenderAction,
  t: number,
  seed: number
) {
  ctx.save();
  ctx.translate(sx, sy);
  const step = action === 'walk' ? Math.sin(t * 10 + seed) * 2 : 0;
  const bob = action === 'shake' ? Math.abs(Math.sin(t * 14 + seed)) * 1.5 : 0;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 1, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  if (look.gender === 'f') {
    ctx.fillStyle = look.skin;
    ctx.fillRect(-4.5, -17 + step, 3, 17 - step);
    ctx.fillRect(1.5, -17 - step, 3, 17 + step);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-5, -2, 4, 2);
    ctx.fillRect(1, -2, 4, 2);
    // Black mini skirt
    ctx.fillStyle = '#0b0b0d';
    ctx.beginPath();
    ctx.moveTo(-7, -27 - bob);
    ctx.lineTo(7, -27 - bob);
    ctx.lineTo(8, -16 - bob);
    ctx.lineTo(-8, -16 - bob);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = '#111114';
    ctx.fillRect(-5, -24 + step, 4.5, 24 - step);
    ctx.fillRect(0.5, -24 - step, 4.5, 24 + step);
    ctx.fillStyle = '#050505';
    ctx.fillRect(-5.5, -2, 5, 2);
    ctx.fillRect(0.5, -2, 5, 2);
  }

  // Torso
  const torsoTop = -44 - bob;
  if (look.gender === 'f') {
    // Bare shoulders + black strapless top
    ctx.fillStyle = look.skin;
    ctx.fillRect(-7, torsoTop, 14, 6);
    ctx.fillStyle = '#0b0b0d';
    ctx.beginPath();
    ctx.roundRect(-7, torsoTop + 5, 14, 13, [3, 3, 1, 1]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-6, torsoTop + 6, 12, 1);
  } else {
    ctx.fillStyle = '#121216';
    ctx.beginPath();
    ctx.roundRect(-8, torsoTop, 16, 21, [4, 4, 1, 1]);
    ctx.fill();
    ctx.fillStyle = '#26262b';
    ctx.fillRect(-1, torsoTop + 2, 2, 17);
  }

  // Arms + props
  ctx.strokeStyle = look.gender === 'f' ? look.skin : '#121216';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const shoulderY = torsoTop + 4;
  ctx.beginPath();
  if (action === 'shake') {
    const sh = Math.sin(t * 16 + seed) * 3;
    ctx.moveTo(-6, shoulderY);
    ctx.lineTo(-3, shoulderY - 10 + sh);
    ctx.moveTo(6, shoulderY);
    ctx.lineTo(3, shoulderY - 10 + sh);
    ctx.stroke();
    // Silver shaker
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(-2.5, shoulderY - 19 + sh, 5, 9);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(-2.5, shoulderY - 14 + sh, 5, 1);
  } else if (action === 'pour') {
    ctx.moveTo(-6, shoulderY);
    ctx.lineTo(-9, shoulderY + 10);
    ctx.moveTo(6, shoulderY);
    ctx.lineTo(13, shoulderY - 4);
    ctx.stroke();
    // Tilted bottle + pouring stream
    ctx.save();
    ctx.translate(14, shoulderY - 5);
    ctx.rotate(1.9);
    ctx.fillStyle = BOTTLE_COLORS[seed % BOTTLE_COLORS.length];
    ctx.fillRect(-2, -10, 4, 10);
    ctx.restore();
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, shoulderY - 2);
    ctx.lineTo(18, shoulderY + 10);
    ctx.stroke();
  } else if (action === 'serve') {
    ctx.moveTo(-6, shoulderY);
    ctx.lineTo(-9, shoulderY + 9);
    ctx.moveTo(6, shoulderY);
    ctx.lineTo(12, shoulderY + 6);
    ctx.stroke();
    ctx.fillStyle = 'rgba(244, 114, 182, 0.85)';
    ctx.fillRect(11, shoulderY + 1, 3, 4);
  } else {
    ctx.moveTo(-6, shoulderY);
    ctx.lineTo(-8, shoulderY + 11 + step);
    ctx.moveTo(6, shoulderY);
    ctx.lineTo(8, shoulderY + 11 - step);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // Neck + head
  ctx.fillStyle = look.skin;
  ctx.fillRect(-1.5, torsoTop - 3, 3, 4);
  const headY = torsoTop - 9;
  ctx.beginPath();
  ctx.arc(0, headY, 6.5, 0, Math.PI * 2);
  ctx.fill();
  // Hair
  ctx.fillStyle = look.hair;
  ctx.beginPath();
  ctx.arc(0, headY - 1.5, 7, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  if (look.longHair) {
    ctx.fillRect(-7, headY - 2, 3.5, 15);
    ctx.fillRect(3.5, headY - 2, 3.5, 15);
  }
  if (look.gender === 'm') {
    ctx.fillStyle = 'rgba(30, 20, 15, 0.55)';
    ctx.fillRect(-4, headY + 2, 8, 3); // short beard
  }
  // Face
  ctx.fillStyle = '#1c1410';
  ctx.fillRect(-3, headY, 1.6, 1.6);
  ctx.fillRect(1.4, headY, 1.6, 1.6);
  if (look.gender === 'f') {
    ctx.fillStyle = '#be123c';
    ctx.fillRect(-1.2, headY + 3, 2.4, 1);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 7. LOUNGE CORNER — uplit white-trunk tree, wooden deck, velvet sofas, rattan high tables
// ---------------------------------------------------------------------------

export function drawUplitTree(ctx: CanvasRenderingContext2D, originX: number, originY: number, x: number, y: number, t: number) {
  // Wooden deck square + uplights
  const deck = [
    iso(originX, originY, x - 20, y - 20),
    iso(originX, originY, x + 20, y - 20),
    iso(originX, originY, x + 20, y + 20),
    iso(originX, originY, x - 20, y + 20),
  ];
  ctx.fillStyle = '#5b3a22';
  polygon(ctx, deck);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  const base = iso(originX, originY, x, y);
  const up = ctx.createRadialGradient(base.x, base.y - 40, 4, base.x, base.y - 40, 70);
  up.addColorStop(0, 'rgba(255, 240, 210, 0.35)');
  up.addColorStop(1, 'rgba(255, 240, 210, 0)');
  ctx.fillStyle = up;
  ctx.beginPath();
  ctx.ellipse(base.x, base.y - 40, 30, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const dx of [-6, 6]) {
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(base.x + dx - 1, base.y - 1, 2, 2);
  }

  // Two pale trunks, brightly uplit at the bottom
  const trunk = ctx.createLinearGradient(base.x, base.y, base.x, base.y - 90);
  trunk.addColorStop(0, '#fffbeb');
  trunk.addColorStop(0.5, '#e7e5e4');
  trunk.addColorStop(1, '#a8a29e');
  ctx.strokeStyle = trunk;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(base.x - 2, base.y);
  ctx.quadraticCurveTo(base.x - 6, base.y - 50, base.x - 14, base.y - 92);
  ctx.moveTo(base.x + 2, base.y);
  ctx.quadraticCurveTo(base.x + 8, base.y - 50, base.x + 10, base.y - 100);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(base.x - 6, base.y - 55);
  ctx.lineTo(base.x - 24, base.y - 82);
  ctx.moveTo(base.x + 6, base.y - 60);
  ctx.lineTo(base.x + 24, base.y - 86);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Airy canopy of narrow leaves
  for (let i = 0; i < 160; i++) {
    const a = hash(i * 1.7 + x) * Math.PI * 2;
    const d = Math.sqrt(hash(i * 2.9 + y)) * 46;
    const lx = base.x + Math.cos(a) * d * 1.2;
    const ly = base.y - 108 + Math.sin(a) * d * 0.6 + Math.sin(t * 0.8 + i) * 0.6;
    const lit = ly > base.y - 112 ? 1 : 0.8;
    ctx.fillStyle = hash(i * 5.1) < 0.4 ? `rgba(${Math.round(90 * lit)}, ${Math.round(140 * lit)}, 70, 0.95)` : `rgba(${Math.round(60 * lit)}, ${Math.round(105 * lit)}, 55, 0.95)`;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 4, 1.4, hash(i * 9.3) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawVelvetLounge(ctx: CanvasRenderingContext2D, originX: number, originY: number, x: number, y: number) {
  // Cream rug
  ctx.fillStyle = '#e7dfcf';
  polygon(ctx, [
    iso(originX, originY, x - 34, y - 26),
    iso(originX, originY, x + 30, y - 26),
    iso(originX, originY, x + 30, y + 30),
    iso(originX, originY, x - 34, y + 30),
  ]);
  ctx.fill();
  // Curved charcoal velvet sofa (arc of padded segments)
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI * 0.95 + (k / 8) * Math.PI * 0.85;
    const sx = x + Math.cos(a) * 22;
    const sy = y + Math.sin(a) * 22;
    const p = iso(originX, originY, sx, sy);
    ctx.fillStyle = '#4b4646';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 7, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5f5a59';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 11, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Round wooden coffee table
  const tb = iso(originX, originY, x + 4, y + 6);
  ctx.fillStyle = '#7c4a26';
  ctx.beginPath();
  ctx.ellipse(tb.x, tb.y - 9, 9, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(tb.x - 3, tb.y - 9, 6, 9);
  // Plum and moss velvet armchairs
  for (const [ax, ay, col] of [
    [x + 24, y - 14, '#4c3a5c'],
    [x + 20, y + 22, '#4a5532'],
  ] as Array<[number, number, string]>) {
    const p = iso(originX, originY, ax, ay);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.roundRect(p.x - 8, p.y - 16, 16, 16, [6, 6, 2, 2]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(p.x - 6, p.y - 14, 12, 3);
  }
}

export function drawRattanHighTable(ctx: CanvasRenderingContext2D, originX: number, originY: number, x: number, y: number) {
  const p = iso(originX, originY, x, y);
  // Ribbed rattan pedestal + round top
  ctx.fillStyle = '#c8935a';
  ctx.beginPath();
  ctx.moveTo(p.x - 7, p.y);
  ctx.lineTo(p.x - 3, p.y - 30);
  ctx.lineTo(p.x + 3, p.y - 30);
  ctx.lineTo(p.x + 7, p.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 55, 25, 0.6)';
  ctx.lineWidth = 0.8;
  for (let k = -5; k <= 5; k += 2.5) {
    ctx.beginPath();
    ctx.moveTo(p.x + k, p.y);
    ctx.lineTo(p.x + k * 0.45, p.y - 30);
    ctx.stroke();
  }
  ctx.fillStyle = '#d6a46c';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y - 31, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tiny potted plant
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(p.x - 2, p.y - 37, 4, 4);
  ctx.fillStyle = '#4d7c3a';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 39, 3, 0, Math.PI * 2);
  ctx.fill();
  // Two rattan stools with cream cushions
  for (const dx of [-14, 14]) {
    const s = iso(originX, originY, x + dx * 0.7, y + Math.abs(dx) * 0.4);
    ctx.strokeStyle = '#b07a44';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(s.x - 5, s.y);
    ctx.lineTo(s.x - 4, s.y - 18);
    ctx.moveTo(s.x + 5, s.y);
    ctx.lineTo(s.x + 4, s.y - 18);
    ctx.stroke();
    ctx.fillStyle = '#f1ece1';
    ctx.fillRect(s.x - 6, s.y - 21, 12, 3);
    ctx.strokeRect(s.x - 6, s.y - 32, 12, 11);
  }
}

// ---------------------------------------------------------------------------
// 8. GUEST PROPS — drink in hand, cigarette with smoke
// ---------------------------------------------------------------------------

/** Cocktail / wine glass held at (hx, hy) in the guest's local coordinates. */
export function drawHeldDrink(ctx: CanvasRenderingContext2D, hx: number, hy: number, kind: number) {
  const fills = ['rgba(190, 18, 60, 0.85)', 'rgba(254, 240, 138, 0.85)', 'rgba(244, 114, 182, 0.85)', 'rgba(56, 189, 248, 0.8)'];
  ctx.fillStyle = fills[Math.abs(kind) % fills.length];
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hx - 2.6, hy - 6);
  ctx.lineTo(hx + 2.6, hy - 6);
  ctx.lineTo(hx, hy - 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx, hy - 1.5);
  ctx.lineTo(hx, hy + 2);
  ctx.stroke();
}

/** Cigarette at (hx, hy) with a glowing tip and rising smoke wisps. */
export function drawCigaretteSmoke(ctx: CanvasRenderingContext2D, hx: number, hy: number, t: number, seed: number) {
  ctx.strokeStyle = '#f5f5f4';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx + 4.5, hy - 1);
  ctx.stroke();
  const ember = 0.6 + 0.4 * Math.sin(t * 5 + seed);
  ctx.fillStyle = `rgba(249, 115, 22, ${ember})`;
  ctx.fillRect(hx + 4.2, hy - 1.8, 1.6, 1.6);
  for (let k = 0; k < 4; k++) {
    const life = ((t * 0.55 + k * 0.25 + seed * 0.13) % 1 + 1) % 1;
    const px = hx + 5 + Math.sin(life * 6 + seed + k) * 3 * life;
    const py = hy - 2 - life * 20;
    ctx.fillStyle = `rgba(214, 211, 209, ${0.38 * (1 - life)})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.5 + life * 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// 9. BARTENDER CREW (1 man : 3 women) — deterministic schedule from time
// ---------------------------------------------------------------------------

export const BARTENDER_LOOKS: BartenderLook[] = [
  { gender: 'f', hair: '#1c1410', skin: '#e8b48f', longHair: true },
  { gender: 'm', hair: '#2a1a12', skin: '#c98e68', longHair: false },
  { gender: 'f', hair: '#e3c07a', skin: '#f1c6a6', longHair: true },
  { gender: 'f', hair: '#9a3412', skin: '#eab896', longHair: true },
];

/**
 * Where bartender `index` is and what they're doing at time `t` (seconds).
 * Each bartender cycles through the inside stations: walks for 0.9s, then works
 * (shake / pour / serve) for the rest of the cycle. Stations are offset per bartender
 * so the crew spreads around the island.
 */
export function getBartenderPose(index: number, t: number): { x: number; y: number; action: BartenderAction } {
  const n = BARTENDER_STATIONS.length;
  const period = 4.2 + index * 0.7;
  const shifted = t + index * 1.3;
  const cycle = Math.floor(shifted / period);
  const local = shifted - cycle * period;
  const from = BARTENDER_STATIONS[(((cycle - 1) * 3 + index * 2) % n + n) % n];
  const to = BARTENDER_STATIONS[((cycle * 3 + index * 2) % n + n) % n];
  const walkSec = 0.9;
  if (local < walkSec) {
    const k = local / walkSec;
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, action: 'walk' };
  }
  const actions: BartenderAction[] = ['shake', 'pour', 'serve'];
  return { x: to.x, y: to.y, action: actions[Math.floor(hash(cycle * 7.3 + index * 3.1) * 3)] };
}
