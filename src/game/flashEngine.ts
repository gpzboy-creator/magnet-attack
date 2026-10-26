/**
 * FlashEngine — pooled camera-flash / light-cone VFX for the isometric Canvas2D renderer.
 *
 * Responsibilities
 *  - Geometry: each shot is a circular sector ("cone") on the WORLD ground plane
 *    (origin, aim angle, range, fov). Gameplay hit-tests run in world space, so they are
 *    independent of the camera/zoom. Rendering projects the sector through the iso
 *    projection (2:1, i.e. Y compressed by 0.5) at lens height, so the cone reads as a
 *    horizontal fan of light in 2.5D.
 *  - Envelope: Phase 1 peak (0–peakMs) → Phase 2 ease-out decay + slight cone expansion
 *    → Phase 3 instance is returned to the pool (no per-shot allocations kept alive).
 *  - Pooling: a fixed-size pool of mutable FlashShot objects. fire() never allocates a shot;
 *    when the pool is exhausted the oldest active shot is recycled.
 *  - Hooks: onFire (sound FX), onTargetHit (guest reactions), onExpire.
 *
 * The module has no DOM / React / game-state dependencies except the CanvasRenderingContext2D
 * passed to render(), so it can be unit-tested in Node.
 */

export interface FlashVec2 {
  x: number;
  y: number;
}

/** Anything with a world position (and optional body radius) can be lit by the cone. */
export interface FlashTarget extends FlashVec2 {
  /** Body radius in world units, so guests at the cone edge still count. Default 0. */
  radius?: number;
}

/** Projects a world-space point (plus height z) to SCREEN pixels. */
export type FlashProjector = (worldX: number, worldY: number, z: number) => FlashVec2;

/** Which side of the shooter's sprite the flash should be drawn on. */
export type FlashLayer = 'front' | 'behind';

export interface FlashShotParams<T extends FlashTarget = FlashTarget> {
  /** World-space position of the shooter's feet (cone apex on the ground plane). */
  origin: FlashVec2;
  /** World-space point to aim at. Ignored when `angle` is given. */
  target?: FlashVec2;
  /** World-space aim angle in radians (atan2(dy, dx) on the ground plane). */
  angle?: number;
  /** Max reach of the cone in world units. Default 150. */
  range?: number;
  /** Full spread of the cone in degrees. Default 52. */
  fov?: number;
  /** Total lifetime in ms (peak + decay). Default 200. */
  duration?: number;
  /** Length of the full-intensity peak in ms. Default 50. */
  peakMs?: number;
  /** Flash tint as #rgb / #rrggbb. Default warm white #fff6e0. */
  color?: string;
  /** Height (z) of the lens above the floor, used for projection. Default 44. */
  lensHeight?: number;
  /**
   * Exact screen-space offset of the lens from the projected foot point, e.g. from the
   * sprite's camera attachment. When set it overrides lensHeight for the apex/flare position.
   */
  lensScreenOffset?: FlashVec2;
  /** Draw in front of or behind the shooter sprite. Default 'front'. */
  layer?: FlashLayer;
  /** Targets to hit-test once, at the moment of firing. */
  targets?: readonly T[];
  /** Arbitrary tag forwarded to hooks (e.g. 'pulse' | 'wide'). */
  tag?: string;
  /**
   * Optional anchor key (e.g. 'player'). Shots with a key can be moved with
   * updateAnchor() so the light stays attached to a moving shooter while it fades.
   */
  anchorKey?: string;
}

/** A live (pooled) flash instance. Treat as read-only outside the engine. */
export interface FlashShot {
  active: boolean;
  id: number;
  originX: number;
  originY: number;
  angle: number;
  range: number;
  /** Half of the fov, in radians. */
  halfFov: number;
  durationMs: number;
  peakMs: number;
  ageMs: number;
  r: number;
  g: number;
  b: number;
  lensHeight: number;
  hasLensOffset: boolean;
  lensOffsetX: number;
  lensOffsetY: number;
  layer: FlashLayer;
  tag: string;
  anchorKey: string;
}

