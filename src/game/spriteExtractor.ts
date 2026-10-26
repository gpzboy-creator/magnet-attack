export type IsoDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export type IsoAnimState = 'idle' | 'walk_1' | 'walk_2' | 'shoot';

export const ISO_DIRECTIONS: readonly IsoDirection[] = [
  'N',
  'NE',
  'E',
  'SE',
  'S',
  'SW',
  'W',
  'NW',
];

export const ISO_ANIM_STATES: readonly IsoAnimState[] = [
  'idle',
  'walk_1',
  'walk_2',
  'shoot',
];

export interface ExtractedSpriteFrame {
  id: string;
  direction: IsoDirection;
  state: IsoAnimState;
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  cellRow: number;
  cellCol: number;
  footContactX: number;
  footContactY: number;
}

export interface SpriteAtlasSchema {
  spriteSheet: {
    width: number;
    height: number;
    columns: number;
    rows: number;
    cellWidth: number;
    cellHeight: number;
  };
  frames: ExtractedSpriteFrame[];
}

export type FacialHairStyle = 'mustache' | 'beard' | 'clean';

export interface PhotographerStyleConfig {
  hairColor: string;
  facialHair: FacialHairStyle;
  vestColor: string;
  shirtColor: string;
  tieColor: string;
  pantsColor: string;
  flashColor: string;
}

export type GuestHatType = 'none' | 'green_top' | 'black_top' | 'cone' | 'veil';

export interface GuestOutfitConfig {
  id: string;
  label: string;
  outfit: string;
  hair: string;
  isDress: boolean;
  hat: GuestHatType;
  sign: string | null;
}

export interface CharacterAndSizeConfig {
  photographerScale: number;
  photographerWidthRatio: number;
  photographerHeightRatio: number;
  guestScale: number;
  exportScale: number;
  photographerStyle: PhotographerStyleConfig;
  guestOutfits: GuestOutfitConfig[];
}

export const DEFAULT_PHOTOGRAPHER_STYLE: PhotographerStyleConfig = {
  hairColor: '#3c2319',
  facialHair: 'mustache',
  vestColor: '#422c23',
  shirtColor: '#f8fafc',
  tieColor: '#6e7234',
  pantsColor: '#402a22',
  flashColor: '#facc15',
};

export const DEFAULT_GUEST_OUTFITS: GuestOutfitConfig[] = [
  {
    id: 'guest_1',
    label: 'אורחת בשמלה סגולה',
    outfit: '#7e4a88',
    hair: '#1e1612',
    isDress: true,
    hat: 'none',
    sign: null,
  },
  {
    id: 'guest_2',
    label: 'אורח עם צילינדר ירוק',
    outfit: '#334155',
    hair: '#3b2314',
    isDress: false,
    hat: 'green_top',
    sign: null,
  },
  {
    id: 'guest_3',
    label: 'אורח חוגג (FUNNS)',
    outfit: '#27272a',
    hair: '#5c3824',
    isDress: false,
    hat: 'none',
    sign: 'FUNNS',
  },
  {
    id: 'guest_4',
    label: 'אורחת בשמלת ורד',
    outfit: '#d47a7a',
    hair: '#a16207',
    isDress: true,
    hat: 'none',
    sign: null,
  },
  {
    id: 'guest_5',
    label: 'אורח עם שלט (SHOW)',
    outfit: '#574636',
    hair: '#27272a',
    isDress: false,
    hat: 'cone',
    sign: 'SHOW',
  },
  {
    id: 'guest_6',
    label: 'כלה / שושבינה לבנה',
    outfit: '#f8fafc',
    hair: '#78350f',
    isDress: true,
    hat: 'veil',
    sign: null,
  },
  {
    id: 'guest_7',
    label: 'דוד בצילינדר שחור',
    outfit: '#1e293b',
    hair: '#451a03',
    isDress: false,
    hat: 'black_top',
    sign: 'FUNNS',
  },
  {
    id: 'guest_8',
    label: 'אורחת בשמלת טורקיז',
    outfit: '#3b7a8c',
    hair: '#5c3824',
    isDress: true,
    hat: 'none',
    sign: null,
  },
];

export const DEFAULT_CHARACTER_AND_SIZE_CONFIG: CharacterAndSizeConfig = {
  photographerScale: 1.25,
  photographerWidthRatio: 1.0,
  photographerHeightRatio: 1.0,
  guestScale: 1.0,
  exportScale: 2,
  photographerStyle: DEFAULT_PHOTOGRAPHER_STYLE,
  guestOutfits: DEFAULT_GUEST_OUTFITS,
};

/**
 * Checks if an RGBA pixel is flat solid chroma green (#00FF00) background,
 * JPEG-compressed chroma green background, or transparent background.
 */
export function isBackgroundPixel(
  r: number,
  g: number,
  b: number,
  a: number,
  alphaThreshold = 16
): boolean {
  if (a <= alphaThreshold) return true;
  if (g >= 210 && r <= 40 && b <= 40) return true;
  // Catch JPEG-compressed chroma green (#00FF00 with DCT artifacts around pixel-art outlines)
  if (g >= 140 && g - Math.max(r, b) >= 48) return true;
  return false;
}

