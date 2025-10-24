import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

const Pricing = () => {
  const navigate = useNavigate();

  const tiers = [
    {
      name: "Starter",
      tagline: "Perfect for solo photographers",
      price: { monthly: 19, yearly: 199 },
      storage: "500 GB",
      features: [
        "Up to 50 galleries per year",
        "Basic branding (logo + color)",
        "Client download links",
        "Basic analytics",
        "Email/chat support",
        "500 GB storage"
      ],
      popular: false
    },
    {
      name: "Professional",
      tagline: "For established professionals",
      price: { monthly: 49, yearly: 499 },
      storage: "2 TB",
      features: [
        "Up to 250 galleries per year",
        "Advanced branding + custom domain",
        "Expiry/watermark options",
        "Enhanced analytics",
        "Priority support",
        "2 TB storage"
      ],
      popular: true
    },
    {
      name: "Studio",
      tagline: "For teams & high-volume projects",
      price: { monthly: 129, yearly: 1299 },
      storage: "10 TB (scalable)",
      features: [
        "Unlimited galleries",
        "White-label customization",
        "Team accounts & roles",
        "API/CRM integration",
        "Dedicated account manager",
        "10 TB storage (scalable)"
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
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start sharing beautiful wedding galleries with your clients today.
            Scale as you grow with flexible pricing that works for everyone.
          </p>
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
                    <span className="text-4xl font-bold">${tier.price.monthly}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    or ${tier.price.yearly}/year (save $
                    {tier.price.monthly * 12 - tier.price.yearly})
                  </div>
                </div>

                <Button
                  className="w-full mb-6"
                  variant={tier.popular ? "default" : "outline"}
                  onClick={() => navigate("/auth")}
                >
                  Get Started
                </Button>

                <div className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
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
