import assert from 'node:assert/strict';
import test from 'node:test';
import { Gauge, Package } from 'lucide-react';
import type { SidebarFeatureGroup } from './navigation';
import {
  buildModuleEntries,
  canShowNavigationControl,
  companyNavigationCustomAllowed,
  companyNavigationMode,
  findActiveGroup,
  isModuleEntryActive,
  normalizeNavigationMode,
} from './company-navigation';
import { parseNavigationSettings } from './company-navigation-api';

const groups: SidebarFeatureGroup[] = [
  { label: 'Stock', items: [
    { href: '/entreprise/stocks?tab=produits', label: 'Produits', icon: Package },
    { href: '/entreprise/stocks?tab=mouvements', label: 'Mouvements', icon: Package },
  ] },
  { label: 'Paie', items: [
    { href: '/entreprise/paie?feature=tableau-de-bord', label: 'Tableau', icon: Gauge },
    { href: '/entreprise/paie?feature=bulletins', label: 'Bulletins', icon: Package },
  ] },
  { label: 'Vide', items: [] },
];

test('default mode is menu and grant is false', () => {
  assert.equal(companyNavigationMode(undefined), 'menu');
  assert.equal(companyNavigationMode({ moduleNavigationMode: 'horizontal' }), 'horizontal');
  assert.equal(normalizeNavigationMode('x'), 'menu');
  assert.equal(companyNavigationCustomAllowed({}), false);
  assert.equal(companyNavigationCustomAllowed({ navigationCustomAllowed: true }), true);
});

test('control visible only to authorized company admins', () => {
  assert.equal(canShowNavigationControl({ companyAdmin: true, customAllowed: true }), true);
  assert.equal(canShowNavigationControl({ companyAdmin: true, customAllowed: false }), false);
  assert.equal(canShowNavigationControl({ companyAdmin: false, customAllowed: true }), false);
});

test('module entries use permitted items only and first feature when no dashboard', () => {
  const entries = buildModuleEntries(groups);
  assert.deepEqual(entries.map(entry => entry.label), ['Stock', 'Paie']);
  assert.equal(entries[0].href, '/entreprise/stocks?tab=produits');
  assert.equal(entries[1].href, '/entreprise/paie?feature=tableau-de-bord');
});

test('active group and module entry follow query aliases', () => {
  const active = findActiveGroup('/entreprise/stocks?tab=mouvements', groups);
  assert.equal(active?.group.label, 'Stock');
  assert.equal(active?.activeHref, '/entreprise/stocks?tab=mouvements');
  const entries = buildModuleEntries(groups);
  assert.equal(isModuleEntryActive(entries[0], active?.activeHref), true);
  assert.equal(isModuleEntryActive(entries[1], active?.activeHref), false);
  assert.equal(findActiveGroup('/entreprise/dashboard', groups), null);
});

test('settings parsing defaults safely', () => {
  assert.deepEqual(parseNavigationSettings({ mode: 'horizontal', customAllowed: true }, 'c1'),
    { companyId: 'c1', mode: 'horizontal', customAllowed: true });
  assert.deepEqual(parseNavigationSettings(null, 'c1'), { companyId: 'c1', mode: 'menu', customAllowed: false });
});
