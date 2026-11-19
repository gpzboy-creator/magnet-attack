/**
 * The hall's square black island bar (moved out of IsoArenaCanvas.tsx, no behavior change): the
 * counter split into pieces for depth sorting, the backlit bottle tower, and the bartender crew
 * (1 man : 3 women, all in black) working inside the ring.
 */

import { worldToIso } from '../game/rules';
import type { FloorObstacle } from '../game/rules';
import {
  BARTENDER_LOOKS,
  ISLAND_BAR,
  drawBarShelfTower,
  drawBartender,
  drawIslandBarPiece,
  getBartenderPose,
  getIslandBarPieces,
  type IsoBoxFn,
} from '../game/hallPixelArt';

/** Collision box: the counter ring + shelf tower. */
export const ISLAND_BAR_OBSTACLE: FloorObstacle = {
  kind: 'box',
  minX: ISLAND_BAR.cx - ISLAND_BAR.half,
  minY: ISLAND_BAR.cy - ISLAND_BAR.half,
  maxX: ISLAND_BAR.cx + ISLAND_BAR.half,
  maxY: ISLAND_BAR.cy + ISLAND_BAR.half,
};

/** Bartender positions at time `t` (for "who is in the photo"). */
export const islandBartenderSpots = (t: number) => BARTENDER_LOOKS.map((_, bi) => getBartenderPose(bi, t));

export function pushIslandBar(
  drawables: Array<{ sortY: number; draw: () => void }>,
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  drawIsoBox: IsoBoxFn,
  hallT: number
) {
  for (const piece of getIslandBarPieces()) {
    const pIso = worldToIso(piece.wx + piece.w / 2, piece.wy + piece.d / 2);
    drawables.push({
      sortY: pIso.y,
      draw: () => drawIslandBarPiece(ctx, originX, originY, piece, drawIsoBox, hallT),
    });
  }
  const towerIso = worldToIso(ISLAND_BAR.cx, ISLAND_BAR.cy);
  drawables.push({
    sortY: towerIso.y,
    draw: () => drawBarShelfTower(ctx, originX, originY, drawIsoBox, hallT),
  });
  BARTENDER_LOOKS.forEach((look, bi) => {
    const pose = getBartenderPose(bi, hallT);
    const bIso = worldToIso(pose.x, pose.y);
    drawables.push({
      sortY: bIso.y,
      draw: () => drawBartender(ctx, originX + bIso.x, originY + bIso.y, look, pose.action, hallT, bi + 1),
    });
  });
}
