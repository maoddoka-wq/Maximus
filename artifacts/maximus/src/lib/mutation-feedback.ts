export function mutationSuccessMessage(
  message: string | undefined,
  authenticated: boolean,
  persist: boolean,
) {
  return message ?? (authenticated && persist ? 'Modification enregistrée.' : undefined);
}