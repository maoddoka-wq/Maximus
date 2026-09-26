export function isPublicIntelligentRegistrationEnabled(
  catalogEnabled: boolean | null,
  installationEnabled: boolean | undefined,
): boolean {
  return catalogEnabled === true && installationEnabled !== false;
}