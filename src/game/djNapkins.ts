/**
 * DJ booth behaviour: mixer loop, and every so often an overhead throw of a pack of
 * party napkins that flutter down onto the dance floor and lie there for a while.
 * Pure logic (no canvas) so it can be unit-tested.
 */

export const DJ_ANIM = {
  /** PixelLab "hands on the mixer" loop (south), 9 frames. */
  mixerFrames: 9,
  mixerFps: 8,
  /** PixelLab "overhead throw" (south), 9 frames; the pack leaves his hand on releaseFrame. */
  throwFrames: 9,
  throwFps: 10,
  releaseFrame: 4,
  /** PixelLab "headphone cue": raises a hand and holds the headphone cup to his ear (9 frames). */
  cueFrames: 9,
  cueFps: 8,
  /** Frames 6..8 = hand on the headphone; held (ping-pong) for cueHoldSec. */
  cueHoldFrom: 6,
  cueHoldSec: 2.2,
  cueMinGapSec: 9,
  cueMaxGapSec: 16,
};

/** Total duration of one cue gesture: raise, hold, lower. */
export const CUE_TOTAL_SEC = (2 * DJ_ANIM.cueFrames) / DJ_ANIM.cueFps + DJ_ANIM.cueHoldSec;

export const DJ_NAPKINS = {
  /** Seconds between throws while the party is dancing. */
  minGapSec: 16,
  maxGapSec: 28,
  napkinsPerThrow: 16,
  /** Where the pack leaves his raised hand (world units, z = height). */
  hand: { x: -98, y: -262, z: 118 },
  /** Paper falls slowly. */
  gravity: 140,
  flightMinSec: 1.1,
  flightMaxSec: 1.6,
  /** How long they lie on the floor before fading out. */
  lieSec: 7,
  fadeSec: 1.2,
  /** Spread around the target dance cluster. */
  spread: 46,
};

export interface Napkin {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  angle: number;
  /** Seconds since landing (-1 while in the air). */
  landedFor: number;
  tint: string;
}

export interface DjState {
  mode: 'mixer' | 'throw' | 'cue';
  /** Time inside the current animation. */
  animTime: number;
  /** Seconds until the next throw (only counts down when throws are enabled). */
  nextThrowIn: number;
  /** Seconds until the next headphone cue gesture. */
  nextCueIn: number;
  released: boolean;
  napkins: Napkin[];
  throwsDone: number;
}

const TINTS = ['#ffffff', '#fdfcf7', '#f5f0e6', '#fff7ed'];

export function createDjState(rand: () => number = Math.random): DjState {
  return {
    mode: 'mixer',
    animTime: 0,
    nextThrowIn: gap(rand) * 0.6,
    nextCueIn: cueGap(rand) * 0.5,
    released: false,
    napkins: [],
    throwsDone: 0,
  };
}

function cueGap(rand: () => number) {
  return DJ_ANIM.cueMinGapSec + rand() * (DJ_ANIM.cueMaxGapSec - DJ_ANIM.cueMinGapSec);
}

function gap(rand: () => number) {
  return DJ_NAPKINS.minGapSec + rand() * (DJ_NAPKINS.maxGapSec - DJ_NAPKINS.minGapSec);
}

/** Current frame index of the active DJ animation. */
export function djFrame(s: DjState): number {
  if (s.mode === 'throw') return Math.min(DJ_ANIM.throwFrames - 1, Math.floor(s.animTime * DJ_ANIM.throwFps));
  if (s.mode === 'cue') {
    const { cueFrames, cueFps, cueHoldFrom, cueHoldSec } = DJ_ANIM;
    const up = cueFrames / cueFps;
    const t = s.animTime;
    if (t < up) return Math.min(cueFrames - 1, Math.floor(t * cueFps));
    if (t < up + cueHoldSec) {
      // ping-pong over the "hand on the headphone" frames, nodding to the beat
      const span = cueFrames - 1 - cueHoldFrom;
      const k = Math.floor((t - up) * 6) % (2 * span);
      return cueFrames - 1 - (k <= span ? k : 2 * span - k);
    }
    return Math.max(0, cueFrames - 1 - Math.floor((t - up - cueHoldSec) * cueFps));
  }
  return Math.floor(s.animTime * DJ_ANIM.mixerFps) % DJ_ANIM.mixerFrames;
}

