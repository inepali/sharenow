import { Button } from "@/components/ui/button";
import { Heart, Download, Printer } from "lucide-react";
import { getR2Url } from "@/lib/r2";
import { getResponsiveUrls } from "@/lib/images";
import type { Photo } from "@/types";

interface PhotoCardProps {
  photo: Photo;
  isFavorited: boolean;
  isPrintSelected: boolean;
  onToggleFavorite: (photoId: string) => void;
  onTogglePrint: (photoId: string) => void;
  onDownload: (url: string, filename: string) => void;
  onClick: () => void;
}

export const PhotoCard = ({
  photo,
  isFavorited,
  isPrintSelected,
  onToggleFavorite,
  onTogglePrint,
  onDownload,
  onClick,
}: PhotoCardProps) => {
  const urls = getResponsiveUrls(photo.storage_path);
  const filename = photo.storage_path.split("/").pop() || `photo-${photo.id}.jpg`;

  return (
    <div
      className="relative group aspect-square rounded-sm overflow-hidden shadow-soft hover:shadow-hover transition-smooth cursor-pointer"
      onClick={onClick}
    >
      <img
        src={urls.medium}
        srcSet={`${urls.thumb} 300w, ${urls.medium} 1200w, ${urls.large} 2000w`}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        alt={photo.caption || "Gallery photo"}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-smooth">
        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(photo.id); }}
          >
            <Heart
              className={`w-4 h-4 mr-2 ${isFavorited ? "fill-primary text-primary" : ""}`}
            />
            {isFavorited ? "Favorited" : "Favorite"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={(e) => { e.stopPropagation(); onTogglePrint(photo.id); }}
          >
            <Printer
              className={`w-4 h-4 mr-2 ${isPrintSelected ? "fill-primary text-primary" : ""}`}
            />
            {isPrintSelected ? "Selected" : "Print"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(urls.original, filename);
            }}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
