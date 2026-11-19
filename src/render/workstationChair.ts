/**
 * The photographer's chair at the magnet workstation (moved out of IsoArenaCanvas.tsx, "3A-CHAIR").
 * Two drawables: the seat goes behind the photographer, the backrest in front of him.
 */

import { worldToIso } from '../game/rules';
import type { DrawIsoBox } from './workstationDesk';

export function pushWorkstationChair(
  drawables: Array<{ sortY: number; draw: () => void }>,
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  pos: { x: number; y: number },
  seated: boolean,
  drawIsoBox: DrawIsoBox
) {
  const chairIso = worldToIso(pos.x, pos.y);
  drawables.push({
    sortY: chairIso.y - 1.5,
    draw: () => {
      const cx = pos.x;
      const cy = pos.y;
      const baseIso = worldToIso(cx, cy, 0);
      const sx = originX + baseIso.x;
      const sy = originY + baseIso.y;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 2, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      if (seated) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(sx, sy + 2, 20, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      const legOffsets = [
        { dx: -11, dy: 0 },
        { dx: 11, dy: 0 },
        { dx: 0, dy: -11 },
        { dx: 0, dy: 11 },
        { dx: -8, dy: 8 },
      ];
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.4;
      for (const leg of legOffsets) {
        const footIso = worldToIso(cx + leg.dx, cy + leg.dy, 1);
        ctx.beginPath();
        ctx.moveTo(sx, sy - 2);
        ctx.lineTo(originX + footIso.x, originY + footIso.y);
        ctx.stroke();

        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(originX + footIso.x, originY + footIso.y + 1, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      const colTop = worldToIso(cx, cy, 13);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 2);
      ctx.lineTo(originX + colTop.x, originY + colTop.y);
      ctx.stroke();

      drawIsoBox(
        originX,
        originY,
        cx - 10,
        cy - 10,
        20,
        20,
        4.5,
        seated ? '#0284c7' : '#1e293b',
        '#0f172a',
        '#334155',
        '#020617',
        13
      );
    },
  });

  drawables.push({
    sortY: chairIso.y + 2.5,
    draw: () => {
      const cx = pos.x;
      const cy = pos.y;

      drawIsoBox(
        originX,
        originY,
        cx - 11,
        cy - 6,
        3,
        14,
        7,
        '#334155',
        '#0f172a',
        '#1e293b',
        '#020617',
        17
      );
      drawIsoBox(
        originX,
        originY,
        cx + 8,
        cy - 6,
        3,
        14,
        7,
        '#334155',
        '#0f172a',
        '#1e293b',
        '#020617',
        17
      );

      drawIsoBox(
        originX,
        originY,
        cx - 9,
        cy + 7,
        18,
        4,
        17,
        '#0284c7',
        '#0f172a',
        '#1e293b',
        '#020617',
        17.5
      );
    },
  });
}
