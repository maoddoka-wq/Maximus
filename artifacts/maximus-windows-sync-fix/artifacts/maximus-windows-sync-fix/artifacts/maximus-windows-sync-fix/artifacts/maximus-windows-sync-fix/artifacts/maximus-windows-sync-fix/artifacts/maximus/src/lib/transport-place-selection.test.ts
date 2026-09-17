import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isDestinationPlaceCommitted } from './transport-place-selection';

const place = {
  label: "Place de l'Obélisque, Commune de Gueule Tapée-Fass-Colobane, Dakar",
  latitude: 14.7167,
  longitude: -17.4677,
  type: 'place',
};

describe('transport-place-selection', () => {
  it('recognizes the exact label after the customer selects a suggestion', () => {
    assert.equal(isDestinationPlaceCommitted(`  ${place.label}  `, place), true);
  });

  it('does not commit a partial search query', () => {
    assert.equal(isDestinationPlaceCommitted("Place de l'Obélisque", place), false);
    assert.equal(isDestinationPlaceCommitted(place.label, null), false);
  });
});