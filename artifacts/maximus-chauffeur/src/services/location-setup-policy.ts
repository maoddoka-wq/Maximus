export type LocationSetupFailure =
  | {
      reason: 'services-disabled';
      message: string;
    }
  | {
      reason: 'foreground-permission';
      message: string;
      canAskAgain: boolean;
    };

export function shouldOpenLocationAppSettings(
  failure: LocationSetupFailure,
): boolean {
  return (
    failure.reason === 'foreground-permission' &&
    !failure.canAskAgain
  );
}