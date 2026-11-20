/**
 * Import boundaries (runs with the other tests and before every deploy). Dependencies point one way:
 *
 *   components/  →  render/  →  game/
 *
 *  - game/   is pure logic + area drawing: it never imports from components/ or render/.
 *  - render/ draws from state it is given: it never imports from components/.
 *
 * Type-only imports count too: a type that both sides need lives in game/ (e.g. guestActor.ts).
 * Source files only (tests are skipped). Checks every `import … from`, `export … from`, `import '…'` and `import('…')` with a relative path.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, sep } from 'node:path';

/** Folder (under src/) → folders it must not import from. */
const FORBIDDEN: Record<string, string[]> = {
  game: ['components', 'render'],
  render: ['components'],
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') ? [p] : [];
  });
}

/** All module specifiers in a source file (static, re-export, side-effect and dynamic imports). */
export function importSpecifiers(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const specs: string[] = [];
  const patterns = [
    /\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) for (const m of code.matchAll(re)) specs.push(m[1]);
  return specs;
}

/** The top folder under src/ that a relative specifier from `file` lands in, or null. */
function targetArea(file: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const rel = relative('src', normalize(join(dirname(file), spec)));
  if (rel.startsWith('..')) return null;
  return rel.split(sep)[0];
}

test('importSpecifiers finds every kind of import', () => {
  const src = [
    "import a from './a';",
    "import type { B } from '../components/B';",
    'import {',
    '  C,',
    "} from '../render/c';",
    "export { D } from './d';",
    "import './side-effect';",
    "const e = await import('./lazy');",
    "// import x from '../components/commented-out';",
  ].join('\n');
  assert.deepEqual(importSpecifiers(src).sort(), [
    '../components/B',
    '../render/c',
    './a',
    './d',
    './lazy',
    './side-effect',
  ]);
});

for (const [area, forbidden] of Object.entries(FORBIDDEN)) {
  test(`src/${area} never imports from ${forbidden.map((f) => `src/${f}`).join(' or ')}`, () => {
    const violations: string[] = [];
    for (const file of sourceFiles(join('src', area))) {
      for (const spec of importSpecifiers(readFileSync(file, 'utf8'))) {
        const to = targetArea(file, spec);
        if (to && forbidden.includes(to)) violations.push(`${file} → '${spec}'`);
      }
    }
    assert.deepEqual(
      violations,
      [],
      `Dependencies point components → render → game. Move the shared code/type into src/game ` +
        `(or pass it in as a parameter):\n  ${violations.join('\n  ')}`
    );
  });
}
