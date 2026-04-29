import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import {
  buildPhysicalReservationItems,
  buildReservationEvent,
  buildReservationUpdateMetadata,
  collectReservationPhysicalItemIds,
} from "./db";
import {
  assertAdminReservationOperator,
  assertCanCancelReservation,
  assertCanUpdateReservation,
  assertReservationOwnerOrAdmin,
  canCancelReservation,
} from "./reservationAccess";
import {
  buildComboCartUpdate,
  buildReservationItemSelection,
} from "./reservationSelection";
import { isReservationBlockingAvailability } from "../shared/reservationStatus";
import { isCancelledError } from "../shared/authErrors";
import {
  buildAuthDiagnostics,
  buildFrontendAuthDiagnostics,
} from "../shared/authDiagnostics";
import {
  shouldRedirectToLoginAfterUnauthorized,
  shouldRefreshAuthAfterUnauthorized,
} from "../shared/authRedirect";
import {
  buildReservationEventDescription,
  hasReservationEvents,
} from "../shared/reservationEvents";
import {
  buildDashboardStatsFromCounts,
  canViewReservationInOperationalViews,
  isCheckinEligibleStatus,
  isCheckoutEligibleStatus,
  isOperationalHistoryStatus,
} from "../shared/operationalViews";

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
    auth: {
      hasAuthorizationHeader: false,
      error: null,
    },
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

  it("returns session diagnostics for anonymous users", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.session();

    expect(result.user).toBeNull();
    expect(result.authenticated).toBe(false);
    expect(result.hasAuthorizationHeader).toBe(false);
    expect(result.authError).toBeNull();
  });

  it("returns session user when context has authenticated user", async () => {
    const user = createMockUser();
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.session();

    expect(result.user?.openId).toBe("test-user-open-id");
    expect(result.authenticated).toBe(true);
    expect(result.authError).toBeNull();
  });

  it("returns safe auth diagnostics", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.diagnostics();

    expect(result).toHaveProperty("hasDatabaseUrl");
    expect(result).toHaveProperty("hasSupabaseUrl");
    expect(result).toHaveProperty("hasSupabaseAnonKey");
    expect(result).toHaveProperty("supabaseHost");
    expect(result).toHaveProperty("nodeEnv");
    expect(JSON.stringify(result)).not.toContain("postgres://");
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const user = createMockUser();
    const ctx: TrpcContext = {
      user,
      auth: {
        hasAuthorizationHeader: false,
        error: null,
      },
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

describe("auth client error helpers", () => {
  it("identifies query cancellation errors", () => {
    const error = new Error("CancelledError");
    error.name = "CancelledError";

    expect(isCancelledError(error)).toBe(true);
    expect(isCancelledError(new Error("Invalid login credentials"))).toBe(false);
    expect(isCancelledError("CancelledError")).toBe(false);
  });

  it("does not redirect CancelledError to login", () => {
    expect(
      shouldRedirectToLoginAfterUnauthorized({
        isCancelled: true,
        isUnauthorized: true,
        hasSupabaseSession: false,
      })
    ).toBe(false);
  });

  it("refreshes auth instead of redirecting when Supabase session still exists", () => {
    expect(
      shouldRefreshAuthAfterUnauthorized({
        isCancelled: false,
        isUnauthorized: true,
        hasSupabaseSession: true,
      })
    ).toBe(true);
    expect(
      shouldRedirectToLoginAfterUnauthorized({
        isCancelled: false,
        isUnauthorized: true,
        hasSupabaseSession: true,
      })
    ).toBe(false);
  });

  it("redirects to login when unauthorized and no Supabase session exists", () => {
    expect(
      shouldRedirectToLoginAfterUnauthorized({
        isCancelled: false,
        isUnauthorized: true,
        hasSupabaseSession: false,
      })
    ).toBe(true);
  });

  it("builds auth diagnostics without exposing secrets", () => {
    const diagnostics = buildAuthDiagnostics({
      databaseUrl: "postgres://user:pass@example.com/db",
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-secret-value",
      nodeEnv: "production",
    });
    const frontendDiagnostics = buildFrontendAuthDiagnostics({
      viteSupabaseUrl: "https://front.supabase.co",
      viteSupabaseAnonKey: "vite-anon-secret",
    });

    expect(diagnostics).toEqual({
      hasDatabaseUrl: true,
      hasSupabaseUrl: true,
      hasSupabaseAnonKey: true,
      supabaseHost: "example.supabase.co",
      nodeEnv: "production",
    });
    expect(JSON.stringify(diagnostics)).not.toContain("anon-secret-value");
    expect(frontendDiagnostics).toEqual({
      hasViteSupabaseUrl: true,
      hasViteSupabaseAnonKey: true,
      viteSupabaseHost: "front.supabase.co",
    });
    expect(JSON.stringify(frontendDiagnostics)).not.toContain("vite-anon-secret");
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

describe("item router - input validation", () => {
  it("requires brand and model when creating items", async () => {
    const user = createMockUser({ role: "admin" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      // @ts-expect-error - testing missing required fields
      caller.item.create({ name: "Camera" })
    ).rejects.toThrow();
  });

  it("validates physical condition separately from operational status", async () => {
    const user = createMockUser({ role: "admin" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.item.create({
        name: "Camera",
        brand: "Sony",
        model: "A7 IV",
        status: "disponivel",
        // @ts-expect-error - testing invalid physical condition
        condition: "emprestado",
      })
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

  it("allows reservation owner to update their own pending reservation", () => {
    const user = createMockUser({ role: "user", id: 7 });
    expect(() =>
      assertCanUpdateReservation(user, { userId: 7, status: "pendente" })
    ).not.toThrow();
  });

  it("allows admin to update reservations from other users", () => {
    const user = createMockUser({ role: "admin", id: 1 });
    expect(() =>
      assertCanUpdateReservation(user, { userId: 7, status: "ativa" })
    ).not.toThrow();
  });

  it("rejects regular user from updating another user's reservation", () => {
    const user = createMockUser({ role: "user", id: 2 });
    expect(() =>
      assertCanUpdateReservation(user, { userId: 7, status: "pendente" })
    ).toThrow();
  });

  it("allows regular user to cancel their own pending reservation", () => {
    const user = createMockUser({ role: "user", id: 7 });
    const reservation = { userId: 7, status: "pendente" };
    expect(canCancelReservation(user, reservation)).toBe(true);
    expect(() => assertCanCancelReservation(user, reservation)).not.toThrow();
  });

  it("rejects regular user from canceling their own active reservation", () => {
    const user = createMockUser({ role: "user", id: 7 });
    const reservation = { userId: 7, status: "ativa" };
    expect(canCancelReservation(user, reservation)).toBe(false);
    expect(() => assertCanCancelReservation(user, reservation)).toThrow();
  });

  it("rejects regular user from canceling another user's pending reservation", () => {
    const user = createMockUser({ role: "user", id: 2 });
    expect(() =>
      assertCanCancelReservation(user, { userId: 7, status: "pendente" })
    ).toThrow();
  });

  it("allows admin to cancel pending reservations", () => {
    const user = createMockUser({ role: "admin", id: 1 });
    expect(() =>
      assertCanCancelReservation(user, { userId: 7, status: "pendente" })
    ).not.toThrow();
  });

  it("rejects admin from canceling active reservations", () => {
    const user = createMockUser({ role: "admin", id: 1 });
    expect(() =>
      assertCanCancelReservation(user, { userId: 7, status: "ativa" })
    ).toThrow("Reservas ativas devem ser encerradas via check-in.");
  });

  it("uses a clear check-in guidance message for active reservations", () => {
    const user = createMockUser({ role: "user", id: 7 });
    expect(() =>
      assertCanCancelReservation(user, { userId: 7, status: "ativa" })
    ).toThrow("Reservas ativas devem ser encerradas via check-in.");
  });

  it("rejects canceling concluded or already canceled reservations", () => {
    const user = createMockUser({ role: "admin", id: 1 });
    expect(() =>
      assertCanCancelReservation(user, { userId: 7, status: "concluida" })
    ).toThrow();
    expect(() =>
      assertCanCancelReservation(user, { userId: 7, status: "cancelada" })
    ).toThrow();
  });

  it("rejects regular user from operating check-in and check-out", () => {
    const user = createMockUser({ role: "user" });
    expect(() => assertAdminReservationOperator(user)).toThrow();
  });

  it("allows admin to operate check-in and check-out", () => {
    const user = createMockUser({ role: "admin" });
    expect(() => assertAdminReservationOperator(user)).not.toThrow();
  });

  it("still allows admin to view reservations from other users", () => {
    const user = createMockUser({ role: "admin", id: 1 });
    expect(() => assertReservationOwnerOrAdmin(user, { userId: 7 })).not.toThrow();
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
  it("builds reservation rows with only physical item ids", () => {
    const rows = buildPhysicalReservationItems(123, [1, 2, 2, 3]);

    expect(rows).toEqual([
      { reservationId: 123, itemId: 1, kitId: null },
      { reservationId: 123, itemId: 2, kitId: null },
      { reservationId: 123, itemId: 3, kitId: null },
    ]);
  });

  it("does not persist kit ids for new reservation item rows", () => {
    const rows = buildPhysicalReservationItems(123, [9]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.itemId).toBe(9);
    expect(rows[0]?.kitId).toBeNull();
  });

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

  it("adds combo items to the cart without duplicating existing selections", () => {
    const result = buildComboCartUpdate({
      currentItemIds: [1, 2],
      comboItemIds: [2, 3, 3, 4],
      unavailableItemIds: [],
    });

    expect(result.itemIds).toEqual([1, 2, 3, 4]);
    expect(result.addedItemIds).toEqual([3, 4]);
    expect(result.duplicateItemIds).toEqual([2]);
  });

  it("adds only available combo items and reports skipped unavailable items", () => {
    const result = buildComboCartUpdate({
      currentItemIds: [],
      comboItemIds: [1, 2, 3],
      unavailableItemIds: [2],
    });

    expect(result.itemIds).toEqual([1, 3]);
    expect(result.addedItemIds).toEqual([1, 3]);
    expect(result.skippedItemIds).toEqual([2]);
    expect(result.allUnavailable).toBe(false);
  });

  it("reports when all combo items are unavailable or already selected", () => {
    const result = buildComboCartUpdate({
      currentItemIds: [1],
      comboItemIds: [1, 2],
      unavailableItemIds: [2],
    });

    expect(result.itemIds).toEqual([1]);
    expect(result.addedItemIds).toEqual([]);
    expect(result.skippedItemIds).toEqual([2]);
    expect(result.duplicateItemIds).toEqual([1]);
    expect(result.allUnavailable).toBe(true);
  });
});

describe("reservation availability status rules", () => {
  it("blocks availability for pending and active reservations", () => {
    expect(isReservationBlockingAvailability("pendente")).toBe(true);
    expect(isReservationBlockingAvailability("ativa")).toBe(true);
  });

  it("does not block availability for canceled or concluded reservations", () => {
    expect(isReservationBlockingAvailability("cancelada")).toBe(false);
    expect(isReservationBlockingAvailability("concluida")).toBe(false);
  });
});

describe("operational views domain rules", () => {
  it("keeps dashboard physical equipment totals separate from combos", () => {
    const stats = buildDashboardStatsFromCounts({
      totalItems: 12,
      totalKits: 3,
    });

    expect(stats.totalItems).toBe(12);
    expect(stats.totalKits).toBe(3);
  });

  it("counts dashboard equipment by item operational status", () => {
    const stats = buildDashboardStatsFromCounts({
      availableItems: 5,
      lentItems: 4,
      maintenanceItems: 2,
      lostItems: 1,
    });

    expect(stats.availableItems).toBe(5);
    expect(stats.lentItems).toBe(4);
    expect(stats.maintenanceItems).toBe(2);
    expect(stats.lostItems).toBe(1);
  });

  it("does not model physical condition as a dashboard operational status", () => {
    const stats = buildDashboardStatsFromCounts({
      totalItems: 4,
      maintenanceItems: 1,
    });

    expect(stats).not.toHaveProperty("damagedItems");
    expect(stats).not.toHaveProperty("regularItems");
    expect(stats.maintenanceItems).toBe(1);
  });

  it("marks only pending reservations as checkout eligible", () => {
    expect(isCheckoutEligibleStatus("pendente")).toBe(true);
    expect(isCheckoutEligibleStatus("ativa")).toBe(false);
    expect(isCheckoutEligibleStatus("concluida")).toBe(false);
    expect(isCheckoutEligibleStatus("cancelada")).toBe(false);
  });

  it("marks only active reservations as checkin eligible", () => {
    expect(isCheckinEligibleStatus("ativa")).toBe(true);
    expect(isCheckinEligibleStatus("pendente")).toBe(false);
    expect(isCheckinEligibleStatus("concluida")).toBe(false);
    expect(isCheckinEligibleStatus("cancelada")).toBe(false);
  });

  it("uses concluded reservations as check-in/check-out operation history", () => {
    expect(isOperationalHistoryStatus("concluida")).toBe(true);
    expect(isOperationalHistoryStatus("cancelada")).toBe(false);
  });

  it("keeps reservation list visibility scoped by role", () => {
    const collaborator = createMockUser({ role: "user", id: 7 });
    const admin = createMockUser({ role: "admin", id: 1 });

    expect(
      canViewReservationInOperationalViews(collaborator, { userId: 7 })
    ).toBe(true);
    expect(
      canViewReservationInOperationalViews(collaborator, { userId: 8 })
    ).toBe(false);
    expect(canViewReservationInOperationalViews(admin, { userId: 8 })).toBe(
      true
    );
  });

  it("uses the same role scoped visibility rule for calendar reservations", () => {
    const collaborator = createMockUser({ role: "user", id: 3 });

    expect(
      canViewReservationInOperationalViews(collaborator, { userId: 3 })
    ).toBe(true);
    expect(
      canViewReservationInOperationalViews(collaborator, { userId: 4 })
    ).toBe(false);
  });
});

describe("reservation audit events", () => {
  it("builds a reservation_created event with actor, status and period metadata", () => {
    const event = buildReservationEvent({
      reservationId: 10,
      eventType: "reservation_created",
      actorUserId: 7,
      fromStatus: null,
      toStatus: "pendente",
      metadata: {
        itemIds: [1, 2],
        startDate: 1777400000000,
        endDate: 1777486400000,
      },
    });

    expect(event).toMatchObject({
      reservationId: 10,
      eventType: "reservation_created",
      actorUserId: 7,
      fromStatus: null,
      toStatus: "pendente",
    });
    expect(event.metadata).toEqual({
      itemIds: [1, 2],
      startDate: 1777400000000,
      endDate: 1777486400000,
    });
  });

  it("builds a reservation_cancelled event with the status transition", () => {
    const event = buildReservationEvent({
      reservationId: 11,
      eventType: "reservation_cancelled",
      actorUserId: 1,
      fromStatus: "pendente",
      toStatus: "cancelada",
    });

    expect(event.eventType).toBe("reservation_cancelled");
    expect(event.actorUserId).toBe(1);
    expect(event.fromStatus).toBe("pendente");
    expect(event.toStatus).toBe("cancelada");
  });

  it("builds a reservation_checked_out event with moved physical item ids", () => {
    const itemIds = collectReservationPhysicalItemIds([
      { itemId: 3 },
      { itemId: 3 },
      { itemId: 4 },
      { itemId: null },
    ]);
    const event = buildReservationEvent({
      reservationId: 12,
      eventType: "reservation_checked_out",
      actorUserId: 1,
      fromStatus: "pendente",
      toStatus: "ativa",
      metadata: { itemIds },
    });

    expect(event.metadata).toEqual({ itemIds: [3, 4] });
    expect(event.fromStatus).toBe("pendente");
    expect(event.toStatus).toBe("ativa");
  });

  it("builds a reservation_checked_in event with the concluded transition", () => {
    const event = buildReservationEvent({
      reservationId: 13,
      eventType: "reservation_checked_in",
      actorUserId: 1,
      fromStatus: "ativa",
      toStatus: "concluida",
      metadata: { itemIds: [5] },
    });

    expect(event.eventType).toBe("reservation_checked_in");
    expect(event.actorUserId).toBe(1);
    expect(event.fromStatus).toBe("ativa");
    expect(event.toStatus).toBe("concluida");
  });

  it("records changed fields for reservation_updated metadata", () => {
    const metadata = buildReservationUpdateMetadata(
      { startDate: 1000, endDate: 2000, notes: "Antes" },
      { startDate: 1000, endDate: 3000, notes: "Depois" }
    );

    expect(metadata).toEqual({
      changes: {
        endDate: { from: 2000, to: 3000 },
        notes: { from: "Antes", to: "Depois" },
      },
    });
  });

  it("blocks collaborators from reading audit events of another user's reservation", () => {
    const user = createMockUser({ role: "user", id: 2 });
    expect(() => assertReservationOwnerOrAdmin(user, { userId: 7 })).toThrow();
  });

  it("allows admins to read audit events of any reservation", () => {
    const admin = createMockUser({ role: "admin", id: 1 });
    expect(() => assertReservationOwnerOrAdmin(admin, { userId: 7 })).not.toThrow();
  });

  it("does not expose a direct event creation procedure", () => {
    const procedurePaths = Object.keys((appRouter as any)._def.procedures);

    expect(procedurePaths).toContain("reservation.events");
    expect(procedurePaths).not.toContain("reservation.createEvent");
    expect(procedurePaths).not.toContain("reservation.updateEvent");
    expect(procedurePaths).not.toContain("reservation.deleteEvent");
  });

  it("keeps old reservations without events renderable by the timeline helpers", () => {
    expect(hasReservationEvents([])).toBe(false);
    expect(
      buildReservationEventDescription({
        eventType: "reservation_checked_in",
        actor: "Admin",
        formattedDate: "28/04/2026 às 09:05",
      })
    ).toBe("Check-in realizado por Admin em 28/04/2026 às 09:05.");
  });
});
