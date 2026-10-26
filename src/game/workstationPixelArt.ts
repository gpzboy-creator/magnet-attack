/**
 * Authentic Pixel-Art Renderers & Animations for the Wedding Magnet Workstation:
 * 1. Mitsubishi Electric White Thermal Photo Printer (matching attached photo images_2d9246ef.jpg)
 * 2. KW-triO 3925 Blue Guillotine Magnet Cutter (matching attached photo 3507_100620211652394_138ea7bb.jpg)
 * 3. Pro Editing Laptop with 4-Photo Magnet Sheet Layout & USB Data Stream
 *
 * All sprites are drawn on a low-resolution integer pixel canvas and scaled with
 * `imageSmoothingEnabled = false` for crisp, authentic arcade pixel art.
 */

export interface PrinterPixelAnimState {
  isPrinting: boolean;
  /** Progress of current sheet being ejected (0.0 to 1.0, where 1 sheet = 4 photos = 0.5s) */
  sheetProgress: number;
  /** 1-based index of the current sheet being printed */
  currentSheet: number;
  /** Total sheets in the current print job (Math.ceil(photos / 4)) */
  totalSheets: number;
  /** Number of sheets already sitting in the output tray (from current job or uncut queue) */
  sheetsInTray: number;
  /** Number of photos queued in camera when idle */
  photosQueued: number;
  /** Global animation clock in seconds */
  timeSec: number;
}

export interface CutterPixelAnimState {
  isCutting: boolean;
  /** Progress of current sheet being sliced (0.0 to 1.0, where 1 sheet = 4 photos = 0.5s) */
  cutProgress: number;
  /** 1-based index of the current sheet being cut */
  currentSheet: number;
  /** Total sheets in the current cut job */
  totalSheets: number;
  /** Uncut sheets waiting on the cutter bed */
  uncutSheetsWaiting: number;
  /** Cut magnets produced so far */
  cutMagnetsReady: number;
  /** Global animation clock in seconds */
  timeSec: number;
}

export interface LaptopPixelAnimState {
  isPrinting: boolean;
  isCutting: boolean;
  photosInCamera: number;
  uncutSheets: number;
  sheetProgress: number;
  currentSheet: number;
  totalSheets: number;
  timeSec: number;
}

// Reusable offscreen pixel buffer canvases keyed by resolution
const pixelBuffers = new Map<string, HTMLCanvasElement>();

function getPixelBuffer(pw: number, ph: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} | null {
  if (typeof document === 'undefined') return null;
  const key = `${pw}x${ph}`;
  let canvas = pixelBuffers.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = pw;
    canvas.height = ph;
    pixelBuffers.set(key, canvas);
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, pw, ph);
  return { canvas, ctx };
}

function pRect(
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

function pLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string
) {
  ctx.fillStyle = color;
  let ix0 = Math.round(x0);
  let iy0 = Math.round(y0);
  const ix1 = Math.round(x1);
  const iy1 = Math.round(y1);
  const dx = Math.abs(ix1 - ix0);
  const dy = Math.abs(iy1 - iy0);
  const sx = ix0 < ix1 ? 1 : -1;
  const sy = iy0 < iy1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    ctx.fillRect(ix0, iy0, 1, 1);
    if (ix0 === ix1 && iy0 === iy1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      ix0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      iy0 += sy;
    }
  }
}

/**
 * Draws a 4-photo wedding magnet sheet in pixel art (2x2 grid of colorful portraits on a white sheet)
 */
