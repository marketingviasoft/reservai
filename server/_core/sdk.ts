import { ForbiddenError } from "@shared/_core/errors";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const value = Array.isArray(header) ? header[0] : header;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function getSupabaseClient(): SupabaseClient {
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    throw new Error(
      "Supabase auth is not configured: set SUPABASE_URL and SUPABASE_ANON_KEY",
    );
  }

  return createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

class SDKServer {
  async authenticateRequest(req: Request): Promise<User> {
    const accessToken = getBearerToken(req);
    if (!accessToken) {
      throw ForbiddenError("Missing Supabase access token");
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      throw ForbiddenError("Invalid Supabase access token");
    }

    const supabaseUser = data.user;
    const email = supabaseUser.email ?? null;
    const name =
      (supabaseUser.user_metadata?.name as string | undefined) ??
      (supabaseUser.user_metadata?.full_name as string | undefined) ??
      email ??
      "Usuário";
    const signedInAt = new Date();

    await db.upsertUser({
      openId: supabaseUser.id,
      name,
      email,
      loginMethod: "supabase",
      lastSignedIn: signedInAt,
    });

    const user = await db.getUserByOpenId(supabaseUser.id);
    if (!user) {
      throw ForbiddenError("User not found");
    }

    return user;
  }
}

export const sdk = new SDKServer();
