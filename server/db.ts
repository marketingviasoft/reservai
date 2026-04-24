import { and, eq, gte, lte, or, ne, like, inArray, sql, desc, asc, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  categories,
  items,
  kits,
  kitItems,
  reservations,
  reservationItems,
  type InsertCategory,
  type InsertItem,
  type InsertKit,
  type InsertReservation,
  type InsertReservationItem,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users (Colaboradores) ──────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listUsers(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db
      .select()
      .from(users)
      .where(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.department, `%${search}%`),
          like(users.phone, `%${search}%`)
        )
      )
      .orderBy(asc(users.name));
  }
  return db.select().from(users).orderBy(asc(users.name));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] || undefined;
}

export async function updateUserProfile(id: number, data: { phone?: string | null; extension?: string | null; department?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function updateUserRole(id: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ role }).where(eq(users.id, id));
}

// ─── Categories ──────────────────────────────────────────────────────────────
export async function listCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(categories).values(data);
  return { id: result[0].insertId };
}

export async function updateCategory(id: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(categories).set(data).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(categories).where(eq(categories.id, id));
}

// ─── Items ───────────────────────────────────────────────────────────────────
export async function listItems(filters?: { categoryId?: number; status?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.categoryId) conditions.push(eq(items.categoryId, filters.categoryId));
  if (filters?.status) conditions.push(eq(items.status, filters.status as any));
  if (filters?.search) conditions.push(or(like(items.name, `%${filters.search}%`), like(items.serialNumber, `%${filters.search}%`)));
  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      description: items.description,
      categoryId: items.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      serialNumber: items.serialNumber,
      photoUrl: items.photoUrl,
      photoKey: items.photoKey,
      status: items.status,
      notes: items.notes,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
    })
    .from(items)
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(items.updatedAt));
  return rows;
}

export async function getItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      description: items.description,
      categoryId: items.categoryId,
      categoryName: categories.name,
      serialNumber: items.serialNumber,
      photoUrl: items.photoUrl,
      photoKey: items.photoKey,
      status: items.status,
      notes: items.notes,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
    })
    .from(items)
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .where(eq(items.id, id))
    .limit(1);
  return rows[0] || undefined;
}

export async function createItem(data: InsertItem) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(items).values(data);
  return { id: result[0].insertId };
}

export async function updateItem(id: number, data: Partial<InsertItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(items).set(data).where(eq(items.id, id));
}

export async function deleteItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(items).where(eq(items.id, id));
}

// ─── Kits ────────────────────────────────────────────────────────────────────
export async function listKits() {
  const db = await getDb();
  if (!db) return [];
  const kitsData = await db.select().from(kits).orderBy(desc(kits.updatedAt));
  const kitItemsData = await db
    .select({
      kitId: kitItems.kitId,
      itemId: kitItems.itemId,
      itemName: items.name,
      itemStatus: items.status,
      itemPhotoUrl: items.photoUrl,
    })
    .from(kitItems)
    .leftJoin(items, eq(kitItems.itemId, items.id));
  return kitsData.map((kit) => ({
    ...kit,
    items: kitItemsData.filter((ki) => ki.kitId === kit.id),
  }));
}

export async function getKitById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const kitRows = await db.select().from(kits).where(eq(kits.id, id)).limit(1);
  if (!kitRows[0]) return undefined;
  const kitItemsData = await db
    .select({
      id: kitItems.id,
      itemId: kitItems.itemId,
      itemName: items.name,
      itemStatus: items.status,
      itemPhotoUrl: items.photoUrl,
      itemSerialNumber: items.serialNumber,
      itemCategoryId: items.categoryId,
    })
    .from(kitItems)
    .leftJoin(items, eq(kitItems.itemId, items.id))
    .where(eq(kitItems.kitId, id));
  return { ...kitRows[0], items: kitItemsData };
}

export async function createKit(data: InsertKit) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(kits).values(data);
  return { id: result[0].insertId };
}

export async function updateKit(id: number, data: Partial<InsertKit>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(kits).set(data).where(eq(kits.id, id));
}

export async function deleteKit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(kits).where(eq(kits.id, id));
}

export async function addItemToKit(kitId: number, itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(kitItems).values({ kitId, itemId });
}

export async function removeItemFromKit(kitId: number, itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(kitItems).where(and(eq(kitItems.kitId, kitId), eq(kitItems.itemId, itemId)));
}

export async function setKitItems(kitId: number, itemIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(kitItems).where(eq(kitItems.kitId, kitId));
  if (itemIds.length > 0) {
    await db.insert(kitItems).values(itemIds.map((itemId) => ({ kitId, itemId })));
  }
}

