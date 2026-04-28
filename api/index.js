// server/_core/loadEnv.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

// server/_core/app.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/routers.ts
import { z } from "zod";

// server/db.ts
import { and, eq, gte, lte, or, ne, like, inArray, sql, desc, asc, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// drizzle/schema.ts
import { relations } from "drizzle-orm";
import {
  bigint,
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  text,
  varchar,
  uniqueIndex
} from "drizzle-orm/pg-core";
var userRoleEnum = pgEnum("user_role", ["user", "admin"]);
var itemStatusEnum = pgEnum("item_status", [
  "disponivel",
  "emprestado",
  "manutencao",
  "extraviado"
]);
var kitStatusEnum = pgEnum("kit_status", ["completo", "incompleto"]);
var reservationStatusEnum = pgEnum("reservation_status", [
  "pendente",
  "ativa",
  "concluida",
  "cancelada"
]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  // Campos complementares do membro da equipe
  phone: varchar("phone", { length: 32 }),
  extension: varchar("extension", { length: 16 }),
  // ramal
  department: varchar("department", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 16 }).notNull().unique(),
    // EQP-XXXXX
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    categoryId: integer("categoryId").references(() => categories.id),
    serialNumber: varchar("serialNumber", { length: 128 }),
    photoUrl: text("photoUrl"),
    photoKey: varchar("photoKey", { length: 512 }),
    status: itemStatusEnum("status").default("disponivel").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [uniqueIndex("serial_number_idx").on(table.serialNumber)]
);
var kits = pgTable("kits", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  status: kitStatusEnum("status").default("completo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var kitItems = pgTable("kit_items", {
  id: serial("id").primaryKey(),
  kitId: integer("kitId").notNull().references(() => kits.id, { onDelete: "cascade" }),
  itemId: integer("itemId").notNull().references(() => items.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  startDate: bigint("startDate", { mode: "number" }).notNull(),
  // UTC ms
  endDate: bigint("endDate", { mode: "number" }).notNull(),
  // UTC ms
  status: reservationStatusEnum("status").default("pendente").notNull(),
  checkoutAt: bigint("checkoutAt", { mode: "number" }),
  // UTC ms when checked out
  checkoutByUserId: integer("checkoutByUserId").references(() => users.id),
  checkinAt: bigint("checkinAt", { mode: "number" }),
  // UTC ms when checked in
  checkinByUserId: integer("checkinByUserId").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var reservationItems = pgTable("reservation_items", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservationId").notNull().references(() => reservations.id, { onDelete: "cascade" }),
  itemId: integer("itemId").references(() => items.id),
  kitId: integer("kitId").references(() => kits.id),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var itemsRelations = relations(items, ({ one }) => ({
  category: one(categories, {
    fields: [items.categoryId],
    references: [categories.id]
  })
}));
var kitItemsRelations = relations(kitItems, ({ one }) => ({
  kit: one(kits, { fields: [kitItems.kitId], references: [kits.id] }),
  item: one(items, { fields: [kitItems.itemId], references: [items.id] })
}));
var kitsRelations = relations(kits, ({ many }) => ({
  kitItems: many(kitItems)
}));
var reservationsRelations = relations(reservations, ({ one, many }) => ({
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
    relationName: "reservationUser"
  }),
  checkoutByUser: one(users, {
    fields: [reservations.checkoutByUserId],
    references: [users.id],
    relationName: "checkoutUser"
  }),
  checkinByUser: one(users, {
    fields: [reservations.checkinByUserId],
    references: [users.id],
    relationName: "checkinUser"
  }),
  reservationItems: many(reservationItems)
}));
var reservationItemsRelations = relations(
  reservationItems,
  ({ one }) => ({
    reservation: one(reservations, {
      fields: [reservationItems.reservationId],
      references: [reservations.id]
    }),
    item: one(items, {
      fields: [reservationItems.itemId],
      references: [items.id]
    }),
    kit: one(kits, {
      fields: [reservationItems.kitId],
      references: [kits.id]
    })
  })
);
var usersRelations = relations(users, ({ many }) => ({
  reservations: many(reservations, { relationName: "reservationUser" })
}));

// server/_core/env.ts
var ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  adminEmails: (process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean),
  isProduction: process.env.NODE_ENV === "production",
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "reservai-assets"
};

// server/db.ts
import { nanoid } from "nanoid";
function generateItemCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const id = nanoid(5);
  const code = id.split("").map((c) => chars[Math.abs(c.charCodeAt(0)) % chars.length]).join("");
  return `EQP-${code}`;
}
var _db = null;
var _client = null;
var touchUpdatedAt = (data) => ({
  ...data,
  updatedAt: /* @__PURE__ */ new Date()
});
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL, {
        max: 1,
        prepare: false,
        connect_timeout: 10,
        idle_timeout: 20
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = { openId: user.openId };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.email && ENV.adminEmails.includes(user.email.toLowerCase()) || await countUsers() === 0) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    updateSet.updatedAt = /* @__PURE__ */ new Date();
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function countUsers() {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db.select({ total: count() }).from(users);
  return Number(row?.total ?? 0);
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function listUsers(search) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(users).where(
      or(
        like(users.name, `%${search}%`),
        like(users.email, `%${search}%`),
        like(users.department, `%${search}%`),
        like(users.phone, `%${search}%`)
      )
    ).orderBy(asc(users.name));
  }
  return db.select().from(users).orderBy(asc(users.name));
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] || void 0;
}
async function updateUserProfile(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set(touchUpdatedAt(data)).where(eq(users.id, id));
}
async function updateUserRole(id, role) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set(touchUpdatedAt({ role })).where(eq(users.id, id));
}
async function listCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.name));
}
async function createCategory(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [created] = await db.insert(categories).values(data).returning({ id: categories.id });
  return { id: created.id };
}
async function updateCategory(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(categories).set(touchUpdatedAt(data)).where(eq(categories.id, id));
}
async function deleteCategory(id) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(categories).where(eq(categories.id, id));
}
async function listItems(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.categoryId) conditions.push(eq(items.categoryId, filters.categoryId));
  if (filters?.status) conditions.push(eq(items.status, filters.status));
  if (filters?.search) conditions.push(or(like(items.name, `%${filters.search}%`), like(items.code, `%${filters.search}%`)));
  const rows = await db.select({
    id: items.id,
    code: items.code,
    name: items.name,
    description: items.description,
    categoryId: items.categoryId,
    categoryName: categories.name,
    categoryColor: categories.color,
    photoUrl: items.photoUrl,
    photoKey: items.photoKey,
    status: items.status,
    notes: items.notes,
    createdAt: items.createdAt,
    updatedAt: items.updatedAt
  }).from(items).leftJoin(categories, eq(items.categoryId, categories.id)).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(desc(items.updatedAt));
  return rows;
}
async function getItemById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select({
    id: items.id,
    code: items.code,
    name: items.name,
    description: items.description,
    categoryId: items.categoryId,
    categoryName: categories.name,
    photoUrl: items.photoUrl,
    photoKey: items.photoKey,
    status: items.status,
    notes: items.notes,
    createdAt: items.createdAt,
    updatedAt: items.updatedAt
  }).from(items).leftJoin(categories, eq(items.categoryId, categories.id)).where(eq(items.id, id)).limit(1);
  return rows[0] || void 0;
}
async function createItem(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  let code = generateItemCode();
  for (let i = 0; i < 5; i++) {
    const existing = await db.select({ id: items.id }).from(items).where(eq(items.code, code)).limit(1);
    if (existing.length === 0) break;
    code = generateItemCode();
  }
  const [created] = await db.insert(items).values({ ...data, code }).returning({ id: items.id });
  return { id: created.id, code };
}
async function updateItem(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(items).set(touchUpdatedAt(data)).where(eq(items.id, id));
}
async function deleteItem(id) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(items).where(eq(items.id, id));
}
async function listKits() {
  const db = await getDb();
  if (!db) return [];
  const kitsData = await db.select().from(kits).orderBy(desc(kits.updatedAt));
  const kitItemsData = await db.select({
    kitId: kitItems.kitId,
    itemId: kitItems.itemId,
    itemName: items.name,
    itemCode: items.code,
    itemStatus: items.status,
    itemPhotoUrl: items.photoUrl
  }).from(kitItems).leftJoin(items, eq(kitItems.itemId, items.id));
  return kitsData.map((kit) => ({
    ...kit,
    items: kitItemsData.filter((ki) => ki.kitId === kit.id)
  }));
}
async function getKitById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const kitRows = await db.select().from(kits).where(eq(kits.id, id)).limit(1);
  if (!kitRows[0]) return void 0;
  const kitItemsData = await db.select({
    id: kitItems.id,
    itemId: kitItems.itemId,
    itemName: items.name,
    itemCode: items.code,
    itemStatus: items.status,
    itemPhotoUrl: items.photoUrl,
    itemCategoryId: items.categoryId
  }).from(kitItems).leftJoin(items, eq(kitItems.itemId, items.id)).where(eq(kitItems.kitId, id));
  return { ...kitRows[0], items: kitItemsData };
}
async function createKit(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [created] = await db.insert(kits).values(data).returning({ id: kits.id });
  return { id: created.id };
}
async function updateKit(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(kits).set(touchUpdatedAt(data)).where(eq(kits.id, id));
}
async function deleteKit(id) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(kits).where(eq(kits.id, id));
}
async function setKitItems(kitId, itemIds) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(kitItems).where(eq(kitItems.kitId, kitId));
  if (itemIds.length > 0) {
    await db.insert(kitItems).values(itemIds.map((itemId) => ({ kitId, itemId })));
  }
}
async function recalculateKitStatus(kitId) {
  const db = await getDb();
  if (!db) return;
  const kitItemsData = await db.select({ itemStatus: items.status }).from(kitItems).leftJoin(items, eq(kitItems.itemId, items.id)).where(eq(kitItems.kitId, kitId));
  const hasUnavailable = kitItemsData.some(
    (ki) => ki.itemStatus === "manutencao" || ki.itemStatus === "extraviado" || ki.itemStatus === "emprestado"
  );
  await db.update(kits).set(touchUpdatedAt({ status: hasUnavailable ? "incompleto" : "completo" })).where(eq(kits.id, kitId));
}
async function listReservations(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(reservations.status, filters.status));
  if (filters?.userId) conditions.push(eq(reservations.userId, filters.userId));
  if (filters?.startDate) conditions.push(gte(reservations.endDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(reservations.startDate, filters.endDate));
  const rows = await db.select({
    id: reservations.id,
    userId: reservations.userId,
    userName: users.name,
    userEmail: users.email,
    userDepartment: users.department,
    startDate: reservations.startDate,
    endDate: reservations.endDate,
    status: reservations.status,
    checkoutAt: reservations.checkoutAt,
    checkoutByUserId: reservations.checkoutByUserId,
    checkinAt: reservations.checkinAt,
    checkinByUserId: reservations.checkinByUserId,
    notes: reservations.notes,
    createdAt: reservations.createdAt,
    updatedAt: reservations.updatedAt
  }).from(reservations).leftJoin(users, eq(reservations.userId, users.id)).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(desc(reservations.startDate));
  const resIds = rows.map((r) => r.id);
  let resItemsData = [];
  if (resIds.length > 0) {
    resItemsData = await db.select({
      reservationId: reservationItems.reservationId,
      itemId: reservationItems.itemId,
      kitId: reservationItems.kitId,
      itemName: items.name,
      itemCode: items.code,
      kitName: kits.name
    }).from(reservationItems).leftJoin(items, eq(reservationItems.itemId, items.id)).leftJoin(kits, eq(reservationItems.kitId, kits.id)).where(inArray(reservationItems.reservationId, resIds));
  }
  return rows.map((r) => ({
    ...r,
    reservationItems: resItemsData.filter((ri) => ri.reservationId === r.id)
  }));
}
async function getReservationById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select({
    id: reservations.id,
    userId: reservations.userId,
    userName: users.name,
    userEmail: users.email,
    userDepartment: users.department,
    startDate: reservations.startDate,
    endDate: reservations.endDate,
    status: reservations.status,
    checkoutAt: reservations.checkoutAt,
    checkoutByUserId: reservations.checkoutByUserId,
    checkinAt: reservations.checkinAt,
    checkinByUserId: reservations.checkinByUserId,
    notes: reservations.notes,
    createdAt: reservations.createdAt,
    updatedAt: reservations.updatedAt
  }).from(reservations).leftJoin(users, eq(reservations.userId, users.id)).where(eq(reservations.id, id)).limit(1);
  if (!rows[0]) return void 0;
  const resItemsData = await db.select({
    id: reservationItems.id,
    reservationId: reservationItems.reservationId,
    itemId: reservationItems.itemId,
    kitId: reservationItems.kitId,
    itemName: items.name,
    itemCode: items.code,
    kitName: kits.name,
    itemStatus: items.status
  }).from(reservationItems).leftJoin(items, eq(reservationItems.itemId, items.id)).leftJoin(kits, eq(reservationItems.kitId, kits.id)).where(eq(reservationItems.reservationId, id));
  return { ...rows[0], reservationItems: resItemsData };
}
async function createReservation(data, itemIds) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [created] = await db.insert(reservations).values(data).returning({ id: reservations.id });
  const reservationId = created.id;
  const uniqueItemIds = Array.from(new Set(itemIds));
  const resItems = uniqueItemIds.map((itemId) => ({
    reservationId,
    itemId,
    kitId: null
  }));
  if (resItems.length > 0) {
    await db.insert(reservationItems).values(resItems);
  }
  return { id: reservationId };
}
async function updateReservation(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(reservations).set(touchUpdatedAt(data)).where(eq(reservations.id, id));
}
async function deleteReservation(id) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(reservations).where(eq(reservations.id, id));
}
async function checkItemConflicts(itemIds, startDate, endDate, excludeReservationId) {
  const db = await getDb();
  if (!db) return [];
  if (itemIds.length === 0) return [];
  const conditions = [
    inArray(reservationItems.itemId, itemIds),
    lte(reservations.startDate, endDate),
    gte(reservations.endDate, startDate),
    or(eq(reservations.status, "pendente"), eq(reservations.status, "ativa"))
  ];
  if (excludeReservationId) {
    conditions.push(ne(reservations.id, excludeReservationId));
  }
  return db.select({
    reservationId: reservations.id,
    itemId: reservationItems.itemId,
    itemName: items.name,
    startDate: reservations.startDate,
    endDate: reservations.endDate,
    status: reservations.status
  }).from(reservationItems).innerJoin(reservations, eq(reservationItems.reservationId, reservations.id)).leftJoin(items, eq(reservationItems.itemId, items.id)).where(and(...conditions));
}
async function checkKitConflicts(kitIds, startDate, endDate, excludeReservationId) {
  const db = await getDb();
  if (!db) return [];
  if (kitIds.length === 0) return [];
  const kitConditions = [
    inArray(reservationItems.kitId, kitIds),
    lte(reservations.startDate, endDate),
    gte(reservations.endDate, startDate),
    or(eq(reservations.status, "pendente"), eq(reservations.status, "ativa"))
  ];
  if (excludeReservationId) {
    kitConditions.push(ne(reservations.id, excludeReservationId));
  }
  const kitConflicts = await db.select({
    reservationId: reservations.id,
    kitId: reservationItems.kitId,
    kitName: kits.name,
    startDate: reservations.startDate,
    endDate: reservations.endDate,
    status: reservations.status
  }).from(reservationItems).innerJoin(reservations, eq(reservationItems.reservationId, reservations.id)).leftJoin(kits, eq(reservationItems.kitId, kits.id)).where(and(...kitConditions));
  const kitItemIds = await db.select({ itemId: kitItems.itemId }).from(kitItems).where(inArray(kitItems.kitId, kitIds));
  const itemIdsInKits = kitItemIds.map((ki) => ki.itemId);
  if (itemIdsInKits.length > 0) {
    const itemConflicts = await checkItemConflicts(itemIdsInKits, startDate, endDate, excludeReservationId);
    return [...kitConflicts, ...itemConflicts.map((c) => ({ ...c, kitId: null, kitName: null }))];
  }
  return kitConflicts;
}
async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalItems: 0, availableItems: 0, lentItems: 0, maintenanceItems: 0, totalKits: 0, totalUsers: 0, activeReservations: 0, pendingReservations: 0, overdueReservations: 0 };
  const now = Date.now();
  const [itemStats] = await db.select({
    total: count(),
    available: sql`SUM(CASE WHEN ${items.status} = 'disponivel' THEN 1 ELSE 0 END)`,
    lent: sql`SUM(CASE WHEN ${items.status} = 'emprestado' THEN 1 ELSE 0 END)`,
    maintenance: sql`SUM(CASE WHEN ${items.status} = 'manutencao' THEN 1 ELSE 0 END)`
  }).from(items);
  const [kitStats] = await db.select({ total: count() }).from(kits);
  const [userStats] = await db.select({ total: count() }).from(users);
  const [activeRes] = await db.select({ total: count() }).from(reservations).where(eq(reservations.status, "ativa"));
  const [pendingRes] = await db.select({ total: count() }).from(reservations).where(eq(reservations.status, "pendente"));
  const [overdueRes] = await db.select({ total: count() }).from(reservations).where(and(eq(reservations.status, "ativa"), lte(reservations.endDate, now)));
  return {
    totalItems: itemStats?.total ?? 0,
    availableItems: Number(itemStats?.available ?? 0),
    lentItems: Number(itemStats?.lent ?? 0),
    maintenanceItems: Number(itemStats?.maintenance ?? 0),
    totalKits: kitStats?.total ?? 0,
    totalUsers: userStats?.total ?? 0,
    activeReservations: activeRes?.total ?? 0,
    pendingReservations: pendingRes?.total ?? 0,
    overdueReservations: overdueRes?.total ?? 0
  };
}
async function getRecentReservations(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: reservations.id,
    userName: users.name,
    userDepartment: users.department,
    startDate: reservations.startDate,
    endDate: reservations.endDate,
    status: reservations.status,
    notes: reservations.notes
  }).from(reservations).leftJoin(users, eq(reservations.userId, users.id)).orderBy(desc(reservations.createdAt)).limit(limit);
}
async function getOverdueReservations() {
  const db = await getDb();
  if (!db) return [];
  const now = Date.now();
  return db.select({
    id: reservations.id,
    userName: users.name,
    userDepartment: users.department,
    startDate: reservations.startDate,
    endDate: reservations.endDate,
    status: reservations.status
  }).from(reservations).leftJoin(users, eq(reservations.userId, users.id)).where(and(eq(reservations.status, "ativa"), lte(reservations.endDate, now))).orderBy(asc(reservations.endDate));
}
async function getKitItemIds(kitIds) {
  const db = await getDb();
  if (!db) return [];
  if (kitIds.length === 0) return [];
  const rows = await db.select({ itemId: kitItems.itemId }).from(kitItems).where(inArray(kitItems.kitId, kitIds));
  return rows.map((r) => r.itemId);
}
async function checkAvailability(startDate, endDate, excludeReservationId) {
  const db = await getDb();
  if (!db) return { unavailableItemIds: [], unavailableKitIds: [], conflicts: [] };
  const overlapConditions = [
    lte(reservations.startDate, endDate),
    gte(reservations.endDate, startDate),
    or(eq(reservations.status, "pendente"), eq(reservations.status, "ativa"))
  ];
  if (excludeReservationId) {
    overlapConditions.push(ne(reservations.id, excludeReservationId));
  }
  const overlappingResItems = await db.select({
    reservationId: reservations.id,
    itemId: reservationItems.itemId,
    kitId: reservationItems.kitId,
    itemName: items.name,
    itemCode: items.code,
    kitName: kits.name
  }).from(reservationItems).innerJoin(reservations, eq(reservationItems.reservationId, reservations.id)).leftJoin(items, eq(reservationItems.itemId, items.id)).leftJoin(kits, eq(reservationItems.kitId, kits.id)).where(and(...overlapConditions));
  const directItemIds = /* @__PURE__ */ new Set();
  for (const ri of overlappingResItems) {
    if (ri.itemId) directItemIds.add(ri.itemId);
  }
  const reservedKitIds = overlappingResItems.filter((ri) => ri.kitId !== null).map((ri) => ri.kitId);
  let kitExpandedItemIds = /* @__PURE__ */ new Set();
  if (reservedKitIds.length > 0) {
    const kitItemRows = await db.select({ kitId: kitItems.kitId, itemId: kitItems.itemId }).from(kitItems).where(inArray(kitItems.kitId, reservedKitIds));
    for (const ki of kitItemRows) {
      kitExpandedItemIds.add(ki.itemId);
    }
  }
  const allUnavailableItemIds = new Set(Array.from(directItemIds).concat(Array.from(kitExpandedItemIds)));
  const unavailableKitIds = /* @__PURE__ */ new Set();
  if (allUnavailableItemIds.size > 0) {
    const affectedKitRows = await db.select({ kitId: kitItems.kitId }).from(kitItems).where(inArray(kitItems.itemId, Array.from(allUnavailableItemIds)));
    for (const row of affectedKitRows) {
      unavailableKitIds.add(row.kitId);
    }
  }
  for (const kid of reservedKitIds) {
    unavailableKitIds.add(kid);
  }
  const conflicts = overlappingResItems.map((ri) => ({
    itemId: ri.itemId ?? 0,
    itemName: ri.itemName,
    itemCode: ri.itemCode,
    reservationId: ri.reservationId,
    viaKitId: ri.kitId,
    viaKitName: ri.kitName
  }));
  return {
    unavailableItemIds: Array.from(allUnavailableItemIds),
    unavailableKitIds: Array.from(unavailableKitIds),
    conflicts
  };
}
async function getUserReservationHistory(userId) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: reservations.id,
    startDate: reservations.startDate,
    endDate: reservations.endDate,
    status: reservations.status,
    notes: reservations.notes,
    createdAt: reservations.createdAt
  }).from(reservations).where(eq(reservations.userId, userId)).orderBy(desc(reservations.createdAt));
  return rows;
}

