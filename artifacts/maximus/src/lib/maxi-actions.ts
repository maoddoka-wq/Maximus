import type { MaximusAssistantAction } from './maximus-assistant-api';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function splitValues(value: string | undefined) {
  return (value ?? '')
    .split(/,|;|\bet\b/gi)
    .map(item => item.trim().replace(/^["«]|["»]$/g, ''))
    .filter(Boolean);
}

function matchValue(source: string, expression: RegExp) {
  return source.match(expression)?.[1]?.trim().replace(/^["«]|["»]$/g, '').trim() ?? '';
}

export function parseMaxiActionRequest(question: string): MaximusAssistantAction | null {
  const normalized = normalize(question);
  if (!/\b(cree|creer|ajoute|ajouter)\b/.test(normalized)) return null;

  if (/\bpack\b/.test(normalized)) {
    const name = matchValue(question, /\bpack\b(?:\s+(?:nomme|appele|intitule))?\s+["«]?(.+?)(?=\s+(?:dans|pour|description|fonctionnalit)|[.!?]|$)/i);
    const moduleId = matchValue(question, /\b(?:dans|pour)\s+(?:le\s+)?module\s+["«]?(.+?)(?=\s+(?:description|fonctionnalit)|[.!?]|$)/i);
    const description = matchValue(question, /\bdescription\s*:?\s*(.+?)(?=\s+fonctionnalit|[.!?]|$)/i);
    const featureIds = splitValues(matchValue(question, /\bfonctionnalit(?:e|é)s?\s*:?\s*(.+?)(?:[.!?]|$)/i));
    if (!name || !moduleId || !description || featureIds.length === 0) return null;

    return {
      type: 'create_pack',
      name,
      moduleId,
      description,
      featureIds,
    };
  }

  if (/\bmodule\b/.test(normalized)) {
    const name = matchValue(question, /\bmodule\b(?:\s+(?:nomme|appele|intitule))?\s+["«]?(.+?)(?=\s+(?:avec|description|fonctionnalit|et un pack)|[.!?]|$)/i);
    const description = matchValue(question, /\bdescription\s*:?\s*(.+?)(?=\s+(?:fonctionnalit|pack)|[.!?]|$)/i);
    const features = splitValues(matchValue(question, /\bfonctionnalit(?:e|é)s?\s*:?\s*(.+?)(?=\s+(?:description|pack)|[.!?]|$)/i));
    if (!name || !description || features.length === 0) return null;

    return {
      type: 'create_module',
      name,
      description,
      features,
    };
  }

  if (/\b(?:organisation|unite)\b/.test(normalized)) {
    const name = matchValue(question, /(?:organisation|unite|unité)(?:\s+(?:nommee|nommée|appelee|appelée))?\s+["«]?(.+?)(?=\s+(?:pour|dans|code|modules?)|[.!?]|$)/i);
    const companyId = matchValue(question, /\bentreprise\s+["«]?(.+?)(?=\s+(?:code|modules?)|[.!?]|$)/i);
    const code = matchValue(question, /\bcode\s*:?\s*([A-Za-z0-9_-]+)/i);
    const moduleIds = splitValues(matchValue(question, /\bmodules?\s*:?\s*(.+?)(?:\s+packs?\s*:|[.!?]|$)/i));
    if (!name || !companyId || !code || moduleIds.length === 0) return null;

    return {
      type: 'create_organization_unit',
      name,
      companyId,
      code,
      moduleIds,
    };
  }

  return null;
}