export async function recalculateKitStatus(kitId: number) {
  const db = await getDb();
  if (!db) return;
  const kitItemsData = await db
    .select({ itemStatus: items.status })
    .from(kitItems)
    .leftJoin(items, eq(kitItems.itemId, items.id))
    .where(eq(kitItems.kitId, kitId));
  const hasUnavailable = kitItemsData.some(
    (ki) => ki.itemStatus === "manutencao" || ki.itemStatus === "extraviado" || ki.itemStatus === "emprestado"
  );
  await db.update(kits).set({ status: hasUnavailable ? "incompleto" : "completo" }).where(eq(kits.id, kitId));
}

// ─── Reservations ────────────────────────────────────────────────────────────
export async function listReservations(filters?: {
  status?: string;
  userId?: number;
  search?: string;
  startDate?: number;
  endDate?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(reservations.status, filters.status as any));
  if (filters?.userId) conditions.push(eq(reservations.userId, filters.userId));
  if (filters?.startDate) conditions.push(gte(reservations.endDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(reservations.startDate, filters.endDate));

  const rows = await db
    .select({
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
      updatedAt: reservations.updatedAt,
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(reservations.startDate));

  // Fetch reservation items for each reservation
  const resIds = rows.map((r) => r.id);
  let resItemsData: any[] = [];
  if (resIds.length > 0) {
    resItemsData = await db
      .select({
        reservationId: reservationItems.reservationId,
        itemId: reservationItems.itemId,
        kitId: reservationItems.kitId,
        itemName: items.name,
        kitName: kits.name,
      })
      .from(reservationItems)
      .leftJoin(items, eq(reservationItems.itemId, items.id))
      .leftJoin(kits, eq(reservationItems.kitId, kits.id))
      .where(inArray(reservationItems.reservationId, resIds));
  }

  return rows.map((r) => ({
    ...r,
    reservationItems: resItemsData.filter((ri) => ri.reservationId === r.id),
  }));
}

export async function getReservationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
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
      updatedAt: reservations.updatedAt,
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.userId, users.id))
    .where(eq(reservations.id, id))
    .limit(1);
  if (!rows[0]) return undefined;

  const resItemsData = await db
    .select({
      id: reservationItems.id,
      reservationId: reservationItems.reservationId,
      itemId: reservationItems.itemId,
      kitId: reservationItems.kitId,
      itemName: items.name,
      kitName: kits.name,
      itemStatus: items.status,
    })
    .from(reservationItems)
    .leftJoin(items, eq(reservationItems.itemId, items.id))
    .leftJoin(kits, eq(reservationItems.kitId, kits.id))
    .where(eq(reservationItems.reservationId, id));

  return { ...rows[0], reservationItems: resItemsData };
}

export async function createReservation(data: InsertReservation, itemIds: number[], kitIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(reservations).values(data);
  const reservationId = result[0].insertId;

  const resItems: InsertReservationItem[] = [
    ...itemIds.map((itemId) => ({ reservationId, itemId, kitId: null })),
    ...kitIds.map((kitId) => ({ reservationId, itemId: null, kitId })),
  ];
  if (resItems.length > 0) {
    await db.insert(reservationItems).values(resItems);
  }
  return { id: reservationId };
}

export async function updateReservation(id: number, data: Partial<InsertReservation>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(reservations).set(data).where(eq(reservations.id, id));
}

export async function deleteReservation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(reservations).where(eq(reservations.id, id));
}

// ─── Conflict Detection ─────────────────────────────────────────────────────
export async function checkItemConflicts(
  itemIds: number[],
  startDate: number,
  endDate: number,
  excludeReservationId?: number
) {
  const db = await getDb();
  if (!db) return [];
  if (itemIds.length === 0) return [];

  const conditions = [
    inArray(reservationItems.itemId, itemIds),
    lte(reservations.startDate, endDate),
    gte(reservations.endDate, startDate),
    or(eq(reservations.status, "pendente"), eq(reservations.status, "ativa")),
  ];
  if (excludeReservationId) {
    conditions.push(ne(reservations.id, excludeReservationId));
  }

  return db
    .select({
      reservationId: reservations.id,
      itemId: reservationItems.itemId,
      itemName: items.name,
      startDate: reservations.startDate,
      endDate: reservations.endDate,
      status: reservations.status,
    })
    .from(reservationItems)
    .innerJoin(reservations, eq(reservationItems.reservationId, reservations.id))
    .leftJoin(items, eq(reservationItems.itemId, items.id))
    .where(and(...conditions));
}

