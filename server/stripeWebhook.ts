/**
 * server/stripeWebhook.ts
 * Stripe webhook handler — receives and verifies Stripe events, then fulfils
 * subscription and credit actions in the database.
 *
 * MUST be registered BEFORE express.json() so the raw body is preserved for
 * signature verification.
 */

import type { Express, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { addCredits, upsertSubscription } from "./db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-05-27.dahlia",
});

// Credits granted per plan on successful subscription
const PLAN_CREDITS: Record<string, number> = {
  pro: 100,
  enterprise: 500,
};

export function registerStripeWebhook(app: Express) {
  // Raw body parser ONLY for the webhook route — must come before express.json()
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig ?? "", webhookSecret);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("[Webhook] Signature verification failed:", msg);
        res.status(400).send(`Webhook Error: ${msg}`);
        return;
      }

      // ── Test event passthrough (required for Stripe webhook verification) ──
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        res.json({ verified: true });
        return;
      }

      console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

      try {
        switch (event.type) {
          // ── Checkout completed → provision subscription + credits ──────────
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = parseInt(session.metadata?.user_id ?? "0", 10);
            const plan = (session.metadata?.plan ?? "pro") as "pro" | "enterprise";

            if (!userId) {
              console.warn("[Webhook] checkout.session.completed: missing user_id in metadata");
              break;
            }

            await upsertSubscription({
              userId,
              stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
              stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : undefined,
              plan,
              status: "active",
            });

            // Grant monthly credits immediately on checkout
            const credits = PLAN_CREDITS[plan] ?? 100;
            await addCredits(userId, credits);

            console.log(`[Webhook] Provisioned ${plan} plan + ${credits} credits for user ${userId}`);
            break;
          }

          // ── Invoice paid → renew monthly credits ──────────────────────────
          case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null; customer?: string | null };
            const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
            if (!subId) break;

            // We store subscriptionId in our DB — look up the user
            const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
            if (!customerId) break;

            // Fetch subscription to get metadata
            const subRaw = await stripe.subscriptions.retrieve(subId);
            const sub = subRaw as unknown as Stripe.Subscription & { current_period_end: number };
            const userId = parseInt(sub.metadata?.user_id ?? "0", 10);
            const plan = (sub.metadata?.plan ?? "pro") as "pro" | "enterprise";

            if (!userId) break;

            const credits = PLAN_CREDITS[plan] ?? 100;
            await addCredits(userId, credits);
            await upsertSubscription({
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subId,
              plan,
              status: "active",
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            });

            console.log(`[Webhook] Renewed ${plan} plan + ${credits} credits for user ${userId}`);
            break;
          }

          // ── Subscription updated ──────────────────────────────────────────
          case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription & { current_period_end: number };
            const userId = parseInt(sub.metadata?.user_id ?? "0", 10);
            const plan = (sub.metadata?.plan ?? "pro") as "pro" | "enterprise";
            if (!userId) break;

            await upsertSubscription({
              userId,
              stripeCustomerId: typeof sub.customer === "string" ? sub.customer : undefined,
              stripeSubscriptionId: sub.id,
              plan,
              status: sub.status as "active" | "canceled" | "past_due" | "trialing",
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            });
            break;
          }

          // ── Subscription canceled ─────────────────────────────────────────
          case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            const userId = parseInt(sub.metadata?.user_id ?? "0", 10);
            if (!userId) break;

            await upsertSubscription({
              userId,
              stripeCustomerId: typeof sub.customer === "string" ? sub.customer : undefined,
              stripeSubscriptionId: sub.id,
              plan: "free",
              status: "canceled",
            });
            console.log(`[Webhook] Subscription canceled for user ${userId}`);
            break;
          }

          default:
            console.log(`[Webhook] Unhandled event type: ${event.type}`);
        }
      } catch (err) {
        console.error("[Webhook] Error processing event:", err);
        res.status(500).send("Internal error processing webhook");
        return;
      }

      res.json({ received: true });
    }
  );
}
