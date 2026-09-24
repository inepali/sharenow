import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, ArrowLeft, ExternalLink, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription, useInvalidateSubscription } from "@/hooks/use-subscription";
import logo from "@/assets/logo.png";

const TIER_PRICING: Record<string, { monthly: string; yearly: string; storage: string; galleries: string }> = {
  Starter: { monthly: "$2.99/mo", yearly: "$29.90/yr", storage: "10 GB per gallery", galleries: "10 free galleries" },
  Professional: { monthly: "$9.99/mo", yearly: "$99.90/yr", storage: "1 TB total", galleries: "Up to 250 galleries/yr" },
  Studio: { monthly: "$19.99/mo", yearly: "$199.90/yr", storage: "2 TB total", galleries: "Unlimited galleries" },
};

const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscription, tier, isSubscribed, isTrialing, limits, isLoading, refetch } = useSubscription();
  const invalidateSubscription = useInvalidateSubscription();
  const [managingPortal, setManagingPortal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      invalidateSubscription();
      await refetch();
      toast({
        title: "Subscription Refreshed",
        description: "Your latest subscription status is up to date.",
      });
    } catch (err) {
      console.error("Refresh error:", err);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh subscription status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setManagingPortal(true);
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.error || "No portal URL returned");
      }
    } catch (error: unknown) {
      console.error("Error opening customer portal:", error);
      const message = error instanceof Error ? error.message : "Failed to open subscription management portal.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setManagingPortal(false);
    }
  };

  const tierPricing = TIER_PRICING[tier] || null;

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </div>
            <img
              src={logo}
              alt="Share My Shoot Logo"
              className="w-8 h-8 mix-blend-darken dark:mix-blend-lighten"
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-serif mb-2">Subscription Management</h1>
          <p className="text-muted-foreground mb-8">
            View your plan, manage billing, and upgrade your features
          </p>

          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Current Plan Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    Your active subscription and billing details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isSubscribed ? (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-2xl font-semibold">
                              {tier} Plan
                            </h3>
                            {isTrialing ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                                <Clock className="w-3 h-3 mr-1" />
                                30-Day Free Trial
                              </Badge>
                            ) : subscription?.status === "past_due" ? (
                              <Badge variant="destructive">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Payment Past Due
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500 hover:bg-green-600 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            )}

                            {subscription?.cancel_at_period_end && (
                              <Badge variant="outline" className="text-destructive border-destructive">
                                Cancels at period end
                              </Badge>
                            )}
                          </div>

                          {tierPricing && (
                            <p className="text-sm font-medium text-foreground/80 mb-2">
                              {tierPricing.monthly} ({tierPricing.yearly})
                            </p>
                          )}

                          {subscription?.subscription_start && (
                            <p className="text-sm text-muted-foreground">
                              Started on{" "}
                              {new Date(subscription.subscription_start).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          )}

                          {isTrialing && subscription?.trial_end ? (
                            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">
                              Trial ends on{" "}
                              {new Date(subscription.trial_end).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          ) : subscription?.subscription_end ? (
                            <p className="text-sm text-muted-foreground mt-1">
                              {subscription.cancel_at_period_end ? "Expires on " : "Renews on "}
                              {new Date(subscription.subscription_end).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Plan Limits Info */}
                      <div className="rounded-lg bg-muted/50 p-4 border grid sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Gallery Limit: </span>
                          <span className="font-medium text-foreground">
                            {limits.maxGalleries === Infinity ? "Unlimited" : limits.maxGalleries} galleries
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Storage: </span>
                          <span className="font-medium text-foreground">{limits.storageLimitDisplay}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Custom Branding: </span>
                          <span className="font-medium text-foreground">Included</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">WHCC Print Shop: </span>
                          <span className="font-medium text-foreground">Enabled</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <Button
                          onClick={handleManageSubscription}
                          disabled={managingPortal}
                          className="w-full sm:w-auto gap-2"
                        >
                          {managingPortal ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Opening Stripe Portal...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4" />
                              Manage Subscription & Billing
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Update payment method, change plan tier, download invoices, or cancel via Stripe.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-5 h-5 text-muted-foreground" />
                        <h3 className="text-xl font-semibold">Free Plan</h3>
                      </div>
                      <p className="text-muted-foreground mb-4">
                        You are currently on the Free plan (1 gallery included). Upgrade to unlock unlimited galleries, advanced branding, and high-volume storage.
                      </p>
                      <Button onClick={() => navigate("/pricing")}>
                        View Plans & Upgrade
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => navigate("/pricing")}
                  >
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    {isSubscribed ? "Upgrade or Change Plan" : "Explore All Plans (30-Day Free Trial)"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
                        Syncing with Stripe...
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Refresh Subscription Status
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Subscription;