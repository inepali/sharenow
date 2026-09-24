import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const PRICE_TO_TIER: Record<string, string> = {
  // Starter
  "price_1SPxCSHE0DcMZ0rQrmZBkq4T": "starter",
  "price_1SPxCTHE0DcMZ0rQg0yXaCDx": "starter",
  // Professional
  "price_1SPxCUHE0DcMZ0rQAvzOwVXH": "professional",
  "price_1SPxCVHE0DcMZ0rQsKzbyMLv": "professional",
  // Studio
  "price_1SPxCWHE0DcMZ0rQjVqu8j1H": "studio",
  "price_1SPxCXHE0DcMZ0rQ2LeL0LDl": "studio",
};

const PRODUCT_TO_TIER: Record<string, string> = {
  "prod_SPxBzHE0DcMZ0rQu": "starter",
  "prod_SPxByHE0DcMZ0rQw": "professional",
  "prod_SPxBzHE0DcMZ0rQy": "studio",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
      },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const signature = req.headers.get("stripe-signature");

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.text();
    let event: Stripe.Event;

    // Verify webhook signature if webhook secret is configured
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      } catch (err) {
        logStep("Webhook signature verification failed", { error: (err as Error).message });
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
      }
    } else {
      // In dev or without webhook secret, parse JSON directly with warning
      logStep("WARNING: Processing webhook without signature verification (STRIPE_WEBHOOK_SECRET not set)");
      event = JSON.parse(body) as Stripe.Event;
    }

    logStep("Processing event", { type: event.type, id: event.id });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const tierName = (session.metadata?.tier || "starter").toLowerCase();

        logStep("checkout.session.completed", { userId, customerId, subscriptionId, tierName });

        if (userId) {
          const updateData: Record<string, unknown> = {
            stripe_customer_id: customerId,
            subscription_tier: tierName,
            subscription_status: "active",
          };

          if (subscriptionId) {
            updateData.stripe_subscription_id = subscriptionId;

            // Fetch subscription from Stripe to get period end and exact status (e.g. trialing)
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              updateData.subscription_status = sub.status;
              updateData.subscription_end = new Date(sub.current_period_end * 1000).toISOString();
            } catch (subErr) {
              logStep("Could not retrieve subscription details", { error: (subErr as Error).message });
            }
          }

          const { error } = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("user_id", userId);

          if (error) {
            logStep("Error updating profile for checkout.session.completed", { error: error.message });
          } else {
            logStep("Profile updated successfully for user", { userId });
          }
        } else if (customerId) {
          // Attempt lookup by stripe_customer_id
          await supabaseAdmin
            .from("profiles")
            .update({
              stripe_subscription_id: subscriptionId,
              subscription_tier: tierName,
              subscription_status: "active",
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const status = sub.status;
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        const priceId = sub.items.data[0]?.price.id;
        const productId = sub.items.data[0]?.price.product as string;

        let tier = (sub.metadata?.tier || "").toLowerCase();
        if (!tier && priceId && PRICE_TO_TIER[priceId]) {
          tier = PRICE_TO_TIER[priceId];
        }
        if (!tier && productId && PRODUCT_TO_TIER[productId]) {
          tier = PRODUCT_TO_TIER[productId];
        }
        if (!tier) {
          tier = "starter";
        }

        logStep("customer.subscription.updated", { customerId, status, tier, periodEnd });

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: status,
            subscription_tier: tier,
            subscription_end: periodEnd,
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          logStep("Error updating profile for subscription update", { error: error.message });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        logStep("customer.subscription.deleted", { customerId, subscriptionId: sub.id });

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "canceled",
            subscription_tier: "free",
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          logStep("Error updating profile for subscription cancellation", { error: error.message });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        logStep("invoice.payment_failed", { customerId });

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "past_due",
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          logStep("Error updating profile for payment failure", { error: error.message });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Webhook error", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
