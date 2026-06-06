import { describe, expect, it } from "vitest";
import { calculateJobScore } from "./services/jobScorer";

// ── Skills match scoring ──────────────────────────────────────────────────────
describe("calculateJobScore — skills match", () => {
  it("returns high tier when user skills fully cover job requirements", () => {
    const result = calculateJobScore(
      {
        skills: ["typescript", "react", "node.js", "postgresql", "docker"],
        experienceYears: 5,
        headline: "Senior Full-Stack Engineer",
        resumeText: "Built scalable React and Node.js applications with PostgreSQL and Docker.",
      },
      {
        title: "Senior Full-Stack Engineer",
        description: "We need TypeScript, React, Node.js, PostgreSQL, and Docker skills.",
        requirements: "5+ years of experience with TypeScript, React, Node.js.",
      }
    );
    expect(result.tier).toBe("high");
    expect(result.totalScore).toBeGreaterThanOrEqual(70);
    expect(result.matchedSkills.length).toBeGreaterThan(0);
  });

  it("returns low tier when user has no matching skills", () => {
    const result = calculateJobScore(
      {
        skills: ["java", "spring", "oracle"],
        experienceYears: 3,
        headline: "Java Backend Developer",
        resumeText: "Java Spring Oracle enterprise applications.",
      },
      {
        title: "ML Engineer",
        description: "Deep expertise in PyTorch, TensorFlow, LLM fine-tuning, and embeddings required.",
        requirements: "5+ years machine learning, deep learning, RAG pipelines.",
      }
    );
    expect(result.tier).toBe("low");
    expect(result.totalScore).toBeLessThan(45);
  });

  it("populates missingSkills with skills in job but not in user profile", () => {
    const result = calculateJobScore(
      { skills: ["typescript"], experienceYears: 2 },
      {
        title: "Backend Engineer",
        description: "Looking for TypeScript, Kubernetes, Redis, and Elasticsearch expertise.",
        requirements: "Experience with k8s, redis, elasticsearch.",
      }
    );
    expect(result.missingSkills.length).toBeGreaterThan(0);
    // typescript is matched, others should be missing
    expect(result.matchedSkills).toContain("typescript");
  });

  it("returns 50 for skillsMatchScore when job has no detectable tech skills", () => {
    const result = calculateJobScore(
      { skills: ["typescript"], experienceYears: 3 },
      {
        title: "Office Manager",
        description: "Manage schedules, coordinate meetings, and handle correspondence.",
        requirements: "Strong communication skills.",
      }
    );
    // No tech skills in job → skillsMatchScore defaults to 50
    expect(result.skillsMatchScore).toBe(50);
  });
});

// ── Experience scoring ────────────────────────────────────────────────────────
describe("calculateJobScore — experience scoring", () => {
  it("gives full experience score when user meets or exceeds required years", () => {
    const result = calculateJobScore(
      { skills: ["typescript"], experienceYears: 8, headline: "Senior Engineer" },
      {
        title: "Senior Engineer",
        description: "Requires 5+ years of professional experience.",
        requirements: "Minimum 5 years of software engineering.",
      }
    );
    expect(result.experienceScore).toBeGreaterThanOrEqual(70);
  });

  it("penalises experience score when user is significantly under-qualified", () => {
    const result = calculateJobScore(
      { skills: ["typescript"], experienceYears: 1 },
      {
        title: "Staff Engineer",
        description: "Requires at least 8 years of engineering experience.",
        requirements: "8+ years of software development.",
      }
    );
    expect(result.experienceScore).toBeLessThan(70);
  });

  it("uses neutral experience score (70) when no years mentioned in job", () => {
    const result = calculateJobScore(
      { skills: ["typescript"], experienceYears: 3 },
      {
        title: "Software Engineer",
        description: "Join our team and build great products.",
        requirements: "Strong coding skills.",
      }
    );
    expect(result.experienceScore).toBe(70);
  });
});

// ── Title scoring ─────────────────────────────────────────────────────────────
describe("calculateJobScore — title scoring", () => {
  it("gives high title score when headline matches job title", () => {
    const result = calculateJobScore(
      { skills: [], headline: "Senior React Engineer", experienceYears: 5 },
      { title: "Senior React Engineer", description: "React development role." }
    );
    expect(result.titleScore).toBeGreaterThan(50);
  });

  it("gives low title score when headline is unrelated to job title", () => {
    const result = calculateJobScore(
      { skills: [], headline: "Data Scientist Python ML", experienceYears: 4 },
      { title: "iOS Swift Mobile Developer", description: "Build iOS apps with Swift." }
    );
    expect(result.titleScore).toBeLessThan(50);
  });
});

// ── Tier thresholds ───────────────────────────────────────────────────────────
describe("calculateJobScore — tier thresholds", () => {
  it("tier is 'high' when totalScore >= 70", () => {
    const result = calculateJobScore(
      {
        skills: ["typescript", "react", "node.js", "postgresql", "docker", "aws", "redis"],
        experienceYears: 6,
        headline: "Senior Full-Stack TypeScript Engineer",
        resumeText: "6 years building React Node.js TypeScript apps on AWS with PostgreSQL and Redis.",
      },
      {
        title: "Senior Full-Stack TypeScript Engineer",
        description: "TypeScript React Node.js PostgreSQL Docker AWS Redis required.",
        requirements: "5+ years TypeScript React Node.js.",
      }
    );
    expect(result.tier).toBe("high");
    expect(result.totalScore).toBeGreaterThanOrEqual(70);
  });

  it("totalScore is always between 0 and 100", () => {
    const result = calculateJobScore(
      { skills: [], experienceYears: 0, headline: "", resumeText: "" },
      { title: "", description: "", requirements: "" }
    );
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it("returns a ScoringResult with all required fields", () => {
    const result = calculateJobScore(
      { skills: ["typescript"], experienceYears: 3 },
      { title: "Engineer", description: "TypeScript role." }
    );
    expect(result).toHaveProperty("totalScore");
    expect(result).toHaveProperty("skillsMatchScore");
    expect(result).toHaveProperty("semanticScore");
    expect(result).toHaveProperty("titleScore");
    expect(result).toHaveProperty("experienceScore");
    expect(result).toHaveProperty("matchedSkills");
    expect(result).toHaveProperty("missingSkills");
    expect(result).toHaveProperty("tier");
    expect(["high", "medium", "low"]).toContain(result.tier);
  });
});

// ── Weighted formula ──────────────────────────────────────────────────────────
describe("calculateJobScore — weighted formula", () => {
  it("totalScore reflects 55/20/15/10 weights approximately", () => {
    const result = calculateJobScore(
      {
        skills: ["typescript", "react"],
        experienceYears: 5,
        headline: "React Developer",
        resumeText: "TypeScript React developer.",
      },
      {
        title: "React Developer",
        description: "Need TypeScript and React skills.",
        requirements: "5+ years experience.",
      }
    );
    // Manually verify: skills ~100%, semantic ~moderate, title ~100%, exp ~100%
    // Expected total should be well above 50
    expect(result.totalScore).toBeGreaterThan(50);
    expect(result.skillsMatchScore).toBeGreaterThan(50);
  });
});