function drawPixelFourPhotoSheet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed = 0,
  clipTopY?: number
) {
  const startY = clipTopY !== undefined ? Math.max(y, clipTopY) : y;
  const endY = y + h;
  if (endY <= startY) return;

  ctx.save();
  if (clipTopY !== undefined) {
    ctx.beginPath();
    ctx.rect(0, Math.round(clipTopY), 999, 999);
    ctx.clip();
  }

  // Dark magnetic rubber backing shadow (1px offset)
  pRect(ctx, x + 1, y + 1, w, h, '#0f172a');
  // Glossy white photo paper sheet
  pRect(ctx, x, y, w, h, '#ffffff');
  // Subtle cyan/silver sheet border
  pRect(ctx, x, y, w, 1, '#bae6fd');
  pRect(ctx, x, y + h - 1, w, 1, '#94a3b8');
  pRect(ctx, x, y, 1, h, '#cbd5e1');
  pRect(ctx, x + w - 1, y, 1, h, '#94a3b8');

  // 2x2 grid of 4 mini wedding photos on the sheet
  const padX = 2;
  const padY = 2;
  const cellW = Math.max(3, Math.floor((w - padX * 2 - 1) / 2));
  const cellH = Math.max(2, Math.floor((h - padY * 2 - 1) / 2));
  const bgColors = ['#38bdf8', '#f472b6', '#fbbf24', '#a78bfa'];
  const outfitColors = ['#1e293b', '#e11d48', '#0284c7', '#15803d'];

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const idx = (row * 2 + col + seed) % 4;
      const cx = x + padX + col * (cellW + 1);
      const cy = y + padY + row * (cellH + 1);
      // Photo background
      pRect(ctx, cx, cy, cellW, cellH, bgColors[idx]);
      // Tiny pixel couple heads & outfits inside each photo
      if (cellW >= 5 && cellH >= 3) {
        pRect(ctx, cx + 1, cy + 1, 2, 1, '#fde68a'); // Head 1
        pRect(ctx, cx + 1, cy + 2, 2, Math.max(1, cellH - 2), outfitColors[idx]);
        pRect(ctx, cx + cellW - 3, cy + 1, 2, 1, '#fed7aa'); // Head 2
        pRect(ctx, cx + cellW - 3, cy + 2, 2, Math.max(1, cellH - 2), '#ffffff'); // Bride dress
      }
    }
  }

  ctx.restore();
}

/**
 * 1. Renders the Mitsubishi Electric White Thermal Photo Printer in crisp Pixel Art
 *    (Faithful to attached reference photo `images_2d9246ef.jpg`)
 */
