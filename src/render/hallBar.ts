/**
 * The hall bar (PixelLab hall-bar.png, seed 7 — the same style as the round tables and cross-back
 * chairs): a long wooden counter with X panels and a marble top, across the hall between the dance
 * floor and the tables (geometry: src/game/hallBar.ts), with two bartenders working behind it.
 *
 * Depth: the counter is 170 long but only 29 deep, so one sort key can't place both a guest at its
 * left end and one at its right end correctly. It is drawn in slices along x, each clipped to the
 * screen region of its own world strip and sorted by its own centre. The clip boundary between two
 * slices follows the counter's front face, then its top, then straight up — the same polyline for
 * both neighbours, so the slices tile without gaps or overlaps.
 */

import { worldToIso } from '../game/rules';
import { drawPropSprite, type PropSprite } from '../game/venueProps';
import { HALL_LAYOUT } from '../game/hallLayout';
import { HALL_BAR_BOX, hallBartenderPose } from '../game/hallBar';
import { BARTENDER_LOOKS, drawBartender } from '../game/hallPixelArt';

/**
 * Mirrored + cleaned by tools/make_hall_bar.py. Floor corners in the sprite: left (1, 89),
 * bottom (229, 204), right (268, 184) → lx 228, ly 39; counter top ≈ 63 px above the floor.
 * At s = 170 / 228 it is 170 × 29 world units, ≈ 47 high (a 1 m bar next to 80-unit people).
 */
export const HALL_BAR_SPRITE: PropSprite = { file: 'assets/aistudio/hall-bar.png', ax: 1, ay: 89, lx: 228, ly: 39, h: 63, s: HALL_LAYOUT.bar.length / 228 };

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

/** Slice boundaries along x: the counter split evenly, with the outer ones stretched over the end caps. */
function sliceEdges(): number[] {
  const { minX, maxX } = HALL_BAR_BOX;
  const edges = Array.from({ length: SLICES + 1 }, (_, k) => minX + ((maxX - minX) * k) / SLICES);
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
  const { minY, maxY } = HALL_BAR_BOX;
  const top = HALL_BAR_SPRITE.h * HALL_BAR_SPRITE.s;
  const midY = (minY + maxY) / 2;
  // Boundary polyline of the vertical plane x = c, bottom to top (in screen space).
  const boundary = (c: number) =>
    [worldToIso(c, maxY + 30, 0), worldToIso(c, maxY, 0), worldToIso(c, maxY, top), worldToIso(c, minY, top), worldToIso(c, minY, Z_TOP)].map((p) => ({
      x: originX + p.x,
      y: originY + p.y,
    }));
  const edges = sliceEdges();
  for (let k = 0; k < SLICES; k++) {
    const x0 = edges[k];
    const x1 = edges[k + 1];
    const sortY = worldToIso((Math.max(x0, HALL_BAR_BOX.minX) + Math.min(x1, HALL_BAR_BOX.maxX)) / 2, midY).y;
    drawables.push({
      sortY,
      draw: () => {
        const img = barImg();
        if (!img) return;
        const left = boundary(x0);
        const right = boundary(x1).reverse();
        ctx.save();
        ctx.beginPath();
        [...left, ...right].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.clip();
        drawPropSprite(ctx, img, HALL_BAR_SPRITE, originX, originY, HALL_BAR_BOX.minX, maxY);
        ctx.restore();
      },
    });
  }
  // Two bartenders behind the counter (the counter slices in front hide their legs)
  [BARTENDER_LOOKS[0], BARTENDER_LOOKS[1]].forEach((look, i) => {
    const pose = hallBartenderPose(i, t);
    const p = worldToIso(pose.x, pose.y);
    drawables.push({
      sortY: p.y,
      draw: () => drawBartender(ctx, originX + p.x, originY + p.y, look, pose.action, t, i + 21),
    });
  });
}
