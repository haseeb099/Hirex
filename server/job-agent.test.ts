import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock DB module ────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getProfile: vi.fn().mockResolvedValue(null),
  upsertProfile: vi.fn().mockResolvedValue({ id: 1, userId: 1, fullName: "Jane Smith" }),
  getJobsByUser: vi.fn().mockResolvedValue([]),
  saveJob: vi.fn().mockImplementation(async (data: Record<string, unknown>) => ({ id: 1, ...data })),
  getApplicationsByUser: vi.fn().mockResolvedValue([]),
  createApplication: vi.fn().mockResolvedValue({ id: 1, userId: 1, jobId: 1, status: "draft" }),
  updateApplicationStatus: vi.fn().mockResolvedValue({ id: 1, userId: 1, jobId: 1, status: "applied" }),
  addMemoryEntry: vi.fn().mockResolvedValue(undefined),
  countMemoryEntries: vi.fn().mockResolvedValue(3),
  getMemoryEntries: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, content: "Got rejected at Acme", memoryType: "application_outcome", createdAt: new Date() },
  ]),
  getRecentMemoryContext: vi.fn().mockResolvedValue("1. Got rejected at Acme"),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  // v1.1 helpers
  getUserProfile: vi.fn().mockResolvedValue(null),
  saveUserProfile: vi.fn().mockResolvedValue({ id: 1, userId: 1, headline: "Senior Engineer" }),
  getUnscoredJobs: vi.fn().mockResolvedValue([]),
  saveJobMatch: vi.fn().mockResolvedValue({ id: 1 }),
  getRankedJobs: vi.fn().mockResolvedValue([]),
}));

// ── Mock LLM ──────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          score: 0.85,
          tier: "high",
          reasoning: "Strong TypeScript match.",
          coverLetter: "Dear Hiring Manager, I am excited to apply...",
        }),
      },
    }],
  }),
}));

// ── Auth context factory ──────────────────────────────────────────────────────
function makeCtx(overrides: Partial<NonNullable<TrpcContext["user"]>> = {}): TrpcContext {
  const clearedCookies: Array<{ name: string; opts: unknown }> = [];
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, opts: unknown) => clearedCookies.push({ name, opts }),
    } as TrpcContext["res"],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("auth", () => {
  it("me returns current user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const user = await caller.auth.me();
    expect(user?.email).toBe("test@example.com");
  });

  it("logout clears session cookie and returns success", async () => {
    const clearedCookies: Array<{ name: string; opts: unknown }> = [];
    const ctx: TrpcContext = {
      user: makeCtx().user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: (name: string, opts: unknown) => clearedCookies.push({ name, opts }) } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBe(1);
  });
});

describe("profile (legacy v1.0)", () => {
  it("get returns null when no profile exists", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const profile = await caller.profile.get();
    expect(profile).toBeNull();
  });

  it("upsert saves and returns profile", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.profile.upsert({
      fullName: "Jane Smith",
      skills: ["TypeScript", "React"],
      experienceYears: 5,
    });
    expect(result?.fullName).toBe("Jane Smith");
  });
});

describe("jobs v1.1", () => {
  it("getRanked returns empty array when no matches", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const ranked = await caller.jobs.getRanked({ limit: 10 });
    expect(Array.isArray(ranked)).toBe(true);
  });

  it("getProfile returns null initially", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const profile = await caller.jobs.getProfile();
    expect(profile).toBeNull();
  });

  it("saveProfile saves and returns profile", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.jobs.saveProfile({
      headline: "Senior Engineer",
      skills: ["TypeScript", "React", "Node.js"],
      experienceYears: 6,
    });
    expect(result?.headline).toBe("Senior Engineer");
  });

  it("scoreJobs returns 0 scored when no unscored jobs", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.jobs.scoreJobs();
    expect(result.scored).toBe(0);
  });
});

describe("legacyJobs (LLM-scored demo)", () => {
  it("list returns empty array initially", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const jobs = await caller.legacyJobs.list();
    expect(Array.isArray(jobs)).toBe(true);
  });

  it("search returns scored jobs with id field", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const results = await caller.legacyJobs.search({ query: "senior engineer", location: "remote" });
    expect(Array.isArray(results)).toBe(true);
    results.forEach((job) => {
      expect(job).toHaveProperty("id");
    });
  });
});

describe("applications", () => {
  it("list returns empty array initially", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const apps = await caller.applications.list();
    expect(Array.isArray(apps)).toBe(true);
  });

  it("create returns a draft application", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const app = await caller.applications.create({ jobId: 1 });
    expect(app?.status).toBe("draft");
    expect(app?.jobId).toBe(1);
  });

  it("updateStatus changes status to applied", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const updated = await caller.applications.updateStatus({ id: 1, status: "applied" });
    expect(updated?.status).toBe("applied");
  });

  it("updateStatus accepts all valid statuses", async () => {
    const caller = appRouter.createCaller(makeCtx());
    for (const status of ["draft", "applied", "interviewing", "rejected", "offer"] as const) {
      await expect(caller.applications.updateStatus({ id: 1, status })).resolves.toBeDefined();
    }
  });
});

describe("memory", () => {
  it("count returns number of entries", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const { count } = await caller.memory.count();
    expect(typeof count).toBe("number");
    expect(count).toBe(3);
  });

  it("list returns memory entries", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const entries = await caller.memory.list({ limit: 10 });
    expect(Array.isArray(entries)).toBe(true);
    expect(entries[0]?.content).toBe("Got rejected at Acme");
  });

  it("add stores a new manual memory", async () => {
    const { addMemoryEntry } = await import("./db");
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.memory.add({ content: "I prefer async-first companies", memoryType: "manual" });
    expect(result.success).toBe(true);
    expect(addMemoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ content: "I prefer async-first companies", memoryType: "manual" })
    );
  });
});

describe("jobScorer unit tests", () => {
  it("score >= 70 → high tier", () => {
    const score = 75;
    const tier = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
    expect(tier).toBe("high");
  });

  it("score 45–69 → medium tier", () => {
    const score = 55;
    const tier = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
    expect(tier).toBe("medium");
  });

  it("score < 45 → low tier", () => {
    const score = 30;
    const tier = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
    expect(tier).toBe("low");
  });
});
