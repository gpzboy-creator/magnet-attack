/**
 * Wedding cast sprites from the attached character sheet (magenta #B3377F background):
 * the unique bride & groom (front / side / back) and several guest looks.
 *
 * Rects are in source-sheet pixels; the loader keys out the magenta and measures each
 * frame's foot anchor so characters stand on the same ground point whatever the pose.
 */

import type { IsoDirection } from './spriteExtractor.ts';
import { computeFeetAnchorX, keyOutColorInPlace } from './photographerStrips.ts';

export const CAST_SHEET_URL = `${import.meta.env?.BASE_URL ?? '/'}assets/aistudio/wedding-cast.png`;
const KEY_RGB: [number, number, number] = [179, 55, 127];
const KEY_TOLERANCE = 42;

export type CastView = 'front' | 'side' | 'back';

export type CastLookId =
  | 'bride'
  | 'groom'
  | 'green_suit'
  | 'brown_suit'
  | 'purple_dress'
  | 'navy_suit'
  | 'blue_dress'
  | 'purple_drink'
  | 'black_phone';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CastLookDef {
  views: Partial<Record<CastView, Rect>>;
  /** On-screen standing height (px at scale 1). */
  height: number;
  /** Colours for the procedural (seated) fallback so a guest looks the same when sitting. */
  palette: { outfit: string; hair: string; isDress: boolean };
  /** Can be assigned to regular guests (false for the unique bride & groom). */
  forGuests: boolean;
}

export const CAST_LOOKS: Record<CastLookId, CastLookDef> = {
  bride: {
    views: { front: { x: 12, y: 7, w: 50, h: 81 }, side: { x: 72, y: 7, w: 47, h: 80 }, back: { x: 126, y: 6, w: 51, h: 82 } },
    height: 64,
    palette: { outfit: '#f8f4ec', hair: '#7a4a2a', isDress: true },
    forGuests: false,
  },
  groom: {
    views: { front: { x: 187, y: 7, w: 29, h: 78 }, side: { x: 228, y: 7, w: 22, h: 78 }, back: { x: 263, y: 6, w: 29, h: 79 } },
    height: 66,
    palette: { outfit: '#6b6e73', hair: '#4a3020', isDress: false },
    forGuests: false,
  },
  green_suit: {
    views: { front: { x: 187, y: 89, w: 28, h: 82 }, side: { x: 228, y: 90, w: 24, h: 81 }, back: { x: 263, y: 90, w: 28, h: 81 } },
    height: 64,
    palette: { outfit: '#5f7a4a', hair: '#5a3a24', isDress: false },
    forGuests: true,
  },
  brown_suit: {
    views: { front: { x: 308, y: 101, w: 27, h: 70 } },
    height: 64,
    palette: { outfit: '#6b4a2b', hair: '#2a1a12', isDress: false },
    forGuests: true,
  },
  purple_dress: {
    views: { front: { x: 14, y: 285, w: 16, h: 51 }, side: { x: 48, y: 285, w: 15, h: 51 }, back: { x: 82, y: 285, w: 16, h: 51 } },
    height: 58,
    palette: { outfit: '#7e3fb8', hair: '#6b3f22', isDress: true },
    forGuests: true,
  },
  navy_suit: {
    views: { front: { x: 422, y: 103, w: 23, h: 67 }, back: { x: 457, y: 104, w: 19, h: 64 } },
    height: 62,
    palette: { outfit: '#262a44', hair: '#1c1410', isDress: false },
    forGuests: true,
  },
  blue_dress: {
    views: { front: { x: 489, y: 102, w: 19, h: 66 } },
    height: 58,
    palette: { outfit: '#4a6f9c', hair: '#7a4a2a', isDress: true },
    forGuests: true,
  },
  purple_drink: {
    views: { front: { x: 197, y: 179, w: 22, h: 58 } },
    height: 58,
    palette: { outfit: '#7e3fb8', hair: '#2a1a12', isDress: true },
    forGuests: true,
  },
  black_phone: {
    views: { front: { x: 221, y: 181, w: 24, h: 56 } },
    height: 62,
    palette: { outfit: '#1f1f24', hair: '#4a3020', isDress: false },
    forGuests: true,
  },
};

/** Bride & groom embracing (used for the chuppah kiss moment). */
export const EMBRACE_RECT: Rect = { x: 259, y: 183, w: 32, h: 57 };
export const EMBRACE_HEIGHT = 66;

export const GUEST_LOOKS_FEMALE: CastLookId[] = ['purple_dress', 'blue_dress', 'purple_drink'];
export const GUEST_LOOKS_MALE: CastLookId[] = ['green_suit', 'brown_suit', 'navy_suit', 'black_phone'];

/**
 * Removes the darker magenta drop-shadows and pink edge fringe the sheet has under each
 * character: red > blue > green with a strong magenta cast. Purple outfits (blue > red),
 * skin and hair (green ≥ blue) are untouched.
 */
export function keyOutMagentaShadowInPlace(rgba: Uint8ClampedArray): void {
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue;
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    if (r > b && b > g + 25 && r > g + 60) rgba[i + 3] = 0;
  }
}

export interface CastFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
}

export interface CastSheet {
  canvas: HTMLCanvasElement;
  frames: Map<string, CastFrame>;
  embrace: CastFrame | null;
}

/**
 * Which sprite view to use for an iso facing direction, and whether to mirror it.
 * Side views face screen-right in the sheet.
 */
export function castViewForDirection(dir: IsoDirection): { view: CastView; flip: boolean } {
  switch (dir) {
    case 'N':
    case 'NE':
    case 'NW':
      return { view: 'back', flip: false };
    case 'E':
      return { view: 'side', flip: false };
    case 'W':
      return { view: 'side', flip: true };
    case 'SW':
      return { view: 'front', flip: true };
    default:
      return { view: 'front', flip: false };
  }
}

/** Resolve a frame for a look + direction, falling back to whatever view the look has. */
export function getCastFrame(
  sheet: CastSheet,
  look: CastLookId,
  dir: IsoDirection
): { frame: CastFrame; flip: boolean } | null {
  const { view, flip } = castViewForDirection(dir);
  const order: CastView[] = [view, 'front', 'side', 'back'];
  for (const v of order) {
    const f = sheet.frames.get(`${look}:${v}`);
    if (f) return { frame: f, flip: v === view ? flip : false };
  }
  return null;
}

export function loadCastSheet(url: string = CAST_SHEET_URL): Promise<CastSheet | null> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        keyOutColorInPlace(data.data, KEY_RGB, KEY_TOLERANCE);
        keyOutMagentaShadowInPlace(data.data);
        ctx.putImageData(data, 0, 0);
        const toFrame = (r: Rect): CastFrame => ({
          x: r.x,
          y: r.y,
          width: r.w,
          height: r.h,
          anchorX: computeFeetAnchorX(data.data, canvas.width, { x: r.x, y: r.y, width: r.w, height: r.h }, 0.08),
        });
        const frames = new Map<string, CastFrame>();
        (Object.keys(CAST_LOOKS) as CastLookId[]).forEach((id) => {
          const def = CAST_LOOKS[id];
          (Object.keys(def.views) as CastView[]).forEach((v) => {
            const r = def.views[v];
            if (r) frames.set(`${id}:${v}`, toFrame(r));
          });
        });
        resolve({ canvas, frames, embrace: toFrame(EMBRACE_RECT) });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
