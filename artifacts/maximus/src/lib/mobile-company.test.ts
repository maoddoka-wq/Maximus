import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveMobileModuleRail } from './mobile-module-rail';
import { countActiveFilters, filterToggleLabel } from './filter-group';
import { railScrollTarget } from './rail-scroll';

// tsx compiles with the classic JSX runtime; expose React before loading components.
(globalThis as { React?: typeof React }).React = React;
const { ResponsiveFilterGroup } = await import('../components/responsive-filter-group');
const { WorkspaceTabs } = await import('../components/workspace-tabs');

const groups = [{ label: 'Immobilier', items: [
  { href: '/entreprise/immobilier?feature=dashboard', label: 'Tableau de bord', icon: (() => null) as never },
  { href: '/entreprise/immobilier?feature=biens', label: 'Biens', icon: (() => null) as never },
] }];

test('rail contains only permitted sidebar items and tracks the active feature', () => {
  const rail = resolveMobileModuleRail('/entreprise/immobilier?feature=biens', groups, '/entreprise/immobilier');
  assert.deepEqual(rail?.items.map(item => item.label), ['Tableau de bord', 'Biens']);
  assert.equal(rail?.activeId, '/entreprise/immobilier?feature=biens');
  assert.equal(resolveMobileModuleRail('/entreprise/immobilier', groups, '/entreprise/immobilier')?.activeId, groups[0].items[0].href);
  assert.equal(resolveMobileModuleRail('/entreprise/stocks', groups, '/entreprise/immobilier'), null);
});

test('rail is hidden when only one section is permitted', () => {
  assert.equal(resolveMobileModuleRail('/entreprise/immobilier', [{ label: 'x', items: [groups[0].items[0]] }], '/entreprise/immobilier'), null);
});

test('filter helpers count and label active filters', () => {
  assert.equal(countActiveFilters([['ALL', 'ALL'], ['DRAFT', 'ALL']]), 1);
  assert.equal(filterToggleLabel('Filtres', 0), 'Filtres');
  assert.equal(filterToggleLabel('Filtres', 2), 'Filtres (2)');
});

test('rail scroll target is clamped and centred', () => {
  assert.equal(railScrollTarget({ width: 300, scrollWidth: 900 }, { left: 500, width: 100 }), 400);
  assert.equal(railScrollTarget({ width: 300, scrollWidth: 900 }, { left: 0, width: 100 }), 0);
  assert.equal(railScrollTarget({ width: 300, scrollWidth: 900 }, { left: 850, width: 50 }), 600);
});

test('filter group keeps supplementary controls mounted and exposes an accessible toggle', () => {
  const html = renderToStaticMarkup(createElement(ResponsiveFilterGroup, { search: createElement('input', { 'aria-label': 'Rechercher' }), activeCount: 1, onClear: () => undefined, testId: 't' },
    createElement('select', { 'aria-label': 'Statut' })));
  assert.match(html, /aria-label="Statut"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="[^"]+"/);
  assert.match(html, /Filtres \(1\)/);
  assert.match(html, /Effacer les filtres/);
});

test('mobile-only tab rail is marked and keeps real button labels', () => {
  const html = renderToStaticMarkup(createElement(WorkspaceTabs, { items: [{ id: 'a', label: 'Articles' }], activeId: 'a', onChange: () => undefined, ariaLabel: 'Menu', testIdPrefix: 'x', mobileOnly: true }));
  assert.match(html, /company-mobile-rail md:hidden/);
  assert.match(html, /aria-current="page"/);
});
