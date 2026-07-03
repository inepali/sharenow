import { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { getR2Url } from "@/lib/r2";
import { getResponsiveUrls } from "@/lib/images";
import type { Photo } from "@/types";

interface LightboxModalProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export const LightboxModal = ({
  photos,
  currentIndex,
  onClose,
  onNavigate,
}: LightboxModalProps) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        onClose();
        break;
      case "ArrowLeft":
        onNavigate(currentIndex > 0 ? currentIndex - 1 : photos.length - 1);
        break;
      case "ArrowRight":
        onNavigate(currentIndex < photos.length - 1 ? currentIndex + 1 : 0);
        break;
    }
  }, [currentIndex, photos.length, onClose, onNavigate]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const photo = photos[currentIndex];
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {photos.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 text-white hover:bg-white/20 h-12 w-12 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex > 0 ? currentIndex - 1 : photos.length - 1);
          }}
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      )}

      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={getResponsiveUrls(photo.storage_path).large}
          alt={photo.caption || "Preview"}
          className="max-h-[90vh] max-w-[90vw] object-contain"
        />
      </div>

      {photos.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 text-white hover:bg-white/20 h-12 w-12 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex < photos.length - 1 ? currentIndex + 1 : 0);
          }}
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      )}

      <div className="absolute bottom-4 text-white/60 text-sm">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
};
