import { relations } from "drizzle-orm";
import {
  bigint,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  text,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const itemStatusEnum = pgEnum("item_status", [
  "disponivel",
  "emprestado",
  "manutencao",
  "extraviado",
]);
export const itemConditionEnum = pgEnum("item_condition", [
  "novo",
  "bom",
  "regular",
  "danificado",
]);
export const kitStatusEnum = pgEnum("kit_status", ["completo", "incompleto"]);
export const reservationStatusEnum = pgEnum("reservation_status", [
  "pendente",
  "ativa",
  "concluida",
  "cancelada",
]);
export const reservationEventTypeEnum = pgEnum("reservation_event_type", [
  "reservation_created",
  "reservation_updated",
  "reservation_cancelled",
  "reservation_checked_out",
  "reservation_checked_in",
]);

// ─── Users (Equipe) ──────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  // Campos complementares do membro da equipe
  phone: varchar("phone", { length: 32 }),
  extension: varchar("extension", { length: 16 }), // ramal
  department: varchar("department", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Categories ──────────────────────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// ─── Items (Equipamentos) ────────────────────────────────────────────────────
export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 16 }).notNull().unique(), // EQP-XXXXX
    name: varchar("name", { length: 256 }).notNull(),
    brand: varchar("brand", { length: 128 }).notNull(),
    model: varchar("model", { length: 128 }).notNull(),
    description: text("description"),
    categoryId: integer("categoryId").references(() => categories.id),
    serialNumber: varchar("serialNumber", { length: 128 }),
    assetNumber: varchar("assetNumber", { length: 128 }),
    photoUrl: text("photoUrl"),
    photoKey: varchar("photoKey", { length: 512 }),
    status: itemStatusEnum("status")
      .default("disponivel")
      .notNull(),
    condition: itemConditionEnum("condition")
      .default("bom")
      .notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("serial_number_idx").on(table.serialNumber)]
);

export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;

// ─── Kits ────────────────────────────────────────────────────────────────────
export const kits = pgTable("kits", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  status: kitStatusEnum("status")
    .default("completo")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Kit = typeof kits.$inferSelect;
export type InsertKit = typeof kits.$inferInsert;

// ─── Kit Items (Pivô Many-to-Many) ──────────────────────────────────────────
export const kitItems = pgTable("kit_items", {
  id: serial("id").primaryKey(),
  kitId: integer("kitId")
    .notNull()
    .references(() => kits.id, { onDelete: "cascade" }),
  itemId: integer("itemId")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KitItem = typeof kitItems.$inferSelect;
export type InsertKitItem = typeof kitItems.$inferInsert;

// ─── Reservations (Reservas) ─────────────────────────────────────────────────
// Reservas são atreladas diretamente ao membro da equipe (userId) que solicita
export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id),
  startDate: bigint("startDate", { mode: "number" }).notNull(), // UTC ms
  endDate: bigint("endDate", { mode: "number" }).notNull(), // UTC ms
  status: reservationStatusEnum("status")
    .default("pendente")
    .notNull(),
  checkoutAt: bigint("checkoutAt", { mode: "number" }), // UTC ms when checked out
  checkoutByUserId: integer("checkoutByUserId").references(() => users.id),
  checkinAt: bigint("checkinAt", { mode: "number" }), // UTC ms when checked in
  checkinByUserId: integer("checkinByUserId").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

// ─── Reservation Items (Itens da Reserva) ────────────────────────────────────
export const reservationItems = pgTable("reservation_items", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservationId")
    .notNull()
    .references(() => reservations.id, { onDelete: "cascade" }),
  itemId: integer("itemId").references(() => items.id),
  kitId: integer("kitId").references(() => kits.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReservationItem = typeof reservationItems.$inferSelect;
export type InsertReservationItem = typeof reservationItems.$inferInsert;

// ─── Reservation Events (Auditoria Operacional) ─────────────────────────────
export const reservationEvents = pgTable("reservation_events", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservationId")
    .notNull()
    .references(() => reservations.id, { onDelete: "cascade" }),
  eventType: reservationEventTypeEnum("eventType").notNull(),
  actorUserId: integer("actorUserId").references(() => users.id),
  fromStatus: reservationStatusEnum("fromStatus"),
  toStatus: reservationStatusEnum("toStatus"),
  metadata: jsonb("metadata")
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReservationEvent = typeof reservationEvents.$inferSelect;
export type InsertReservationEvent = typeof reservationEvents.$inferInsert;

// ─── Relations ───────────────────────────────────────────────────────────────
export const itemsRelations = relations(items, ({ one }) => ({
  category: one(categories, {
    fields: [items.categoryId],
    references: [categories.id],
  }),
}));

export const kitItemsRelations = relations(kitItems, ({ one }) => ({
  kit: one(kits, { fields: [kitItems.kitId], references: [kits.id] }),
  item: one(items, { fields: [kitItems.itemId], references: [items.id] }),
}));

export const kitsRelations = relations(kits, ({ many }) => ({
  kitItems: many(kitItems),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
    relationName: "reservationUser",
  }),
  checkoutByUser: one(users, {
    fields: [reservations.checkoutByUserId],
    references: [users.id],
    relationName: "checkoutUser",
  }),
  checkinByUser: one(users, {
    fields: [reservations.checkinByUserId],
    references: [users.id],
    relationName: "checkinUser",
  }),
  reservationItems: many(reservationItems),
  events: many(reservationEvents),
}));

export const reservationItemsRelations = relations(
  reservationItems,
  ({ one }) => ({
    reservation: one(reservations, {
      fields: [reservationItems.reservationId],
      references: [reservations.id],
    }),
    item: one(items, {
      fields: [reservationItems.itemId],
      references: [items.id],
    }),
    kit: one(kits, {
      fields: [reservationItems.kitId],
      references: [kits.id],
    }),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  reservations: many(reservations, { relationName: "reservationUser" }),
  reservationEvents: many(reservationEvents, {
    relationName: "reservationEventActor",
  }),
}));

export const reservationEventsRelations = relations(
  reservationEvents,
  ({ one }) => ({
    reservation: one(reservations, {
      fields: [reservationEvents.reservationId],
      references: [reservations.id],
    }),
    actorUser: one(users, {
      fields: [reservationEvents.actorUserId],
      references: [users.id],
      relationName: "reservationEventActor",
    }),
  })
);
