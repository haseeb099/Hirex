/**
 * client/src/pages/PricingPage.tsx
 * SaaS pricing page — Free / Pro / Enterprise plan cards with Stripe checkout.
 * Accessible from the landing page and from the credit display in the IDE header.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import {
  BrainCircuit,
  Check,
  ChevronRight,
  CreditCard,
  Sparkles,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    period: "/month",
    credits: 5,
    badge: null,
    description: "Get started with AI job matching",
    features: [
      "5 AI credits/month",
      "Job search via Remotive",
      "Basic job scoring",
      "Application tracker",
      "Memory layer (5 entries)",
    ],
    cta: "Get started free",
    ctaVariant: "outline" as const,
    highlight: false,
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$19",
    period: "/month",
    credits: 100,
    badge: "Most popular",
    description: "For serious job seekers",
    features: [
      "100 AI credits/month",
      "Unlimited job imports",
      "ATS CV + Cover Letter PDF",
      "LinkedIn summary generator",
      "Interview prep (STAR method)",
      "Full memory layer",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    ctaVariant: "default" as const,
    highlight: true,
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: "$49",
    period: "/month",
    credits: 500,
    badge: null,
    description: "For power users and teams",
    features: [
      "500 AI credits/month",
      "Everything in Pro",
      "Team seats (coming soon)",
      "API access (coming soon)",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Upgrade to Enterprise",
    ctaVariant: "outline" as const,
    highlight: false,
  },
];

export default function PricingPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: credits } = trpc.billing.getCredits.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: subscription } = trpc.billing.getSubscription.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const checkout = trpc.billing.createCheckout.useMutation({
    onSuccess: ({ url }) => {
      if (url) {
        toast.info("Redirecting to Stripe checkout...");
        window.open(url, "_blank");
      }
    },
    onError: (err) => {
      toast.error(`Checkout error: ${err.message}`);
    },
  });

  const handleUpgrade = (planId: "pro" | "enterprise") => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    checkout.mutate({ plan: planId, origin: window.location.origin });
  };

  const currentPlan = subscription?.plan ?? "free";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-mono font-semibold text-sm text-foreground">job-agent</span>
        </button>
        <div className="flex items-center gap-3">
          {isAuthenticated && credits !== undefined && (
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              <span>{credits.balance} credits remaining</span>
            </div>
          )}
          {!isAuthenticated && !loading && (
            <a
              href={getLoginUrl()}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-mono font-semibold hover:opacity-90 transition-opacity"
            >
              Sign in <ChevronRight className="w-3 h-3" />
            </a>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-xs text-primary">AI-powered job search</span>
          </div>
          <h1 className="font-mono text-4xl font-bold text-foreground mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            Each AI action (job scoring, CV generation, cover letter, interview prep) costs 1 credit.
            Credits reset monthly.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col bg-card border transition-all duration-200 ${
                  plan.highlight
                    ? "border-primary shadow-lg shadow-primary/10"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground font-mono text-[10px] px-3 py-0.5">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4 pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-semibold text-foreground">{plan.name}</span>
                    {isCurrent && (
                      <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/40">
                        Current plan
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="font-mono text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                  <div className="flex items-center gap-1.5 mt-3 bg-primary/5 border border-primary/10 rounded-md px-3 py-2">
                    <BrainCircuit className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-mono text-xs text-primary font-semibold">
                      {plan.credits} AI credits/month
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 gap-4">
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2">
                    {plan.id === "free" ? (
                      <Button
                        variant={plan.ctaVariant}
                        className="w-full font-mono text-xs"
                        onClick={() => isAuthenticated ? navigate("/dashboard") : (window.location.href = getLoginUrl())}
                      >
                        {isCurrent ? "Your current plan" : plan.cta}
                      </Button>
                    ) : (
                      <Button
                        variant={plan.highlight ? "default" : plan.ctaVariant}
                        className={`w-full font-mono text-xs ${plan.highlight ? "glow-primary" : ""}`}
                        disabled={isCurrent || checkout.isPending}
                        onClick={() => handleUpgrade(plan.id)}
                      >
                        {checkout.isPending ? (
                          <span className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 animate-pulse" />
                            Redirecting...
                          </span>
                        ) : isCurrent ? (
                          "Your current plan"
                        ) : (
                          plan.cta
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="border-t border-border pt-12">
          <h2 className="font-mono text-lg font-semibold text-foreground text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              {
                q: "What counts as 1 credit?",
                a: "Each AI generation uses 1 credit: job scoring, ATS CV, cover letter, LinkedIn summary, or interview prep.",
              },
              {
                q: "Do credits roll over?",
                a: "No — credits reset at the start of each billing cycle. Unused credits do not carry forward.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Cancel from your Stripe billing portal at any time. You keep your credits until the end of the billing period.",
              },
              {
                q: "How do I test payments?",
                a: "Use card number 4242 4242 4242 4242 with any future expiry and any CVC in the Stripe test checkout.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="p-4 rounded-lg bg-card border border-border">
                <p className="font-mono text-xs font-semibold text-foreground mb-2">{q}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
