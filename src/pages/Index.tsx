import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, Heart, Share2, Sparkles } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/80 mb-8 shadow-medium">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-serif mb-6 text-foreground">
              Share Your Love Story
            </h1>
            
            <p className="text-xl md:text-2xl text-foreground/80 mb-8 leading-relaxed">
              Create beautiful wedding galleries that let couples relive their special day.
              Upload, organize, and share precious memories with elegance.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-lg px-8 shadow-medium hover:shadow-hover transition-smooth"
              >
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-lg px-8 bg-white/50 hover:bg-white/80 transition-smooth"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="w-full h-16 md:h-24"
            fill="hsl(var(--background))"
          >
            <path d="M0,0 C300,100 900,100 1200,0 L1200,120 L0,120 Z" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional tools designed for wedding photographers and videographers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center p-8 rounded-2xl gradient-card shadow-soft hover:shadow-medium transition-smooth">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-serif mb-3">Organize Beautifully</h3>
              <p className="text-muted-foreground">
                Create custom sections to organize ceremony, reception, portraits, and more.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl gradient-card shadow-soft hover:shadow-medium transition-smooth">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Share2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-serif mb-3">Share Effortlessly</h3>
              <p className="text-muted-foreground">
                Generate unique gallery links to share with couples instantly.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl gradient-card shadow-soft hover:shadow-medium transition-smooth">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-serif mb-3">Delight Your Clients</h3>
              <p className="text-muted-foreground">
                Couples can favorite photos and download their cherished memories.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-serif mb-6">
              Ready to Create Your First Gallery?
            </h2>
            <p className="text-xl text-foreground/80 mb-8">
              Join photographers worldwide who trust our platform to showcase their work
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 shadow-medium hover:shadow-hover transition-smooth"
            >
              Start for Free
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-card">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Wedding Gallery. Share memories with elegance.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
