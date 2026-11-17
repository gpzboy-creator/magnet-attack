/**
 * Guard: no API key may ever be committed. Scans every text file in the repo (not node_modules /
 * dist / .git) for key-shaped strings. Keys live only in ~/.secrets (see CLAUDE.md).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);
const TEXT = /\.(ts|tsx|js|cjs|mjs|json|md|html|css|py|yml|yaml|txt|env|sh)$|^\.env/;
// Built from pieces so this file does not match itself.
const PATTERNS: Array<[string, RegExp]> = [
  ['PixelLab key', new RegExp('pix' + 'l_[A-Za-z0-9]{16,}')],
  ['Anthropic key', new RegExp('sk-' + 'ant-[A-Za-z0-9_-]{20,}')],
  ['Google API key', new RegExp('AI' + 'za[0-9A-Za-z_-]{30,}')],
  ['GitHub token', new RegExp('gh' + '[pousr]_[A-Za-z0-9]{30,}')],
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP_DIRS.has(name)) return [];
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return TEXT.test(name) ? [p] : [];
  });
}

test('no API keys or tokens anywhere in the repo', () => {
  const hits: string[] = [];
  for (const f of files('.')) {
    const text = readFileSync(f, 'utf8');
    for (const [what, re] of PATTERNS) if (re.test(text)) hits.push(`${f}: looks like a ${what}`);
  }
  assert.deepEqual(hits, [], 'Remove the key, rotate it, and keep keys only in ~/.secrets');
});
