import test from 'node:test';
import assert from 'node:assert/strict';
import { WEDDING_PROGRAM, phaseAfter, playablePhases, type ProgramPhaseId } from './weddingProgram.ts';

test('the regular wedding: arrival → ceremony → dancing → end (unbuilt phases skipped)', () => {
  assert.deepEqual(playablePhases(), ['arrival', 'ceremony', 'dancing']);
  assert.equal(phaseAfter('arrival'), 'ceremony');
  assert.equal(phaseAfter('ceremony'), 'dancing');
  assert.equal(phaseAfter('dancing'), null);
});

test('the program holds the full planned evening in order', () => {
  assert.deepEqual(WEDDING_PROGRAM, ['couple_shoot', 'arrival', 'ceremony', 'slow_dance', 'dancing', 'dinner', 'dancing2']);
});

test('the order comes from the list: a program without a chuppah goes from arrival to dancing', () => {
  const noChuppah: ProgramPhaseId[] = ['arrival', 'dinner', 'dancing'];
  assert.equal(phaseAfter('arrival', noChuppah), 'dancing');
  assert.equal(phaseAfter('ceremony', noChuppah), null);
});
