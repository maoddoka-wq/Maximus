const ANA_PREVIEW_PATH = '/__preview/ana';

function normalizedPath(value: string): string {
  const segments = value.split(/[?#]/, 1)[0].split('/').filter(Boolean);
  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}

function basePath(value: string): string {
  if (!value || value === '/' || value === './') return '';
  const segments = value.split(/[?#]/, 1)[0].split('/').filter(Boolean);
  return segments.length > 0 ? `/${segments.join('/')}` : '';
}

export function stripViteBasePath(pathname: string, baseUrl: string): string {
  const path = normalizedPath(pathname);
  const base = basePath(baseUrl);
  if (!base) return path;
  if (path === base) return '/';
  return path.startsWith(`${base}/`) ? path.slice(base.length) || '/' : path;
}

export function isAnaPreviewPath(pathname: string, baseUrl: string): boolean {
  return stripViteBasePath(pathname, baseUrl) === ANA_PREVIEW_PATH;
}

export function buildAnaPreviewHref(baseUrl: string): string {
  return `${basePath(baseUrl)}${ANA_PREVIEW_PATH}`;
}

export function buildWorkspaceHomeHref(baseUrl: string): string {
  return `${basePath(baseUrl)}/`;
}