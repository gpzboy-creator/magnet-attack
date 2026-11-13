/**
 * Photographer "take a photo" animation (PixelLab, 9 frames per direction).
 *
 * Sheet: tools/make_photographer_shoot.py → public/assets/aistudio/photographer-shoot.png
 * Rows N,NE,E,SE,S,SW,W,NW · 9 columns of 352px cells. Frame 0 is exactly the standing pose,
 * frames rise to the eye, `flash` is the shutter burst, `flash + 1` the after-sparkle.
 * Every cell is placed so the character's head is at the cell centre and the feet on the
 * baseline (cell bottom − 30px), the same registration as the walk sheet.
 */
import type { IsoDirection } from './spriteExtractor.ts';

const BASE = import.meta.env?.BASE_URL ?? '/';
export const SHOOT_SHEET_URL = `${BASE}assets/aistudio/photographer-shoot.png`;

const ROWS: IsoDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const SHOOT_CELL = 352;
export const SHOOT_BASELINE_FROM_BOTTOM = 30;
export const SHOOT_FRAMES_PER_DIR = 9;

/** Index of the shutter-burst frame per direction (directions not listed have no shoot animation). */
export const SHOOT_FLASH_FRAME: Partial<Record<IsoDirection, number>> = {
  NE: 4,
  E: 4,
  SE: 4,
  S: 4,
  SW: 5,
  W: 5,
  NW: 5,
};

/** Seconds to raise the camera to the eye (the first shot waits for it), and to lower it. */
export const CAMERA_RAISE_SEC = 0.14;
export const CAMERA_LOWER_SEC = 0.22;
/** Camera stays at the eye this long after the last shot before lowering. */
export const CAMERA_HOLD_SEC = 0.4;
/** Shutter burst on screen. */
export const SHUTTER_FLASH_SEC = 0.12;

export interface ShootFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

export interface ShootSheet {
  canvas: HTMLCanvasElement;
  frames: Partial<Record<IsoDirection, ShootFrame[]>>;
}

/**
 * Which of the 9 frames to show.
 * raise: 0 (camera at the chest) … 1 (at the eye); flashLeft: seconds left of the shutter burst.
 */
export function getShootFrameIndex(flashFrame: number, raise: number, flashLeft: number): number {
  if (flashLeft > 0) return flashLeft > SHUTTER_FLASH_SEC / 2 ? flashFrame : flashFrame + 1;
  const eye = Math.max(0, flashFrame - 1);
  if (raise >= 1) return eye;
  return Math.max(0, Math.min(eye, Math.round(Math.max(0, raise) * eye)));
}

export function hasShootAnimation(dir: IsoDirection): boolean {
  return SHOOT_FLASH_FRAME[dir] !== undefined;
}

export function loadShootSheet(url: string = SHOOT_SHEET_URL): Promise<ShootSheet | null> {
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
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const C = SHOOT_CELL;
        const frames: ShootSheet['frames'] = {};
        ROWS.forEach((dir, r) => {
          if (!hasShootAnimation(dir)) return;
          const list: ShootFrame[] = [];
          for (let c = 0; c < SHOOT_FRAMES_PER_DIR; c++) {
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -1;
            let maxY = -1;
            for (let y = r * C; y < (r + 1) * C; y++) {
              for (let x = c * C; x < (c + 1) * C; x++) {
                if (data[(y * canvas.width + x) * 4 + 3] > 16) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }
            if (maxX < 0) return;
            const width = maxX - minX + 1;
            const height = maxY - minY + 1;
            const centerX = (c + 0.5) * C;
            const baseY = (r + 1) * C - SHOOT_BASELINE_FROM_BOTTOM;
            list.push({
              x: minX,
              y: minY,
              width,
              height,
              anchorX: (centerX - minX) / width,
              anchorY: (baseY - minY) / height,
            });
          }
          frames[dir] = list;
        });
        resolve({ canvas, frames });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
