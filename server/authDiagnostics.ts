import { buildAuthDiagnostics } from "../shared/authDiagnostics";
import { ENV } from "./_core/env";

export function getAuthDiagnostics() {
  return buildAuthDiagnostics({
    databaseUrl: ENV.databaseUrl,
    supabaseUrl: ENV.supabaseUrl,
    supabaseAnonKey: ENV.supabaseAnonKey,
    nodeEnv: process.env.NODE_ENV,
  });
}