// server/storage.ts
import { createClient } from "@supabase/supabase-js";
function getSupabaseStorageClient() {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error(
      "Storage config missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function ensureBucket(supabase) {
  const bucket = ENV.supabaseStorageBucket;
  const { data } = await supabase.storage.getBucket(bucket);
  if (data) return;
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: "10MB"
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Failed to create Supabase storage bucket: ${error.message}`);
  }
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const supabase = getSupabaseStorageClient();
  await ensureBucket(supabase);
  const key = appendHashSuffix(normalizeKey(relKey));
  const body = typeof data === "string" ? Buffer.from(data) : data;
  const { error } = await supabase.storage.from(ENV.supabaseStorageBucket).upload(key, body, {
    contentType,
    upsert: true
  });
  if (error) {
    throw new Error(`Supabase storage upload failed: ${error.message}`);
  }
  const { data: publicUrlData } = supabase.storage.from(ENV.supabaseStorageBucket).getPublicUrl(key);
  return { key, url: publicUrlData.publicUrl };
}

// server/reservationAccess.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
function assertReservationOwnerOrAdmin(actor, reservation) {
  if (actor.role === "admin") return;
  if (reservation.userId !== actor.id) {
    throw new TRPCError2({
      code: "FORBIDDEN",
      message: "Voce so pode alterar reservas vinculadas ao seu usuario."
    });
  }
}
function assertAdminReservationOperator(actor) {
  if (actor.role !== "admin") {
    throw new TRPCError2({
      code: "FORBIDDEN",
      message: "Apenas administradores podem operar check-in e check-out."
    });
  }
}

// server/reservationSelection.ts
function buildReservationItemSelection({
  directItemIds,
  comboItemIds,
  unavailableItemIds
}) {
  const unavailable = new Set(unavailableItemIds);
  const conflictingDirectItemIds = directItemIds.filter((id) => unavailable.has(id));
  const availableComboItemIds = comboItemIds.filter((id) => !unavailable.has(id));
  const skippedComboItemIds = comboItemIds.filter((id) => unavailable.has(id));
  const itemIds = Array.from(/* @__PURE__ */ new Set([...directItemIds, ...availableComboItemIds]));
  return {
    itemIds,
    conflictingDirectItemIds: Array.from(new Set(conflictingDirectItemIds)),
    skippedComboItemIds: Array.from(new Set(skippedComboItemIds))
  };
}

// server/routers.ts
var categoryRouter = router({
  list: protectedProcedure.query(() => listCategories()),
  create: adminProcedure.input(z.object({ name: z.string().min(1), description: z.string().optional(), color: z.string().optional() })).mutation(({ input }) => createCategory(input)),
  update: adminProcedure.input(z.object({ id: z.number(), name: z.string().min(1).optional(), description: z.string().optional(), color: z.string().optional() })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateCategory(id, data);
  }),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteCategory(input.id))
});
var itemRouter = router({
  list: protectedProcedure.input(z.object({ categoryId: z.number().optional(), status: z.string().optional(), search: z.string().optional() }).optional()).query(({ input }) => listItems(input)),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getItemById(input.id)),
  create: adminProcedure.input(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    categoryId: z.number().optional(),
    serialNumber: z.string().optional(),
    status: z.enum(["disponivel", "emprestado", "manutencao", "extraviado"]).optional(),
    notes: z.string().optional()
  })).mutation(({ input }) => createItem(input)),
  update: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    categoryId: z.number().nullable().optional(),
    serialNumber: z.string().optional(),
    status: z.enum(["disponivel", "emprestado", "manutencao", "extraviado"]).optional(),
    notes: z.string().optional(),
    photoUrl: z.string().nullable().optional(),
    photoKey: z.string().nullable().optional()
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateItem(id, data);
  }),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteItem(input.id)),
  uploadPhoto: adminProcedure.input(z.object({ itemId: z.number(), base64: z.string(), filename: z.string(), contentType: z.string() })).mutation(async ({ input }) => {
    const buffer = Buffer.from(input.base64, "base64");
    const key = `items/${input.itemId}/${input.filename}`;
    const { url, key: storedKey } = await storagePut(key, buffer, input.contentType);
    await updateItem(input.itemId, { photoUrl: url, photoKey: storedKey });
    return { url, key: storedKey };
  })
});
var kitRouter = router({
  list: protectedProcedure.query(() => listKits()),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getKitById(input.id)),
  create: adminProcedure.input(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    itemIds: z.array(z.number()).optional()
  })).mutation(async ({ input }) => {
    const { itemIds, ...kitData } = input;
    const result = await createKit(kitData);
    if (itemIds && itemIds.length > 0) {
      await setKitItems(result.id, itemIds);
      await recalculateKitStatus(result.id);
    }
    return result;
  }),
  update: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    itemIds: z.array(z.number()).optional()
  })).mutation(async ({ input }) => {
    const { id, itemIds, ...kitData } = input;
    await updateKit(id, kitData);
    if (itemIds !== void 0) {
      await setKitItems(id, itemIds);
      await recalculateKitStatus(id);
    }
  }),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteKit(input.id))
});
var profileRouter = router({
  list: protectedProcedure.input(z.object({ search: z.string().optional() }).optional()).query(({ input }) => listUsers(input?.search)),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getUserById(input.id)),
  // Colaborador atualiza seu próprio perfil
  updateMyProfile: protectedProcedure.input(z.object({
    phone: z.string().nullable().optional(),
    extension: z.string().nullable().optional(),
    department: z.string().nullable().optional()
  })).mutation(({ ctx, input }) => updateUserProfile(ctx.user.id, input)),
  // Admin atualiza perfil de qualquer colaborador
  updateProfile: adminProcedure.input(z.object({
    id: z.number(),
    phone: z.string().nullable().optional(),
    extension: z.string().nullable().optional(),
    department: z.string().nullable().optional()
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateUserProfile(id, data);
  }),
  // Admin altera role
  updateRole: adminProcedure.input(z.object({ id: z.number(), role: z.enum(["user", "admin"]) })).mutation(({ input }) => updateUserRole(input.id, input.role)),
  // Histórico de reservas de um colaborador
  reservations: protectedProcedure.input(z.object({ userId: z.number() })).query(({ input }) => getUserReservationHistory(input.userId))
});
var reservationRouter = router({
  list: protectedProcedure.input(z.object({
    status: z.string().optional(),
    userId: z.number().optional(),
    search: z.string().optional(),
    startDate: z.number().optional(),
    endDate: z.number().optional()
  }).optional()).query(({ input }) => listReservations(input)),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getReservationById(input.id)),
  create: protectedProcedure.input(z.object({
    startDate: z.number(),
    endDate: z.number(),
    notes: z.string().optional(),
    itemIds: z.array(z.number()).default([]),
    kitIds: z.array(z.number()).default([])
  })).mutation(async ({ ctx, input }) => {
    const availability = await checkAvailability(input.startDate, input.endDate);
    const comboItemIds = input.kitIds.length > 0 ? await getKitItemIds(input.kitIds) : [];
    const selection = buildReservationItemSelection({
      directItemIds: input.itemIds,
      comboItemIds,
      unavailableItemIds: availability.unavailableItemIds
    });
    if (selection.itemIds.length === 0) {
      throw new Error("Selecione pelo menos um item dispon\xEDvel para reservar");
    }
    if (selection.conflictingDirectItemIds.length > 0) {
      const names = availability.conflicts.filter((c) => selection.conflictingDirectItemIds.includes(c.itemId)).map((c) => c.itemName || c.itemCode || `Item #${c.itemId}`).filter((v, i, a) => a.indexOf(v) === i);
      throw new Error(`Conflito de reserva para os itens: ${names.join(", ")}`);
    }
    return createReservation(
      { userId: ctx.user.id, startDate: input.startDate, endDate: input.endDate, notes: input.notes, status: "pendente" },
      selection.itemIds
    );
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    startDate: z.number().optional(),
    endDate: z.number().optional(),
    status: z.enum(["pendente", "ativa", "concluida", "cancelada"]).optional(),
    notes: z.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const reservation = await getReservationById(input.id);
    if (!reservation) throw new Error("Reserva n\xE3o encontrada");
    assertReservationOwnerOrAdmin(ctx.user, reservation);
    if (ctx.user.role !== "admin" && input.status !== void 0) {
      throw new Error("Apenas administradores podem alterar o status da reserva");
    }
    const { id, ...data } = input;
    return updateReservation(id, data);
  }),
  cancel: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const reservation = await getReservationById(input.id);
    if (!reservation) throw new Error("Reserva n\xE3o encontrada");
    assertReservationOwnerOrAdmin(ctx.user, reservation);
    await updateReservation(input.id, { status: "cancelada" });
    if (reservation.status === "ativa") {
      for (const ri of reservation.reservationItems) {
        if (ri.itemId) await updateItem(ri.itemId, { status: "disponivel" });
      }
    }
  }),
  checkout: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    assertAdminReservationOperator(ctx.user);
    const reservation = await getReservationById(input.id);
    if (!reservation) throw new Error("Reserva n\xE3o encontrada");
    if (reservation.status !== "pendente") throw new Error("Apenas reservas pendentes podem ter check-out");
    await updateReservation(input.id, {
      status: "ativa",
      checkoutAt: Date.now(),
      checkoutByUserId: ctx.user.id
    });
    for (const ri of reservation.reservationItems) {
      if (ri.itemId) {
        await updateItem(ri.itemId, { status: "emprestado" });
      }
      if (ri.kitId) {
        const kitItemIds = await getKitItemIds([ri.kitId]);
        for (const itemId of kitItemIds) {
          await updateItem(itemId, { status: "emprestado" });
        }
      }
    }
  }),
  checkin: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    assertAdminReservationOperator(ctx.user);
    const reservation = await getReservationById(input.id);
    if (!reservation) throw new Error("Reserva n\xE3o encontrada");
    if (reservation.status !== "ativa") throw new Error("Apenas reservas ativas podem ter check-in");
    await updateReservation(input.id, {
      status: "concluida",
      checkinAt: Date.now(),
      checkinByUserId: ctx.user.id
    });
    for (const ri of reservation.reservationItems) {
      if (ri.itemId) {
        await updateItem(ri.itemId, { status: "disponivel" });
      }
      if (ri.kitId) {
        const kitItemIds = await getKitItemIds([ri.kitId]);
        for (const itemId of kitItemIds) {
          await updateItem(itemId, { status: "disponivel" });
        }
        await recalculateKitStatus(ri.kitId);
      }
    }
  }),
  checkConflicts: protectedProcedure.input(z.object({
    itemIds: z.array(z.number()).default([]),
    kitIds: z.array(z.number()).default([]),
    startDate: z.number(),
    endDate: z.number(),
    excludeReservationId: z.number().optional()
  })).query(async ({ input }) => {
    const itemConflicts = input.itemIds.length > 0 ? await checkItemConflicts(input.itemIds, input.startDate, input.endDate, input.excludeReservationId) : [];
    const kitConflicts = input.kitIds.length > 0 ? await checkKitConflicts(input.kitIds, input.startDate, input.endDate, input.excludeReservationId) : [];
    return { itemConflicts, kitConflicts, hasConflicts: itemConflicts.length > 0 || kitConflicts.length > 0 };
  }),
  // Period-aware availability: returns unavailable items & kits (including shared-kit resolution)
  checkAvailability: protectedProcedure.input(z.object({
    startDate: z.number(),
    endDate: z.number(),
    excludeReservationId: z.number().optional()
  })).query(async ({ input }) => {
    return checkAvailability(input.startDate, input.endDate, input.excludeReservationId);
  }),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteReservation(input.id))
});
var dashboardRouter = router({
  stats: protectedProcedure.query(() => getDashboardStats()),
  recentReservations: protectedProcedure.input(z.object({ limit: z.number().default(10) }).optional()).query(({ input }) => getRecentReservations(input?.limit ?? 10)),
  overdueReservations: protectedProcedure.query(() => getOverdueReservations())
});
var appRouter = router({
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  category: categoryRouter,
  item: itemRouter,
  kit: kitRouter,
  profile: profileRouter,
  reservation: reservationRouter,
  dashboard: dashboardRouter
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
var AUTH_TIMEOUT_MS = 1e4;
async function withTimeout(promise, label) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`${label} timed out after ${AUTH_TIMEOUT_MS}ms`)),
      AUTH_TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const value = Array.isArray(header) ? header[0] : header;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
