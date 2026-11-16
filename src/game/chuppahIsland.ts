/**
 * The courtyard chuppah: a PixelLab hi-bit sprite of a flower-draped chuppah on a round marble stage
 * in the middle of a turquoise pool, with an arched footbridge to the ceremony aisle (along -x).
 *
 * The sprite is drawn 1:1 as a ground layer under the actors; its front post is redrawn as a
 * depth-sorted overlay. Water blocks walking (a ring of collision circles with a gap for the bridge),
 * and on the stage / bridge characters are lifted to the floor height (groundZ).
 * All world offsets are relative to CHUPPAH_POS (the pool's centre on the ground).
 */
import { CHUPPAH_POS } from './rules.ts';

export const CHUPPAH_SPRITE = {
  file: 'assets/aistudio/chuppah-pool.png',
  /** Sprite pixel that sits on CHUPPAH_POS at ground level. */
  anchorX: 223,
  anchorY: 298,
  /** The front-centre post (+ its drapes), redrawn over actors standing behind it. */
  frontPost: { sx: 236, sy: 110, sw: 46, sh: 186, worldDX: 66, worldDY: 30 },
};

/** World radii (the sprite is 1:1, so a screen half-width a ↔ world radius a/√2). */
export const POOL_RADIUS = 156;
export const STAGE_RADIUS = 97;
export const STAGE_TOP_RADIUS = 88;
/** Floor heights in screen px (= world z). */
export const STAGE_TOP_Z = 56;
export const STAGE_STEP_Z = 40;

/** The footbridge runs along -x from the stage edge to the pool rim. */
export const BRIDGE = { innerX: -STAGE_TOP_RADIUS, outerX: -166, halfWidth: 18 };

/** Where the ceremony aisle meets the bridge. */
export const BRIDGE_FOOT = { x: CHUPPAH_POS.x + BRIDGE.outerX, y: CHUPPAH_POS.y };

/** People under the chuppah (offsets from CHUPPAH_POS, all on the stage top). */
export const CHUPPAH_SPOTS = {
  bride: { x: CHUPPAH_POS.x + 12, y: CHUPPAH_POS.y + 12 },
  groom: { x: CHUPPAH_POS.x - 4, y: CHUPPAH_POS.y - 2 },
  rabbi: { x: CHUPPAH_POS.x + 26, y: CHUPPAH_POS.y - 20 },
  parents: [
    { x: CHUPPAH_POS.x - 34, y: CHUPPAH_POS.y - 44 },
    { x: CHUPPAH_POS.x - 34, y: CHUPPAH_POS.y + 44 },
  ],
};

const onBridge = (dx: number, dy: number) =>
  dx <= BRIDGE.innerX + 6 && dx >= BRIDGE.outerX && Math.abs(dy) <= BRIDGE.halfWidth + 4;

/** Height of the walking surface at a world point (0 = courtyard ground). */
export function groundZ(x: number, y: number): number {
  const dx = x - CHUPPAH_POS.x;
  const dy = y - CHUPPAH_POS.y;
  const r = Math.hypot(dx, dy);
  if (r <= STAGE_TOP_RADIUS) return STAGE_TOP_Z;
  if (onBridge(dx, dy)) {
    // ramps up from the rim to the stage
    const u = (dx - BRIDGE.outerX) / (BRIDGE.innerX - BRIDGE.outerX);
    return Math.max(0, Math.min(1, u)) * STAGE_TOP_Z;
  }
  if (r <= STAGE_RADIUS) return STAGE_STEP_Z;
  return 0;
}

/** Water: a ring of circles between the stage and the rim, open where the bridge crosses. */
export const POOL_OBSTACLES: Array<{ kind: 'circle'; x: number; y: number; r: number }> = (() => {
  const out: Array<{ kind: 'circle'; x: number; y: number; r: number }> = [];
  const rc = (STAGE_RADIUS + POOL_RADIUS - 6) / 2;
  const r = (POOL_RADIUS - 6 - STAGE_RADIUS) / 2 + 2;
  const steps = 44;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const cx = Math.cos(a) * rc;
    const cy = Math.sin(a) * rc;
    // leave the bridge corridor open
    if (cx < 0 && Math.abs(cy) - r < BRIDGE.halfWidth) continue;
    out.push({ kind: 'circle', x: CHUPPAH_POS.x + cx, y: CHUPPAH_POS.y + cy, r });
  }
  return out;
})();