export interface FlashEngineHooks<T extends FlashTarget = FlashTarget> {
  /** Fired synchronously when a shot is emitted — play the shutter/flash sound here. */
  onFire?: (shot: Readonly<FlashShot>) => void;
  /** Fired once per target caught in the cone at the moment of firing. */
  onTargetHit?: (target: T, shot: Readonly<FlashShot>) => void;
  /** Fired when a shot finishes and returns to the pool. */
  onExpire?: (shot: Readonly<FlashShot>) => void;
}

export interface FlashEngineOptions<T extends FlashTarget = FlashTarget> extends FlashEngineHooks<T> {
  /** Number of pooled shots. Default 24 (rapid fire × wide 3-shot bursts). */
  poolSize?: number;
  /** Body radius (world units) for targets that don't define `radius`. Default 0. */
  defaultTargetRadius?: number;
}

export const FLASH_DEFAULTS = {
  range: 150,
  fov: 52,
  duration: 200,
  peakMs: 50,
  color: '#fff6e0',
  lensHeight: 44,
} as const;

/** Cone grows by this fraction of its range over its lifetime. */
const CONE_EXPANSION = 0.14;
/** Arc tessellation for rendering (points along the curved edge). */
const ARC_SEGMENTS = 14;

// ----------------------------------------------------------------------------
// Pure helpers (exported for tests and for gameplay code)
// ----------------------------------------------------------------------------

/** Wraps an angle to (-PI, PI]. */
export function wrapAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r <= -Math.PI) r += Math.PI * 2;
  if (r > Math.PI) r -= Math.PI * 2;
  return r;
}

/**
 * Intensity envelope 0..1 for a given age:
 *  Phase 1 (0..peakMs): 1
 *  Phase 2 (peakMs..duration): ease-out-cubic fall to 0
 *  Phase 3 (>= duration): 0
 */
export function flashIntensity(ageMs: number, peakMs: number, durationMs: number): number {
  if (ageMs < 0) return 0;
  if (ageMs <= peakMs) return 1;
  if (ageMs >= durationMs) return 0;
  const t = (ageMs - peakMs) / Math.max(1, durationMs - peakMs);
  const inv = 1 - t;
  return inv * inv * inv; // (1 - t)^3: fast exponential-like drop, smooth tail
}

/** 0..1 progress through the shot's life. */
export function flashProgress(ageMs: number, durationMs: number): number {
  return Math.max(0, Math.min(1, ageMs / Math.max(1, durationMs)));
}

