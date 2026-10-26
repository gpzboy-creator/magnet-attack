/**
 * Pixel-Art Architectural & Venue Renderer for "חצר המלכה" (Hatzar HaMalka)
 * Faithfully recreates the 13 reference photos in crisp isometric pixel-art:
 * - Giant woven rattan/wicker dome chandeliers (אהילי ראטן/קש ענקיים)
 * - Cascading ceiling curtain of twinkling fairy lights (מפל שרשראות נורות)
 * - Giant rose-gold/copper reflective mirror spheres (כדורי מראה נחושת/רוז-גולד)
 * - Vertical wood-slat walls with glowing LED strips, upper mezzanine balcony & 3D chevron wall
 * - Ancient olive tree in a white round planter with wrap-around wood bench & macramé fringe parasol
 * - Raised DJ stage with giant animated LED video wall & ribbed wood bar with purple underglow
 * - All-white draped Chuppah with glowing golden glass runway aisle, white benches, lanterns & floral pedestals
 * - Banquet tables with dark velvet/wood tops, black Chiavari chairs, tropical fan-palm leaves & tall gold candelabras
 */

import { worldToIso } from './rules';
import { drawFiberSwirls } from './hallPixelArt';

/**
 * Helper to draw a crisp pixel-aligned rectangle
 */
function pxRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * Illuminated golden glass catwalk + white carpet runway leading to the chuppah.
 */
