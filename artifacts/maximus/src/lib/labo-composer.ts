export type LaboFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface LaboFieldDefinition {
  id: string;
  label: string;
  type: LaboFieldType;
  required: boolean;
  options?: string[];
}

export interface LaboWorkflowStage {
  id: string;
  label: string;
  requiredFieldIds: string[];
}

export interface LaboWorkflowDefinition {
  stages: LaboWorkflowStage[];
}

export interface LaboReusedFeatureDefinition {
  id: string;
  label: string;
  description: string;
  kind: 'reuse';
  sourceModuleId: string;
  sourceFeatureId: string;
}

export interface LaboRecordFeatureDefinition {
  id: string;
  label: string;
  description: string;
  kind: 'records';
  fields: LaboFieldDefinition[];
  workflow?: LaboWorkflowDefinition;
}

export type LaboFeatureDefinition =
  | LaboReusedFeatureDefinition
  | LaboRecordFeatureDefinition;

export interface LaboRecord {
  id: string;
  moduleId: string;
  featureId: string;
  data: Record<string, string | number | boolean | null>;
  status: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface LaboFeatureBootstrap {
  moduleId: string;
  featureId: string;
  definition: LaboRecordFeatureDefinition;
  records: LaboRecord[];
  count: number;
}

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function createLaboFeatureId(label: string, prefix = 'custom') {
  const name = slug(label);
  return name ? `${prefix}-${name}` : '';
}

export function createLaboReuseFeatureId(moduleId: string, featureId: string) {
  return `reuse-${slug(moduleId)}-${slug(featureId)}`;
}

export function validateLaboFeatures(features: readonly LaboFeatureDefinition[]) {
  const errors: string[] = [];
  const featureIds = new Set<string>();
  const validId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const fieldTypes: LaboFieldType[] = ['text', 'number', 'date', 'select', 'boolean'];

  for (const feature of features) {
    if (!feature.id.trim() || !feature.label.trim()) {
      errors.push('Chaque fonctionnalité LABO doit avoir un identifiant et un nom.');
    }
    if (!validId.test(feature.id)) {
      errors.push(`L’identifiant de « ${feature.label || feature.id} » doit être un slug lisible.`);
    }
    if (featureIds.has(feature.id)) {
      errors.push(`La fonctionnalité « ${feature.label || feature.id} » est ajoutée plusieurs fois.`);
    }
    featureIds.add(feature.id);

    if (feature.kind === 'reuse') {
      if (!feature.sourceModuleId.trim() || !feature.sourceFeatureId.trim()) {
        errors.push(`La fonctionnalité réutilisée « ${feature.label} » n’a pas de source valide.`);
      }
      continue;
    }

    if (feature.fields.length === 0) {
      errors.push(`La fonctionnalité « ${feature.label} » doit contenir au moins un champ.`);
    }
    const fieldIds = new Set<string>();
    for (const field of feature.fields) {
      if (!field.id.trim() || !field.label.trim()) {
        errors.push(`Un champ de « ${feature.label} » n’a pas de nom ou d’identifiant.`);
      }
      if (!validId.test(field.id)) {
        errors.push(`L’identifiant du champ « ${field.label || field.id} » doit être un slug lisible.`);
      }
      if (!fieldTypes.includes(field.type)) {
        errors.push(`Le type du champ « ${field.label} » n’est pas pris en charge.`);
      }
      if (fieldIds.has(field.id)) {
        errors.push(`Le champ « ${field.label || field.id} » est répété dans « ${feature.label} ».`);
      }
      fieldIds.add(field.id);
      const options = (field.options ?? []).map(option => option.trim()).filter(Boolean);
      if (field.type === 'select' && options.length === 0) {
        errors.push(`Le champ « ${field.label} » doit proposer au moins un choix.`);
      }
      if (field.type === 'select' && new Set(options).size !== options.length) {
        errors.push(`Le champ « ${field.label} » contient des choix répétés.`);
      }
    }

    const stages = feature.workflow?.stages ?? [];
    if (feature.workflow && stages.length < 2) {
      errors.push(`Le workflow de « ${feature.label} » doit contenir au moins deux étapes.`);
    }
    const stageIds = new Set<string>();
    for (const stage of stages) {
      if (!stage.id.trim() || !stage.label.trim() || stageIds.has(stage.id)) {
        errors.push(`Les étapes du workflow de « ${feature.label} » doivent avoir des noms distincts.`);
      }
      if (!validId.test(stage.id)) {
        errors.push(`L’identifiant d’une étape de « ${feature.label} » doit être un slug lisible.`);
      }
      stageIds.add(stage.id);
      if (stage.requiredFieldIds.some(fieldId => !fieldIds.has(fieldId))) {
        errors.push(`Une étape de « ${feature.label} » demande un champ qui n’existe pas.`);
      }
    }
  }

  return [...new Set(errors)];
}

export function sourceFeatureHref(moduleId: string, featureId: string) {
  const route = `/entreprise/${encodeURIComponent(moduleId)}`;
  const parameter = ['commerce', 'ventes', 'stocks', 'ecommerce', 'transport'].includes(moduleId)
    ? 'tab'
    : 'feature';
  return `${route}?${parameter}=${encodeURIComponent(featureId)}`;
}