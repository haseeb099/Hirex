/**
 * client/src/pages/JobsPage.tsx
 * Job search, import, and apply kit generation — v2.0
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  BookmarkPlus, Building2, ExternalLink, FileText, Globe,
  Link2, Loader2, MapPin, Search, Sparkles, Star, Zap,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
type RankedJob = {
  rank: number;
  matchScore: number | null;
  tier: string;
  matchedSkills: string[];
  missingSkills: string[];
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    jobType: string | null;
    description: string | null;
    requirements: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    url: string | null;
    source: string | null;
  } | null;
};

// ── Score Badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ tier, score }: { tier: string; score: number | null }) {
  const pct = Math.round(score ?? 0);
  const cls =
    tier === "high"
      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
      : tier === "medium"
      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
      : "bg-red-500/20 text-red-400 border border-red-500/30";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0", cls)}>
      {pct}%
    </span>
  );
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({
  ranked,
  isSelected,
  onClick,
  onApply,
  onApplyKit,
}: {
  ranked: RankedJob;
  isSelected: boolean;
  onClick: () => void;
  onApply: () => void;
  onApplyKit: () => void;
}) {
  const job = ranked.job;
  if (!job) return null;
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg p-3 cursor-pointer transition-all duration-150 group border",
        isSelected
          ? "bg-primary/10 border-primary/50"
          : "bg-card border-border hover:border-primary/30 hover:bg-card/80"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="font-mono text-xs font-semibold text-foreground truncate">{job.title}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="font-mono text-[11px] text-muted-foreground truncate">{job.company}</span>
          </div>
        </div>
        <ScoreBadge tier={ranked.tier} score={ranked.matchScore} />
      </div>

      <div className="flex items-center gap-3 mb-2 flex-wrap">
        {job.location && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="font-mono text-[10px] text-muted-foreground">{job.location}</span>
          </div>
        )}
        {job.jobType && (
          <span className="font-mono text-[10px] text-muted-foreground capitalize">{job.jobType.replace("_", " ")}</span>
        )}
        {(job.salaryMin || job.salaryMax) && (
          <span className="font-mono text-[10px] text-emerald-400">
            {job.salaryMin ? `$${(job.salaryMin / 1000).toFixed(0)}k` : ""}
            {job.salaryMin && job.salaryMax ? "–" : ""}
            {job.salaryMax ? `$${(job.salaryMax / 1000).toFixed(0)}k` : ""}
          </span>
        )}
      </div>

      {job.description && (
        <p className="font-mono text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">
          {job.description}
        </p>
      )}

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
        <button
          onClick={(e) => { e.stopPropagation(); onApplyKit(); }}
          className="flex items-center gap-1 text-[10px] font-mono text-amber-400 hover:underline"
        >
          <Sparkles className="w-3 h-3" /> Apply Kit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onApply(); }}
          className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:underline"
        >
          <BookmarkPlus className="w-3 h-3" /> Track
        </button>
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="w-3 h-3" /> View
          </a>
        )}
      </div>
    </div>
  );
}

// ── Import Panel ──────────────────────────────────────────────────────────────
function ImportPanel({ onImported }: { onImported: (job: { title: string; company: string; description: string | null; id: number }) => void }) {
  const [tab, setTab] = useState<"url" | "paste">("url");
  const [importUrl, setImportUrl] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteCompany, setPasteCompany] = useState("");
  const [pasteJD, setPasteJD] = useState("");

  const urlImport = trpc.jobImport.fromUrl.useMutation({
    onSuccess: (job) => { toast.success(`Imported: ${job.title}`); setImportUrl(""); onImported(job); },
    onError: (e) => toast.error(e.message),
  });
  const pasteImport = trpc.jobImport.fromText.useMutation({
    onSuccess: (job) => { toast.success(`Imported: ${job.title}`); setPasteJD(""); setPasteTitle(""); setPasteCompany(""); onImported(job); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("url")}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors", tab === "url" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <Link2 className="w-3.5 h-3.5" /> Import URL
        </button>
        <button
          onClick={() => setTab("paste")}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors", tab === "paste" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <FileText className="w-3.5 h-3.5" /> Paste JD
        </button>
      </div>

      {tab === "url" ? (
        <div className="space-y-3">
          <div>
            <label className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">Job Posting URL</label>
            <input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://linkedin.com/jobs/view/..."
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={() => urlImport.mutate({ url: importUrl })}
            disabled={!importUrl.startsWith("http") || urlImport.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-xs font-mono font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {urlImport.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Extracting...</> : <><Sparkles className="w-3.5 h-3.5" />Import & Generate Apply Kit</>}
          </button>
          <p className="font-mono text-[10px] text-muted-foreground">Uses 1 AI credit. Works with LinkedIn, Indeed, Greenhouse, Lever, and most job boards.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">Job Title</label>
              <input
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                placeholder="Senior Engineer"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">Company</label>
              <input
                value={pasteCompany}
                onChange={(e) => setPasteCompany(e.target.value)}
                placeholder="Stripe"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">Job Description</label>
            <textarea
              value={pasteJD}
              onChange={(e) => setPasteJD(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={8}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
            />
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{pasteJD.length} / 20,000</p>
          </div>
          <button
            onClick={() => pasteImport.mutate({ jobDescription: pasteJD, jobTitle: pasteTitle || undefined, company: pasteCompany || undefined })}
            disabled={pasteJD.length < 50 || pasteImport.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-xs font-mono font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {pasteImport.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating...</> : <><Sparkles className="w-3.5 h-3.5" />Generate Apply Kit</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JobsPage() {
  const [, navigate] = useLocation();
  const [selectedRanked, setSelectedRanked] = useState<RankedJob | null>(null);
  const [activeTab, setActiveTab] = useState<"ranked" | "import">("ranked");
  const [category, setCategory] = useState("");

  const rankedQuery = trpc.jobs.getRanked.useQuery({ limit: 50 });
  const createApp = trpc.applications.create.useMutation({
    onSuccess: () => toast.success("Added to applications"),
    onError: (e) => toast.error(e.message),
  });

  const refreshMutation = trpc.jobs.refresh.useMutation({
    onSuccess: () => {
      toast.success("Jobs fetched — running AI scoring...");
      scoreMutation.mutate();
    },
    onError: (e) => toast.error(e.message),
  });

  const scoreMutation = trpc.jobs.scoreJobs.useMutation({
    onSuccess: (data) => {
      toast.success(`Scored ${(data as { scored: number }).scored} jobs`);
      rankedQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  function goToApplyKit(job: { title: string; company: string; description: string | null; id: number }) {
    const params = new URLSearchParams({
      title: job.title,
      company: job.company,
      desc: (job.description ?? "").slice(0, 2000),
      jobId: job.id.toString(),
    });
    navigate(`/apply?${params.toString()}`);
  }

  const isSearching = refreshMutation.isPending || scoreMutation.isPending;
  const rankedJobs: RankedJob[] = (rankedQuery.data ?? []) as RankedJob[];

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Left panel ── */}
      <div className={cn("flex flex-col overflow-hidden transition-all duration-200", selectedRanked ? "w-[420px] shrink-0 border-r border-border" : "flex-1")}>
        {/* Header */}
        <div className="p-4 border-b border-border bg-[oklch(0.12_0.005_264)] shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setActiveTab("ranked")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors", activeTab === "ranked" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Star className="w-3.5 h-3.5" /> Ranked Jobs ({rankedJobs.length})
            </button>
            <button
              onClick={() => setActiveTab("import")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors", activeTab === "import" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Link2 className="w-3.5 h-3.5" /> Import Job
            </button>
          </div>

          {activeTab === "ranked" && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category (e.g. software-dev, design)..."
                  className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <button
                onClick={() => refreshMutation.mutate({ category: category || undefined })}
                disabled={isSearching}
                className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-xs font-mono font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {isSearching ? "Scoring..." : "Fetch & Score"}
              </button>
            </div>
          )}

          {isSearching && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-primary/10 border border-primary/20 mt-2">
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              <span className="font-mono text-[11px] text-primary">Fetching live jobs from Remotive and scoring against your profile...</span>
            </div>
          )}
        </div>

        {/* Content */}
        {activeTab === "import" ? (
          <div className="flex-1 overflow-auto">
            <ImportPanel onImported={goToApplyKit} />
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {rankedQuery.isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-card border border-border animate-pulse" />
                ))}
              </div>
            ) : rankedJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Globe className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="font-mono text-sm text-muted-foreground">No ranked jobs yet</p>
                <p className="font-mono text-[11px] text-muted-foreground/60 mt-1 max-w-xs">
                  Click <strong className="text-primary">Fetch & Score</strong> to pull live remote jobs from Remotive and rank them against your profile.
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {rankedJobs.map((r) => (
                  <JobCard
                    key={r.rank}
                    ranked={r}
                    isSelected={selectedRanked?.rank === r.rank}
                    onClick={() => setSelectedRanked(selectedRanked?.rank === r.rank ? null : r)}
                    onApply={() => r.job && createApp.mutate({ jobId: r.job.id })}
                    onApplyKit={() => r.job && goToApplyKit(r.job)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right: Detail panel ── */}
      {selectedRanked?.job && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-[oklch(0.12_0.005_264)] shrink-0">
            <div className="flex items-center gap-2">
              <ScoreBadge tier={selectedRanked.tier} score={selectedRanked.matchScore} />
              <span className="font-mono text-xs text-foreground font-semibold">{selectedRanked.job.title}</span>
              <span className="font-mono text-xs text-muted-foreground">@ {selectedRanked.job.company}</span>
            </div>
            <button onClick={() => setSelectedRanked(null)} className="text-muted-foreground hover:text-foreground transition-colors font-mono text-xs">✕</button>
          </div>
          <div className="flex-1 overflow-auto p-5 space-y-5">
            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "company", value: selectedRanked.job.company },
                { label: "location", value: selectedRanked.job.location },
                { label: "type", value: selectedRanked.job.jobType?.replace("_", " ") },
                { label: "salary", value: selectedRanked.job.salaryMin ? `$${(selectedRanked.job.salaryMin / 1000).toFixed(0)}k–$${((selectedRanked.job.salaryMax ?? 0) / 1000).toFixed(0)}k` : null },
                { label: "match", value: `${selectedRanked.matchScore ?? 0}% (${selectedRanked.tier})` },
                { label: "source", value: selectedRanked.job.source },
              ].filter((x) => x.value).map(({ label, value }) => (
                <div key={label} className="rounded-md p-2.5 bg-card border border-border">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="font-mono text-xs text-foreground capitalize">{value}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {selectedRanked.job.description && (
              <div>
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                <p className="font-mono text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{selectedRanked.job.description}</p>
              </div>
            )}

            {/* Requirements */}
            {selectedRanked.job.requirements && (
              <div>
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Requirements</p>
                <p className="font-mono text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{selectedRanked.job.requirements}</p>
              </div>
            )}

            {/* Skills chips */}
            {(selectedRanked.matchedSkills?.length > 0 || selectedRanked.missingSkills?.length > 0) && (
              <div className="space-y-2">
                {selectedRanked.matchedSkills?.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Matched Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRanked.matchedSkills.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedRanked.missingSkills?.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Missing Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRanked.missingSkills.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-500/15 text-red-400 border border-red-500/25">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
              <button
                onClick={() => selectedRanked.job && goToApplyKit(selectedRanked.job)}
                className="flex items-center gap-2 bg-amber-400/10 text-amber-400 border border-amber-400/30 rounded-md px-4 py-2 text-xs font-mono font-semibold hover:bg-amber-400/20 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> Generate Apply Kit
              </button>
              <button
                onClick={() => selectedRanked.job && createApp.mutate({ jobId: selectedRanked.job.id })}
                className="flex items-center gap-2 bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 rounded-md px-4 py-2 text-xs font-mono font-semibold hover:bg-emerald-400/20 transition-colors"
              >
                <BookmarkPlus className="w-3.5 h-3.5" /> Track Application
              </button>
              {selectedRanked.job.url && (
                <a
                  href={selectedRanked.job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground border border-border rounded-md px-4 py-2 text-xs font-mono hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Apply Externally
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
