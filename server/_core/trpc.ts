import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import { USER_NOT_PROVISIONED } from "@shared/authErrors";
import superjson from "superjson";
import { logPerformance } from "../performance";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

const logProcedurePerformance = t.middleware(async (opts) => {
  const start = Date.now();
  const result = await opts.next();
  logPerformance({
    prefix: "TRPC",
    name: opts.path,
    status: result.ok ? "ok" : "error",
    elapsedMs: Date.now() - start,
    error: result.ok ? undefined : result.error,
  });
  return result;
});

export const publicProcedure = t.procedure.use(logProcedurePerformance);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    if (ctx.auth.error?.code === USER_NOT_PROVISIONED) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: USER_NOT_PROVISIONED,
      });
    }
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireUser);

export const adminProcedure = publicProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
