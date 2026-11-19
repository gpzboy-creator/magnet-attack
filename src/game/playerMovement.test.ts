import test from 'node:test';
import assert from 'node:assert/strict';
import { constrainToWalkable, insideHallFloor, settlePosition } from './playerMovement.ts';

// two rooms joined by a doorway: x < 100 everywhere, and x 100..200 only for y in 40..60
const walkable = (x: number, y: number) => x >= 0 && y >= 0 && y <= 100 && (x < 100 || (x <= 200 && y >= 40 && y <= 60));
const door = (x: number) => (x >= 96 && x < 100 ? 50 : null);

test('free walking is untouched', () => {
  assert.deepEqual(constrainToWalkable({ x: 10, y: 10 }, { x: 12, y: 11 }, walkable, door, 5), { x: 12, y: 11 });
});

test('slides along a wall instead of stopping', () => {
  assert.deepEqual(constrainToWalkable({ x: 98, y: 20 }, { x: 102, y: 22 }, walkable, () => null, 5), { x: 98, y: 22 });
});

test('pushing into the wall next to a doorway steps toward the opening, never jumps', () => {
  const p = constrainToWalkable({ x: 99, y: 30 }, { x: 103, y: 30 }, walkable, door, 5);
  assert.deepEqual(p, { x: 99, y: 35 });
});

test('starting off the walkable ground returns null (no teleport to the hall edge)', () => {
  assert.equal(constrainToWalkable({ x: 150, y: 10 }, { x: 152, y: 10 }, walkable, door, 5), null);
});

test('a furniture push that lands off the ground is ignored; the last safe spot is the final fallback', () => {
  const safe = { x: 50, y: 50 };
  assert.deepEqual(settlePosition({ x: 90, y: 90 }, { x: 90, y: 105 }, safe, walkable), { x: 90, y: 90 });
  assert.deepEqual(settlePosition(null, { x: 150, y: 10 }, safe, walkable), safe);
  assert.deepEqual(settlePosition({ x: 20, y: 20 }, { x: 21, y: 20 }, safe, walkable), { x: 21, y: 20 });
});

test('the whole hall floor is walkable, corners included (no invisible circle)', () => {
  for (const [x, y] of [[420, 420], [-420, 420], [420, -420], [-420, -420], [0, 425], [380, 300]]) assert.ok(insideHallFloor(x, y), `${x},${y}`);
  assert.ok(!insideHallFloor(445, 0));
});
