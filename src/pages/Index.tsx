import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Share2, Sparkles, Mail, Phone, Facebook, Instagram, Youtube } from "lucide-react";
import logo from "@/assets/logo.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero" aria-label="Hero section">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <img 
                src={logo} 
                alt="Share My Shoot - Professional Photo Gallery Platform Logo" 
                className="w-32 h-32 mx-auto mix-blend-darken dark:mix-blend-lighten"
                width="128"
                height="128"
                loading="eager"
              />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-serif mb-6 text-foreground">
              Professional Photo Gallery Platform for Photographers
            </h1>
            
            <p className="text-xl md:text-2xl text-foreground/80 mb-8 leading-relaxed">
              Create stunning galleries for weddings, events, and portrait photography. Upload, organize, and share precious memories with elegance. Trusted by professional photographers worldwide.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/pricing")}
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
      <section className="py-20 bg-background" aria-labelledby="features-heading">
        <div className="container mx-auto px-4">
          <header className="text-center mb-16">
            <h2 id="features-heading" className="text-4xl md:text-5xl font-serif mb-4">
              Everything You Need for Photo Gallery Management
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional tools designed for wedding, event, and portrait photographers
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <article className="text-center p-8 rounded-2xl gradient-card shadow-soft hover:shadow-medium transition-smooth">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6" aria-hidden="true">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-serif mb-3">Organize Beautifully</h3>
              <p className="text-muted-foreground">
                Create custom sections to organize ceremony, reception, portraits, and more with intuitive photo organization tools.
              </p>
            </article>

            <article className="text-center p-8 rounded-2xl gradient-card shadow-soft hover:shadow-medium transition-smooth">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6" aria-hidden="true">
                <Share2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-serif mb-3">Share Effortlessly</h3>
              <p className="text-muted-foreground">
                Generate unique gallery links to share with clients instantly. Secure photo delivery for wedding and event photography.
              </p>
            </article>

            <article className="text-center p-8 rounded-2xl gradient-card shadow-soft hover:shadow-medium transition-smooth">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6" aria-hidden="true">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-serif mb-3">Delight Your Clients</h3>
              <p className="text-muted-foreground">
                Clients can favorite photos and download their cherished memories. Enhanced client experience for professional photographers.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero" aria-labelledby="cta-heading">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 id="cta-heading" className="text-4xl md:text-5xl font-serif mb-6">
              Ready to Create Your First Photo Gallery?
            </h2>
            <p className="text-xl text-foreground/80 mb-8">
              Join thousands of professional photographers worldwide who trust our platform to deliver stunning wedding and event galleries
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/pricing")}
              className="text-lg px-8 shadow-medium hover:shadow-hover transition-smooth"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-card" role="contentinfo">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Brand */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <img 
                  src={logo} 
                  alt="Share My Shoot Logo" 
                  className="w-8 h-8 mix-blend-darken dark:mix-blend-lighten"
                  width="32"
                  height="32"
                  loading="lazy"
                />
                <h3 className="text-xl font-serif">Share My Shoot</h3>
              </div>
              <p className="text-muted-foreground">
                Professional photo gallery platform for wedding, event, and portrait photographers worldwide.
              </p>
            </div>

            {/* Contact */}
            <nav className="text-center" aria-label="Contact information">
              <h4 className="font-semibold mb-4">Contact Us</h4>
              <div className="space-y-2 text-muted-foreground">
                <a href="mailto:info@sharemyshoot.com" className="flex items-center justify-center gap-2 hover:text-primary transition-smooth" aria-label="Email us at info@sharemyshoot.com">
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  info@sharemyshoot.com
                </a>
                <a href="tel:+17047505858" className="flex items-center justify-center gap-2 hover:text-primary transition-smooth" aria-label="Call us at 704-750-5858">
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  704-750-5858
                </a>
              </div>
            </nav>

            {/* Social */}
            <nav className="text-center md:text-right" aria-label="Social media links">
              <h4 className="font-semibold mb-4">Follow Us</h4>
              <div className="flex items-center justify-center md:justify-end gap-4">
                <a 
                  href="https://facebook.com/sharemyshoot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-smooth"
                  aria-label="Follow us on Facebook"
                >
                  <Facebook className="w-5 h-5" aria-hidden="true" />
                </a>
                <a 
                  href="https://instagram.com/sharemyshoot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-smooth"
                  aria-label="Follow us on Instagram"
                >
                  <Instagram className="w-5 h-5" aria-hidden="true" />
                </a>
                <a 
                  href="https://youtube.com/@sharemyshoot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-smooth"
                  aria-label="Subscribe to our YouTube channel"
                >
                  <Youtube className="w-5 h-5" aria-hidden="true" />
                </a>
              </div>
            </nav>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>© 2025 Share My Shoot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
