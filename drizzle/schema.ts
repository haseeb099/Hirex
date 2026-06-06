import {
  boolean,
  float,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ── Users (auth, from template) ──────────────────────────────────────────────
export const users = mysqlTable("users", {
  id:           int("id").autoincrement().primaryKey(),
  openId:       varchar("openId", { length: 64 }).notNull().unique(),
  name:         text("name"),
  email:        varchar("email", { length: 320 }),
  loginMethod:  varchar("loginMethod", { length: 64 }),
  role:         mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── User Profiles (v1.1) ──────────────────────────────────────────────────────
export const userProfiles = mysqlTable("user_profiles", {
  id:              int("id").autoincrement().primaryKey(),
  userId:          int("userId").notNull().unique(),
  skills:          json("skills").$type<string[]>(),
  experienceYears: int("experienceYears").default(0),
  resumeText:      text("resumeText"),
  headline:        varchar("headline", { length: 255 }),
  preferences:     json("preferences").$type<Record<string, unknown>>(),
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// ── Candidate Profile (legacy v1.0 — kept for backwards compat) ───────────────
export const candidateProfiles = mysqlTable("candidate_profiles", {
  id:                 int("id").autoincrement().primaryKey(),
  userId:             int("userId").notNull().unique(),
  fullName:           varchar("fullName", { length: 255 }),
  headline:           varchar("headline", { length: 255 }),
  resumeText:         text("resumeText"),
  skills:             json("skills").$type<string[]>(),
  experienceYears:    int("experienceYears").default(0),
  preferredRoles:     json("preferredRoles").$type<string[]>(),
  preferredLocations: json("preferredLocations").$type<string[]>(),
  targetSalary:       int("targetSalary"),
  createdAt:          timestamp("createdAt").defaultNow().notNull(),
  updatedAt:          timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type InsertCandidateProfile = typeof candidateProfiles.$inferInsert;

// ── Jobs (v1.1 — global pool, not per-user) ───────────────────────────────────
export const jobs = mysqlTable("jobs", {
  id:             int("id").autoincrement().primaryKey(),
  externalId:     varchar("externalId", { length: 255 }),
  title:          varchar("title", { length: 255 }).notNull(),
  company:        varchar("company", { length: 255 }).notNull(),
  location:       varchar("location", { length: 255 }),
  jobType:        varchar("jobType", { length: 100 }),
  description:    text("description"),
  requirements:   text("requirements"),
  salaryMin:      int("salaryMin"),
  salaryMax:      int("salaryMax"),
  salaryCurrency: varchar("salaryCurrency", { length: 10 }).default("USD"),
  url:            varchar("url", { length: 2048 }).unique(),
  source:         varchar("source", { length: 100 }).default("remotive"),
  postedDate:     timestamp("postedDate"),
  isActive:       boolean("isActive").default(true),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

// ── Job Matches (per-user scoring) ────────────────────────────────────────────
export const jobMatches = mysqlTable("job_matches", {
  id:                int("id").autoincrement().primaryKey(),
  userId:            int("userId").notNull(),
  jobId:             int("jobId").notNull(),
  matchScore:        int("matchScore").default(0),          // 0-100
  skillsMatchScore:  int("skillsMatchScore").default(0),
  semanticScore:     int("semanticScore").default(0),
  titleScore:        int("titleScore").default(0),
  experienceScore:   int("experienceScore").default(0),
  matchedSkills:     json("matchedSkills").$type<string[]>(),
  missingSkills:     json("missingSkills").$type<string[]>(),
  viewed:            boolean("viewed").default(false),
  saved:             boolean("saved").default(false),
  applied:           boolean("applied").default(false),
  appliedDate:       timestamp("appliedDate"),
  createdAt:         timestamp("createdAt").defaultNow().notNull(),
});

export type JobMatch = typeof jobMatches.$inferSelect;
export type InsertJobMatch = typeof jobMatches.$inferInsert;

// ── Applications ──────────────────────────────────────────────────────────────
export const applications = mysqlTable("applications", {
  id:               int("id").autoincrement().primaryKey(),
  userId:           int("userId").notNull(),
  jobId:            int("jobId").notNull(),
  status:           mysqlEnum("status", ["draft", "applied", "interviewing", "rejected", "offer"]).default("draft").notNull(),
  cvUsed:           text("cvUsed"),
  coverLetterUsed:  text("coverLetterUsed"),
  notes:            text("notes"),
  appliedAt:        timestamp("appliedAt"),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

// ── Apply Kits (AI-generated application materials) ─────────────────────────
export const applyKits = mysqlTable("apply_kits", {
  id:               int("id").autoincrement().primaryKey(),
  userId:           int("userId").notNull(),
  jobId:            int("jobId"),
  jobTitle:         varchar("jobTitle", { length: 255 }),
  company:          varchar("company", { length: 255 }),
  jobDescription:   text("jobDescription"),
  atsCV:            text("atsCV"),
  coverLetter:      text("coverLetter"),
  linkedinSummary:  text("linkedinSummary"),
  interviewPrep:    text("interviewPrep"),
  matchScore:       int("matchScore").default(0),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApplyKit = typeof applyKits.$inferSelect;
export type InsertApplyKit = typeof applyKits.$inferInsert;

// ── Memory Entries ────────────────────────────────────────────────────────────
export const memoryEntries = mysqlTable("memory_entries", {
  id:         int("id").autoincrement().primaryKey(),
  userId:     int("userId").notNull(),
  content:    text("content").notNull(),
  memoryType: varchar("memoryType", { length: 50 }).default("application_outcome"),
  metadata:   json("metadata").$type<Record<string, unknown>>(),
  createdAt:  timestamp("createdAt").defaultNow().notNull(),
});

export type MemoryEntry = typeof memoryEntries.$inferSelect;
export type InsertMemoryEntry = typeof memoryEntries.$inferInsert;
