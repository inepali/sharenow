import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_TO_TIER: Record<string, string> = {
  // Starter
  "price_1SPxCSHE0DcMZ0rQrmZBkq4T": "Starter",
  "price_1SPxCTHE0DcMZ0rQg0yXaCDx": "Starter",
  // Professional
  "price_1SPxCUHE0DcMZ0rQAvzOwVXH": "Professional",
  "price_1SPxCVHE0DcMZ0rQsKzbyMLv": "Professional",
  // Studio
  "price_1SPxCWHE0DcMZ0rQjVqu8j1H": "Studio",
  "price_1SPxCXHE0DcMZ0rQ2LeL0LDl": "Studio",
};

const PRODUCT_TO_TIER: Record<string, string> = {
  "prod_SPxBzHE0DcMZ0rQu": "Starter",
  "prod_SPxByHE0DcMZ0rQw": "Professional",
  "prod_SPxBzHE0DcMZ0rQy": "Studio",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? supabaseAnonKey;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // 1. Check user profile for existing stripe_customer_id
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, subscription_tier, subscription_status, subscription_end, stripe_subscription_id")
      .eq("user_id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // 2. Fallback to customer search by email if not in profile
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", user.id);
        logStep("Found and linked customer by email", { customerId });
      }
    }

    if (!customerId) {
      logStep("No Stripe customer found, returning unsubscribed state");
      return new Response(
        JSON.stringify({
          subscribed: false,
          status: "none",
          tier: "Free",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    logStep("Querying subscriptions for customer", { customerId });

    // 3. Query all recent subscriptions (both active and trialing)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
    });

    // Valid statuses that count as having an active or usable plan:
    // 'active' or 'trialing' (and optionally 'past_due' with warning)
    const validSub = subscriptions.data.find((sub) =>
      ["active", "trialing", "past_due"].includes(sub.status)
    );

    if (!validSub) {
      logStep("No active or trialing subscription found");

      // Update profile to show no active plan
      await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: "none",
          subscription_tier: "free",
        })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({
          subscribed: false,
          status: "none",
          tier: "Free",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const priceId = validSub.items.data[0]?.price.id;
    const productId = validSub.items.data[0]?.price.product as string;
    const subscriptionEnd = new Date(validSub.current_period_end * 1000).toISOString();
    const subscriptionStart = new Date(validSub.start_date * 1000).toISOString();
    const trialEnd = validSub.trial_end ? new Date(validSub.trial_end * 1000).toISOString() : null;

    // Determine tier from metadata, price ID, or product ID
    let tierName = validSub.metadata?.tier;
    if (!tierName && priceId && PRICE_TO_TIER[priceId]) {
      tierName = PRICE_TO_TIER[priceId];
    }
    if (!tierName && productId && PRODUCT_TO_TIER[productId]) {
      tierName = PRODUCT_TO_TIER[productId];
    }
    if (!tierName) {
      tierName = "Starter";
    }

    const isSubscribed = validSub.status === "active" || validSub.status === "trialing";

    logStep("Found subscription", {
      subscriptionId: validSub.id,
      status: validSub.status,
      tier: tierName,
      isTrialing: validSub.status === "trialing",
    });

    // 4. Sync status with Supabase profile table
    await supabaseAdmin
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: validSub.id,
        subscription_status: validSub.status,
        subscription_tier: tierName.toLowerCase(),
        subscription_end: subscriptionEnd,
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        subscribed: isSubscribed,
        status: validSub.status,
        is_trialing: validSub.status === "trialing",
        tier: tierName,
        product_id: productId,
        price_id: priceId,
        subscription_id: validSub.id,
        subscription_end: subscriptionEnd,
        subscription_start: subscriptionStart,
        trial_end: trialEnd,
        cancel_at_period_end: validSub.cancel_at_period_end,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});