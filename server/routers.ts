/**
 * server/routers.ts
 * Main tRPC router — all procedures for the Job Agent SaaS v2.0
 */

import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { jobsRouter } from "./routers/jobs";
import {
  addCredits,
  addMemoryEntry,
  createApplication,
  deductCredit,
  getApplyKitById,
  getApplyKitsByUser,
  getApplicationsByUser,
  getMemoryEntries,
  getProfile,
  getRankedJobs,
  getUserCredits,
  getUserProfile,
  getUserSubscription,
  saveApplyKit,
  saveJob,
  updateApplicationStatus,
  upsertProfile,
  upsertSubscription,
} from "./db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-05-27.dahlia",
});

// ── Stripe Products ───────────────────────────────────────────────────────────
const PLANS = {
  pro: {
    name: "Pro",
    priceMonthly: 1900, // $19/month in cents
    credits: 100,
    features: ["100 AI credits/month", "Unlimited job imports", "PDF downloads", "Priority support"],
  },
  enterprise: {
    name: "Enterprise",
    priceMonthly: 4900, // $49/month in cents
    credits: 500,
    features: ["500 AI credits/month", "Team seats", "API access", "Dedicated support"],
  },
};

// ── LLM helpers ───────────────────────────────────────────────────────────────
async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return (res.choices?.[0]?.message?.content as string) ?? "";
}

