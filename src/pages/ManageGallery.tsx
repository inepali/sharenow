import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Upload } from "lucide-react";
import { SectionManager } from "@/components/SectionManager";
import { PhotoUploader } from "@/components/PhotoUploader";

interface Gallery {
  id: string;
  title: string;
  wedding_couple: string | null;
  slug: string;
}

const ManageGallery = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    if (id) {
      fetchGallery();
    }
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchGallery = async () => {
    try {
      const { data, error } = await supabase
        .from("galleries")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setGallery(data);
    } catch (error: any) {
      toast.error("Failed to load gallery");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
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

  if (!gallery) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-serif">{gallery.title}</h1>
          {gallery.wedding_couple && (
            <p className="text-muted-foreground mt-1">{gallery.wedding_couple}</p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-serif mb-4">Gallery Sections</h2>
              <SectionManager
                galleryId={gallery.id}
                selectedSection={selectedSection}
                onSelectSection={setSelectedSection}
              />
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedSection ? (
              <PhotoUploader
                sectionId={selectedSection}
                galleryId={gallery.id}
              />
            ) : (
              <Card className="p-12 text-center gradient-card">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-serif mb-2">Select a section</h3>
                  <p className="text-muted-foreground">
                    Choose a section from the left to upload and manage photos
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManageGallery;
