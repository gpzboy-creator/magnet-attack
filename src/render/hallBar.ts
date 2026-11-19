/**
 * The hall bar (PixelLab hall-bar-side.png, seed 7 — the same style as the round tables and
 * cross-back chairs): a long wooden counter with X panels and a marble top on the dance floor's left
 * side (geometry: src/game/hallBar.ts), with two bartenders working behind it, backs to the wall.
 *
 * Depth: the counter is 170 long but only 29 deep, so one sort key can't place both a guest at one
 * end and one at the other correctly. It is drawn in slices along y, each clipped to the screen
 * region of its own world strip and sorted by its own centre. The clip boundary between two slices
 * follows the counter's front face (+x), then its top, then straight up — the same polyline for both
 * neighbours, so the slices tile without gaps or overlaps.
 */

import { worldToIso } from '../game/rules';
import { drawPropSprite, type PropSprite } from '../game/venueProps';
import { HALL_LAYOUT } from '../game/hallLayout';
import { HALL_BAR_BOX, hallBartenderPose } from '../game/hallBar';
import { BARTENDER_LOOKS, drawBartender } from '../game/hallPixelArt';

/**
 * Cleaned by tools/make_hall_bar.py (not mirrored: long side along world y). Floor corners in the
 * sprite: left (1, 184), bottom (40, 204), right (268, 89) → lx 39, ly 228; counter top ≈ 62 px
 * above the floor. At s = 170 / 228 it is 29 × 170 world units, ≈ 46 high (a 1 m bar).
 */
export const HALL_BAR_SPRITE: PropSprite = { file: 'assets/aistudio/hall-bar-side.png', ax: 1, ay: 184, lx: 39, ly: 228, h: 62, s: HALL_LAYOUT.bar.length / 228 };

const SLICES = 8;
/** Clip margins: the end caps and the bottles / flowers reaching above the counter. */
const END_PAD = 50;
const Z_TOP = 140;

let barImage: HTMLImageElement | null = null;
function barImg(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!barImage) {
    barImage = new Image();
    barImage.src = `${import.meta.env?.BASE_URL ?? '/'}${HALL_BAR_SPRITE.file}`;
  }
  return barImage.complete && barImage.naturalWidth > 0 ? barImage : null;
}

/** Bartender positions at time `t` (for "who is in the photo"). */
export const hallBartenderSpots = (t: number) => [0, 1].map((i) => hallBartenderPose(i, t));

/** Slice boundaries along y: the counter split evenly, with the outer ones stretched over the end caps. */
function sliceEdges(): number[] {
  const { minY, maxY } = HALL_BAR_BOX;
  const edges = Array.from({ length: SLICES + 1 }, (_, k) => minY + ((maxY - minY) * k) / SLICES);
  edges[0] -= END_PAD;
  edges[SLICES] += END_PAD;
  return edges;
}

export function pushHallBar(
  drawables: Array<{ sortY: number; draw: () => void }>,
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  t: number
) {
  const { minX, maxX, maxY } = HALL_BAR_BOX;
  const top = HALL_BAR_SPRITE.h * HALL_BAR_SPRITE.s;
  const midX = (minX + maxX) / 2;
  // Boundary polyline of the vertical plane y = c, bottom to top (in screen space).
  const boundary = (c: number) =>
    [worldToIso(maxX + 30, c, 0), worldToIso(maxX, c, 0), worldToIso(maxX, c, top), worldToIso(minX, c, top), worldToIso(minX, c, Z_TOP)].map((p) => ({
      x: originX + p.x,
      y: originY + p.y,
    }));
  const edges = sliceEdges();
  for (let k = 0; k < SLICES; k++) {
    const y0 = edges[k];
    const y1 = edges[k + 1];
    const sortY = worldToIso(midX, (Math.max(y0, HALL_BAR_BOX.minY) + Math.min(y1, HALL_BAR_BOX.maxY)) / 2).y;
    drawables.push({
      sortY,
      draw: () => {
        const img = barImg();
        if (!img) return;
        const left = boundary(y0);
        const right = boundary(y1).reverse();
        ctx.save();
        ctx.beginPath();
        [...left, ...right].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.clip();
        drawPropSprite(ctx, img, HALL_BAR_SPRITE, originX, originY, minX, maxY);
        ctx.restore();
      },
    });
  }
  // Two bartenders behind the counter, backs to the wall (the counter slices in front hide their legs)
  [BARTENDER_LOOKS[0], BARTENDER_LOOKS[1]].forEach((look, i) => {
    const pose = hallBartenderPose(i, t);
    const p = worldToIso(pose.x, pose.y);
    drawables.push({
      sortY: p.y,
      draw: () => drawBartender(ctx, originX + p.x, originY + p.y, look, pose.action, t, i + 21),
    });
  });
}
