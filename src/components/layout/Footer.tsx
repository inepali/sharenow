import { Mail, Phone, Facebook, Instagram, Youtube } from "lucide-react";
import logo from "@/assets/logo.png";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
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
          <p>&copy; {currentYear} Share My Shoot. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
