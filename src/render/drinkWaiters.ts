/**
 * Drawing the hall's drink waiters (moved out of IsoArenaCanvas.tsx, no behavior change): black
 * trousers + black shirt + khaki apron, a bobbing walk, and a silver tray with three drinks while
 * carrying. The waiters' logic is in game/drinkWaiters.ts; a PixelLab animated waiter replaces this file.
 */

import { worldToIso } from '../game/rules';
import type { DrinkWaiter } from '../game/drinkWaiters';

/** Queue every waiter into the depth-sorted drawables. */
export function pushDrinkWaiters(
  drawables: Array<{ sortY: number; draw: () => void }>,
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  waiters: readonly DrinkWaiter[],
  discoBeatPhase: number
) {
  for (const wActor of waiters) {
    const wIso = worldToIso(wActor.x, wActor.y);
    drawables.push({
      sortY: wIso.y,
      draw: () => {
        const sx = originX + wIso.x;
        const sy = originY + wIso.y;
        const bob = Math.sin(discoBeatPhase * 2.6 + wActor.id) * 2.2;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Black trousers + black shirt + khaki apron (like the venue's waiters)
        ctx.fillStyle = '#0b0b0e';
        ctx.fillRect(sx - 6, sy - 18 + bob * 0.3, 5, 18);
        ctx.fillRect(sx + 1, sy - 18 - bob * 0.3, 5, 18);
        ctx.fillStyle = '#121216';
        ctx.fillRect(sx - 9, sy - 38 + bob, 18, 20);
        ctx.fillStyle = '#a1885f';
        ctx.fillRect(sx - 7, sy - 24 + bob, 14, 12);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(sx - 7, sy - 24 + bob, 14, 1.5);

        ctx.fillStyle = '#d6a27c';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(sx, sy - 46 + bob, 7.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1e1612';
        ctx.beginPath();
        ctx.arc(sx, sy - 48 + bob, 7.4, Math.PI, Math.PI * 2);
        ctx.fill();

        // Arm up to the tray (only while carrying), otherwise at the side
        ctx.strokeStyle = '#121216';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx + 8, sy - 34 + bob);
        ctx.lineTo(wActor.carrying ? sx + 13 : sx + 10, wActor.carrying ? sy - 41 + bob : sy - 22 + bob);
        ctx.stroke();

        if (wActor.carrying) {
          ctx.fillStyle = '#cbd5e1';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(sx + 14, sy - 42 + bob, 10, 4.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Three drinks on the tray
          const cols = ['rgba(190,18,60,0.85)', 'rgba(254,240,138,0.9)', 'rgba(244,114,182,0.85)'];
          cols.forEach((c, k) => {
            ctx.fillStyle = c;
            ctx.fillRect(sx + 8 + k * 4.5, sy - 50 + bob, 2.6, 5);
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 0.6;
            ctx.strokeRect(sx + 8 + k * 4.5, sy - 50 + bob, 2.6, 5);
          });
        }
      },
    });
  }
}
