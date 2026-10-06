export type CompanyPushPromptPermission =
  | 'default'
  | 'granted'
  | 'denied'
  | 'unsupported';

export type CompanyPushPromptState = {
  supportError: string | null;
  accessAllowed: boolean | null;
  subscribed: boolean;
  dismissed: boolean;
  permission: CompanyPushPromptPermission;
};

export function shouldShowCompanyPushPrompt(state: CompanyPushPromptState): boolean {
  return (
    !state.supportError
    && state.accessAllowed === true
    && !state.subscribed
    && !state.dismissed
    && state.permission !== 'unsupported'
  );
}
