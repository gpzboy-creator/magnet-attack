/**
 * Code-health ratchet (runs with the other tests and before every deploy).
 *  - The big files in docs/size-budget.json may never grow: extract an area out of them (see
 *    docs/REFACTOR_MAP.md) and LOWER the budget in the same commit.
 *  - No other source file may grow past maxLinesAnyOtherFile — split it before it gets there.
 *  - The `let` state variables in the main file's effect closure (stateLets) may never grow
 *    either: new state goes into GameState (src/game/gameState.ts), never into a new `let`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const budget = JSON.parse(readFileSync('docs/size-budget.json', 'utf8')) as {
  files: Record<string, number>;
  maxLinesAnyOtherFile: number;
  stateLets: Record<string, number>;
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

/**
 * Counts the closure-state variables of a component file: every `let` that starts a line at the
 * effect-body indent (4 spaces) — today the 70-odd variables of IsoArenaCanvas's game-loop effect.
 * Locals inside `tick` and helpers sit deeper and `for (let …)` loops don't start a line, so neither
 * counts. Declarators are counted, so `let a = 0, b = 0;` is two.
 */
export function countStateLets(source: string): number {
  let count = 0;
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/^ {4}let\s/.test(lines[i])) continue;
    // Walk the statement up to its `;` at bracket depth 0, counting top-level commas.
    let depth = 0;
    let quote = '';
    let names = 1;
    let done = false;
    for (let j = i; j < lines.length && !done; j++) {
      const line = j === i ? lines[j].replace(/^ {4}let\s/, '') : lines[j];
      for (let k = 0; k < line.length; k++) {
        const c = line[k];
        if (quote) {
          if (c === '\\') k++;
          else if (c === quote) quote = '';
        } else if (c === '/' && line[k + 1] === '/') break;
        else if (c === "'" || c === '"' || c === '`') quote = c;
        else if ('([{'.includes(c)) depth++;
        else if (')]}'.includes(c)) depth--;
        // Generic brackets (`Map<string, number>`) hug their name; comparisons (`a < b`) don't.
        else if (c === '<' && /\w/.test(line[k - 1] ?? '') && /[\w{[(]/.test(line[k + 1] ?? '')) depth++;
        else if (c === '>' && line[k - 1] !== '=' && line[k - 1] !== ' ' && depth > 0) depth--;
        else if (c === ',' && depth === 0) names++;
        else if (c === ';' && depth === 0) {
          done = true;
          break;
        }
      }
    }
    count += names;
  }
  return count;
}

test('countStateLets counts declarators at the effect-body indent only', () => {
  const sample = [
    '  useEffect(() => {',
    '    let a = n < 3 ? 1 : 2;',
    '    let b = 0, c = { x: 1, y: [2, 3] }; // a, b',
    '    let d: Map<string, number> = new Map();',
    '    let e = {',
    '      f: 1,',
    '    };',
    '    const g = 1;',
    '    for (let i = 0; i < 3; i++) {}',
    '    const tick = () => {',
    '      let local = 0;',
    '    };',
    '  }, []);',
  ].join('\n');
  assert.equal(countStateLets(sample), 5);
});

test('closure-state `let` variables never grow (move state into GameState)', () => {
  for (const [file, max] of Object.entries(budget.stateLets)) {
    const n = countStateLets(readFileSync(file, 'utf8'));
    assert.ok(n > 0, `${file}: found no closure-state lets — did the indent change? Update countStateLets.`);
    assert.ok(
      n <= max,
      `${file} has ${n} closure-state \`let\` variables, budget ${max}. Don't add a \`let\` here: put new ` +
        `state into GameState (src/game/gameState.ts). After moving variables out, lower stateLets in docs/size-budget.json.`
    );
  }
});