/** Parses #rgb / #rrggbb to RGB; falls back to warm white. */
export function parseFlashColor(hex: string | undefined): { r: number; g: number; b: number } {
  const clean = (hex ?? '').replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean.length === 6
      ? clean
      : 'fff6e0';
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return { r: 255, g: 246, b: 224 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export interface ConeGeometry {
  originX: number;
  originY: number;
  angle: number;
  range: number;
  halfFov: number;
}

/**
 * True when a (circular) target overlaps the cone sector on the ground plane.
 * A target's radius widens both the reach and the angular tolerance, so a guest
 * whose shoulder is inside the cone edge still counts.
 */
export function isTargetInCone(
  cone: ConeGeometry,
  target: FlashTarget,
  defaultRadius = 0
): boolean {
  const dx = target.x - cone.originX;
  const dy = target.y - cone.originY;
  const dist = Math.hypot(dx, dy);
  const radius = Math.max(0, target.radius ?? defaultRadius);
  if (dist <= radius) return true; // standing on top of the shooter
  if (dist - radius > cone.range) return false;
  const angularSlack = Math.asin(Math.min(1, radius / dist));
  const delta = Math.abs(wrapAngle(Math.atan2(dy, dx) - cone.angle));
  return delta <= cone.halfFov + angularSlack;
}

/**
 * Returns every target inside the cone. Pass `out` to reuse an array and avoid allocation
 * during rapid fire; it is cleared first.
 */
export function getAffectedTargets<T extends FlashTarget>(
  cone: ConeGeometry,
  targets: readonly T[],
  out: T[] = [],
  defaultRadius = 0
): T[] {
  out.length = 0;
  for (const t of targets) {
    if (isTargetInCone(cone, t, defaultRadius)) out.push(t);
  }
  return out;
}

/**
 * World-space polygon of the cone (apex + arc points), e.g. for debug drawing or
 * custom intersection tests. Writes into `out` when provided.
 */
export function getConePolygon(
  cone: ConeGeometry,
  segments = ARC_SEGMENTS,
  out: FlashVec2[] = []
): FlashVec2[] {
  out.length = 0;
  out.push({ x: cone.originX, y: cone.originY });
  for (let i = 0; i <= segments; i++) {
    const a = cone.angle - cone.halfFov + (2 * cone.halfFov * i) / segments;
    out.push({ x: cone.originX + Math.cos(a) * cone.range, y: cone.originY + Math.sin(a) * cone.range });
  }
  return out;
}

// ----------------------------------------------------------------------------
// Engine
// ----------------------------------------------------------------------------

function createPooledShot(): FlashShot {
  return {
    active: false,
    id: 0,
    originX: 0,
    originY: 0,
    angle: 0,
    range: 0,
    halfFov: 0,
    durationMs: 0,
    peakMs: 0,
    ageMs: 0,
    r: 255,
    g: 246,
    b: 224,
    lensHeight: FLASH_DEFAULTS.lensHeight,
    hasLensOffset: false,
    lensOffsetX: 0,
    lensOffsetY: 0,
    layer: 'front',
    tag: '',
    anchorKey: '',
  };
}

export class FlashEngine<T extends FlashTarget = FlashTarget> {
  private readonly pool: FlashShot[];
  private readonly hooks: FlashEngineHooks<T>;
  private nextId = 1;
  private readonly defaultTargetRadius: number;
  /** Reused scratch buffers (no per-frame / per-shot garbage). */
  private readonly hitScratch: T[] = [];
  private readonly arcScratch: FlashVec2[] = [];

  constructor(options: FlashEngineOptions<T> = {}) {
    const size = Math.max(1, Math.floor(options.poolSize ?? 24));
    this.defaultTargetRadius = Math.max(0, options.defaultTargetRadius ?? 0);
    this.pool = Array.from({ length: size }, createPooledShot);
    this.hooks = { onFire: options.onFire, onTargetHit: options.onTargetHit, onExpire: options.onExpire };
    for (let i = 0; i <= ARC_SEGMENTS; i++) this.arcScratch.push({ x: 0, y: 0 });
  }

  /** Total pooled instances (constant for the engine's lifetime). */
  get capacity(): number {
    return this.pool.length;
  }

  /** Number of shots currently on screen. */
  get activeCount(): number {
    let n = 0;
    for (const s of this.pool) if (s.active) n++;
    return n;
  }

  /**
   * Emits a flash. Returns the pooled instance (do not keep a reference past its lifetime —
   * it will be reused). Hit-tests `params.targets` immediately (light travels instantly) and
   * calls onTargetHit for each target caught in the cone.
   */
  fire(params: FlashShotParams<T>): FlashShot {
    const shot = this.acquire();
    const color = parseFlashColor(params.color ?? FLASH_DEFAULTS.color);

    let angle = params.angle;
    if (angle === undefined) {
      const tx = params.target?.x ?? params.origin.x + 1;
      const ty = params.target?.y ?? params.origin.y;
      angle = Math.atan2(ty - params.origin.y, tx - params.origin.x);
    }

    const durationMs = Math.max(16, params.duration ?? FLASH_DEFAULTS.duration);
    shot.active = true;
    shot.id = this.nextId++;
    shot.originX = params.origin.x;
    shot.originY = params.origin.y;
    shot.angle = wrapAngle(angle);
    shot.range = Math.max(1, params.range ?? FLASH_DEFAULTS.range);
    shot.halfFov = (Math.max(1, Math.min(179, params.fov ?? FLASH_DEFAULTS.fov)) * Math.PI) / 360;
    shot.durationMs = durationMs;
    shot.peakMs = Math.min(durationMs, Math.max(0, params.peakMs ?? FLASH_DEFAULTS.peakMs));
    shot.ageMs = 0;
    shot.r = color.r;
    shot.g = color.g;
    shot.b = color.b;
    shot.lensHeight = params.lensHeight ?? FLASH_DEFAULTS.lensHeight;
    shot.hasLensOffset = Boolean(params.lensScreenOffset);
    shot.lensOffsetX = params.lensScreenOffset?.x ?? 0;
    shot.lensOffsetY = params.lensScreenOffset?.y ?? 0;
    shot.layer = params.layer ?? 'front';
    shot.tag = params.tag ?? '';
    shot.anchorKey = params.anchorKey ?? '';

    // HOOK: sound FX / camera shake / analytics
    this.hooks.onFire?.(shot);

    // HOOK: gameplay reactions for everything caught in the light
    if (params.targets && this.hooks.onTargetHit) {
      const hits = getAffectedTargets(shot, params.targets, this.hitScratch, this.defaultTargetRadius);
      for (const t of hits) this.hooks.onTargetHit(t, shot);
      this.hitScratch.length = 0;
    }
    return shot;
  }

  /** Hit-test an arbitrary list against a live shot (e.g. targets that moved into the light). */
  query(shot: Readonly<FlashShot>, targets: readonly T[], out: T[] = []): T[] {
    return getAffectedTargets(shot, targets, out, this.defaultTargetRadius);
  }

  /**
   * Moves every live shot fired with `anchorKey` to a new origin (and optional lens offset /
   * layer), so the cone follows the shooter while it decays. Aim angle is kept.
   */
  updateAnchor(
    anchorKey: string,
    origin: FlashVec2,
    lensScreenOffset?: FlashVec2,
    layer?: FlashLayer
  ): void {
    for (const shot of this.pool) {
      if (!shot.active || !anchorKey || shot.anchorKey !== anchorKey) continue;
      shot.originX = origin.x;
      shot.originY = origin.y;
      if (lensScreenOffset) {
        shot.hasLensOffset = true;
        shot.lensOffsetX = lensScreenOffset.x;
        shot.lensOffsetY = lensScreenOffset.y;
      }
      if (layer) shot.layer = layer;
    }
  }

  /** Advances all shots; expired ones return to the pool (Phase 3 cleanup). */
  update(dtMs: number): void {
    const step = Math.max(0, dtMs);
    for (const shot of this.pool) {
      if (!shot.active) continue;
      shot.ageMs += step;
      if (shot.ageMs >= shot.durationMs) this.release(shot);
    }
  }

  /** Drops every live shot (e.g. on restart). */
  clear(): void {
    for (const shot of this.pool) if (shot.active) this.release(shot);
  }

  /**
   * Draws all live shots on the given layer.
   * Call with 'behind' before drawing the shooter sprite and 'front' after it,
   * so a flash fired away from the viewer is occluded by the body.
   */
  render(ctx: CanvasRenderingContext2D, project: FlashProjector, layer: FlashLayer): void {
    for (const shot of this.pool) {
      if (!shot.active || shot.layer !== layer) continue;
      this.drawShot(ctx, project, shot);
    }
  }

  // --------------------------------------------------------------------------

  private acquire(): FlashShot {
    let oldest: FlashShot | null = null;
    for (const shot of this.pool) {
      if (!shot.active) return shot;
      if (!oldest || shot.ageMs > oldest.ageMs) oldest = shot;
    }
    // Pool exhausted: recycle the shot closest to finishing.
    if (oldest) this.release(oldest);
    return oldest ?? this.pool[0];
  }

  private release(shot: FlashShot): void {
    shot.active = false;
    this.hooks.onExpire?.(shot);
  }

  private drawShot(ctx: CanvasRenderingContext2D, project: FlashProjector, shot: FlashShot): void {
    const intensity = flashIntensity(shot.ageMs, shot.peakMs, shot.durationMs);
    if (intensity <= 0.002) return;
    const progress = flashProgress(shot.ageMs, shot.durationMs);
    const { r, g, b } = shot;
    const isFront = shot.layer === 'front';

    // Apex: the lens. Either an exact sprite attachment offset or the projected lens height.
    const foot = project(shot.originX, shot.originY, 0);
    const apex = shot.hasLensOffset
      ? { x: foot.x + shot.lensOffsetX, y: foot.y + shot.lensOffsetY }
      : project(shot.originX, shot.originY, shot.lensHeight);

    // Arc of the cone at lens height, projected → iso-compressed fan. Expands as it fades.
    const reach = shot.range * (1 + CONE_EXPANSION * progress);
    const half = shot.halfFov * (1 + 0.08 * progress);
    // Shift the projected fan so its apex sits exactly on the lens (sprite attachment point)
    const lensBase = project(shot.originX, shot.originY, shot.lensHeight);
    const shiftX = apex.x - lensBase.x;
    const shiftY = apex.y - lensBase.y;
    let far = 0;
    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      const a = shot.angle - half + (2 * half * i) / ARC_SEGMENTS;
      const p = project(shot.originX + Math.cos(a) * reach, shot.originY + Math.sin(a) * reach, shot.lensHeight);
      const pt = this.arcScratch[i];
      pt.x = p.x + shiftX;
      pt.y = p.y + shiftY;
      far = Math.max(far, Math.hypot(pt.x - apex.x, pt.y - apex.y));
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Light cone: radial falloff from the lens along the beam (distance) …
    const coneAlpha = (isFront ? 0.55 : 0.3) * intensity;
    const grad = ctx.createRadialGradient(apex.x, apex.y, 2, apex.x, apex.y, Math.max(8, far));
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${coneAlpha})`);
    grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${coneAlpha * 0.45})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    for (let i = 0; i <= ARC_SEGMENTS; i++) ctx.lineTo(this.arcScratch[i].x, this.arcScratch[i].y);
    ctx.closePath();
    ctx.fill();

    // … and angular falloff: a narrower, brighter core beam down the middle of the cone.
    const coreHalf = Math.floor(ARC_SEGMENTS / 2);
    const coreSpan = Math.max(1, Math.floor(ARC_SEGMENTS / 5));
    const coreGrad = ctx.createRadialGradient(apex.x, apex.y, 1, apex.x, apex.y, Math.max(8, far * 0.8));
    coreGrad.addColorStop(0, `rgba(255, 255, 255, ${coneAlpha * 0.9})`);
    coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    for (let i = coreHalf - coreSpan; i <= coreHalf + coreSpan; i++) {
      ctx.lineTo(this.arcScratch[i].x, this.arcScratch[i].y);
    }
    ctx.closePath();
    ctx.fill();

    if (isFront) {
      // Phase 1 lens flare: hot white core + warm bloom + 4-point glint, shrinking with intensity.
      const flareR = 6 + 14 * intensity;
      const bloom = ctx.createRadialGradient(apex.x, apex.y, 0, apex.x, apex.y, flareR * 2.4);
      bloom.addColorStop(0, `rgba(255, 255, 255, ${0.95 * intensity})`);
      bloom.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${0.7 * intensity})`);
      bloom.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(apex.x, apex.y, flareR * 2.4, 0, Math.PI * 2);
      ctx.fill();

      const glint = flareR * 2.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * intensity})`;
      ctx.fillRect(apex.x - glint, apex.y - 0.75, glint * 2, 1.5);
      ctx.fillRect(apex.x - 0.75, apex.y - glint, 1.5, glint * 2);
    } else {
      // Behind the body: no frontal flare, just a soft rim halo that spills around the silhouette.
      const halo = ctx.createRadialGradient(apex.x, apex.y, 3, apex.x, apex.y, 34);
      halo.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.45 * intensity})`);
      halo.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(apex.x, apex.y, 34, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