function getSupabaseClient() {
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    throw new Error(
      "Supabase auth is not configured: set SUPABASE_URL and SUPABASE_ANON_KEY"
    );
  }
  return createClient2(ENV.supabaseUrl, ENV.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
var SDKServer = class {
  async authenticateRequest(req) {
    const accessToken = getBearerToken(req);
    if (!accessToken) {
      throw ForbiddenError("Missing Supabase access token");
    }
    const supabase = getSupabaseClient();
    const { data, error } = await withTimeout(
      supabase.auth.getUser(accessToken),
      "Supabase auth.getUser"
    );
    if (error || !data.user) {
      throw ForbiddenError("Invalid Supabase access token");
    }
    const supabaseUser = data.user;
    const email = supabaseUser.email ?? null;
    const name = supabaseUser.user_metadata?.name ?? supabaseUser.user_metadata?.full_name ?? email ?? "Usu\xE1rio";
    const signedInAt = /* @__PURE__ */ new Date();
    await withTimeout(
      upsertUser({
        openId: supabaseUser.id,
        name,
        email,
        loginMethod: "supabase",
        lastSignedIn: signedInAt
      }),
      "User upsert"
    );
    const user = await withTimeout(
      getUserByOpenId(supabaseUser.id),
      "User lookup"
    );
    if (!user) {
      throw ForbiddenError("User not found");
    }
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
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
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        lastSignedIn: /* @__PURE__ */ new Date()
      }
    };
  }
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/app.ts
function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app;
}

// server/_core/vercel.ts
var vercel_default = createApp();
export {
  vercel_default as default
};
