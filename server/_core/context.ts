import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (process.env.NODE_ENV !== "production" && !ENV.supabaseUrl) {
    return {
      req: opts.req,
      res: opts.res,
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

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
