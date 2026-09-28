const fs = require('node:fs');
const path = require('node:path');

const tag = process.argv[2] ?? '';
const match = tag.match(/^chauffeur-v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);

if (!match) {
  throw new Error(`Release tag must use chauffeur-vMAJOR.MINOR.PATCH; received "${tag}".`);
}

const [, majorText, minorText, patchText] = match;
const [major, minor, patch] = [majorText, minorText, patchText].map(Number);
if (major > 2000 || minor > 999 || patch > 999) {
  throw new Error('Release version components exceed Android versionCode limits.');
}

const configPath = path.resolve(__dirname, '..', 'app.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.expo.version = `${major}.${minor}.${patch}`;
config.expo.android.versionCode = major * 1_000_000 + minor * 1_000 + patch;
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(`Prepared MAXIMUS Chauffeur ${config.expo.version} (versionCode ${config.expo.android.versionCode}).`);