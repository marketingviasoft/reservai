import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import { assertAdminReservationOperator, assertReservationOwnerOrAdmin } from "./reservationAccess";
import { buildReservationItemSelection } from "./reservationSelection";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    extension: null,
    department: null,
    ...overrides,
  };
}

function createContext(user?: AuthenticatedUser | null): TrpcContext {
  return {
    user: user ?? null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns null when not authenticated", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user when authenticated", async () => {
    const user = createMockUser();
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-open-id");
    expect(result?.name).toBe("Test User");
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const user = createMockUser();
    const ctx: TrpcContext = {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

describe("category router - access control", () => {
  it("rejects unauthenticated user from listing categories", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.category.list()).rejects.toThrow();
  });

  it("rejects non-admin from creating categories", async () => {
    const user = createMockUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.category.create({ name: "Test Category" })
    ).rejects.toThrow();
  });
});

describe("item router - access control", () => {
  it("rejects unauthenticated user from listing items", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.item.list()).rejects.toThrow();
  });

  it("rejects non-admin from creating items", async () => {
    const user = createMockUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.item.create({ name: "Test Item" })
    ).rejects.toThrow();
  });

  it("rejects non-admin from deleting items", async () => {
    const user = createMockUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.item.delete({ id: 1 })
    ).rejects.toThrow();
  });
});

describe("kit router - access control", () => {
  it("rejects non-admin from creating kits", async () => {
    const user = createMockUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.kit.create({ name: "Test Kit" })
    ).rejects.toThrow();
  });
});

describe("profile router - access control", () => {
  it("rejects unauthenticated user from listing profiles", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.list()).rejects.toThrow();
  });

  it("rejects non-admin from updating other user profiles", async () => {
    const user = createMockUser({ role: "user", id: 2 });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.profile.updateProfile({ id: 1, phone: "123" })
    ).rejects.toThrow();
  });

  it("rejects non-admin from changing user roles", async () => {
    const user = createMockUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.profile.updateRole({ id: 2, role: "admin" })
    ).rejects.toThrow();
  });

  it("allows regular user to update own profile", async () => {
    const user = createMockUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    // This should not fail at auth level - will fail at DB level
    try {
      await caller.profile.updateMyProfile({
        phone: "11999999999",
        department: "Marketing",
      });
    } catch (e: any) {
      // Should fail at DB level, not auth level
      expect(e.message).not.toContain("FORBIDDEN");
      expect(e.message).not.toContain("UNAUTHORIZED");
    }
  });
});

describe("reservation router - input validation", () => {
  it("requires startDate and endDate for creating reservation", async () => {
    const user = createMockUser();
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      // @ts-expect-error - testing missing required fields
      caller.reservation.create({ notes: "test" })
    ).rejects.toThrow();
  });

  it("validates status enum on update", async () => {
    const user = createMockUser();
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.reservation.update({
        id: 1,
        // @ts-expect-error - testing invalid status
        status: "invalid_status",
      })
    ).rejects.toThrow();
  });
});

describe("reservation router - access control", () => {
  it("allows regular user to create reservations (tied to their userId)", async () => {
    const user = createMockUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    // This will fail at DB level but should not fail at auth level
    try {
      await caller.reservation.create({
        startDate: Date.now(),
        endDate: Date.now() + 86400000,
        itemIds: [],
        kitIds: [],
      });
    } catch (e: any) {
      // Should fail at DB level, not auth level
      expect(e.message).not.toContain("FORBIDDEN");
      expect(e.message).not.toContain("Not an admin");
    }
  });

  it("rejects non-admin from deleting reservations", async () => {
    const user = createMockUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.reservation.delete({ id: 1 })
    ).rejects.toThrow();
  });

  it("allows reservation owner to update or cancel their own reservation", () => {
    const user = createMockUser({ role: "user", id: 7 });
    expect(() => assertReservationOwnerOrAdmin(user, { userId: 7 })).not.toThrow();
  });

  it("allows admin to update or cancel any reservation", () => {
    const user = createMockUser({ role: "admin", id: 1 });
    expect(() => assertReservationOwnerOrAdmin(user, { userId: 7 })).not.toThrow();
  });

  it("rejects regular user from updating or canceling another user's reservation", () => {
    const user = createMockUser({ role: "user", id: 2 });
    expect(() => assertReservationOwnerOrAdmin(user, { userId: 7 })).toThrow();
  });

  it("rejects regular user from operating check-in and check-out", () => {
    const user = createMockUser({ role: "user" });
    expect(() => assertAdminReservationOperator(user)).toThrow();
  });

  it("allows admin to operate check-in and check-out", () => {
    const user = createMockUser({ role: "admin" });
    expect(() => assertAdminReservationOperator(user)).not.toThrow();
  });
});

