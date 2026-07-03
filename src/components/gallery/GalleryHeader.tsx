import { getR2Url } from "@/lib/r2";
import logo from "@/assets/logo.png";
import type { Gallery } from "@/types";

interface GalleryHeaderProps {
  gallery: Gallery;
}

export const GalleryHeader = ({ gallery }: GalleryHeaderProps) => {
  const coverImageUrl = gallery.cover_image_path
    ? getR2Url(gallery.cover_image_path)
    : null;

  return (
    <header
      className={`border-b relative ${!coverImageUrl ? "gradient-hero text-foreground" : "text-white"}`}
      style={coverImageUrl ? {
        backgroundImage: `url(${coverImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : {}}
    >
      {coverImageUrl && <div className="absolute inset-0 bg-black/50 z-0"></div>}

      {/* Branding Logo - Top Left Corner */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
        <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-lg border border-white/20 shadow-sm">
          <img src={logo} alt="Share My Shoot Logo" className="w-8 h-8 object-contain" />
        </div>
      </div>

      <div className="container mx-auto px-4 pt-24 pb-12 text-center relative z-10">
        <h1 className="text-4xl md:text-5xl font-serif mb-3 drop-shadow-md">{gallery.title}</h1>
        {gallery.gallery_type && (
          <p className="text-xl opacity-90 mb-2 drop-shadow-md">{gallery.gallery_type}</p>
        )}
        {gallery.wedding_date && (
          <p className="text-white/80 mb-4 drop-shadow-md">
            {new Date(gallery.wedding_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
        {gallery.description && (
          <p className="text-white/80 max-w-2xl mx-auto mb-6 drop-shadow-md">{gallery.description}</p>
        )}
      </div>
    </header>
  );
};
