import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Edit, Trash2, Calendar, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GalleryCardProps {
  gallery: {
    id: string;
    title: string;
    wedding_couple: string | null;
    wedding_date: string | null;
    slug: string;
    is_active: boolean;
    cover_image_path: string | null;
  };
  onUpdate: () => void;
}

export const GalleryCard = ({ gallery, onUpdate }: GalleryCardProps) => {
  const navigate = useNavigate();

  const getCoverImageUrl = () => {
    if (!gallery.cover_image_path) return null;
    const { data } = supabase.storage
      .from("gallery-photos")
      .getPublicUrl(gallery.cover_image_path);
    return data.publicUrl;
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this gallery?")) return;

    const { error } = await supabase
      .from("galleries")
      .delete()
      .eq("id", gallery.id);

    if (error) {
      toast.error("Failed to delete gallery");
    } else {
      toast.success("Gallery deleted");
      onUpdate();
    }
  };

  const galleryUrl = `${window.location.origin}/gallery/${gallery.slug}`;
  const coverUrl = getCoverImageUrl();

  return (
    <Card className="overflow-hidden transition-smooth hover:shadow-medium group">
      {coverUrl ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={coverUrl}
            alt={gallery.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h3 className="text-2xl font-serif mb-1">{gallery.title}</h3>
            {gallery.wedding_couple && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                <span>{gallery.wedding_couple}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-48 bg-gradient-card border-b flex items-center justify-center">
          <div className="text-center p-6">
            <h3 className="text-2xl font-serif text-foreground mb-2">{gallery.title}</h3>
            {gallery.wedding_couple && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{gallery.wedding_couple}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {gallery.wedding_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{new Date(gallery.wedding_date).toLocaleDateString()}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/manage/${gallery.id}`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Manage
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(galleryUrl, "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Status: {gallery.is_active ? "Active" : "Inactive"}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
