import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadPhoto } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, X, Download, Image, FolderInput } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getR2Url } from "@/lib/r2";
import { getResponsiveUrls } from "@/lib/images";
import { ImportExternalDialog } from "./ImportExternalDialog";

interface Photo {
  id: string;
  storage_path: string;
  display_order: number;
  caption: string | null;
  thumbnail_path?: string | null;
}

interface Section {
  id: string;
  title: string;
}

interface PhotoUploaderProps {
  sectionId: string;
  galleryId: string;
}

export const PhotoUploader = ({ sectionId, galleryId }: PhotoUploaderProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileIndex, setUploadFileIndex] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gallerySlug, setGallerySlug] = useState("");
  const [currentCoverPath, setCurrentCoverPath] = useState<string | null>(null);
  const [deletePhotoId, setDeletePhotoId] = useState<Photo | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    fetchPhotos();
    fetchGalleryCover();
    fetchAllSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const fetchGalleryCover = async () => {
    const { data, error } = await supabase
      .from("galleries")
      .select("cover_image_path, slug")
      .eq("id", galleryId)
      .single();

    if (!error && data) {
      setCurrentCoverPath(data.cover_image_path);
      setGallerySlug(data.slug || "");
    }
  };

  const fetchAllSections = async () => {
    const { data, error } = await supabase
      .from("sections")
      .select("id, title")
      .eq("gallery_id", galleryId)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setSections(data);
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
    setUploadTotal(files.length);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        setUploadFileIndex(i + 1);
        setUploadProgress(0);
        const file = files[i];

        const currentSection = sections.find(s => s.id === sectionId);
        const sectionTitle = currentSection?.title || "section";

        const maxOrder = photos.reduce((max, p) => Math.max(max, p.display_order), -1);

        await uploadPhoto({
          file,
          galleryId,
          sectionId,
          gallerySlug,
          sectionTitle,
          displayOrder: maxOrder + i + 1,
          onProgress: setUploadProgress,
        });
      }

      toast.success(`${files.length} photo(s) uploaded successfully`);
      fetchPhotos();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload photos";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadFileIndex(0);
      setUploadTotal(0);
      e.target.value = "";
    }
  };
  const handleDelete = async (photo: Photo) => {
    let fileNames = [photo.storage_path];
    const parts = photo.storage_path.split("/");
    if (parts.length === 4) {
      const fileName = parts.pop() || "";
      const dirPath = parts.join("/");
      const dotIndex = fileName.lastIndexOf(".");
      const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
      
      fileNames = [
        photo.storage_path,
        `${dirPath}/${baseName}-lg.webp`,
        `${dirPath}/${baseName}-md.webp`,
        `${dirPath}/${baseName}-sm.webp`
      ];
    } else if (parts.length === 5 && parts[0] === "Gallery") {
      const fileName = parts.pop() || "";
      const dirPath = parts.join("/");
      const dotIndex = fileName.lastIndexOf(".");
      const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
      
      const thumbName = baseName === "original" ? "thumb.webp" : `${baseName}-sm.webp`;
      const mediumName = baseName === "original" ? "medium.webp" : `${baseName}-md.webp`;
      const largeName = baseName === "original" ? "large.webp" : `${baseName}-lg.webp`;

      fileNames = [
        photo.storage_path,
        `${dirPath}/${largeName}`,
        `${dirPath}/${mediumName}`,
        `${dirPath}/${thumbName}`
      ];
    }

    const { error: edgeError } = await supabase.functions.invoke('r2-delete-object', {
      body: { fileNames }
    });

    if (edgeError) {
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
    setDeletePhotoId(null);
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

  const handleMovePhoto = async (photo: Photo, targetSectionId: string) => {
    const { error } = await supabase
      .from("photos")
      .update({ section_id: targetSectionId })
      .eq("id", photo.id);

    if (error) {
      toast.error("Failed to move photo");
    } else {
      toast.success("Photo moved successfully");
      fetchPhotos();
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading photos...</p>
      </Card>
    );
  }

  const otherSections = sections.filter(s => s.id !== sectionId);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif">Photos</h2>
          <div className="flex gap-2">
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
                <span className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? `Uploading ${uploadFileIndex} of ${uploadTotal}…` : "Upload Photos"}
                </span>
              </Button>
            </label>
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => setIsImportOpen(true)}
            >
              <FolderInput className="w-4 h-4 mr-2" />
              Import Folder
            </Button>
          </div>
        </div>

        {/* Upload progress bar */}
        {uploading && (
          <div className="space-y-1.5 pb-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>File {uploadFileIndex} of {uploadTotal}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

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
                    src={getResponsiveUrls(photo.storage_path, photo.thumbnail_path, photo.id).thumb}
                    alt={photo.caption || "Gallery photo"}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-smooth flex flex-col items-center justify-center p-2">
                    {/* Top Action Bar */}
                    <div className="absolute top-2 right-2 flex gap-2">
                      {otherSections.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                              <FolderInput className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Move to...</div>
                            {otherSections.map((section) => (
                              <DropdownMenuItem
                                key={section.id}
                                onClick={() => handleMovePhoto(photo, section.id)}
                              >
                                {section.title}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => window.open(getR2Url(photo.storage_path), "_blank")}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => setDeletePhotoId(photo)}
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
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <AlertDialog open={!!deletePhotoId} onOpenChange={(open) => !open && setDeletePhotoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this photo from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePhotoId && handleDelete(deletePhotoId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ImportExternalDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        galleryId={galleryId}
        sectionId={sectionId}
        gallerySlug={gallerySlug}
        sectionTitle={sections.find((s) => s.id === sectionId)?.title || "section"}
        onImportComplete={fetchPhotos}
      />
    </div>
  );
};
