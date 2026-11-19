/**
 * The round banquet tables in the hall (Shahar, 19.11): white floor-length cloth, a flower wreath
 * with candles, 8 place settings (PixelLab round-table.png), and 8 wooden cross-back chairs around
 * each (the same chair as at the magnet workstation). Layout: src/game/hallLayout.ts.
 * Every chair is its own drawable, so guests sitting on the near side are drawn in front of the
 * table and those on the far side behind its cloth.
 */

import { worldToIso } from '../game/rules';
import { HALL_LAYOUT, ROUND_TABLE_SEATS } from '../game/hallLayout';
import { CROSSBACK_CHAIR, drawChairSprite } from './workstationChair';

/** PixelLab round table: anchor = the floor point under the table centre. */
export const ROUND_TABLE = { file: 'assets/aistudio/round-table.png', ax: 127, ay: 140, s: 0.2895 } as const;

let tableImage: HTMLImageElement | null = null;
function tableImg(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!tableImage) {
    tableImage = new Image();
    tableImage.src = `${import.meta.env?.BASE_URL ?? '/'}${ROUND_TABLE.file}`;
  }
  return tableImage.complete && tableImage.naturalWidth > 0 ? tableImage : null;
}

export function pushHallTables(
  drawables: Array<{ sortY: number; draw: () => void }>,
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tables: Array<{ id: number; wx: number; wy: number }>
) {
  for (const tbl of tables) {
    const tIso = worldToIso(tbl.wx, tbl.wy);
    drawables.push({
      sortY: tIso.y,
      draw: () => {
        const img = tableImg();
        if (!img) return;
        const sx = originX + tIso.x;
        const sy = originY + tIso.y;
        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 23, 0.35)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, HALL_LAYOUT.tableRadius * 1.6, HALL_LAYOUT.tableRadius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          img,
          Math.round(sx - ROUND_TABLE.ax * ROUND_TABLE.s),
          Math.round(sy - ROUND_TABLE.ay * ROUND_TABLE.s),
          Math.round(img.width * ROUND_TABLE.s),
          Math.round(img.height * ROUND_TABLE.s)
        );
        ctx.restore();
      },
    });
    for (const seat of ROUND_TABLE_SEATS) {
      const cIso = worldToIso(tbl.wx + seat.dx, tbl.wy + seat.dy);
      const sprite = seat.view.startsWith('front') ? CROSSBACK_CHAIR.front : CROSSBACK_CHAIR.back;
      drawables.push({
        sortY: cIso.y - 0.1,
        draw: () => drawChairSprite(ctx, sprite, originX + cIso.x, originY + cIso.y, seat.view.endsWith('Mirror')),
      });
    }
  }
}
