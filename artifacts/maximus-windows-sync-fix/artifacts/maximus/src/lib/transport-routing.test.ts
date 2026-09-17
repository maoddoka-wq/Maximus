import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDriverNavigationUrl } from './transport-routing';

describe('transport-routing', () => {
  it('guides the driver to the exact passenger pickup coordinates', () => {
    const url = buildDriverNavigationUrl({
      pickupLatitude: 14.7167,
      pickupLongitude: -17.4677,
    }, {
      latitude: 14.705,
      longitude: -17.455,
    });

    assert.ok(url);
    const params = new URL(url).searchParams;
    assert.equal(params.get('destination'), '14.7167,-17.4677');
    assert.equal(params.get('origin'), null);
    assert.equal(params.get('waypoints'), null);
    assert.equal(params.get('dir_action'), 'navigate');
  });

  it('does not create an inaccurate text-based route without pickup coordinates', () => {
    assert.equal(buildDriverNavigationUrl({
      pickupLatitude: null,
      pickupLongitude: null,
    }, null), null);
  });
});