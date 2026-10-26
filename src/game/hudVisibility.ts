/**
 * Micro-HUD visibility & scaling rules (pure, unit-tested).
 *
 * Every persistent HUD cluster has an IDLE opacity it fades down to when nothing is
 * happening, and wakes up to full opacity when its value changes, when it's in a
 * warning state, or while the player holds the reveal key (Tab / Alt).
 */

/** Idle opacity per cluster (0 = fully hidden when idle). */
export const HUD_IDLE_OPACITY = {
  vitals: 0.35, // joy + crowd + delivery timer (top-left)
  progress: 0.55, // quota / score / DJ timer (top-right)
  systemIcons: 0.35, // settings / mute / pause (top-right)
  pipeline: 0, // production chips (bottom-left) — hidden when empty
  loadout: 0.3, // lens / frame / upgrades (bottom-right)
} as const;

/** How long a cluster stays fully visible after a change, then how long it takes to fade. */
export const HUD_HOLD_MS = 1600;
export const HUD_FADE_MS = 900;

/**
 * Opacity for a cluster given how long ago its value last changed.
 * forceVisible covers warnings, hover/focus and the reveal key.
 */
export function computeFadeOpacity(params: {
  msSinceChange: number;
  idleOpacity: number;
  forceVisible?: boolean;
  holdMs?: number;
  fadeMs?: number;
}): number {
  const idle = Math.max(0, Math.min(1, params.idleOpacity));
  if (params.forceVisible) return 1;
  const hold = params.holdMs ?? HUD_HOLD_MS;
  const fade = Math.max(1, params.fadeMs ?? HUD_FADE_MS);
  const t = params.msSinceChange;
  if (t <= hold) return 1;
  if (t >= hold + fade) return idle;
  const k = (t - hold) / fade;
  return 1 - (1 - idle) * k;
}

/** Reference resolution the HUD is designed at. */
export const HUD_REFERENCE = { width: 1280, height: 800 } as const;
export const HUD_SCALE_MIN = 0.82;
export const HUD_SCALE_MAX = 1.3;
/** Base font size (px) at scale 1 — every HUD dimension is expressed in em of this. */
export const HUD_BASE_FONT_PX = 11;

/**
 * HUD scale for a viewport: follows the limiting dimension relative to the reference
 * resolution, clamped so text stays readable on phones and doesn't balloon on 4K.
 */
export function computeHudScale(viewportWidth: number, viewportHeight: number): number {
  const w = Math.max(1, viewportWidth);
  const h = Math.max(1, viewportHeight);
  const raw = Math.min(w / HUD_REFERENCE.width, h / HUD_REFERENCE.height);
  return Math.max(HUD_SCALE_MIN, Math.min(HUD_SCALE_MAX, Number(raw.toFixed(3))));
}

/** Layout mode: phones (either side under 520px) collapse labels and relocate clusters. */
export function computeHudLayout(viewportWidth: number, viewportHeight: number): 'compact' | 'regular' {
  return Math.min(viewportWidth, viewportHeight) < 520 ? 'compact' : 'regular';
}

/** True when a numeric HUD value changed enough to wake its cluster. */
export function hasMeaningfulChange(prev: number, next: number, epsilon = 0.5): boolean {
  return Math.abs(next - prev) >= epsilon;
}
