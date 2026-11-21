import test from 'node:test';
import assert from 'node:assert/strict';
import { WEDDING_PROGRAM, phaseAfter, playablePhases, type ProgramPhaseId } from './weddingProgram.ts';

test('the regular wedding: arrival → ceremony → slow → dancing → dinner → dancing 2 → end (couple shoot not built yet)', () => {
  assert.deepEqual(playablePhases(), ['arrival', 'ceremony', 'slow_dance', 'dancing', 'dinner', 'dancing2']);
  assert.equal(phaseAfter('arrival'), 'ceremony');
  assert.equal(phaseAfter('ceremony'), 'slow_dance');
  assert.equal(phaseAfter('slow_dance'), 'dancing');
  assert.equal(phaseAfter('dancing'), 'dinner');
  assert.equal(phaseAfter('dinner'), 'dancing2');
  assert.equal(phaseAfter('dancing2'), null);
});

test('the program holds the full planned evening in order', () => {
  assert.deepEqual(WEDDING_PROGRAM, ['couple_shoot', 'arrival', 'ceremony', 'slow_dance', 'dancing', 'dinner', 'dancing2']);
});

test('the order comes from the list: a program without a chuppah goes from arrival to dancing', () => {
  const noChuppah: ProgramPhaseId[] = ['couple_shoot', 'arrival', 'dancing'];
  assert.equal(phaseAfter('arrival', noChuppah), 'dancing');
  assert.equal(phaseAfter('ceremony', noChuppah), null);
});
