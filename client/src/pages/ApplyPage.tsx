import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  downloadCVAsPDF,
  downloadCoverLetterAsPDF,
  previewCVData,
  type CVData,
} from "@/lib/pdfGenerator";
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Download,
  Eye,
  FileText,
  Linkedin,
  Loader2,
  MessageSquare,
  Plus,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
type KitTab = "cv" | "cover" | "linkedin" | "interview";
type CVViewMode = "preview" | "raw";

const TABS: { id: KitTab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "cv",        label: "ATS CV",          icon: FileText,      color: "text-emerald-400" },
  { id: "cover",     label: "Cover Letter",     icon: MessageSquare, color: "text-blue-400"   },
  { id: "linkedin",  label: "LinkedIn",         icon: Linkedin,      color: "text-sky-400"    },
  { id: "interview", label: "Interview Prep",   icon: BookOpen,      color: "text-amber-400"  },
];

const SCORE_COLOR = (score: number) =>
  score >= 70 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
  : score >= 45 ? "text-amber-400 bg-amber-400/10 border-amber-400/30"
  : "text-red-400 bg-red-400/10 border-red-400/30";

const SCORE_LABEL = (score: number) =>
  score >= 70 ? "High Match" : score >= 45 ? "Medium Match" : "Low Match";

// ── Helpers ───────────────────────────────────────────────────────────────────
function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
}

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

