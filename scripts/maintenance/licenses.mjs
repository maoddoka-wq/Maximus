import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const groups = JSON.parse(execFileSync('pnpm', ['licenses', 'list', '--json'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024,
}));
const packages = Object.entries(groups).flatMap(([license, entries]) =>
  entries.map(({ name, versions }) => ({ name, versions: versions ?? [], license })),
);
const reports = new URL('../../reports/', import.meta.url);
mkdirSync(reports, { recursive: true });
writeFileSync(new URL('code-audit-licenses.json', reports), `${JSON.stringify(packages, null, 2)}\n`);
console.log(JSON.stringify({
  packages: packages.length,
  licenses: Object.fromEntries(Object.entries(groups).map(([license, entries]) => [license, entries.length])),
  unknown: packages.filter(({ license }) => license === 'Unknown').map(({ name }) => name),
  report: 'reports/code-audit-licenses.json',
}, null, 2));