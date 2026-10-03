import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Local verification must never run RefreshDatabase against the workspace DB.
// Environment overrides apply only to this child process, not to the running API.
const result = spawnSync('php', ['artisan', 'test', '--compact', ...process.argv.slice(2)], {
  cwd: fileURLToPath(new URL('../../artifacts/api-server/laravel/', import.meta.url)),
  stdio: 'inherit',
  env: {
    ...process.env,
    APP_ENV: 'testing',
    DB_CONNECTION: 'sqlite',
    DB_DATABASE: ':memory:',
    DB_URL: '',
    DATABASE_URL: '',
  },
});

if (result.error) {
  console.error(`Unable to start the Laravel test suite: ${result.error.message}`);
}
process.exit(result.status ?? 1);