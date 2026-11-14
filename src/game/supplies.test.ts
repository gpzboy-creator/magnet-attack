import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPPLY,
  consumePrint,
  createSupplies,
  deliverLoad,
  isEmptyLoad,
  loadFromCar,
  planPrint,
} from './supplies.ts';

test('print plan: full job, partial job limited by sheets, blocked when empty or jammed', () => {
  const s = createSupplies();
  const full = planPrint(s, 8);
  assert.equal(full.sheets, 2);
  assert.equal(full.photos, 8);
  assert.equal(full.blockedBy, null);

  const few = planPrint({ ...s, sheets: 1 }, 12);
  assert.equal(few.sheets, 1);
  assert.equal(few.photos, SUPPLY.photosPerSheet);
  assert.equal(few.limitedBy, 'sheets');

  assert.equal(planPrint({ ...s, sheets: 0 }, 4).blockedBy, 'sheets');
  assert.equal(planPrint({ ...s, toner: SUPPLY.tonerPerSheet - 1 }, 4).blockedBy, 'toner');
  assert.equal(planPrint({ ...s, jammed: true }, 4).blockedBy, 'jam');
});

test('printing uses sheets and toner; jam by roll', () => {
  const s = createSupplies();
  const after = consumePrint(s, 2, 0.99);
  assert.equal(after.sheets, s.sheets - 2);
  assert.equal(after.toner, s.toner - 2 * SUPPLY.tonerPerSheet);
  assert.equal(after.jammed, false);
  assert.equal(consumePrint(s, 1, 0).jammed, true);
});

test('car load brings what the station needs and delivery restores it', () => {
  const low = { sheets: 2, toner: 10, jammed: true };
  const load = loadFromCar(low);
  assert.equal(load.toner, true);
  assert.equal(load.repairKit, true);
  assert.ok(load.sheets > 0);
  const fixed = deliverLoad(low, load);
  assert.equal(fixed.jammed, false);
  assert.equal(fixed.toner, 100);
  assert.ok(fixed.sheets <= SUPPLY.maxSheets);
  assert.equal(isEmptyLoad(loadFromCar({ sheets: SUPPLY.maxSheets, toner: 100, jammed: false })), true);
});
