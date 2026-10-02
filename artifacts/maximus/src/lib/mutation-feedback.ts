export function mutationSuccessMessage(
  message: string | null | undefined,
  authenticated: boolean,
  persist: boolean,
) {
  if (message === null) return undefined;
  return message ?? (authenticated && persist ? 'Modification enregistrée.' : undefined);
}