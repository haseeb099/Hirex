/**
 * server/applyKit.test.ts
 * Unit tests for the applyKit tRPC router procedures.
 * Uses mocked DB helpers and LLM invocations so tests run without a live DB.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock DB helpers ────────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getProfile: vi.fn().mockResolvedValue({
      id: 1,
      userId: 1,
      fullName: "Jane Dev",
      headline: "Senior Full-Stack Engineer",
      skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
      experienceYears: 6,
      preferredRoles: ["Software Engineer", "Full-Stack Developer"],
      targetSalary: 120000,
      resumeText: "6 years building scalable web apps with TypeScript and React.",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    getRecentMemoryContext: vi.fn().mockResolvedValue(
      "Past outcome: Applied to Stripe as SWE, reached final round."
    ),
    saveApplyKit: vi.fn().mockResolvedValue({
      id: 42,
      userId: 1,
      jobId: null,
      jobTitle: "Senior Software Engineer",
      company: "Acme Corp",
      jobDescription: "Build scalable TypeScript services.",
      atsCV: "SUMMARY\nSenior engineer with 6 years TypeScript experience...",
      coverLetter: "Dear Hiring Manager,\n\nI am excited to apply...",
      linkedinSummary: "Passionate TypeScript engineer with 6 years experience...",
      interviewPrep: "Q1: Tell me about yourself\nA1: I am a senior engineer...",
      matchScore: 72,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    getApplyKitsByUser: vi.fn().mockResolvedValue([
      {
        id: 42,
        userId: 1,
        jobTitle: "Senior Software Engineer",
        company: "Acme Corp",
        matchScore: 72,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
    getApplyKitById: vi.fn().mockResolvedValue({
      id: 42,
      userId: 1,
      jobTitle: "Senior Software Engineer",
      company: "Acme Corp",
      atsCV: "SUMMARY\nSenior engineer...",
      coverLetter: "Dear Hiring Manager...",
      linkedinSummary: "Passionate TypeScript engineer...",
      interviewPrep: "Q1: Tell me about yourself\nA1: ...",
      matchScore: 72,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    // Keep other helpers working
    getJobsByUser: vi.fn().mockResolvedValue([]),
    getApplicationsByUser: vi.fn().mockResolvedValue([]),
    countMemoryEntries: vi.fn().mockResolvedValue(0),
    getMemoryEntries: vi.fn().mockResolvedValue([]),
    addMemoryEntry: vi.fn().mockResolvedValue(undefined),
    createApplication: vi.fn().mockResolvedValue({ id: 1 }),
    updateApplicationStatus: vi.fn().mockResolvedValue(undefined),
    upsertProfile: vi.fn().mockResolvedValue(undefined),
    saveJob: vi.fn().mockResolvedValue({ id: 1 }),
    // Credit system — always grant credits in tests
    deductCredit: vi.fn().mockResolvedValue(true),
    getUserCredits: vi.fn().mockResolvedValue({ balance: 100, plan: "pro" }),
    getUserProfile: vi.fn().mockResolvedValue(null),
    saveUserProfile: vi.fn().mockResolvedValue(null),
    getRankedJobs: vi.fn().mockResolvedValue([]),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  };
});

// ── Mock LLM ──────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "Generated content from LLM mock.",
        },
      },
    ],
  }),
}));

// ── Test context factory ───────────────────────────────────────────────────────
function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-001",
      name: "Jane Dev",
      email: "jane@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("applyKit.list", () => {
  it("returns a list of apply kits for the authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.applyKit.list({ limit: 20 });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toMatchObject({ jobTitle: "Senior Software Engineer", company: "Acme Corp" });
  });
});

describe("applyKit.get", () => {
  it("returns a single kit by ID", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.applyKit.get({ id: 42 });
    expect(result).toMatchObject({ id: 42, matchScore: 72 });
  });
});

describe("applyKit.generate", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-apply LLM mock after clearAllMocks
    const llmMod = await import("./_core/llm");
    vi.mocked(llmMod.invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "Generated content from LLM mock." } }],
    });
  });

  it("accepts a job description and returns a saved kit", async () => {
    const { saveApplyKit, getProfile, getRecentMemoryContext } = vi.mocked(
      await import("./db")
    );
    getProfile.mockResolvedValue({
      id: 1,
      userId: 1,
      fullName: "Jane Dev",
      headline: "Senior Full-Stack Engineer",
      skills: ["TypeScript", "React"],
      experienceYears: 6,
      preferredRoles: ["Software Engineer"],
      targetSalary: 120000,
      resumeText: "6 years TypeScript.",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    getRecentMemoryContext.mockResolvedValue("");
    saveApplyKit.mockResolvedValue({
      id: 99,
      userId: 1,
      jobId: null,
      jobTitle: "Backend Engineer",
      company: "Stripe",
      jobDescription: "Build TypeScript microservices.",
      atsCV: "SUMMARY\n...",
      coverLetter: "Dear Hiring Manager...",
      linkedinSummary: "TypeScript engineer...",
      interviewPrep: "Q1: ...",
      matchScore: 65,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.applyKit.generate({
      jobDescription: "Build TypeScript microservices at scale. Requires Node.js, PostgreSQL, REST APIs.",
      jobTitle: "Backend Engineer",
      company: "Stripe",
    });

    expect(result).toMatchObject({ id: 99, jobTitle: "Backend Engineer", company: "Stripe" });
    expect(saveApplyKit).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, jobTitle: "Backend Engineer", company: "Stripe" })
    );
  });

  it("requires jobDescription to be at least 10 characters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.applyKit.generate({ jobDescription: "short", jobTitle: "Role", company: "Co" })
    ).rejects.toThrow();
  });

  it("rejects jobDescription over 20000 characters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.applyKit.generate({ jobDescription: "x".repeat(20001), jobTitle: "Role", company: "Co" })
    ).rejects.toThrow();
  });

  it("uses explicit jobTitle and company", async () => {
    const { saveApplyKit } = vi.mocked(await import("./db"));
    saveApplyKit.mockResolvedValue({
      id: 100,
      userId: 1,
      jobId: null,
      jobTitle: "the role",
      company: "the company",
      jobDescription: "A valid job description with enough characters.",
      atsCV: "...",
      coverLetter: "...",
      linkedinSummary: "...",
      interviewPrep: "...",
      matchScore: 40,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.applyKit.generate({
      jobDescription: "A valid job description with enough characters to pass validation.",
      jobTitle: "the role",
      company: "the company",
    });
    expect(result).toBeDefined();
    expect(saveApplyKit).toHaveBeenCalledWith(
      expect.objectContaining({ jobTitle: "the role", company: "the company" })
    );
  });

  it("calculates a non-negative matchScore", async () => {
    const { saveApplyKit } = vi.mocked(await import("./db"));
    let capturedArgs: Record<string, unknown> = {};
    saveApplyKit.mockImplementation(async (args) => {
      capturedArgs = args as Record<string, unknown>;
      return { id: 101, ...args, createdAt: new Date(), updatedAt: new Date() };
    });

    const caller = appRouter.createCaller(makeCtx());
    await caller.applyKit.generate({
      jobDescription: "TypeScript React Node.js PostgreSQL Docker Kubernetes REST API microservices.",
      jobTitle: "Full-Stack Engineer",
      company: "GitHub",
    });

    expect(typeof capturedArgs.matchScore).toBe("number");
    expect(capturedArgs.matchScore as number).toBeGreaterThanOrEqual(0);
    expect(capturedArgs.matchScore as number).toBeLessThanOrEqual(100);
  });

  it("is protected — throws UNAUTHORIZED for unauthenticated callers", async () => {
    const unauthCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(unauthCtx);
    await expect(
      caller.applyKit.generate({
        jobDescription: "A valid job description with enough characters to pass validation.",
        jobTitle: "Role",
        company: "Co",
      })
    ).rejects.toThrow();
  });
});
