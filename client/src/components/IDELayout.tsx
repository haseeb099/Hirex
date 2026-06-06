import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  BrainCircuit,
  Briefcase,
  ChevronRight,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { ReactNode } from "react";
import { Link, useLocation } from "wouter";

const NAV_ITEMS = [
  { href: "/dashboard",    icon: LayoutDashboard, label: "Dashboard",    shortcut: "D" },
  { href: "/jobs",         icon: Briefcase,       label: "Jobs",         shortcut: "J" },
  { href: "/apply",        icon: Sparkles,        label: "Apply Kit",    shortcut: "K" },
  { href: "/applications", icon: ClipboardList,   label: "Applications", shortcut: "A" },
  { href: "/profile",      icon: User,            label: "Profile",      shortcut: "P" },
  { href: "/memory",       icon: BrainCircuit,    label: "Memory",       shortcut: "M" },
];

export default function IDELayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, isAuthenticated, loading, logout } = useAuth();

  // ⚠️ ALL hooks must be called unconditionally before any early returns
  const { data: credits } = trpc.billing.getCredits.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
    refetchInterval: 30_000,
  });

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Zap className="w-8 h-8 text-primary animate-pulse" />
          <span className="font-mono text-xs text-muted-foreground">initializing agent...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 p-8 rounded-lg panel-border bg-card max-w-sm w-full mx-4">
          <Zap className="w-10 h-10 text-primary" />
          <div className="text-center">
            <h2 className="font-mono text-lg font-semibold text-foreground mb-1">Job Agent</h2>
            <p className="text-xs text-muted-foreground">Sign in to access your workspace</p>
          </div>
          <a
            href={getLoginUrl()}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-semibold font-mono hover:opacity-90 transition-opacity"
          >
            <Zap className="w-4 h-4" />
            Sign in with Manus
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden">
      {/* ── Activity Bar (far left) ── */}
      <aside className="w-12 flex flex-col items-center py-3 gap-1 bg-[oklch(0.11_0.005_264)] border-r border-border shrink-0">
        {/* Logo */}
        <div className="mb-3 p-2">
          <Zap className="w-5 h-5 text-primary" />
        </div>

        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = location === href || location.startsWith(href + "/");
          return (
            <Link key={href} href={href}>
              <button
                title={label}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-md transition-all duration-150",
                  active
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="w-4.5 h-4.5" />
              </button>
            </Link>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User avatar */}
        <div className="mb-1">
          <div
            title={user?.name ?? ""}
            className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-primary text-xs font-mono font-semibold"
          >
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
        </div>
        <button
          title="Sign out"
          onClick={logout}
          className="w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </aside>

      {/* ── Side Panel (nav labels) ── */}
      <aside className="w-44 flex flex-col bg-[oklch(0.13_0.006_264)] border-r border-border shrink-0">
        {/* Panel header */}
        <div className="px-3 py-3 border-b border-border">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Explorer</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map(({ href, icon: Icon, label, shortcut }) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <Link key={href} href={href}>
                <button
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-mono transition-all duration-150 group",
                    active
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent border-l-2 border-transparent"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  <ChevronRight className={cn(
                    "w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity",
                    active && "opacity-60"
                  )} />
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Bottom status */}
        <div className="px-3 py-2 border-t border-border">
          <p className="font-mono text-[10px] text-muted-foreground truncate">{user?.email ?? user?.name}</p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="h-9 flex items-center border-b border-border bg-[oklch(0.12_0.005_264)] px-2 shrink-0">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = location === href || location.startsWith(href + "/");
            if (!active) return null;
            return (
              <div
                key={href}
                className="flex items-center gap-2 px-3 py-1 rounded-t-sm bg-background border-t-2 border-primary text-xs font-mono text-foreground"
              >
                <span>{label}.tsx</span>
              </div>
            );
          })}
          {/* Spacer */}
          <div className="flex-1" />
          {/* Credit balance */}
          {credits !== undefined && (
            <Link href="/pricing">
              <button
                title="AI Credits — click to upgrade"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors hover:bg-accent"
              >
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                <span className={credits.balance <= 2 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                  {credits.balance} credits
                </span>
              </button>
            </Link>
          )}
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