/** Launch one pack of napkins toward a point on the floor. */
export function spawnNapkins(target: { x: number; y: number }, rand: () => number = Math.random): Napkin[] {
  const { hand, gravity, flightMinSec, flightMaxSec, spread, napkinsPerThrow } = DJ_NAPKINS;
  const out: Napkin[] = [];
  for (let i = 0; i < napkinsPerThrow; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * spread;
    const tx = target.x + Math.cos(a) * r;
    const ty = target.y + Math.sin(a) * r;
    const T = flightMinSec + rand() * (flightMaxSec - flightMinSec);
    out.push({
      x: hand.x,
      y: hand.y,
      z: hand.z,
      vx: (tx - hand.x) / T,
      vy: (ty - hand.y) / T,
      // reach z = 0 exactly at time T under gravity
      vz: (0 - hand.z + 0.5 * gravity * T * T) / T,
      spin: (rand() - 0.5) * 14,
      angle: rand() * Math.PI,
      landedFor: -1,
      tint: TINTS[Math.floor(rand() * TINTS.length)],
    });
  }
  return out;
}

/** Advance napkins; returns the ones still alive. */
export function stepNapkins(list: Napkin[], dt: number): Napkin[] {
  const { gravity, lieSec, fadeSec } = DJ_NAPKINS;
  const alive: Napkin[] = [];
  for (const n of list) {
    if (n.landedFor < 0) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.vz -= gravity * dt;
      n.z += n.vz * dt;
      n.angle += n.spin * dt;
      if (n.z <= 0) {
        n.z = 0;
        n.landedFor = 0;
      }
    } else {
      n.landedFor += dt;
    }
    if (n.landedFor < lieSec + fadeSec) alive.push(n);
  }
  return alive;
}

/** 0..1 opacity of a napkin (fades out at the end of its life on the floor). */
export function napkinAlpha(n: Napkin): number {
  if (n.landedFor < DJ_NAPKINS.lieSec) return 1;
  return Math.max(0, 1 - (n.landedFor - DJ_NAPKINS.lieSec) / DJ_NAPKINS.fadeSec);
}

/**
 * Advance the DJ. `throwsEnabled` = the dance phase is on. `pickTarget` chooses where the pack lands.
 * Returns true on the frame the pack is released.
 */
export function updateDj(
  s: DjState,
  dt: number,
  throwsEnabled: boolean,
  pickTarget: () => { x: number; y: number },
  rand: () => number = Math.random
): boolean {
  let released = false;
  s.animTime += dt;
  if (s.mode === 'mixer') {
    s.nextCueIn -= dt;
    if (throwsEnabled) s.nextThrowIn -= dt;
    if (throwsEnabled && s.nextThrowIn <= 0) {
      s.mode = 'throw';
      s.animTime = 0;
      s.released = false;
    } else if (s.nextCueIn <= 0 && (!throwsEnabled || s.nextThrowIn > CUE_TOTAL_SEC + 1)) {
      s.mode = 'cue';
      s.animTime = 0;
    }
  } else if (s.mode === 'cue') {
    if (s.animTime >= CUE_TOTAL_SEC) {
      s.mode = 'mixer';
      s.animTime = 0;
      s.nextCueIn = cueGap(rand);
    }
  } else {
    if (!s.released && djFrame(s) >= DJ_ANIM.releaseFrame) {
      s.released = true;
      s.napkins.push(...spawnNapkins(pickTarget(), rand));
      s.throwsDone++;
      released = true;
    }
    if (s.animTime >= DJ_ANIM.throwFrames / DJ_ANIM.throwFps) {
      s.mode = 'mixer';
      s.animTime = 0;
      s.nextThrowIn = gap(rand);
    }
  }
  s.napkins = stepNapkins(s.napkins, dt);
  return released;
}
