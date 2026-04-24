import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

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
});

describe("dashboard router - access control", () => {
  it("rejects unauthenticated user from dashboard stats", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.stats()).rejects.toThrow();
  });
});
