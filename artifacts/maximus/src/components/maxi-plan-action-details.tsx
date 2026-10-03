import type { MaximusAssistantAction } from '@/lib/maximus-assistant-api';

const actionNames: Record<MaximusAssistantAction['type'], string> = {
  create_module: 'Création d’un module en brouillon',
  create_pack: 'Création d’un pack en brouillon',
  create_feature: 'Ajout d’une fonctionnalité au catalogue en brouillon',
  create_sector: 'Création d’un secteur en brouillon',
  create_company_plan: 'Enregistrement d’un plan d’entreprise, sans activation',
  create_organization_unit: 'Création d’une unité dans une entreprise existante',
};

export function MaxiPlanActionDetails({ action }: { action: MaximusAssistantAction }) {
  const fields: Array<[string, string | undefined]> = [
    ['Action', actionNames[action.type]],
    ['Nom', action.name],
    ['Identifiant', action.id],
    ['Description', action.description],
    ['Module cible', action.moduleId],
    ['Entreprise', action.companyName || action.companyId],
    ['Identifiant entreprise', action.companyId],
    ['Unité parente', action.parentId || undefined],
    ['Code', action.code],
    ['Secteur', action.sector],
    ['Contact', action.companyEmail],
    ['Responsable proposé', action.managerName],
    ['Modules sélectionnés', action.moduleIds?.join(', ')],
    ['Fonctionnalités', (action.features || action.featureIds)?.join(', ')],
    ['Dépendances', action.dependencies?.join(', ')],
    ['Besoins', action.requirements?.join(' ; ')],
    ['Packs sélectionnés', action.modulePackIds && Object.entries(action.modulePackIds)
      .map(([module, ids]) => `${module} : ${ids.join(', ')}`).join(' ; ')],
    ['Fonctionnalités par module', action.moduleFeatures && Object.entries(action.moduleFeatures)
      .map(([module, ids]) => `${module} : ${ids.join(', ')}`).join(' ; ')],
    ['Packs intégrés', action.featurePacks?.map(pack => `${pack.name} : ${pack.featureIds.join(', ')}`).join(' ; ')],
  ];
  return (
    <dl className="space-y-1 text-xs">
      {fields.filter(([, value]) => value).map(([label, value]) => (
        <div key={label} className="break-words">
          <dt className="inline font-semibold">{label} : </dt>
          <dd className="inline text-muted-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}