export function shouldRedirectToLoginAfterUnauthorized(input: {
  isCancelled: boolean;
  isUnauthorized: boolean;
  hasSupabaseSession: boolean;
}) {
  if (input.isCancelled) return false;
  if (!input.isUnauthorized) return false;
  return !input.hasSupabaseSession;
}

export function shouldRefreshAuthAfterUnauthorized(input: {
  isCancelled: boolean;
  isUnauthorized: boolean;
  hasSupabaseSession: boolean;
}) {
  if (input.isCancelled) return false;
  return input.isUnauthorized && input.hasSupabaseSession;
}
