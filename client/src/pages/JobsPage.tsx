import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  BookmarkPlus,
  Building2,
  ChevronRight,
  DollarSign,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("remote");
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [coverLetterJob, setCoverLetterJob] = useState<any | null>(null);

  const { data: jobs = [], isLoading: listLoading, refetch } = trpc.jobs.list.useQuery();
  const search = trpc.jobs.search.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success(`Scored ${data.length} jobs`);
    },
    onError: (e) => toast.error(e.message),
  });
  const createApp = trpc.applications.create.useMutation({
    onSuccess: () => toast.success("Added to applications"),
    onError: (e) => toast.error(e.message),
  });

  const handleSearch = () => {
    if (!query.trim()) { toast.error("Enter a job title to search"); return; }
    search.mutate({ query: query.trim(), location: location.trim() || "remote" });
  };

  const isRunning = search.isPending;

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Left: Job list ── */}
      <div className={cn("flex flex-col overflow-hidden transition-all duration-200", selectedJob ? "w-[420px] shrink-0 border-r border-border" : "flex-1")}>
        {/* Search bar */}
        <div className="p-4 border-b border-border bg-[oklch(0.12_0.005_264)] shrink-0">
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Job title, role, or keywords..."
                className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="w-32 bg-background border border-border rounded-md pl-9 pr-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isRunning}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-xs font-mono font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {isRunning ? "Scoring..." : "Run Agent"}
            </button>
          </div>

          {/* Status bar */}
          {isRunning && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-primary/10 border border-primary/20">
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              <span className="font-mono text-[11px] text-primary">
                Fetching jobs and scoring against your profile...
              </span>
            </div>
          )}
          {!isRunning && jobs.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-muted-foreground">{jobs.length} jobs</span>
              <span className="font-mono text-[11px] text-[oklch(0.72_0.18_145)]">{jobs.filter((j: any) => j.matchTier === "high").length} high match</span>
              <span className="font-mono text-[11px] text-[oklch(0.78_0.18_75)]">{jobs.filter((j: any) => j.matchTier === "medium").length} medium</span>
              <span className="font-mono text-[11px] text-[oklch(0.62_0.22_25)]">{jobs.filter((j: any) => j.matchTier === "low").length} low</span>
            </div>
          )}
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-auto">
          {listLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => <JobCardSkeleton key={i} />)}
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState onSearch={handleSearch} isRunning={isRunning} />
          ) : (
            <div className="p-3 space-y-2">
              {jobs.map((job: any) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSelected={selectedJob?.id === job.id}
                  onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                  onApply={() => createApp.mutate({ jobId: job.id })}
                  onCoverLetter={() => setCoverLetterJob(job)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Job detail panel ── */}
      {selectedJob && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-[oklch(0.12_0.005_264)] shrink-0">
            <div className="flex items-center gap-2">
              <ScoreBadge tier={selectedJob.matchTier} score={selectedJob.matchScore} />
              <span className="font-mono text-xs text-foreground font-semibold">{selectedJob.title}</span>
              <span className="font-mono text-xs text-muted-foreground">@ {selectedJob.company}</span>
            </div>
            <button onClick={() => setSelectedJob(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-5">
            <JobDetail
              job={selectedJob}
              onApply={() => createApp.mutate({ jobId: selectedJob.id })}
              onCoverLetter={() => setCoverLetterJob(selectedJob)}
            />
          </div>
        </div>
      )}

      {/* ── Cover letter modal ── */}
      {coverLetterJob && (
        <CoverLetterModal job={coverLetterJob} onClose={() => setCoverLetterJob(null)} />
      )}
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job, isSelected, onClick, onApply, onCoverLetter }: {
  job: any; isSelected: boolean; onClick: () => void; onApply: () => void; onCoverLetter: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg p-3 cursor-pointer transition-all duration-150 group panel-border",
        isSelected ? "bg-primary/10 border-primary/50" : "bg-card hover:border-primary/30 hover:bg-card/80"
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
        <ScoreBadge tier={job.matchTier} score={job.matchScore} />
      </div>

      <div className="flex items-center gap-3 mb-2">
        {job.location && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="font-mono text-[10px] text-muted-foreground">{job.location}</span>
          </div>
        )}
        {job.jobType && (
          <span className="font-mono text-[10px] text-muted-foreground">{job.jobType}</span>
        )}
        {(job.salaryMin || job.salaryMax) && (
          <div className="flex items-center gap-0.5">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            <span className="font-mono text-[10px] text-muted-foreground">
              {job.salaryMin ? `${(job.salaryMin / 1000).toFixed(0)}k` : ""}
              {job.salaryMin && job.salaryMax ? "–" : ""}
              {job.salaryMax ? `${(job.salaryMax / 1000).toFixed(0)}k` : ""}
            </span>
          </div>
        )}
      </div>

      {job.description && (
        <p className="font-mono text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">
          {job.description}
        </p>
      )}

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onCoverLetter(); }}
          className="flex items-center gap-1 text-[10px] font-mono text-primary hover:underline"
        >
          <FileText className="w-3 h-3" /> Cover Letter
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onApply(); }}
          className="flex items-center gap-1 text-[10px] font-mono text-[oklch(0.72_0.18_145)] hover:underline"
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
            <ExternalLink className="w-3 h-3" /> Apply
          </a>
        )}
      </div>
    </div>
  );
}

