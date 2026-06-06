import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addMemoryEntry,
  countMemoryEntries,
  createApplication,
  getApplicationsByUser,
  getApplyKitById,
  getApplyKitsByUser,
  getJobsByUser,
  getMemoryEntries,
  getProfile,
  getRecentMemoryContext,
  saveApplyKit,
  saveJob,
  updateApplicationStatus,
  upsertProfile,
} from "./db";
import { jobsRouter } from "./routers/jobs";

// ── Application status (lowercase to match updated schema) ────────────────────
const APPLICATION_STATUSES = ["draft", "applied", "interviewing", "rejected", "offer"] as const;

// ── LLM job scoring helper ────────────────────────────────────────────────────
async function scoreJobWithLLM(
  jobTitle: string,
  jobDescription: string,
  jobRequirements: string,
  profileSummary: string,
  memoryContext: string
): Promise<{ score: number; tier: "high" | "medium" | "low"; reasoning: string; coverLetter: string }> {
  const systemPrompt = `You are an expert career coach and job-matching AI.
Given a candidate profile and a job description, return a JSON object with exactly these fields:
- "score": number 0.0–1.0 (how well the job matches the candidate)
- "tier": "high" (score>=0.7), "medium" (score>=0.45), or "low" (score<0.45)
- "reasoning": 2-3 sentence explanation of the match
- "coverLetter": a concise, personalised 3-paragraph cover letter for this specific job
Respond ONLY with valid JSON.`;

  const userContent = `CANDIDATE PROFILE:
${profileSummary}

JOB TITLE: ${jobTitle}
JOB DESCRIPTION:
${jobDescription.slice(0, 2000)}

REQUIREMENTS:
${jobRequirements.slice(0, 800)}

${memoryContext ? `RELEVANT PAST EXPERIENCE (from memory):\n${memoryContext}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    });
    const content = (response.choices[0]?.message?.content as string) ?? "{}";
    const parsed = JSON.parse(content);
    const score = Math.min(1, Math.max(0, Number(parsed.score) || 0));
    const tier: "high" | "medium" | "low" = score >= 0.7 ? "high" : score >= 0.45 ? "medium" : "low";
    return {
      score,
      tier,
      reasoning: parsed.reasoning ?? "",
      coverLetter: parsed.coverLetter ?? "",
    };
  } catch {
    return { score: 0.5, tier: "medium", reasoning: "Scoring unavailable.", coverLetter: "" };
  }
}

// ── Sample jobs for demo (legacy search flow) ─────────────────────────────────
function generateSampleJobs(query: string, location: string) {
  const roles = [
    { title: `Senior ${query}`, company: "Stripe", jobType: "Full-time", salaryMin: 160000, salaryMax: 220000 },
    { title: `${query} Engineer`, company: "Vercel", jobType: "Full-time", salaryMin: 140000, salaryMax: 190000 },
    { title: `Staff ${query}`, company: "Linear", jobType: "Full-time", salaryMin: 180000, salaryMax: 250000 },
    { title: `${query} Lead`, company: "Notion", jobType: "Full-time", salaryMin: 155000, salaryMax: 210000 },
    { title: `Principal ${query}`, company: "Figma", jobType: "Full-time", salaryMin: 200000, salaryMax: 280000 },
    { title: `${query} Architect`, company: "Anthropic", jobType: "Full-time", salaryMin: 220000, salaryMax: 320000 },
  ];

  const descriptions = [
    "We are looking for a talented engineer to join our growing team. You will work on cutting-edge distributed systems, collaborate with world-class engineers, and ship features used by millions of developers worldwide. Strong TypeScript, React, and Node.js skills required.",
    "Join our platform team to build the infrastructure that powers the next generation of web development. You'll work on performance-critical systems, design APIs, and contribute to open-source projects. Experience with Rust or Go is a plus.",
    "We need a passionate engineer to help us build the future of work. You'll own entire product areas, mentor junior engineers, and work directly with founders. Strong background in system design and distributed databases required.",
    "Shape the product that millions of teams use every day. You'll work across the full stack, from database query optimization to pixel-perfect UI. We value craftsmanship, attention to detail, and deep technical expertise.",
    "Help us build design tools used by the world's best designers. You'll work on complex rendering pipelines, real-time collaboration systems, and developer APIs. Experience with WebGL or Canvas is highly valued.",
    "Work on the most important AI safety research happening today. You'll build infrastructure for training and evaluating large language models, work with cutting-edge ML systems, and contribute to research that matters.",
  ];

  return roles.map((r, i) => ({
    externalId: `demo-${r.company.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
    title: r.title,
    company: r.company,
    location: location || "Remote",
    jobType: r.jobType,
    description: descriptions[i % descriptions.length]!,
    requirements: "5+ years of software engineering experience, strong TypeScript/JavaScript skills, experience with distributed systems, excellent communication skills.",
    salaryMin: r.salaryMin,
    salaryMax: r.salaryMax,
    salaryCurrency: "USD",
    url: `https://example.com/jobs/${r.company.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`.slice(0, 768),
    source: "demo",
    isActive: true as const,
  }));
}

