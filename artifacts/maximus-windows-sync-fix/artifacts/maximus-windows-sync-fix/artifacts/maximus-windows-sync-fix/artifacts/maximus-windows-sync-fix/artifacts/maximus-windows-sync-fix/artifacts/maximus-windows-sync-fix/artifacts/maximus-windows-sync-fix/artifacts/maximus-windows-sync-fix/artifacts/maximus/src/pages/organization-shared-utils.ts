import {
  modules as allModules,
  stockSubmodules,
  type Module,
} from '@/lib/store';

export const defaultCompanyTheme = {
  primaryColor: '#F2B705',
  accentColor: '#F2B705',
  sidebarColor: '#161D27',
};

export const companyThemePresets = [
  { name: 'MAXIMUS', primaryColor: '#F2B705', accentColor: '#F2B705', sidebarColor: '#161D27' },
  { name: 'Océan', primaryColor: '#0E7490', accentColor: '#06B6D4', sidebarColor: '#062A38' },
  { name: 'Forêt', primaryColor: '#15803D', accentColor: '#84CC16', sidebarColor: '#102A1C' },
  { name: 'Prune', primaryColor: '#7E22CE', accentColor: '#DB2777', sidebarColor: '#24132D' },
  { name: 'Terre', primaryColor: '#C2410C', accentColor: '#EA580C', sidebarColor: '#351B12' },
];

export const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

export function permissionLabel(
  key: string,
  moduleDefinitions: Module[] = allModules,
) {
  const menuMatch = key.match(/^([^:]+):menu:(.+)$/);
  if (menuMatch) {
    return `${moduleDefinitions.find(module => module.id === menuMatch[1])?.name ?? menuMatch[1]} · ${menuMatch[2].replace(/-/g, ' ')}`;
  }
  if (key.startsWith('stocks:')) {
    return `Gestion de stock · ${stockSubmodules.find(item => item.id === key.slice('stocks:'.length))?.name ?? key.slice('stocks:'.length)}`;
  }
  if (key.startsWith('presence.')) {
    return `Présences · ${key.slice('presence.'.length)}`;
  }
  return allModules.find(module => module.id === key)?.name || key;
}