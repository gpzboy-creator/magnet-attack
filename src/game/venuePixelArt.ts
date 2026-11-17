/**
 * Hall venue pixel art that is still drawn procedurally: the DJ's LED video wall.
 * (The old procedural chuppah, its runway and the old DJ stage/booth were replaced by PixelLab sprites —
 * see chuppahIsland.ts and venueProps.ts.)
 */
import { worldToIso } from './rules';
import { drawFiberSwirls } from './hallPixelArt';

/** The DJ's LED video wall (gold/green fiber swirls in a black bezel) standing at y, from z0 up. */
export function drawDjLedWall(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  discoBeatPhase: number,
  x0: number,
  x1: number,
  y: number,
  z0: number,
  height: number
) {
  const z1 = z0 + height;
  const c = (x: number, z: number) => {
    const p = worldToIso(x, y, z);
    return { x: originX + p.x, y: originY + p.y };
  };
  // support legs
  ctx.fillStyle = '#18181b';
  for (const x of [x0 + 8, x1 - 8]) {
    const a = c(x, z0 - 30);
    const b = c(x, z0);
    ctx.fillRect(Math.round(a.x - 2), Math.round(b.y), 4, Math.round(a.y - b.y));
  }
  const bl = c(x0, z0), br = c(x1, z0), tr = c(x1, z1), tl = c(x0, z1);
  ctx.fillStyle = '#05060a';
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(tl.x, tl.y);
  ctx.closePath();
  ctx.fill();
  drawFiberSwirls(ctx, (u, v) => c(x0 + u, z1 - v), x1 - x0, height, discoBeatPhase, 9.1);
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(tl.x, tl.y);
  ctx.closePath();
  ctx.stroke();
}