// ── App Router ────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  // ── Auth ────────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── v1.1 Jobs router (Remotive + scorer) ────────────────────────────────────
  jobs: jobsRouter,

  // ── Profile (v1.0 candidate profile) ────────────────────────────────────────
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => getProfile(ctx.user.id)),
    upsert: protectedProcedure
      .input(
        z.object({
          fullName: z.string().max(255).optional(),
          headline: z.string().max(255).optional(),
          resumeText: z.string().optional(),
          skills: z.array(z.string()).optional(),
          experienceYears: z.number().int().min(0).max(60).optional(),
          preferredRoles: z.array(z.string()).optional(),
          preferredLocations: z.array(z.string()).optional(),
          targetSalary: z.number().int().optional(),
        })
      )
      .mutation(async ({ ctx, input }) =>
        upsertProfile({ userId: ctx.user.id, ...input })
      ),
  }),

  // ── Applications ─────────────────────────────────────────────────────────────
  applications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getApplicationsByUser(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          jobId: z.number().int(),
          status: z.enum(["draft", "applied", "interviewing", "rejected", "offer"]).optional().default("draft"),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) =>
        createApplication({ userId: ctx.user.id, ...input })
      ),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number().int(),
          status: z.enum(["draft", "applied", "interviewing", "rejected", "offer"]),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const app = await updateApplicationStatus(input.id, ctx.user.id, input.status, input.notes);
        // Auto-store memory on key transitions
        if (["interviewing", "offer", "rejected"].includes(input.status)) {
          await addMemoryEntry({
            userId: ctx.user.id,
            content: `Application #${input.id} moved to ${input.status}. Notes: ${input.notes ?? "none"}`,
            memoryType: "application_outcome",
            metadata: { applicationId: input.id, status: input.status },
          });
        }
        return app;
      }),
  }),

  // ── Memory ────────────────────────────────────────────────────────────────────
  memory: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional().default(20) }))
      .query(async ({ ctx, input }) => getMemoryEntries(ctx.user.id, input.limit)),

    count: protectedProcedure.query(async ({ ctx }) => {
      const entries = await getMemoryEntries(ctx.user.id, 1000);
      return entries.length;
    }),

    add: protectedProcedure
      .input(z.object({ content: z.string().min(1).max(2000), memoryType: z.string().optional().default("manual") }))
      .mutation(async ({ ctx, input }) => {
        await addMemoryEntry({ userId: ctx.user.id, content: input.content, memoryType: input.memoryType });
        return { success: true };
      }),
  }),

  // ── Apply Kit ─────────────────────────────────────────────────────────────────
  applyKit: router({
    generate: protectedProcedure
      .input(
        z.object({
          jobTitle: z.string().min(1).max(255),
          company: z.string().min(1).max(255),
          jobDescription: z.string().min(10).max(20000),
          jobId: z.number().int().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check credits
        const hasCredit = await deductCredit(ctx.user.id, 1);
        if (!hasCredit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Insufficient credits. Please upgrade your plan to continue.",
          });
        }

        // Get profile for personalisation
        const profile = await getProfile(ctx.user.id);
        const userProfile = await getUserProfile(ctx.user.id);

        const resumeText = profile?.resumeText ?? userProfile?.resumeText ?? "";
        const skills = (profile?.skills as string[] | null) ?? (userProfile?.skills as string[] | null) ?? [];
        const name = profile?.fullName ?? ctx.user.name ?? "Candidate";
        const headline = profile?.headline ?? userProfile?.headline ?? "";
        const experienceYears = profile?.experienceYears ?? userProfile?.experienceYears ?? 0;

        const profileContext = `
Candidate Name: ${name}
Headline: ${headline}
Skills: ${skills.join(", ") || "Not specified"}
Experience: ${experienceYears} years
Resume/Background:
${resumeText || "Not provided"}`.trim();

        const jdContext = `
Job Title: ${input.jobTitle}
Company: ${input.company}
Job Description:
${input.jobDescription}`.trim();

        // Run all 4 LLM calls in parallel
        const [atsCV, coverLetter, linkedinSummary, interviewPrep] = await Promise.all([
          // ATS-Optimised CV
          callLLM(
            `You are an expert ATS resume writer. Create a highly ATS-optimised CV that mirrors the exact keywords and phrases from the job description. Format it in clean plain text with clear sections: PROFESSIONAL SUMMARY, CORE COMPETENCIES, PROFESSIONAL EXPERIENCE, EDUCATION, SKILLS. Use bullet points with strong action verbs. Include exact keyword matches from the JD. Do NOT use tables, columns, or special characters that ATS systems cannot parse.`,
            `Create an ATS-optimised CV for this candidate applying to this role.\n\nCANDIDATE PROFILE:\n${profileContext}\n\nJOB DESCRIPTION:\n${jdContext}\n\nGenerate a complete, professional ATS-friendly CV. Mirror keywords from the JD exactly. Make it compelling and specific.`
          ),
          // Cover Letter
          callLLM(
            `You are an expert cover letter writer. Write a compelling, personalised 3-paragraph cover letter. Paragraph 1: Hook + role excitement. Paragraph 2: Specific achievements matching JD requirements. Paragraph 3: Cultural fit + CTA. Use the candidate's real background. Be specific, not generic. Keep it under 350 words.`,
            `Write a tailored cover letter.\n\nCANDIDATE PROFILE:\n${profileContext}\n\nJOB DESCRIPTION:\n${jdContext}`
          ),
          // LinkedIn Summary
          callLLM(
            `You are a LinkedIn profile expert. Write a compelling LinkedIn "About" section (3-5 sentences, 200-300 words) that positions the candidate perfectly for this type of role. Use first person. Include key skills, achievements, and a call to action.`,
            `Write a LinkedIn About section for this candidate targeting this role.\n\nCANDIDATE PROFILE:\n${profileContext}\n\nTARGET ROLE:\n${jdContext}`
          ),
          // Interview Prep
          callLLM(
            `You are an expert interview coach. Generate 5 likely interview questions for this specific role with detailed STAR-method answer frameworks tailored to the candidate's background. Format as: Q1: [Question]\nA: [STAR answer framework with specific examples from their background]\n\nRepeat for Q2-Q5.`,
            `Generate 5 interview Q&As for this candidate.\n\nCANDIDATE PROFILE:\n${profileContext}\n\nJOB DESCRIPTION:\n${jdContext}`
          ),
        ]);

        // Calculate keyword match score
        const jdWords = new Set(input.jobDescription.toLowerCase().match(/\b\w{4,}\b/g) ?? []);
        const cvWords = new Set(atsCV.toLowerCase().match(/\b\w{4,}\b/g) ?? []);
        const overlap = Array.from(jdWords).filter((w) => cvWords.has(w)).length;
        const matchScore = Math.min(100, Math.round((overlap / Math.max(jdWords.size, 1)) * 200));

        const kit = await saveApplyKit({
          userId: ctx.user.id,
          jobId: input.jobId,
          jobTitle: input.jobTitle,
          company: input.company,
          jobDescription: input.jobDescription,
          atsCV,
          coverLetter,
          linkedinSummary,
          interviewPrep,
          matchScore,
        });

        return kit;
      }),

    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).optional().default(20) }))
      .query(async ({ ctx, input }) => getApplyKitsByUser(ctx.user.id, input.limit)),

    get: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ ctx, input }) => getApplyKitById(input.id, ctx.user.id)),
  }),

  // ── Credits & Subscription ────────────────────────────────────────────────────
  billing: router({
    getCredits: protectedProcedure.query(async ({ ctx }) => getUserCredits(ctx.user.id)),

    getSubscription: protectedProcedure.query(async ({ ctx }) => getUserSubscription(ctx.user.id)),

    createCheckout: protectedProcedure
      .input(
        z.object({
          plan: z.enum(["pro", "enterprise"]),
          origin: z.string().url(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const planInfo = PLANS[input.plan];
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer_email: ctx.user.email ?? undefined,
          allow_promotion_codes: true,
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `Job Agent ${planInfo.name}`,
                  description: planInfo.features.join(" • "),
                },
                unit_amount: planInfo.priceMonthly,
                recurring: { interval: "month" },
              },
              quantity: 1,
            },
          ],
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            plan: input.plan,
            customer_email: ctx.user.email ?? "",
            customer_name: ctx.user.name ?? "",
          },
          success_url: `${input.origin}/dashboard?payment=success`,
          cancel_url: `${input.origin}/pricing?payment=canceled`,
        });
        return { url: session.url };
      }),
  }),

  // ── Job Import (URL scrape + JD paste) ───────────────────────────────────────
  jobImport: router({
    fromUrl: protectedProcedure
      .input(z.object({ url: z.string().url().max(768) }))
      .mutation(async ({ ctx, input }) => {
        // Check credits
        const hasCredit = await deductCredit(ctx.user.id, 1);
        if (!hasCredit) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient credits." });
        }

        // Fetch the page
        let rawHtml = "";
        try {
          const res = await fetch(input.url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; JobAgentBot/1.0)" },
            signal: AbortSignal.timeout(10_000),
          });
          rawHtml = await res.text();
        } catch {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Could not fetch the URL. Please paste the job description manually." });
        }

        // Strip HTML tags
        const text = rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);

        // Use LLM to extract structured job data
        const extracted = await callLLM(
          `You are a job description parser. Extract structured data from the provided text and return ONLY valid JSON with these fields: title (string), company (string), location (string), jobType (string: full_time|part_time|contract|remote), description (string, max 3000 chars), requirements (string, max 1000 chars), salaryMin (number or null), salaryMax (number or null). If a field cannot be determined, use null.`,
          `Extract job data from this text:\n\n${text}`
        );

        let jobData: {
          title: string; company: string; location: string; jobType: string;
          description: string; requirements: string; salaryMin: number | null; salaryMax: number | null;
        };

        try {
          const cleaned = extracted.replace(/```json\n?|\n?```/g, "").trim();
          jobData = JSON.parse(cleaned);
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not parse job data from URL. Please paste the description manually." });
        }

        const saved = await saveJob({
          externalId: `url-${Buffer.from(input.url).toString("base64").slice(0, 50)}`,
          title: jobData.title ?? "Unknown Role",
          company: jobData.company ?? "Unknown Company",
          location: jobData.location ?? "Remote",
          jobType: jobData.jobType ?? "full_time",
          description: jobData.description ?? "",
          requirements: jobData.requirements ?? null,
          url: input.url.slice(0, 768),
          source: "url_import",
          salaryMin: jobData.salaryMin ?? null,
          salaryMax: jobData.salaryMax ?? null,
          isActive: true,
        });

        return saved;
      }),

    fromText: protectedProcedure
      .input(
        z.object({
          jobDescription: z.string().min(50).max(20000),
          jobTitle: z.string().max(255).optional(),
          company: z.string().max(255).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Extract structured data from pasted JD
        const extracted = await callLLM(
          `You are a job description parser. Extract structured data and return ONLY valid JSON: title (string), company (string), location (string), jobType (string), description (string, max 3000 chars), requirements (string, max 1000 chars), salaryMin (number or null), salaryMax (number or null).`,
          `Extract job data:\nTitle hint: ${input.jobTitle ?? "unknown"}\nCompany hint: ${input.company ?? "unknown"}\n\nJD:\n${input.jobDescription}`
        );

        let jobData: {
          title: string; company: string; location: string; jobType: string;
          description: string; requirements: string; salaryMin: number | null; salaryMax: number | null;
        };

        try {
          const cleaned = extracted.replace(/```json\n?|\n?```/g, "").trim();
          jobData = JSON.parse(cleaned);
        } catch {
          jobData = {
            title: input.jobTitle ?? "Unknown Role",
            company: input.company ?? "Unknown Company",
            location: "Remote",
            jobType: "full_time",
            description: input.jobDescription.slice(0, 3000),
            requirements: "",
            salaryMin: null,
            salaryMax: null,
          };
        }

        const saved = await saveJob({
          externalId: `paste-${ctx.user.id}-${Date.now()}`,
          title: input.jobTitle ?? jobData.title ?? "Unknown Role",
          company: input.company ?? jobData.company ?? "Unknown Company",
          location: jobData.location ?? "Remote",
          jobType: jobData.jobType ?? "full_time",
          description: jobData.description ?? input.jobDescription.slice(0, 3000),
          requirements: jobData.requirements ?? null,
          url: `https://jobagent.app/imported/${ctx.user.id}-${Date.now()}`.slice(0, 768),
          source: "paste_import",
          salaryMin: jobData.salaryMin ?? null,
          salaryMax: jobData.salaryMax ?? null,
          isActive: true,
        });

        return saved;
      }),
  }),
});

export type AppRouter = typeof appRouter;
