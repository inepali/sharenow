import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const Pricing = () => {
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const tiers = [
    {
      name: "Starter",
      tagline: "Perfect for solo photographers",
      price: { monthly: 4.99, yearly: 49.90 },
      stripePriceId: {
        monthly: "price_1SP5N8HE0DcMZ0rQ1EwSnB1X",
        yearly: "price_1SP5NYHE0DcMZ0rQD10e7sjt"
      },
      storage: "500 GB",
      features: [
        { text: "Up to 50 galleries per year", comingSoon: false },
        { text: "Basic branding (logo + color)", comingSoon: false },
        { text: "Client download links", comingSoon: false },
        { text: "Basic analytics", comingSoon: false },
        { text: "Email/chat support", comingSoon: false },
        { text: "500 GB storage", comingSoon: false }
      ],
      popular: false
    },
    {
      name: "Professional",
      tagline: "For established professionals",
      price: { monthly: 9.99, yearly: 99.90 },
      stripePriceId: {
        monthly: "price_1SPChPHE0DcMZ0rQJXqHcGOx",
        yearly: "price_1SPChUHE0DcMZ0rQUj2TVRoU"
      },
      storage: "1 TB",
      features: [
        { text: "Up to 250 galleries per year", comingSoon: false },
        { text: "Advanced branding + custom domain", comingSoon: true },
        { text: "Expiry/watermark options", comingSoon: true },
        { text: "Enhanced analytics", comingSoon: true },
        { text: "Priority support", comingSoon: false },
        { text: "1 TB storage", comingSoon: false }
      ],
      popular: true
    },
    {
      name: "Studio",
      tagline: "For teams & high-volume projects",
      price: { monthly: 19.99, yearly: 199.90 },
      stripePriceId: {
        monthly: "price_1SPChYHE0DcMZ0rQX9dDP1EH",
        yearly: "price_1SPChZHE0DcMZ0rQVcXAMwCW"
      },
      storage: "2 TB",
      features: [
        { text: "Unlimited galleries", comingSoon: false },
        { text: "White-label customization", comingSoon: false },
        { text: "Team accounts & roles", comingSoon: true },
        { text: "API/CRM integration", comingSoon: true },
        { text: "Dedicated account manager", comingSoon: false },
        { text: "2 TB storage", comingSoon: false }
      ],
      popular: false
    }
  ];

  const addOns = [
    { name: "Extra Storage", price: "$10 per 500 GB/month" },
    { name: "Additional Galleries", price: "$0.25 per gallery" },
    { name: "White Label Mobile App", price: "$99/month" },
    { name: "Print Shop Integration", price: "$49/month" },
    { name: "Premium Onboarding/Training", price: "$299 one-time" }
  ];

  const handleSubscribe = async (tier: typeof tiers[0]) => {
    setLoadingTier(tier.name);
    
    try {
      const priceId = tier.stripePriceId[billingCycle];
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId,
          billingCycle,
          tierName: tier.name
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <img src={logo} alt="Share My Shoot" className="w-10 h-10" />
            <Button
              variant="outline"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-hero py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-serif mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Start sharing beautiful wedding galleries with your clients today.
            Scale as you grow with flexible pricing that works for everyone.
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-card p-2 rounded-lg">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-md transition-smooth ${
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-md transition-smooth ${
                billingCycle === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly <Badge variant="secondary" className="ml-2">Save up to 20%</Badge>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-20 -mt-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={`relative p-8 transition-all hover:shadow-lg ${
                  tier.popular
                    ? "border-primary shadow-elegant scale-105 md:scale-110"
                    : ""
                }`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-serif mb-2">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {tier.tagline}
                  </p>
                  <div className="mb-2">
                    <span className="text-4xl font-bold">
                      ${billingCycle === "monthly" ? tier.price.monthly : tier.price.yearly}
                    </span>
                    <span className="text-muted-foreground">
                      /{billingCycle === "monthly" ? "month" : "year"}
                    </span>
                  </div>
                  {billingCycle === "yearly" && (
                    <div className="text-sm text-primary font-medium">
                      Save ${(tier.price.monthly * 12 - tier.price.yearly).toFixed(2)}/year
                    </div>
                  )}
                </div>

                <Button
                  className="w-full mb-6"
                  variant={tier.popular ? "default" : "outline"}
                  onClick={() => handleSubscribe(tier)}
                  disabled={loadingTier === tier.name}
                >
                  {loadingTier === tier.name ? "Processing..." : "Get Started"}
                </Button>

                <div className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm">{feature.text}</span>
                        {feature.comingSoon && (
                          <Badge variant="secondary" className="text-xs">
                            Coming soon
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-serif mb-4">Optional Add-Ons</h2>
              <p className="text-muted-foreground">
                Enhance your plan with additional features and capabilities
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {addOns.map((addOn, index) => (
                <Card key={index} className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium mb-1">{addOn.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {addOn.price}
                      </p>
                    </div>
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto p-12 text-center gradient-hero">
            <h2 className="text-3xl font-serif mb-4">
              Ready to Start Sharing?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of photographers who trust Share My Shoot to deliver
              stunning galleries to their clients.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")}>
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/")}>
                Learn More
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Share My Shoot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
