import { COOKIE_NAME } from "@shared/const";
import {
  AUTH_INVALID_TOKEN,
  AUTH_MISSING_TOKEN,
  USER_NOT_PROVISIONED,
} from "@shared/authErrors";
import { getSessionCookieOptions } from "./_core/cookies";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { getAuthDiagnostics } from "./authDiagnostics";
import { isAuthFailure, sdk } from "./_core/sdk";
import {
  assertAdminReservationOperator,
  assertCanCancelReservation,
  assertCanUpdateReservation,
  assertReservationOwnerOrAdmin,
} from "./reservationAccess";
import { buildReservationItemSelection } from "./reservationSelection";

async function getReservationMovementItemIds(reservation: {
  reservationItems: Array<{ itemId: number | null; kitId: number | null }>;
}) {
  const itemIds = db.collectReservationPhysicalItemIds(reservation.reservationItems);
  const legacyKitIds = Array.from(
    new Set(
      reservation.reservationItems
        .map((reservationItem) => reservationItem.kitId)
        .filter((kitId): kitId is number => kitId !== null)
    )
  );
  const legacyKitItemIds =
    legacyKitIds.length > 0 ? await db.getKitItemIds(legacyKitIds) : [];
  return Array.from(new Set([...itemIds, ...legacyKitItemIds]));
}

async function runAuthOperation<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (isAuthFailure(error)) {
      throw new TRPCError({
        code: error.authCode === "UNAUTHORIZED" ? "UNAUTHORIZED" : "FORBIDDEN",
        message: error.message,
      });
    }
    throw error;
  }
}

// ─── Category Router ─────────────────────────────────────────────────────────
const categoryRouter = router({
  list: protectedProcedure.query(() => db.listCategories()),
  create: adminProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional(), color: z.string().optional() }))
    .mutation(({ input }) => db.createCategory(input)),
  update: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).optional(), description: z.string().optional(), color: z.string().optional() }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateCategory(id, data);
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteCategory(input.id)),
});

// ─── Item Router ─────────────────────────────────────────────────────────────
const itemRouter = router({
  list: protectedProcedure
    .input(z.object({ categoryId: z.number().optional(), status: z.string().optional(), search: z.string().optional() }).optional())
    .query(({ input }) => db.listItems(input)),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getItemById(input.id)),
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      brand: z.string().min(1),
      model: z.string().min(1),
      description: z.string().optional(),
      categoryId: z.number().optional(),
      serialNumber: z.string().optional(),
      assetNumber: z.string().optional(),
      status: z.enum(["disponivel", "emprestado", "manutencao", "extraviado"]).optional(),
      condition: z.enum(["novo", "bom", "regular", "danificado"]).default("bom"),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db.createItem(input)),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      brand: z.string().min(1).optional(),
      model: z.string().min(1).optional(),
      description: z.string().optional(),
      categoryId: z.number().nullable().optional(),
      serialNumber: z.string().optional(),
      assetNumber: z.string().optional(),
      status: z.enum(["disponivel", "emprestado", "manutencao", "extraviado"]).optional(),
      condition: z.enum(["novo", "bom", "regular", "danificado"]).optional(),
      notes: z.string().optional(),
      photoUrl: z.string().nullable().optional(),
      photoKey: z.string().nullable().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateItem(id, data);
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteItem(input.id)),
  uploadPhoto: adminProcedure
    .input(z.object({ itemId: z.number(), base64: z.string(), filename: z.string(), contentType: z.string() }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const key = `items/${input.itemId}/${input.filename}`;
      const { url, key: storedKey } = await storagePut(key, buffer, input.contentType);
      await db.updateItem(input.itemId, { photoUrl: url, photoKey: storedKey });
      return { url, key: storedKey };
    }),
});

// ─── Kit Router ──────────────────────────────────────────────────────────────
const kitRouter = router({
  list: protectedProcedure.query(() => db.listKits()),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getKitById(input.id)),
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      itemIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { itemIds, ...kitData } = input;
      const result = await db.createKit(kitData);
      if (itemIds && itemIds.length > 0) {
        await db.setKitItems(result.id, itemIds);
        await db.recalculateKitStatus(result.id);
      }
      return result;
    }),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      itemIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, itemIds, ...kitData } = input;
      await db.updateKit(id, kitData);
      if (itemIds !== undefined) {
        await db.setKitItems(id, itemIds);
        await db.recalculateKitStatus(id);
      }
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteKit(input.id)),
});

