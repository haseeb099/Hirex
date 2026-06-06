import {
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

// ── Candidate Profile ─────────────────────────────────────────────────────────
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

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobs = mysqlTable("jobs", {
  id:             int("id").autoincrement().primaryKey(),
  userId:         int("userId").notNull(),
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
  url:            text("url"),
  source:         varchar("source", { length: 100 }).default("manual"),
  matchScore:     float("matchScore").default(0),
  matchTier:      mysqlEnum("matchTier", ["high", "medium", "low"]).default("low"),
  reasoning:      text("reasoning"),
  coverLetter:    text("coverLetter"),
  fetchedAt:      timestamp("fetchedAt").defaultNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

// ── Applications ──────────────────────────────────────────────────────────────
export const applications = mysqlTable("applications", {
  id:          int("id").autoincrement().primaryKey(),
  userId:      int("userId").notNull(),
  jobId:       int("jobId").notNull(),
  status:      mysqlEnum("status", ["Draft", "Applied", "Interview", "Offer", "Rejected"]).default("Draft").notNull(),
  notes:       text("notes"),
  appliedAt:   timestamp("appliedAt"),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

// ── Memory Entries ────────────────────────────────────────────────────────────
export const memoryEntries = mysqlTable("memory_entries", {
  id:        int("id").autoincrement().primaryKey(),
  userId:    int("userId").notNull(),
  content:   text("content").notNull(),
  memoryType: varchar("memoryType", { length: 50 }).default("application_outcome"),
  metadata:  json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemoryEntry = typeof memoryEntries.$inferSelect;
export type InsertMemoryEntry = typeof memoryEntries.$inferInsert;
