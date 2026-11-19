/**
 * The reception garden's bar (PixelLab sprite; moved out of IsoArenaCanvas.tsx) with two bartenders
 * working behind the counter (Shahar, 19.11) — the same all-black crew look as the hall bar.
 * Depth: the whole bar first, then the bartenders, then the counter again (clipped) so it hides
 * their legs; whatever stands on the bar's front (+x/+y) sides still draws over all of it.
 */

import { worldToIso } from '../game/rules';
import { PROP_SPRITES, drawPropSprite } from '../game/venueProps';
import { RECEPTION_BAR } from '../game/venueOutside';
import { BARTENDER_LOOKS, drawBartender, type BartenderAction } from '../game/hallPixelArt';

/** The counter (front panel + marble top) in bar.png pixels. */
const COUNTER_CLIP: Array<[number, number]> = [
  [70, 160], [238, 113], [238, 152], [106, 206], [70, 204],
];

/** Where the bartenders work: the strip between the back shelf and the counter (world). */
export const GARDEN_BAR_STATIONS: Array<{ x: number; y: number }> = [
  { x: RECEPTION_BAR.minX + 31, y: 466 },
  { x: RECEPTION_BAR.minX + 31, y: 494 },
  { x: RECEPTION_BAR.minX + 31, y: 522 },
  { x: RECEPTION_BAR.minX + 31, y: 550 },
];

/** Bartender `i` at time `t`: walks between stations, then shakes / pours / serves there. */
export function gardenBartenderPose(i: number, t: number): { x: number; y: number; action: BartenderAction } {
  const n = GARDEN_BAR_STATIONS.length;
  const period = 4.6 + i * 0.9;
  const shifted = t + i * 2.1;
  const cycle = Math.floor(shifted / period);
  const local = shifted - cycle * period;
  // bartender 0 works the left half, bartender 1 the right half, so they don't cross
  const pick = (c: number) => GARDEN_BAR_STATIONS[(i * 2 + (((c % 2) + 2) % 2)) % n];
  const from = pick(cycle - 1);
  const to = pick(cycle);
  if (local < 0.9) {
    const k = local / 0.9;
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, action: 'walk' };
  }
  const actions: BartenderAction[] = ['shake', 'pour', 'serve'];
  return { ...to, action: actions[(cycle + i) % 3] };
}

export function pushReceptionBar(
  drawables: Array<{ sortY: number; draw: () => void }>,
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  img: HTMLImageElement | null,
  t: number
) {
  const r = RECEPTION_BAR;
  const spec = PROP_SPRITES.bar;
  const sortY = worldToIso((r.minX + r.maxX) / 2, (r.minY + r.maxY) / 2).y;
  drawables.push({
    sortY,
    draw: () => {
      if (img) drawPropSprite(ctx, img, spec, originX, originY, r.minX, r.maxY);
    },
  });
  [BARTENDER_LOOKS[0], BARTENDER_LOOKS[1]].forEach((look, i) => {
    const pose = gardenBartenderPose(i, t);
    const p = worldToIso(pose.x, pose.y);
    drawables.push({
      sortY: sortY + 0.2 + i * 0.01,
      draw: () => drawBartender(ctx, originX + p.x, originY + p.y, look, pose.action, t, i + 11),
    });
  });
  drawables.push({
    sortY: sortY + 0.5,
    draw: () => {
      if (!img) return;
      const c = worldToIso(r.minX, r.maxY, 0);
      const x0 = originX + c.x - spec.ax * spec.s;
      const y0 = originY + c.y - spec.ay * spec.s;
      ctx.save();
      ctx.beginPath();
      COUNTER_CLIP.forEach(([px, py], k) => (k === 0 ? ctx.moveTo(x0 + px * spec.s, y0 + py * spec.s) : ctx.lineTo(x0 + px * spec.s, y0 + py * spec.s)));
      ctx.closePath();
      ctx.clip();
      drawPropSprite(ctx, img, spec, originX, originY, r.minX, r.maxY);
      ctx.restore();
    },
  });
}
