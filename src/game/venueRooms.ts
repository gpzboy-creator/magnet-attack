/**
 * Back rooms off the lobby, laid out like a real event venue: the couple's bridal suite
 * (חדר כלה / חדר מנוחה — the bride & groom wait here before the chuppah and before the dancing)
 * and the guest restrooms. Both open from the lobby's south side; the kitchen stays at the back
 * of house (service yard, venueOutside.ts).
 *
 * Rooms and walls are code-drawn (like the lobby); the furniture is PixelLab art (docs/ASSETS.md,
 * tools/make_room_props.py). Walls are low "cut-away" walls so the people inside stay visible.
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
const WALL_Y = 375;

export const RESTROOMS: Rect = { minX: 448, maxX: 556, minY: 380, maxY: 500 };
export const BRIDAL_SUITE: Rect = { minX: 566, maxX: 658, minY: 380, maxY: 534 };

/** Doorways from the lobby (clear of the lobby's sofa and plants). */
export const RESTROOM_DOOR: Rect = { minX: 500, maxX: 524, minY: LOBBY_FRONT_Y - 6, maxY: RESTROOMS.minY + 6 };
export const SUITE_DOOR: Rect = { minX: 607, maxX: 631, minY: LOBBY_FRONT_Y - 6, maxY: BRIDAL_SUITE.minY + 6 };

export const ROOMS_WALKABLE: Rect[] = [RESTROOMS, BRIDAL_SUITE, RESTROOM_DOOR, SUITE_DOOR];

// Furniture: PixelLab sprites placed by their floor footprint (left ground corner = minX, maxY).
// Measured by tools/make_room_props.py; `s` sets the footprint: lx·s × ly·s world units.
const ROOM_SPRITES = {
  vanity: { file: 'assets/aistudio/room-vanity.png', ax: 0, ay: 223, lx: 50, ly: 124, h: 249, s: 0.355 },
  sofa: { file: 'assets/aistudio/room-sofa.png', ax: 0, ay: 178, lx: 92, ly: 154, h: 225, s: 0.31 },
  flowers: { file: 'assets/aistudio/room-flowers.png', ax: 29, ay: 235, lx: 40, ly: 46, h: 256, s: 0.3 },
  sinks: { file: 'assets/aistudio/room-sinks-mirror.png', ax: 1, ay: 179, lx: 178, ly: 54, h: 269, s: 0.26 },
  stall: { file: 'assets/aistudio/room-stall.png', ax: 0, ay: 195, lx: 124, ly: 126, h: 258, s: 0.32 },
} satisfies Record<string, PropSprite>;
type RoomProp = keyof typeof ROOM_SPRITES;

interface Placed {
  prop: RoomProp;
  minX: number;
  maxY: number;
}

/** Bridal suite: vanity and sofa against the west wall facing the room, flowers by the door. Restrooms:
 *  sinks on the north wall, two stalls on the west wall with their doors facing the room. */
const PLACED: Placed[] = [
  { prop: 'vanity', minX: 568, maxY: 438 },
  { prop: 'sofa', minX: 568, maxY: 520 },
  { prop: 'flowers', minX: 640, maxY: 402 },
  { prop: 'sinks', minX: 452, maxY: 396 },
  { prop: 'stall', minX: 450, maxY: 452 },
  { prop: 'stall', minX: 450, maxY: 496 },
];

const footprint = (pl: Placed): Rect => {
  const sp = ROOM_SPRITES[pl.prop];
  return { minX: pl.minX, maxX: pl.minX + sp.lx * sp.s, minY: pl.maxY - sp.ly * sp.s, maxY: pl.maxY };
};

export const ROOM_OBSTACLES: Array<{ kind: 'box'; minX: number; minY: number; maxX: number; maxY: number }> = PLACED.map((pl) => ({
  kind: 'box' as const,
  ...footprint(pl),
}));

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

/** Where the bride and groom wait in the suite (by the sofa, facing the room). */
export const SUITE_SPOTS = {
  bride: { x: 616, y: 492 },
  groom: { x: 618, y: 468 },
};

/** Walking route from the suite into the hall for the grand entrance (suite → lobby → hall door → dance floor). */
export const SUITE_TO_HALL: Array<{ x: number; y: number }> = [
  { x: (SUITE_DOOR.minX + SUITE_DOOR.maxX) / 2, y: BRIDAL_SUITE.minY + 14 },
  { x: (SUITE_DOOR.minX + SUITE_DOOR.maxX) / 2, y: LOBBY_FRONT_Y - 20 },
  { x: 560, y: 236 },
  { x: 445, y: 236 },
  { x: 300, y: 200 },
  { x: 0, y: 2 },
];

/** A guest's visit to the restrooms from the yard: garden gate → lobby → restroom (and back the same way). */
export const YARD_TO_RESTROOM: Array<{ x: number; y: number }> = [
  { x: 720, y: 240 },
  { x: 675, y: 240 },
  { x: 560, y: 300 },
  { x: (RESTROOM_DOOR.minX + RESTROOM_DOOR.maxX) / 2, y: LOBBY_FRONT_Y - 12 },
  { x: (RESTROOM_DOOR.minX + RESTROOM_DOOR.maxX) / 2, y: RESTROOMS.minY + 22 },
  { x: 512, y: 424 },
];

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

const WALL_H = 30;
const WALL = { top: '#e7ded3', faceY: '#bfb2a3', faceX: '#a89a8a' };

