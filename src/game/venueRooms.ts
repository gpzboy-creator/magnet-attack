/**
 * Back rooms off the lobby, laid out like a real event venue (south of the lobby):
 *
 *   lobby ─┬─ restroom corridor ──┬─ ♿ accessible restroom (west side of the corridor)
 *          │                      └─ foyer ─┬─ ♀ women's room (5 stalls, island sinks, hand dryer, plant)
 *          │                                └─ ♂ men's room   (5 stalls, island sinks, hand dryer, plant)
 *          └─ 💍 bridal suite (couple's rest room: vanity, sofa, flowers) — the bride & groom wait here
 *             before the chuppah and before the dancing.
 * The kitchen stays at the back of house (service yard, venueOutside.ts).
 *
 * Rooms, walls and door frames are code-drawn (like the lobby); furniture is PixelLab art
 * (docs/ASSETS.md, tools/make_room_props.py). Walls are low "cut-away" walls so people inside stay visible.
 */

import { worldToIso } from './rules.ts';
import { drawPropSprite, type PropSprite } from './venueProps.ts';

interface Rect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** The lobby's south edge (LOBBY.maxY in venueOutside.ts). */
const LOBBY_FRONT_Y = 370;

type RoomKind = 'suite' | 'tiles' | 'corridor';
interface Room {
  id: string;
  r: Rect;
  kind: RoomKind;
}

export const BRIDAL_SUITE: Rect = { minX: 558, maxX: 686, minY: 380, maxY: 620 };
const CORRIDOR: Rect = { minX: 496, maxX: 548, minY: 380, maxY: 650 };
const ACCESSIBLE: Rect = { minX: 448, maxX: 488, minY: 420, maxY: 500 };
const FOYER: Rect = { minX: 448, maxX: 686, minY: 660, maxY: 700 };
const WOMEN: Rect = { minX: 448, maxX: 562, minY: 710, maxY: 924 };
const MEN: Rect = { minX: 572, maxX: 686, minY: 710, maxY: 924 };

const ROOMS: Room[] = [
  { id: 'suite', r: BRIDAL_SUITE, kind: 'suite' },
  { id: 'corridor', r: CORRIDOR, kind: 'corridor' },
  { id: 'accessible', r: ACCESSIBLE, kind: 'tiles' },
  { id: 'foyer', r: FOYER, kind: 'corridor' },
  { id: 'women', r: WOMEN, kind: 'tiles' },
  { id: 'men', r: MEN, kind: 'tiles' },
];

interface Door {
  r: Rect;
  /** 'h' = in a wall along x (north/south), 'v' = in a wall along y (east/west). */
  axis: 'h' | 'v';
  sign?: { text: string; color: string };
}

const DOORS: Door[] = [
  { r: { minX: 500, maxX: 524, minY: LOBBY_FRONT_Y - 6, maxY: CORRIDOR.minY + 6 }, axis: 'h', sign: { text: '🚻 שירותים', color: '#e0f2fe' } },
  { r: { minX: 607, maxX: 631, minY: LOBBY_FRONT_Y - 6, maxY: BRIDAL_SUITE.minY + 6 }, axis: 'h', sign: { text: '💍 חדר חתן וכלה', color: '#fbcfe8' } },
  { r: { minX: ACCESSIBLE.maxX - 6, maxX: CORRIDOR.minX + 6, minY: 446, maxY: 470 }, axis: 'v', sign: { text: '♿ נגישים', color: '#bfdbfe' } },
  { r: { minX: 508, maxX: 536, minY: CORRIDOR.maxY - 6, maxY: FOYER.minY + 6 }, axis: 'h' },
  { r: { minX: 492, maxX: 516, minY: FOYER.maxY - 6, maxY: WOMEN.minY + 6 }, axis: 'h', sign: { text: '♀ נשים', color: '#fbcfe8' } },
  { r: { minX: 616, maxX: 640, minY: FOYER.maxY - 6, maxY: MEN.minY + 6 }, axis: 'h', sign: { text: '♂ גברים', color: '#bfdbfe' } },
];

export const ROOMS_WALKABLE: Rect[] = [...ROOMS.map((rm) => rm.r), ...DOORS.map((d) => d.r)];

