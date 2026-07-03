import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Download, Camera, Printer } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { useClientGallery, useFavorites } from "@/hooks/use-gallery-data";
import { useQueryClient } from "@tanstack/react-query";
import { getR2Url, downloadConcurrent } from "@/lib/r2";
import { GalleryHeader } from "@/components/gallery/GalleryHeader";
import { PinGate } from "@/components/gallery/PinGate";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { LightboxModal } from "@/components/gallery/LightboxModal";
import type { Photo } from "@/types";

const ClientGallery = () => {
  const { slug } = useParams<{ slug: string }>();
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [printSelection, setPrintSelection] = useState<Set<string>>(new Set());
  const [previewPhotos, setPreviewPhotos] = useState<Photo[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const queryClient = useQueryClient();

  const [sessionId] = useState(() => {
    let id = localStorage.getItem("gallery-session-id");
    if (!id) {
      id = Date.now().toString(36) + Math.random().toString(36);
      localStorage.setItem("gallery-session-id", id);
    }
    return id;
  });

  const { data, isLoading, error } = useClientGallery(slug);
  const gallery = data?.gallery ?? null;
  const sections = data?.sections ?? [];

  const { data: favorites = new Set<string>() } = useFavorites(gallery?.id, sessionId);

  // Check stored PIN on gallery load
  const pinVerified = useMemo(() => {
    if (!gallery) return false;
    if (!gallery.access_pin) return true;
    const storedPin = sessionStorage.getItem(`gallery_pin_${gallery.id}`);
    return storedPin === gallery.access_pin || isPinVerified;
  }, [gallery, isPinVerified]);

  const toggleFavorite = async (photoId: string) => {
    if (!gallery) return;
    const isFavorited = favorites.has(photoId);

    if (isFavorited) {
      await supabase
        .from("favorites")
        .delete()
        .eq("gallery_id", gallery.id)
        .eq("photo_id", photoId)
        .eq("session_id", sessionId);
    } else {
      await supabase
        .from("favorites")
        .insert({ gallery_id: gallery.id, photo_id: photoId, session_id: sessionId });
    }
    queryClient.invalidateQueries({ queryKey: ["favorites", gallery.id, sessionId] });
  };

  const togglePrintSelection = (photoId: string) => {
    setPrintSelection((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Image downloaded successfully");
    } catch {
      toast.error("Failed to download image");
    }
  };

  const downloadGallery = async () => {
    if (!gallery || sections.length === 0) return;
    toast.info("Preparing gallery download...");

    try {
      const zip = new JSZip();
      for (const section of sections) {
        const sectionFolder = zip.folder(section.title);
        const urls = section.photos.map(p => getR2Url(p.storage_path));
        const blobs = await downloadConcurrent(urls, 5, (completed, total) => {
          if (completed % 10 === 0 || completed === total) {
            toast.info(`Downloading: ${completed}/${total} photos...`);
          }
        });
        section.photos.forEach((photo, i) => {
          const blob = blobs[i];
          if (blob) {
            const filename = photo.storage_path.split("/").pop() || `photo-${photo.id}.jpg`;
            sectionFolder?.file(filename, blob);
          }
        });
      }

      const content = await zip.generateAsync({ type: "blob" });
      const blobUrl = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${slug}-gallery.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Gallery downloaded successfully");
    } catch {
      toast.error("Failed to download gallery");
    }
  };

  const openPreview = (photosList: Photo[], index: number) => {
    setPreviewPhotos(photosList);
    setPreviewIndex(index);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="text-center">
          <h1 className="text-4xl font-serif mb-2">Gallery Not Found</h1>
          <p className="text-muted-foreground">This gallery may have been removed or is no longer active.</p>
        </div>
      </div>
    );
  }

  const renderPhotoGrid = (photos: Photo[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
      {photos.map((photo, index) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          isFavorited={favorites.has(photo.id)}
          isPrintSelected={printSelection.has(photo.id)}
          onToggleFavorite={toggleFavorite}
          onTogglePrint={togglePrintSelection}
          onDownload={downloadImage}
          onClick={() => openPreview(photos, index)}
        />
      ))}
    </div>
  );

  const favoritePhotos = sections.flatMap(s => s.photos).filter(p => favorites.has(p.id));
  const printPhotos = sections.flatMap(s => s.photos).filter(p => printSelection.has(p.id));

  return (
    <div className="min-h-screen bg-background">
      <GalleryHeader gallery={gallery} />

      {!pinVerified ? (
        <PinGate
          galleryId={gallery.id}
          accessPin={gallery.access_pin!}
          onVerified={() => setIsPinVerified(true)}
        />
      ) : (
        <main className="container mx-auto px-4 py-12">
          {sections.length === 0 ? (
            <Card className="p-12 text-center gradient-card">
              <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-2xl font-serif mb-2">Gallery Coming Soon</h3>
              <p className="text-muted-foreground">
                Photos will be added to this gallery shortly. Check back soon!
              </p>
            </Card>
          ) : (
            <Tabs defaultValue={sections[0]?.id} className="w-full">
              <TabsList className="w-full justify-start mb-8 flex-wrap h-auto bg-transparent p-0 gap-6 border-b pb-4">
                <div className="flex flex-wrap gap-6 mr-auto">
                  {sections.map((section) => (
                    <TabsTrigger
                      key={section.id}
                      value={section.id}
                      className="px-0 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none text-base"
                    >
                      {section.title}
                    </TabsTrigger>
                  ))}
                </div>
                <div className="flex gap-6 items-center">
                  <TabsTrigger
                    value="favorites"
                    className="px-0 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none text-base flex items-center gap-2"
                  >
                    <Heart className="w-4 h-4" />
                    Favorites ({favorites.size})
                  </TabsTrigger>
                  <TabsTrigger
                    value="print"
                    className="px-0 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none text-base flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print ({printSelection.size})
                  </TabsTrigger>
                  <Button onClick={downloadGallery} variant="secondary" size="sm" className="ml-2">
                    <Download className="w-4 h-4 mr-2" />
                    Download Gallery
                  </Button>
                </div>
              </TabsList>

              {sections.map((section) => (
                <TabsContent key={section.id} value={section.id}>
                  <h2 className="text-3xl font-serif mb-6 text-center">{section.title}</h2>
                  {section.photos.length === 0 ? (
                    <Card className="p-8 text-center gradient-card">
                      <p className="text-muted-foreground">No photos in this section yet</p>
                    </Card>
                  ) : (
                    renderPhotoGrid(section.photos)
                  )}
                </TabsContent>
              ))}

              <TabsContent value="favorites">
                <h2 className="text-3xl font-serif mb-6 text-center">My Favorites</h2>
                {favoritePhotos.length === 0 ? (
                  <Card className="p-12 text-center gradient-card">
                    <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-2xl font-serif mb-2">No Favorites Yet</h3>
                    <p className="text-muted-foreground">Click the heart icon on photos to add them to your favorites</p>
                  </Card>
                ) : renderPhotoGrid(favoritePhotos)}
              </TabsContent>

              <TabsContent value="print">
                <h2 className="text-3xl font-serif mb-6 text-center">Print Selection</h2>
                {printPhotos.length === 0 ? (
                  <Card className="p-12 text-center gradient-card">
                    <Printer className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-2xl font-serif mb-2">No Photos Selected</h3>
                    <p className="text-muted-foreground">Click the print icon on photos to select them for printing</p>
                  </Card>
                ) : renderPhotoGrid(printPhotos)}
              </TabsContent>
            </Tabs>
          )}
        </main>
      )}

      {previewIndex >= 0 && previewPhotos[previewIndex] && (
        <LightboxModal
          photos={previewPhotos}
          currentIndex={previewIndex}
          onClose={() => setPreviewIndex(-1)}
          onNavigate={setPreviewIndex}
        />
      )}
    </div>
  );
};

export default ClientGallery;