/**
 * Keys out flat solid or JPEG chroma green (#00FF00) pixels into a new buffer
 * and despills green edge halos so sprites render cleanly over any game background.
 */
export function keyOutChromaGreenRGBA(
  source: Uint8ClampedArray
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(source);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const a = out[i + 3];
    if (isBackgroundPixel(r, g, b, a)) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 0;
    } else if (g - Math.max(r, b) > 24 && (r < 95 || g > 125)) {
      if (g > 110 && g - Math.max(r, b) > 36) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
      } else {
        out[i + 1] = Math.max(r, b);
      }
    }
  }
  return out;
}

/**
 * Analyzes a single sprite sheet grid cell pixel-by-pixel to extract
 * the tight non-background bounding box (x, y, width, height) and
 * the normalized ground-plane foot registration anchor (anchorX, anchorY).
 */
export function extractCellBoundingBoxAndAnchor(
  rgba: Uint8ClampedArray,
  sheetWidth: number,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  direction: IsoDirection,
  state: IsoAnimState,
  cellRow: number,
  cellCol: number,
  alphaThreshold = 16
): ExtractedSpriteFrame | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let activePixelCount = 0;

  const endX = cellX + cellW;
  const endY = cellY + cellH;

  for (let py = cellY; py < endY; py++) {
    const rowOffset = py * sheetWidth * 4;
    for (let px = cellX; px < endX; px++) {
      const idx = rowOffset + px * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      const a = rgba[idx + 3];
      if (!isBackgroundPixel(r, g, b, a, alphaThreshold)) {
        activePixelCount++;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
  }

  if (activePixelCount === 0 || minX > maxX || minY > maxY) {
    return null;
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  const footBandTop = Math.max(minY, maxY - 2);
  let weightedXSum = 0;
  let weightSum = 0;

  for (let py = footBandTop; py <= maxY; py++) {
    const rowOffset = py * sheetWidth * 4;
    const rowWeight = py === maxY ? 6 : 1;
    for (let px = minX; px <= maxX; px++) {
      const idx = rowOffset + px * 4;
      if (
        !isBackgroundPixel(
          rgba[idx],
          rgba[idx + 1],
          rgba[idx + 2],
          rgba[idx + 3],
          alphaThreshold
        )
      ) {
        const w = (rgba[idx + 3] / 255) * rowWeight;
        weightedXSum += px * w;
        weightSum += w;
      }
    }
  }

  const footContactX =
    weightSum > 0 ? weightedXSum / weightSum : minX + (width - 1) * 0.5;
  const footContactY = maxY;

  const rawAnchorX = width > 1 ? (footContactX - minX) / (width - 1) : 0.5;
  const rawAnchorY = height > 1 ? (footContactY - minY) / (height - 1) : 1.0;

  const anchorX = Number(Math.max(0, Math.min(1, rawAnchorX)).toFixed(4));
  const anchorY = Number(Math.max(0, Math.min(1, rawAnchorY)).toFixed(4));

  return {
    id: `${direction.toLowerCase()}_${state}`,
    direction,
    state,
    x: minX,
    y: minY,
    width,
    height,
    anchorX,
    anchorY,
    cellRow,
    cellCol,
    footContactX: Number(footContactX.toFixed(2)),
    footContactY,
  };
}

/**
 * Extracts all active frames from an RGBA sprite sheet buffer arranged in
 * rows (8 directions) x columns (4 animation states).
 */
export function extractSpriteSheetAtlas(
  rgba: Uint8ClampedArray,
  sheetWidth: number,
  sheetHeight: number,
  columns = 4,
  rows = 8,
  alphaThreshold = 16
): SpriteAtlasSchema {
  const cellWidth = Math.floor(sheetWidth / columns);
  const cellHeight = Math.floor(sheetHeight / rows);
  const frames: ExtractedSpriteFrame[] = [];

  for (let r = 0; r < rows; r++) {
    const direction = ISO_DIRECTIONS[r % ISO_DIRECTIONS.length];
    for (let c = 0; c < columns; c++) {
      const state = ISO_ANIM_STATES[c % ISO_ANIM_STATES.length];
      const cellX = c * cellWidth;
      const cellY = r * cellHeight;
      const extracted = extractCellBoundingBoxAndAnchor(
        rgba,
        sheetWidth,
        cellX,
        cellY,
        cellWidth,
        cellHeight,
        direction,
        state,
        r,
        c,
        alphaThreshold
      );
      if (extracted) {
        frames.push(extracted);
      }
    }
  }

  return {
    spriteSheet: {
      width: sheetWidth,
      height: sheetHeight,
      columns,
      rows,
      cellWidth,
      cellHeight,
    },
    frames,
  };
}

type RGB = readonly [number, number, number];

function hexToRgb(hex: string, fallback: RGB): RGB {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return fallback;
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return fallback;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255] as const;
}

function adjustRgb(rgb: RGB, delta: number): RGB {
  return [
    Math.max(0, Math.min(255, Math.round(rgb[0] + delta))),
    Math.max(0, Math.min(255, Math.round(rgb[1] + delta))),
    Math.max(0, Math.min(255, Math.round(rgb[2] + delta))),
  ] as const;
}

const OUTLINE_RGB: RGB = [12, 8, 6]; // #0c0806 strict 1px dark outline

function setPx(
  rgba: Uint8ClampedArray,
  sheetWidth: number,
  sheetHeight: number,
  x: number,
  y: number,
  color: RGB,
  a = 255
) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || ix >= sheetWidth || iy < 0 || iy >= sheetHeight) return;
  const idx = (iy * sheetWidth + ix) * 4;
  rgba[idx] = color[0];
  rgba[idx + 1] = color[1];
  rgba[idx + 2] = color[2];
  rgba[idx + 3] = a;
}

