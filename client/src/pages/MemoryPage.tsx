import { trpc } from "@/lib/trpc";
import { BrainCircuit, Clock, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function MemoryPage() {
  const { data: countData } = trpc.memory.count.useQuery();
  const { data: entries = [], isLoading, refetch } = trpc.memory.list.useQuery({ limit: 30 });
  const addMemory = trpc.memory.add.useMutation({
    onSuccess: () => { refetch(); toast.success("Memory stored"); setInput(""); setShowAdd(false); },
    onError: (e) => toast.error(e.message),
  });

  const [input, setInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = () => {
    if (!input.trim()) return;
    addMemory.mutate({ content: input.trim(), memoryType: "manual" });
  };

  const memoryTypeColor: Record<string, string> = {
    application_outcome: "text-[oklch(0.65_0.18_264)] bg-[oklch(0.65_0.18_264)]/10 border-[oklch(0.65_0.18_264)]/30",
    manual:              "text-[oklch(0.78_0.18_75)] bg-[oklch(0.78_0.18_75)]/10 border-[oklch(0.78_0.18_75)]/30",
    default:             "text-muted-foreground bg-muted/20 border-border",
  };

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-mono text-base font-semibold text-foreground">memory.embeddings</h1>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            Past outcomes stored as context to improve future job scoring
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/30 rounded-md px-3 py-2 text-xs font-mono font-semibold hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Memory
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={<BrainCircuit className="w-4 h-4 text-primary" />}
          label="Total Memories"
          value={countData?.count ?? 0}
          color="primary"
        />
        <StatCard
          icon={<Sparkles className="w-4 h-4 text-[oklch(0.65_0.18_264)]" />}
          label="Application Outcomes"
          value={entries.filter((e: any) => e.memoryType === "application_outcome").length}
          color="blue"
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-[oklch(0.78_0.18_75)]" />}
          label="Manual Entries"
          value={entries.filter((e: any) => e.memoryType === "manual").length}
          color="amber"
        />
      </div>

      {/* Add memory form */}
      {showAdd && (
        <div className="panel-border rounded-lg bg-card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs font-semibold text-foreground">New Memory Entry</span>
            <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="E.g. 'I got rejected at Acme Corp for a senior role — they wanted more distributed systems experience' or 'I perform best in interviews when I prepare system design questions'..."
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={addMemory.isPending || !input.trim()}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-xs font-mono font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              {addMemory.isPending ? "Storing..." : "Store Memory"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors px-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Memory list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 panel-border rounded-lg bg-card animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="space-y-2">
          {entries.map((entry: any) => {
            const typeColor = memoryTypeColor[entry.memoryType] ?? memoryTypeColor.default;
            return (
              <div key={entry.id} className="panel-border rounded-lg bg-card p-3 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${typeColor}`}>
                    {entry.memoryType?.replace("_", " ") ?? "memory"}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <p className="font-mono text-xs text-foreground/85 leading-relaxed">{entry.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Context preview */}
      {entries.length > 0 && (
        <div className="mt-6 panel-border rounded-lg bg-primary/5 border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-xs font-semibold text-primary">Memory Context Preview</span>
            <span className="font-mono text-[10px] text-muted-foreground ml-auto">Used in next job scoring run</span>
          </div>
          <div className="space-y-1">
            {entries.slice(0, 5).map((entry: any, i: number) => (
              <p key={entry.id} className="font-mono text-[11px] text-foreground/70 leading-relaxed">
                <span className="text-primary/60">{i + 1}.</span> {entry.content.slice(0, 120)}{entry.content.length > 120 ? "..." : ""}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const borderColor = color === "primary" ? "border-primary/30 bg-primary/5" : color === "blue" ? "border-[oklch(0.65_0.18_264)]/30 bg-[oklch(0.65_0.18_264)]/5" : "border-[oklch(0.78_0.18_75)]/30 bg-[oklch(0.78_0.18_75)]/5";
  return (
    <div className={`panel-border rounded-lg p-4 ${borderColor}`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
      <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <BrainCircuit className="w-6 h-6 text-primary" />
      </div>
      <div className="text-center">
        <p className="font-mono text-sm font-semibold text-foreground mb-1">Memory is empty</p>
        <p className="font-mono text-xs text-muted-foreground max-w-xs">
          Memories are automatically stored when applications reach Interview, Offer, or Rejected status. You can also add them manually.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/30 rounded-md px-4 py-2 text-xs font-mono font-semibold hover:bg-primary/20 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add First Memory
      </button>
    </div>
  );
}
