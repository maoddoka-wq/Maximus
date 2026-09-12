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
  if (!/(?:^|\s)(cree|creer|ajoute|ajouter|configurer|monter|preparer)(?:\s|$)/.test(normalized)) return null;

  if (/\bfonctionnalit/.test(normalized) && /\bdans\s+(?:le\s+)?module\b/.test(normalized)) {
    const name = matchValue(question, /fonctionnalit(?:e|é)s?(?:\s+(?:nommee|nommée|appelee|appelée|intitulee|intitulée))?\s+["«]?(.+?)(?=\s+(?:dans|description|depend|dépend)|[.!?]|$)/i);
    const moduleId = matchValue(question, /\bdans\s+(?:le\s+)?module\s+["«]?(.+?)(?=\s+(?:description|depend|dépend)|[.!?]|$)/i);
    const description = matchValue(question, /\bdescription\s*:?\s*(.+?)(?=\s+(?:depend|dépend)|[.!?]|$)/i);
    if (!name || !moduleId) return null;
    return {
      type: 'create_feature',
      name,
      moduleId,
      description: description || undefined,
    };
  }

  if (/(?:entreprise|societe)/.test(normalized)
    && /(?:monter|cree|creer|preparer|configurer)/.test(normalized)
    && !/(?:organisation|unite)/.test(normalized)) {
    const name = matchValue(question, /\b(?:entreprise|soci[eé]t[eé])\b(?:\s+(?:nommee|nommée|appelee|appelée|intitulee|intitulée))?\s+["«]?(.+?)(?=\s+(?:secteur|modules?|besoin|contact)|[.!?]|$)/i);
    const sector = matchValue(question, /\bsecteur\s*:?\s*["«]?(.+?)(?=\s+(?:modules?|besoin|contact)|[.!?]|$)/i);
    const moduleIds = splitValues(matchValue(question, /\bmodules?\s*:?\s*(.+?)(?:\s+(?:besoin|contact)|[.!?]|$)/i));
    const requirements = splitValues(matchValue(question, /\bbesoins?\s*:?\s*(.+?)(?:\s+contact|[.!?]|$)/i));
    const companyEmail = matchValue(question, /\bcontact\s*:?\s*([^\s,;]+)/i);
    if (!name || !sector || moduleIds.length === 0) return null;
    return {
      type: 'create_company_plan',
      name,
      sector,
      moduleIds,
      requirements,
      companyEmail: companyEmail || undefined,
    };
  }

  if (/\bsecteur\b/.test(normalized)) {
    const name = matchValue(question, /\bsecteur\b(?:\s+(?:nomme|nommé|appele|appelé|intitule|intitulé))?\s+["«]?(.+?)(?=\s+(?:modules?|fonctionnalit)|[.!?]|$)/i);
    const moduleIds = splitValues(matchValue(question, /\bmodules?\s*:?\s*(.+?)(?:\s+fonctionnalit|[.!?]|$)/i));
    const moduleFeatures = matchValue(question, /\bfonctionnalit(?:e|é)s?\s*:?\s*(.+?)(?:[.!?]|$)/i);
    if (!name || moduleIds.length === 0) return null;
    return {
      type: 'create_sector',
      name,
      moduleIds,
      moduleFeatures: moduleFeatures ? Object.fromEntries(moduleIds.map(moduleId => [moduleId, splitValues(moduleFeatures)])) : undefined,
    };
  }

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

  if (/(?:organisation|unite)/.test(normalized)) {
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