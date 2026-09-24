import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionData {
  subscribed: boolean;
  status: "none" | "trialing" | "active" | "past_due" | "canceled" | string;
  is_trialing?: boolean;
  tier: "Free" | "Starter" | "Professional" | "Studio" | string;
  product_id?: string | null;
  price_id?: string | null;
  subscription_id?: string | null;
  subscription_end?: string | null;
  subscription_start?: string | null;
  trial_end?: string | null;
  cancel_at_period_end?: boolean;
}

export interface TierLimits {
  maxGalleries: number;
  storageLimitDisplay: string;
  canUseCustomDomain: boolean;
  canUseWhiteLabel: boolean;
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  Free: {
    maxGalleries: 1,
    storageLimitDisplay: "1 GB",
    canUseCustomDomain: false,
    canUseWhiteLabel: false,
  },
  Starter: {
    maxGalleries: 10,
    storageLimitDisplay: "10 GB per gallery",
    canUseCustomDomain: false,
    canUseWhiteLabel: false,
  },
  Professional: {
    maxGalleries: 250,
    storageLimitDisplay: "1 TB",
    canUseCustomDomain: true,
    canUseWhiteLabel: false,
  },
  Studio: {
    maxGalleries: Infinity,
    storageLimitDisplay: "2 TB",
    canUseCustomDomain: true,
    canUseWhiteLabel: true,
  },
};

export async function fetchSubscription(): Promise<SubscriptionData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      subscribed: false,
      status: "none",
      tier: "Free",
    };
  }

  // First, check profile in database as a fast read
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_tier, subscription_end, stripe_subscription_id")
    .eq("user_id", user.id)
    .single();

  const currentTier = profile?.subscription_tier
    ? profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1)
    : "Free";

  const isProfileSubscribed =
    profile?.subscription_status === "active" || profile?.subscription_status === "trialing";

  // Invoke edge function to ensure latest Stripe state and sync
  try {
    const { data, error } = await supabase.functions.invoke("check-subscription");
    if (!error && data) {
      return {
        ...data,
        tier: data.tier || currentTier || "Free",
      };
    }
  } catch (err) {
    console.warn("Could not reach check-subscription edge function, falling back to profile:", err);
  }

  return {
    subscribed: isProfileSubscribed,
    status: profile?.subscription_status || "none",
    is_trialing: profile?.subscription_status === "trialing",
    tier: currentTier,
    subscription_id: profile?.stripe_subscription_id,
    subscription_end: profile?.subscription_end,
  };
}

export function useSubscription() {
  const query = useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const tier = query.data?.tier || "Free";
  const normalizedTier = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
  const limits = TIER_LIMITS[normalizedTier] || TIER_LIMITS.Free;

  return {
    ...query,
    subscription: query.data,
    tier: normalizedTier,
    isSubscribed: Boolean(query.data?.subscribed),
    isTrialing: Boolean(query.data?.is_trialing),
    limits,
  };
}

export function useInvalidateSubscription() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["subscription"] });
}