// Furniture: PixelLab sprites placed by their floor footprint (left ground corner = minX, maxY).
// Measured by tools/make_room_props.py; `s` sets the footprint: lx·s × ly·s world units.
const ROOM_SPRITES = {
  vanity: { file: 'assets/aistudio/room-vanity.png', ax: 0, ay: 223, lx: 50, ly: 124, h: 249, s: 0.355 },
  sofa: { file: 'assets/aistudio/room-sofa.png', ax: 0, ay: 178, lx: 92, ly: 154, h: 225, s: 0.31 },
  flowers: { file: 'assets/aistudio/room-flowers.png', ax: 29, ay: 235, lx: 40, ly: 46, h: 256, s: 0.3 },
  stall: { file: 'assets/aistudio/room-stall.png', ax: 0, ay: 195, lx: 124, ly: 126, h: 258, s: 0.32 },
  accessible: { file: 'assets/aistudio/room-accessible.png', ax: 0, ay: 123, lx: 112, ly: 112, h: 180, s: 0.34 },
  island: { file: 'assets/aistudio/room-island.png', ax: 4, ay: 165, lx: 118, ly: 123, h: 225, s: 0.25 },
  dryer: { file: 'assets/aistudio/room-dryer.png', ax: 0, ay: 205, lx: 122, ly: 80, h: 267, s: 0.085 },
  plant: { file: 'assets/aistudio/room-plant.png', ax: 3, ay: 215, lx: 92, ly: 92, h: 262, s: 0.16 },
} satisfies Record<string, PropSprite>;
type RoomProp = keyof typeof ROOM_SPRITES;

interface Placed {
  prop: RoomProp;
  minX: number;
  maxY: number;
  /** Height above the floor (wall-mounted pieces). */
  z?: number;
  /** Wall-mounted: no collision box. */
  onWall?: boolean;
}

/** Five stalls in a row along a room's west wall, doors facing the room. */
const stallRow = (minX: number): Placed[] => [756, 796, 836, 876, 916].map((maxY) => ({ prop: 'stall' as const, minX, maxY }));

const PLACED: Placed[] = [
  // bridal suite: vanity and sofa on the west wall (kept off it: the sprites' backs lean toward the wall)
  { prop: 'vanity', minX: 570, maxY: 470 },
  { prop: 'sofa', minX: 570, maxY: 596 },
  { prop: 'flowers', minX: 664, maxY: 412 },
  // corridor decor
  { prop: 'flowers', minX: 530, maxY: 440 },
  { prop: 'plant', minX: 528, maxY: 636 },
  // accessible restroom: a corner unit with its own grab bars and basin
  { prop: 'accessible', minX: 450, maxY: 462 },
  // women's room
  ...stallRow(452),
  { prop: 'island', minX: 512, maxY: 836 },
  { prop: 'dryer', minX: 534, maxY: 716, z: 34, onWall: true },
  { prop: 'plant', minX: 542, maxY: 918 },
  // men's room
  ...stallRow(576),
  { prop: 'island', minX: 636, maxY: 836 },
  { prop: 'dryer', minX: 660, maxY: 716, z: 34, onWall: true },
  { prop: 'plant', minX: 666, maxY: 918 },
  // foyer decor
  { prop: 'plant', minX: 668, maxY: 694 },
];

const footprint = (pl: Placed): Rect => {
  const sp = ROOM_SPRITES[pl.prop];
  return { minX: pl.minX, maxX: pl.minX + sp.lx * sp.s, minY: pl.maxY - sp.ly * sp.s, maxY: pl.maxY };
};

export const ROOM_OBSTACLES: Array<{ kind: 'box'; minX: number; minY: number; maxX: number; maxY: number }> = PLACED.filter(
  (pl) => !pl.onWall
).map((pl) => ({ kind: 'box' as const, ...footprint(pl) }));

/** Where the bride and groom wait in the suite (in front of the sofa). */
export const SUITE_SPOTS = {
  bride: { x: 628, y: 586 },
  groom: { x: 632, y: 562 },
};

/** Walking route from the suite into the hall for the grand entrance (suite → lobby → hall door → dance floor). */
export const SUITE_TO_HALL: Array<{ x: number; y: number }> = [
  { x: 619, y: BRIDAL_SUITE.minY + 14 },
  { x: 619, y: LOBBY_FRONT_Y - 20 },
  { x: 560, y: 236 },
  { x: 445, y: 236 },
  { x: 300, y: 200 },
  { x: 0, y: 2 },
];

/** A guest's visit to the restrooms from the yard: garden gate → lobby → corridor (and back the same way). */
export const YARD_TO_RESTROOM: Array<{ x: number; y: number }> = [
  { x: 720, y: 240 },
  { x: 675, y: 240 },
  { x: 560, y: 300 },
  { x: 512, y: LOBBY_FRONT_Y - 12 },
  { x: 512, y: CORRIDOR.minY + 22 },
  { x: 516, y: 560 },
];

