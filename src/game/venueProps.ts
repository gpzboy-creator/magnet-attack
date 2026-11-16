/**
 * PixelLab hi-bit prop sprites placed by their floor footprint.
 *
 * Each sprite is an isometric box-like object. `ax, ay` is the sprite pixel at its left ground corner,
 * i.e. the world point (minX, maxY, z0); `lx, ly` are the footprint edge lengths in sprite pixels
 * (a world length L along x or y spans L screen px), `h` the body height in pixels. Drawn at scale `s`,
 * the world footprint is (lx·s) × (ly·s).
 */
import { worldToIso } from './rules.ts';

export interface PropSprite {
  file: string;
  ax: number;
  ay: number;
  lx: number;
  ly: number;
  h: number;
  s: number;
}

export const PROP_SPRITES = {
  /** Outdoor cocktail bar with a flower pergola (reception garden). */
  bar: { file: 'assets/aistudio/bar.png', ax: 0, ay: 202, lx: 115, ly: 154, h: 196, s: 0.95 },
  /** Raised black DJ stage with a cyan LED edge and steps (mirrored so its long side runs along x). */
  djStage: { file: 'assets/aistudio/dj-stage.png', ax: 1, ay: 129, lx: 140, ly: 126, h: 37, s: 0.8 },
  /** DJ console: turntables, mixer, laptop, LED front panel facing +y (the dance floor). */
  djConsole: { file: 'assets/aistudio/dj-console.png', ax: 28, ay: 162, lx: 148, ly: 73, h: 78, s: 0.6 },
} satisfies Record<string, PropSprite>;

export type PropName = keyof typeof PROP_SPRITES;

/** World footprint of a prop whose left ground corner is at (minX, maxY). */
export function propFootprint(spec: PropSprite, minX: number, maxY: number) {
  return { minX, maxX: minX + spec.lx * spec.s, minY: maxY - spec.ly * spec.s, maxY };
}

/** Height of the prop's top surface in world z. */
export const propTopZ = (spec: PropSprite) => spec.h * spec.s;

export function drawPropSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  spec: PropSprite,
  originX: number,
  originY: number,
  minX: number,
  maxY: number,
  z0 = 0
) {
  const c = worldToIso(minX, maxY, z0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    img,
    Math.round(originX + c.x - spec.ax * spec.s),
    Math.round(originY + c.y - spec.ay * spec.s),
    Math.round(img.width * spec.s),
    Math.round(img.height * spec.s)
  );
  ctx.restore();
}

/** The DJ set in the hall: stage against the LED wall, the DJ behind his console, facing the dance floor. */
export const DJ_SET = (() => {
  const stage = propFootprint(PROP_SPRITES.djStage, -152, -200);
  const stageZ = propTopZ(PROP_SPRITES.djStage);
  const console = propFootprint(PROP_SPRITES.djConsole, -140, stage.maxY - 12);
  return {
    stage,
    stageZ,
    console,
    /** Where the DJ stands (on the stage, between the LED wall and the console). */
    feet: { x: (console.minX + console.maxX) / 2 - 12.5, y: stage.minY + 39 },
    /** LED video wall along the back edge of the stage. */
    ledWall: { x0: stage.minX + 6, x1: stage.maxX - 6, y: stage.minY + 6, z0: stageZ + 30, height: 84 },
  };
})();