/** Floors (ground layer, under everything). */
export function drawRoomsGround(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  // restrooms: light tiles
  floor(ctx, ox, oy, RESTROOMS, '#d8e2e6');
  for (let x = RESTROOMS.minX; x < RESTROOMS.maxX; x += 14) {
    for (let y = RESTROOMS.minY; y < RESTROOMS.maxY; y += 14) {
      if (((x + y) / 14) % 2 < 1) continue;
      floor(ctx, ox, oy, { minX: x, maxX: Math.min(RESTROOMS.maxX, x + 14), minY: y, maxY: Math.min(RESTROOMS.maxY, y + 14) }, '#c8d4d9');
    }
  }
  // bridal suite: blush carpet with a gold-edged rug
  floor(ctx, ox, oy, BRIDAL_SUITE, '#e9cfd2');
  floor(ctx, ox, oy, { minX: 590, maxX: 632, minY: 440, maxY: 512 }, '#f6e3e5');
  ctx.strokeStyle = '#c9a54a';
  ctx.lineWidth = 1.2;
  const a = p(ox, oy, 592, 442), b = p(ox, oy, 630, 442), c = p(ox, oy, 630, 510), d = p(ox, oy, 592, 510);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.stroke();
  // door thresholds
  for (const dr of [RESTROOM_DOOR, SUITE_DOOR]) floor(ctx, ox, oy, dr, '#b9a58a');
}

export interface RoomDrawable {
  sortY: number;
  draw: () => void;
}

/** Walls, doors, signs and furniture, depth-sorted with the people. */
export function getRoomDrawables(ctx: CanvasRenderingContext2D, ox: number, oy: number, t: number): RoomDrawable[] {
  const at = (x: number, y: number) => worldToIso(x, y).y;
  const list: RoomDrawable[] = [];
  const wall = (r: Rect) => list.push({ sortY: at(r.maxX, r.maxY), draw: () => box(ctx, ox, oy, r, WALL_H, WALL.top, WALL.faceY, WALL.faceX) });

  // wall along the lobby, with the two doorways left open
  const y0 = WALL_Y - 2;
  const y1 = WALL_Y + 2;
  wall({ minX: RESTROOMS.minX - 3, maxX: RESTROOM_DOOR.minX, minY: y0, maxY: y1 });
  wall({ minX: RESTROOM_DOOR.maxX, maxX: SUITE_DOOR.minX, minY: y0, maxY: y1 });
  wall({ minX: SUITE_DOOR.maxX, maxX: BRIDAL_SUITE.maxX + 3, minY: y0, maxY: y1 });
  // outer + dividing walls
  wall({ minX: RESTROOMS.minX - 3, maxX: RESTROOMS.minX, minY: y0, maxY: RESTROOMS.maxY + 3 });
  wall({ minX: RESTROOMS.minX - 3, maxX: RESTROOMS.maxX + 3, minY: RESTROOMS.maxY, maxY: RESTROOMS.maxY + 3 });
  wall({ minX: RESTROOMS.maxX, maxX: BRIDAL_SUITE.minX, minY: y0, maxY: RESTROOMS.maxY + 3 });
  wall({ minX: BRIDAL_SUITE.minX - 3, maxX: BRIDAL_SUITE.minX, minY: RESTROOMS.maxY, maxY: BRIDAL_SUITE.maxY + 3 });
  wall({ minX: BRIDAL_SUITE.minX - 3, maxX: BRIDAL_SUITE.maxX + 3, minY: BRIDAL_SUITE.maxY, maxY: BRIDAL_SUITE.maxY + 3 });
  wall({ minX: BRIDAL_SUITE.maxX, maxX: BRIDAL_SUITE.maxX + 3, minY: y0, maxY: BRIDAL_SUITE.maxY + 3 });

  // door frames + signs (drawn on the lobby side)
  const doorSign = (dr: Rect, text: string, color: string) =>
    list.push({
      sortY: at(dr.maxX, WALL_Y + 3),
      draw: () => {
        const postH = 64;
        for (const x of [dr.minX, dr.maxX]) box(ctx, ox, oy, { minX: x - 2, maxX: x + 1, minY: y0 - 1, maxY: y1 + 1 }, postH, '#c9a54a', '#8a6d2f', '#a3823b');
        box(ctx, ox, oy, { minX: dr.minX - 2, maxX: dr.maxX + 1, minY: y0 - 1, maxY: y1 + 1 }, postH + 6, '#c9a54a', '#8a6d2f', '#a3823b', postH);
        const s = p(ox, oy, (dr.minX + dr.maxX) / 2, y1, postH + 16);
        label(ctx, s.x, s.y, text, color, 10);
      },
    });
  doorSign(RESTROOM_DOOR, '🚻 שירותים', '#e0f2fe');
  doorSign(SUITE_DOOR, '💍 חדר חתן וכלה', '#fbcfe8');

  // furniture sprites (PixelLab)
  for (const pl of PLACED) {
    const fp = footprint(pl);
    list.push({
      sortY: at((fp.minX + fp.maxX) / 2, (fp.minY + fp.maxY) / 2),
      draw: () => {
        const img = roomImg(pl.prop);
        if (img) drawPropSprite(ctx, img, ROOM_SPRITES[pl.prop], ox, oy, pl.minX, pl.maxY);
      },
    });
  }
  void t;
  return list;
}
