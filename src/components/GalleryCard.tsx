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
import { ExternalLink, Edit, Trash2, Calendar, Users, Image, HardDrive, Archive, Lock, Camera, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { getR2Url, formatBytes } from "@/lib/r2";
import { AlbumUploadDialog } from "./AlbumUploadDialog";
import type { Gallery } from "@/types";

interface GalleryCardProps {
  gallery: Gallery;
  onUpdate: () => void;
}

export const GalleryCard = ({ gallery, onUpdate }: GalleryCardProps) => {
  const navigate = useNavigate();
  const [photoCount, setPhotoCount] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGalleryStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery.id]);

  const fetchGalleryStats = async () => {
    try {
      const prefixes = [
        `${gallery.slug}/`,
        `Gallery/${gallery.id}/`,
        `${gallery.id}/`
      ];

      const { data, error } = await supabase.functions.invoke("r2-gallery-stats", {
        body: { prefixes },
      });

      if (error) {
        throw error;
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

  const getCoverImageUrl = () => {
    if (!gallery.cover_image_path) return null;
    return getR2Url(gallery.cover_image_path);
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
      const filePath = `${gallery.slug}/cover.${fileExt}`;

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
    } catch (err: unknown) {
      console.error("Cover upload error:", err);
      toast.error("Failed to upload cover image");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {

    setLoading(true);

    try {
      // 1. Fetch all sections for this gallery
      const { data: sections } = await supabase
        .from("sections")
        .select("id")
        .eq("gallery_id", gallery.id);

      const fileNamesToDelete: string[] = [];

      // Add cover image if it exists and is legacy (doesn't live inside gallery folder)
      if (gallery.cover_image_path && !gallery.cover_image_path.startsWith(`${gallery.slug}/`)) {
        fileNamesToDelete.push(gallery.cover_image_path);
      }

      // 2. Fetch all photos for these sections to get legacy files
      if (sections && sections.length > 0) {
        const sectionIds = sections.map(s => s.id);
        const { data: photos } = await supabase
          .from("photos")
          .select("storage_path")
          .in("section_id", sectionIds);

        if (photos && photos.length > 0) {
          photos.forEach((p) => {
            // If it starts with slug prefix, it is deleted by the prefix purge.
            // Otherwise, it's a legacy photo outside the slug folder, so list and delete manually.
            if (!p.storage_path.startsWith(`${gallery.slug}/`)) {
              const parts = p.storage_path.split("/");
              if (parts.length === 5 && parts[0] === "Gallery") {
                const fileName = parts.pop() || "";
                const dirPath = parts.join("/");
                const dotIndex = fileName.lastIndexOf(".");
                const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
                
                const thumbName = baseName === "original" ? "thumb.webp" : `${baseName}-sm.webp`;
                const mediumName = baseName === "original" ? "medium.webp" : `${baseName}-md.webp`;
                const largeName = baseName === "original" ? "large.webp" : `${baseName}-lg.webp`;

                fileNamesToDelete.push(
                  p.storage_path,
                  `${dirPath}/${largeName}`,
                  `${dirPath}/${mediumName}`,
                  `${dirPath}/${thumbName}`
                );
              } else {
                fileNamesToDelete.push(p.storage_path);
              }
            }
          });
        }
      }

      // 3. Delete files by prefix (purges the entire gallery slug directory)
      const { error: prefixError } = await supabase.functions.invoke('r2-delete-object', {
        body: { prefix: `${gallery.slug}/` }
      });

      if (prefixError) {
        console.error("Failed to delete gallery folder prefix from R2:", prefixError);
      }

      // 4. Delete legacy file list from R2 if any
      if (fileNamesToDelete.length > 0) {
        const { error: listError } = await supabase.functions.invoke('r2-delete-object', {
          body: { fileNames: fileNamesToDelete }
        });

        if (listError) {
          console.error("Failed to delete legacy gallery photos from R2:", listError);
          toast.error("Warning: Some legacy photos could not be deleted from storage");
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
    } catch (error: unknown) {
      console.error("Error deleting gallery:", error);
      toast.error("Failed to delete gallery");
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
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
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
                <AlertDialogDescription className="pt-2">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{gallery.title}</span>? This will permanently delete the gallery and purge all associated photo files from Cloudflare R2 storage. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                  {loading ? "Deleting..." : "Delete Gallery"}
                </Button>
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

      <AlbumUploadDialog
        open={isUploadOpen}
        onOpenChange={(open) => {
          setIsUploadOpen(open);
          if (!open) fetchGalleryStats();
        }}
        gallery={gallery}
      />
    </Card>
  );
};
