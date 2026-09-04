import type { Company } from './store';

export type CompanyThemeVariables = Record<string, string>;

const hexColorPattern = /^#[0-9a-f]{6}$/i;
const themeVariableNames = [
  '--primary',
  '--primary-foreground',
  '--accent',
  '--accent-foreground',
  '--ring',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-border',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-active',
  '--sidebar-active-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
];

function hexToHsl(hex: string) {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(lightness * 100)}%`;
  }

  const difference = max - min;
  const saturation = lightness > 0.5
    ? difference / (2 - max - min)
    : difference / (max + min);
  let hue = 0;

  if (max === red) {
    hue = ((green - blue) / difference + (green < blue ? 6 : 0)) / 6;
  } else if (max === green) {
    hue = ((blue - red) / difference + 2) / 6;
  } else {
    hue = ((red - green) / difference + 4) / 6;
  }

  return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

function themeForeground(hex: string) {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return luminance > 0.62 ? '218 28% 13%' : '0 0% 100%';
}

function shiftHslLightness(hsl: string, amount: number) {
  const match = hsl.match(/^(\d+) (\d+)% (\d+)%$/);
  if (!match) return hsl;

  return `${match[1]} ${match[2]}% ${Math.max(5, Math.min(95, Number(match[3]) + amount))}%`;
}

export function companyThemeVariables(company: Company | undefined): CompanyThemeVariables {
  if (!company) return {};

  const primary = hexColorPattern.test(company.primaryColor ?? '') ? company.primaryColor! : null;
  const accent = hexColorPattern.test(company.accentColor ?? '') ? company.accentColor! : primary;
  const primaryColor = primary ?? '#f2b705';
  const accentColor = accent ?? primaryColor;
  const sidebarColor = hexColorPattern.test(company.sidebarColor ?? '') ? company.sidebarColor! : '#161d27';
  const sidebarHsl = hexToHsl(sidebarColor);
  const sidebarForeground = themeForeground(sidebarColor);
  const sidebarActive = hexToHsl(primaryColor);
  const sidebarActiveForeground = themeForeground(primaryColor);
  const sidebarAccent = shiftHslLightness(sidebarHsl, 8);

  return {
    '--primary': hexToHsl(primaryColor),
    '--primary-foreground': themeForeground(primaryColor),
    '--accent': hexToHsl(accentColor),
    '--accent-foreground': themeForeground(accentColor),
    '--ring': hexToHsl(primaryColor),
    '--sidebar': sidebarHsl,
    '--sidebar-foreground': sidebarForeground,
    '--sidebar-border': shiftHslLightness(sidebarHsl, 10),
    '--sidebar-primary': hexToHsl(primaryColor),
    '--sidebar-primary-foreground': themeForeground(primaryColor),
    '--sidebar-active': sidebarActive,
    '--sidebar-active-foreground': sidebarActiveForeground,
    '--sidebar-accent': sidebarAccent,
    '--sidebar-accent-foreground': sidebarForeground,
  };
}

export function applyCompanyTheme(company: Company | undefined) {
  const root = document.documentElement;
  themeVariableNames.forEach(name => root.style.removeProperty(name));

  Object.entries(companyThemeVariables(company)).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}