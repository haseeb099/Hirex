/**
 * server/routers/jobs.ts
 *
 * tRPC router for the v1.1 Job Agent features:
 *   - refresh: fetch 30 jobs from Remotive API and save to global pool
 *   - scoreJobs: score unscored jobs for the current user using jobScorer
 *   - getRanked: return ranked jobs enriched with match data
 *   - saveProfile: save user profile (v1.1 userProfiles table)
 *   - getProfile: retrieve user profile
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getRankedJobs,
  getUnscoredJobs,
  getUserProfile,
  saveJob,
  saveJobMatch,
  saveUserProfile,
} from "../db";
import { calculateJobScore } from "../services/jobScorer";

// ── Remotive API types ────────────────────────────────────────────────────────
interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  candidate_required_location: string;
  job_type: string;
  description: string;
  salary: string;
  publication_date: string;
}

// ── Router ────────────────────────────────────────────────────────────────────
export const jobsRouter = router({
  /** Fetch up to 30 jobs from Remotive API and save to the global jobs pool */
  refresh: protectedProcedure
    .input(
      z.object({
        category: z.string().optional().default("software-dev"),
        limit: z.number().int().min(1).max(50).optional().default(30),
      })
    )
    .mutation(async ({ input }) => {
      let fetched = 0;
      let saved = 0;

      try {
        const url = `https://remotive.com/api/remote-jobs?category=${encodeURIComponent(input.category)}&limit=${input.limit}`;
        const res = await fetch(url, {
          headers: { "User-Agent": "JobAgentApp/1.0" },
          signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Remotive API returned ${res.status}`,
          });
        }

        const data = (await res.json()) as { jobs: RemotiveJob[] };
        fetched = data.jobs?.length ?? 0;

        for (const rj of data.jobs ?? []) {
          try {
            await saveJob({
              externalId: String(rj.id),
              title: rj.title,
              company: rj.company_name,
              location: rj.candidate_required_location || "Remote",
              jobType: rj.job_type || "full_time",
              description: rj.description
                ? rj.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000)
                : null,
              requirements: null,
              url: rj.url,
              source: "remotive",
              postedDate: rj.publication_date ? new Date(rj.publication_date) : null,
              isActive: true,
            });
            saved++;
          } catch {
            // Duplicate URL — skip silently
          }
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to fetch jobs",
        });
      }

      return { fetched, saved };
    }),

  /** Score all unscored jobs for the current user */
  scoreJobs: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);

    const userProfileInput = {
      skills: (profile?.skills as string[] | null) ?? [],
      experienceYears: profile?.experienceYears ?? 0,
      resumeText: profile?.resumeText ?? null,
      headline: profile?.headline ?? null,
    };

    const unscoredJobs = await getUnscoredJobs(ctx.user.id);
    if (!unscoredJobs.length) return { scored: 0, scores: [] };

    const scores: Array<{ jobId: number; score: number; tier: string }> = [];

    for (const job of unscoredJobs) {
      const result = calculateJobScore(userProfileInput, {
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        company: job.company,
      });

      await saveJobMatch({
        userId: ctx.user.id,
        jobId: job.id,
        matchScore: result.totalScore,
        skillsMatchScore: result.skillsMatchScore,
        semanticScore: result.semanticScore,
        titleScore: result.titleScore,
        experienceScore: result.experienceScore,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
      });

      scores.push({ jobId: job.id, score: result.totalScore, tier: result.tier });
    }

    return { scored: unscoredJobs.length, scores };
  }),

  /** Return ranked jobs enriched with match data */
  getRanked: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const ranked = await getRankedJobs(ctx.user.id, input.limit);
      return ranked.map((r, idx) => ({
        rank: idx + 1,
        matchScore: r.matchScore,
        skillsMatchScore: r.skillsMatchScore,
        semanticScore: r.semanticScore,
        titleScore: r.titleScore,
        experienceScore: r.experienceScore,
        matchedSkills: (r.matchedSkills as string[]) ?? [],
        missingSkills: (r.missingSkills as string[]) ?? [],
        tier: (r.matchScore ?? 0) >= 70 ? "high" : (r.matchScore ?? 0) >= 45 ? "medium" : "low",
        job: r.job,
      }));
    }),

  /** Save user profile */
  saveProfile: protectedProcedure
    .input(
      z.object({
        headline: z.string().max(255).optional(),
        skills: z.array(z.string()).optional(),
        experienceYears: z.number().int().min(0).max(60).optional(),
        resumeText: z.string().optional(),
        preferences: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data = {
        userId: ctx.user.id,
        ...(input.headline !== undefined && { headline: input.headline }),
        ...(input.skills !== undefined && { skills: input.skills }),
        ...(input.experienceYears !== undefined && { experienceYears: input.experienceYears }),
        ...(input.resumeText !== undefined && { resumeText: input.resumeText }),
        ...(input.preferences !== undefined && { preferences: input.preferences }),
      };
      return saveUserProfile(data);
    }),

  /** Get user profile */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return getUserProfile(ctx.user.id);
  }),
});