describe("dashboard router - access control", () => {
  it("rejects unauthenticated user from dashboard stats", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.stats()).rejects.toThrow();
  });
});

describe("reservation.checkAvailability - access control", () => {
  it("rejects unauthenticated user from checking availability", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.reservation.checkAvailability({
        startDate: Date.now(),
        endDate: Date.now() + 86400000,
      })
    ).rejects.toThrow();
  });

  it("allows authenticated user to check availability", async () => {
    const user = createMockUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    // Should not fail at auth level - will fail at DB level or return empty
    try {
      const result = await caller.reservation.checkAvailability({
        startDate: Date.now(),
        endDate: Date.now() + 86400000,
      });
      // If DB is available, should return the expected shape
      expect(result).toHaveProperty("unavailableItemIds");
      expect(result).toHaveProperty("unavailableKitIds");
      expect(result).toHaveProperty("conflicts");
      expect(Array.isArray(result.unavailableItemIds)).toBe(true);
      expect(Array.isArray(result.unavailableKitIds)).toBe(true);
    } catch (e: any) {
      // Should fail at DB level, not auth level
      expect(e.message).not.toContain("FORBIDDEN");
      expect(e.message).not.toContain("UNAUTHORIZED");
    }
  });

  it("requires valid date range for availability check", async () => {
    const user = createMockUser();
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      // @ts-expect-error - testing missing required fields
      caller.reservation.checkAvailability({ startDate: Date.now() })
    ).rejects.toThrow();
  });
});

describe("reservation.create - shared kit conflict validation", () => {
  it("validates that create requires at least valid dates", async () => {
    const user = createMockUser();
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    // Missing dates should throw validation error
    await expect(
      // @ts-expect-error - testing missing required fields
      caller.reservation.create({
        itemIds: [1],
        kitIds: [],
      })
    ).rejects.toThrow();
  });

  it("accepts excludeReservationId parameter for availability check", async () => {
    const user = createMockUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.reservation.checkAvailability({
        startDate: Date.now(),
        endDate: Date.now() + 86400000,
        excludeReservationId: 999,
      });
      expect(result).toHaveProperty("unavailableItemIds");
      expect(result).toHaveProperty("unavailableKitIds");
    } catch (e: any) {
      expect(e.message).not.toContain("FORBIDDEN");
    }
  });
});

describe("reservation item selection", () => {
  it("persists combo selections as physical item ids", () => {
    const result = buildReservationItemSelection({
      directItemIds: [1],
      comboItemIds: [2, 3],
      unavailableItemIds: [],
    });

    expect(result.itemIds).toEqual([1, 2, 3]);
    expect(result.skippedComboItemIds).toEqual([]);
  });

  it("skips unavailable combo items while keeping available ones", () => {
    const result = buildReservationItemSelection({
      directItemIds: [],
      comboItemIds: [1, 2, 3],
      unavailableItemIds: [2],
    });

    expect(result.itemIds).toEqual([1, 3]);
    expect(result.skippedComboItemIds).toEqual([2]);
  });

  it("reports unavailable directly selected items as conflicts", () => {
    const result = buildReservationItemSelection({
      directItemIds: [1, 2],
      comboItemIds: [2, 3],
      unavailableItemIds: [2],
    });

    expect(result.conflictingDirectItemIds).toEqual([2]);
    expect(result.itemIds).toEqual([1, 2, 3]);
  });
});
