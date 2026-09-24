import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Images, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GalleryCard } from "@/components/GalleryCard";
import { CreateGalleryDialog } from "@/components/CreateGalleryDialog";
import { AppHeader } from "@/components/layout/AppHeader";
import { useGalleries, useUserEmail, useInvalidateGalleries } from "@/hooks/use-galleries";
import { useSubscription, useInvalidateSubscription } from "@/hooks/use-subscription";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: galleries = [], isLoading } = useGalleries();
  const { data: userEmail = "" } = useUserEmail();
  const invalidateGalleries = useInvalidateGalleries();
  const { tier, isSubscribed, isTrialing, limits } = useSubscription();
  const invalidateSubscription = useInvalidateSubscription();

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const tierName = searchParams.get("tier");

    if (sessionId) {
      toast.success(
        `🎉 Subscription Activated! Your ${tierName || "Starter"} plan (30-day trial) is now active.`
      );
      invalidateSubscription();
      // Clean up URL parameters cleanly without page refresh
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams, invalidateSubscription]);

  const handleGalleryCreated = () => {
    setShowCreateDialog(false);
    invalidateGalleries();
  };

  if (isLoading) {
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
      <AppHeader userEmail={userEmail} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-serif">Your Galleries</h2>
              <Badge
                variant={isSubscribed ? "default" : "secondary"}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate("/subscription")}
                title="Click to view subscription"
              >
                {tier} {isTrialing ? "(Trial)" : ""}
              </Badge>
              {!isSubscribed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-primary gap-1 px-2"
                  onClick={() => navigate("/pricing")}
                >
                  <Sparkles className="w-3 h-3" />
                  Upgrade
                </Button>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {galleries.length} of {limits.maxGalleries === Infinity ? "unlimited" : limits.maxGalleries} galleries used &bull; {limits.storageLimitDisplay} storage
            </p>
          </div>

          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Gallery
          </Button>
        </div>

        {galleries.length === 0 ? (
          <Card className="p-12 text-center gradient-card">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Images className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-serif mb-2">No galleries yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first gallery to start uploading wedding photos
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Gallery
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleries.map((gallery) => (
              <GalleryCard
                key={gallery.id}
                gallery={gallery}
                onUpdate={invalidateGalleries}
              />
            ))}
          </div>
        )}
      </main>

      <CreateGalleryDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onGalleryCreated={handleGalleryCreated}
      />
    </div>
  );
};

export default Dashboard;
