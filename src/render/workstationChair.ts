/**
 * The photographer's chair at the magnet workstation: the wooden cross-back wedding chair
 * (PixelLab, docs/ASSETS.md) — the same style as the chairs in the hall (Shahar, 19.11).
 * Empty, it stands tucked in at the table (seen from behind); when the photographer sits he turns it
 * toward the room (his seated sprite faces the viewer), so it is drawn from the front, behind him.
 */

import { worldToIso } from '../game/rules';

export interface ChairSprite {
  file: string;
  /** Sprite pixel under the middle of the four feet (placed on the world point). */
  ax: number;
  ay: number;
  s: number;
}

/** Cross-back chair sprites: `back` faces away from the viewer (up-right), `front` faces down-left. */
export const CROSSBACK_CHAIR = {
  back: { file: 'assets/aistudio/chair-crossback-back.png', ax: 82, ay: 213, s: 0.16 },
  front: { file: 'assets/aistudio/chair-crossback-front.png', ax: 68, ay: 224, s: 0.16 },
} satisfies Record<string, ChairSprite>;

const images = new Map<string, HTMLImageElement>();
export function chairImg(sp: ChairSprite): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let img = images.get(sp.file);
  if (!img) {
    img = new Image();
    img.src = `${import.meta.env?.BASE_URL ?? '/'}${sp.file}`;
    images.set(sp.file, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function drawChairSprite(
  ctx: CanvasRenderingContext2D,
  sp: ChairSprite,
  sx: number,
  sy: number,
  clip?: Array<[number, number]>
) {
  const img = chairImg(sp);
  if (!img) return;
  const x0 = sx - sp.ax * sp.s;
  const y0 = sy - sp.ay * sp.s;
  ctx.save();
  if (clip) {
    ctx.beginPath();
    clip.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(x0 + px * sp.s, y0 + py * sp.s) : ctx.lineTo(x0 + px * sp.s, y0 + py * sp.s)));
    ctx.closePath();
    ctx.clip();
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, Math.round(x0), Math.round(y0), Math.round(img.width * sp.s), Math.round(img.height * sp.s));
  ctx.restore();
}

export function pushWorkstationChair(
  drawables: Array<{ sortY: number; draw: () => void }>,
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  pos: { x: number; y: number },
  seated: boolean
) {
  const chairIso = worldToIso(pos.x, pos.y);
  const sx = originX + chairIso.x;
  const sy = originY + chairIso.y;
  drawables.push({
    sortY: chairIso.y - 1.5,
    draw: () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 2, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      if (seated) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(sx, sy + 2, 20, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawChairSprite(ctx, seated ? CROSSBACK_CHAIR.front : CROSSBACK_CHAIR.back, sx, sy);
    },
  });
}
