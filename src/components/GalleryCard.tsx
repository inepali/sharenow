import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ExternalLink, Edit, Trash2, Calendar, Users, Image, HardDrive, Archive, Lock, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";

interface GalleryCardProps {
  gallery: {
    id: string;
    title: string;
    gallery_type: string | null;
    wedding_date: string | null;
    slug: string;
    is_active: boolean;
    cover_image_path: string | null;
    access_pin: string | null;
  };
  onUpdate: () => void;
}

export const GalleryCard = ({ gallery, onUpdate }: GalleryCardProps) => {
  const navigate = useNavigate();
  const [photoCount, setPhotoCount] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGalleryStats();
  }, [gallery.id]);

  const fetchGalleryStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('r2-gallery-stats', {
        body: { prefix: `${gallery.id}/` }
      });

      if (error) {
        console.error("Failed to fetch gallery stats:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setPhotoCount(data.photoCount || 0);
        setTotalSize(data.totalSize || 0);
      }
    } catch (error: unknown) {
      console.error("Error fetching gallery stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getCoverImageUrl = () => {
    if (!gallery.cover_image_path) return null;
    const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
    return `${publicUrl}/${gallery.cover_image_path}`;
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Cover image must be less than 10MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setCoverUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `covers/${gallery.id}-cover.${fileExt}`;

      const { data: edgeData, error: edgeError } = await supabase.functions.invoke("r2-presigned-url", {
        body: { fileName: filePath, contentType: file.type },
      });

      if (edgeError) throw edgeError;

      const uploadRes = await fetch(edgeData.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("Upload to R2 failed");

      const { error: dbError } = await supabase
        .from("galleries")
        .update({ cover_image_path: filePath })
        .eq("id", gallery.id);

      if (dbError) throw dbError;

      toast.success("Cover image uploaded!");
      onUpdate();
    } catch (err) {
      console.error("Cover upload error:", err);
      toast.error("Failed to upload cover image");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleHardDelete = async () => {

    setLoading(true);

    try {
      // 1. Fetch all sections for this gallery
      const { data: sections } = await supabase
        .from("sections")
        .select("id")
        .eq("gallery_id", gallery.id);

      const fileNamesToDelete: string[] = [];

      // Add cover image if it exists
      if (gallery.cover_image_path) {
        fileNamesToDelete.push(gallery.cover_image_path);
      }

      // 2. Fetch all photos for these sections
      if (sections && sections.length > 0) {
        const sectionIds = sections.map(s => s.id);
        const { data: photos } = await supabase
          .from("photos")
          .select("storage_path")
          .in("section_id", sectionIds);

        if (photos && photos.length > 0) {
          fileNamesToDelete.push(...photos.map(p => p.storage_path));
        }
      }

      // 3. Delete files from R2
      if (fileNamesToDelete.length > 0) {
        const { error: edgeError } = await supabase.functions.invoke('r2-delete-object', {
          body: { fileNames: fileNamesToDelete }
        });

        if (edgeError) {
          console.error("Failed to delete gallery photos from R2:", edgeError);
          toast.error("Warning: Some photos could not be deleted from storage");
        }
      }

      // 4. Delete gallery from database (cascades to sections and photos)
      const { error: dbError } = await supabase
        .from("galleries")
        .delete()
        .eq("id", gallery.id);

      if (dbError) throw dbError;

      toast.success("Gallery deleted");
      onUpdate();
    } catch (error) {
      console.error("Error deleting gallery:", error);
      toast.error("Failed to delete gallery");
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleSoftDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("galleries")
        .update({ is_active: false })
        .eq("id", gallery.id);

      if (error) throw error;
      toast.success("Gallery safely archived (hidden from public)");
      onUpdate();
    } catch (error) {
      console.error("Error archiving gallery:", error);
      toast.error("Failed to archive gallery");
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
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
          {!gallery.is_active && (
            <div className="absolute top-4 right-4">
              <Badge variant="secondary" className="bg-background/80 hover:bg-background/90 text-foreground backdrop-blur-sm border-none shadow-sm">
                Archived
              </Badge>
            </div>
          )}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h3 className="text-2xl font-serif mb-1">{gallery.title}</h3>
            {gallery.gallery_type && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                <span>{gallery.gallery_type}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="h-48 bg-gradient-card border-b flex items-center justify-center relative group/cover cursor-pointer"
          onClick={() => coverInputRef.current?.click()}
          title="Click to upload a cover image"
        >
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverUpload}
          />
          {!gallery.is_active && (
            <div className="absolute top-4 right-4">
              <Badge variant="secondary" className="shadow-sm">
                Archived
              </Badge>
            </div>
          )}
          <div className="text-center p-6">
            <h3 className="text-2xl font-serif text-foreground mb-2">{gallery.title}</h3>
            {gallery.gallery_type && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{gallery.gallery_type}</span>
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/20 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover/cover:opacity-100 transition-opacity flex flex-col items-center gap-1 text-white drop-shadow">
              {coverUploading ? (
                <span className="text-sm font-medium">Uploading…</span>
              ) : (
                <>
                  <Camera className="w-8 h-8" />
                  <span className="text-sm font-medium">Add Cover Photo</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {(gallery.wedding_date || gallery.access_pin) && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {gallery.wedding_date ? (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(gallery.wedding_date).toLocaleDateString()}</span>
              </div>
            ) : (
              <div></div>
            )}
            {gallery.access_pin && (
              <div className="flex items-center gap-2" title="Access PIN">
                <Lock className="w-4 h-4" />
                <span className="font-mono tracking-widest">{gallery.access_pin}</span>
              </div>
            )}
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
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Gallery?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-4 pt-2">
                  <p>How would you like to delete <span className="font-semibold text-foreground">{gallery.title}</span>?</p>

                  <div className="bg-muted p-4 rounded-md space-y-2">
                    <h4 className="flex items-center gap-2 font-medium text-foreground">
                      <Archive className="w-4 h-4" />
                      Archive (Soft Delete)
                    </h4>
                    <p className="text-sm">Safely hides the gallery from your clients and the public URL, but keeps all photos and data intact in your dashboard.</p>
                  </div>

                  <div className="bg-destructive/10 p-4 rounded-md space-y-2">
                    <h4 className="flex items-center gap-2 font-medium text-destructive">
                      <Trash2 className="w-4 h-4" />
                      Permanent Delete
                    </h4>
                    <p className="text-sm">Permanently destroys the gallery record and purges all {photoCount || 'associated'} image files from Cloudflare R2 storage. Cannot be undone.</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-2">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button variant="default" onClick={handleSoftDelete} disabled={loading}>
                    Archive Gallery
                  </Button>
                  <Button variant="destructive" onClick={handleHardDelete} disabled={loading}>
                    Delete Forever
                  </Button>
                </div>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-4">
            <span>Status: {gallery.is_active ? "Active" : "Inactive"}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Image className="w-3 h-3" />
                {loading ? "..." : photoCount}
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {loading ? "..." : formatBytes(totalSize)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