export function drawChuppahRunway(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  discoBeatPhase: number
) {
  // Illuminated Golden Glass Catwalk & White Carpet Runway leading to the Chuppah (photos 8 & 9)
  {
    const r0 = worldToIso(10, -188, 0.5);
    const r1 = worldToIso(146, -188, 0.5);
    const r2 = worldToIso(146, -122, 0.5);
    const r3 = worldToIso(10, -122, 0.5);

    // Outer white carpet border
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originX + r0.x, originY + r0.y);
    ctx.lineTo(originX + r1.x, originY + r1.y);
    ctx.lineTo(originX + r2.x, originY + r2.y);
    ctx.lineTo(originX + r3.x, originY + r3.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner Golden Illuminated Glass Runway Panels (photo 9 - מסלול זכוכית מואר בזהב)
    const g0 = worldToIso(16, -176, 0.8);
    const g1 = worldToIso(140, -176, 0.8);
    const g2 = worldToIso(140, -134, 0.8);
    const g3 = worldToIso(16, -134, 0.8);
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(originX + g0.x, originY + g0.y);
    ctx.lineTo(originX + g1.x, originY + g1.y);
    ctx.lineTo(originX + g2.x, originY + g2.y);
    ctx.lineTo(originX + g3.x, originY + g3.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pixel-art glass grid & sparkling golden micro-LEDs inside the glass runway
    for (let rx = 24; rx <= 132; rx += 18) {
      const lTop = worldToIso(rx, -176, 1);
      const lBot = worldToIso(rx, -134, 1);
      ctx.strokeStyle = 'rgba(202, 138, 4, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(originX + lTop.x, originY + lTop.y);
      ctx.lineTo(originX + lBot.x, originY + lBot.y);
      ctx.stroke();

      for (const ry of [-166, -155, -144]) {
        const dotIso = worldToIso(rx - 6, ry, 1);
        const tw = (Math.sin(discoBeatPhase * 3 + rx + ry) + 1) * 0.5;
        pxRect(
          ctx,
          originX + dotIso.x - 1,
          originY + dotIso.y - 1,
          3,
          3,
          tw > 0.5 ? '#ffffff' : '#f59e0b'
        );
      }
    }
  }
}

/**
 * 4. Renders the Hatzar HaMalka Raised DJ Stage, Giant Animated LED Video Wall,
 *    and Ribbed Wooden Bar with Purple Underglow (photos 6, 10, 13).
 */
export function drawPixelDjStageAndLedWall(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  discoBeatPhase: number,
  drawIsoBox: (
    ox: number,
    oy: number,
    wx: number,
    wy: number,
    w: number,
    d: number,
    h: number,
    top: string,
    left: string,
    right: string,
    stroke?: string,
    zBase?: number
  ) => void
) {
  // 1. Raised Dark Stage Platform under DJ Booth (photo 6 & 13)
  drawIsoBox(
    originX,
    originY,
    -148,
    -276,
    98,
    48,
    8,
    '#111114',
    '#18181b',
    '#0c0c0e',
    '#27272a',
    0
  );

  // 2. Giant Overhead Animated Pixel-Art LED Video Wall behind the DJ (photos 6 & 13)
  const screenBL = worldToIso(-142, -272, 46);
  const screenBR = worldToIso(-54, -272, 46);
  const screenTR = worldToIso(-54, -272, 128);
  const screenTL = worldToIso(-142, -272, 128);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(originX + screenBL.x, originY + screenBL.y);
  ctx.lineTo(originX + screenBR.x, originY + screenBR.y);
  ctx.lineTo(originX + screenTR.x, originY + screenTR.y);
  ctx.lineTo(originX + screenTL.x, originY + screenTL.y);
  ctx.closePath();

  ctx.restore();

  // Gold / green LED fiber swirls (like the venue's video wall) with a thin black bezel
  drawFiberSwirls(
    ctx,
    (u, v) => {
      const p = worldToIso(-142 + u, -272, 128 - v);
      return { x: originX + p.x, y: originY + p.y };
    },
    88,
    82,
    discoBeatPhase,
    9.1
  );
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(originX + screenBL.x, originY + screenBL.y);
  ctx.lineTo(originX + screenBR.x, originY + screenBR.y);
  ctx.lineTo(originX + screenTR.x, originY + screenTR.y);
  ctx.lineTo(originX + screenTL.x, originY + screenTL.y);
  ctx.closePath();
  ctx.stroke();

  // 3. Illuminated White/Cyan LED DJ Console Booth (photo 6)
  drawIsoBox(
    originX,
    originY,
    -130,
    -265,
    70,
    34,
    38,
    '#141418',
    '#0f0f12',
    '#0b0b0e',
    '#3f3f46',
    8
  );

  // Animated Pixel LED Equalizer Bars on the front face of the DJ booth
  const eqColors = ['#ffffff', '#38bdf8', '#ec4899', '#fbbf24', '#a855f7', '#22d3ee'];
  for (let b = 0; b < 6; b++) {
    const barWx = -122 + b * 9.5;
    const barH = 10 + Math.abs(Math.sin(discoBeatPhase * 2.6 + b * 0.9)) * 20;
    const bIso = worldToIso(barWx, -230, 14);
    pxRect(ctx, originX + bIso.x - 3, originY + bIso.y - barH, 5, barH, eqColors[b % eqColors.length]);
  }

  // Dual Vinyl Turntables & Glowing DJ Laptop on top of console
  const deckLIso = worldToIso(-112, -248, 47);
  const deckRIso = worldToIso(-78, -248, 47);
  const djLapIso = worldToIso(-95, -246, 50);
  for (const dIso of [deckLIso, deckRIso]) {
    ctx.fillStyle = '#020617';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(originX + dIso.x, originY + dIso.y, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  pxRect(ctx, originX + djLapIso.x - 7, originY + djLapIso.y - 9, 14, 9, '#38bdf8');

  // DJ Character with Headphones behind the booth
  const djHeadIso = worldToIso(-95, -255, 64);
  const dHx = originX + djHeadIso.x;
  const dHy = originY + djHeadIso.y + Math.sin(discoBeatPhase * 3) * 2;
  ctx.fillStyle = '#eab696';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(dHx, dHy, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(dHx, dHy - 1, 8.5, Math.PI, 0);
  ctx.stroke();
}

/**
 * 5. Renders the Hatzar HaMalka All-White Draped Chuppah with Lush Baby's-Breath Crown,
 *    White Rattan Lounge Benches along the Golden Glass Runway, White Lanterns & Tall Floral Pedestals
 *    (photos 7, 8, 9 - חצר_המלכה_72, 76, 79).
 */
export function drawPixelHatzarChuppah(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  discoBeatPhase: number,
  drawIsoBox: (
    ox: number,
    oy: number,
    wx: number,
    wy: number,
    w: number,
    d: number,
    h: number,
    top: string,
    left: string,
    right: string,
    stroke?: string,
    zBase?: number
  ) => void
) {
  const chuppahIso = worldToIso(115, -185);
  const sx = Math.round(originX + chuppahIso.x);
  const sy = Math.round(originY + chuppahIso.y);

  // 1. White Rattan Lounge Benches & White Floor Lanterns flanking the Glass Runway (photos 7, 8, 9)
  for (const benchX of [36, 68]) {
    for (const benchY of [-186, -124]) {
      const bIso = worldToIso(benchX, benchY, 2);
      const bx = Math.round(originX + bIso.x);
      const by = Math.round(originY + bIso.y);
      // Wooden slat frame + plush white cushion (photos 8 & 9)
      pxRect(ctx, bx - 12, by - 7, 24, 9, '#d6d3d1');
      pxRect(ctx, bx - 11, by - 10, 22, 6, '#ffffff');
      ctx.strokeStyle = '#a8a29e';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 12, by - 10, 24, 12);
    }
  }

  // Tall White Lattice Floral Pedestals & White Candle Lanterns at Runway Entrance (photo 7)
  for (const pedY of [-182, -128]) {
    const pIso = worldToIso(20, pedY, 0);
    const px = Math.round(originX + pIso.x);
    const py = Math.round(originY + pIso.y);

    // Tall white filigree floral stand
    pxRect(ctx, px - 3, py - 28, 6, 28, '#f8fafc');
    // White rose & baby's breath bouquet on top
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(px, py - 31, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py - 33, 7, 0, Math.PI * 2);
    ctx.fill();

    // White Glass Candle Lantern right beside pedestal (photo 7)
    pxRect(ctx, px + 8, py - 12, 6, 12, '#f1f5f9');
    pxRect(ctx, px + 9.5, py - 8, 3, 5, '#fde047');
  }

  // 2. Raised White Stage Platform under the Chuppah
  drawIsoBox(
    originX,
    originY,
    78,
    -215,
    74,
    64,
    7,
    '#ffffff',
    '#e2e8f0',
    '#cbd5e1',
    '#eab308',
    0
  );

  // Small White Draped Kiddush Table
  const kidIso = worldToIso(102, -168, 7);
  pxRect(ctx, originX + kidIso.x - 8, originY + kidIso.y - 14, 16, 14, '#ffffff');
  pxRect(ctx, originX + kidIso.x - 2, originY + kidIso.y - 20, 4, 6, '#fef08a');

  // 3. Curtain of Twinkling Fairy Lights hanging behind the Chuppah (photo 7)
  for (let fx = -38; fx <= 38; fx += 8) {
    for (let fy = 16; fy <= 98; fy += 12) {
      const tw = Math.sin(discoBeatPhase * 3 + fx + fy);
      if (tw > -0.2) {
        pxRect(ctx, sx + fx, sy - fy, 2, 2, tw > 0.4 ? '#ffffff' : '#fef08a');
      }
    }
  }

  // 4. Four Billowing White Chiffon Drape Pillars (tied at the waist like photos 7, 8, 9!)
  const pillars = [
    { px: -46, py: 8 },
    { px: 46, py: 28 },
    { px: -34, py: -14 },
    { px: 34, py: 4 },
  ];
  for (const pil of pillars) {
    const px = sx + pil.px;
    const py = sy + pil.py;

    // Billowing white fabric column cinched in the middle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(px - 7, py - 110);
    ctx.quadraticCurveTo(px - 2, py - 55, px - 6, py);
    ctx.lineTo(px + 6, py);
    ctx.quadraticCurveTo(px + 2, py - 55, px + 7, py - 110);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden tie-back ribbon at waist height
    pxRect(ctx, px - 4, py - 56, 8, 3, '#eab308');
  }

  // 5. Lush All-White Baby's Breath & White Rose Cloud Canopy Top (photos 8 & 9 - כתר גיבסניות לבן עשיר)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx - 52, sy - 102);
  ctx.quadraticCurveTo(sx, sy - 132, sx + 52, sy - 86);
  ctx.lineTo(sx + 40, sy - 112);
  ctx.quadraticCurveTo(sx, sy - 140, sx - 40, sy - 120);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fluffy pixel-art white floral cloud puffs along the entire Chuppah crown
  for (let fx = -48; fx <= 48; fx += 8) {
    const fy = sy - 108 + fx * fx * 0.0055 + fx * 0.15;
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(sx + fx, fy + 2, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fx % 16 === 0 ? '#f8fafc' : '#ffffff';
    ctx.beginPath();
    ctx.arc(sx + fx, fy - 1, 6.2, 0, Math.PI * 2);
    ctx.fill();

    // Warm blush/gold flower accents inside the white cloud (photo 9)
    pxRect(ctx, sx + fx - 1, fy - 2, 3, 3, fx % 24 === 0 ? '#fde68a' : '#ffe4e6');
  }

  // Warm Chuppah Interior Uplight Glow
  const chGlow = ctx.createRadialGradient(sx, sy - 92, 4, sx, sy - 92, 52);
  chGlow.addColorStop(0, 'rgba(254, 240, 138, 0.78)');
  chGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = chGlow;
  ctx.beginPath();
  ctx.arc(sx, sy - 92, 52, 0, Math.PI * 2);
  ctx.fill();
}

