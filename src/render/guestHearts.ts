/**
 * Hearts over guests' heads (guestMood.ts). Drawing only — reads the mood book, changes nothing.
 * Shown for guests near the photographer, guests who are owed a magnet, and anyone not at 3 hearts,
 * so the hall doesn't turn into a sea of hearts.
 */

import { worldToIso } from '../game/rules';
import { MOOD, type MoodBook } from '../game/guestMood';

interface Actor {
  id: number;
  x: number;
  y: number;
}

const HEAD_Z = 92;
const NEAR_PLAYER = 200;
const URGENT_SEC = 15;

function heartPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // pixel-ish heart, s = half width
  ctx.beginPath();
  ctx.moveTo(cx, cy + s);
  ctx.lineTo(cx - s, cy);
  ctx.lineTo(cx - s, cy - s * 0.5);
  ctx.lineTo(cx - s * 0.5, cy - s);
  ctx.lineTo(cx, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.5, cy - s);
  ctx.lineTo(cx + s, cy - s * 0.5);
  ctx.lineTo(cx + s, cy);
  ctx.closePath();
}

export function drawGuestHearts(
  ctx: CanvasRenderingContext2D,
  actors: readonly Actor[],
  book: MoodBook,
  originX: number,
  originY: number,
  focus: { x: number; y: number },
  now: number
): void {
  ctx.save();
  for (const a of actors) {
    const m = book.guests.get(a.id);
    if (!m) continue;
    const near = Math.hypot(a.x - focus.x, a.y - focus.y) < NEAR_PLAYER;
    const owed = m.awaiting && !m.left;
    if (!near && !owed && m.hearts === MOOD.startHearts) continue;

    const p = worldToIso(a.x, a.y, HEAD_Z);
    const x = originX + p.x;
    const y = originY + p.y;
    const slots = Math.max(MOOD.startHearts, m.hearts);
    const s = 2.6;
    const gap = 7;
    const x0 = x - ((slots - 1) * gap) / 2;
    const urgent = owed && m.deadline != null && m.deadline - now < URGENT_SEC;

    for (let i = 0; i < slots; i++) {
      const hx = x0 + i * gap;
      heartPath(ctx, hx, y, s);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(15,10,20,0.85)';
      ctx.stroke();
      if (i < m.hearts) {
        ctx.fillStyle = i >= MOOD.startHearts ? '#fbbf24' : urgent ? '#fb923c' : '#f43f5e';
      } else {
        ctx.fillStyle = 'rgba(120,113,108,0.55)';
      }
      ctx.fill();
    }

    // What this guest is waiting for: 🤝 promised magnet, 🧲 unpromised one, 💔 left angry
    const tag = m.left ? '💔' : owed ? (m.promised ? '🤝' : '🧲') : '';
    if (tag) {
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, x0 + slots * gap - 1, y - 0.5);
    }
  }
  ctx.restore();
}