// ─── Profile Router (Colaboradores) ─────────────────────────────────────────
const profileRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(({ input }) => db.listUsers(input?.search)),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getUserById(input.id)),
  // Colaborador atualiza seu próprio perfil
  updateMyProfile: protectedProcedure
    .input(z.object({
      phone: z.string().nullable().optional(),
      extension: z.string().nullable().optional(),
      department: z.string().nullable().optional(),
    }))
    .mutation(({ ctx, input }) => db.updateUserProfile(ctx.user.id, input)),
  // Admin atualiza perfil de qualquer colaborador
  updateProfile: adminProcedure
    .input(z.object({
      id: z.number(),
      phone: z.string().nullable().optional(),
      extension: z.string().nullable().optional(),
      department: z.string().nullable().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateUserProfile(id, data);
    }),
  // Admin altera role
  updateRole: adminProcedure
    .input(z.object({ id: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(({ input }) => db.updateUserRole(input.id, input.role)),
  // Histórico de reservas de um colaborador
  reservations: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ ctx, input }) => {
      if (ctx.user.role !== "admin" && input.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Voce so pode consultar seu proprio historico de reservas.",
        });
      }
      return db.getUserReservationHistory(input.userId);
    }),
});

// ─── Reservation Router ──────────────────────────────────────────────────────
const reservationRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      userId: z.number().optional(),
      search: z.string().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
    }).optional())
    .query(({ ctx, input }) =>
      db.listReservations(
        ctx.user.role === "admin"
          ? input
          : { ...input, userId: ctx.user.id }
      )
    ),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const reservation = await db.getReservationById(input.id);
      if (!reservation) throw new Error("Reserva não encontrada");
      assertReservationOwnerOrAdmin(ctx.user, reservation);
      return reservation;
    }),
  events: protectedProcedure
    .input(z.object({ reservationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const reservation = await db.getReservationById(input.reservationId);
      if (!reservation) throw new Error("Reserva não encontrada");
      assertReservationOwnerOrAdmin(ctx.user, reservation);
      return db.listReservationEvents(input.reservationId);
    }),
  create: protectedProcedure
    .input(z.object({
      startDate: z.number(),
      endDate: z.number(),
      notes: z.string().optional(),
      itemIds: z.array(z.number()).default([]),
      kitIds: z.array(z.number()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Full availability check with shared-combo resolution.
      const availability = await db.checkAvailability(input.startDate, input.endDate);
      const comboItemIds = input.kitIds.length > 0 ? await db.getKitItemIds(input.kitIds) : [];
      const selection = buildReservationItemSelection({
        directItemIds: input.itemIds,
        comboItemIds,
        unavailableItemIds: availability.unavailableItemIds,
      });

      if (selection.itemIds.length === 0) {
        throw new Error("Selecione pelo menos um item disponível para reservar");
      }

      // Directly selected items must be fully available. Combo items are shortcuts:
      // unavailable combo items are skipped, and available physical items are persisted.
      if (selection.conflictingDirectItemIds.length > 0) {
          const names = availability.conflicts
          .filter((c) => selection.conflictingDirectItemIds.includes(c.itemId))
            .map((c) => c.itemName || c.itemCode || `Item #${c.itemId}`)
            .filter((v, i, a) => a.indexOf(v) === i);
          throw new Error(`Conflito de reserva para os itens: ${names.join(", ")}`);
      }

      // Reserva é atrelada ao colaborador logado (ctx.user.id)
      const created = await db.createReservation(
        { userId: ctx.user.id, startDate: input.startDate, endDate: input.endDate, notes: input.notes, status: "pendente" },
        selection.itemIds
      );
      await db.createReservationEvent({
        reservationId: created.id,
        eventType: "reservation_created",
        actorUserId: ctx.user.id,
        fromStatus: null,
        toStatus: "pendente",
        metadata: {
          itemIds: selection.itemIds,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });
      return created;
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
      status: z.enum(["pendente", "ativa", "concluida", "cancelada"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const reservation = await db.getReservationById(input.id);
      if (!reservation) throw new Error("Reserva não encontrada");
      assertCanUpdateReservation(ctx.user, reservation);
      if (input.status !== undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Status de reserva deve ser alterado pelos fluxos de cancelamento, check-out ou check-in.",
        });
      }
      const { id, status: _status, ...data } = input;
      const metadata = db.buildReservationUpdateMetadata(reservation, data);
      await db.updateReservation(id, data);
      await db.createReservationEvent({
        reservationId: id,
        eventType: "reservation_updated",
        actorUserId: ctx.user.id,
        fromStatus: reservation.status,
        toStatus: reservation.status,
        metadata,
      });
    }),
  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const reservation = await db.getReservationById(input.id);
      if (!reservation) throw new Error("Reserva não encontrada");
      assertCanCancelReservation(ctx.user, reservation);
      await db.updateReservation(input.id, { status: "cancelada" });
      await db.createReservationEvent({
        reservationId: input.id,
        eventType: "reservation_cancelled",
        actorUserId: ctx.user.id,
        fromStatus: reservation.status,
        toStatus: "cancelada",
        metadata: {
          itemIds: await getReservationMovementItemIds(reservation),
        },
      });
      if (reservation.status === "ativa") {
        for (const ri of reservation.reservationItems) {
          if (ri.itemId) await db.updateItem(ri.itemId, { status: "disponivel" });
          if (ri.kitId) {
            const kitItemIds = await db.getKitItemIds([ri.kitId]);
            for (const itemId of kitItemIds) {
              await db.updateItem(itemId, { status: "disponivel" });
            }
            await db.recalculateKitStatus(ri.kitId);
          }
        }
      }
    }),
  checkout: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertAdminReservationOperator(ctx.user);
      const reservation = await db.getReservationById(input.id);
      if (!reservation) throw new Error("Reserva não encontrada");
      if (reservation.status !== "pendente") throw new Error("Apenas reservas pendentes podem ter check-out");
      const itemIds = await getReservationMovementItemIds(reservation);
      await db.updateReservation(input.id, {
        status: "ativa",
        checkoutAt: Date.now(),
        checkoutByUserId: ctx.user.id,
      });
      for (const ri of reservation.reservationItems) {
        if (ri.itemId) {
          await db.updateItem(ri.itemId, { status: "emprestado" });
        }
        if (ri.kitId) {
          const kitItemIds = await db.getKitItemIds([ri.kitId]);
          for (const itemId of kitItemIds) {
            await db.updateItem(itemId, { status: "emprestado" });
          }
        }
      }
      await db.createReservationEvent({
        reservationId: input.id,
        eventType: "reservation_checked_out",
        actorUserId: ctx.user.id,
        fromStatus: reservation.status,
        toStatus: "ativa",
        metadata: { itemIds },
      });
    }),
  checkin: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertAdminReservationOperator(ctx.user);
      const reservation = await db.getReservationById(input.id);
      if (!reservation) throw new Error("Reserva não encontrada");
      if (reservation.status !== "ativa") throw new Error("Apenas reservas ativas podem ter check-in");
      const itemIds = await getReservationMovementItemIds(reservation);
      await db.updateReservation(input.id, {
        status: "concluida",
        checkinAt: Date.now(),
        checkinByUserId: ctx.user.id,
      });
      for (const ri of reservation.reservationItems) {
        if (ri.itemId) {
          await db.updateItem(ri.itemId, { status: "disponivel" });
        }
        if (ri.kitId) {
          const kitItemIds = await db.getKitItemIds([ri.kitId]);
          for (const itemId of kitItemIds) {
            await db.updateItem(itemId, { status: "disponivel" });
          }
          await db.recalculateKitStatus(ri.kitId);
        }
      }
      await db.createReservationEvent({
        reservationId: input.id,
        eventType: "reservation_checked_in",
        actorUserId: ctx.user.id,
        fromStatus: reservation.status,
        toStatus: "concluida",
        metadata: { itemIds },
      });
    }),
  checkConflicts: protectedProcedure
    .input(z.object({
      itemIds: z.array(z.number()).default([]),
      kitIds: z.array(z.number()).default([]),
      startDate: z.number(),
      endDate: z.number(),
      excludeReservationId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const itemConflicts = input.itemIds.length > 0
        ? await db.checkItemConflicts(input.itemIds, input.startDate, input.endDate, input.excludeReservationId)
        : [];
      const kitConflicts = input.kitIds.length > 0
        ? await db.checkKitConflicts(input.kitIds, input.startDate, input.endDate, input.excludeReservationId)
        : [];
      return { itemConflicts, kitConflicts, hasConflicts: itemConflicts.length > 0 || kitConflicts.length > 0 };
    }),
  // Period-aware availability: returns unavailable items & kits (including shared-kit resolution)
  checkAvailability: protectedProcedure
    .input(z.object({
      startDate: z.number(),
      endDate: z.number(),
      excludeReservationId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return db.checkAvailability(input.startDate, input.endDate, input.excludeReservationId);
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteReservation(input.id)),
});

// ─── Dashboard Router ────────────────────────────────────────────────────────
const dashboardRouter = router({
  stats: protectedProcedure.query(({ ctx }) =>
    db.getDashboardStats(ctx.user.role === "admin" ? undefined : ctx.user.id)
  ),
  recentReservations: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(({ ctx, input }) =>
      db.getRecentReservations(
        input?.limit ?? 10,
        ctx.user.role === "admin" ? undefined : ctx.user.id
      )
    ),
  overdueReservations: protectedProcedure.query(({ ctx }) =>
    db.getOverdueReservations(ctx.user.role === "admin" ? undefined : ctx.user.id)
  ),
});

// ─── App Router ──────────────────────────────────────────────────────────────
export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (ctx.user) return ctx.user;
      if (!ctx.auth.hasAuthorizationHeader) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: AUTH_MISSING_TOKEN,
        });
      }
      if (ctx.auth.error?.code === USER_NOT_PROVISIONED) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: USER_NOT_PROVISIONED,
        });
      }
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: ctx.auth.error?.message || AUTH_INVALID_TOKEN,
      });
    }),
    bootstrap: publicProcedure.mutation(({ ctx }) =>
      runAuthOperation(() => sdk.bootstrapRequest(ctx.req))
    ),
    diagnostics: publicProcedure.query(() => getAuthDiagnostics()),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  category: categoryRouter,
  item: itemRouter,
  kit: kitRouter,
  profile: profileRouter,
  reservation: reservationRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
