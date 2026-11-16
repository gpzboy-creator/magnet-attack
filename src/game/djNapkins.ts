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
  napkinsPerThrow: 40,
  /** Where the pack leaves his raised hand (world units, z = height). */
  hand: { x: -98, y: -275, z: 140 },
  /** Quick toss up and out of the pack… */
  tossSec: 0.6,
  /** …share of the horizontal distance covered during the toss (the rest drifts while floating). */
  tossShare: 0.35,
  apexRiseMin: 28,
  apexRiseMax: 55,
  /** …then a slow paper float down (total time in the air). */
  flightMinSec: 4.5,
  flightMaxSec: 6.2,
  /** Side-to-side sway while floating (world units) and its speed (rad/s). */
  swayAmp: 12,
  swayFreqMin: 2.4,
  swayFreqMax: 4.0,
  /** How long they lie on the floor before fading out. */
  lieSec: 7,
  fadeSec: 1.2,
  /** Spread around the target dance cluster. */
  spread: 62,
};

export interface Napkin {
  /** Current position (z = height above the floor). */
  x: number;
  y: number;
  z: number;
  /** Rotation in the screen plane and how open/edge-on the paper is (0..1) — for drawing. */
  angle: number;
  flutter: number;
  /** Seconds since landing (-1 while in the air). */
  landedFor: number;
  tint: string;
  // trajectory
  x0: number;
  y0: number;
  z0: number;
  tx: number;
  ty: number;
  apexZ: number;
  t: number;
  T: number;
  phase: number;
  swayFreq: number;
  baseAngle: number;
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
  const N = DJ_NAPKINS;
  const out: Napkin[] = [];
  for (let i = 0; i < N.napkinsPerThrow; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * N.spread;
    const n: Napkin = {
      x: N.hand.x,
      y: N.hand.y,
      z: N.hand.z,
      angle: 0,
      flutter: 1,
      landedFor: -1,
      tint: TINTS[Math.floor(rand() * TINTS.length)],
      x0: N.hand.x,
      y0: N.hand.y,
      z0: N.hand.z,
      tx: target.x + Math.cos(a) * r,
      ty: target.y + Math.sin(a) * r,
      apexZ: N.hand.z + N.apexRiseMin + rand() * (N.apexRiseMax - N.apexRiseMin),
      t: 0,
      T: N.flightMinSec + rand() * (N.flightMaxSec - N.flightMinSec),
      phase: rand() * Math.PI * 2,
      swayFreq: N.swayFreqMin + rand() * (N.swayFreqMax - N.swayFreqMin),
      baseAngle: rand() * Math.PI,
    };
    placeNapkin(n);
    out.push(n);
  }
  return out;
}

const easeOut = (u: number) => 1 - (1 - u) * (1 - u);

/** Position along the toss-then-float path at time n.t. */
function placeNapkin(n: Napkin) {
  const N = DJ_NAPKINS;
  const t = Math.min(n.t, n.T);
  let prog: number;
  let z: number;
  let sway = 0;
  if (t < N.tossSec) {
    const u = easeOut(t / N.tossSec);
    prog = u * N.tossShare;
    z = n.z0 + (n.apexZ - n.z0) * u;
  } else {
    const u = (t - N.tossSec) / (n.T - N.tossSec);
    prog = N.tossShare + (1 - N.tossShare) * u;
    // starts hanging at the apex, then a steady slow fall, with a little up-down flutter
    const fall = u < 0.15 ? (u / 0.15) * (u / 0.15) * 0.15 : u;
    z = n.apexZ * (1 - fall) + Math.sin(t * n.swayFreq * 2 + n.phase) * 3 * (1 - u);
    sway = Math.sin(t * n.swayFreq + n.phase) * N.swayAmp * Math.sqrt(1 - u);
  }
  // sway along the screen-horizontal world axis (1, -1) so it reads as side-to-side
  n.x = n.x0 + (n.tx - n.x0) * prog + sway * 0.707;
  n.y = n.y0 + (n.ty - n.y0) * prog - sway * 0.707;
  n.z = Math.max(0, z);
  n.angle = n.baseAngle + Math.sin(t * n.swayFreq + n.phase) * 0.9;
  n.flutter = 0.3 + 0.7 * Math.abs(Math.cos(t * n.swayFreq * 1.3 + n.phase));
}

/** Advance napkins; returns the ones still alive. */
export function stepNapkins(list: Napkin[], dt: number): Napkin[] {
  const { lieSec, fadeSec } = DJ_NAPKINS;
  const alive: Napkin[] = [];
  for (const n of list) {
    if (n.landedFor < 0) {
      n.t += dt;
      placeNapkin(n);
      if (n.t >= n.T) {
        n.z = 0;
        n.flutter = 1;
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
