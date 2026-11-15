// Fails if the built bundle in dist/ could expose the Finnhub key: the key value itself (from the
// environment or .env), a direct finnhub.io URL, a token query parameter or the Finnhub token header.
// Run after `npm run build`:  npm run check:bundle
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const KEY_NAMES = ['FINNHUB_API_KEY', 'VITE_FINNHUB_API_KEY'];

function envFileValues() {
  const values = {};
  for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (match && KEY_NAMES.includes(match[1])) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return values;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

if (!existsSync(DIST)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const fromFiles = envFileValues();
const secrets = [...new Set(KEY_NAMES.flatMap(name => [process.env[name], fromFiles[name]]))]
  .filter(value => typeof value === 'string' && value.length >= 8 && !/your_.*_here/.test(value));

const patterns = [
  { label: 'finnhub.io URL', test: text => /finnhub\.io/i.test(text) },
  { label: 'token query parameter', test: text => /[?&]token=/.test(text) },
  { label: 'X-Finnhub-Token header', test: text => /x-finnhub-token/i.test(text) },
  ...secrets.map((value, index) => ({ label: `Finnhub key value #${index + 1}`, test: text => text.includes(value) })),
];

let files = 0;
const problems = [];
for (const file of walk(DIST)) {
  files += 1;
  const text = readFileSync(file, 'latin1');
  for (const pattern of patterns) if (pattern.test(text)) problems.push(`${file}: ${pattern.label}`);
}

if (problems.length > 0) {
  console.error(`Bundle check failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`Bundle check passed: ${files} files in dist/, ${secrets.length} key value(s) checked; no key, finnhub.io URL, token parameter or token header found.`);
