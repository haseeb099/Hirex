import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Plus, X, User, Briefcase, MapPin, DollarSign, Code2, FileText } from "lucide-react";

export default function ProfilePage() {
  const { data: profile, isLoading } = trpc.profile.get.useQuery();
  const upsert = trpc.profile.upsert.useMutation({
    onSuccess: () => toast.success("Profile saved"),
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    fullName: "",
    headline: "",
    resumeText: "",
    experienceYears: 0,
    targetSalary: 0,
    skillInput: "",
    skills: [] as string[],
    roleInput: "",
    preferredRoles: [] as string[],
    locationInput: "",
    preferredLocations: [] as string[],
  });

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        fullName: profile.fullName ?? "",
        headline: profile.headline ?? "",
        resumeText: profile.resumeText ?? "",
        experienceYears: profile.experienceYears ?? 0,
        targetSalary: profile.targetSalary ?? 0,
        skills: (profile.skills as string[]) ?? [],
        preferredRoles: (profile.preferredRoles as string[]) ?? [],
        preferredLocations: (profile.preferredLocations as string[]) ?? [],
      }));
    }
  }, [profile]);

  const addTag = (field: "skills" | "preferredRoles" | "preferredLocations", inputField: "skillInput" | "roleInput" | "locationInput") => {
    const val = form[inputField].trim();
    if (!val) return;
    if (!(form[field] as string[]).includes(val)) {
      setForm((f) => ({ ...f, [field]: [...(f[field] as string[]), val], [inputField]: "" }));
    } else {
      setForm((f) => ({ ...f, [inputField]: "" }));
    }
  };

  const removeTag = (field: "skills" | "preferredRoles" | "preferredLocations", val: string) => {
    setForm((f) => ({ ...f, [field]: (f[field] as string[]).filter((t) => t !== val) }));
  };

  const handleSave = () => {
    upsert.mutate({
      fullName: form.fullName || undefined,
      headline: form.headline || undefined,
      resumeText: form.resumeText || undefined,
      skills: form.skills,
      experienceYears: form.experienceYears,
      preferredRoles: form.preferredRoles,
      preferredLocations: form.preferredLocations,
      targetSalary: form.targetSalary || undefined,
    });
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-mono text-base font-semibold text-foreground">candidate.profile</h1>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            Your profile is used to score jobs and generate cover letters
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={upsert.isPending}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-xs font-mono font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {upsert.isPending ? "Saving..." : "Save Profile"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div className="panel-border rounded-lg bg-card p-4">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Info</span>
          </div>
          <div className="space-y-3">
            <Field label="fullName" placeholder="Jane Smith">
              <input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className={inputCls}
                placeholder="Jane Smith"
              />
            </Field>
            <Field label="headline" placeholder="Senior Software Engineer">
              <input
                value={form.headline}
                onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                className={inputCls}
                placeholder="Senior Software Engineer"
              />
            </Field>
          </div>
        </div>

        {/* Experience & Salary */}
        <div className="panel-border rounded-lg bg-card p-4">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
            <Briefcase className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider">Experience</span>
          </div>
          <div className="space-y-3">
            <Field label="experienceYears" placeholder="5">
              <input
                type="number"
                min={0}
                max={50}
                value={form.experienceYears}
                onChange={(e) => setForm((f) => ({ ...f, experienceYears: Number(e.target.value) }))}
                className={inputCls}
              />
            </Field>
            <Field label="targetSalary (USD/year)" placeholder="150000">
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input
                  type="number"
                  min={0}
                  value={form.targetSalary}
                  onChange={(e) => setForm((f) => ({ ...f, targetSalary: Number(e.target.value) }))}
                  className={inputCls + " pl-7"}
                />
              </div>
            </Field>
          </div>
        </div>

        {/* Skills */}
        <div className="panel-border rounded-lg bg-card p-4">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
            <Code2 className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skills</span>
          </div>
          <TagInput
            tags={form.skills}
            inputValue={form.skillInput}
            placeholder="TypeScript, React, Node.js..."
            onInputChange={(v) => setForm((f) => ({ ...f, skillInput: v }))}
            onAdd={() => addTag("skills", "skillInput")}
            onRemove={(t) => removeTag("skills", t)}
            color="primary"
          />
        </div>

        {/* Preferred Roles */}
        <div className="panel-border rounded-lg bg-card p-4">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
            <Briefcase className="w-3.5 h-3.5 text-[oklch(0.78_0.18_75)]" />
            <span className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preferred Roles</span>
          </div>
          <TagInput
            tags={form.preferredRoles}
            inputValue={form.roleInput}
            placeholder="Backend Engineer, Staff Engineer..."
            onInputChange={(v) => setForm((f) => ({ ...f, roleInput: v }))}
            onAdd={() => addTag("preferredRoles", "roleInput")}
            onRemove={(t) => removeTag("preferredRoles", t)}
            color="amber"
          />
        </div>

        {/* Preferred Locations */}
        <div className="panel-border rounded-lg bg-card p-4">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
            <MapPin className="w-3.5 h-3.5 text-[oklch(0.72_0.18_145)]" />
            <span className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preferred Locations</span>
          </div>
          <TagInput
            tags={form.preferredLocations}
            inputValue={form.locationInput}
            placeholder="Remote, San Francisco, London..."
            onInputChange={(v) => setForm((f) => ({ ...f, locationInput: v }))}
            onAdd={() => addTag("preferredLocations", "locationInput")}
            onRemove={(t) => removeTag("preferredLocations", t)}
            color="green"
          />
        </div>

        {/* Resume */}
        <div className="panel-border rounded-lg bg-card p-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resume / CV Text</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">{form.resumeText.length} chars</span>
          </div>
          <textarea
            value={form.resumeText}
            onChange={(e) => setForm((f) => ({ ...f, resumeText: e.target.value }))}
            rows={10}
            placeholder="Paste your resume text here. The AI uses this to score job matches and generate tailored cover letters..."
            className={inputCls + " resize-none font-mono text-xs leading-relaxed"}
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-background border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors";

function Field({ label, children, placeholder }: { label: string; children: React.ReactNode; placeholder?: string }) {
  return (
    <div>
      <label className="block font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function TagInput({
  tags,
  inputValue,
  placeholder,
  onInputChange,
  onAdd,
  onRemove,
  color,
}: {
  tags: string[];
  inputValue: string;
  placeholder: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (t: string) => void;
  color: "primary" | "amber" | "green";
}) {
  const colorMap = {
    primary: "bg-primary/10 text-primary border-primary/30",
    amber: "bg-[oklch(0.78_0.18_75)]/10 text-[oklch(0.78_0.18_75)] border-[oklch(0.78_0.18_75)]/30",
    green: "bg-[oklch(0.72_0.18_145)]/10 text-[oklch(0.72_0.18_145)] border-[oklch(0.72_0.18_145)]/30",
  };
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          placeholder={placeholder}
          className={inputCls + " flex-1"}
        />
        <button
          onClick={onAdd}
          className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/30 rounded-md px-2.5 py-2 text-xs font-mono hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border ${colorMap[color]}`}
          >
            {tag}
            <button onClick={() => onRemove(tag)} className="hover:opacity-70 transition-opacity">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="font-mono text-[11px] text-muted-foreground italic">No items added yet</span>
        )}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="h-8 w-48 bg-muted rounded mb-6 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="panel-border rounded-lg bg-card p-4 h-40 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
