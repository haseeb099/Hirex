import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  TrendingUp,
  User,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tier = "high" | "medium" | "low";

interface RankedJob {
  rank: number;
  matchScore: number | null;
  skillsMatchScore: number | null;
  semanticScore: number | null;
  titleScore: number | null;
  experienceScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  tier: Tier;
  job: {
    id: number;
    title: string;
    company: string;
    location: string | null;
    jobType: string | null;
    description: string | null;
    url: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
  } | null;
}

// ── Tier badge ────────────────────────────────────────────────────────────────
function TierBadge({ tier, score }: { tier: Tier; score: number | null }) {
  const cfg = {
    high:   { bg: "bg-[oklch(0.72_0.18_145)]/15", border: "border-[oklch(0.72_0.18_145)]/40", text: "text-[oklch(0.72_0.18_145)]" },
    medium: { bg: "bg-[oklch(0.78_0.18_75)]/15",  border: "border-[oklch(0.78_0.18_75)]/40",  text: "text-[oklch(0.78_0.18_75)]" },
    low:    { bg: "bg-[oklch(0.62_0.22_25)]/15",  border: "border-[oklch(0.62_0.22_25)]/40",  text: "text-[oklch(0.62_0.22_25)]" },
  }[tier];

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-semibold uppercase tracking-wide", cfg.bg, cfg.border, cfg.text)}>
      {score !== null ? `${score}%` : tier}
    </span>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value ?? 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono text-foreground">{pct}%</span>
      </div>
      <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 70
              ? "oklch(0.72 0.18 145)"
              : pct >= 45
              ? "oklch(0.78 0.18 75)"
              : "oklch(0.62 0.22 25)",
          }}
        />
      </div>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
  const { data: profile, refetch } = trpc.jobs.getProfile.useQuery();
  const saveProfile = trpc.jobs.saveProfile.useMutation({
    onSuccess: () => { refetch(); toast.success("Profile saved"); },
    onError: (e) => toast.error(e.message),
  });

  const [headline, setHeadline] = useState("");
  const [skills, setSkills] = useState("");
  const [years, setYears] = useState("");
  const [resume, setResume] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setHeadline(profile.headline ?? "");
      setSkills(((profile.skills as string[] | null) ?? []).join(", "));
      setYears(String(profile.experienceYears ?? ""));
      setResume(profile.resumeText ?? "");
    }
  }, [profile]);

  const handleSave = () => {
    const skillsArr = skills.split(",").map((s) => s.trim()).filter(Boolean);
    saveProfile.mutate({
      headline: headline.trim() || undefined,
      skills: skillsArr.length ? skillsArr : undefined,
      experienceYears: years ? parseInt(years, 10) : undefined,
      resumeText: resume.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Headline */}
      <div className="space-y-1.5">
        <label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
          <User className="w-3 h-3" /> headline
        </label>
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Senior Full-Stack Engineer with 6 years TypeScript experience"
          className="w-full bg-[oklch(0.10_0.005_264)] border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Skills */}
      <div className="space-y-1.5">
        <label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
          <Zap className="w-3 h-3" /> skills <span className="text-muted-foreground/50">(comma-separated)</span>
        </label>
        <input
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="TypeScript, React, Node.js, PostgreSQL, Docker..."
          className="w-full bg-[oklch(0.10_0.005_264)] border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
        />
        {skills && (
          <div className="flex flex-wrap gap-1 pt-1">
            {skills.split(",").map((s) => s.trim()).filter(Boolean).map((skill) => (
              <span key={skill} className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] font-mono text-primary">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Experience */}
      <div className="space-y-1.5">
        <label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3" /> years of experience
        </label>
        <input
          type="number"
          min={0}
          max={60}
          value={years}
          onChange={(e) => setYears(e.target.value)}
          placeholder="6"
          className="w-32 bg-[oklch(0.10_0.005_264)] border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Resume text */}
      <div className="space-y-1.5">
        <label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
          <BookOpen className="w-3 h-3" /> resume / bio <span className="text-muted-foreground/50">(paste or summarise)</span>
        </label>
        <textarea
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          rows={8}
          placeholder="Paste your resume text or write a summary of your background, projects, and achievements..."
          className="w-full bg-[oklch(0.10_0.005_264)] border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors resize-none"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saveProfile.isPending}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono font-medium transition-all duration-150 active:scale-[0.97]",
          saved
            ? "bg-[oklch(0.72_0.18_145)]/20 border border-[oklch(0.72_0.18_145)]/40 text-[oklch(0.72_0.18_145)]"
            : "bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
        )}
      >
        {saveProfile.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : saved ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <Save className="w-3 h-3" />
        )}
        {saveProfile.isPending ? "saving..." : saved ? "saved!" : "save_profile()"}
      </button>
    </div>
  );
}

