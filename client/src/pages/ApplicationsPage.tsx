import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Building2,
  ChevronDown,
  ClipboardList,
  FileText,
  MapPin,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUSES = ["Draft", "Applied", "Interview", "Offer", "Rejected"] as const;
type AppStatus = typeof STATUSES[number];

const STATUS_CONFIG: Record<AppStatus, { color: string; bg: string; border: string; dot: string }> = {
  Draft:     { color: "text-muted-foreground",                bg: "bg-muted/30",                     border: "border-muted",                      dot: "bg-muted-foreground" },
  Applied:   { color: "text-[oklch(0.65_0.18_264)]",          bg: "bg-[oklch(0.65_0.18_264)]/10",    border: "border-[oklch(0.65_0.18_264)]/30",  dot: "bg-[oklch(0.65_0.18_264)]" },
  Interview: { color: "text-[oklch(0.78_0.18_75)]",           bg: "bg-[oklch(0.78_0.18_75)]/10",     border: "border-[oklch(0.78_0.18_75)]/30",   dot: "bg-[oklch(0.78_0.18_75)]" },
  Offer:     { color: "text-[oklch(0.72_0.18_145)]",          bg: "bg-[oklch(0.72_0.18_145)]/10",    border: "border-[oklch(0.72_0.18_145)]/30",  dot: "bg-[oklch(0.72_0.18_145)]" },
  Rejected:  { color: "text-[oklch(0.62_0.22_25)]",           bg: "bg-[oklch(0.62_0.22_25)]/10",     border: "border-[oklch(0.62_0.22_25)]/30",   dot: "bg-[oklch(0.62_0.22_25)]" },
};

export default function ApplicationsPage() {
  const { data: apps = [], isLoading, refetch } = trpc.applications.list.useQuery();
  const updateStatus = trpc.applications.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Status updated"); },
    onError: (e) => toast.error(e.message),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<AppStatus>("Draft");

  const startEdit = (app: any) => {
    setEditingId(app.id);
    setEditNotes(app.notes ?? "");
    setEditStatus(app.status as AppStatus);
  };

  const saveEdit = (id: number) => {
    updateStatus.mutate({ id, status: editStatus, notes: editNotes });
    setEditingId(null);
  };

  // Group by status for kanban-style counts
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = apps.filter((a: any) => a.status === s).length;
    return acc;
  }, {} as Record<AppStatus, number>);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-mono text-base font-semibold text-foreground">applications.tracker</h1>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">{apps.length} total applications</p>
        </div>
      </div>

      {/* Status pipeline */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono shrink-0", cfg.bg, cfg.border)}>
              <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
              <span className={cfg.color}>{s}</span>
              <span className="text-muted-foreground">({counts[s]})</span>
            </div>
          );
        })}
      </div>

      {/* Applications list */}
      {apps.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {apps.map((app: any) => (
            <ApplicationRow
              key={app.id}
              app={app}
              isEditing={editingId === app.id}
              editNotes={editNotes}
              editStatus={editStatus}
              onEdit={() => startEdit(app)}
              onSave={() => saveEdit(app.id)}
              onCancel={() => setEditingId(null)}
              onNotesChange={setEditNotes}
              onStatusChange={setEditStatus}
              isSaving={updateStatus.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Application Row ───────────────────────────────────────────────────────────
function ApplicationRow({
  app,
  isEditing,
  editNotes,
  editStatus,
  onEdit,
  onSave,
  onCancel,
  onNotesChange,
  onStatusChange,
  isSaving,
}: {
  app: any;
  isEditing: boolean;
  editNotes: string;
  editStatus: AppStatus;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onNotesChange: (v: string) => void;
  onStatusChange: (v: AppStatus) => void;
  isSaving: boolean;
}) {
  const status = app.status as AppStatus;
  const cfg = STATUS_CONFIG[status];
  const editCfg = STATUS_CONFIG[editStatus];

  return (
    <div className={cn("rounded-lg panel-border bg-card transition-all duration-150", isEditing && "border-primary/40")}>
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Status dot */}
        <div className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />

        {/* Job info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-foreground truncate">
              {app.job?.title ?? `Job #${app.jobId}`}
            </span>
            {app.job?.matchTier && (
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0",
                app.job.matchTier === "high" ? "badge-high" : app.job.matchTier === "medium" ? "badge-medium" : "badge-low"
              )}>
                {Math.round((app.job.matchScore ?? 0) * 100)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {app.job?.company && (
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-[11px] text-muted-foreground">{app.job.company}</span>
              </div>
            )}
            {app.job?.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-[11px] text-muted-foreground">{app.job.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span className={cn("px-2 py-0.5 rounded text-[11px] font-mono font-semibold border shrink-0", cfg.color, cfg.bg, cfg.border)}>
          {status}
        </span>

        {/* Date */}
        <span className="font-mono text-[10px] text-muted-foreground shrink-0 hidden sm:block">
          {new Date(app.createdAt).toLocaleDateString()}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isEditing ? (
            <button
              onClick={onEdit}
              className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
          ) : (
            <>
              <button
                onClick={onSave}
                disabled={isSaving}
                className="w-7 h-7 flex items-center justify-center rounded text-[oklch(0.72_0.18_145)] hover:bg-[oklch(0.72_0.18_145)]/10 transition-colors"
              >
                <Save className="w-3 h-3" />
              </button>
              <button
                onClick={onCancel}
                className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notes preview */}
      {!isEditing && app.notes && (
        <div className="px-3 pb-3">
          <div className="flex items-start gap-1.5 px-2 py-1.5 rounded bg-muted/20 border border-border">
            <FileText className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">{app.notes}</p>
          </div>
        </div>
      )}

      {/* Edit panel */}
      {isEditing && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-3">
          {/* Status selector */}
          <div>
            <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => {
                const c = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className={cn(
                      "px-2.5 py-1 rounded text-[11px] font-mono font-semibold border transition-all",
                      editStatus === s ? cn(c.color, c.bg, c.border) : "text-muted-foreground border-border hover:border-foreground/30"
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Notes */}
          <div>
            <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              placeholder="Add notes about this application..."
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <ClipboardList className="w-6 h-6 text-primary" />
      </div>
      <div className="text-center">
        <p className="font-mono text-sm font-semibold text-foreground mb-1">No applications yet</p>
        <p className="font-mono text-xs text-muted-foreground max-w-xs">
          Find jobs in the Jobs panel and click "Track Application" to start tracking.
        </p>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="h-8 w-48 bg-muted rounded mb-6 animate-pulse" />
      <div className="flex gap-2 mb-6">
        {STATUSES.map((s) => <div key={s} className="h-8 w-24 bg-muted rounded animate-pulse" />)}
      </div>
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
      </div>
    </div>
  );
}
