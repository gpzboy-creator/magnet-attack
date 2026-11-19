/**
 * The magnet workstation's desk (moved out of IsoArenaCanvas.tsx, section 3A): the glowing floor
 * aura that says "there is work waiting here", and the table itself — a white folding banquet table
 * like the ones magnet photographers really bring (Shahar, 19.11), sized to the people in the hall.
 * The laptop, printer, cutter and camera on top are still drawn by the canvas.
 */

import { drawPropSprite, propTopZ, type PropSprite } from '../game/venueProps';

/**
 * PixelLab folding table (mirrored, tools/make_station_table.py). Top-surface corners in the sprite:
 * left (3, 35), back (71, 3), right (264, 94) → lx ≈ 190, ly ≈ 72; legs ≈ 66 px down to the floor.
 * At s = 0.56 it is ≈ 106 × 40 world units with the top at z ≈ 37 (a 6-ft table next to the people).
 */
export const STATION_TABLE: PropSprite = { file: 'assets/aistudio/station-table.png', ax: 3, ay: 101, lx: 190, ly: 72, h: 66, s: 0.56 };

/** The table's floor footprint around the workstation anchor (also its collision box). */
export function deskFootprint(pos: { x: number; y: number }) {
  const minX = pos.x - 65;
  const maxY = pos.y + 17;
  return { minX, maxX: minX + STATION_TABLE.lx * STATION_TABLE.s, minY: maxY - STATION_TABLE.ly * STATION_TABLE.s, maxY };
}

let tableImage: HTMLImageElement | null = null;
function tableImg(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!tableImage) {
    tableImage = new Image();
    tableImage.src = `${import.meta.env?.BASE_URL ?? '/'}${STATION_TABLE.file}`;
  }
  return tableImage.complete && tableImage.naturalWidth > 0 ? tableImage : null;
}

export interface DeskState {
  isNearStation: boolean;
  photosInCamera: number;
  photosOnComputer: number;
  cameraOnDesk: boolean;
  uncutSheetsAtStation: number;
}

export type DrawIsoBox = (
  originX: number,
  originY: number,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  topColor: string,
  leftColor: string,
  rightColor: string,
  strokeColor?: string,
  z?: number
) => void;

export function drawWorkstationDesk(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  sx: number,
  sy: number,
  WORKSTATION_POS: { x: number; y: number },
  player: DeskState,
  drawIsoBox: DrawIsoBox
) {
  // Glowing LED Under-Table Floor Aura
  const hasWorkstationTask =
    player.photosInCamera > 0 ||
    player.photosOnComputer > 0 ||
    player.cameraOnDesk ||
    player.uncutSheetsAtStation > 0;
  const auraRadius = player.isNearStation ? 92 : hasWorkstationTask ? 76 : 58;
  const auraGrad = ctx.createRadialGradient(sx, sy + 6, 10, sx, sy + 6, auraRadius);
  if (player.uncutSheetsAtStation > 0) {
    auraGrad.addColorStop(0, 'rgba(34, 211, 238, 0.48)');
    auraGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
  } else if (player.photosInCamera > 0 || player.isNearStation) {
    auraGrad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
    auraGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  } else {
    auraGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
    auraGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  }
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 6, auraRadius, auraRadius * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // The table: a white folding banquet table (PixelLab, docs/ASSETS.md), placed by its footprint
  const img = tableImg();
  const fp = deskFootprint(WORKSTATION_POS);
  if (img) drawPropSprite(ctx, img, STATION_TABLE, originX, originY, fp.minX, fp.maxY);
  else drawIsoBox(originX, originY, fp.minX, fp.minY, fp.maxX - fp.minX, fp.maxY - fp.minY, propTopZ(STATION_TABLE), '#f1f5f9', '#cbd5e1', '#94a3b8');
}