function fillRect(
  rgba: Uint8ClampedArray,
  sheetWidth: number,
  sheetHeight: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  color: RGB
) {
  const sx = Math.round(x0);
  const sy = Math.round(y0);
  const ex = Math.round(x0 + w);
  const ey = Math.round(y0 + h);
  for (let py = sy; py < ey; py++) {
    for (let px = sx; px < ex; px++) {
      setPx(rgba, sheetWidth, sheetHeight, px, py, color);
    }
  }
}

function fillOutlinedRect(
  rgba: Uint8ClampedArray,
  sheetWidth: number,
  sheetHeight: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  fillColor: RGB,
  highlightColor?: RGB
) {
  const sx = Math.round(x0);
  const sy = Math.round(y0);
  const rw = Math.max(2, Math.round(w));
  const rh = Math.max(2, Math.round(h));
  fillRect(rgba, sheetWidth, sheetHeight, sx - 1, sy - 1, rw + 2, rh + 2, OUTLINE_RGB);
  fillRect(rgba, sheetWidth, sheetHeight, sx, sy, rw, rh, fillColor);
  if (highlightColor && rw >= 3 && rh >= 3) {
    fillRect(rgba, sheetWidth, sheetHeight, sx, sy, 1, rh - 1, highlightColor);
  }
}

function applyStrictCellOutlineAndFloorAnchor(
  rgba: Uint8ClampedArray,
  sheetWidth: number,
  sheetHeight: number,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  groundBottomY: number
) {
  const copy = new Uint8ClampedArray(rgba);
  const minX = cellX + 2;
  const maxX = cellX + cellW - 2;
  const minY = cellY + 2;
  const maxY = groundBottomY;

  for (let py = minY; py < maxY; py++) {
    for (let px = minX; px < maxX; px++) {
      const idx = (py * sheetWidth + px) * 4;
      if (copy[idx + 3] > 0) continue;
      const nUp = ((py - 1) * sheetWidth + px) * 4;
      const nDn = ((py + 1) * sheetWidth + px) * 4;
      const nLt = (py * sheetWidth + (px - 1)) * 4;
      const nRt = (py * sheetWidth + (px + 1)) * 4;
      if (
        copy[nUp + 3] > 0 ||
        (py + 1 <= maxY && copy[nDn + 3] > 0) ||
        copy[nLt + 3] > 0 ||
        copy[nRt + 3] > 0
      ) {
        rgba[idx] = OUTLINE_RGB[0];
        rgba[idx + 1] = OUTLINE_RGB[1];
        rgba[idx + 2] = OUTLINE_RGB[2];
        rgba[idx + 3] = 255;
      }
    }
  }

  let charMinX = maxX;
  let charMaxX = minX;
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px < maxX; px++) {
      const idx = (py * sheetWidth + px) * 4;
      if (rgba[idx + 3] > 0) {
        if (px < charMinX) charMinX = px;
        if (px > charMaxX) charMaxX = px;
      }
    }
  }

  if (charMinX <= charMaxX) {
    for (let px = charMinX; px <= charMaxX; px++) {
      setPx(rgba, sheetWidth, sheetHeight, px, groundBottomY, OUTLINE_RGB);
    }
  }
}

export interface GenerateSpriteSheetOptions {
  chromaGreen?: boolean;
  style?: Partial<PhotographerStyleConfig>;
}

/**
 * Generates the complete 512x1024 2D isometric pixel art sprite sheet of the
 * Male Wedding Magnet Photographer (8 isometric directions x 4 animation states:
 * Idle, Walk_1, Walk_2, Shoot) with customizable palette and facial hair.
 */
