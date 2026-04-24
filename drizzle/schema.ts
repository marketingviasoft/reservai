import { relations } from "drizzle-orm";
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  bigint,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ─── Users (Equipe) ──────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Campos complementares do membro da equipe
  phone: varchar("phone", { length: 32 }),
  extension: varchar("extension", { length: 16 }), // ramal
  department: varchar("department", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Categories ──────────────────────────────────────────────────────────────
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// ─── Items (Equipamentos) ────────────────────────────────────────────────────
export const items = mysqlTable(
  "items",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 16 }).notNull().unique(), // EQP-XXXXX
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    categoryId: int("categoryId").references(() => categories.id),
    serialNumber: varchar("serialNumber", { length: 128 }),
    photoUrl: text("photoUrl"),
    photoKey: varchar("photoKey", { length: 512 }),
    status: mysqlEnum("status", [
      "disponivel",
      "emprestado",
      "manutencao",
      "extraviado",
    ])
      .default("disponivel")
      .notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("serial_number_idx").on(table.serialNumber)]
);

export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;

// ─── Kits ────────────────────────────────────────────────────────────────────
export const kits = mysqlTable("kits", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["completo", "incompleto"])
    .default("completo")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Kit = typeof kits.$inferSelect;
export type InsertKit = typeof kits.$inferInsert;

// ─── Kit Items (Pivô Many-to-Many) ──────────────────────────────────────────
export const kitItems = mysqlTable("kit_items", {
  id: int("id").autoincrement().primaryKey(),
  kitId: int("kitId")
    .notNull()
    .references(() => kits.id, { onDelete: "cascade" }),
  itemId: int("itemId")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KitItem = typeof kitItems.$inferSelect;
export type InsertKitItem = typeof kitItems.$inferInsert;

// ─── Reservations (Reservas) ─────────────────────────────────────────────────
// Reservas são atreladas diretamente ao membro da equipe (userId) que solicita
export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  startDate: bigint("startDate", { mode: "number" }).notNull(), // UTC ms
  endDate: bigint("endDate", { mode: "number" }).notNull(), // UTC ms
  status: mysqlEnum("status", ["pendente", "ativa", "concluida", "cancelada"])
    .default("pendente")
    .notNull(),
  checkoutAt: bigint("checkoutAt", { mode: "number" }), // UTC ms when checked out
  checkoutByUserId: int("checkoutByUserId").references(() => users.id),
  checkinAt: bigint("checkinAt", { mode: "number" }), // UTC ms when checked in
  checkinByUserId: int("checkinByUserId").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

// ─── Reservation Items (Itens da Reserva) ────────────────────────────────────
export const reservationItems = mysqlTable("reservation_items", {
  id: int("id").autoincrement().primaryKey(),
  reservationId: int("reservationId")
    .notNull()
    .references(() => reservations.id, { onDelete: "cascade" }),
  itemId: int("itemId").references(() => items.id),
  kitId: int("kitId").references(() => kits.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReservationItem = typeof reservationItems.$inferSelect;
export type InsertReservationItem = typeof reservationItems.$inferInsert;

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
}));
