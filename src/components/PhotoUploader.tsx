import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, X, Download, Image } from "lucide-react";

interface Photo {
  id: string;
  storage_path: string;
  display_order: number;
  caption: string | null;
}

interface PhotoUploaderProps {
  sectionId: string;
  galleryId: string;
}

export const PhotoUploader = ({ sectionId, galleryId }: PhotoUploaderProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentCoverPath, setCurrentCoverPath] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotos();
    fetchGalleryCover();
  }, [sectionId]);

  const fetchGalleryCover = async () => {
    const { data, error } = await supabase
      .from("galleries")
      .select("cover_image_path")
      .eq("id", galleryId)
      .single();

    if (!error && data) {
      setCurrentCoverPath(data.cover_image_path);
    }
  };

  const fetchPhotos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("section_id", sectionId)
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Failed to load photos");
    } else {
      setPhotos(data || []);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${galleryId}/${sectionId}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("gallery-photos")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const maxOrder = photos.reduce((max, p) => Math.max(max, p.display_order), -1);

        const { error: dbError } = await supabase
          .from("photos")
          .insert({
            section_id: sectionId,
            storage_path: fileName,
            display_order: maxOrder + i + 1,
          });

        if (dbError) throw dbError;
      }

      toast.success(`${files.length} photo(s) uploaded successfully`);
      fetchPhotos();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload photos");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm("Delete this photo?")) return;

    const { error: storageError } = await supabase.storage
      .from("gallery-photos")
      .remove([photo.storage_path]);

    if (storageError) {
      toast.error("Failed to delete photo from storage");
      return;
    }

    const { error: dbError } = await supabase
      .from("photos")
      .delete()
      .eq("id", photo.id);

    if (dbError) {
      toast.error("Failed to delete photo");
    } else {
      toast.success("Photo deleted");
      fetchPhotos();
    }
  };

  const handleSetAsCover = async (photo: Photo) => {
    const { error } = await supabase
      .from("galleries")
      .update({ cover_image_path: photo.storage_path })
      .eq("id", galleryId);

    if (error) {
      toast.error("Failed to set cover image");
    } else {
      setCurrentCoverPath(photo.storage_path);
      toast.success("Cover image updated");
    }
  };

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage
      .from("gallery-photos")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading photos...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif">Photos</h2>
          <div>
            <input
              type="file"
              id="photo-upload"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <label htmlFor="photo-upload">
              <Button
                disabled={uploading}
                asChild
              >
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Photos"}
                </span>
              </Button>
            </label>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-12 gradient-card rounded-lg">
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No photos yet. Upload some to get started!</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-4 gap-2 space-y-2">
            {photos.map((photo) => {
              const isCover = currentCoverPath === photo.storage_path;
              
              return (
                <div
                  key={photo.id}
                  className="relative group break-inside-avoid mb-2 rounded overflow-hidden shadow-sm hover:shadow-md transition-smooth"
                >
                  {isCover && (
                    <Badge className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground">
                      Cover Image
                    </Badge>
                  )}
                  <img
                    src={getPhotoUrl(photo.storage_path)}
                    alt={photo.caption || "Wedding photo"}
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-smooth flex flex-col items-center justify-center gap-2 p-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(getPhotoUrl(photo.storage_path), "_blank")}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(photo)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {!isCover && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        onClick={() => handleSetAsCover(photo)}
                      >
                        <Image className="w-4 h-4 mr-2" />
                        Set as Cover
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
