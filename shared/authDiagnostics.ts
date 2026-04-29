export type AuthEnvironmentInput = {
  databaseUrl?: string | null;
  supabaseUrl?: string | null;
  supabaseAnonKey?: string | null;
  nodeEnv?: string | null;
};

export type FrontendAuthEnvironmentInput = {
  viteSupabaseUrl?: string | null;
  viteSupabaseAnonKey?: string | null;
};

function getHostFromUrl(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export function buildAuthDiagnostics(input: AuthEnvironmentInput) {
  return {
    hasDatabaseUrl: Boolean(input.databaseUrl),
    hasSupabaseUrl: Boolean(input.supabaseUrl),
    hasSupabaseAnonKey: Boolean(input.supabaseAnonKey),
    supabaseHost: getHostFromUrl(input.supabaseUrl),
    nodeEnv: input.nodeEnv ?? "",
  };
}

export function buildFrontendAuthDiagnostics(
  input: FrontendAuthEnvironmentInput
) {
  return {
    hasViteSupabaseUrl: Boolean(input.viteSupabaseUrl),
    hasViteSupabaseAnonKey: Boolean(input.viteSupabaseAnonKey),
    viteSupabaseHost: getHostFromUrl(input.viteSupabaseUrl),
  };
}
