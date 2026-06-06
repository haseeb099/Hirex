import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Download,
  FileText,
  Linkedin,
  Loader2,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
type KitTab = "cv" | "cover" | "linkedin" | "interview";

const TABS: { id: KitTab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "cv",        label: "ATS CV",          icon: FileText,     color: "text-emerald-400" },
  { id: "cover",     label: "Cover Letter",     icon: MessageSquare, color: "text-blue-400"   },
  { id: "linkedin",  label: "LinkedIn Summary", icon: Linkedin,     color: "text-sky-400"    },
  { id: "interview", label: "Interview Prep",   icon: BookOpen,     color: "text-amber-400"  },
];

const SCORE_COLOR = (score: number) =>
  score >= 70 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
  : score >= 45 ? "text-amber-400 bg-amber-400/10 border-amber-400/30"
  : "text-red-400 bg-red-400/10 border-red-400/30";

const SCORE_LABEL = (score: number) =>
  score >= 70 ? "High Match" : score >= 45 ? "Medium Match" : "Low Match";

// ── Copy helper ───────────────────────────────────────────────────────────────
function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success(`${label} copied to clipboard`);
  });
}

// ── Download helper ───────────────────────────────────────────────────────────
function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${filename} downloaded`);
}

// ── Kit Result Panel ──────────────────────────────────────────────────────────
type ApplyKitItem = {
  id: number;
  userId: number;
  jobId?: number | null;
  jobTitle?: string | null;
  company?: string | null;
  jobDescription?: string | null;
  atsCV?: string | null;
  coverLetter?: string | null;
  linkedinSummary?: string | null;
  interviewPrep?: string | null;
  matchScore?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

function KitResultPanel({ kit }: { kit: ApplyKitItem }) {
  const [activeTab, setActiveTab] = useState<KitTab>("cv");
  const [expanded, setExpanded] = useState(true);

  const content: Record<KitTab, string> = {
    cv:        kit.atsCV ?? "",
    cover:     kit.coverLetter ?? "",
    linkedin:  kit.linkedinSummary ?? "",
    interview: kit.interviewPrep ?? "",
  };

  const filenames: Record<KitTab, string> = {
    cv:        `CV_${kit.company ?? "company"}_${kit.jobTitle ?? "role"}.txt`,
    cover:     `CoverLetter_${kit.company ?? "company"}_${kit.jobTitle ?? "role"}.txt`,
    linkedin:  `LinkedIn_${kit.jobTitle ?? "role"}.txt`,
    interview: `InterviewPrep_${kit.company ?? "company"}_${kit.jobTitle ?? "role"}.txt`,
  };

  const score = kit.matchScore ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-foreground truncate">
              {kit.jobTitle || "Untitled Role"}
            </span>
            {kit.company && (
              <span className="font-mono text-xs text-muted-foreground">@ {kit.company}</span>
            )}
            <span className={cn(
              "font-mono text-[10px] px-2 py-0.5 rounded-full border font-semibold",
              SCORE_COLOR(score)
            )}>
              {score}% · {SCORE_LABEL(score)}
            </span>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
            {new Date(kit.createdAt).toLocaleString()}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-border">
          {/* Tab bar */}
          <div className="flex border-b border-border bg-[oklch(0.11_0.005_264)]">
            {TABS.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-mono transition-all border-b-2",
                  activeTab === id
                    ? `border-primary text-foreground bg-background`
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", activeTab === id ? color : "")} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="relative">
            <div className="absolute top-2 right-2 flex gap-1 z-10">
              <button
                onClick={() => copyToClipboard(content[activeTab], TABS.find((t) => t.id === activeTab)?.label ?? "")}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                title="Copy to clipboard"
              >
                <ClipboardCopy className="w-3 h-3" />
                Copy
              </button>
              <button
                onClick={() => downloadText(content[activeTab], filenames[activeTab])}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                title="Download as .txt"
              >
                <Download className="w-3 h-3" />
                .txt
              </button>
            </div>
            <pre className="p-4 pt-10 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed overflow-auto max-h-[500px] bg-[oklch(0.10_0.004_264)]">
              {content[activeTab] || (
                <span className="text-muted-foreground italic">No content generated for this section.</span>
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ApplyPage() {
  // Pre-fill from URL query params (e.g. from Dashboard ranked job cards)
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [jobDescription, setJobDescription] = useState(params.get("desc") ?? "");
  const [jobTitle, setJobTitle] = useState(params.get("title") ?? "");
  const [company, setCompany] = useState(params.get("company") ?? "");
  const [showForm, setShowForm] = useState(true);

  const { data: kits, isLoading: kitsLoading, refetch } = trpc.applyKit.list.useQuery();

  const generate = trpc.applyKit.generate.useMutation({
    onSuccess: () => {
      toast.success("Apply kit generated!", { description: "All 4 materials are ready." });
      refetch();
      setShowForm(false);
      setJobDescription("");
      setJobTitle("");
      setCompany("");
    },
    onError: (err) => {
      toast.error("Generation failed", { description: err.message });
    },
  });

  const handleGenerate = () => {
    if (!jobDescription.trim() || jobDescription.trim().length < 10) {
      toast.error("Please paste a job description (at least 10 characters).");
      return;
    }
    generate.mutate({ jobDescription, jobTitle, company });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-[oklch(0.12_0.005_264)] shrink-0">
        <Sparkles className="w-4 h-4 text-primary" />
        <h1 className="font-mono text-sm font-semibold text-foreground">Apply Materials Generator</h1>
        <div className="flex-1" />
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-mono transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New Kit
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

          {/* ── Input form ── */}
          {showForm && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-[oklch(0.11_0.005_264)]">
                <p className="font-mono text-xs font-semibold text-foreground">
                  Paste Job Description
                </p>
                <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                  Paste the full JD below. The AI will generate an ATS-optimised CV, cover letter, LinkedIn summary, and interview prep — all tailored to this specific role.
                </p>
              </div>

              <div className="p-4 space-y-3">
                {/* Job title + company row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                      Job Title <span className="text-muted-foreground/50">(optional)</span>
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="e.g. Senior Software Engineer"
                        className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-md font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                      Company <span className="text-muted-foreground/50">(optional)</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Stripe"
                        className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-md font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* JD textarea */}
                <div>
                  <label className="block font-mono text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                    Job Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder={`Paste the full job description here...\n\nExample:\nWe are looking for a Senior Software Engineer to join our platform team...\n\nResponsibilities:\n- Design and build scalable backend services\n- Collaborate with cross-functional teams\n...\n\nRequirements:\n- 5+ years of experience with TypeScript/Node.js\n- Strong system design skills\n...`}
                    rows={14}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary resize-y leading-relaxed"
                  />
                  <p className="font-mono text-[10px] text-muted-foreground mt-1">
                    {jobDescription.length.toLocaleString()} / 20,000 characters
                  </p>
                </div>

                {/* What gets generated */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TABS.map(({ id, label, icon: Icon, color }) => (
                    <div key={id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent/20 border border-border">
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", color)} />
                      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={generate.isPending || !jobDescription.trim()}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-md font-mono text-sm font-semibold transition-all",
                    generate.isPending || !jobDescription.trim()
                      ? "bg-primary/30 text-primary/50 cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                  )}
                >
                  {generate.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating all 4 materials...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Generate Apply Kit
                    </>
                  )}
                </button>

                {generate.isPending && (
                  <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                    <p className="font-mono text-xs text-primary/80 text-center">
                      AI is generating your ATS CV, cover letter, LinkedIn summary, and interview prep in parallel. This takes 15–30 seconds...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Past kits ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <h2 className="font-mono text-xs font-semibold text-foreground uppercase tracking-wider">
                Generated Kits
              </h2>
              {kits && kits.length > 0 && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {kits.length}
                </span>
              )}
            </div>

            {kitsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !kits || kits.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-mono text-sm text-muted-foreground">No apply kits yet</p>
                <p className="font-mono text-xs text-muted-foreground/60 mt-1">
                  Paste a job description above to generate your first kit
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {kits.map((kit) => (
                  <KitResultPanel key={kit.id} kit={kit} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
