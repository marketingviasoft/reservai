import { isUserNotProvisionedError } from "./authErrors";

export type AuthStatus =
  | "loading"
  | "unauthenticated"
  | "authenticated"
  | "error";

export function getAuthStatus(input: {
  sessionChecked: boolean;
  hasSupabaseSession: boolean;
  hasUser: boolean;
  hasError: boolean;
  isAuthQueryLoading: boolean;
  isBootstrapPending: boolean;
  isLogoutPending: boolean;
}) {
  const loading =
    !input.sessionChecked ||
    input.isLogoutPending ||
    (input.hasSupabaseSession &&
      (input.isAuthQueryLoading || input.isBootstrapPending));

  if (loading) return "loading";
  if (input.hasUser) return "authenticated";
  if (input.hasError && input.hasSupabaseSession) return "error";
  return "unauthenticated";
}

export function shouldBootstrapAuth(input: {
  sessionChecked: boolean;
  hasSupabaseSession: boolean;
  authError: unknown;
  bootstrapAttempted: boolean;
  isBootstrapPending: boolean;
}) {
  if (!input.sessionChecked || !input.hasSupabaseSession) return false;
  if (input.bootstrapAttempted || input.isBootstrapPending) return false;
  return isUserNotProvisionedError(input.authError);
}

export function shouldRunAuthMeQuery(input: {
  hasSupabaseClient: boolean;
  sessionChecked: boolean;
  hasSupabaseSession: boolean;
  isBootstrapPending: boolean;
}) {
  if (!input.hasSupabaseClient) return true;
  return (
    input.sessionChecked &&
    input.hasSupabaseSession &&
    !input.isBootstrapPending
  );
}

export function shouldRefreshAuthMeForSupabaseEvent(event: string) {
  return event === "SIGNED_OUT";
}
