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
 * 1. Renders the Hatzar HaMalka Polished Dark-Slate Concrete Floor,
 *    Purple/Violet & Warm Amber Light Pools, and Illuminated Golden Glass Chuppah Runway.
 */
export function drawHatzarHaMalkaFloor(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  floorSize: number,
  tileStep: number,
  discoBeatPhase: number
) {
  // Base Isometric Tiles: Dark Polished Slate Concrete + Courtyard Travertine Stone + Interactive Dancefloor
  for (let gx = -floorSize; gx < floorSize; gx += tileStep) {
    for (let gy = -floorSize; gy < floorSize; gy += tileStep) {
      const p0 = worldToIso(gx, gy);
      const p1 = worldToIso(gx + tileStep, gy);
      const p2 = worldToIso(gx + tileStep, gy + tileStep);
      const p3 = worldToIso(gx, gy + tileStep);

      const cx = gx + tileStep * 0.5;
      const cy = gy + tileStep * 0.5;
      const isCenterDancefloor = Math.hypot(cx, cy) < 168;
      const isCourtyardStoneZone = gx < -165 && gy < -60;
      const isBanquetWoodZone = gx < -135 && gy >= -60 && gy < 250;
      const isChecker =
        ((Math.round(gx / tileStep) + Math.round(gy / tileStep)) & 1) === 0;
      const tileIdx =
        Math.round(gx / tileStep) * 5 + Math.round(gy / tileStep);

      if (isCenterDancefloor) {
        // White/Silver Glossy Dancefloor washed with purple, cyan, rose & gold LED pixel pulses
        const pulse = Math.sin(discoBeatPhase * 1.4 + tileIdx * 0.75);
        if (pulse > 0.48) {
          ctx.fillStyle = '#a855f7'; // Electric purple
        } else if (pulse < -0.48) {
          ctx.fillStyle = '#38bdf8'; // Concert cyan
        } else if (pulse > 0.1) {
          ctx.fillStyle = isChecker ? '#f8fafc' : '#e2e8f0'; // Glossy white dancefloor (photo 3)
        } else {
          ctx.fillStyle = isChecker ? '#c084fc' : '#f472b6'; // Violet/Pink wash
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      } else if (isCourtyardStoneZone) {
        // Light Gray Travertine Courtyard Tiles around the Olive Tree (photos 1 & 2)
        ctx.fillStyle = isChecker ? '#475569' : '#3f4d5e';
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      } else if (isBanquetWoodZone) {
        // Warm Dark Smoked Parquet / Slate under left banquet tables (photos 11 & 12)
        ctx.fillStyle = isChecker ? '#26212e' : '#1f1b27';
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.18)';
      } else {
        // Sleek Dark Polished Concrete Floor (photos 10, 11, 12, 13)
        ctx.fillStyle = isChecker ? '#1e202b' : '#181a24';
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.18)';
      }

      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(originX + p0.x, originY + p0.y);
      ctx.lineTo(originX + p1.x, originY + p1.y);
      ctx.lineTo(originX + p2.x, originY + p2.y);
      ctx.lineTo(originX + p3.x, originY + p3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pixel-Art Specular Tile Glints on the Dancefloor
      if (isCenterDancefloor) {
        const cIso = worldToIso(cx, cy);
        const glint = Math.sin(discoBeatPhase * 2.4 + tileIdx * 1.9);
        if (glint > 0.55) {
          pxRect(ctx, originX + cIso.x - 2, originY + cIso.y - 2, 4, 4, '#ffffff');
          pxRect(ctx, originX + cIso.x - 4, originY + cIso.y - 1, 8, 2, 'rgba(255,255,255,0.5)');
        }
      }
    }
  }

  // Iconic Electric Purple / Violet Stage Floor Wash Pools (photos 6, 11, 12, 13)
  const purpleWashSpots = [
    { wx: -150, wy: 20, rx: 160, ry: 80, alpha: 0.22 },
    { wx: 130, wy: 90, rx: 150, ry: 75, alpha: 0.20 },
    { wx: -60, wy: -150, rx: 140, ry: 70, alpha: 0.24 },
    { wx: 0, wy: 150, rx: 150, ry: 72, alpha: 0.18 },
  ];
  for (const sp of purpleWashSpots) {
    const pIso = worldToIso(sp.wx, sp.wy);
    const sx = originX + pIso.x;
    const sy = originY + pIso.y;
    const grad = ctx.createRadialGradient(sx, sy, 8, sx, sy, sp.rx);
    grad.addColorStop(0, `rgba(168, 85, 247, ${sp.alpha})`);
    grad.addColorStop(0.55, `rgba(109, 40, 217, ${(sp.alpha * 0.5).toFixed(2)})`);
    grad.addColorStop(1, 'rgba(109, 40, 217, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sp.rx, sp.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

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
 * 2. Renders the Hatzar HaMalka Walls, Vertical Wood Slats with Glowing LED Strips,
 *    Upper Mezzanine Balcony and 3D Chevron Wall.
 *    (Hanging ceiling fixtures are drawn later by drawHatzarHaMalkaCeilingFixtures.)
 */
export function drawHatzarHaMalkaWallsAndCeiling(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  floorSize: number,
  discoBeatPhase: number
) {
  const wallH = 205;
  const wStart = worldToIso(-floorSize, -floorSize, 0);
  const wMid = worldToIso(floorSize, -floorSize, 0);
  const wStartTop = worldToIso(-floorSize, -floorSize, wallH);
  const wMidTop = worldToIso(floorSize, -floorSize, wallH);
  const wLeftEnd = worldToIso(-floorSize, floorSize, 0);
  const wLeftEndTop = worldToIso(-floorSize, floorSize, wallH);

  // A. Right-Back Wall (Dark architectural backdrop with warm wood slats & glowing vertical LED strips)
  ctx.fillStyle = '#1b1622';
  ctx.strokeStyle = '#0f0c14';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(originX + wStart.x, originY + wStart.y);
  ctx.lineTo(originX + wMid.x, originY + wMid.y);
  ctx.lineTo(originX + wMidTop.x, originY + wMidTop.y);
  ctx.lineTo(originX + wStartTop.x, originY + wStartTop.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // B. Left-Back Wall (3D Geometric Chevron/Diamond Wall + Vertical Wood Slats & Mezzanine Balcony)
  ctx.fillStyle = '#21192b';
  ctx.beginPath();
  ctx.moveTo(originX + wStart.x, originY + wStart.y);
  ctx.lineTo(originX + wLeftEnd.x, originY + wLeftEnd.y);
  ctx.lineTo(originX + wLeftEndTop.x, originY + wLeftEndTop.y);
  ctx.lineTo(originX + wStartTop.x, originY + wStartTop.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // C. Vertical Wood Slats & Glowing Vertical Warm-White LED Strips along Right-Back Wall (photos 6, 11, 12, 13)
  for (let wx = -410; wx <= 410; wx += 26) {
    const bIso = worldToIso(wx, -floorSize + 2, 0);
    const tIso = worldToIso(wx, -floorSize + 2, wallH - 8);

    // Warm natural wood slat column
    ctx.strokeStyle = '#78472a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(originX + bIso.x, originY + bIso.y);
    ctx.lineTo(originX + tIso.x, originY + tIso.y);
    ctx.stroke();

    // Glowing vertical LED strip between every second wood slat
    if (Math.abs(Math.round(wx / 26)) % 2 === 0) {
      const lBot = worldToIso(wx + 9, -floorSize + 2, 10);
      const lTop = worldToIso(wx + 9, -floorSize + 2, wallH - 22);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX + lBot.x, originY + lBot.y);
      ctx.lineTo(originX + lTop.x, originY + lTop.y);
      ctx.stroke();

      // Pixel-art hanging warm bulb dots on the vertical slats
      for (const zDot of [48, 88, 128, 165]) {
        const dIso = worldToIso(wx + 9, -floorSize + 3, zDot);
        pxRect(ctx, originX + dIso.x - 1.5, originY + dIso.y - 1.5, 3, 3, '#ffffff');
      }
    }
  }

  // D. Left-Back Wall: 3D Purple-Lit Chevron/Diamond Feature Wall + Vertical Wood & LED Strips (photos 12 & 13)
  for (let wy = -400; wy <= 400; wy += 32) {
    const bIso = worldToIso(-floorSize + 2, wy, 0);
    const mIso = worldToIso(-floorSize + 2, wy, 118);
    const tIso = worldToIso(-floorSize + 2, wy, wallH - 8);

    // Lower section: Vertical wood ribs + glowing vertical LED bars
    ctx.strokeStyle = '#6b3e23';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(originX + bIso.x, originY + bIso.y);
    ctx.lineTo(originX + mIso.x, originY + mIso.y);
    ctx.stroke();

    if (Math.abs(Math.round(wy / 32)) % 2 === 0) {
      const lBot = worldToIso(-floorSize + 3, wy + 12, 8);
      const lMid = worldToIso(-floorSize + 3, wy + 12, 112);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX + lBot.x, originY + lBot.y);
      ctx.lineTo(originX + lMid.x, originY + lMid.y);
      ctx.stroke();
    }

    // Upper section: 3D Geometric Diamond/Chevron Acoustic Panels in Violet/Purple
    const cRight = worldToIso(-floorSize + 2, wy + 16, 156);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(originX + mIso.x, originY + mIso.y);
    ctx.lineTo(originX + cRight.x, originY + cRight.y);
    ctx.lineTo(originX + tIso.x, originY + tIso.y);
    ctx.stroke();
  }

  // E. Upper Mezzanine Gallery Balcony with Steel Beam & Crisscross Railing (photos 6, 11, 12)
  {
    const mezZ = 118;
    const railZ = 144;
    const mL0 = worldToIso(-floorSize + 4, -floorSize + 4, mezZ);
    const mL1 = worldToIso(-floorSize + 4, floorSize - 20, mezZ);
    const mR1 = worldToIso(floorSize - 20, -floorSize + 4, mezZ);

    const rL0 = worldToIso(-floorSize + 4, -floorSize + 4, railZ);
    const rL1 = worldToIso(-floorSize + 4, floorSize - 20, railZ);
    const rR1 = worldToIso(floorSize - 20, -floorSize + 4, railZ);

    // Dark steel mezzanine floor beam
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(originX + mL1.x, originY + mL1.y);
    ctx.lineTo(originX + mL0.x, originY + mL0.y);
    ctx.lineTo(originX + mR1.x, originY + mR1.y);
    ctx.stroke();

    // Warm wooden top handrail
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(originX + rL1.x, originY + rL1.y);
    ctx.lineTo(originX + rL0.x, originY + rL0.y);
    ctx.lineTo(originX + rR1.x, originY + rR1.y);
    ctx.stroke();
  }
}

/**
 * Ceiling-hung fixtures (fairy-light curtain, rattan dome chandeliers, mirror spheres).
 * Drawn in a separate pass AFTER all floor actors so walking characters never cover them.
 */
export function drawHatzarHaMalkaCeilingFixtures(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  discoBeatPhase: number
) {
  // F. Cascading Cylindrical Curtain of Twinkling Fairy Lights over the Dancefloor (photo 3 - חצר_המלכה_41)
  {
    const curtainCenter = worldToIso(0, 0, 185);
    const cx = originX + curtainCenter.x;
    const cy = originY + curtainCenter.y;
    const ringRx = 72;
    const ringRy = 34;

    // Dark ceiling truss ring
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, ringRx, ringRy, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 24 vertical strands of twinkling pixel fairy lights hanging down
    const strandCount = 24;
    for (let s = 0; s < strandCount; s++) {
      const ang = (s / strandCount) * Math.PI * 2;
      const sx = cx + Math.cos(ang) * ringRx;
      const sy = cy + Math.sin(ang) * ringRy;
      const strandLen = 46 + (s % 3) * 8;

      ctx.strokeStyle = 'rgba(254, 240, 138, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + strandLen);
      ctx.stroke();

      for (let by = 6; by <= strandLen; by += 8) {
        const twinkle = Math.sin(discoBeatPhase * 4 + s * 1.3 + by * 0.4);
        if (twinkle > -0.3) {
          pxRect(
            ctx,
            sx - 1,
            sy + by,
            2,
            2,
            twinkle > 0.45 ? '#ffffff' : '#fde047'
          );
        }
      }
    }
  }

  // G. Giant Woven Rattan / Wicker Dome Chandeliers (photos 4, 6, 11, 12, 13 - אהילי קש/ראטן ענקיים)
  const rattanDomes = [
    { wx: -185, wy: -15, z: 182, rad: 30 },
    { wx: -145, wy: 155, z: 178, rad: 27 },
    { wx: 145, wy: 85, z: 182, rad: 29 },
  ];
  for (const dome of rattanDomes) {
    const dIso = worldToIso(dome.wx, dome.wy, dome.z);
    const sx = Math.round(originX + dIso.x);
    const sy = Math.round(originY + dIso.y);
    const r = dome.rad;

    // Suspension cable
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r - 28);
    ctx.lineTo(sx, sy - r);
    ctx.stroke();

    // Warm inner ambient glow
    const glow = ctx.createRadialGradient(sx, sy + 4, 4, sx, sy + 4, r * 2.1);
    glow.addColorStop(0, 'rgba(254, 240, 138, 0.65)');
    glow.addColorStop(0.5, 'rgba(245, 158, 11, 0.22)');
    glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy + 4, r * 2.1, 0, Math.PI * 2);
    ctx.fill();

    // Pixel-Art Woven Rattan Dome Body (stepped horizontal ribs & vertical spine)
    ctx.fillStyle = 'rgba(180, 83, 9, 0.42)';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, r, Math.PI, 0, false);
    ctx.ellipse(sx, sy, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Horizontal woven rattan ribs (pixel-art slatted cage look from photo 6)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.3;
    for (let rib = 1; rib <= 4; rib++) {
      const ry = sy - (rib / 5) * r;
      const rw = Math.sqrt(Math.max(0, r * r - ((rib / 5) * r) ** 2));
      ctx.beginPath();
      ctx.moveTo(sx - rw, ry);
      ctx.lineTo(sx + rw, ry);
      ctx.stroke();
    }

    // Inner glowing ring chandelier inside the rattan dome
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(sx, sy + 2, r * 0.48, r * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // H. Giant Reflective Rose-Gold / Copper Mirror Spheres (photo 10 - כדורי מראה נחושת ורוז-גולד)
  const mirrorSpheres = [
    { wx: -75, wy: -120, z: 186, r: 16 },
    { wx: 55, wy: -95, z: 192, r: 19 },
    { wx: -20, wy: -155, z: 176, r: 14 },
  ];
  for (const sp of mirrorSpheres) {
    const sIso = worldToIso(sp.wx, sp.wy, sp.z);
    const sx = Math.round(originX + sIso.x);
    const sy = Math.round(originY + sIso.y);

    // Wire
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx, sy - sp.r - 22);
    ctx.lineTo(sx, sy - sp.r);
    ctx.stroke();

    // Metallic Rose-Gold & Magenta Mirror Gradient
    const mGrad = ctx.createRadialGradient(
      sx - sp.r * 0.3,
      sy - sp.r * 0.3,
      2,
      sx,
      sy,
      sp.r
    );
    mGrad.addColorStop(0, '#ffffff');
    mGrad.addColorStop(0.28, '#f472b6'); // Magenta reflection (photo 10)
    mGrad.addColorStop(0.65, '#d97706'); // Copper/rose-gold body
    mGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, sp.r, 0, Math.PI * 2);
    ctx.fill();

    // Pixel-art specular glint cross
    pxRect(ctx, sx - sp.r * 0.35 - 1, sy - sp.r * 0.35 - 3, 2, 6, '#ffffff');
    pxRect(ctx, sx - sp.r * 0.35 - 3, sy - sp.r * 0.35 - 1, 6, 2, '#ffffff');
  }
}

/**
 * 3. Renders the Iconic Ancient Olive Tree in a White Planter with Wrap-Around Wooden Bench
 *    & Boho White Macramé Fringe Parasol from the Courtyard Reception (photos 1 & 2 - חצר_המלכה_26, 39).
 */
export function drawPixelOliveTreeAndMacrame(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  wx: number,
  wy: number,
  discoBeatPhase: number
) {
  const baseIso = worldToIso(wx, wy, 0);
  const sx = Math.round(originX + baseIso.x);
  const sy = Math.round(originY + baseIso.y);

  ctx.save();

  // 1. Round White Stone Planter Base & Wrap-Around Wooden Bench (photo 1)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 6, 48, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  // White stone cylindrical planter wall
  ctx.fillStyle = '#f1f5f9';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 38, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(sx - 38, sy - 14, 76, 14);
  ctx.strokeRect(sx - 38, sy - 14, 76, 14);

  // Wrap-around warm wood slatted bench Rim (photo 1 & 2)
  ctx.fillStyle = '#b45309';
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 14, 43, 21.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner planter bed with green uplighted foliage/ferns (photo 1)
  ctx.fillStyle = '#14532d';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 14, 31, 15.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Green uplight glow at base of olive trunk
  for (let i = -20; i <= 20; i += 8) {
    pxRect(ctx, sx + i - 2, sy - 18 - (Math.abs(i) % 5), 4, 7, '#4ade80');
    pxRect(ctx, sx + i - 1, sy - 20, 2, 4, '#bef264');
  }

  // 2. Gnarled Pixel-Art Ancient Olive Tree Trunk (גזע עץ זית עתיק מפוסל)
  const trunkColors = ['#5c4033', '#78523b', '#8c6246', '#3e2723'];
  for (let h = 0; h < 42; h += 4) {
    const twist = Math.sin(h * 0.15) * 4;
    const w = 22 - h * 0.22;
    pxRect(ctx, sx - w * 0.5 + twist, sy - 18 - h, w, 5, trunkColors[(h / 4) % trunkColors.length]);
  }
  // Left & Right main olive branches
  for (let b = 0; b < 20; b += 4) {
    pxRect(ctx, sx - 12 - b * 0.8, sy - 54 - b, 8, 5, '#5c4033');
    pxRect(ctx, sx + 6 + b * 0.8, sy - 52 - b, 8, 5, '#78523b');
  }

  // 3. Lush Silver-Green Pixel-Art Olive Foliage Canopy
  const canopyClusters = [
    { dx: 0, dy: -82, rx: 36, ry: 18, c: '#3f6212' },
    { dx: -22, dy: -74, rx: 26, ry: 14, c: '#4d7c0f' },
    { dx: 24, dy: -72, rx: 26, ry: 14, c: '#365314' },
    { dx: -10, dy: -90, rx: 28, ry: 14, c: '#65a30d' },
    { dx: 12, dy: -86, rx: 24, ry: 12, c: '#84cc16' },
  ];
  for (const cl of canopyClusters) {
    ctx.fillStyle = cl.c;
    ctx.beginPath();
    ctx.ellipse(sx + cl.dx, sy + cl.dy, cl.rx, cl.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hanging glass terrarium baubles with warm lights inside the olive tree (photo 2)
  for (const bx of [-24, -8, 14, 26]) {
    const by = sy - 64 + (Math.abs(bx) % 7);
    const pulse = 0.6 + 0.4 * Math.sin(discoBeatPhase * 3 + bx);
    ctx.fillStyle = `rgba(254, 240, 138, ${pulse.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(sx + bx, by, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Boho White Macramé Fringe Parasol / Umbrella next to the Olive Tree (photo 1 & 2 - שמשיית מקרמה עם פרנזים)
  const umbX = sx + 48;
  const umbY = sy + 8;
  // Wooden pole
  pxRect(ctx, umbX - 2, umbY - 62, 4, 62, '#b45309');
  // Cream/White Macramé Canopy
  ctx.fillStyle = '#fefce8';
  ctx.strokeStyle = '#d6d3d1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(umbX - 28, umbY - 46);
  ctx.quadraticCurveTo(umbX, umbY - 68, umbX + 28, umbY - 46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hanging Pixel-Art Macramé Tassel Fringes along the bottom rim of the umbrella (photo 1)
  for (let fx = -26; fx <= 26; fx += 4) {
    const tasselSway = Math.sin(discoBeatPhase * 2 + fx) * 0.8;
    pxRect(ctx, umbX + fx + tasselSway, umbY - 46, 2, 9, '#f5f5f4');
    pxRect(ctx, umbX + fx, umbY - 49, 2, 2, '#a8a29e'); // Macramé knot pattern
  }

  ctx.restore();
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
    '#0f172a',
    '#1e1b4b',
    '#020617',
    '#7c3aed',
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

  const ledGrad = ctx.createLinearGradient(
    originX + screenTL.x,
    originY + screenTL.y,
    originX + screenBR.x,
    originY + screenBR.y
  );
  ledGrad.addColorStop(0, '#1e1b4b');
  ledGrad.addColorStop(0.45, '#7e22ce');
  ledGrad.addColorStop(0.8, '#38bdf8');
  ledGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = ledGrad;
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Animated Pixel Wave Ribbons on the Giant LED Screen (like photo 13)
  ctx.clip();
  for (let w = 0; w < 14; w++) {
    const wx = -138 + w * 6;
    const waveZ =
      72 +
      Math.sin(discoBeatPhase * 2.5 + w * 0.55) * 18 +
      Math.cos(discoBeatPhase * 1.4 - w * 0.3) * 8;
    const pIso = worldToIso(wx, -271, waveZ);
    pxRect(
      ctx,
      originX + pIso.x - 3,
      originY + pIso.y - 3,
      6,
      6,
      w % 2 === 0 ? '#f472b6' : '#38bdf8'
    );
    pxRect(
      ctx,
      originX + pIso.x - 2,
      originY + pIso.y + 5,
      4,
      4,
      '#fef08a'
    );
  }
  ctx.restore();

  // 3. Illuminated White/Cyan LED DJ Console Booth (photo 6)
  drawIsoBox(
    originX,
    originY,
    -130,
    -265,
    70,
    34,
    38,
    '#1e293b',
    '#38bdf8',
    '#1e1b4b',
    '#e0f2fe',
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

/**
 * 6. Renders a Hatzar HaMalka Banquet Table with Black Chiavari Chairs,
 *    Dark Velvet / Natural Wood Tablecloth, and either Tall Lush Tropical Fan-Palm Leaves
 *    (photo 4 - חצר_המלכה_70) or Tall Golden Candelabras & White Orchids (photos 11, 12, 13).
 */
export function drawPixelHatzarBanquetTable(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tableId: number,
  tableName: string,
  prefBorderColor: string,
  prefIcon: string,
  discoBeatPhase: number
) {
  const isWoodTop = tableId % 2 === 1; // Alternating rich natural wood (photo 4) & deep midnight velvet (photo 11/12)

  // 1. Soft Purple/Dark Ground Shadow
  ctx.fillStyle = 'rgba(12, 8, 22, 0.55)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 7, 52, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Black Chiavari Banquet Chairs around the Table Perimeter (photos 4, 11, 13)
  const chairOffsets = [
    { cx: -46, cy: -18 },
    { cx: 46, cy: -18 },
    { cx: -34, cy: -36 },
    { cx: 34, cy: -36 },
    { cx: -34, cy: 2 },
    { cx: 34, cy: 2 },
  ];
  for (const ch of chairOffsets) {
    // Black Chiavari backrest with vertical spindles
    pxRect(ctx, sx + ch.cx - 5, sy + ch.cy - 18, 10, 14, '#0f172a');
    pxRect(ctx, sx + ch.cx - 3, sy + ch.cy - 16, 2, 10, '#334155');
    pxRect(ctx, sx + ch.cx + 1, sy + ch.cy - 16, 2, 10, '#334155');
  }

  // 3. Draped Table Skirt (Deep Navy/Black Velvet or Sculpted Pedestal)
  ctx.fillStyle = isWoodTop ? '#292524' : '#0f172a';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 45, 22.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillRect(sx - 45, sy - 24, 90, 24);
  ctx.strokeRect(sx - 45, sy - 24, 90, 24);

  // Subtle vertical pleat lines on dark tablecloth
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 1;
  for (const fx of [-32, -18, -6, 6, 18, 32]) {
    ctx.beginPath();
    ctx.moveTo(sx + fx, sy - 22);
    ctx.lineTo(sx + fx, sy + 12);
    ctx.stroke();
  }

  // 4. Table Top Surface (Natural Warm Oak Wood from photo 4 OR Midnight Slate Velvet from photo 11/12)
  ctx.fillStyle = isWoodTop ? '#78472a' : '#1e293b';
  ctx.strokeStyle = prefBorderColor;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 24, 45, 22.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Woven Cream Macramé / Lace Center Mat (photo 4)
  ctx.fillStyle = isWoodTop ? '#f5f5f4' : '#334155';
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 24, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 5. Crisp White Porcelain Dinner Plates, Black Napkins & Crystal Wine Glasses (photo 4 & 11)
  const settings = [
    { px: -28, py: -27 },
    { px: 28, py: -27 },
    { px: -20, py: -14 },
    { px: 20, py: -14 },
    { px: -18, py: -35 },
    { px: 18, py: -35 },
  ];
  for (const st of settings) {
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(sx + st.px, sy + st.py, 6, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Black folded napkin on plate (photo 4)
    pxRect(ctx, sx + st.px - 2.5, sy + st.py - 1, 5, 2, '#0f172a');
    // Crystal wine glass
    pxRect(ctx, sx + st.px + 5, sy + st.py - 5, 2.5, 3.5, '#e0f2fe');
  }

  // 6. Signature Hatzar HaMalka Centerpiece:
  // Odd tables: Giant Lush Tropical Fan-Palm Leaves in tall black vase + white candles (photo 4 - חצר_המלכה_70)
  // Even tables: Tall Golden Candelabra / Geometric Stand with cascading white orchids (photos 11 & 13)
  if (isWoodTop) {
    // Tall black vase + white pillar candles at base
    pxRect(ctx, sx - 2.5, sy - 38, 5, 14, '#09090b');
    pxRect(ctx, sx - 9, sy - 30, 3, 6, '#ffffff');
    pxRect(ctx, sx + 6, sy - 30, 3, 6, '#ffffff');
    pxRect(ctx, sx - 8.5, sy - 32, 2, 2, '#fde047');
    pxRect(ctx, sx + 6.5, sy - 32, 2, 2, '#fde047');

    // Lush Tropical Fan-Palm Fronds fanning out above the table (photo 4)
    const fronds = [
      { dx: -14, dy: -50, rx: 10, ry: 5, ang: -0.4, c: '#15803d' },
      { dx: 14, dy: -50, rx: 10, ry: 5, ang: 0.4, c: '#15803d' },
      { dx: 0, dy: -55, rx: 11, ry: 7, ang: 0, c: '#16a34a' },
      { dx: -7, dy: -53, rx: 8, ry: 5, ang: -0.2, c: '#22c55e' },
      { dx: 7, dy: -53, rx: 8, ry: 5, ang: 0.2, c: '#22c55e' },
    ];
    for (const fr of fronds) {
      ctx.fillStyle = fr.c;
      ctx.beginPath();
      ctx.ellipse(sx + fr.dx, sy + fr.dy, fr.rx, fr.ry, fr.ang, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Tall Golden Geometric Stand + 5-Branch Candelabra & Cascading White Orchids (photos 11 & 13)
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(sx - 5, sy - 50, 10, 25);

    // Cascading white orchids & greenery crown on top
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(sx, sy - 53, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx - 4, sy - 54, 5, 0, Math.PI * 2);
    ctx.arc(sx + 4, sy - 54, 5, 0, Math.PI * 2);
    ctx.arc(sx, sy - 57, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Flickering warm candle flames
    const flicker = Math.sin(discoBeatPhase * 4 + tableId) * 0.8;
    for (const cxOff of [-9, 0, 9]) {
      pxRect(ctx, sx + cxOff - 1, sy - 46, 2, 5, '#ffffff');
      pxRect(ctx, sx + cxOff - 1 + flicker * 0.4, sy - 49, 2.5, 2.5, '#fde047');
    }
  }

  // 7. Compact Table Number & Preferred Magnet Frame Pill (#1 👑)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = prefBorderColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(sx - 18, sy - 11, 36, 12, [4]);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 7.5px "Heebo", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`#${tableId} ${prefIcon}`, sx, sy - 2.5);
}

/**
 * 7. Renders the Hatzar HaMalka Curved Ribbed-Wood Cocktail Bar with Purple LED Underglow,
 *    Black Marble Countertop, Hanging Glass Rack & Illuminated Bottle Display (photo 10 - חצר_המלכה_43).
 */
export function drawPixelRibbedWoodBar(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  wx: number,
  wy: number,
  discoBeatPhase: number
) {
  const barIso = worldToIso(wx, wy, 0);
  const sx = Math.round(originX + barIso.x);
  const sy = Math.round(originY + barIso.y);

  ctx.save();

  // 1. Electric Purple / Magenta Floor Wash Underglow (photo 10)
  const glow = ctx.createRadialGradient(sx, sy + 6, 8, sx, sy + 6, 62);
  glow.addColorStop(0, 'rgba(217, 70, 239, 0.55)');
  glow.addColorStop(0.55, 'rgba(147, 51, 234, 0.25)');
  glow.addColorStop(1, 'rgba(147, 51, 234, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 6, 62, 31, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Curved Ribbed Vertical Wood-Slat Bar Front (דלפק בר עץ מחורץ מעוגל)
  ctx.fillStyle = '#451a03';
  ctx.strokeStyle = '#d946ef';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 46, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#78350f';
  ctx.fillRect(sx - 46, sy - 24, 92, 24);

  // Vertical pixel-art wood slats along the curved bar facade
  for (let rx = -42; rx <= 42; rx += 6) {
    pxRect(ctx, sx + rx, sy - 23, 3, 24, rx % 12 === 0 ? '#b45309' : '#92400e');
  }

  // 3. Sleek Dark Granite / Black Marble Bar Countertop with Warm Under-Lip LED
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 24, 48, 23, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 4. Center Illuminated Bottle Island & Bartender Cocktail Shaker
  pxRect(ctx, sx - 16, sy - 34, 32, 10, '#1e1b4b');
  const bottleColors = ['#38bdf8', '#f43f5e', '#fbbf24', '#4ade80', '#a855f7', '#fb923c'];
  for (let b = 0; b < 6; b++) {
    const bx = sx - 13 + b * 5;
    pxRect(ctx, bx, sy - 41, 3, 7, bottleColors[b]);
    pxRect(ctx, bx + 0.5, sy - 43, 2, 2, '#ffffff');
  }

  // Overhead Black Metal Hanging Wine-Glass Rack above the bar (photo 10)
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(sx - 28, sy - 68, 56, 8);
  // Hanging crystal glasses glinting under the rack
  for (let gx = -22; gx <= 22; gx += 8) {
    const glint = Math.sin(discoBeatPhase * 3 + gx) > 0.2 ? '#ffffff' : '#bae6fd';
    pxRect(ctx, sx + gx - 1, sy - 60, 2, 5, glint);
  }

  ctx.restore();
}

