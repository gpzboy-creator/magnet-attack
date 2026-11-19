/**
 * The banquet tables in the hall (moved out of IsoArenaCanvas.tsx, "2B").
 */

import { worldToIso } from '../game/rules';
import { DECOR_TABLES, LONG_TABLE_SEATS, drawGhostChair, drawLongBanquetTable } from '../game/hallPixelArt';
import type { DrawIsoBox } from './workstationDesk';

export function pushHallTables(
  drawables: Array<{ sortY: number; draw: () => void }>,
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  BANQUET_TABLES: Array<{ id: number; wx: number; wy: number }>,
  guests: Array<{ isSeated?: boolean; x: number; y: number }>,
  drawIsoBox: DrawIsoBox,
  hallT: number
) {
  // 2B. Long banquet tables (white cloth, flower ball + crystal candelabra), ghost chairs on empty seats
  for (const tbl of BANQUET_TABLES) {
    const tIso = worldToIso(tbl.wx, tbl.wy);
    drawables.push({
      sortY: tIso.y,
      draw: () =>
        drawLongBanquetTable(ctx, originX, originY, tbl.wx, tbl.wy, drawIsoBox, {
          tableNumber: tbl.id * 7 + 1,
          t: hallT,
        }),
    });
    for (const seat of LONG_TABLE_SEATS) {
      const sxw = tbl.wx + seat.dx;
      const syw = tbl.wy + seat.dy;
      const occupied = guests.some(
        (g) => g.isSeated && Math.abs(g.x - sxw) < 5 && Math.abs(g.y - syw) < 5
      );
      if (occupied) continue;
      const cIso = worldToIso(sxw, syw);
      drawables.push({
        sortY: cIso.y - 0.1,
        draw: () => drawGhostChair(ctx, originX + cIso.x, originY + cIso.y, seat.dir === 'SW'),
      });
    }
  }
  // Decorative full tables to give the hall its real scale (empty: guests are only real, moving actors)
  DECOR_TABLES.forEach((dt) => {
    const dIso = worldToIso(dt.x, dt.y);
    drawables.push({
      sortY: dIso.y,
      draw: () => drawLongBanquetTable(ctx, originX, originY, dt.x, dt.y, drawIsoBox, { tableNumber: dt.number, t: hallT }),
    });
  });
}