export function drawPixelThermalPrinter(
  targetCtx: CanvasRenderingContext2D,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  state: PrinterPixelAnimState,
  options?: { transparentBg?: boolean }
) {
  const pw = 112;
  const ph = 78;
  const buf = getPixelBuffer(pw, ph);
  if (!buf) return;
  const { canvas, ctx } = buf;

  if (!options?.transparentBg) {
    // Dark studio backdrop with subtle pixel vignette grid
    pRect(ctx, 0, 0, pw, ph, '#0f172a');
    for (let gx = 0; gx < pw; gx += 8) {
      pRect(ctx, gx, 0, 1, ph, '#1e293b');
    }
    for (let gy = 0; gy < ph; gy += 8) {
      pRect(ctx, 0, gy, pw, 1, '#1e293b');
    }
    // Warm wooden table surface at bottom
    pRect(ctx, 0, 56, pw, 22, '#78350f');
    pRect(ctx, 0, 56, pw, 2, '#b45309');
    pRect(ctx, 0, 58, pw, 2, '#92400e');
  }

  // Subtle 1px mechanical vibration while thermal head is actively printing a sheet
  const vibY = state.isPrinting && Math.floor(state.timeSec * 28) % 2 === 0 ? -1 : 0;
  const ox = 10;
  const oy = 6 + vibY;

  // Drop shadow under printer on table
  pRect(ctx, ox - 2, oy + 52, 88, 6, 'rgba(2, 6, 23, 0.55)');

  // ==========================================================================
  // TOP COVER (3/4 perspective receding to the upper-right, matching photo)
  // ==========================================================================
  for (let row = 0; row < 16; row++) {
    const shiftX = Math.floor(row * 1.25);
    const y = oy + 16 - row;
    const x = ox + shiftX;
    const w = 68 - Math.floor(row * 0.25);
    pRect(ctx, x, y, w, 1, row === 15 ? '#cbd5e1' : row < 4 ? '#f8fafc' : '#e2e8f0');
  }

  // Top rear silver specification decal strip (visible at back-top of printer in photo)
  pRect(ctx, ox + 22, oy + 3, 44, 3, '#cbd5e1');
  pRect(ctx, ox + 24, oy + 4, 16, 1, '#64748b');
  pRect(ctx, ox + 44, oy + 4, 18, 1, '#64748b');

  // Top cover seam lines (front-top access lid seam from photo)
  pLine(ctx, ox + 8, oy + 13, ox + 58, oy + 13, '#94a3b8');
  pLine(ctx, ox + 8, oy + 13, ox + 13, oy + 9, '#94a3b8');
  pLine(ctx, ox + 58, oy + 13, ox + 63, oy + 9, '#94a3b8');

  // ==========================================================================
  // RIGHT 3D SIDE WALL (Shaded medium cool grey with vertical rear cooling vents)
  // ==========================================================================
  for (let col = 0; col < 20; col++) {
    const sx = ox + 68 + col;
    const topY = oy + 16 - Math.floor(col * 0.8);
    const botY = oy + 55 - Math.floor(col * 0.75);
    pRect(ctx, sx, topY, 1, botY - topY, col < 2 ? '#cbd5e1' : '#94a3b8');
  }
  // Right side wall outline & panel seams
  pLine(ctx, ox + 68, oy + 16, ox + 87, oy + 1, '#64748b');
  pLine(ctx, ox + 87, oy + 1, ox + 87, oy + 40, '#475569');
  pLine(ctx, ox + 68, oy + 55, ox + 87, oy + 40, '#334155');

  // Vertical cooling vent grille louvers at back-right of side wall (exact match to photo!)
  for (let vx = 0; vx < 3; vx++) {
    const gx = ox + 79 + vx * 2;
    const gyTop = oy + 8 - vx;
    for (let vy = 0; vy < 24; vy += 2) {
      pRect(ctx, gx, gyTop + vy, 1, 1, '#475569');
    }
  }
  // Small circular hinge/lock hole on lower front-right side wall
  pRect(ctx, ox + 71, oy + 42, 2, 3, '#334155');

  // ==========================================================================
  // FRONT FACADE (Upper housing + Left & Right Feet Pillars + Recessed Catch Bay)
  // ==========================================================================
  // Main front upper block
  pRect(ctx, ox, oy + 16, 68, 19, '#f1f5f9');
  pRect(ctx, ox, oy + 16, 68, 1, '#ffffff'); // Crisp top highlight
  pRect(ctx, ox, oy + 34, 68, 1, '#cbd5e1'); // Mid horizontal seam

  // Left vertical pillar & foot (extends down to oy + 53)
  pRect(ctx, ox, oy + 35, 13, 18, '#e2e8f0');
  pRect(ctx, ox + 13, oy + 35, 3, 16, '#94a3b8'); // Inner pillar bevel

  // Right vertical pillar & foot (extends down to oy + 55)
  pRect(ctx, ox + 53, oy + 35, 15, 20, '#e2e8f0');
  pRect(ctx, ox + 51, oy + 35, 2, 18, '#94a3b8'); // Inner pillar bevel
  // Rectangular latch cover on right pillar
  pRect(ctx, ox + 61, oy + 38, 6, 9, '#cbd5e1');
  pRect(ctx, ox + 62, oy + 39, 4, 7, '#e2e8f0');

  // Lower recessed paper catch bay between the left and right pillars
  pRect(ctx, ox + 15, oy + 35, 37, 15, '#cbd5e1');
  pRect(ctx, ox + 15, oy + 35, 37, 3, '#94a3b8'); // Top inner shadow under slot overhang
  pRect(ctx, ox + 15, oy + 48, 37, 3, '#1e293b'); // Dark bottom tray rail bar

  // Left pillar square push-button (door release button in photo)
  pRect(ctx, ox + 2, oy + 37, 7, 7, '#94a3b8');
  pRect(ctx, ox + 3, oy + 38, 5, 5, '#f8fafc');
  pRect(ctx, ox + 3, oy + 42, 5, 1, '#cbd5e1');

  // ==========================================================================
  // UPPER-LEFT MITSUBISHI BLACK BADGE (from photo)
  // ==========================================================================
  pRect(ctx, ox + 2, oy + 19, 9, 12, '#1e293b');
  pRect(ctx, ox + 3, oy + 20, 7, 10, '#0f172a');
  // Tiny red/white pixel diamond emblem + text lines
  pRect(ctx, ox + 6, oy + 21, 1, 1, '#ef4444');
  pRect(ctx, ox + 5, oy + 22, 3, 1, '#ef4444');
  pRect(ctx, ox + 4, oy + 24, 5, 1, '#cbd5e1');
  pRect(ctx, ox + 4, oy + 27, 4, 1, '#64748b');

  // ==========================================================================
  // UPPER-RIGHT LED CONTROL PANEL (from photo)
  // ==========================================================================
  pRect(ctx, ox + 55, oy + 20, 10, 13, '#1e293b');
  pRect(ctx, ox + 56, oy + 21, 8, 11, '#0f172a');
  // LED 1: POWER (Green)
  pRect(ctx, ox + 58, oy + 23, 2, 2, '#22c55e');
  pRect(ctx, ox + 61, oy + 23, 2, 1, '#94a3b8');
  // LED 2: PRINT / DATA (Blinking Cyan when printing, Amber when queued, dim when idle)
  const printLedColor = state.isPrinting
    ? Math.floor(state.timeSec * 16) % 2 === 0
      ? '#38bdf8'
      : '#fef08a'
    : state.photosQueued > 0
    ? '#f59e0b'
    : '#334155';
  pRect(ctx, ox + 58, oy + 26, 2, 2, printLedColor);
  pRect(ctx, ox + 61, oy + 26, 2, 1, '#94a3b8');
  // LED 3: RIBBON / PAPER
  pRect(ctx, ox + 58, oy + 29, 2, 2, state.isPrinting ? '#22d3ee' : '#15803d');
  pRect(ctx, ox + 61, oy + 29, 2, 1, '#64748b');

  // ==========================================================================
  // UPPER-CENTER PAPER EJECTION SLOT WITH GOLDEN-BRONZE BRUSH STRIP
  // ==========================================================================
  // Recessed white hood around the slot
  pRect(ctx, ox + 13, oy + 19, 40, 14, '#e2e8f0');
  pRect(ctx, ox + 14, oy + 20, 38, 8, '#cbd5e1');
  // Deep slot opening
  pRect(ctx, ox + 15, oy + 21, 36, 5, '#0f172a');

  // Golden-bronze anti-static brush strip across the top of the slot (signature detail of photo!)
  for (let bx = 0; bx < 34; bx++) {
    const brushColor =
      bx % 3 === 0 ? '#78350f' : bx % 3 === 1 ? '#b45309' : '#d97706';
    pRect(ctx, ox + 16 + bx, oy + 22, 1, 3, brushColor);
  }

  // Active thermal dye-sublimation printhead glow inside slot when printing (C/M/Y pass!)
  if (state.isPrinting) {
    const passPhase = (state.sheetProgress * 3) % 1;
    const passColor =
      state.sheetProgress < 0.33
        ? '#fde047' // Yellow dye pass
        : state.sheetProgress < 0.66
        ? '#f43f5e' // Magenta dye pass
        : '#38bdf8'; // Cyan + Overcoat pass
    pRect(ctx, ox + 17, oy + 25, 32, 1, passColor);
    const scanX = ox + 17 + Math.floor(passPhase * 30);
    pRect(ctx, scanX, oy + 24, 3, 2, '#ffffff');
  }

  // ==========================================================================
  // STACK OF COMPLETED SHEETS IN LOWER TRAY + CURRENTLY EJECTING SHEET
  // ==========================================================================
  const visibleCompleted = Math.min(5, Math.max(0, state.sheetsInTray));
  for (let s = 0; s < visibleCompleted; s++) {
    const sy = oy + 46 - s * 2;
    const sx = ox + 19 + (s % 2);
    drawPixelFourPhotoSheet(ctx, sx, sy, 28, 13, s);
  }

  // Currently ejecting sheet sliding out of the slot (`oy + 25` down to `oy + 42`)
  if (state.isPrinting) {
    const p = Math.max(0, Math.min(1, state.sheetProgress));
    // Slide out from slot top (oy + 14) to tray (oy + 38)
    const sheetH = 16;
    const sheetW = 28;
    const sheetX = ox + 19;
    const sheetTopY = Math.round(oy + 11 + p * 28);
    // Clip above slot lip (`oy + 25`) so the sheet genuinely emerges from inside the slot!
    drawPixelFourPhotoSheet(
      ctx,
      sheetX,
      sheetTopY,
      sheetW,
      sheetH,
      state.currentSheet,
      oy + 25
    );
  }

  // Blit pixel buffer to target canvas with nearest-neighbor crispness
  targetCtx.save();
  targetCtx.imageSmoothingEnabled = false;
  targetCtx.drawImage(canvas, destX, destY, destW, destH);
  targetCtx.restore();
}

