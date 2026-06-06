/**
 * server/services/jobScorer.ts
 *
 * Pure-TypeScript job scoring service.
 * Weights:
 *   55% — skills match (keyword overlap against a 60+ tech-skills dictionary)
 *   20% — semantic similarity (TF-IDF cosine similarity, no external model needed)
 *   15% — title match (headline ↔ job title word overlap)
 *   10% — experience match (years extracted from job description vs candidate years)
 *
 * No Python / native binaries required — runs entirely in Node.js.
 */

// ── Tech skills dictionary (60+ common skills) ────────────────────────────────
const TECH_SKILLS = new Set([
  // Languages
  "javascript", "typescript", "python", "java", "go", "golang", "rust", "c++", "c#", "ruby",
  "swift", "kotlin", "scala", "php", "r", "matlab", "elixir", "haskell", "clojure", "dart",
  // Frontend
  "react", "vue", "angular", "svelte", "nextjs", "next.js", "nuxt", "remix", "tailwind",
  "tailwindcss", "css", "html", "sass", "less", "webpack", "vite", "redux", "zustand",
  // Backend
  "node", "nodejs", "node.js", "express", "fastapi", "django", "flask", "rails", "spring",
  "nestjs", "graphql", "rest", "grpc", "trpc",
  // Databases
  "postgresql", "postgres", "mysql", "sqlite", "mongodb", "redis", "elasticsearch", "cassandra",
  "dynamodb", "firestore", "supabase", "prisma", "drizzle", "sqlalchemy",
  // Cloud & DevOps
  "aws", "gcp", "azure", "docker", "kubernetes", "k8s", "terraform", "ansible", "ci/cd",
  "github actions", "jenkins", "linux", "nginx", "cloudflare",
  // AI/ML
  "machine learning", "deep learning", "pytorch", "tensorflow", "llm", "openai", "langchain",
  "vector database", "embeddings", "rag", "fine-tuning",
  // Other
  "git", "agile", "scrum", "microservices", "distributed systems", "system design",
  "data structures", "algorithms", "api design", "websockets", "oauth",
]);

export interface UserProfileInput {
  skills?: string[] | null;
  experienceYears?: number | null;
  resumeText?: string | null;
  headline?: string | null;
}

export interface JobInput {
  title: string;
  description?: string | null;
  requirements?: string | null;
  company?: string | null;
}

export interface ScoringResult {
  totalScore: number;          // 0–100
  skillsMatchScore: number;    // 0–100
  semanticScore: number;       // 0–100
  titleScore: number;          // 0–100
  experienceScore: number;     // 0–100
  matchedSkills: string[];
  missingSkills: string[];
  tier: "high" | "medium" | "low";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9#+.\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function extractSkillsFromText(text: string): Set<string> {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const skill of Array.from(TECH_SKILLS)) {
    // Match whole word or phrase
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`).test(lower)) {
      found.add(skill);
    }
  }
  return found;
}

/** TF-IDF cosine similarity between two text blobs */
function cosineSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  if (!tokensA.length || !tokensB.length) return 0;

  const vocab = new Set([...tokensA, ...tokensB]);
  // vocab iteration uses Array.from below
  const tfA: Record<string, number> = {};
  const tfB: Record<string, number> = {};

  for (const t of tokensA) tfA[t] = (tfA[t] ?? 0) + 1;
  for (const t of tokensB) tfB[t] = (tfB[t] ?? 0) + 1;

  let dot = 0, magA = 0, magB = 0;
  for (const term of Array.from(vocab)) {
    const a = (tfA[term] ?? 0) / tokensA.length;
    const b = (tfB[term] ?? 0) / tokensB.length;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Extract the first explicit years-of-experience requirement from text */
function extractRequiredYears(text: string): number | null {
  const patterns = [
    /(\d+)\+?\s*years?\s+of\s+(?:professional\s+)?experience/i,
    /(\d+)\+?\s*years?\s+(?:of\s+)?(?:software|engineering|development)/i,
    /minimum\s+(?:of\s+)?(\d+)\s+years?/i,
    /at\s+least\s+(\d+)\s+years?/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return parseInt(m[1], 10);
  }
  return null;
}

// ── Main scoring function ─────────────────────────────────────────────────────

export function calculateJobScore(
  userProfile: UserProfileInput,
  job: JobInput
): ScoringResult {
  const userSkills = new Set(
    (userProfile.skills ?? []).map((s) => s.toLowerCase().trim())
  );
  const userYears = userProfile.experienceYears ?? 0;
  const userHeadline = userProfile.headline ?? "";
  const userResume = userProfile.resumeText ?? "";

  const jobText = [job.title, job.description ?? "", job.requirements ?? ""].join(" ");

  // ── 1. Skills match (55%) ─────────────────────────────────────────────────
  const jobSkillsFromDict = extractSkillsFromText(jobText);
  const userSkillsFromDict = extractSkillsFromText([userHeadline, userResume, ...(userProfile.skills ?? [])].join(" "));

  // Also include user-provided skills directly
  for (const s of Array.from(userSkills)) userSkillsFromDict.add(s);

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of Array.from(jobSkillsFromDict)) {
    if (userSkillsFromDict.has(skill)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const skillsMatchScore =
    jobSkillsFromDict.size === 0
      ? 50
      : Math.round((matchedSkills.length / jobSkillsFromDict.size) * 100);

  // ── 2. Semantic similarity (20%) ──────────────────────────────────────────
  const userContext = [userHeadline, userResume, ...(userProfile.skills ?? [])].join(" ");
  const rawSemantic = cosineSimilarity(userContext, jobText);
  // Scale: cosine sim is typically 0.05–0.5 for good matches; normalise to 0–100
  const semanticScore = Math.min(100, Math.round(rawSemantic * 300));

  // ── 3. Title match (15%) ──────────────────────────────────────────────────
  const headlineTokens = new Set(tokenize(userHeadline));
  const titleTokens = tokenize(job.title);
  const titleMatches = titleTokens.filter((t) => headlineTokens.has(t)).length;
  const titleScore =
    titleTokens.length === 0
      ? 50
      : Math.min(100, Math.round((titleMatches / titleTokens.length) * 100));

  // ── 4. Experience match (10%) ─────────────────────────────────────────────
  const requiredYears = extractRequiredYears(jobText);
  let experienceScore = 70; // default neutral
  if (requiredYears !== null) {
    if (userYears >= requiredYears) {
      // Meets or exceeds requirement
      experienceScore = Math.min(100, 70 + Math.round(((userYears - requiredYears) / Math.max(requiredYears, 1)) * 30));
    } else {
      // Below requirement
      const gap = requiredYears - userYears;
      experienceScore = Math.max(0, 70 - gap * 15);
    }
  }

  // ── Weighted total ────────────────────────────────────────────────────────
  const totalScore = Math.round(
    skillsMatchScore * 0.55 +
    semanticScore    * 0.20 +
    titleScore       * 0.15 +
    experienceScore  * 0.10
  );

  const tier: "high" | "medium" | "low" =
    totalScore >= 70 ? "high" : totalScore >= 45 ? "medium" : "low";

  return {
    totalScore,
    skillsMatchScore,
    semanticScore,
    titleScore,
    experienceScore,
    matchedSkills,
    missingSkills,
    tier,
  };
}
