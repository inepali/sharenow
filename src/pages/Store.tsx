import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Package } from "lucide-react";

const Store = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-serif">Print Shop Integration</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="p-12 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-serif mb-4">Print Shop Integration</h2>
            <p className="text-muted-foreground mb-6">
              Connect your photo galleries to professional print services. Allow your clients to order prints, albums, and other products directly from their galleries.
            </p>
            <div className="text-left space-y-4 mb-8">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Professional Print Services</h3>
                <p className="text-sm text-muted-foreground">
                  Integration with leading print labs for high-quality photo prints, canvas, and albums.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Automated Fulfillment</h3>
                <p className="text-sm text-muted-foreground">
                  Orders are automatically sent to print partners for processing and shipping.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Revenue Sharing</h3>
                <p className="text-sm text-muted-foreground">
                  Set your markup and earn on every print order placed through your galleries.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground italic">
              Coming soon - Print shop integration features are currently in development.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Store;
