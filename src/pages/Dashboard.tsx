import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Images } from "lucide-react";
import { GalleryCard } from "@/components/GalleryCard";
import { CreateGalleryDialog } from "@/components/CreateGalleryDialog";
import { AppHeader } from "@/components/layout/AppHeader";
import { useGalleries, useUserEmail, useInvalidateGalleries } from "@/hooks/use-galleries";

const Dashboard = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: galleries = [], isLoading } = useGalleries();
  const { data: userEmail = "" } = useUserEmail();
  const invalidateGalleries = useInvalidateGalleries();

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-serif mb-2">Your Galleries</h2>
            <p className="text-muted-foreground">
              Create and manage your wedding photo galleries
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
