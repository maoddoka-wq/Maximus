export const driverGpsOptions: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 15_000,
  timeout: 45_000,
};

export const shouldBlockDriverWorkspaceOnGpsError = (hasConfirmedLocation: boolean) =>
  !hasConfirmedLocation;

export const getDriverGpsErrorMessage = (code: number) => {
  if (code === 1) {
    return 'Autorisez la localisation de ce site et vérifiez aussi l’autorisation de localisation de Chrome dans les réglages Android.';
  }
  if (code === 2) {
    return 'Le téléphone n’a pas transmis de position. Vérifiez que la localisation précise est autorisée pour Chrome, puis réessayez.';
  }
  return 'La recherche GPS prend plus de temps que prévu. Gardez cette page ouverte quelques instants ; le navigateur réessaiera automatiquement.';
};