export function generateDefaultIsoSpriteSheetRGBA(
  sheetWidth = 512,
  sheetHeight = 1024,
  options: GenerateSpriteSheetOptions = {}
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(sheetWidth * sheetHeight * 4);
  const cols = 4;
  const rows = 8;
  const cellW = Math.floor(sheetWidth / cols);
  const cellH = Math.floor(sheetHeight / rows);

  const style: PhotographerStyleConfig = {
    ...DEFAULT_PHOTOGRAPHER_STYLE,
    ...(options.style || {}),
  };

  const hairMid = hexToRgb(style.hairColor, [60, 35, 25]);
  const hairDark = adjustRgb(hairMid, -28);
  const hairLight = adjustRgb(hairMid, 32);
  const hairSpec = adjustRgb(hairMid, 58);

  const vestMid = hexToRgb(style.vestColor, [66, 44, 35]);
  const vestDark = adjustRgb(vestMid, -22);
  const vestLight = adjustRgb(vestMid, 26);

  const shirtWhite = hexToRgb(style.shirtColor, [248, 250, 252]);
  const shirtShade = adjustRgb(shirtWhite, -38);

  const tieBase = hexToRgb(style.tieColor, [110, 114, 52]);
  const tieCheck = adjustRgb(tieBase, 48);

  const pantsMid = hexToRgb(style.pantsColor, [64, 42, 34]);
  const pantsDark = adjustRgb(pantsMid, -22);
  const pantsLight = adjustRgb(pantsMid, 24);

  const burstMid = hexToRgb(style.flashColor, [250, 204, 21]);
  const burstOuter = adjustRgb(burstMid, -35);
  const burstInner = adjustRgb(burstMid, 42);
  const burstCore: RGB = [255, 255, 255];

  const PAL = {
    OUTLINE: OUTLINE_RGB,
    HAIR_DARK: hairDark,
    HAIR_MID: hairMid,
    HAIR_LIGHT: hairLight,
    HAIR_SPEC: hairSpec,
    SKIN_LIGHT: [243, 189, 156] as const,
    SKIN_MID: [217, 153, 117] as const,
    SKIN_SHADOW: [184, 118, 84] as const,
    MUSTACHE: adjustRgb(hairMid, -10),
    SHIRT_WHITE: shirtWhite,
    SHIRT_SHADE: shirtShade,
    TIE_BASE: tieBase,
    TIE_CHECK: tieCheck,
    VEST_DARK: vestDark,
    VEST_MID: vestMid,
    VEST_LIGHT: vestLight,
    PANTS_DARK: pantsDark,
    PANTS_MID: pantsMid,
    PANTS_LIGHT: pantsLight,
    BELT_DARK: [24, 22, 26] as const,
    BELT_BUCKLE: [168, 178, 194] as const,
    SHOE_DARK: [24, 21, 30] as const,
    SHOE_MID: [48, 43, 60] as const,
    SHOE_SHINE: [108, 100, 128] as const,
    CAM_BODY: [24, 26, 32] as const,
    CAM_GRIP: [48, 52, 64] as const,
    CAM_LENS: [15, 23, 42] as const,
    CAM_GLINT: [56, 189, 248] as const,
    FLASH_UNIT: [226, 232, 240] as const,
    FLASH_BASE: [71, 85, 105] as const,
    BURST_OUTER: burstOuter,
    BURST_MID: burstMid,
    BURST_INNER: burstInner,
    BURST_CORE: burstCore,
  };

  const dirAngles: Record<IsoDirection, number> = {
    N: -Math.PI / 2,
    NE: -Math.PI / 4,
    E: 0,
    SE: Math.PI / 4,
    S: Math.PI / 2,
    SW: (3 * Math.PI) / 4,
    W: Math.PI,
    NW: (-3 * Math.PI) / 4,
  };

  for (let r = 0; r < rows; r++) {
    const dir = ISO_DIRECTIONS[r];
    const angle = dirAngles[dir];
    const cosA = Math.cos(angle);

    const isFacingNorth = dir === 'N' || dir === 'NE' || dir === 'NW';
    const isProfile = dir === 'E' || dir === 'W';
    const faceShiftX = Math.round(cosA * 3);

    for (let c = 0; c < cols; c++) {
      const state = ISO_ANIM_STATES[c];
      const cellX = c * cellW;
      const cellY = r * cellH;

      const cx = cellX + 64;
      const groundBottomY = cellY + 112;
      const walkBob = state === 'walk_1' || state === 'walk_2' ? -1 : 0;

      // 1. LEGS & POLISHED DARK SHOES
      const leftStepY = state === 'walk_1' ? -3 : state === 'walk_2' ? 1 : 0;
      const rightStepY = state === 'walk_2' ? -3 : state === 'walk_1' ? 1 : 0;
      const leftStepX =
        state === 'walk_1'
          ? Math.round(cosA * 3)
          : state === 'walk_2'
          ? -Math.round(cosA * 2)
          : 0;
      const rightStepX =
        state === 'walk_2'
          ? Math.round(cosA * 3)
          : state === 'walk_1'
          ? -Math.round(cosA * 2)
          : 0;

      const hipY = groundBottomY - 30 + walkBob;
      const leftLegX = cx - 7 + leftStepX;
      const rightLegX = cx + 2 + rightStepX;

      fillOutlinedRect(
        rgba,
        sheetWidth,
        sheetHeight,
        leftLegX,
        hipY,
        6,
        24 + leftStepY,
        PAL.PANTS_MID,
        PAL.PANTS_LIGHT
      );
      fillOutlinedRect(
        rgba,
        sheetWidth,
        sheetHeight,
        rightLegX,
        hipY,
        6,
        24 + rightStepY,
        PAL.PANTS_DARK,
        PAL.PANTS_MID
      );

      fillOutlinedRect(
        rgba,
        sheetWidth,
        sheetHeight,
        cx - 8,
        hipY - 4,
        17,
        6,
        PAL.PANTS_MID,
        PAL.PANTS_LIGHT
      );

      const lShoeY = groundBottomY - 5 + Math.min(0, leftStepY);
      const rShoeY = groundBottomY - 5 + Math.min(0, rightStepY);

      fillOutlinedRect(
        rgba,
        sheetWidth,
        sheetHeight,
        leftLegX - 1,
        lShoeY,
        8,
        5,
        PAL.SHOE_MID,
        PAL.SHOE_SHINE
      );
      fillRect(
        rgba,
        sheetWidth,
        sheetHeight,
        leftLegX - 1,
        groundBottomY - 1,
        8,
        1,
        PAL.SHOE_DARK
      );

      fillOutlinedRect(
        rgba,
        sheetWidth,
        sheetHeight,
        rightLegX - 1,
        rShoeY,
        8,
        5,
        PAL.SHOE_MID,
        PAL.SHOE_SHINE
      );
      fillRect(
        rgba,
        sheetWidth,
        sheetHeight,
        rightLegX - 1,
        groundBottomY - 1,
        8,
        1,
        PAL.SHOE_DARK
      );

      // 2. TORSO: COLLARED SHIRT + TAILORED WAISTCOAT (VEST) + TIE
      const torsoTopY = groundBottomY - 56 + walkBob;
      const torsoW = isProfile ? 16 : 20;
      const torsoLeft = cx - Math.floor(torsoW / 2);

      fillOutlinedRect(
        rgba,
        sheetWidth,
        sheetHeight,
        torsoLeft,
        torsoTopY,
        torsoW,
        24,
        PAL.VEST_MID,
        PAL.VEST_LIGHT
      );

      fillRect(
        rgba,
        sheetWidth,
        sheetHeight,
        torsoLeft + 1,
        torsoTopY + 21,
        torsoW - 2,
        2,
        PAL.BELT_DARK
      );
      if (!isFacingNorth) {
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          cx + faceShiftX - 1,
          torsoTopY + 21,
          3,
          2,
          PAL.BELT_BUCKLE
        );
      }

      if (dir !== 'N') {
        const shirtCenterX = cx + faceShiftX;
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          shirtCenterX - 3,
          torsoTopY,
          7,
          19,
          PAL.SHIRT_WHITE
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          shirtCenterX - 3,
          torsoTopY,
          1,
          19,
          PAL.SHIRT_SHADE
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          shirtCenterX - 4,
          torsoTopY - 2,
          9,
          3,
          PAL.SHIRT_WHITE
        );
        for (let ty = 0; ty < 16; ty++) {
          const tieColor = ty % 2 === 0 ? PAL.TIE_BASE : PAL.TIE_CHECK;
          fillRect(
            rgba,
            sheetWidth,
            sheetHeight,
            shirtCenterX - 1,
            torsoTopY + 2 + ty,
            3,
            1,
            tieColor
          );
        }
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          shirtCenterX - 5,
          torsoTopY + 1,
          2,
          16,
          PAL.VEST_LIGHT
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          shirtCenterX + 4,
          torsoTopY + 1,
          2,
          16,
          PAL.VEST_DARK
        );
      } else {
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          cx - 5,
          torsoTopY - 2,
          11,
          2,
          PAL.SHIRT_WHITE
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          cx,
          torsoTopY + 2,
          1,
          19,
          PAL.VEST_DARK
        );
      }

      // 3. HEAD, HAIR & FACIAL HAIR
      const headTopY = groundBottomY - 78 + walkBob;
      const headW = 16;
      const headH = 19;
      const headLeft = cx - 8;

      fillOutlinedRect(
        rgba,
        sheetWidth,
        sheetHeight,
        headLeft,
        headTopY + 3,
        headW,
        headH - 3,
        PAL.SKIN_LIGHT
      );
      fillRect(
        rgba,
        sheetWidth,
        sheetHeight,
        headLeft + headW - 3,
        headTopY + 5,
        3,
        headH - 6,
        PAL.SKIN_MID
      );
      fillRect(
        rgba,
        sheetWidth,
        sheetHeight,
        headLeft + 1,
        headTopY + headH - 3,
        headW - 2,
        2,
        PAL.SKIN_SHADOW
      );

      if (!isProfile) {
        fillOutlinedRect(
          rgba,
          sheetWidth,
          sheetHeight,
          headLeft - 2,
          headTopY + 9,
          2,
          4,
          PAL.SKIN_MID
        );
        fillOutlinedRect(
          rgba,
          sheetWidth,
          sheetHeight,
          headLeft + headW,
          headTopY + 9,
          2,
          4,
          PAL.SKIN_MID
        );
      }

      fillOutlinedRect(
        rgba,
        sheetWidth,
        sheetHeight,
        headLeft - 1,
        headTopY - 2,
        headW + 2,
        8,
        PAL.HAIR_MID,
        PAL.HAIR_LIGHT
      );
      fillRect(
        rgba,
        sheetWidth,
        sheetHeight,
        headLeft + 2,
        headTopY - 2,
        5,
        2,
        PAL.HAIR_SPEC
      );
      fillRect(
        rgba,
        sheetWidth,
        sheetHeight,
        headLeft + 8,
        headTopY - 1,
        6,
        2,
        PAL.HAIR_LIGHT
      );
      fillRect(
        rgba,
        sheetWidth,
        sheetHeight,
        headLeft,
        headTopY + 3,
        headW,
        2,
        PAL.HAIR_DARK
      );

      if (isFacingNorth) {
        fillOutlinedRect(
          rgba,
          sheetWidth,
          sheetHeight,
          headLeft - 1,
          headTopY + 2,
          headW + 2,
          13,
          PAL.HAIR_MID,
          PAL.HAIR_LIGHT
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          headLeft + 2,
          headTopY + 5,
          12,
          2,
          PAL.HAIR_DARK
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          headLeft + 3,
          headTopY + 9,
          10,
          2,
          PAL.HAIR_DARK
        );
      } else {
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          headLeft,
          headTopY + 5,
          2,
          5,
          PAL.HAIR_DARK
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          headLeft + headW - 2,
          headTopY + 5,
          2,
          5,
          PAL.HAIR_DARK
        );

        const eyeCenterX = cx + Math.round(cosA * 2);
        const eyeY = headTopY + 9;

        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          eyeCenterX - 5,
          eyeY - 2,
          4,
          1,
          PAL.HAIR_DARK
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          eyeCenterX + 2,
          eyeY - 2,
          4,
          1,
          PAL.HAIR_DARK
        );

        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          eyeCenterX - 4,
          eyeY,
          3,
          2,
          PAL.SHIRT_WHITE
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          eyeCenterX - 3,
          eyeY,
          2,
          2,
          PAL.OUTLINE
        );

        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          eyeCenterX + 2,
          eyeY,
          3,
          2,
          PAL.SHIRT_WHITE
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          eyeCenterX + 2,
          eyeY,
          2,
          2,
          PAL.OUTLINE
        );

        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          eyeCenterX,
          eyeY + 2,
          2,
          2,
          PAL.SKIN_SHADOW
        );

        if (style.facialHair === 'mustache' || style.facialHair === 'beard') {
          fillRect(
            rgba,
            sheetWidth,
            sheetHeight,
            eyeCenterX - 4,
            eyeY + 5,
            9,
            2,
            PAL.MUSTACHE
          );
          fillRect(
            rgba,
            sheetWidth,
            sheetHeight,
            eyeCenterX - 3,
            eyeY + 4,
            3,
            1,
            PAL.MUSTACHE
          );
          fillRect(
            rgba,
            sheetWidth,
            sheetHeight,
            eyeCenterX + 1,
            eyeY + 4,
            3,
            1,
            PAL.MUSTACHE
          );
        }
        if (style.facialHair === 'beard') {
          fillRect(
            rgba,
            sheetWidth,
            sheetHeight,
            headLeft + 1,
            eyeY + 6,
            headW - 2,
            4,
            PAL.HAIR_DARK
          );
        }
      }

      // 4. SLEEVES, HANDS & PROFESSIONAL DSLR CAMERA + SPEEDLIGHT FLASH
      const camBaseY =
        state === 'shoot' ? headTopY + 10 : torsoTopY + 8 + walkBob;
      const camOffsetX = Math.round(cosA * 8);
      const camCenterX = cx + camOffsetX;

      const leftArmX = cx - 13;
      const rightArmX = cx + 8;
      const armTopY = state === 'shoot' ? torsoTopY - 4 : torsoTopY + 2;

      fillOutlinedRect(
        rgba,
        sheetWidth,
        sheetHeight,
        leftArmX,
        armTopY,
        5,
        13,
        PAL.SHIRT_WHITE,
        PAL.SHIRT_SHADE
      );
      fillOutlinedRect(
        rgba,
        sheetWidth,
        sheetHeight,
        rightArmX,
        armTopY,
        5,
        13,
        PAL.SHIRT_WHITE,
        PAL.SHIRT_SHADE
      );

      fillOutlinedRect(
        rgba,
        sheetWidth,
        sheetHeight,
        camCenterX - 8,
        camBaseY,
        4,
        4,
        PAL.SKIN_LIGHT
      );
      fillOutlinedRect(
        rgba,
        sheetWidth,
        sheetHeight,
        camCenterX + 5,
        camBaseY,
        4,
        4,
        PAL.SKIN_MID
      );

      // Back to the viewer while shooting: the camera is raised to the face, so it is hidden
      // behind the head — only the rear of the speedlight peeks over the hair (no lens, no glow).
      const cameraHiddenBehindHead = isFacingNorth && state === 'shoot';
      if (cameraHiddenBehindHead) {
        fillOutlinedRect(
          rgba,
          sheetWidth,
          sheetHeight,
          camCenterX - 3,
          headTopY - 4,
          7,
          5,
          PAL.FLASH_UNIT
        );
        fillRect(rgba, sheetWidth, sheetHeight, camCenterX - 1, headTopY + 1, 3, 2, PAL.FLASH_BASE);
      } else if (!isFacingNorth || dir === 'NE' || dir === 'NW') {
        fillOutlinedRect(
          rgba,
          sheetWidth,
          sheetHeight,
          camCenterX - 5,
          camBaseY - 2,
          11,
          8,
          PAL.CAM_BODY,
          PAL.CAM_GRIP
        );

        const lensX = camCenterX + Math.round(cosA * 4) - 3;
        const lensY = camBaseY;
        fillOutlinedRect(
          rgba,
          sheetWidth,
          sheetHeight,
          lensX,
          lensY,
          7,
          6,
          PAL.CAM_LENS
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          lensX + 2,
          lensY + 1,
          2,
          2,
          PAL.CAM_GLINT
        );

        fillOutlinedRect(
          rgba,
          sheetWidth,
          sheetHeight,
          camCenterX - 3,
          camBaseY - 9,
          7,
          6,
          PAL.FLASH_UNIT
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          camCenterX - 1,
          camBaseY - 3,
          3,
          2,
          PAL.FLASH_BASE
        );
      }

      // 5. FLASH BURST ON 'SHOOT' FRAMES — only when the flash points toward/across the viewer.
      // Facing away, the burst would be painted over the back of the head; the renderer adds
      // a dim beam + rim glow behind the sprite instead.
      if (state === 'shoot' && !isFacingNorth) {
        const burstX = cx + Math.round(cosA * 7);
        const burstY = headTopY - 6;

        fillOutlinedRect(
          rgba,
          sheetWidth,
          sheetHeight,
          burstX - 9,
          burstY - 2,
          19,
          5,
          PAL.BURST_OUTER
        );
        fillOutlinedRect(
          rgba,
          sheetWidth,
          sheetHeight,
          burstX - 2,
          burstY - 9,
          5,
          19,
          PAL.BURST_OUTER
        );
        fillOutlinedRect(
          rgba,
          sheetWidth,
          sheetHeight,
          burstX - 6,
          burstY - 6,
          13,
          13,
          PAL.BURST_MID
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          burstX - 4,
          burstY - 4,
          9,
          9,
          PAL.BURST_INNER
        );
        fillRect(
          rgba,
          sheetWidth,
          sheetHeight,
          burstX - 2,
          burstY - 2,
          5,
          5,
          PAL.BURST_CORE
        );
      }

      applyStrictCellOutlineAndFloorAnchor(
        rgba,
        sheetWidth,
        sheetHeight,
        cellX,
        cellY,
        cellW,
        cellH,
        groundBottomY
      );
    }
  }

  if (options.chromaGreen) {
    for (let i = 0; i < rgba.length; i += 4) {
      if (rgba[i + 3] === 0) {
        rgba[i] = 0;
        rgba[i + 1] = 255;
        rgba[i + 2] = 0;
        rgba[i + 3] = 255;
      }
    }
  }

  return rgba;
}

