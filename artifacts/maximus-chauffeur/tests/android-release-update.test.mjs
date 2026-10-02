import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getApkDownloadError } from '../src/lib/android-apk.ts';

const APK_MIME_TYPE = 'application/vnd.android.package-archive';

test('accepts only a complete APK response with the expected metadata', () => {
  assert.equal(
    getApkDownloadError({
      status: 200,
      mimeType: APK_MIME_TYPE,
      fileExists: true,
      fileSize: 111,
      expectedSize: 111,
    }),
    null,
  );
});

test('explains a rejected release download', () => {
  assert.match(
    getApkDownloadError({
      status: 401,
      fileExists: false,
      fileSize: 0,
    }) ?? '',
    /HTTP 401/,
  );
});

test('does not pass an API error page to Android package installer', () => {
  assert.match(
    getApkDownloadError({
      status: 200,
      mimeType: 'application/json',
      fileExists: true,
      fileSize: 111,
      expectedSize: 111,
    }) ?? '',
    /fichier APK valide/,
  );
});

test('rejects truncated APK downloads', () => {
  assert.match(
    getApkDownloadError({
      status: 200,
      mimeType: APK_MIME_TYPE,
      fileExists: true,
      fileSize: 100,
      expectedSize: 111,
    }) ?? '',
    /téléchargement est incomplet/,
  );
});

test('reads the content type without depending on response-header casing', () => {
  assert.equal(
    getApkDownloadError({
      status: 200,
      headers: { 'Content-Type': `${APK_MIME_TYPE}; charset=binary` },
      fileExists: true,
      fileSize: 111,
    }),
    null,
  );
});

test('declares APK installation permission without enabling broad storage access', async () => {
  const config = JSON.parse(await readFile(new URL('../app.json', import.meta.url), 'utf8'));
  const permissions = config.expo.android.permissions;
  const blockedPermissions = config.expo.android.blockedPermissions;

  assert.ok(permissions.includes('REQUEST_INSTALL_PACKAGES'));
  assert.ok(blockedPermissions.includes('android.permission.READ_EXTERNAL_STORAGE'));
  assert.ok(blockedPermissions.includes('android.permission.WRITE_EXTERNAL_STORAGE'));
});