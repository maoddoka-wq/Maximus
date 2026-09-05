export type ModuleProfileAction = 'voir' | 'créer' | 'modifier';

export interface ModuleEmployeeProfile {
  id: string;
  name: string;
  description: string;
  featureIds: string[];
  defaultActions: ModuleProfileAction[];
}