import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DRIVER_ANDROID_APK_ASSET,
  parseDriverAndroidRelease,
} from './driver-app-release';

test('uses the published Android APK asset and release title', () => {
  const release = parseDriverAndroidRelease({
    name: 'MAXIMUS Chauffeur v1.0.0',
    tag_name: 'android-latest',
    assets: [
      {
        name: DRIVER_ANDROID_APK_ASSET,
        browser_download_url:
          'https://github.com/maoddoka-wq/Maximus/releases/download/android-latest/maximus-chauffeur.apk',
      },
      {
        name: 'source.zip',
        browser_download_url: 'https://github.com/maoddoka-wq/Maximus/archive/main.zip',
      },
    ],
  });

  assert.deepEqual(release, {
    version: 'MAXIMUS Chauffeur v1.0.0',
    downloadUrl:
      'https://github.com/maoddoka-wq/Maximus/releases/download/android-latest/maximus-chauffeur.apk',
  });
});

test('returns no release when the expected APK is missing', () => {
  assert.equal(
    parseDriverAndroidRelease({
      tag_name: 'android-latest',
      assets: [{ name: 'other-file.apk', browser_download_url: 'https://github.com/example/app.apk' }],
    }),
    null,
  );
});

test('rejects release assets hosted outside GitHub over HTTPS', () => {
  assert.equal(
    parseDriverAndroidRelease({
      tag_name: 'android-latest',
      assets: [
        {
          name: DRIVER_ANDROID_APK_ASSET,
          browser_download_url: 'http://example.com/maximus-chauffeur.apk',
        },
      ],
    }),
    null,
  );
});