export async function checkKitConflicts(
  kitIds: number[],
  startDate: number,
  endDate: number,
  excludeReservationId?: number
) {
  const db = await getDb();
  if (!db) return [];
  if (kitIds.length === 0) return [];

  const kitConditions = [
    inArray(reservationItems.kitId, kitIds),
    lte(reservations.startDate, endDate),
    gte(reservations.endDate, startDate),
    or(eq(reservations.status, "pendente"), eq(reservations.status, "ativa")),
  ];
  if (excludeReservationId) {
    kitConditions.push(ne(reservations.id, excludeReservationId));
  }

  const kitConflicts = await db
    .select({
      reservationId: reservations.id,
      kitId: reservationItems.kitId,
      kitName: kits.name,
      startDate: reservations.startDate,
      endDate: reservations.endDate,
      status: reservations.status,
    })
    .from(reservationItems)
    .innerJoin(reservations, eq(reservationItems.reservationId, reservations.id))
    .leftJoin(kits, eq(reservationItems.kitId, kits.id))
    .where(and(...kitConditions));

  const kitItemIds = await db
    .select({ itemId: kitItems.itemId })
    .from(kitItems)
    .where(inArray(kitItems.kitId, kitIds));

  const itemIdsInKits = kitItemIds.map((ki) => ki.itemId);
  if (itemIdsInKits.length > 0) {
    const itemConflicts = await checkItemConflicts(itemIdsInKits, startDate, endDate, excludeReservationId);
    return [...kitConflicts, ...itemConflicts.map((c) => ({ ...c, kitId: null, kitName: null }))];
  }

  return kitConflicts;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalItems: 0, availableItems: 0, lentItems: 0, maintenanceItems: 0, totalKits: 0, totalUsers: 0, activeReservations: 0, pendingReservations: 0, overdueReservations: 0 };

  const now = Date.now();

  const [itemStats] = await db
    .select({
      total: count(),
      available: sql<number>`SUM(CASE WHEN ${items.status} = 'disponivel' THEN 1 ELSE 0 END)`,
      lent: sql<number>`SUM(CASE WHEN ${items.status} = 'emprestado' THEN 1 ELSE 0 END)`,
      maintenance: sql<number>`SUM(CASE WHEN ${items.status} = 'manutencao' THEN 1 ELSE 0 END)`,
    })
    .from(items);

  const [kitStats] = await db.select({ total: count() }).from(kits);
  const [userStats] = await db.select({ total: count() }).from(users);

  const [activeRes] = await db
    .select({ total: count() })
    .from(reservations)
    .where(eq(reservations.status, "ativa"));

  const [pendingRes] = await db
    .select({ total: count() })
    .from(reservations)
    .where(eq(reservations.status, "pendente"));

  const [overdueRes] = await db
    .select({ total: count() })
    .from(reservations)
    .where(and(eq(reservations.status, "ativa"), lte(reservations.endDate, now)));

  return {
    totalItems: itemStats?.total ?? 0,
    availableItems: Number(itemStats?.available ?? 0),
    lentItems: Number(itemStats?.lent ?? 0),
    maintenanceItems: Number(itemStats?.maintenance ?? 0),
    totalKits: kitStats?.total ?? 0,
    totalUsers: userStats?.total ?? 0,
    activeReservations: activeRes?.total ?? 0,
    pendingReservations: pendingRes?.total ?? 0,
    overdueReservations: overdueRes?.total ?? 0,
  };
}

export async function getRecentReservations(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: reservations.id,
      userName: users.name,
      userDepartment: users.department,
      startDate: reservations.startDate,
      endDate: reservations.endDate,
      status: reservations.status,
      notes: reservations.notes,
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.userId, users.id))
    .orderBy(desc(reservations.createdAt))
    .limit(limit);
}

export async function getOverdueReservations() {
  const db = await getDb();
  if (!db) return [];
  const now = Date.now();
  return db
    .select({
      id: reservations.id,
      userName: users.name,
      userDepartment: users.department,
      startDate: reservations.startDate,
      endDate: reservations.endDate,
      status: reservations.status,
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.userId, users.id))
    .where(and(eq(reservations.status, "ativa"), lte(reservations.endDate, now)))
    .orderBy(asc(reservations.endDate));
}

// ─── Get items belonging to kits (for blocking) ─────────────────────────────
export async function getKitItemIds(kitIds: number[]): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  if (kitIds.length === 0) return [];
  const rows = await db
    .select({ itemId: kitItems.itemId })
    .from(kitItems)
    .where(inArray(kitItems.kitId, kitIds));
  return rows.map((r) => r.itemId);
}

// ─── User reservation history ───────────────────────────────────────────────
export async function getUserReservationHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: reservations.id,
      startDate: reservations.startDate,
      endDate: reservations.endDate,
      status: reservations.status,
      notes: reservations.notes,
      createdAt: reservations.createdAt,
    })
    .from(reservations)
    .where(eq(reservations.userId, userId))
    .orderBy(desc(reservations.createdAt));
  return rows;
}
