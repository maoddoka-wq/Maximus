import test from 'node:test';
import assert from 'node:assert/strict';
import { modules } from './store';
import { companyNav } from './navigation';
import {
  moduleDescriptorById,
  moduleIdForPath,
  moduleRegistry,
} from './module-registry';

test('chaque module du catalogue possède une route et une navigation', () => {
  const catalogIds = modules.map(module => module.id).sort();
  const registryIds = moduleRegistry.map(module => module.id).sort();
   const navigableIds = companyNav
    .map(item => item.module)
    .filter((moduleId): moduleId is string => typeof moduleId === 'string')
    .sort();

  assert.deepEqual(registryIds, catalogIds);
  assert.deepEqual(navigableIds, catalogIds);
  assert.equal(new Set(moduleRegistry.map(module => module.path)).size, moduleRegistry.length);
});

test('les routes de modules sont réversibles et décrivent le même module', () => {
  for (const module of moduleRegistry) {
    assert.equal(moduleIdForPath(module.path), module.id);
    assert.equal(moduleDescriptorById[module.id].path, module.path);
  }
});