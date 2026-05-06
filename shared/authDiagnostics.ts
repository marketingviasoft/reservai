export type AuthEnvironmentInput = {
  databaseUrl?: string | null;
  supabaseUrl?: string | null;
  supabaseAnonKey?: string | null;
  nodeEnv?: string | null;
  dbPing?: {
    ok: boolean;
    elapsedMs: number;
    errorCode?: string;
  } | null;
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

export function databaseLooksLikeSupabasePooler(databaseUrl?: string | null) {
  const host = getHostFromUrl(databaseUrl);
  if (!host) return false;
  return host.includes("pooler.supabase.com");
}

export function buildAuthDiagnostics(input: AuthEnvironmentInput) {
  return {
    hasDatabaseUrl: Boolean(input.databaseUrl),
    databaseHost: getHostFromUrl(input.databaseUrl),
    databaseLooksLikeSupabasePooler: databaseLooksLikeSupabasePooler(
      input.databaseUrl
    ),
    hasSupabaseUrl: Boolean(input.supabaseUrl),
    hasSupabaseAnonKey: Boolean(input.supabaseAnonKey),
    supabaseHost: getHostFromUrl(input.supabaseUrl),
    nodeEnv: input.nodeEnv ?? "",
    dbPing: input.dbPing ?? null,
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