// ── Score Badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ tier, score }: { tier: string; score: number }) {
  const pct = Math.round((score ?? 0) * 100);
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0",
      tier === "high" ? "badge-high" : tier === "medium" ? "badge-medium" : "badge-low"
    )}>
      {pct}%
    </span>
  );
}

// ── Job Detail ────────────────────────────────────────────────────────────────
function JobDetail({ job, onApply, onCoverLetter }: { job: any; onApply: () => void; onCoverLetter: () => void }) {
  return (
    <div className="space-y-5">
      {/* Meta */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "company", value: job.company },
          { label: "location", value: job.location },
          { label: "type", value: job.jobType },
          { label: "salary", value: job.salaryMin ? `$${(job.salaryMin / 1000).toFixed(0)}k–$${(job.salaryMax / 1000).toFixed(0)}k` : "Not specified" },
          { label: "source", value: job.source },
          { label: "matchScore", value: `${Math.round((job.matchScore ?? 0) * 100)}% (${job.matchTier})` },
        ].map(({ label, value }) => value && (
          <div key={label} className="panel-border rounded-md p-2.5 bg-card">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
            <p className="font-mono text-xs text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      {job.reasoning && (
        <div className="panel-border rounded-md p-3 bg-primary/5 border-primary/20">
          <p className="font-mono text-[10px] text-primary uppercase tracking-wider mb-1.5">AI Reasoning</p>
          <p className="font-mono text-xs text-foreground/80 leading-relaxed">{job.reasoning}</p>
        </div>
      )}

      {/* Description */}
      {job.description && (
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Description</p>
          <p className="font-mono text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{job.description}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <button
          onClick={onCoverLetter}
          className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/30 rounded-md px-4 py-2 text-xs font-mono font-semibold hover:bg-primary/20 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" /> View Cover Letter
        </button>
        <button
          onClick={onApply}
          className="flex items-center gap-2 bg-[oklch(0.72_0.18_145)]/10 text-[oklch(0.72_0.18_145)] border border-[oklch(0.72_0.18_145)]/30 rounded-md px-4 py-2 text-xs font-mono font-semibold hover:bg-[oklch(0.72_0.18_145)]/20 transition-colors"
        >
          <BookmarkPlus className="w-3.5 h-3.5" /> Track Application
        </button>
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground border border-border rounded-md px-4 py-2 text-xs font-mono hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Apply Externally
          </a>
        )}
      </div>
    </div>
  );
}

// ── Cover Letter Modal ────────────────────────────────────────────────────────
function CoverLetterModal({ job, onClose }: { job: any; onClose: () => void }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(job.coverLetter ?? "");
    toast.success("Copied to clipboard");
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card panel-border rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs font-semibold text-foreground">cover_letter.md</span>
            <span className="font-mono text-xs text-muted-foreground">— {job.title} @ {job.company}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="font-mono text-[11px] text-primary hover:underline"
            >
              Copy
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {job.coverLetter ? (
            <div className="font-mono text-xs text-foreground/85 leading-7 whitespace-pre-wrap">
              {job.coverLetter}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <FileText className="w-6 h-6 text-muted-foreground" />
              <p className="font-mono text-xs text-muted-foreground">No cover letter generated. Run the agent to score this job.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onSearch, isRunning }: { onSearch: () => void; isRunning: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <div className="text-center">
        <p className="font-mono text-sm font-semibold text-foreground mb-1">No jobs yet</p>
        <p className="font-mono text-xs text-muted-foreground max-w-xs">
          Enter a job title and click "Run Agent" to fetch and score listings against your profile.
        </p>
      </div>
      <button
        onClick={onSearch}
        disabled={isRunning}
        className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-xs font-mono font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <Zap className="w-3.5 h-3.5" /> Run Agent
      </button>
    </div>
  );
}

function JobCardSkeleton() {
  return (
    <div className="rounded-lg p-3 panel-border bg-card animate-pulse">
      <div className="flex justify-between mb-2">
        <div className="space-y-1.5">
          <div className="h-3 w-40 bg-muted rounded" />
          <div className="h-2.5 w-24 bg-muted rounded" />
        </div>
        <div className="h-5 w-12 bg-muted rounded" />
      </div>
      <div className="h-2.5 w-full bg-muted rounded mb-1" />
      <div className="h-2.5 w-3/4 bg-muted rounded" />
    </div>
  );
}
