import type { ModuleId, Status } from '@/lib/store';

export type OperationalModuleId = Extract<
  ModuleId,
  'achats' | 'comptabilite' | 'paie' | 'crm' | 'fournisseurs' | 'logistique' | 'documents'
>;

export type OperationalField = {
  key: string;
  label: string;
  type?: 'number' | 'select';
  options?: string[];
};

export type OperationalRuleConfig = {
  id: OperationalModuleId;
  fields: OperationalField[];
};

export function transitionOptions(status: Status): Status[] {
  if (status === 'ARCHIVÉ' || status === 'VALIDÉ' || status === 'CONFIRMÉ') {
    return [status];
  }
  if (status === 'BROUILLON') {
    return ['BROUILLON', 'EN ATTENTE', 'ACTIF', 'VALIDÉ', 'ARCHIVÉ'];
  }
  if (status === 'EN ATTENTE') {
    return ['EN ATTENTE', 'ACTIF', 'VALIDÉ', 'CONFIRMÉ', 'ARCHIVÉ'];
  }
  return ['ACTIF', 'EN ATTENTE', 'VALIDÉ', 'CONFIRMÉ', 'ARCHIVÉ'];
}

export function validateOperationalRecord(
  config: OperationalRuleConfig,
  values: Record<string, string>,
): string {
  const missing = config.fields.find(field => !values[field.key]?.trim());
  if (missing) return `Le champ « ${missing.label} » est obligatoire.`;

  for (const field of config.fields.filter(field => field.type === 'number')) {
    const value = Number(values[field.key]);
    if (!Number.isFinite(value) || value < 0) {
      return `Le champ « ${field.label} » doit être un nombre positif ou nul.`;
    }
  }

  if (config.id === 'achats' || config.id === 'crm') {
    if (Number(values.amount) <= 0) {
      return 'Le montant doit être strictement supérieur à zéro.';
    }
  }
  if (config.id === 'comptabilite') {
    const debit = Number(values.debit);
    const credit = Number(values.credit);
    if (debit <= 0 || credit <= 0) {
      return 'Une écriture comptable doit comporter un débit et un crédit strictement positifs.';
    }
    if (debit !== credit) {
      return 'Le débit et le crédit doivent être strictement égaux.';
    }
  }
  if (config.id === 'paie') {
    const gross = Number(values.gross);
    const net = Number(values.net);
    if (gross <= 0 || net <= 0) {
      return 'Les montants brut et net doivent être strictement positifs.';
    }
    if (net > gross) {
      return 'Le net à payer ne peut pas dépasser le salaire brut.';
    }
  }
  if (config.id === 'fournisseurs' && (Number(values.score) < 0 || Number(values.score) > 100)) {
    return 'Le score fournisseur doit être compris entre 0 et 100.';
  }
  return '';
}