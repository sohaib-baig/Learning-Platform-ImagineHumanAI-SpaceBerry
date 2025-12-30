/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HOST_PLAN_DEFAULT_TIER } from "@/lib/constants";

const { serverTimestampMock, deleteMock, adminDbStub } = vi.hoisted(() => ({
  serverTimestampMock: vi.fn(() => "server-timestamp"),
  deleteMock: vi.fn(() => "delete-field"),
  adminDbStub: {
    collection: vi.fn(),
    runTransaction: vi.fn(),
  },
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: serverTimestampMock,
    delete: deleteMock,
  },
}));

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: adminDbStub,
  adminAuth: {},
}));

import {
  applyHostPlanActivation,
  applyHostPlanCancellation,
  createOrReusePlaygroundClub,
} from "../onboarding";

type DocRef = { collection: string; id: string };

describe("onboarding db helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverTimestampMock.mockReturnValue("server-timestamp");
    deleteMock.mockReturnValue("delete-field");
  });

  it("keeps host privileges disabled while marking onboarding as pending activation", async () => {
    const userRef: DocRef = { collection: "users", id: "user-123" };
    const clubRef: DocRef = { collection: "clubs", id: "club-new" };
    const slugQueryFlag = { __type: "slugQuery" };

    const usersCollection = {
      doc: vi.fn(() => userRef),
    };

    const clubsCollection = {
      doc: vi.fn(() => clubRef),
      where: vi.fn(() => ({
        limit: vi.fn(() => slugQueryFlag),
      })),
    };

    adminDbStub.collection.mockImplementation((name: string) => {
      if (name === "users") {
        return usersCollection;
      }
      if (name === "clubs") {
        return clubsCollection;
      }
      throw new Error(`Unexpected collection ${name}`);
    });

    const userSnapshot = {
      displayName: "Test Host",
      onboarding: {
        clubDraft: {
          name: "Test Club",
          description: "A test club",
        },
        hostStatus: {},
        progress: {},
      },
      hostStatus: { enabled: false },
      clubsHosted: [],
      roles: { user: true, host: true },
    };

    let userUpdatePayload: Record<string, unknown> | null = null;

    const tx = {
      get: vi.fn(async (target: unknown) => {
        if (target === userRef) {
          return {
            exists: true,
            data: () => userSnapshot,
          };
        }
        if ((target as { __type?: string })?.__type === "slugQuery") {
          return { empty: true };
        }
        throw new Error("Unknown target for tx.get");
      }),
      set: vi.fn(),
      update: vi.fn((ref: unknown, data: Record<string, unknown>) => {
        if (ref === userRef) {
          userUpdatePayload = data;
        }
      }),
    };

    adminDbStub.runTransaction.mockImplementation(async (handler: any) =>
      handler(tx)
    );

    const result = await createOrReusePlaygroundClub("user-123");

    expect(result.clubId).toBe(clubRef.id);
    expect(result.slug).toBe("test-club");
    expect(userUpdatePayload).toBeTruthy();
    expect(userUpdatePayload).not.toHaveProperty("hostStatus");
    expect(userUpdatePayload).not.toHaveProperty("roles");

    const onboarding = userUpdatePayload!.onboarding as Record<string, any>;
    expect(onboarding.clubDraft.clubId).toBe(clubRef.id);
    expect(onboarding.hostStatus).toMatchObject({
      pendingActivation: true,
      activated: false,
      clubId: clubRef.id,
      billingTier: HOST_PLAN_DEFAULT_TIER,
    });
  });

  it("rejects reusing a clubId the user does not own", async () => {
    const userRef: DocRef = { collection: "users", id: "user-321" };
    const clubRef: DocRef = { collection: "clubs", id: "club-foreign" };

    const usersCollection = {
      doc: vi.fn(() => userRef),
    };

    const clubsCollection = {
      doc: vi.fn(() => clubRef),
    };

    adminDbStub.collection.mockImplementation((name: string) => {
      if (name === "users") {
        return usersCollection;
      }
      if (name === "clubs") {
        return clubsCollection;
      }
      throw new Error(`Unexpected collection ${name}`);
    });

    const userSnapshot = {
      displayName: "Curious Host",
      onboarding: {
        clubDraft: {
          clubId: clubRef.id,
          name: "Borrowed Club",
        },
        progress: {},
      },
      clubsHosted: [],
      roles: { user: true, host: true },
    };

    const foreignClubSnapshot = {
      hostId: "different-user",
      info: {
        slug: "foreign-club",
      },
      billingTier: HOST_PLAN_DEFAULT_TIER,
      memberCost: 0,
      billing: {},
    };

    const tx = {
      get: vi.fn(async (target: unknown) => {
        if (target === userRef) {
          return {
            exists: true,
            data: () => userSnapshot,
          };
        }
        if (target === clubRef) {
          return {
            exists: true,
            data: () => foreignClubSnapshot,
          };
        }
        throw new Error("Unknown target for tx.get");
      }),
      set: vi.fn(),
      update: vi.fn(),
    };

    adminDbStub.runTransaction.mockImplementation(async (handler: any) =>
      handler(tx)
    );

    await expect(createOrReusePlaygroundClub("user-321")).rejects.toThrow(
      /do not own/i
    );
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("updates an existing club only when the user is the host", async () => {
    const userRef: DocRef = { collection: "users", id: "user-abc" };
    const clubRef: DocRef = { collection: "clubs", id: "club-owned" };

    const usersCollection = {
      doc: vi.fn(() => userRef),
    };

    const clubsCollection = {
      doc: vi.fn(() => clubRef),
    };

    adminDbStub.collection.mockImplementation((name: string) => {
      if (name === "users") {
        return usersCollection;
      }
      if (name === "clubs") {
        return clubsCollection;
      }
      throw new Error(`Unexpected collection ${name}`);
    });

    const userSnapshot = {
      displayName: "Owner Host",
      onboarding: {
        clubDraft: {
          clubId: clubRef.id,
          name: "Updated Club Name",
          description: "Updated description",
        },
        hostStatus: {},
        progress: {},
      },
      clubsHosted: [],
      roles: { user: true, host: true },
    };

    const ownedClubSnapshot = {
      hostId: "user-abc",
      info: {
        name: "Old Name",
        slug: "owned-club",
        description: "Old description",
      },
      memberCost: 25,
      billingTier: HOST_PLAN_DEFAULT_TIER,
      planType: HOST_PLAN_DEFAULT_TIER,
      billing: {
        usage: {},
      },
      membersCount: 10,
      maxMembers: 100,
    };

    let userUpdatePayload: any = null;
    let clubUpdatePayload: any = null;

    const tx = {
      get: vi.fn(async (target: unknown) => {
        if (target === userRef) {
          return {
            exists: true,
            data: () => userSnapshot,
          };
        }
        if (target === clubRef) {
          return {
            exists: true,
            data: () => ownedClubSnapshot,
          };
        }
        throw new Error("Unknown target for tx.get");
      }),
      set: vi.fn(),
      update: vi.fn((ref: unknown, data: Record<string, unknown>) => {
        if (ref === userRef) {
          userUpdatePayload = data;
        } else if (ref === clubRef) {
          clubUpdatePayload = data;
        }
      }),
    };

    adminDbStub.runTransaction.mockImplementation(async (handler: any) =>
      handler(tx)
    );

    const result = await createOrReusePlaygroundClub("user-abc");

    expect(result.clubId).toBe(clubRef.id);
    expect(result.slug).toBe("owned-club");
    expect(clubUpdatePayload).toBeTruthy();
    expect(clubUpdatePayload).toMatchObject({
      "info.name": "Updated Club Name",
      "info.description": "Updated description",
      "info.slug": "owned-club",
      planType: HOST_PLAN_DEFAULT_TIER,
      billingTier: HOST_PLAN_DEFAULT_TIER,
    });
    expect(userUpdatePayload).toBeTruthy();
    expect(
      (userUpdatePayload!.onboarding as Record<string, any>).clubDraft.clubId
    ).toBe(clubRef.id);
    expect(userUpdatePayload!.clubsHosted).toEqual([clubRef.id]);
  });

  it("enables host account only during plan activation", async () => {
    const userRef: DocRef = { collection: "users", id: "user-456" };
    const clubRef: DocRef = { collection: "clubs", id: "club-999" };

    const usersCollection = {
      doc: vi.fn(() => userRef),
    };

    const clubsCollection = {
      doc: vi.fn(() => clubRef),
    };

    adminDbStub.collection.mockImplementation((name: string) => {
      if (name === "users") {
        return usersCollection;
      }
      if (name === "clubs") {
        return clubsCollection;
      }
      throw new Error(`Unexpected collection ${name}`);
    });

    const userSnapshot = {
      onboarding: {
        hostStatus: {
          pendingActivation: true,
          activated: false,
        },
        progress: {},
      },
      hostStatus: {
        enabled: false,
      },
      roles: { user: true, host: true },
      clubsHosted: [],
    };

    const clubSnapshot = {
      hostId: "user-456",
      membersCount: 0,
      billing: {},
    };

    let userUpdatePayload: any = null;
    let clubUpdatePayload: any = null;

    const tx = {
      getAll: vi.fn(async () => [
        {
          exists: true,
          data: () => userSnapshot,
        },
        {
          exists: true,
          data: () => clubSnapshot,
        },
      ]),
      update: vi.fn((ref: unknown, data: Record<string, unknown>) => {
        if (ref === userRef) {
          userUpdatePayload = data;
        } else if (ref === clubRef) {
          clubUpdatePayload = data;
        }
      }),
    };

    adminDbStub.runTransaction.mockImplementation(async (handler: any) =>
      handler(tx)
    );

    await applyHostPlanActivation({
      uid: "user-456",
      clubId: "club-999",
      tier: HOST_PLAN_DEFAULT_TIER,
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
    });

    expect(clubUpdatePayload).toBeTruthy();
    expect(clubUpdatePayload?.planType).toBe(HOST_PLAN_DEFAULT_TIER);
    expect(userUpdatePayload).toBeTruthy();

    const nextHostStatus = userUpdatePayload!.hostStatus as Record<string, any>;
    expect(nextHostStatus.enabled).toBe(true);
    expect(nextHostStatus.billingTier).toBe(HOST_PLAN_DEFAULT_TIER);

    const onboarding = userUpdatePayload!.onboarding as Record<string, any>;
    expect(onboarding.hostStatus.pendingActivation).toBe(false);
    expect(onboarding.hostStatus.activated).toBe(true);
    expect((userUpdatePayload!.roles as Record<string, boolean>).host).toBe(
      true
    );
  });

  it("rejects plan activation when club host does not match uid", async () => {
    const userRef: DocRef = { collection: "users", id: "user-123" };
    const clubRef: DocRef = { collection: "clubs", id: "club-abc" };

    const usersCollection = {
      doc: vi.fn(() => userRef),
    };

    const clubsCollection = {
      doc: vi.fn(() => clubRef),
    };

    adminDbStub.collection.mockImplementation((name: string) => {
      if (name === "users") {
        return usersCollection;
      }
      if (name === "clubs") {
        return clubsCollection;
      }
      throw new Error(`Unexpected collection ${name}`);
    });

    const userSnapshot = {
      onboarding: {
        hostStatus: {
          pendingActivation: true,
          activated: false,
        },
        progress: {},
      },
      hostStatus: {
        enabled: false,
      },
      roles: { user: true },
      clubsHosted: [],
    };

    const clubSnapshot = {
      hostId: "another-user",
      membersCount: 0,
      billing: {},
    };

    const tx = {
      getAll: vi.fn(async () => [
        {
          exists: true,
          data: () => userSnapshot,
        },
        {
          exists: true,
          data: () => clubSnapshot,
        },
      ]),
      update: vi.fn(),
    };

    adminDbStub.runTransaction.mockImplementation(async (handler: any) =>
      handler(tx)
    );

    await expect(
      applyHostPlanActivation({
        uid: "user-123",
        clubId: "club-abc",
        tier: HOST_PLAN_DEFAULT_TIER,
      })
    ).rejects.toThrow("club you do not own");

    expect(tx.update).not.toHaveBeenCalled();
  });

  it("downgrades club and onboarding data when a plan is cancelled", async () => {
    const userRef: DocRef = { collection: "users", id: "user-can" };
    const clubRef: DocRef = { collection: "clubs", id: "club-can" };

    const usersCollection = {
      doc: vi.fn(() => userRef),
    };

    const clubsCollection = {
      doc: vi.fn(() => clubRef),
    };

    adminDbStub.collection.mockImplementation((name: string) => {
      if (name === "users") {
        return usersCollection;
      }
      if (name === "clubs") {
        return clubsCollection;
      }
      throw new Error(`Unexpected collection ${name}`);
    });

    const userSnapshot = {
      onboarding: {
        hostStatus: {
          activated: true,
          pendingActivation: false,
          billingTier: "tier_b",
          stripeSubscriptionId: "sub_active",
        },
        progress: {},
      },
      hostStatus: {
        enabled: true,
        billingTier: "tier_b",
        stripeSubscriptionId: "sub_active",
      },
      roles: { user: true, host: true },
    };

    const clubSnapshot = {
      hostId: "user-can",
      membersCount: 250,
      billingTier: "tier_b",
      planType: "tier_b",
      maxMembers: 500,
      billing: {
        tier: "tier_b",
        transactionFeePercent: 3,
        softLimits: {},
        usage: {
          payingMembers: 250,
        },
        stripeSubscriptionId: "sub_active",
      },
    };

    let clubUpdatePayload: any = null;
    let userUpdatePayload: any = null;

    const tx = {
      getAll: vi.fn(async () => [
        {
          exists: true,
          data: () => userSnapshot,
        },
        {
          exists: true,
          data: () => clubSnapshot,
        },
      ]),
      update: vi.fn((ref: unknown, data: Record<string, unknown>) => {
        if (ref === clubRef) {
          clubUpdatePayload = data;
        } else if (ref === userRef) {
          userUpdatePayload = data;
        }
      }),
    };

    adminDbStub.runTransaction.mockImplementation(async (handler: any) =>
      handler(tx)
    );

    await applyHostPlanCancellation({
      uid: "user-can",
      clubId: "club-can",
      downgradeReason: "subscription_cancelled",
    });

    expect(clubUpdatePayload).toBeTruthy();
    expect(clubUpdatePayload?.planType).toBe(HOST_PLAN_DEFAULT_TIER);
    expect(clubUpdatePayload?.billingTier).toBe(HOST_PLAN_DEFAULT_TIER);
    expect(clubUpdatePayload?.["billing.tier"]).toBe(HOST_PLAN_DEFAULT_TIER);
    expect(clubUpdatePayload?.["billing.stripeSubscriptionId"]).toBe(
      "delete-field"
    );
    expect(userUpdatePayload).toBeTruthy();
    const nextHostStatus = userUpdatePayload!.hostStatus as Record<
      string,
      unknown
    >;
    expect(nextHostStatus.enabled).toBe(false);
    expect(nextHostStatus.billingTier).toBe(HOST_PLAN_DEFAULT_TIER);
    expect(nextHostStatus.stripeSubscriptionId).toBe("delete-field");
    const onboarding = userUpdatePayload!.onboarding as Record<string, any>;
    expect(onboarding.hostStatus.activated).toBe(false);
    expect(onboarding.hostStatus.billingTier).toBe(HOST_PLAN_DEFAULT_TIER);
    expect(onboarding.hostStatus.stripeSubscriptionId).toBe("delete-field");
  });
});
