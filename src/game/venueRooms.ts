/**
 * Back rooms off the lobby, laid out like a real event venue: the couple's bridal suite
 * (חדר כלה / חדר מנוחה — the bride & groom wait here before the chuppah and before the dancing)
 * and the guest restrooms. Both open from the lobby's south side; the kitchen stays at the back
 * of house (service yard, venueOutside.ts).
 *
 * Geometry + drawing (code-drawn, like the lobby). Walls are low "cut-away" walls so the people
 * inside stay visible.
 */

import { worldToIso } from './rules.ts';

interface Rect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** The lobby's south edge (LOBBY.maxY in venueOutside.ts). */
const LOBBY_FRONT_Y = 370;
const WALL_Y = 375;

export const RESTROOMS: Rect = { minX: 472, maxX: 556, minY: 380, maxY: 472 };
export const BRIDAL_SUITE: Rect = { minX: 566, maxX: 658, minY: 380, maxY: 534 };

/** Doorways from the lobby (clear of the lobby's sofa and plants). */
export const RESTROOM_DOOR: Rect = { minX: 500, maxX: 524, minY: LOBBY_FRONT_Y - 6, maxY: RESTROOMS.minY + 6 };
export const SUITE_DOOR: Rect = { minX: 607, maxX: 631, minY: LOBBY_FRONT_Y - 6, maxY: BRIDAL_SUITE.minY + 6 };

export const ROOMS_WALKABLE: Rect[] = [RESTROOMS, BRIDAL_SUITE, RESTROOM_DOOR, SUITE_DOOR];

// Furniture (also collision boxes)
const VANITY: Rect = { minX: 568, maxX: 582, minY: 398, maxY: 444 };
const SUITE_SOFA: Rect = { minX: 638, maxX: 656, minY: 440, maxY: 506 };
const SINKS: Rect = { minX: 474, maxX: 488, minY: 392, maxY: 440 };
const STALLS: Rect[] = [
  { minX: 500, maxX: 526, minY: 448, maxY: 470 },
  { minX: 528, maxX: 554, minY: 448, maxY: 470 },
];
const FLOWERS = { x: 586, y: 520 };

export const ROOM_OBSTACLES: Array<{ kind: 'box'; minX: number; minY: number; maxX: number; maxY: number }> = [
  VANITY,
  SUITE_SOFA,
  SINKS,
  ...STALLS,
  { minX: FLOWERS.x - 7, maxX: FLOWERS.x + 7, minY: FLOWERS.y - 7, maxY: FLOWERS.y + 7 },
].map((r) => ({ kind: 'box' as const, ...r }));

/** Where the bride and groom wait in the suite (by the sofa, facing the room). */
export const SUITE_SPOTS = {
  bride: { x: 622, y: 482 },
  groom: { x: 624, y: 458 },
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

  // restrooms: sink counter with a mirror, two stalls
  list.push({
    sortY: at(SINKS.maxX, SINKS.maxY),
    draw: () => {
      box(ctx, ox, oy, SINKS, 22, '#f8fafc', '#cbd5e1', '#94a3b8');
      for (const y of [404, 428]) {
        const b = p(ox, oy, (SINKS.minX + SINKS.maxX) / 2, y, 22);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  });
  for (const [i, st] of STALLS.entries()) {
    list.push({
      sortY: at(st.maxX, st.maxY),
      draw: () => {
        box(ctx, ox, oy, st, 46, '#cbd5e1', '#94a3b8', '#7c8aa0');
        const d = p(ox, oy, (st.minX + st.maxX) / 2, st.minY, 30);
        label(ctx, d.x, d.y, i === 0 ? '♀' : '♂', '#f1f5f9', 11);
      },
    });
  }

  // bridal suite: lit vanity mirror, sofa, flowers
  list.push({
    sortY: at(VANITY.maxX, VANITY.maxY),
    draw: () => {
      box(ctx, ox, oy, VANITY, 24, '#fdf2f8', '#e9c9d6', '#d8b0c0');
      // mirror on the wall above (with bulbs)
      const m = [p(ox, oy, VANITY.minX, VANITY.minY + 6, 34), p(ox, oy, VANITY.minX, VANITY.maxY - 6, 34), p(ox, oy, VANITY.minX, VANITY.maxY - 6, 70), p(ox, oy, VANITY.minX, VANITY.minY + 6, 70)];
      ctx.fillStyle = '#b9cbd8';
      ctx.strokeStyle = '#c9a54a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      m.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const glow = 0.75 + 0.25 * Math.sin(t * 3);
      for (let k = 0; k < 5; k++) {
        const q = p(ox, oy, VANITY.minX, VANITY.minY + 8 + k * 7.5, 72);
        ctx.fillStyle = `rgba(255, 236, 179, ${glow})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  });
  list.push({
    sortY: at(SUITE_SOFA.maxX, SUITE_SOFA.maxY),
    draw: () => {
      box(ctx, ox, oy, SUITE_SOFA, 12, '#f5d0dc', '#d9a7b8', '#c98fa3');
      box(ctx, ox, oy, { minX: SUITE_SOFA.maxX - 5, maxX: SUITE_SOFA.maxX, minY: SUITE_SOFA.minY, maxY: SUITE_SOFA.maxY }, 26, '#f9dce5', '#d9a7b8', '#c98fa3');
    },
  });
  list.push({
    sortY: at(FLOWERS.x, FLOWERS.y),
    draw: () => {
      box(ctx, ox, oy, { minX: FLOWERS.x - 4, maxX: FLOWERS.x + 4, minY: FLOWERS.y - 4, maxY: FLOWERS.y + 4 }, 18, '#f8fafc', '#e2e8f0', '#cbd5e1');
      const c = p(ox, oy, FLOWERS.x, FLOWERS.y, 26);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        ctx.fillStyle = k % 3 === 0 ? '#ffffff' : k % 3 === 1 ? '#f9a8d4' : '#fecdd3';
        ctx.beginPath();
        ctx.arc(c.x + Math.cos(a) * 6, c.y + Math.sin(a) * 3 - 2, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  });
  return list;
}
