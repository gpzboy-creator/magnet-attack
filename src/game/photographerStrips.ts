/**
 * Extra photographer animation strips (Gemini-generated, #00FF00 chroma background).
 *
 * Each strip is a single horizontal JPEG whose frames may be unevenly spaced; frames are
 * found automatically from the keyed alpha (column occupancy → segments).
 *
 *  - Seated strip (workstation chair), 4 frames:
 *      0 idle · 1 typing A · 2 typing B · 3 turned toward the party
 *  - Cutting strip (standing at the guillotine cutter), 6 frames:
 *      0 place sheet · 1 reach up · 2 pull down · 3 full cut · 4 lever up · 5 collect magnets
 */

const BASE = import.meta.env?.BASE_URL ?? '/';
export const SEATED_SPRITE_URL = `${BASE}assets/aistudio/photographer-seated.jpg`;
export const CUTTING_SPRITE_URL = `${BASE}assets/aistudio/photographer-cutting.jpg`;

export const SEATED_FRAME = {
  idle: 0,
  typingA: 1,
  typingB: 2,
  lookAtParty: 3,
} as const;

export const CUTTING_FRAME = {
  placeSheet: 0,
  reachUp: 1,
  pullDown: 2,
  fullCut: 3,
  leverUp: 4,
  collect: 5,
} as const;

export interface StripFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Ground anchor X as a fraction of the frame width. */
  anchorX: number;
  /** Ground anchor Y (bottom of the shoes) as a fraction of the frame height. */
  anchorY: number;
}

export interface SpriteStrip {
  canvas: HTMLCanvasElement;
  frames: StripFrame[];
}

/** Kept for compatibility with earlier code. */
export type SeatedSpriteFrame = StripFrame;
export type SeatedSpriteSheet = SpriteStrip;

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
 * Horizontal center of the shoes: mean X of opaque pixels in the bottom `bandFraction`
 * of the frame, as a fraction of the frame width. Arms stretched sideways don't move it,
 * so the character's feet stay planted while the frame's bounding box changes.
 */
export function computeFeetAnchorX(
  rgba: Uint8ClampedArray,
  imageWidth: number,
  rect: { x: number; y: number; width: number; height: number },
  bandFraction = 0.07
): number {
  const bandTop = rect.y + Math.floor(rect.height * (1 - bandFraction));
  let sum = 0;
  let count = 0;
  for (let y = bandTop; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      if (rgba[(y * imageWidth + x) * 4 + 3] > 0) {
        sum += x;
        count++;
      }
    }
  }
  if (count === 0) return 0.5;
  return (sum / count - rect.x) / rect.width;
}

/**
 * Loads a strip, keys the background and returns a canvas + frame rects.
 * `anchorX` picks each frame's ground anchor: 'feet' measures the shoes, or pass a
 * function returning a fixed fraction. Resolves null when the image is missing or has
 * fewer than `minFrames` frames, so callers can fall back to the standing sheet.
 */
export function loadSpriteStrip(
  url: string,
  options: {
    minFrames: number;
    anchorX: 'feet' | ((frameIndex: number) => number);
  }
): Promise<SpriteStrip | null> {
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
        if (rects.length < options.minFrames) return resolve(null);
        const frames: StripFrame[] = rects.slice(0, options.minFrames).map((r, i) => ({
          ...r,
          anchorX:
            options.anchorX === 'feet'
              ? computeFeetAnchorX(data.data, canvas.width, r)
              : options.anchorX(i),
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

/** Seated strip: hips sit roughly a third of the way in from the back. */
export function loadSeatedPhotographerSheet(url: string = SEATED_SPRITE_URL): Promise<SpriteStrip | null> {
  return loadSpriteStrip(url, {
    minFrames: 4,
    anchorX: (i) => (i === SEATED_FRAME.lookAtParty ? 0.42 : 0.36),
  });
}

/** Cutting strip: anchored on the shoes so the feet stay planted while the arms move. */
export function loadCuttingPhotographerSheet(url: string = CUTTING_SPRITE_URL): Promise<SpriteStrip | null> {
  return loadSpriteStrip(url, { minFrames: 6, anchorX: 'feet' });
}
