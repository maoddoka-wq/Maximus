import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMERA_START_TIMEOUT_ERROR,
  getCameraStartupErrorMessage,
  withCameraStartupTimeout,
} from './qr-camera';

describe('qr-camera', () => {
  it('explains how to recover after camera permission is denied', () => {
    assert.match(
      getCameraStartupErrorMessage({ name: 'NotAllowedError' }),
      /autorisez la caméra/i,
    );
  });

  it('reports when the device has no camera', () => {
    assert.match(
      getCameraStartupErrorMessage({ name: 'NotFoundError' }),
      /aucune caméra/i,
    );
  });

  it('reports when another app is using the camera', () => {
    assert.match(
      getCameraStartupErrorMessage({ name: 'NotReadableError' }),
      /autre application/i,
    );
  });

  it('turns an unresolved startup into an actionable timeout message', () => {
    assert.match(
      getCameraStartupErrorMessage(new Error(CAMERA_START_TIMEOUT_ERROR)),
      /n’a pas démarré la caméra/i,
    );
  });

  it('stops waiting when the browser never resolves the camera request', async () => {
    await assert.rejects(
      withCameraStartupTimeout(new Promise<never>(() => {}), 5),
      { message: CAMERA_START_TIMEOUT_ERROR },
    );
  });

  it('keeps a successful camera startup and clears its timeout', async () => {
    assert.equal(await withCameraStartupTimeout(Promise.resolve('ready'), 50), 'ready');
  });
});