/**
 * The hall lounge corner (moved out of IsoArenaCanvas.tsx, no behavior change): the uplit
 * white-trunk tree on its wooden deck, the curved velvet sofa, and the rattan high tables along the
 * green wall — drawables plus their collision circles.
 */

import { worldToIso, type FloorObstacle } from '../game/rules';
import { LOUNGE, RATTAN_HIGH_TABLES, drawRattanHighTable, drawUplitTree, drawVelvetLounge } from '../game/hallPixelArt';

export const LOUNGE_OBSTACLES: FloorObstacle[] = [
  // Uplit tree deck + velvet lounge
  { kind: 'circle', x: LOUNGE.treeX, y: LOUNGE.treeY, r: 22 },
  { kind: 'circle', x: LOUNGE.sofaX, y: LOUNGE.sofaY, r: 26 },
  // Rattan high tables along the green wall
  ...RATTAN_HIGH_TABLES.map((t) => ({ kind: 'circle' as const, x: t.x, y: t.y, r: 14 })),
];

export function pushHallLounge(
  drawables: Array<{ sortY: number; draw: () => void }>,
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  hallT: number
) {
  const treeIso = worldToIso(LOUNGE.treeX, LOUNGE.treeY);
  drawables.push({
    sortY: treeIso.y,
    draw: () => drawUplitTree(ctx, originX, originY, LOUNGE.treeX, LOUNGE.treeY, hallT),
  });
  const loungeIso = worldToIso(LOUNGE.sofaX, LOUNGE.sofaY);
  drawables.push({
    sortY: loungeIso.y - 20,
    draw: () => drawVelvetLounge(ctx, originX, originY, LOUNGE.sofaX, LOUNGE.sofaY),
  });
  for (const rt of RATTAN_HIGH_TABLES) {
    const rtIso = worldToIso(rt.x, rt.y);
    drawables.push({
      sortY: rtIso.y,
      draw: () => drawRattanHighTable(ctx, originX, originY, rt.x, rt.y),
    });
  }
}
