import test from 'node:test';
import assert from 'node:assert/strict';
import { BARTENDER_LOOKS } from './hallPixelArt.ts';

test('bartender crew is 1 man : 3 women', () => {
  const men = BARTENDER_LOOKS.filter((l) => l.gender === 'm').length;
  const women = BARTENDER_LOOKS.filter((l) => l.gender === 'f').length;
  assert.equal(men * 3, women);
});
