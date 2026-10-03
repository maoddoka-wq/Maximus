import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
// Nested historical paths alone exceed Node's default 1 MiB child output buffer.
const files = execFileSync('git', ['ls-files', '-z'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
})
  .split('\0')
  .filter(Boolean);
const archivePrefix = 'artifacts/maximus-windows-sync-fix/';
const sourceExtensions = new Set(['.ts', '.tsx', '.php', '.mjs', '.js', '.py', '.ps1']);

// Inspect source size, not content: no .env, credentials, authors or personal data.
const sourceFiles = files
  .filter((path) => !path.startsWith(archivePrefix) && sourceExtensions.has(extname(path)))
  .map((path) => ({
    path,
    lines: readFileSync(new URL(path, new URL('../../', import.meta.url)), 'utf8')
      .split('\n').length,
  }))
  .sort((a, b) => b.lines - a.lines);

console.log(JSON.stringify({
  trackedFiles: files.length,
  nestedArchiveFiles: files.filter((path) => path.startsWith(archivePrefix)).length,
  nestedArchiveDepth: Math.max(0, ...files.map((path) =>
    path.split('/').filter((part) => part === 'maximus-windows-sync-fix').length)),
  composerLocks: files.filter((path) => path.endsWith('composer.lock')),
  sourceFiles: sourceFiles.length,
  largestSourceFiles: sourceFiles.slice(0, 25),
  trackedDependenciesOrBuilds: files.filter((path) =>
    path.split('/').some((part) => ['vendor', 'node_modules', 'dist', 'build'].includes(part))),
}, null, 2));