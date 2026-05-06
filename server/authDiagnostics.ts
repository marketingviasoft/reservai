import { buildAuthDiagnostics } from "../shared/authDiagnostics";
import { ENV } from "./_core/env";
import { pingDb } from "./db";

export async function getAuthDiagnostics() {
  return buildAuthDiagnostics({
    databaseUrl: ENV.databaseUrl,
    supabaseUrl: ENV.supabaseUrl,
    supabaseAnonKey: ENV.supabaseAnonKey,
    nodeEnv: process.env.NODE_ENV,
    dbPing: await pingDb(),
  });
}
