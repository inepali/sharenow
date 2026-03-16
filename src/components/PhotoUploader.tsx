import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

interface Photo {
  id: string;
  storage_path: string;
  display_order: number;
  caption: string | null;
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
  const [uploadProgress, setUploadProgress] = useState(0); // 0–100 per file
  const [uploadFileIndex, setUploadFileIndex] = useState(0); // 1-based current file
  const [uploadTotal, setUploadTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentCoverPath, setCurrentCoverPath] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotos();
    fetchGalleryCover();
    fetchAllSections();
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

    // Helper: upload a single file via XHR for progress tracking
    const uploadFileXHR = (url: string, file: File): Promise<void> =>
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

    try {
      for (let i = 0; i < files.length; i++) {
        setUploadFileIndex(i + 1);
        setUploadProgress(0);
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${galleryId}/${sectionId}/${Date.now()}-${i}.${fileExt}`;

        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('r2-presigned-url', {
          body: { fileName, contentType: file.type }
        });

        if (edgeError) throw edgeError;

        await uploadFileXHR(edgeData.url, file);

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
    if (!confirm("Delete this photo?")) return;

    const { error: edgeError } = await supabase.functions.invoke('r2-delete-object', {
      body: { fileName: photo.storage_path }
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
      fetchPhotos(); // Refresh the current section's photos
    }
  };

  const getPhotoUrl = (path: string) => {
    const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
    return `${publicUrl}/${path}`;
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading photos...</p>
      </Card>
    );
  }

  // Filter out the current section for the move dropdown
  const otherSections = sections.filter(s => s.id !== sectionId);

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
                  {uploading ? `Uploading ${uploadFileIndex} of ${uploadTotal}…` : "Upload Photos"}
                </span>
              </Button>
            </label>
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
                    src={getPhotoUrl(photo.storage_path)}
                    alt={photo.caption || "Wedding photo"}
                    className="w-full h-auto object-cover"
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
                          onClick={() => window.open(getPhotoUrl(photo.storage_path), "_blank")}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
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
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
