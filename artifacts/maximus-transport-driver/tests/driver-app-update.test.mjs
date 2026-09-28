import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isDriverAndroidUpdateAvailable,
  parseDriverAndroidRelease,
} from '../lib/driver-app-update.ts';

test('parses the stable APK release and its semantic version', () => {
  assert.deepEqual(
    parseDriverAndroidRelease({
      name: 'MAXIMUS Chauffeur v1.10.0',
      tag_name: 'android-latest',
      assets: [
        {
          name: 'maximus-chauffeur.apk',
          browser_download_url:
            'https://github.com/maoddoka-wq/Maximus/releases/download/android-latest/maximus-chauffeur.apk',
        },
      ],
    }),
    {
      version: 'MAXIMUS Chauffeur v1.10.0',
      downloadUrl:
        'https://github.com/maoddoka-wq/Maximus/releases/download/android-latest/maximus-chauffeur.apk',
    },
  );
});

test('rejects releases without a versioned APK hosted on GitHub HTTPS', () => {
  assert.equal(
    parseDriverAndroidRelease({
      name: 'MAXIMUS Chauffeur v1.1.0',
      assets: [{ name: 'source.zip', browser_download_url: 'https://github.com/repo/source.zip' }],
    }),
    null,
  );
  assert.equal(
    parseDriverAndroidRelease({
      name: 'MAXIMUS Chauffeur v1.1.0',
      assets: [
        { name: 'maximus-chauffeur.apk', browser_download_url: 'http://github.com/app.apk' },
      ],
    }),
    null,
  );
  assert.equal(
    parseDriverAndroidRelease({
      name: 'Version non reconnue',
      assets: [
        {
          name: 'maximus-chauffeur.apk',
          browser_download_url: 'https://github.com/repo/app.apk',
        },
      ],
    }),
    null,
  );
});

test('offers only versions newer than the installed app', () => {
  assert.equal(isDriverAndroidUpdateAvailable('1.0.0', 'MAXIMUS Chauffeur v1.0.1'), true);
  assert.equal(isDriverAndroidUpdateAvailable('1.9.0', 'MAXIMUS Chauffeur v1.10.0'), true);
  assert.equal(isDriverAndroidUpdateAvailable('1.1.0', 'MAXIMUS Chauffeur v1.0.9'), false);
  assert.equal(isDriverAndroidUpdateAvailable('1.1.0', 'MAXIMUS Chauffeur v1.1.0'), false);
  assert.equal(isDriverAndroidUpdateAvailable('local', 'MAXIMUS Chauffeur v1.1.0'), false);
});