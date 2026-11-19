/**
 * The reception garden's bar (PixelLab sprite; moved out of IsoArenaCanvas.tsx).
 * Depth = the footprint centre: whatever stands on its front (+x/+y) sides draws over it.
 */

import { worldToIso } from '../game/rules';
import { PROP_SPRITES, drawPropSprite } from '../game/venueProps';
import { RECEPTION_BAR } from '../game/venueOutside';

export function pushReceptionBar(
  drawables: Array<{ sortY: number; draw: () => void }>,
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  img: HTMLImageElement | null
) {
  const r = RECEPTION_BAR;
  drawables.push({
    sortY: worldToIso((r.minX + r.maxX) / 2, (r.minY + r.maxY) / 2).y,
    draw: () => {
      if (img) drawPropSprite(ctx, img, PROP_SPRITES.bar, originX, originY, r.minX, r.maxY);
    },
  });
}