// ── Ranked Jobs Tab ───────────────────────────────────────────────────────────
function RankedJobsTab({ onRefresh, isRefreshing }: { onRefresh: () => void; isRefreshing: boolean }) {
  const { data: ranked = [], isLoading, refetch } = trpc.jobs.getRanked.useQuery({ limit: 30 });
  const scoreJobs = trpc.jobs.scoreJobs.useMutation({
    onSuccess: (res) => {
      refetch();
      toast.success(`Scored ${res.scored} jobs`);
    },
    onError: (e) => toast.error(e.message),
  });

  const [expanded, setExpanded] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground py-8">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        loading ranked jobs...
      </div>
    );
  }

  if (!ranked.length) {
    return (
      <div className="py-12 text-center space-y-3">
        <Target className="w-8 h-8 text-muted-foreground/30 mx-auto" />
        <p className="text-xs font-mono text-muted-foreground">No ranked jobs yet.</p>
        <p className="text-[11px] font-mono text-muted-foreground/60">
          Click <span className="text-primary">Refresh Jobs</span> to fetch listings, then{" "}
          <span className="text-primary">Score Jobs</span> to rank them against your profile.
        </p>
        <button
          onClick={() => scoreJobs.mutate()}
          disabled={scoreJobs.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-xs font-mono text-primary hover:bg-primary/20 transition-colors"
        >
          {scoreJobs.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          score_jobs()
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Action bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-mono text-muted-foreground">{ranked.length} jobs ranked by match score</span>
        <button
          onClick={() => scoreJobs.mutate()}
          disabled={scoreJobs.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-xs font-mono text-primary hover:bg-primary/20 transition-colors active:scale-[0.97]"
        >
          {scoreJobs.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          re-score
        </button>
      </div>

      {(ranked as RankedJob[]).map((item) => {
        if (!item.job) return null;
        const isOpen = expanded === item.rank;
        return (
          <div
            key={item.rank}
            className={cn(
              "border rounded-lg overflow-hidden transition-all duration-200",
              isOpen ? "border-primary/30 bg-[oklch(0.12_0.008_264)]" : "border-border bg-[oklch(0.10_0.005_264)] hover:border-border/80"
            )}
          >
            {/* Card header */}
            <button
              className="w-full flex items-center gap-3 p-3 text-left"
              onClick={() => setExpanded(isOpen ? null : item.rank)}
            >
              {/* Rank */}
              <span className="w-6 h-6 rounded bg-muted/30 flex items-center justify-center text-[10px] font-mono text-muted-foreground shrink-0">
                #{item.rank}
              </span>

              {/* Title + company */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-medium text-foreground truncate">{item.job.title}</p>
                <p className="text-[10px] font-mono text-muted-foreground truncate">{item.job.company} · {item.job.location ?? "Remote"}</p>
              </div>

              {/* Match score badge */}
              <TierBadge tier={item.tier} score={item.matchScore} />

              <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0", isOpen && "rotate-90")} />
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                {/* Score breakdown */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  <ScoreBar label="skills match" value={item.skillsMatchScore} />
                  <ScoreBar label="semantic fit" value={item.semanticScore} />
                  <ScoreBar label="title match" value={item.titleScore} />
                  <ScoreBar label="experience" value={item.experienceScore} />
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1">
                  {item.matchedSkills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[oklch(0.72_0.18_145)]/10 border border-[oklch(0.72_0.18_145)]/25 text-[10px] font-mono text-[oklch(0.72_0.18_145)]">
                      <CheckCircle2 className="w-2.5 h-2.5" /> {s}
                    </span>
                  ))}
                  {item.missingSkills.slice(0, 5).map((s) => (
                    <span key={s} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[oklch(0.78_0.18_75)]/10 border border-[oklch(0.78_0.18_75)]/25 text-[10px] font-mono text-[oklch(0.78_0.18_75)]">
                      <XCircle className="w-2.5 h-2.5" /> {s}
                    </span>
                  ))}
                </div>

                {/* Description preview */}
                {item.job.description && (
                  <p className="text-[11px] font-mono text-muted-foreground leading-relaxed line-clamp-3">
                    {item.job.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)}...
                  </p>
                )}

                {/* View job */}
                {item.job.url && (
                  <a
                    href={item.job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-xs font-mono text-primary hover:bg-primary/20 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> view_job()
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Insights Tab ──────────────────────────────────────────────────────────────
function InsightsTab() {
  const { data: ranked = [] } = trpc.jobs.getRanked.useQuery({ limit: 30 });
  const { data: profile } = trpc.jobs.getProfile.useQuery();

  const typedRanked = ranked as RankedJob[];

  // Aggregate missing skills across all ranked jobs
  const missingSkillCounts: Record<string, number> = {};
  for (const item of typedRanked) {
    for (const skill of item.missingSkills ?? []) {
      missingSkillCounts[skill] = (missingSkillCounts[skill] ?? 0) + 1;
    }
  }
  const topMissing = Object.entries(missingSkillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  // Top match
  const topMatch = typedRanked[0];

  // Average score
  const avgScore = typedRanked.length
    ? Math.round(typedRanked.reduce((s, r) => s + (r.matchScore ?? 0), 0) / typedRanked.length)
    : 0;

  const highCount = typedRanked.filter((r) => r.tier === "high").length;
  const medCount  = typedRanked.filter((r) => r.tier === "medium").length;
  const lowCount  = typedRanked.filter((r) => r.tier === "low").length;

  if (!typedRanked.length) {
    return (
      <div className="py-12 text-center">
        <BrainCircuit className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-xs font-mono text-muted-foreground">No insights yet — fetch and score some jobs first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "avg score", value: `${avgScore}%`, color: "text-primary" },
          { label: "high match", value: String(highCount), color: "text-[oklch(0.72_0.18_145)]" },
          { label: "medium", value: String(medCount), color: "text-[oklch(0.78_0.18_75)]" },
          { label: "low match", value: String(lowCount), color: "text-[oklch(0.62_0.22_25)]" },
        ].map((s) => (
          <div key={s.label} className="bg-[oklch(0.10_0.005_264)] border border-border rounded-lg p-3 text-center">
            <p className={cn("text-lg font-mono font-bold", s.color)}>{s.value}</p>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Top missing skills */}
      {topMissing.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-semibold text-foreground flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-[oklch(0.78_0.18_75)]" />
            top missing skills
          </h3>
          <div className="space-y-2">
            {topMissing.map(([skill, count]) => (
              <div key={skill} className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-foreground w-32 truncate">{skill}</span>
                <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[oklch(0.78_0.18_75)] rounded-full"
                    style={{ width: `${(count / typedRanked.length) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground w-16 text-right">
                  {count}/{typedRanked.length} jobs
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/70 leading-relaxed pt-1">
            Adding these skills to your profile or resume could significantly improve your match scores.
          </p>
        </div>
      )}

      {/* Resume tip */}
      {topMatch?.job && (
        <div className="space-y-2">
          <h3 className="text-xs font-mono font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            resume tip
          </h3>
          <div className="bg-[oklch(0.10_0.005_264)] border border-border rounded-lg p-4 space-y-2">
            <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
              Your best match is <span className="text-foreground font-semibold">{topMatch.job.title}</span> at{" "}
              <span className="text-foreground font-semibold">{topMatch.job.company}</span> with a{" "}
              <span className="text-primary font-semibold">{topMatch.matchScore}%</span> match score.
            </p>
            {topMatch.missingSkills.length > 0 && (
              <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
                To improve your score for this role, consider highlighting{" "}
                <span className="text-[oklch(0.78_0.18_75)]">{topMatch.missingSkills.slice(0, 3).join(", ")}</span>{" "}
                in your resume or acquiring these skills.
              </p>
            )}
            {profile?.skills && (
              <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
                You currently have <span className="text-primary">{((profile.skills as string[]) ?? []).length} skills</span> listed.
                {topMissing.length > 0 && ` Adding ${topMissing[0]?.[0] ?? ""} could open up more opportunities.`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
type Tab = "profile" | "ranked" | "insights";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("ranked");

  const refresh = trpc.jobs.refresh.useMutation({
    onSuccess: (res) => toast.success(`Fetched ${res.fetched} jobs, saved ${res.saved} new`),
    onError: (e) => toast.error(e.message),
  });

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: "ranked",   label: "ranked_jobs",  icon: <Target className="w-3.5 h-3.5" /> },
    { id: "profile",  label: "profile",      icon: <User className="w-3.5 h-3.5" /> },
    { id: "insights", label: "insights",     icon: <BrainCircuit className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0 bg-[oklch(0.12_0.005_264)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono font-semibold text-foreground">job_agent.dashboard</span>
        </div>
        <button
          onClick={() => refresh.mutate({})}
          disabled={refresh.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-xs font-mono text-primary hover:bg-primary/20 transition-all duration-150 active:scale-[0.97]"
        >
          {refresh.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          {refresh.isPending ? "fetching..." : "refresh_jobs()"}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 px-5 border-b border-border shrink-0 bg-[oklch(0.11_0.005_264)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono border-b-2 transition-all duration-150",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-5">
        {tab === "profile"  && <ProfileTab />}
        {tab === "ranked"   && <RankedJobsTab onRefresh={() => refresh.mutate({})} isRefreshing={refresh.isPending} />}
        {tab === "insights" && <InsightsTab />}
      </div>
    </div>
  );
}
