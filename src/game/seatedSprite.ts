/**
 * Seated photographer sprite strip (workstation chair).
 *
 * Source: a single horizontal JPEG strip on a #00FF00 chroma background with 4 frames
 * at uneven spacing (generated with Gemini):
 *   0 = idle (back 3/4 view, facing up-right toward the desk)
 *   1 = typing A
 *   2 = typing B
 *   3 = turned toward the viewer (glancing at the party)
 *
 * Frames are found automatically from the keyed alpha (column occupancy → segments),
 * so the strip doesn't need exact cell spacing.
 */

export const SEATED_SPRITE_URL = `${import.meta.env?.BASE_URL ?? '/'}assets/aistudio/photographer-seated.jpg`;

export const SEATED_FRAME = {
  idle: 0,
  typingA: 1,
  typingB: 2,
  lookAtParty: 3,
} as const;

export interface SeatedSpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Horizontal seat point as a fraction of the frame width (where the hips sit on the chair). */
  anchorX: number;
  /** Floor contact (bottom of the shoes) as a fraction of the frame height. */
  anchorY: number;
}

export interface SeatedSpriteSheet {
  canvas: HTMLCanvasElement;
  frames: SeatedSpriteFrame[];
}

/** True for chroma-key green pixels (tolerant of JPEG noise). */
export function isChromaGreen(r: number, g: number, b: number): boolean {
  return g > 110 && g > r * 1.35 && g > b * 1.35;
}

/**
 * Keys out the green background in place (alpha = 0) and removes green spill from
 * the edge pixels that remain.
 */
export function keyOutGreenInPlace(rgba: Uint8ClampedArray): void {
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    if (isChromaGreen(r, g, b)) {
      rgba[i + 3] = 0;
      continue;
    }
    // Despill: no kept pixel may be greener than its strongest other channel
    const cap = Math.max(r, b);
    if (g > cap + 12) rgba[i + 1] = cap + 12;
  }
}

/**
 * Finds sprite frames in a keyed strip: columns with opaque pixels form horizontal
 * segments; each segment's opaque rows give its vertical bounds.
 */
export function findStripFrames(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: { minColumnPixels?: number; minFrameWidth?: number; minRowPixels?: number } = {}
): Array<{ x: number; y: number; width: number; height: number }> {
  const minColumnPixels = options.minColumnPixels ?? 3;
  const minFrameWidth = options.minFrameWidth ?? 20;
  const minRowPixels = options.minRowPixels ?? 3;

  const opaque = (x: number, y: number) => rgba[(y * width + x) * 4 + 3] > 0;

  const segments: Array<[number, number]> = [];
  let start = -1;
  for (let x = 0; x <= width; x++) {
    let count = 0;
    if (x < width) {
      for (let y = 0; y < height; y++) if (opaque(x, y)) count++;
    }
    const filled = count >= minColumnPixels;
    if (filled && start < 0) start = x;
    if (!filled && start >= 0) {
      if (x - start >= minFrameWidth) segments.push([start, x]);
      start = -1;
    }
  }

  return segments.map(([x0, x1]) => {
    let top = height;
    let bottom = -1;
    for (let y = 0; y < height; y++) {
      let count = 0;
      for (let x = x0; x < x1; x++) if (opaque(x, y)) count++;
      if (count >= minRowPixels) {
        if (y < top) top = y;
        bottom = y;
      }
    }
    return { x: x0, y: Math.max(0, top), width: x1 - x0, height: Math.max(1, bottom - top + 1) };
  });
}

/**
 * Loads the seated strip, keys the background and returns a canvas + frame rects.
 * Resolves null if the image is missing or doesn't contain 4 frames, so callers can
 * fall back to the standing sheet.
 */
export function loadSeatedPhotographerSheet(url: string = SEATED_SPRITE_URL): Promise<SeatedSpriteSheet | null> {
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
        keyOutGreenInPlace(data.data);
        ctx.putImageData(data, 0, 0);

        const rects = findStripFrames(data.data, canvas.width, canvas.height);
        if (rects.length < 4) return resolve(null);
        const frames: SeatedSpriteFrame[] = rects.slice(0, 4).map((r, i) => ({
          ...r,
          // Hips sit roughly a third of the way in from the back; the front-facing frame is more centered
          anchorX: i === SEATED_FRAME.lookAtParty ? 0.42 : 0.36,
          anchorY: 1,
        }));
        resolve({ canvas, frames });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
