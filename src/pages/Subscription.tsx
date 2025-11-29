import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

interface SubscriptionData {
  subscribed: boolean;
  product_id?: string;
  price_id?: string;
  subscription_id?: string;
  subscription_end?: string;
  subscription_start?: string;
}

const TIER_INFO = {
  'prod_SPxBzHE0DcMZ0rQu': { name: 'Starter', monthly: '$4.99', yearly: '$49.90' },
  'prod_SPxByHE0DcMZ0rQw': { name: 'Professional', monthly: '$9.99', yearly: '$99.90' },
  'prod_SPxBzHE0DcMZ0rQy': { name: 'Studio', monthly: '$19.99', yearly: '$199.90' }
};

const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [managingPortal, setManagingPortal] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) throw error;

      setSubscription(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setManagingPortal(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setManagingPortal(false);
    }
  };

  const getTierInfo = () => {
    if (!subscription?.product_id) return null;
    return TIER_INFO[subscription.product_id as keyof typeof TIER_INFO];
  };

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
                onClick={() => navigate('/dashboard')}
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
            View and manage your subscription details
          </p>

          {loading ? (
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
                    Your active subscription details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscription?.subscribed ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-2xl font-semibold">
                              {getTierInfo()?.name || 'Active Plan'}
                            </h3>
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          </div>
                          {subscription.subscription_start && (
                            <p className="text-sm text-muted-foreground">
                              Started on {new Date(subscription.subscription_start).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                          {subscription.subscription_end && (
                            <p className="text-sm text-muted-foreground">
                              Renews on {new Date(subscription.subscription_end).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          )}
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
                              Opening Portal...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4" />
                              Manage Subscription
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Update payment method, change plan, or cancel subscription
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-5 h-5 text-muted-foreground" />
                        <h3 className="text-xl font-semibold">No Active Subscription</h3>
                      </div>
                      <p className="text-muted-foreground mb-4">
                        You don't have an active subscription. Choose a plan to get started.
                      </p>
                      <Button onClick={() => navigate('/pricing')}>
                        View Plans
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/pricing')}
                  >
                    {subscription?.subscribed ? 'Upgrade or Downgrade Plan' : 'View Available Plans'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={checkSubscription}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      'Refresh Subscription Status'
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