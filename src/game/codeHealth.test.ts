/**
 * Code-health ratchet (runs with the other tests and before every deploy).
 *  - The big files in docs/size-budget.json may never grow: extract an area out of them (see
 *    docs/REFACTOR_MAP.md) and LOWER the budget in the same commit.
 *  - No other source file may grow past maxLinesAnyOtherFile — split it before it gets there.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const budget = JSON.parse(readFileSync('docs/size-budget.json', 'utf8')) as {
  files: Record<string, number>;
  maxLinesAnyOtherFile: number;
};
const lines = (p: string) => readFileSync(p, 'utf8').split('\n').length - 1;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') ? [p] : [];
  });
}

test('budgeted files never grow (extract code, then lower the budget)', () => {
  for (const [file, max] of Object.entries(budget.files)) {
    const n = lines(file);
    assert.ok(
      n <= max,
      `${file} has ${n} lines, budget ${max}. Don't add code here: extract the area you are changing (docs/REFACTOR_MAP.md).`
    );
  }
});

test('no other source file grows past the size limit', () => {
  for (const file of sourceFiles('src')) {
    if (file in budget.files) continue;
    const n = lines(file);
    assert.ok(n <= budget.maxLinesAnyOtherFile, `${file} has ${n} lines (> ${budget.maxLinesAnyOtherFile}): split it.`);
  }
});