// ── CV Live Preview ───────────────────────────────────────────────────────────
function CVPreview({ data }: { data: CVData }) {
  return (
    <div
      className="bg-white text-gray-900 p-8 font-sans text-sm leading-relaxed"
      style={{ fontFamily: "'Lato', 'Arial', sans-serif", minHeight: 600 }}
    >
      {/* Name */}
      <h1 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">
        {data.name || "Your Name"}
      </h1>

      {/* Contact row */}
      {(data.email || data.phone || data.location || data.linkedin) && (
        <p className="text-xs text-slate-500 mb-5 flex flex-wrap gap-x-3">
          {[data.email, data.phone, data.location, data.linkedin]
            .filter(Boolean)
            .map((item, i) => (
              <span key={i}>{item}</span>
            ))}
        </p>
      )}

      {/* Summary */}
      {data.summary && (
        <div className="mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
            Professional Summary
          </h2>
          <p className="text-[13px] text-slate-700 leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <div className="mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
            Professional Experience
          </h2>
          {data.experience.map((exp, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-[13px] text-slate-900">{exp.title}</p>
                  <p className="text-[12px] text-slate-600">
                    {[exp.company, exp.location].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {(exp.startDate || exp.endDate) && (
                  <p className="text-[11px] text-slate-500 shrink-0 ml-4">
                    {[exp.startDate, exp.endDate].filter(Boolean).join(" – ")}
                  </p>
                )}
              </div>
              <ul className="mt-1.5 space-y-1">
                {exp.bullets.map((b, bi) => (
                  <li key={bi} className="flex gap-2 text-[12px] text-slate-700">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <div className="mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
            Education
          </h2>
          {data.education.map((edu, i) => (
            <div key={i} className="flex justify-between items-start mb-1.5">
              <div>
                <p className="font-bold text-[13px] text-slate-900">{edu.degree}</p>
                {edu.institution && (
                  <p className="text-[12px] text-slate-600">{edu.institution}</p>
                )}
              </div>
              {edu.year && (
                <p className="text-[11px] text-slate-500 shrink-0 ml-4">{edu.year}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {data.skills && data.skills.length > 0 && (
        <div className="mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
            Core Skills
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((skill, i) => (
              <span
                key={i}
                className="text-[11px] bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      {data.keywords && data.keywords.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">
            Key Competencies
          </p>
          <p className="text-[11px] text-slate-500">{data.keywords.join(" · ")}</p>
        </div>
      )}
    </div>
  );
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
  const [cvViewMode, setCvViewMode] = useState<CVViewMode>("preview");
  const [pdfLoading, setPdfLoading] = useState(false);

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
  const cvData: CVData = content.cv ? previewCVData(content.cv) : { name: "Candidate" };
  const candidateName = cvData.name || kit.jobTitle || "Candidate";
  const contactLine = [cvData.email, cvData.phone, cvData.location]
    .filter(Boolean)
    .join("  ·  ");

  const handlePDFDownload = async () => {
    setPdfLoading(true);
    try {
      if (activeTab === "cv") {
        await downloadCVAsPDF(content.cv, candidateName);
        toast.success("ATS CV downloaded as PDF", {
          description: "Formatted for ATS systems — ready to attach to applications.",
        });
      } else if (activeTab === "cover") {
        await downloadCoverLetterAsPDF(
          content.cover,
          candidateName,
          kit.jobTitle ?? "Role",
          kit.company ?? "Company",
          contactLine || undefined
        );
        toast.success("Cover Letter downloaded as PDF");
      }
    } catch (e) {
      toast.error("PDF generation failed", {
        description: "Try the .txt download as a fallback.",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
      {/* ── Card header ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/20 transition-colors select-none"
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
            <span
              className={cn(
                "font-mono text-[10px] px-2 py-0.5 rounded-full border font-semibold",
                SCORE_COLOR(score)
              )}
            >
              {score}% · {SCORE_LABEL(score)}
            </span>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
            Generated {new Date(kit.createdAt).toLocaleString()}
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
          {/* ── Tab bar ── */}
          <div className="flex border-b border-border bg-[oklch(0.11_0.005_264)]">
            {TABS.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-mono transition-all border-b-2",
                  activeTab === id
                    ? "border-primary text-foreground bg-background"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", activeTab === id ? color : "")} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* ── Action toolbar ── */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-[oklch(0.115_0.005_264)]">
            {/* View toggle for CV tab */}
            {activeTab === "cv" && (
              <div className="flex rounded-md overflow-hidden border border-border mr-2">
                <button
                  onClick={() => setCvViewMode("preview")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono transition-all",
                    cvViewMode === "preview"
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                  )}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
                <button
                  onClick={() => setCvViewMode("raw")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono transition-all border-l border-border",
                    cvViewMode === "raw"
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                  )}
                >
                  <FileText className="w-3 h-3" />
                  Raw
                </button>
              </div>
            )}

            <div className="flex-1" />

            {/* Copy */}
            <button
              onClick={() =>
                copyToClipboard(
                  content[activeTab],
                  TABS.find((t) => t.id === activeTab)?.label ?? ""
                )
              }
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
            >
              <ClipboardCopy className="w-3 h-3" />
              Copy
            </button>

            {/* .txt download */}
            <button
              onClick={() => downloadText(content[activeTab], filenames[activeTab])}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
            >
              <Download className="w-3 h-3" />
              .txt
            </button>

            {/* PDF download — CV and Cover Letter only */}
            {(activeTab === "cv" || activeTab === "cover") && (
              <button
                onClick={handlePDFDownload}
                disabled={pdfLoading || !content[activeTab]}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 rounded text-[10px] font-mono border transition-all font-semibold",
                  pdfLoading
                    ? "opacity-50 cursor-not-allowed bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50"
                )}
              >
                {pdfLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                {pdfLoading ? "Generating…" : "PDF ↓"}
              </button>
            )}
          </div>

          {/* ── Content area ── */}
          <div className="overflow-auto max-h-[600px]">
            {activeTab === "cv" && cvViewMode === "preview" && content.cv ? (
              <div className="p-4">
                <div className="rounded-md overflow-hidden border border-slate-200 shadow-sm">
                  <CVPreview data={cvData} />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                  Live preview · Click "PDF ↓" to download the ATS-formatted document
                </p>
              </div>
            ) : (
              <pre className="p-4 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed bg-[oklch(0.10_0.004_264)]">
                {content[activeTab] || (
                  <span className="text-muted-foreground italic">
                    No content generated for this section.
                  </span>
                )}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ApplyPage() {
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const [jobDescription, setJobDescription] = useState(params.get("desc") ?? "");
  const [jobTitle, setJobTitle] = useState(params.get("title") ?? "");
  const [company, setCompany] = useState(params.get("company") ?? "");
  const [showForm, setShowForm] = useState(true);

  const { data: kits, isLoading: kitsLoading, refetch } = trpc.applyKit.list.useQuery({
    limit: 20,
  });

  const generate = trpc.applyKit.generate.useMutation({
    onSuccess: () => {
      toast.success("Apply kit generated!", {
        description: "ATS CV, Cover Letter, LinkedIn summary, and Interview prep are ready.",
      });
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
    generate.mutate({
      jobDescription,
      jobTitle: jobTitle || "Role",
      company: company || "Company",
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-[oklch(0.12_0.005_264)] shrink-0">
        <Sparkles className="w-4 h-4 text-primary" />
        <h1 className="font-mono text-sm font-semibold text-foreground">
          Apply Materials Generator
        </h1>
        <span className="font-mono text-[10px] text-muted-foreground hidden sm:block">
          · ATS CV · Cover Letter · LinkedIn · Interview Prep
        </span>
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

          {/* ── How it works banner ── */}
          {!kits?.length && !generate.isPending && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
              <p className="font-mono text-xs font-semibold text-primary mb-2 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                How it works
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  { icon: ClipboardCopy, text: "Paste any job description below" },
                  { icon: Sparkles,      text: "AI generates 4 tailored documents" },
                  { icon: Eye,           text: "Preview your ATS CV live" },
                  { icon: Download,      text: "Download as PDF — ready to apply" },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-3 h-3 text-primary" />
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Input form ── */}
          {showForm && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-[oklch(0.11_0.005_264)] flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <p className="font-mono text-xs font-semibold text-foreground">
                  Paste Job Description
                </p>
                <span className="font-mono text-[10px] text-muted-foreground ml-1">
                  — or link from a ranked job card
                </span>
              </div>

              <div className="p-4 space-y-3">
                {/* Job title + company */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                      Job Title
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
                      Company
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
                    placeholder={`Paste the full job description here…\n\nExample:\nWe are looking for a Senior Software Engineer to join our platform team…\n\nResponsibilities:\n• Design and build scalable backend services\n• Collaborate with cross-functional teams\n\nRequirements:\n• 5+ years of experience with TypeScript/Node.js\n• Strong system design skills`}
                    rows={14}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary resize-y leading-relaxed"
                  />
                  <p className="font-mono text-[10px] text-muted-foreground mt-1">
                    {jobDescription.length} chars · Longer JDs produce better keyword matching
                  </p>
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={generate.isPending || !jobDescription.trim()}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-md font-mono text-sm font-semibold transition-all",
                    generate.isPending || !jobDescription.trim()
                      ? "opacity-50 cursor-not-allowed bg-primary/30 text-primary/70"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-primary/20 hover:shadow-md"
                  )}
                >
                  {generate.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating all 4 materials…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Apply Kit
                    </>
                  )}
                </button>

                {generate.isPending && (
                  <div className="rounded-md bg-primary/5 border border-primary/20 px-4 py-3">
                    <p className="font-mono text-xs text-primary font-semibold mb-2">
                      AI is working on your materials…
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { label: "ATS-optimised CV",        color: "text-emerald-400" },
                        { label: "Tailored Cover Letter",   color: "text-blue-400"   },
                        { label: "LinkedIn About section",  color: "text-sky-400"    },
                        { label: "Interview Q&A prep",      color: "text-amber-400"  },
                      ].map(({ label, color }) => (
                        <div key={label} className="flex items-center gap-2">
                          <Loader2 className={cn("w-3 h-3 animate-spin", color)} />
                          <span className={cn("font-mono text-[10px]", color)}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Generated kits list ── */}
          {kitsLoading && (
            <div className="flex items-center gap-2 py-4 text-muted-foreground font-mono text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading your apply kits…
            </div>
          )}

          {kits && kits.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h2 className="font-mono text-xs font-semibold text-foreground">
                  Your Apply Kits ({kits.length})
                </h2>
              </div>
              {kits.map((kit) => (
                <KitResultPanel key={kit.id} kit={kit} />
              ))}
            </div>
          )}

          {kits && kits.length === 0 && !showForm && (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-mono text-sm text-muted-foreground">No apply kits yet</p>
              <p className="font-mono text-xs text-muted-foreground/60 mt-1">
                Click "New Kit" to generate your first tailored application materials
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
