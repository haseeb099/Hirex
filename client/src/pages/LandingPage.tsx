import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { BrainCircuit, ChevronRight, ClipboardList, Sparkles, Zap } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const FEATURES = [
  { icon: Sparkles,     title: "AI Job Scoring",       desc: "LLM scores every listing against your profile — high, medium, or low match." },
  { icon: ClipboardList, title: "Application Tracker", desc: "Full lifecycle: Draft → Applied → Interview → Offer → Rejected." },
  { icon: BrainCircuit, title: "Persistent Memory",    desc: "Past outcomes stored as embeddings improve future recommendations." },
];

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) navigate("/jobs");
  }, [isAuthenticated, loading]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-mono font-semibold text-sm text-foreground">job-agent</span>
          <span className="font-mono text-xs text-muted-foreground ml-1">v1.0.0</span>
        </div>
        <a
          href={getLoginUrl()}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-mono font-semibold hover:opacity-90 transition-opacity"
        >
          Sign in <ChevronRight className="w-3 h-3" />
        </a>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        {/* Terminal window */}
        <div className="w-full max-w-2xl mb-12">
          <div className="rounded-lg overflow-hidden panel-border bg-card">
            {/* Title bar */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[oklch(0.16_0.008_264)] border-b border-border">
              <div className="w-3 h-3 rounded-full bg-[oklch(0.62_0.22_25)]" />
              <div className="w-3 h-3 rounded-full bg-[oklch(0.78_0.18_75)]" />
              <div className="w-3 h-3 rounded-full bg-[oklch(0.72_0.18_145)]" />
              <span className="ml-3 font-mono text-xs text-muted-foreground">agent.ts — job-agent</span>
            </div>
            {/* Code */}
            <div className="p-6 font-mono text-sm leading-7">
              <p><span className="text-[oklch(0.65_0.18_264)]">const</span> <span className="text-[oklch(0.72_0.18_145)]">agent</span> <span className="text-foreground">= new</span> <span className="text-[oklch(0.78_0.18_75)]">JobAgent</span><span className="text-foreground">({"{"}</span></p>
              <p className="pl-6"><span className="text-[oklch(0.65_0.18_264)]">profile</span><span className="text-foreground">: yourResume,</span></p>
              <p className="pl-6"><span className="text-[oklch(0.65_0.18_264)]">memory</span><span className="text-foreground">: persistentEmbeddings,</span></p>
              <p className="pl-6"><span className="text-[oklch(0.65_0.18_264)]">scoring</span><span className="text-foreground">: llmPowered,</span></p>
              <p><span className="text-foreground">{"}"});</span></p>
              <p className="mt-4"><span className="text-muted-foreground">// Find your next role</span></p>
              <p><span className="text-[oklch(0.72_0.18_145)]">await</span> <span className="text-foreground">agent.</span><span className="text-[oklch(0.78_0.18_75)]">findJobs</span><span className="text-foreground">(</span><span className="text-[oklch(0.62_0.22_25)]">"senior engineer"</span><span className="text-foreground">);</span></p>
              <p className="mt-1 text-muted-foreground"><span className="text-[oklch(0.72_0.18_145)]">// → 12 jobs scored</span> <span className="badge-high px-2 py-0.5 rounded text-xs ml-1">3 high match</span></p>
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 className="font-mono text-3xl font-bold text-foreground text-center mb-3">
          Your AI-powered<br />
          <span className="text-primary">job search workspace</span>
        </h1>
        <p className="text-muted-foreground text-sm text-center max-w-md mb-8 leading-relaxed">
          A developer-grade job agent that scores listings against your profile, generates tailored cover letters, and learns from every application.
        </p>

        <a
          href={getLoginUrl()}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-6 py-3 text-sm font-mono font-semibold hover:opacity-90 transition-opacity glow-primary"
        >
          <Zap className="w-4 h-4" />
          Launch Workspace
          <ChevronRight className="w-4 h-4" />
        </a>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 w-full max-w-3xl">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-4 rounded-lg panel-border bg-card hover:border-primary/40 transition-colors">
              <Icon className="w-5 h-5 text-primary mb-3" />
              <h3 className="font-mono text-sm font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-3 text-center">
        <p className="font-mono text-xs text-muted-foreground">job-agent — built with AI</p>
      </footer>
    </div>
  );
}