// ── App Router ────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── v1.1 Jobs router (Remotive + scorer) ──────────────────────────────────
  jobs: jobsRouter,

  // ── Legacy profile (v1.0 candidate_profiles table) ────────────────────────
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getProfile(ctx.user.id);
    }),

    upsert: protectedProcedure
      .input(
        z.object({
          fullName: z.string().optional(),
          headline: z.string().optional(),
          resumeText: z.string().optional(),
          skills: z.array(z.string()).optional(),
          experienceYears: z.number().int().min(0).max(50).optional(),
          preferredRoles: z.array(z.string()).optional(),
          preferredLocations: z.array(z.string()).optional(),
          targetSalary: z.number().int().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return upsertProfile({ userId: ctx.user.id, ...input });
      }),
  }),

  // ── Legacy job search (LLM-scored demo jobs) ──────────────────────────────
  legacyJobs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getJobsByUser(ctx.user.id);
    }),

    search: protectedProcedure
      .input(
        z.object({
          query: z.string().min(1).max(200),
          location: z.string().max(200).optional().default("remote"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const profile = await getProfile(ctx.user.id);
        const memoryContext = await getRecentMemoryContext(ctx.user.id, 5);

        const profileSummary = profile
          ? `Name: ${profile.fullName ?? "Unknown"}
Headline: ${profile.headline ?? ""}
Skills: ${(profile.skills as string[] | null)?.join(", ") ?? "Not specified"}
Experience: ${profile.experienceYears ?? 0} years
Preferred roles: ${(profile.preferredRoles as string[] | null)?.join(", ") ?? "Any"}
Preferred locations: ${(profile.preferredLocations as string[] | null)?.join(", ") ?? "Any"}
Target salary: ${profile.targetSalary ? `$${profile.targetSalary.toLocaleString()}` : "Flexible"}
Resume summary: ${(profile.resumeText ?? "").slice(0, 1000)}`
          : `Searching for: ${input.query}`;

        const rawJobs = generateSampleJobs(input.query, input.location);

        const scored = await Promise.all(
          rawJobs.map(async (raw) => {
            const scoring = await scoreJobWithLLM(
              raw.title,
              raw.description,
              raw.requirements,
              profileSummary,
              memoryContext
            );
            return saveJob({
              ...raw,
              // Store score info in description suffix for legacy display
              description: `${raw.description}\n\n[Score: ${(scoring.score * 100).toFixed(0)}% | ${scoring.tier}]\n${scoring.reasoning}`,
            });
          })
        );

        return scored
          .filter(Boolean)
          .sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0));
      }),
  }),

  // ── Applications ──────────────────────────────────────────────────────────
  applications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const apps = await getApplicationsByUser(ctx.user.id);
      const jobsList = await getJobsByUser(ctx.user.id);
      const jobMap = new Map(jobsList.map((j) => [j.id, j]));
      return apps.map((app) => ({ ...app, job: jobMap.get(app.jobId) ?? null }));
    }),

    create: protectedProcedure
      .input(z.object({ jobId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        return createApplication({ userId: ctx.user.id, jobId: input.jobId, status: "draft" });
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number().int(),
          status: z.enum(APPLICATION_STATUSES),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updated = await updateApplicationStatus(input.id, ctx.user.id, input.status, input.notes);
        if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

        // Store outcome in memory on significant status transitions
        if (input.status === "offer" || input.status === "rejected" || input.status === "interviewing") {
          const jobsList = await getJobsByUser(ctx.user.id);
          const job = jobsList.find((j) => j.id === updated.jobId);
          if (job) {
            await addMemoryEntry({
              userId: ctx.user.id,
              content: `Application for "${job.title}" at ${job.company} (${job.location}) reached status: ${input.status}. ${input.notes ? `Notes: ${input.notes}` : ""}`,
              memoryType: "application_outcome",
              metadata: { jobId: job.id, status: input.status },
            });
          }
        }
        return updated;
      }),
  }),

  // ── Apply Kit (AI-generated application materials) ──────────────────────
  applyKit: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getApplyKitsByUser(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ ctx, input }) => {
        return getApplyKitById(input.id, ctx.user.id);
      }),

    generate: protectedProcedure
      .input(
        z.object({
          jobDescription: z.string().min(10).max(20000),
          jobTitle: z.string().max(255).optional().default(""),
          company: z.string().max(255).optional().default(""),
          jobId: z.number().int().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const profile = await getProfile(ctx.user.id);
        const memoryContext = await getRecentMemoryContext(ctx.user.id, 5);

        const profileSummary = profile
          ? `Full Name: ${profile.fullName ?? "Candidate"}
Headline: ${profile.headline ?? ""}
Skills: ${(profile.skills as string[] | null)?.join(", ") ?? "Not specified"}
Experience: ${profile.experienceYears ?? 0} years
Preferred Roles: ${(profile.preferredRoles as string[] | null)?.join(", ") ?? "Any"}
Target Salary: ${profile.targetSalary ? `$${profile.targetSalary.toLocaleString()}` : "Flexible"}
Resume:\n${(profile.resumeText ?? "").slice(0, 3000)}`
          : "No profile set up yet. Please complete your profile first.";

        const jd = input.jobDescription.slice(0, 6000);
        const jobTitle = input.jobTitle || "the role";
        const company = input.company || "the company";

        const [atsCVRes, coverLetterRes, linkedinRes, interviewRes] = await Promise.all([
          invokeLLM({
            messages: [
              { role: "system", content: "You are an expert ATS resume writer. Rewrite the candidate's resume to maximise keyword match with the job description. Mirror exact keywords from the JD; use strong action verbs; quantify achievements; keep to 1 page equivalent; use section headers: SUMMARY, EXPERIENCE, SKILLS, EDUCATION. Do NOT fabricate experience. Output plain text only." },
              { role: "user", content: `JOB TITLE: ${jobTitle}\nCOMPANY: ${company}\n\nJOB DESCRIPTION:\n${jd}\n\nCANDIDATE PROFILE:\n${profileSummary}${memoryContext ? `\n\nPAST APPLICATION OUTCOMES:\n${memoryContext}` : ""}` },
            ],
          }),
          invokeLLM({
            messages: [
              { role: "system", content: "You are an expert career coach writing ATS-friendly cover letters. Write a 3-paragraph cover letter: (1) Opening - why this company and role excites the candidate. (2) Body - 2-3 concrete achievements that address the JD requirements. (3) Closing - confident call to action. Use the candidate's name. Mirror JD keywords. Under 350 words. Output plain text only." },
              { role: "user", content: `JOB TITLE: ${jobTitle}\nCOMPANY: ${company}\n\nJOB DESCRIPTION:\n${jd}\n\nCANDIDATE PROFILE:\n${profileSummary}` },
            ],
          }),
          invokeLLM({
            messages: [
              { role: "system", content: "You are a LinkedIn profile expert. Write a 3-5 sentence LinkedIn About section optimised for the target role. Open with a strong hook; highlight 2-3 key skills from the JD; mention a notable achievement; end with what the candidate is seeking. Conversational, first-person, under 200 words. Output plain text only." },
              { role: "user", content: `TARGET ROLE: ${jobTitle} at ${company}\n\nJOB DESCRIPTION:\n${jd.slice(0, 2000)}\n\nCANDIDATE PROFILE:\n${profileSummary}` },
            ],
          }),
          invokeLLM({
            messages: [
              { role: "system", content: "You are an expert interview coach. Generate exactly 5 likely interview questions with suggested answers. Format:\nQ1: [question]\nA1: [2-3 sentence answer using STAR method, referencing the candidate's actual experience]\n\nQ2: ...\n\nMake questions specific to the JD. Output plain text only." },
              { role: "user", content: `JOB TITLE: ${jobTitle}\nCOMPANY: ${company}\n\nJOB DESCRIPTION:\n${jd}\n\nCANDIDATE PROFILE:\n${profileSummary}` },
            ],
          }),
        ]);

        const atsCV = (atsCVRes.choices[0]?.message?.content as string) ?? "";
        const coverLetter = (coverLetterRes.choices[0]?.message?.content as string) ?? "";
        const linkedinSummary = (linkedinRes.choices[0]?.message?.content as string) ?? "";
        const interviewPrep = (interviewRes.choices[0]?.message?.content as string) ?? "";

        const jdWords = new Set(jd.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
        const resumeWords = profileSummary.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
        const matchCount = resumeWords.filter((w) => jdWords.has(w)).length;
        const matchScore = Math.min(100, Math.round((matchCount / Math.max(jdWords.size, 1)) * 200));

        return saveApplyKit({
          userId: ctx.user.id,
          jobId: input.jobId,
          jobTitle,
          company,
          jobDescription: input.jobDescription,
          atsCV,
          coverLetter,
          linkedinSummary,
          interviewPrep,
          matchScore,
        });
      }),
  }),

  // ── Memory ────────────────────────────────────────────────────────────────
  memory: router({
    count: protectedProcedure.query(async ({ ctx }) => {
      return { count: await countMemoryEntries(ctx.user.id) };
    }),

    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).optional().default(20) }))
      .query(async ({ ctx, input }) => {
        return getMemoryEntries(ctx.user.id, input.limit);
      }),

    add: protectedProcedure
      .input(z.object({ content: z.string().min(1), memoryType: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await addMemoryEntry({
          userId: ctx.user.id,
          content: input.content,
          memoryType: input.memoryType ?? "manual",
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