/**
 * 2. Renders the KW-triO 3925 Blue Guillotine Magnet Cutter in crisp Pixel Art
 *    (Faithful to attached reference photo `3507_100620211652394_138ea7bb.jpg`)
 */
export function drawPixelGuillotineCutter(
  targetCtx: CanvasRenderingContext2D,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  state: CutterPixelAnimState,
  options?: { transparentBg?: boolean }
) {
  const pw = 112;
  const ph = 78;
  const buf = getPixelBuffer(pw, ph);
  if (!buf) return;
  const { canvas, ctx } = buf;

  if (!options?.transparentBg) {
    pRect(ctx, 0, 0, pw, ph, '#0f172a');
    for (let gx = 0; gx < pw; gx += 8) {
      pRect(ctx, gx, 0, 1, ph, '#1e293b');
    }
    for (let gy = 0; gy < ph; gy += 8) {
      pRect(ctx, 0, gy, pw, 1, '#1e293b');
    }
    // Wooden workstation surface at bottom
    pRect(ctx, 0, 56, pw, 22, '#78350f');
    pRect(ctx, 0, 56, pw, 2, '#b45309');
    pRect(ctx, 0, 58, pw, 2, '#92400e');
  }

  // Impact shake when guillotine blade chops down around cutProgress 0.35..0.55
  const isImpact =
    state.isCutting && state.cutProgress >= 0.32 && state.cutProgress <= 0.56;
  const shakeY = isImpact ? 1 : 0;

  // ==========================================================================
  // ISOMETRIC BLUE METAL BASE (`KW-triO 3925` slate-indigo blue `#3b4d8c`)
  // Diamond vertices of the cutting bed:
  // Back-Top: (38, 18), Right-Corner: (90, 36), Front-Bottom: (48, 60), Left-Corner: (8, 38)
  // ==========================================================================
  const topX = 38;
  const topY = 18 + shakeY;

  // Black rubber feet underneath corners (from photo)
  pRect(ctx, 10, 46 + shakeY, 5, 4, '#020617');
  pRect(ctx, 46, 68 + shakeY, 6, 4, '#020617');
  pRect(ctx, 84, 45 + shakeY, 5, 4, '#020617');

  // Fill Isometric Blue Top Bed Polygon using scanlines
  for (let y = 18; y <= 60; y++) {
    let minX = 999;
    let maxX = -999;
    // Left-top edge: (38,18) -> (8,38)
    if (y >= 18 && y <= 38) {
      const t = (y - 18) / 20;
      minX = Math.min(minX, Math.round(38 + t * (8 - 38)));
    }
    // Left-bottom edge: (8,38) -> (48,60)
    if (y >= 38 && y <= 60) {
      const t = (y - 38) / 22;
      minX = Math.min(minX, Math.round(8 + t * (48 - 8)));
    }
    // Right-top edge: (38,18) -> (90,36)
    if (y >= 18 && y <= 36) {
      const t = (y - 18) / 18;
      maxX = Math.max(maxX, Math.round(38 + t * (90 - 38)));
    }
    // Right-bottom edge: (90,36) -> (48,60)
    if (y >= 36 && y <= 60) {
      const t = (y - 36) / 24;
      maxX = Math.max(maxX, Math.round(90 + t * (48 - 90)));
    }
    if (maxX >= minX) {
      pRect(ctx, minX, y + shakeY, maxX - minX + 1, 1, '#3b4d8c');
    }
  }

  // Front-Left Skirt Wall: (8,38) -> (48,60), height 9px (`#253263`)
  for (let x = 8; x <= 48; x++) {
    const t = (x - 8) / 40;
    const edgeY = Math.round(38 + t * 22) + shakeY;
    pRect(ctx, x, edgeY, 1, 9, '#253263');
    pRect(ctx, x, edgeY, 1, 1, '#64748b'); // Top bevel highlight
  }

  // Front-Right Skirt Wall: (48,60) -> (90,36), height 9px (`#2e3d75`)
  for (let x = 48; x <= 90; x++) {
    const t = (x - 48) / 42;
    const edgeY = Math.round(60 - t * 24) + shakeY;
    pRect(ctx, x, edgeY, 1, 9, '#2e3d75');
    pRect(ctx, x, edgeY, 1, 1, '#94a3b8'); // Top bevel highlight
  }

  // ==========================================================================
  // WHITE ORTHOGONAL GRID LINES & `KW-triO 3925` / `A4 B5 A5` LABELS ON BED
  // ==========================================================================
  for (let i = 1; i <= 5; i++) {
    const f = i / 6;
    // Grid lines parallel to cutting edge
    const gx0 = Math.round(38 + f * (8 - 38));
    const gy0 = Math.round(18 + f * (38 - 18)) + shakeY;
    const gx1 = Math.round(90 + f * (48 - 90));
    const gy1 = Math.round(36 + f * (60 - 36)) + shakeY;
    pLine(ctx, gx0 + 2, gy0, gx1 - 2, gy1, '#93c5fd');

    // Cross grid lines
    const cx0 = Math.round(38 + f * (90 - 38));
    const cy0 = Math.round(18 + f * (36 - 18)) + shakeY;
    const cx1 = Math.round(8 + f * (48 - 8));
    const cy1 = Math.round(38 + f * (60 - 38)) + shakeY;
    pLine(ctx, cx0 - 2, cy0 + 1, cx1 + 2, cy1 - 1, '#93c5fd');
  }

  // White pixel format markings (`A4`, `B5`, `A5`) on the bed (from photo)
  pRect(ctx, 48, 52 + shakeY, 5, 3, '#f8fafc');
  pRect(ctx, 46, 45 + shakeY, 5, 3, '#f8fafc');
  pRect(ctx, 43, 38 + shakeY, 5, 3, '#f8fafc');

  // `KW-triO 3925` black & white badge near front corner of bed (exact match to photo!)
  pRect(ctx, 41, 50 + shakeY, 8, 5, '#0f172a');
  pRect(ctx, 43, 52 + shakeY, 5, 2, '#f8fafc');

  // ==========================================================================
  // FRONT-RIGHT WARNING STICKER + CHROME WIRE CARRYING HANDLE (from photo!)
  // ==========================================================================
  // Orange/Black/White `WARNING` decal near front corner (x = 51..60)
  pRect(ctx, 51, 60 + shakeY, 9, 6, '#0f172a');
  pRect(ctx, 51, 61 + shakeY, 3, 4, '#f8fafc'); // White hand icon half
  pRect(ctx, 54, 60 + shakeY, 6, 2, '#f97316'); // Orange WARNING header

  // Chrome wire carrying handle mounted on two silver lugs (x = 68..81)
  pRect(ctx, 67, 51 + shakeY, 3, 3, '#e2e8f0'); // Left chrome lug
  pRect(ctx, 79, 44 + shakeY, 3, 3, '#e2e8f0'); // Right chrome lug
  pLine(ctx, 68, 53 + shakeY, 69, 57 + shakeY, '#cbd5e1');
  pLine(ctx, 69, 57 + shakeY, 80, 50 + shakeY, '#f8fafc');
  pLine(ctx, 80, 50 + shakeY, 80, 46 + shakeY, '#cbd5e1');

  // Black rubber side bumper stud on far right corner (x = 90, y = 41)
  pRect(ctx, 89, 41 + shakeY, 4, 3, '#020617');

  // ==========================================================================
  // LEFT BLACK PAPER CLAMP / BACKGAUGE BAR WITH KNOB (from photo)
  // ==========================================================================
  pRect(ctx, 7, 33 + shakeY, 4, 4, '#020617'); // Round black locking knob
  for (let i = 0; i < 32; i++) {
    const bx = 10 + i;
    const by = Math.round(35 + i * 0.45) + shakeY;
    pRect(ctx, bx, by, 4, 4, '#0f172a');
    pRect(ctx, bx, by, 4, 1, '#334155');
  }

  // ==========================================================================
  // MAGNET SHEET ON THE CUTTING BED (Whole before chop, splits into 4 magnets on chop!)
  // ==========================================================================
  const hasSheetOnBed = state.isCutting || state.uncutSheetsWaiting > 0;
  if (hasSheetOnBed) {
    const isSlicedNow = state.isCutting && state.cutProgress >= 0.42;
    if (!isSlicedNow) {
      // Uncut 4-photo sheet positioned against the cutting edge
      drawPixelFourPhotoSheet(ctx, 48, 28 + shakeY, 22, 14, state.currentSheet);
    } else {
      // Sheet just got sliced into 4 individual framed magnets popping apart!
      const sep = Math.min(3, Math.floor((state.cutProgress - 0.42) * 8));
      drawPixelFourPhotoSheet(ctx, 46 - sep, 27 + shakeY - sep, 10, 7, 1);
      drawPixelFourPhotoSheet(ctx, 58 + sep, 27 + shakeY - sep, 10, 7, 2);
      drawPixelFourPhotoSheet(ctx, 46 - sep, 35 + shakeY + sep, 10, 7, 3);
      drawPixelFourPhotoSheet(ctx, 58 + sep, 35 + shakeY + sep, 10, 7, 4);
    }
  }

  // ==========================================================================
  // TRANSLUCENT ACRYLIC SAFETY GUARD RAIL ALONG RIGHT CUTTING EDGE (from photo)
  // ==========================================================================
  for (let i = 0; i < 48; i++) {
    const gx = 39 + i;
    const gy = Math.round(16 + i * 0.36) + shakeY;
    pRect(ctx, gx, gy, 2, 4, 'rgba(226, 232, 240, 0.55)');
    pRect(ctx, gx, gy, 1, 1, '#ffffff');
    // 3 triangular acrylic support ribs (matching photo)
    if (i === 8 || i === 24 || i === 40) {
      pRect(ctx, gx - 1, gy + 1, 2, 4, '#cbd5e1');
    }
  }

  // ==========================================================================
  // CURVED BLACK GUILLOTINE BLADE ARM & ERGONOMIC HANDLE (Animated Chop!)
  // ==========================================================================
  // Top-back black pivot block
  pRect(ctx, topX - 5, topY - 4, 8, 6, '#0f172a');
  pRect(ctx, topX - 4, topY - 3, 6, 1, '#475569');

  // Compute blade angle:
  // Idle: raised at -0.42 rad (-24 deg)
  // Cutting (0.5s per sheet):
  //   0.00 -> 0.38: rapid chop down from -0.46 to +0.28 rad
  //   0.38 -> 0.58: held down at bottom of cut (+0.28 rad)
  //   0.58 -> 1.00: smooth return up to -0.42 rad
  let bladeAngle = -0.38;
  if (state.isCutting) {
    const p = state.cutProgress;
    if (p < 0.38) {
      const t = p / 0.38;
      bladeAngle = -0.45 + t * t * 0.74;
    } else if (p < 0.58) {
      bladeAngle = 0.29;
    } else {
      const t = (p - 0.58) / 0.42;
      bladeAngle = 0.29 - t * 0.67;
    }
  }

  const pivotX = topX;
  const pivotY = topY - 1;
  const cosA = Math.cos(bladeAngle);
  const sinA = Math.sin(bladeAngle);

  // Draw curved black steel blade arm from length 0 to 46, plus ergonomic handle from 46 to 64
  for (let r = 0; r <= 62; r++) {
    const bx = Math.round(pivotX + r * cosA);
    const by = Math.round(pivotY + r * sinA);

    if (r < 44) {
      // Curved black steel blade with silver sharpened bottom edge
      const thickness = r < 15 ? 4 : 5;
      pRect(ctx, bx, by, 2, thickness, '#0f172a');
      pRect(ctx, bx, by, 2, 1, '#475569'); // Top spine highlight
      pRect(ctx, bx, by + thickness, 2, 1, '#cbd5e1'); // Sharpened steel cutting edge
      // 3 silver screws/rivets along blade arm (visible in attached photo!)
      if (r === 12 || r === 25 || r === 38) {
        pRect(ctx, bx, by + 2, 1, 1, '#f8fafc');
      }
    } else if (r >= 44 && r <= 47) {
      // Finger guard flange before the handle (distinct shape in photo!)
      pRect(ctx, bx, by - 2, 3, 11, '#020617');
      pRect(ctx, bx, by - 2, 2, 1, '#334155');
    } else {
      // Ergonomic black grip handle at the tip
      const hCurve = r > 58 ? 1 : 0;
      pRect(ctx, bx, by - 2 + hCurve, 2, 6, '#0f172a');
      pRect(ctx, bx, by - 2 + hCurve, 2, 1, '#475569');
    }
  }

  // Slash flash particles on impact!
  if (isImpact) {
    pLine(ctx, 40, 20, 86, 36, '#fef08a');
    pRect(ctx, 56, 26, 2, 2, '#38bdf8');
    pRect(ctx, 66, 30, 2, 2, '#fbbf24');
    pRect(ctx, 74, 34, 2, 2, '#f472b6');
  }

  targetCtx.save();
  targetCtx.imageSmoothingEnabled = false;
  targetCtx.drawImage(canvas, destX, destY, destW, destH);
  targetCtx.restore();
}

