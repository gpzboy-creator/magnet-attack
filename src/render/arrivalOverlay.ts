/**
 * Reception overlays — moved out of IsoArenaCanvas.tsx (REFACTOR_MAP area 6, drawing part).
 * Drawing only: pose timer rings over posing guests, the phase title card and the live reception bar.
 */

import type { WeddingGuestActor } from '../components/IsoArenaCanvas';
import { worldToIso } from '../game/rules';
import { ARRIVAL, PHASE_INTRO_SEC, getPhaseInfo, type EventPhaseId } from '../game/eventPhases';
import type { ArrivalStats } from '../game/arrivalPhase';

/** World layer: a ring over each posing guest that empties over the pose (gold in the sweet spot). */
export function drawPoseRings(ctx: CanvasRenderingContext2D, arriving: readonly WeddingGuestActor[], originX: number, originY: number) {
  ctx.save();
  for (const g of arriving) {
    const a = g.arrival;
    if (!a || a.state !== 'posing') continue;
    const gi = worldToIso(g.x, g.y, 78);
    const x = originX + gi.x;
    const y = originY + gi.y;
    const frac = Math.min(1, a.poseT / ARRIVAL.poseSec);
    const peak = a.poseT >= ARRIVAL.peakStartSec && a.poseT <= ARRIVAL.peakEndSec;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(15,23,42,0.7)';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = a.photographed ? '#4ade80' : peak ? '#fbbf24' : '#e2e8f0';
    if (peak && !a.photographed) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.arc(x, y, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - frac));
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(a.photographed ? '✅' : '📸', x, y + 3);
  }
  ctx.restore();
}

/** Screen layer: phase title card while `introTimer` runs, and the reception progress bar. */
export function drawPhaseOverlay(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  phase: EventPhaseId,
  introTimer: number,
  receptionLabel: string | null
) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  if (introTimer > 0) {
    const info = getPhaseInfo(phase);
    const t = introTimer / PHASE_INTRO_SEC;
    const a = Math.min(1, (1 - t) * 6, t * 4);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(10, 8, 20, 0.66)';
    const w = Math.min(viewW - 32, 560);
    ctx.fillRect(viewW / 2 - w / 2, viewH * 0.3 - 46, w, 92);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 30px "Heebo", "Assistant", sans-serif';
    ctx.fillText(info.titleHe, viewW / 2, viewH * 0.3 - 4);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '15px "Heebo", "Assistant", sans-serif';
    ctx.fillText(info.goalHe, viewW / 2, viewH * 0.3 + 26, w - 24);
    ctx.globalAlpha = 1;
  }
  if (receptionLabel) {
    ctx.font = 'bold 13px "Heebo", "Assistant", sans-serif';
    const w = ctx.measureText(receptionLabel).width + 24;
    ctx.fillStyle = 'rgba(10, 8, 20, 0.6)';
    ctx.fillRect(viewW / 2 - w / 2, 40, w, 24);
    ctx.fillStyle = '#fde68a';
    ctx.fillText(receptionLabel, viewW / 2, 57);
  }
  ctx.restore();
}

export function receptionLabelHe(stats: ArrivalStats, onTheWay: number): string {
  return `🚪 קבלת פנים · צולמו ${stats.photographed}/${stats.total} · ✨ זהב ${stats.gold} · 😕 פוספסו ${stats.missed} · עוד ${onTheWay} בדרך`;
}
