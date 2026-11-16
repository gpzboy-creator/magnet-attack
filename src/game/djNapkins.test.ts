import test from 'node:test';
import assert from 'node:assert/strict';
import { CUE_TOTAL_SEC, createDjState, updateDj, spawnNapkins, stepNapkins, napkinAlpha, djFrame, DJ_ANIM, DJ_NAPKINS } from './djNapkins.ts';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

test('napkins land near the target, inside the spread', () => {
  const target = { x: 0, y: 0 };
  let list = spawnNapkins(target, seeded(3));
  assert.equal(list.length, DJ_NAPKINS.napkinsPerThrow);
  for (let t = 0; t < DJ_NAPKINS.flightMaxSec + 0.2; t += 1 / 60) list = stepNapkins(list, 1 / 60);
  for (const n of list) {
    assert.ok(n.landedFor >= 0, 'landed');
    assert.ok(Math.hypot(n.x - target.x, n.y - target.y) < DJ_NAPKINS.spread + 8, 'near target');
  }
});

test('napkins float down slowly: still in the air after 2s, a quick toss up first', () => {
  let list = spawnNapkins({ x: 0, y: 0 }, seeded(8));
  const z0 = list[0].z;
  for (let t = 0; t < 0.4; t += 1 / 60) list = stepNapkins(list, 1 / 60);
  assert.ok(list.every((n) => n.z > z0), 'tossed up');
  for (let t = 0; t < 1.8; t += 1 / 60) list = stepNapkins(list, 1 / 60);
  assert.ok(list.every((n) => n.landedFor < 0 && n.z > 0), 'still floating at ~2.2s');
});

test('napkins fade and disappear after lying on the floor', () => {
  let list = spawnNapkins({ x: 0, y: 0 }, seeded(5));
  const total = DJ_NAPKINS.flightMaxSec + DJ_NAPKINS.lieSec + DJ_NAPKINS.fadeSec + 0.5;
  let sawFade = false;
  for (let t = 0; t < total; t += 0.1) {
    list = stepNapkins(list, 0.1);
    if (list.some((n) => napkinAlpha(n) < 1 && napkinAlpha(n) > 0)) sawFade = true;
  }
  assert.ok(sawFade);
  assert.equal(list.length, 0);
});

test('no throws while throws are disabled (arrival phase)', () => {
  const s = createDjState(seeded(2));
  for (let t = 0; t < 120; t += 0.1) updateDj(s, 0.1, false, () => ({ x: 0, y: 0 }), seeded(2));
  assert.equal(s.throwsDone, 0);
  assert.equal(s.mode, 'mixer');
});

test('dance phase: throws happen, one release per throw, back to the mixer', () => {
  const s = createDjState(seeded(4));
  let releases = 0;
  for (let t = 0; t < 90; t += 1 / 30) {
    if (updateDj(s, 1 / 30, true, () => ({ x: 0, y: 0 }), seeded(4))) releases++;
  }
  assert.ok(releases >= 2, `got ${releases}`);
  assert.equal(releases, s.throwsDone);
  assert.ok(releases <= Math.ceil(90 / DJ_NAPKINS.minGapSec) + 1);
});

test('frames stay inside the sheets', () => {
  const s = createDjState();
  for (let t = 0; t < 5; t += 0.05) {
    s.animTime = t;
    s.mode = 'mixer';
    assert.ok(djFrame(s) < DJ_ANIM.mixerFrames);
    s.mode = 'throw';
    assert.ok(djFrame(s) < DJ_ANIM.throwFrames);
    s.mode = 'cue';
    const f = djFrame(s);
    assert.ok(f >= 0 && f < DJ_ANIM.cueFrames);
  }
});

test('headphone cue: happens in every phase, holds the headphone, returns to frame 0 and the mixer', () => {
  const s = createDjState(seeded(6));
  let cues = 0;
  let sawHold = false;
  let prev = s.mode;
  for (let t = 0; t < 60; t += 1 / 30) {
    updateDj(s, 1 / 30, false, () => ({ x: 0, y: 0 }), seeded(6));
    if (s.mode === 'cue' && prev !== 'cue') cues++;
    if (s.mode === 'cue' && djFrame(s) >= DJ_ANIM.cueHoldFrom) sawHold = true;
    prev = s.mode;
  }
  assert.ok(cues >= 2, `cues ${cues}`);
  assert.ok(sawHold);
  s.mode = 'cue';
  s.animTime = CUE_TOTAL_SEC - 0.01;
  assert.equal(djFrame(s), 0);
});
