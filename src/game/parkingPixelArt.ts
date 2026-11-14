/**
 * Outside the hall: the parking lot reached through the side exit (procedural Canvas2D, 2:1 iso).
 * Night asphalt with stall lines, a curb, a paved walkway + doormat at the hall exit,
 * a street lamp pooling warm light and a "P חניה" sign.
 */
import { worldToIso } from './rules.ts';

type Rect = { minX: number; maxX: number; minY: number; maxY: number };

function quad(ctx: CanvasRenderingContext2D, ox: number, oy: number, r: Rect, z = 0) {
  const a = worldToIso(r.minX, r.minY, z);
  const b = worldToIso(r.maxX, r.minY, z);
  const c = worldToIso(r.maxX, r.maxY, z);
  const d = worldToIso(r.minX, r.maxY, z);
  ctx.beginPath();
  ctx.moveTo(ox + a.x, oy + a.y);
  ctx.lineTo(ox + b.x, oy + b.y);
  ctx.lineTo(ox + c.x, oy + c.y);
  ctx.lineTo(ox + d.x, oy + d.y);
  ctx.closePath();
}

function line(ctx: CanvasRenderingContext2D, ox: number, oy: number, x0: number, y0: number, x1: number, y1: number) {
  const a = worldToIso(x0, y0);
  const b = worldToIso(x1, y1);
  ctx.beginPath();
  ctx.moveTo(ox + a.x, oy + a.y);
  ctx.lineTo(ox + b.x, oy + b.y);
  ctx.stroke();
}

export function drawParkingLot(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  lot: Rect,
  walkway: Rect,
  hallEdgeX: number,
  carX: number,
  t: number
) {
  ctx.save();
  // Curb (raised edge) then asphalt
  ctx.fillStyle = '#5b616b';
  quad(ctx, ox, oy, { minX: lot.minX - 6, maxX: lot.maxX + 6, minY: lot.minY - 6, maxY: lot.maxY + 6 });
  ctx.fill();
  ctx.fillStyle = '#23262c';
  quad(ctx, ox, oy, lot);
  ctx.fill();
  // Asphalt grain
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let i = 0; i < 260; i++) {
    const fx = lot.minX + ((i * 73.13) % (lot.maxX - lot.minX));
    const fy = lot.minY + ((i * 41.77) % (lot.maxY - lot.minY));
    const p = worldToIso(fx, fy);
    ctx.fillRect(Math.round(ox + p.x), Math.round(oy + p.y), 2, 1);
  }
  // Stall lines (parallel to the cars) + end line
  ctx.strokeStyle = 'rgba(235, 235, 220, 0.75)';
  ctx.lineWidth = 2;
  const stallW = 130;
  for (let x = carX - stallW * 1.5; x <= carX + stallW * 1.5 + 1; x += stallW) {
    if (x < lot.minX + 4 || x > lot.maxX - 4) continue;
    line(ctx, ox, oy, x, lot.minY + 60, x, lot.minY + 230);
  }
  line(ctx, ox, oy, Math.max(lot.minX + 4, carX - stallW * 1.5), lot.minY + 60, Math.min(lot.maxX - 4, carX + stallW * 1.5), lot.minY + 60);
  // Wheel stops
  ctx.fillStyle = '#8a8f99';
  for (const sx of [carX - stallW, carX, carX + stallW]) {
    if (sx < lot.minX || sx > lot.maxX) continue;
    quad(ctx, ox, oy, { minX: sx - 22, maxX: sx + 22, minY: lot.minY + 70, maxY: lot.minY + 76 }, 0);
    ctx.fill();
  }

  // Paved walkway from the hall exit + doormat at the door
  ctx.fillStyle = '#3d4049';
  quad(ctx, ox, oy, { ...walkway, minX: hallEdgeX - 4 });
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let x = hallEdgeX; x < walkway.maxX; x += 18) line(ctx, ox, oy, x, walkway.minY, x, walkway.maxY);
  ctx.fillStyle = '#7c2d12';
  quad(ctx, ox, oy, { minX: hallEdgeX - 30, maxX: hallEdgeX - 4, minY: walkway.minY + 10, maxY: walkway.maxY - 10 });
  ctx.fill();

  // Street lamp light pool
  const lampX = lot.maxX - 40;
  const lampY = lot.minY + 40;
  const lp = worldToIso(lampX, lampY);
  const flicker = 0.92 + Math.sin(t * 7.3) * 0.02;
  const glow = ctx.createRadialGradient(ox + lp.x, oy + lp.y, 4, ox + lp.x, oy + lp.y, 190);
  glow.addColorStop(0, `rgba(255, 214, 140, ${0.32 * flicker})`);
  glow.addColorStop(1, 'rgba(255, 214, 140, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(ox + lp.x, oy + lp.y, 190, 95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Lamp post + parking sign (stand above the ground: queued as depth-sorted drawables). */
export function drawStreetLamp(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y: number, t: number) {
  const p = worldToIso(x, y);
  const bx = ox + p.x;
  const by = oy + p.y;
  ctx.save();
  ctx.fillStyle = '#1f2329';
  ctx.fillRect(bx - 2, by - 120, 4, 120);
  ctx.fillRect(bx - 2, by - 120, 22, 4);
  ctx.fillStyle = '#2d333b';
  ctx.fillRect(bx + 14, by - 120, 12, 6);
  const f = 0.9 + Math.sin(t * 7.3) * 0.05;
  const g = ctx.createRadialGradient(bx + 20, by - 112, 1, bx + 20, by - 112, 26);
  g.addColorStop(0, `rgba(255, 230, 170, ${f})`);
  g.addColorStop(1, 'rgba(255, 230, 170, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(bx + 20, by - 112, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawParkingSign(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y: number) {
  const p = worldToIso(x, y);
  const bx = ox + p.x;
  const by = oy + p.y;
  ctx.save();
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(bx - 1.5, by - 54, 3, 54);
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(bx - 15, by - 78, 30, 26);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx - 13.5, by - 76.5, 27, 23);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('P', bx, by - 59);
  ctx.font = 'bold 8px "Heebo", sans-serif';
  ctx.direction = 'rtl';
  ctx.fillText('חניה', bx, by - 82);
  ctx.restore();
}
