import { ForbiddenError } from "@shared/_core/errors";
import {
  createClient,
  type SupabaseClient,
  type User as SupabaseUser,
} from "@supabase/supabase-js";
import type { Request } from "express";
import type { InsertUser, User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const AUTH_TIMEOUT_MS = 10_000;
const pendingUserSyncs = new Map<string, Promise<void>>();

type UserSyncDeps = {
  getUserByOpenId: (openId: string) => Promise<User | undefined>;
  upsertUser: (user: InsertUser) => Promise<void>;
};

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

export function buildSupabaseUserProfile(
  supabaseUser: Pick<SupabaseUser, "id" | "email" | "user_metadata">,
  signedInAt = new Date()
): InsertUser {
  const email = supabaseUser.email ?? null;
  const name =
    (supabaseUser.user_metadata?.name as string | undefined) ??
    (supabaseUser.user_metadata?.full_name as string | undefined) ??
    email ??
    "Usuário";

  return {
    openId: supabaseUser.id,
    name,
    email,
    loginMethod: "supabase",
    lastSignedIn: signedInAt,
  };
}

export function shouldSyncUser(existingUser: User | undefined) {
  return !existingUser;
}

async function syncUserOnce(profile: InsertUser, deps: UserSyncDeps) {
  if (!profile.openId) throw new Error("Cannot sync user without openId");

  const existingSync = pendingUserSyncs.get(profile.openId);
  if (existingSync) {
    await existingSync;
    return;
  }

  const syncPromise = withTimeout(deps.upsertUser(profile), "User upsert")
    .finally(() => {
      pendingUserSyncs.delete(profile.openId!);
    });
  pendingUserSyncs.set(profile.openId, syncPromise);
  await syncPromise;
}

export async function resolveAuthenticatedUserFromProfile(
  profile: InsertUser,
  deps: UserSyncDeps = db
) {
  if (!profile.openId) throw new Error("Cannot authenticate user without openId");

  const existingUser = await withTimeout(
    deps.getUserByOpenId(profile.openId),
    "User lookup",
  );
  if (!shouldSyncUser(existingUser)) return existingUser;

  await syncUserOnce(profile, deps);

  const user = await withTimeout(
    deps.getUserByOpenId(profile.openId),
    "User lookup after sync",
  );
  if (!user) {
    throw ForbiddenError("User not found after sync");
  }

  return user;
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
    const profile = buildSupabaseUserProfile(supabaseUser);
    return resolveAuthenticatedUserFromProfile(profile);
  }
}

export const sdk = new SDKServer();
