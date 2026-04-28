import { ForbiddenError } from "@shared/_core/errors";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const AUTH_TIMEOUT_MS = 10_000;

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`${label} timed out after ${AUTH_TIMEOUT_MS}ms`)),
      AUTH_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

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
    const { data, error } = await withTimeout(
      supabase.auth.getUser(accessToken),
      "Supabase auth.getUser",
    );

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

    await withTimeout(
      db.upsertUser({
        openId: supabaseUser.id,
        name,
        email,
        loginMethod: "supabase",
        lastSignedIn: signedInAt,
      }),
      "User upsert",
    );

    const user = await withTimeout(
      db.getUserByOpenId(supabaseUser.id),
      "User lookup",
    );
    if (!user) {
      throw ForbiddenError("User not found");
    }

    return user;
  }
}

export const sdk = new SDKServer();
