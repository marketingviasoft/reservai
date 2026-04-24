import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";

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
      description: z.string().optional(),
      categoryId: z.number().optional(),
      serialNumber: z.string().optional(),
      status: z.enum(["disponivel", "emprestado", "manutencao", "extraviado"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db.createItem(input)),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      categoryId: z.number().nullable().optional(),
      serialNumber: z.string().optional(),
      status: z.enum(["disponivel", "emprestado", "manutencao", "extraviado"]).optional(),
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

// ─── Client Router ───────────────────────────────────────────────────────────
const clientRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(({ input }) => db.listClients(input?.search)),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getClientById(input.id)),
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      document: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db.createClient(input)),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      document: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateClient(id, data);
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteClient(input.id)),
  reservations: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(({ input }) => db.listReservations({ clientId: input.clientId })),
});

// ─── Reservation Router ──────────────────────────────────────────────────────
const reservationRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      clientId: z.number().optional(),
      search: z.string().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
    }).optional())
    .query(({ input }) => db.listReservations(input)),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getReservationById(input.id)),
  create: protectedProcedure
    .input(z.object({
      clientId: z.number().optional(),
      startDate: z.number(),
      endDate: z.number(),
      notes: z.string().optional(),
      itemIds: z.array(z.number()).default([]),
      kitIds: z.array(z.number()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check conflicts for items
      if (input.itemIds.length > 0) {
        const itemConflicts = await db.checkItemConflicts(input.itemIds, input.startDate, input.endDate);
        if (itemConflicts.length > 0) {
          const conflictNames = itemConflicts.map((c) => c.itemName).join(", ");
          throw new Error(`Conflito de reserva para os itens: ${conflictNames}`);
        }
      }
      // Check conflicts for kits
      if (input.kitIds.length > 0) {
        const kitConflicts = await db.checkKitConflicts(input.kitIds, input.startDate, input.endDate);
        if (kitConflicts.length > 0) {
          throw new Error(`Conflito de reserva para kits ou itens vinculados a kits`);
        }
        // Also check individual items in kits
        const kitItemIds = await db.getKitItemIds(input.kitIds);
        if (kitItemIds.length > 0) {
          const itemConflicts = await db.checkItemConflicts(kitItemIds, input.startDate, input.endDate);
          if (itemConflicts.length > 0) {
            const conflictNames = itemConflicts.map((c) => c.itemName).join(", ");
            throw new Error(`Conflito: itens do kit já reservados: ${conflictNames}`);
          }
        }
      }
      return db.createReservation(
        { userId: ctx.user.id, clientId: input.clientId ?? null, startDate: input.startDate, endDate: input.endDate, notes: input.notes, status: "pendente" },
        input.itemIds,
        input.kitIds
      );
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      clientId: z.number().nullable().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
      status: z.enum(["pendente", "ativa", "concluida", "cancelada"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateReservation(id, data);
    }),
  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // Get reservation items to release them
      const reservation = await db.getReservationById(input.id);
      if (!reservation) throw new Error("Reserva não encontrada");
      await db.updateReservation(input.id, { status: "cancelada" });
      // If items were checked out, set them back to available
      if (reservation.status === "ativa") {
        for (const ri of reservation.reservationItems) {
          if (ri.itemId) await db.updateItem(ri.itemId, { status: "disponivel" });
        }
      }
    }),
  checkout: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const reservation = await db.getReservationById(input.id);
      if (!reservation) throw new Error("Reserva não encontrada");
      if (reservation.status !== "pendente") throw new Error("Apenas reservas pendentes podem ter check-out");
      // Update reservation status
      await db.updateReservation(input.id, {
        status: "ativa",
        checkoutAt: Date.now(),
        checkoutByUserId: ctx.user.id,
      });
      // Update item statuses to "emprestado"
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
    }),
  checkin: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const reservation = await db.getReservationById(input.id);
      if (!reservation) throw new Error("Reserva não encontrada");
      if (reservation.status !== "ativa") throw new Error("Apenas reservas ativas podem ter check-in");
      // Update reservation status
      await db.updateReservation(input.id, {
        status: "concluida",
        checkinAt: Date.now(),
        checkinByUserId: ctx.user.id,
      });
      // Update item statuses back to "disponivel"
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
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteReservation(input.id)),
});

// ─── Dashboard Router ────────────────────────────────────────────────────────
const dashboardRouter = router({
  stats: protectedProcedure.query(() => db.getDashboardStats()),
  recentReservations: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(({ input }) => db.getRecentReservations(input?.limit ?? 10)),
  overdueReservations: protectedProcedure.query(() => db.getOverdueReservations()),
});

// ─── App Router ──────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  category: categoryRouter,
  item: itemRouter,
  kit: kitRouter,
  customer: clientRouter,
  reservation: reservationRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
