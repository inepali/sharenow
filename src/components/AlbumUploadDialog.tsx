import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getOrCreateDefaultSection } from "@/lib/sections";
import { PhotoUploader } from "./PhotoUploader";
import type { Gallery } from "@/types";

interface AlbumUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gallery: Gallery;
}

export const AlbumUploadDialog = ({ open, onOpenChange, gallery }: AlbumUploadDialogProps) => {
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getOrCreateDefaultSection(gallery.id)
      .then(setSectionId)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Failed to prepare album for upload";
        toast.error(message);
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gallery.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[50vw] !max-w-[50vw] h-[50vh] max-h-[50vh] min-w-[320px] min-h-[300px] flex flex-col bg-card/95 backdrop-blur-md border border-border">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl font-serif">Upload Photos — {gallery.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {loading || !sectionId ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <PhotoUploader sectionId={sectionId} galleryId={gallery.id} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
