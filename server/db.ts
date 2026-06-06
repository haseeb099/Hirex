import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  applications,
  candidateProfiles,
  InsertApplication,
  InsertCandidateProfile,
  InsertJob,
  InsertJobMatch,
  InsertMemoryEntry,
  InsertUser,
  InsertUserProfile,
  jobMatches,
  jobs,
  memoryEntries,
  userProfiles,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  for (const field of ["name", "email", "loginMethod"] as const) {
    const v = user[field];
    if (v !== undefined) { values[field] = v ?? null; updateSet[field] = v ?? null; }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  values.role = user.openId === ENV.ownerOpenId ? "admin" : (user.role ?? "user");
  updateSet.role = values.role;
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ── User Profiles (v1.1) ──────────────────────────────────────────────────────
export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function saveUserProfile(data: InsertUserProfile) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(userProfiles).values(data).onDuplicateKeyUpdate({
    set: {
      skills: data.skills,
      experienceYears: data.experienceYears,
      resumeText: data.resumeText,
      headline: data.headline,
      preferences: data.preferences,
    },
  });
  return getUserProfile(data.userId);
}

// ── Candidate Profile (legacy v1.0) ───────────────────────────────────────────
export async function getProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertProfile(data: InsertCandidateProfile) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(candidateProfiles).values(data).onDuplicateKeyUpdate({
    set: {
      fullName: data.fullName,
      headline: data.headline,
      resumeText: data.resumeText,
      skills: data.skills,
      experienceYears: data.experienceYears,
      preferredRoles: data.preferredRoles,
      preferredLocations: data.preferredLocations,
      targetSalary: data.targetSalary,
    },
  });
  return getProfile(data.userId);
}

// ── Jobs (global pool, v1.1) ──────────────────────────────────────────────────

/** Save a job, checking for duplicate by URL. Returns the saved or existing job. */
export async function saveJob(data: InsertJob) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Check for duplicate by URL
  if (data.url) {
    const existing = await db.select().from(jobs).where(eq(jobs.url, data.url)).limit(1);
    if (existing[0]) return existing[0];
  }

  const [result] = await db.insert(jobs).values(data);
  const insertId = (result as any).insertId as number;
  const rows = await db.select().from(jobs).where(eq(jobs.id, insertId)).limit(1);
  return rows[0]!;
}

/** Get all jobs not yet scored for this user (no job_match record exists). */
export async function getUnscoredJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // LEFT JOIN job_matches for this user; return jobs where match is null
  const allJobs = await db.select().from(jobs).where(eq(jobs.isActive, true));
  const userMatchRows = await db.select({ jobId: jobMatches.jobId }).from(jobMatches).where(eq(jobMatches.userId, userId));
  const scoredIds = new Set(userMatchRows.map((r) => r.jobId));
  return allJobs.filter((j) => !scoredIds.has(j.id));
}

/** Save a job match record for a user. */
export async function saveJobMatch(data: InsertJobMatch) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(jobMatches).values(data);
  const insertId = (result as any).insertId as number;
  const rows = await db.select().from(jobMatches).where(eq(jobMatches.id, insertId)).limit(1);
  return rows[0]!;
}

/** Get ranked jobs for a user, enriched with job details, ordered by matchScore desc. */
export async function getRankedJobs(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const matches = await db
    .select()
    .from(jobMatches)
    .where(eq(jobMatches.userId, userId))
    .orderBy(desc(jobMatches.matchScore))
    .limit(limit);

  if (!matches.length) return [];

  // Enrich with job details
  const jobIds = matches.map((m) => m.jobId);
  const jobRows = await db.select().from(jobs).where(sql`${jobs.id} IN (${sql.join(jobIds.map((id) => sql`${id}`), sql`, `)})`);
  const jobMap = new Map(jobRows.map((j) => [j.id, j]));

  return matches.map((m) => ({
    ...m,
    job: jobMap.get(m.jobId) ?? null,
  })).filter((m) => m.job !== null);
}

// ── Legacy job helpers (v1.0 compat) ─────────────────────────────────────────
export async function getJobsByUser(userId: number) {
  // In v1.1 jobs are global; return jobs that have a match for this user
  const db = await getDb();
  if (!db) return [];
  const ranked = await getRankedJobs(userId, 100);
  return ranked.map((r) => ({
    ...r.job!,
    matchScore: (r.matchScore ?? 0) / 100,
    matchTier: (r.matchScore ?? 0) >= 70 ? "high" : (r.matchScore ?? 0) >= 45 ? "medium" : "low",
    reasoning: null as string | null,
    coverLetter: null as string | null,
  }));
}

// ── Applications ──────────────────────────────────────────────────────────────
export async function createApplication(data: InsertApplication) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(applications).values(data);
  const insertId = (result as any).insertId as number;
  const rows = await db.select().from(applications).where(eq(applications.id, insertId)).limit(1);
  return rows[0];
}

export async function getApplicationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(applications).where(eq(applications.userId, userId)).orderBy(desc(applications.createdAt));
}

export async function updateApplicationStatus(
  id: number,
  userId: number,
  status: string,
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const updateData: Record<string, unknown> = { status };
  if (notes !== undefined) updateData.notes = notes;
  if (status === "applied") updateData.appliedAt = new Date();
  await db.update(applications).set(updateData).where(and(eq(applications.id, id), eq(applications.userId, userId)));
  const rows = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return rows[0];
}

// ── Memory Entries ────────────────────────────────────────────────────────────
export async function addMemoryEntry(data: InsertMemoryEntry) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(memoryEntries).values(data);
}

export async function getMemoryEntries(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memoryEntries).where(eq(memoryEntries.userId, userId)).orderBy(desc(memoryEntries.createdAt)).limit(limit);
}

export async function countMemoryEntries(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select().from(memoryEntries).where(eq(memoryEntries.userId, userId));
  return rows.length;
}

export async function getRecentMemoryContext(userId: number, limit = 5): Promise<string> {
  const entries = await getMemoryEntries(userId, limit);
  if (!entries.length) return "";
  return entries.map((e, i) => `${i + 1}. ${e.content}`).join("\n");
}
