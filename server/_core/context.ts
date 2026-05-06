import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { isAuthFailure, sdk, type AuthFailureCode } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  auth: {
    hasAuthorizationHeader: boolean;
    error: { code: AuthFailureCode | "AUTH_ERROR"; message: string } | null;
  };
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  const hasAuthorizationHeader = Boolean(opts.req.headers.authorization);
  let authError: TrpcContext["auth"]["error"] = null;

  if (process.env.NODE_ENV !== "production" && !ENV.supabaseUrl) {
    return {
      req: opts.req,
      res: opts.res,
      auth: {
        hasAuthorizationHeader,
        error: null,
      },
      user: {
        id: 1,
        openId: "local-dev-user",
        name: "Dev Admin",
        email: "dev.local@reservai",
        loginMethod: "local-dev",
        role: "admin",
        phone: null,
        extension: null,
        department: "Desenvolvimento",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    };
  }

  if (hasAuthorizationHeader) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures, but keep a safe reason
      // so auth routes can distinguish anonymous access from auth failures.
      authError = {
        code: isAuthFailure(error) ? error.authCode : "AUTH_ERROR",
        message:
          error instanceof Error ? error.message : "Authentication failed",
      };
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    auth: {
      hasAuthorizationHeader,
      error: authError,
    },
  };
}
