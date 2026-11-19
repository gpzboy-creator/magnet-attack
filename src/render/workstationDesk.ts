/**
 * The magnet workstation's desk (moved out of IsoArenaCanvas.tsx, section 3A): the glowing floor
 * aura that says "there is work waiting here", and the table itself. The laptop, printer, cutter and
 * camera on top are still drawn by the canvas.
 */

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

  // 1. Fitted Black & Gold Pleated Workstation Table Skirt
  // Desk widened (116 wide) so the camera has room next to the laptop
  drawIsoBox(
    originX,
    originY,
    WORKSTATION_POS.x - 70,
    WORKSTATION_POS.y - 28,
    116,
    50,
    34,
    '#1e293b',
    '#0f172a',
    '#1e1b4b',
    '#f59e0b'
  );

  // Glowing Cyan/Amber LED Strip along the top edge of the workstation table
  drawIsoBox(
    originX,
    originY,
    WORKSTATION_POS.x - 67,
    WORKSTATION_POS.y - 25,
    110,
    44,
    2.5,
    '#0f172a',
    '#38bdf8',
    '#f59e0b',
    '#020617',
    34
  );
}