/**
 * 3. Renders the Pro Magnet Studio Laptop + Adhesive Magnet Sheets + USB Cable in Pixel Art
 */
export function drawPixelLaptop(
  targetCtx: CanvasRenderingContext2D,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  state: LaptopPixelAnimState,
  options?: { transparentBg?: boolean }
) {
  const pw = 112;
  const ph = 78;
  const buf = getPixelBuffer(pw, ph);
  if (!buf) return;
  const { canvas, ctx } = buf;

  if (!options?.transparentBg) {
    pRect(ctx, 0, 0, pw, ph, '#0f172a');
    for (let gx = 0; gx < pw; gx += 8) {
      pRect(ctx, gx, 0, 1, ph, '#1e293b');
    }
    for (let gy = 0; gy < ph; gy += 8) {
      pRect(ctx, 0, gy, pw, 1, '#1e293b');
    }
    pRect(ctx, 0, 56, pw, 22, '#78350f');
    pRect(ctx, 0, 56, pw, 2, '#b45309');
    pRect(ctx, 0, 58, pw, 2, '#92400e');
  }

  // USB Cable running from right side of laptop towards the thermal printer
  pRect(ctx, 74, 52, 38, 2, '#020617');
  pRect(ctx, 74, 51, 38, 1, '#334155');
  // Animated cyan USB data pulses streaming along cable while printing!
  if (state.isPrinting) {
    const pulseOffset = Math.floor(state.timeSec * 30) % 12;
    for (let px = 76 + pulseOffset; px < 110; px += 12) {
      pRect(ctx, px, 51, 4, 2, '#38bdf8');
    }
  }

  // Stack of Black Adhesive Magnetic Sheets (דפי מגנט דביקים A4) next to laptop
  pRect(ctx, 78, 35, 24, 15, '#020617');
  pRect(ctx, 79, 34, 24, 15, '#1e293b');
  pRect(ctx, 80, 33, 24, 15, '#fef08a'); // Yellow peel-off adhesive backing top
  pRect(ctx, 82, 35, 20, 11, '#fde047');

  // Laptop Shadow
  pRect(ctx, 10, 58, 66, 5, 'rgba(2, 6, 23, 0.55)');

  // Laptop Upper Display Lid (Bezel + Glowing Screen)
  pRect(ctx, 14, 10, 54, 34, '#1e293b');
  pRect(ctx, 15, 11, 52, 32, '#0f172a');
  // Webcam dot
  pRect(ctx, 40, 11, 2, 1, '#38bdf8');

  // Screen Content
  const screenBg = state.isPrinting ? '#0369a1' : '#0f172a';
  pRect(ctx, 17, 13, 48, 28, screenBg);
  // Top App Header Bar on Laptop Screen
  pRect(ctx, 17, 13, 48, 4, '#0284c7');
  pRect(ctx, 19, 14, 2, 2, '#ef4444');
  pRect(ctx, 22, 14, 2, 2, '#fbbf24');
  pRect(ctx, 25, 14, 2, 2, '#22c55e');

  // 4-Photo Sheet Preview on Laptop Screen (left side of screen)
  drawPixelFourPhotoSheet(
    ctx,
    20,
    19,
    24,
    16,
    state.isPrinting ? state.currentSheet : 0
  );

  // Right Sidebar on Laptop Screen (Queue + Live Print Progress Bar)
  pRect(ctx, 47, 19, 16, 16, '#1e293b');
  const activeBarW = state.isPrinting
    ? Math.max(2, Math.round(state.sheetProgress * 12))
    : state.photosInCamera > 0
    ? 12
    : 3;
  pRect(ctx, 49, 22, 12, 3, '#0f172a');
  pRect(
    ctx,
    49,
    22,
    activeBarW,
    3,
    state.isPrinting ? '#38bdf8' : state.photosInCamera > 0 ? '#fbbf24' : '#475569'
  );
  // Mini status bars on screen
  pRect(ctx, 49, 27, 10, 2, '#22c55e');
  pRect(ctx, 49, 31, 8, 2, '#f472b6');

  // Laptop Keyboard Base (Trapezoid perspective in front of screen)
  for (let row = 0; row < 15; row++) {
    const expand = Math.floor(row * 0.45);
    const kx = 14 - expand;
    const kw = 54 + expand * 2;
    const ky = 44 + row;
    pRect(ctx, kx, ky, kw, 1, row > 12 ? '#475569' : '#94a3b8');
  }

  // Pixel Keyboard Keys Matrix
  pRect(ctx, 16, 46, 50, 7, '#1e293b');
  for (let ky = 47; ky <= 51; ky += 2) {
    for (let kx = 18; kx <= 62; kx += 3) {
      pRect(ctx, kx, ky, 2, 1, '#cbd5e1');
    }
  }
  // Trackpad centered at front of base
  pRect(ctx, 35, 54, 12, 3, '#64748b');

  targetCtx.save();
  targetCtx.imageSmoothingEnabled = false;
  targetCtx.drawImage(canvas, destX, destY, destW, destH);
  targetCtx.restore();
}
