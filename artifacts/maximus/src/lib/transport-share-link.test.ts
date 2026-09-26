import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicTransportShareUrl, parsePublicTransportShareUrl } from './transport-share-link';

const token = 'a'.repeat(64);

describe('transport-share-link', () => {
  it('keeps the bearer token in the URL fragment, not in the request query', () => {
    const sharedUrl = new URL(buildPublicTransportShareUrl(
      'https://taxi.example/shop/kora/transport?campaign=summer',
      'trip_123',
      token,
    ));

    assert.equal(sharedUrl.searchParams.get('taxiTripId'), 'trip_123');
    assert.equal(sharedUrl.searchParams.get('taxiShare'), null);
    assert.equal(sharedUrl.hash, `#taxiShare=${token}`);
    assert.deepEqual(parsePublicTransportShareUrl(sharedUrl.toString()), {
      tripId: 'trip_123',
      shareToken: token,
    });
  });

  it('ignores incomplete or malformed share links', () => {
    assert.equal(parsePublicTransportShareUrl('https://taxi.example/shop/kora/transport?taxiTripId=trip_123'), null);
    assert.equal(parsePublicTransportShareUrl(`https://taxi.example/shop/kora/transport?taxiTripId=trip_123#taxiShare=short`), null);
    assert.equal(parsePublicTransportShareUrl(`https://taxi.example/shop/kora/transport?taxiTripId=trip_123#taxiShare=${token.toUpperCase()}`), null);
    assert.throws(() => buildPublicTransportShareUrl('https://taxi.example/transport', 'trip_123', 'short'));
  });
});