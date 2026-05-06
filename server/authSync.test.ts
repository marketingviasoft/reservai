import { describe, expect, it, vi } from "vitest";
import type { InsertUser, User } from "../drizzle/schema";
import {
  bootstrapAuthenticatedUserFromProfile,
  AuthFailure,
  buildSupabaseUserProfile,
  resolveAuthenticatedUserFromProfile,
  shouldSyncUser,
} from "./_core/sdk";
import { USER_NOT_PROVISIONED } from "../shared/authErrors";

function createUser(overrides?: Partial<User>): User {
  return {
    id: 1,
    openId: "supabase-user-id",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "supabase",
    role: "user",
    phone: null,
    extension: null,
    department: null,
    createdAt: new Date("2026-04-30T10:00:00.000Z"),
    updatedAt: new Date("2026-04-30T10:00:00.000Z"),
    lastSignedIn: new Date("2026-04-30T10:00:00.000Z"),
    ...overrides,
  };
}

const profile: InsertUser = {
  openId: "supabase-user-id",
  name: "Test User",
  email: "test@example.com",
  loginMethod: "supabase",
  lastSignedIn: new Date("2026-04-30T10:00:00.000Z"),
};

describe("auth user synchronization", () => {
  it("does not upsert when user already exists by openId", async () => {
    const existingUser = createUser();
    const deps = {
      getUserByOpenId: vi.fn().mockResolvedValue(existingUser),
      upsertUser: vi.fn(),
    };

    const result = await bootstrapAuthenticatedUserFromProfile(profile, deps);

    expect(result).toBe(existingUser);
    expect(deps.getUserByOpenId).toHaveBeenCalledTimes(1);
    expect(deps.getUserByOpenId).toHaveBeenCalledWith("supabase-user-id");
    expect(deps.upsertUser).not.toHaveBeenCalled();
  });

  it("upserts once when user does not exist and then returns created user", async () => {
    const createdUser = createUser();
    const deps = {
      getUserByOpenId: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(createdUser),
      upsertUser: vi.fn().mockResolvedValue(undefined),
    };

    const result = await bootstrapAuthenticatedUserFromProfile(profile, deps);

    expect(result).toBe(createdUser);
    expect(deps.getUserByOpenId).toHaveBeenCalledTimes(2);
    expect(deps.upsertUser).toHaveBeenCalledTimes(1);
    expect(deps.upsertUser).toHaveBeenCalledWith(profile);
  });

  it("deduplicates concurrent upserts for the same new user", async () => {
    const createdUser = createUser();
    let finishUpsert: (() => void) | undefined;
    const upsertPromise = new Promise<void>((resolve) => {
      finishUpsert = resolve;
    });
    const deps = {
      getUserByOpenId: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(createdUser)
        .mockResolvedValueOnce(createdUser),
      upsertUser: vi.fn().mockReturnValue(upsertPromise),
    };

    const firstAuth = bootstrapAuthenticatedUserFromProfile(profile, deps);
    const secondAuth = bootstrapAuthenticatedUserFromProfile(profile, deps);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(deps.upsertUser).toHaveBeenCalledTimes(1);
    finishUpsert?.();

    await expect(Promise.all([firstAuth, secondAuth])).resolves.toEqual([
      createdUser,
      createdUser,
    ]);
    expect(deps.upsertUser).toHaveBeenCalledTimes(1);
    expect(deps.getUserByOpenId).toHaveBeenCalledTimes(4);
  });

  it("reports USER_NOT_PROVISIONED without upsert when user does not exist", async () => {
    const deps = {
      getUserByOpenId: vi.fn().mockResolvedValue(undefined),
      upsertUser: vi.fn(),
    };

    await expect(
      resolveAuthenticatedUserFromProfile(profile, deps)
    ).rejects.toMatchObject({
      authCode: USER_NOT_PROVISIONED,
    });
    await expect(
      resolveAuthenticatedUserFromProfile(profile, deps)
    ).rejects.toBeInstanceOf(AuthFailure);
    expect(deps.upsertUser).not.toHaveBeenCalled();
  });

  it("does not let upsert failure affect an existing user", async () => {
    const existingUser = createUser();
    const deps = {
      getUserByOpenId: vi.fn().mockResolvedValue(existingUser),
      upsertUser: vi.fn().mockRejectedValue(new Error("User upsert timed out")),
    };

    await expect(
      bootstrapAuthenticatedUserFromProfile(profile, deps)
    ).resolves.toBe(existingUser);
    expect(deps.upsertUser).not.toHaveBeenCalled();
  });

  it("runs first-user/admin logic only through upsert for new users", async () => {
    const existingUser = createUser();
    const deps = {
      getUserByOpenId: vi.fn().mockResolvedValue(existingUser),
      upsertUser: vi.fn(),
    };

    await resolveAuthenticatedUserFromProfile(profile, deps);

    // countUsers lives inside db.upsertUser. Existing users never enter that path.
    expect(deps.upsertUser).not.toHaveBeenCalled();
  });

  it("keeps lookup database errors diagnostic", async () => {
    const deps = {
      getUserByOpenId: vi.fn().mockRejectedValue(new Error("User lookup DB unavailable")),
      upsertUser: vi.fn(),
    };

    await expect(
      resolveAuthenticatedUserFromProfile(profile, deps)
    ).rejects.toThrow("User lookup DB unavailable");
    expect(deps.upsertUser).not.toHaveBeenCalled();
  });

  it("builds a Supabase user profile without exposing tokens", () => {
    const signedInAt = new Date("2026-04-30T10:00:00.000Z");
    const result = buildSupabaseUserProfile(
      {
        id: "supabase-user-id",
        email: "test@example.com",
        user_metadata: { full_name: "Supabase User" },
      },
      signedInAt
    );

    expect(result).toEqual({
      openId: "supabase-user-id",
      name: "Supabase User",
      email: "test@example.com",
      loginMethod: "supabase",
      lastSignedIn: signedInAt,
    });
  });

  it("syncs only missing users", () => {
    expect(shouldSyncUser(undefined)).toBe(true);
    expect(shouldSyncUser(createUser())).toBe(false);
  });
});
