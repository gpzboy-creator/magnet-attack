import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FlashEngine,
  flashIntensity,
  getAffectedTargets,
  getConePolygon,
  isTargetInCone,
  parseFlashColor,
  wrapAngle,
} from './flashEngine.ts';

const cone = { originX: 0, originY: 0, angle: 0, range: 100, halfFov: (50 * Math.PI) / 360 };

test('cone hit-test: inside, outside by angle, outside by range, edge rescued by radius', () => {
  assert.equal(isTargetInCone(cone, { x: 60, y: 5 }), true);
  assert.equal(isTargetInCone(cone, { x: 60, y: 60 }), false); // 45° off-axis, fov is ±25°
  assert.equal(isTargetInCone(cone, { x: 130, y: 0 }), false); // beyond range
  assert.equal(isTargetInCone(cone, { x: -40, y: 0 }), false); // behind the shooter
  // Just outside the 25° edge, but the body radius overlaps the cone
  const edge = { x: 80 * Math.cos(0.5), y: 80 * Math.sin(0.5) };
  assert.equal(isTargetInCone(cone, edge), false);
  assert.equal(isTargetInCone(cone, { ...edge, radius: 12 }), true);
  // Default radius applies to targets without one
  assert.equal(isTargetInCone(cone, edge, 12), true);
});

test('cone works across the ±PI seam', () => {
  const west = { ...cone, angle: Math.PI };
  assert.equal(isTargetInCone(west, { x: -60, y: 3 }), true);
  assert.equal(isTargetInCone(west, { x: -60, y: -3 }), true);
  assert.ok(Math.abs(wrapAngle(Math.PI * 3) - Math.PI) < 1e-9);
});

test('getAffectedTargets reuses the output array', () => {
  const out: { x: number; y: number }[] = [{ x: 999, y: 999 }];
  const targets = [{ x: 50, y: 0 }, { x: 0, y: 50 }, { x: 90, y: 10 }];
  const hits = getAffectedTargets(cone, targets, out);
  assert.equal(hits, out);
  assert.deepEqual(hits, [targets[0], targets[2]]);
});

test('cone polygon has apex + arc points at range', () => {
  const poly = getConePolygon(cone, 4);
  assert.equal(poly.length, 6);
  assert.deepEqual(poly[0], { x: 0, y: 0 });
  for (const p of poly.slice(1)) assert.ok(Math.abs(Math.hypot(p.x, p.y) - 100) < 1e-9);
});

test('intensity envelope: peak, ease-out decay, zero after duration', () => {
  assert.equal(flashIntensity(0, 50, 200), 1);
  assert.equal(flashIntensity(50, 50, 200), 1);
  const mid = flashIntensity(125, 50, 200);
  assert.ok(mid > 0 && mid < 0.2, `cubic decay should be well below linear, got ${mid}`);
  assert.ok(flashIntensity(100, 50, 200) > flashIntensity(150, 50, 200));
  assert.equal(flashIntensity(200, 50, 200), 0);
  assert.equal(flashIntensity(500, 50, 200), 0);
});

test('color parsing supports #rgb / #rrggbb with a warm-white fallback', () => {
  assert.deepEqual(parseFlashColor('#facc15'), { r: 250, g: 204, b: 21 });
  assert.deepEqual(parseFlashColor('#fff'), { r: 255, g: 255, b: 255 });
  assert.deepEqual(parseFlashColor('nope'), { r: 255, g: 246, b: 224 });
});

test('engine pools instances: no growth under rapid fire, expired shots are released', () => {
  const engine = new FlashEngine({ poolSize: 4 });
  const seen = new Set<object>();
  for (let i = 0; i < 20; i++) {
    seen.add(engine.fire({ origin: { x: 0, y: 0 }, angle: 0, duration: 200 }));
    engine.update(10);
  }
  assert.equal(engine.capacity, 4);
  assert.ok(seen.size <= 4, 'fire() must reuse pooled objects');
  assert.equal(engine.activeCount, 4);
  engine.update(1000);
  assert.equal(engine.activeCount, 0);
});

test('engine hooks: onFire once per shot, onTargetHit for targets in the cone, onExpire on cleanup', () => {
  const fired: number[] = [];
  const hit: string[] = [];
  let expired = 0;
  const engine = new FlashEngine<{ x: number; y: number; name: string }>({
    onFire: (s) => fired.push(s.id),
    onTargetHit: (t) => hit.push(t.name),
    onExpire: () => expired++,
  });
  engine.fire({
    origin: { x: 0, y: 0 },
    target: { x: 100, y: 0 },
    range: 120,
    fov: 50,
    targets: [
      { x: 80, y: 0, name: 'in-front' },
      { x: 0, y: 80, name: 'to-the-side' },
      { x: -50, y: 0, name: 'behind' },
    ],
  });
  assert.equal(fired.length, 1);
  assert.deepEqual(hit, ['in-front']);
  engine.update(250);
  assert.equal(expired, 1);
});

test('anchored shots follow the shooter', () => {
  const engine = new FlashEngine();
  const shot = engine.fire({ origin: { x: 0, y: 0 }, angle: 0, anchorKey: 'player' });
  const other = engine.fire({ origin: { x: 5, y: 5 }, angle: 0 });
  engine.updateAnchor('player', { x: 30, y: -10 }, { x: 4, y: -60 });
  assert.equal(shot.originX, 30);
  assert.equal(shot.originY, -10);
  assert.equal(shot.lensOffsetY, -60);
  assert.equal(other.originX, 5);
});