const roomImgs = new Map<RoomProp, HTMLImageElement>();
function roomImg(prop: RoomProp): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let img = roomImgs.get(prop);
  if (!img) {
    img = new Image();
    img.src = `${import.meta.env?.BASE_URL ?? '/'}${ROOM_SPRITES[prop].file}`;
    roomImgs.set(prop, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function p(ox: number, oy: number, x: number, y: number, z = 0) {
  const i = worldToIso(x, y, z);
  return { x: ox + i.x, y: oy + i.y };
}

function poly(ctx: CanvasRenderingContext2D, ox: number, oy: number, pts: Array<[number, number, number]>, fill: string) {
  ctx.beginPath();
  pts.forEach(([x, y, z], i) => {
    const q = p(ox, oy, x, y, z);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function floor(ctx: CanvasRenderingContext2D, ox: number, oy: number, r: Rect, fill: string) {
  poly(ctx, ox, oy, [[r.minX, r.minY, 0], [r.maxX, r.minY, 0], [r.maxX, r.maxY, 0], [r.minX, r.maxY, 0]], fill);
}

function box(ctx: CanvasRenderingContext2D, ox: number, oy: number, r: Rect, h: number, top: string, faceY: string, faceX: string, z0 = 0) {
  poly(ctx, ox, oy, [[r.minX, r.maxY, z0], [r.maxX, r.maxY, z0], [r.maxX, r.maxY, h], [r.minX, r.maxY, h]], faceY);
  poly(ctx, ox, oy, [[r.maxX, r.minY, z0], [r.maxX, r.maxY, z0], [r.maxX, r.maxY, h], [r.maxX, r.minY, h]], faceX);
  poly(ctx, ox, oy, [[r.minX, r.minY, h], [r.maxX, r.minY, h], [r.maxX, r.maxY, h], [r.minX, r.maxY, h]], top);
}

function label(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, size = 10) {
  ctx.save();
  ctx.font = `bold ${size}px "Heebo", sans-serif`;
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * No walls (Shahar, 19.11): each room is marked by a low gold-edged border on the floor instead,
 * so the photographer and the couple inside are never hidden. Door frames and signs stay.
 */
const WALL_H = 3;
const WALL_T = 3;
const WALL = { top: '#c9a54a', faceY: '#8a6d2f', faceX: '#a3823b' };
const GOLD = { top: '#c9a54a', faceY: '#8a6d2f', faceX: '#a3823b' };

/** Floors (ground layer, under everything). */
export function drawRoomsGround(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  for (const rm of ROOMS) {
    const r = rm.r;
    if (rm.kind === 'suite') {
      floor(ctx, ox, oy, r, '#e9cfd2');
      // gold-edged rug in front of the sofa
      floor(ctx, ox, oy, { minX: 610, maxX: 664, minY: 520, maxY: 608 }, '#f6e3e5');
      ctx.strokeStyle = '#c9a54a';
      ctx.lineWidth = 1.2;
      const q = [p(ox, oy, 612, 522), p(ox, oy, 662, 522), p(ox, oy, 662, 606), p(ox, oy, 612, 606)];
      ctx.beginPath();
      q.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.closePath();
      ctx.stroke();
    } else if (rm.kind === 'tiles') {
      floor(ctx, ox, oy, r, '#d8e2e6');
      for (let x = r.minX; x < r.maxX; x += 14) {
        for (let y = r.minY; y < r.maxY; y += 14) {
          if (Math.floor((x - r.minX + y - r.minY) / 14) % 2 === 0) continue;
          floor(ctx, ox, oy, { minX: x, maxX: Math.min(r.maxX, x + 14), minY: y, maxY: Math.min(r.maxY, y + 14) }, '#c8d4d9');
        }
      }
    } else {
      // corridor / foyer: warm stone with a runner
      floor(ctx, ox, oy, r, '#cfc3b2');
      const runner = r.maxX - r.minX < r.maxY - r.minY
        ? { minX: r.minX + 12, maxX: r.maxX - 12, minY: r.minY + 4, maxY: r.maxY - 4 }
        : { minX: r.minX + 4, maxX: r.maxX - 4, minY: r.minY + 12, maxY: r.maxY - 12 };
      floor(ctx, ox, oy, runner, '#6b1d2b');
    }
  }
  for (const d of DOORS) floor(ctx, ox, oy, d.r, '#b9a58a');
  // the rooms' borders (instead of walls): a low gold curb on the floor
  for (const s of WALL_SEGMENTS) box(ctx, ox, oy, s, WALL_H, WALL.top, WALL.faceY, WALL.faceX);
}

/** Wall segments around every room, with gaps where the doors are. */
function wallSegments(): Rect[] {
  const segs: Rect[] = [];
  const along = (from: number, to: number, gaps: Array<[number, number]>, make: (a: number, b: number) => Rect) => {
    let cur = from;
    for (const [g0, g1] of [...gaps].sort((a, b) => a[0] - b[0])) {
      if (g1 <= from || g0 >= to) continue;
      if (g0 > cur) segs.push(make(cur, g0));
      cur = Math.max(cur, g1);
    }
    if (cur < to) segs.push(make(cur, to));
  };
  for (const { r } of ROOMS) {
    const hGaps = (y: number) =>
      DOORS.filter((d) => d.axis === 'h' && d.r.minY <= y + 1 && d.r.maxY >= y - 1).map((d) => [d.r.minX, d.r.maxX] as [number, number]);
    const vGaps = (x: number) =>
      DOORS.filter((d) => d.axis === 'v' && d.r.minX <= x + 1 && d.r.maxX >= x - 1).map((d) => [d.r.minY, d.r.maxY] as [number, number]);
    along(r.minX - WALL_T, r.maxX + WALL_T, hGaps(r.minY), (a, b) => ({ minX: a, maxX: b, minY: r.minY - WALL_T, maxY: r.minY }));
    along(r.minX - WALL_T, r.maxX + WALL_T, hGaps(r.maxY), (a, b) => ({ minX: a, maxX: b, minY: r.maxY, maxY: r.maxY + WALL_T }));
    along(r.minY, r.maxY, vGaps(r.minX), (a, b) => ({ minX: r.minX - WALL_T, maxX: r.minX, minY: a, maxY: b }));
    along(r.minY, r.maxY, vGaps(r.maxX), (a, b) => ({ minX: r.maxX, maxX: r.maxX + WALL_T, minY: a, maxY: b }));
  }
  return segs;
}
const WALL_SEGMENTS = wallSegments();

export interface RoomDrawable {
  sortY: number;
  draw: () => void;
}

/** Walls, door frames + signs and furniture, depth-sorted with the people. */
export function getRoomDrawables(ctx: CanvasRenderingContext2D, ox: number, oy: number, t: number): RoomDrawable[] {
  const at = (x: number, y: number) => worldToIso(x, y).y;
  const list: RoomDrawable[] = [];

  // gold door frames with signs
  for (const d of DOORS) {
    if (!d.sign) continue;
    const sign = d.sign;
    const r = d.r;
    list.push({
      sortY: at(r.maxX, r.maxY),
      draw: () => {
        const postH = 64;
        if (d.axis === 'h') {
          const y = (r.minY + r.maxY) / 2;
          for (const x of [r.minX, r.maxX]) box(ctx, ox, oy, { minX: x - 2, maxX: x + 1, minY: y - 2, maxY: y + 2 }, postH, GOLD.top, GOLD.faceY, GOLD.faceX);
          box(ctx, ox, oy, { minX: r.minX - 2, maxX: r.maxX + 1, minY: y - 2, maxY: y + 2 }, postH + 6, GOLD.top, GOLD.faceY, GOLD.faceX, postH);
          const s = p(ox, oy, (r.minX + r.maxX) / 2, y + 2, postH + 16);
          label(ctx, s.x, s.y, sign.text, sign.color, 10);
        } else {
          const x = (r.minX + r.maxX) / 2;
          for (const y of [r.minY, r.maxY]) box(ctx, ox, oy, { minX: x - 2, maxX: x + 2, minY: y - 2, maxY: y + 1 }, postH, GOLD.top, GOLD.faceY, GOLD.faceX);
          box(ctx, ox, oy, { minX: x - 2, maxX: x + 2, minY: r.minY - 2, maxY: r.maxY + 1 }, postH + 6, GOLD.top, GOLD.faceY, GOLD.faceX, postH);
          const s = p(ox, oy, x + 2, (r.minY + r.maxY) / 2, postH + 16);
          label(ctx, s.x, s.y, sign.text, sign.color, 10);
        }
      },
    });
  }

  // furniture sprites (PixelLab)
  for (const pl of PLACED) {
    const fp = footprint(pl);
    list.push({
      sortY: at((fp.minX + fp.maxX) / 2, (fp.minY + fp.maxY) / 2) + (pl.onWall ? -2 : 0),
      draw: () => {
        const img = roomImg(pl.prop);
        if (img) drawPropSprite(ctx, img, ROOM_SPRITES[pl.prop], ox, oy, pl.minX, pl.maxY, pl.z ?? 0);
      },
    });
  }
  void t;
  return list;
}