/**
 * Triggers a browser download of the full 4x8 isometric sprite sheet as a PNG file.
 * Supports custom scale factor and aspect ratios.
 */
export function downloadSpriteSheetPNG(
  sheetCanvas: HTMLCanvasElement | null,
  chromaGreen = true,
  scale = 2,
  widthRatio = 1,
  heightRatio = 1
): void {
  if (!sheetCanvas || typeof document === 'undefined') return;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = Math.max(64, Math.round(sheetCanvas.width * scale * widthRatio));
  exportCanvas.height = Math.max(64, Math.round(sheetCanvas.height * scale * heightRatio));
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;
  if (chromaGreen) {
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  } else {
    ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
  }

  ctx.drawImage(
    sheetCanvas,
    0,
    0,
    sheetCanvas.width,
    sheetCanvas.height,
    0,
    0,
    exportCanvas.width,
    exportCanvas.height
  );

  const link = document.createElement('a');
  link.download = chromaGreen
    ? `wedding_photographer_spritesheet_${exportCanvas.width}x${exportCanvas.height}_chroma.png`
    : `wedding_photographer_spritesheet_${exportCanvas.width}x${exportCanvas.height}_transparent.png`;
  link.href = exportCanvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Triggers a browser download of a single extracted sprite frame as a crisp scaled PNG.
 */
export function downloadSingleFramePNG(
  sheetCanvas: HTMLCanvasElement | null,
  frame: ExtractedSpriteFrame,
  chromaGreen = true,
  scale = 4,
  widthRatio = 1,
  heightRatio = 1
): void {
  if (!sheetCanvas || !frame || typeof document === 'undefined') return;
  const pad = 4;
  const scaledW = Math.max(8, Math.round(frame.width * scale * widthRatio));
  const scaledH = Math.max(8, Math.round(frame.height * scale * heightRatio));
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = scaledW + pad * 2 * scale;
  exportCanvas.height = scaledH + pad * 2 * scale;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;
  if (chromaGreen) {
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  } else {
    ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
  }

  ctx.drawImage(
    sheetCanvas,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    pad * scale,
    pad * scale,
    scaledW,
    scaledH
  );

  const link = document.createElement('a');
  link.download = `wedding_photographer_${frame.id}_${scaledW}x${scaledH}${
    chromaGreen ? '_chroma' : '_transparent'
  }.png`;
  link.href = exportCanvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const DEFAULT_UPLOADED_SPRITE_SHEET_URL =
  `${import.meta.env?.BASE_URL ?? '/'}assets/aistudio/Gemini_Generated_Image_vtvrxkvtvrxkvtvr_9de06393.jpg`;

/**
 * Normalizes a loaded 4x8 sprite sheet image onto a clean 512x1024 canvas
 * (128x128 per cell), keys out chroma-green (#00FF00 + JPEG artifacts),
 * optionally remaps the directional rows to match ISO_DIRECTIONS
 * ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], and extracts the 32-frame atlas.
 */
export function normalizeLoadedSpriteSheetImage(
  img: HTMLImageElement,
  remapUploadedRows = false
): {
  canvas: HTMLCanvasElement;
  rgba: Uint8ClampedArray;
  atlas: SpriteAtlasSchema;
} | null {
  if (typeof document === 'undefined') return null;
  const cols = 4;
  const rows = 8;
  const targetCellW = 128;
  const targetCellH = 128;
  const targetW = cols * targetCellW;
  const targetH = rows * targetCellH;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, targetW, targetH);

  const srcCellW = img.width / cols;
  const srcCellH = img.height / rows;

  // Mapping from target ISO_DIRECTIONS row [N, NE, E, SE, S, SW, W, NW]
  // to the uploaded photographer sprite sheet row order:
  // Row 0 = S (Front), Row 1 = SE, Row 2 = E, Row 3 = NE,
  // Row 4 = NW, Row 5 = SW, Row 6 = W, Row 7 = N (Back)
  const rowMap = remapUploadedRows ? [7, 3, 2, 1, 0, 5, 6, 4] : [0, 1, 2, 3, 4, 5, 6, 7];

  const insetX = Math.min(4, Math.floor(srcCellW * 0.02));
  const insetY = Math.min(4, Math.floor(srcCellH * 0.02));
  const cropW = Math.max(16, srcCellW - insetX * 2);
  const cropH = Math.max(16, srcCellH - insetY * 2);

  // Preserve aspect ratio inside the 128x128 cell
  const scale = Math.min((targetCellW - 8) / cropW, (targetCellH - 8) / cropH);
  const drawW = Math.round(cropW * scale);
  const drawH = Math.round(cropH * scale);
  const offsetX = Math.round((targetCellW - drawW) * 0.5);
  const offsetY = Math.round((targetCellH - drawH) * 0.5);

  for (let targetRow = 0; targetRow < rows; targetRow++) {
    const srcRow = rowMap[targetRow] ?? targetRow;
    for (let col = 0; col < cols; col++) {
      const sx = col * srcCellW + insetX;
      const sy = srcRow * srcCellH + insetY;
      const dx = col * targetCellW + offsetX;
      const dy = targetRow * targetCellH + offsetY;
      ctx.drawImage(img, sx, sy, cropW, cropH, dx, dy, drawW, drawH);
    }
  }

  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const keyed = keyOutChromaGreenRGBA(imgData.data);
  imgData.data.set(keyed);
  ctx.putImageData(imgData, 0, 0);

  const rgbaCopy = new Uint8ClampedArray(keyed);
  const atlas = extractSpriteSheetAtlas(rgbaCopy, targetW, targetH, cols, rows);

  return {
    canvas,
    rgba: rgbaCopy,
    atlas,
  };
}

/**
 * Loads the attached photographer sprite sheet image asynchronously,
 * removes its green screen, normalizes its 8-direction rows, and extracts all 32 frames.
 */
export function loadUploadedPhotographerSpriteSheet(
  url: string = DEFAULT_UPLOADED_SPRITE_SHEET_URL
): Promise<{
  canvas: HTMLCanvasElement;
  rgba: Uint8ClampedArray;
  atlas: SpriteAtlasSchema;
} | null> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const result = normalizeLoadedSpriteSheetImage(img, true);
        resolve(result);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

