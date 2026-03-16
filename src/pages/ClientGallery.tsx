import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Download, Camera, Printer, Lock, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import JSZip from "jszip";
import logo from "@/assets/logo.png";

interface Gallery {
  id: string;
  title: string;
  gallery_type: string | null;
  wedding_date: string | null;
  description: string | null;
  cover_image_path?: string | null;
  access_pin?: string | null;
}

interface Section {
  id: string;
  title: string;
  photos: Photo[];
}

interface Photo {
  id: string;
  storage_path: string;
  caption: string | null;
}

const ClientGallery = () => {
  const { slug } = useParams<{ slug: string }>();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [printSelection, setPrintSelection] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [previewPhotos, setPreviewPhotos] = useState<Photo[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [sessionId] = useState(() => {
    let id = localStorage.getItem("gallery-session-id");
    if (!id) {
      id = Date.now().toString(36) + Math.random().toString(36);
      localStorage.setItem("gallery-session-id", id);
    }
    return id;
  });

  useEffect(() => {
    if (slug) {
      fetchGallery();
    }
  }, [slug]);

  const openPreview = (photosList: Photo[], index: number) => {
    setPreviewPhotos(photosList);
    setPreviewIndex(index);
  };

  const closePreview = () => {
    setPreviewIndex(-1);
  };

  const nextPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewIndex((prev) => (prev < previewPhotos.length - 1 ? prev + 1 : 0));
  };

  const prevPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewIndex((prev) => (prev > 0 ? prev - 1 : previewPhotos.length - 1));
  };

  const fetchGallery = async () => {
    try {
      const { data: galleryData, error: galleryError } = await supabase
        .from("galleries")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (galleryError) throw galleryError;

      setGallery(galleryData);

      // Check if gallery is PIN protected
      if (galleryData.access_pin) {
        const storedPin = sessionStorage.getItem(`gallery_pin_${galleryData.id}`);
        if (storedPin === galleryData.access_pin) {
          setIsPinVerified(true);
        } else {
          setIsPinVerified(false);
        }
      } else {
        setIsPinVerified(true);
      }

      const { data: sectionsData, error: sectionsError } = await supabase
        .from("sections")
        .select(`
          id,
          title,
          display_order
        `)
        .eq("gallery_id", galleryData.id)
        .order("display_order", { ascending: true });

      if (sectionsError) throw sectionsError;

      const sectionsWithPhotos = await Promise.all(
        (sectionsData || []).map(async (section) => {
          const { data: photos } = await supabase
            .from("photos")
            .select("*")
            .eq("section_id", section.id)
            .order("display_order", { ascending: true });

          return {
            ...section,
            photos: photos || [],
          };
        })
      );

      setSections(sectionsWithPhotos);

      const { data: favoritesData } = await supabase
        .from("favorites")
        .select("photo_id")
        .eq("gallery_id", galleryData.id)
        .eq("session_id", sessionId);

      if (favoritesData) {
        setFavorites(new Set(favoritesData.map((f) => f.photo_id)));
      }
    } catch (error: unknown) {
      console.error("Error fetching gallery:", error);
      toast.error("Gallery not found");
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (photoId: string) => {
    if (!gallery) return;

    const isFavorited = favorites.has(photoId);

    if (isFavorited) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("gallery_id", gallery.id)
        .eq("photo_id", photoId)
        .eq("session_id", sessionId);

      if (!error) {
        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.delete(photoId);
          return newSet;
        });
      }
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({
          gallery_id: gallery.id,
          photo_id: photoId,
          session_id: sessionId,
        });

      if (!error) {
        setFavorites((prev) => new Set(prev).add(photoId));
      }
    }
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

  const getPhotoUrl = (path: string) => {
    const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
    return `${publicUrl}/${path}`;
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
    } catch (error) {
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

        for (const photo of section.photos) {
          const url = getPhotoUrl(photo.storage_path);
          const response = await fetch(url);
          const blob = await response.blob();
          const filename = photo.storage_path.split("/").pop() || `photo-${photo.id}.jpg`;
          sectionFolder?.file(filename, blob);
        }
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
    } catch (error) {
      toast.error("Failed to download gallery");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading gallery...</p>
        </div>
      </div>
    );
  }

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gallery?.access_pin && pinInput === gallery.access_pin) {
      sessionStorage.setItem(`gallery_pin_${gallery.id}`, pinInput);
      setIsPinVerified(true);
      toast.success("Access granted");
    } else {
      toast.error("Incorrect PIN");
      setPinInput("");
    }
  };

  if (!gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="text-center">
          <h1 className="text-4xl font-serif mb-2">Gallery Not Found</h1>
          <p className="text-muted-foreground">This gallery may have been removed or is no longer active.</p>
        </div>
      </div>
    );
  }

  const coverImageUrl = gallery?.cover_image_path
    ? `${import.meta.env.VITE_R2_PUBLIC_URL}/${gallery.cover_image_path}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header
        className={`border-b relative ${!coverImageUrl ? "gradient-hero" : ""}`}
        style={coverImageUrl ? {
          backgroundImage: `url(${coverImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}}
      >
        {coverImageUrl && <div className="absolute inset-0 bg-black/50 z-0"></div>}
        <div className="container mx-auto px-4 py-12 text-center relative z-10 text-white">
          <div className="mb-6 bg-white/10 backdrop-blur-md p-4 rounded-full inline-block">
            <img src={logo} alt="Share My Shoot Logo" className="w-24 h-24 mx-auto mix-blend-screen mix-blend-darken dark:mix-blend-lighten" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif mb-3 drop-shadow-md">{gallery.title}</h1>
          {gallery.gallery_type && (
            <p className="text-xl text-white/90 mb-2 drop-shadow-md">{gallery.gallery_type}</p>
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

      {!isPinVerified ? (
        <main className="container mx-auto px-4 py-24 flex items-center justify-center">
          <Card className="p-8 max-w-md w-full text-center gradient-card shadow-lg">
            <Lock className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-serif mb-2">Private Gallery</h2>
            <p className="text-muted-foreground mb-8">
              Please enter the 4-digit PIN provided by your photographer to view these photos.
            </p>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter 4-digit PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-center text-xl tracking-widest h-14"
                maxLength={4}
                required
              />
              <Button type="submit" className="w-full h-12 text-lg">
                Unlock Gallery
              </Button>
            </form>
          </Card>
        </main>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {section.photos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className="relative group aspect-square rounded-sm overflow-hidden shadow-soft hover:shadow-hover transition-smooth cursor-pointer"
                          onClick={() => openPreview(section.photos, index)}
                        >
                          <img
                            src={getPhotoUrl(photo.storage_path)}
                            alt={photo.caption || "Wedding photo"}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-smooth">
                            <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="flex-1"
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }}
                              >
                                <Heart
                                  className={`w-4 h-4 mr-2 ${favorites.has(photo.id) ? "fill-primary text-primary" : ""
                                    }`}
                                />
                                {favorites.has(photo.id) ? "Favorited" : "Favorite"}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="flex-1"
                                onClick={(e) => { e.stopPropagation(); togglePrintSelection(photo.id); }}
                              >
                                <Printer
                                  className={`w-4 h-4 mr-2 ${printSelection.has(photo.id) ? "fill-primary text-primary" : ""
                                    }`}
                                />
                                {printSelection.has(photo.id) ? "Selected" : "Print"}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImage(
                                    getPhotoUrl(photo.storage_path),
                                    photo.storage_path.split("/").pop() || `photo-${photo.id}.jpg`
                                  );
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}

              <TabsContent value="favorites">
                <h2 className="text-3xl font-serif mb-6 text-center">My Favorites</h2>
                {favorites.size === 0 ? (
                  <Card className="p-12 text-center gradient-card">
                    <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-2xl font-serif mb-2">No Favorites Yet</h3>
                    <p className="text-muted-foreground">
                      Click the heart icon on photos to add them to your favorites
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {(() => {
                      const displayPhotos = sections.flatMap((s) => s.photos).filter((p) => favorites.has(p.id));
                      return displayPhotos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className="relative group aspect-square rounded-sm overflow-hidden shadow-soft hover:shadow-hover transition-smooth cursor-pointer"
                          onClick={() => openPreview(displayPhotos, index)}
                        >
                          <img
                            src={getPhotoUrl(photo.storage_path)}
                            alt={photo.caption || "Wedding photo"}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-smooth">
                            <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="flex-1"
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }}
                              >
                                <Heart className="w-4 h-4 mr-2 fill-primary text-primary" />
                                Favorited
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="flex-1"
                                onClick={(e) => { e.stopPropagation(); togglePrintSelection(photo.id); }}
                              >
                                <Printer
                                  className={`w-4 h-4 mr-2 ${printSelection.has(photo.id) ? "fill-primary text-primary" : ""
                                    }`}
                                />
                                {printSelection.has(photo.id) ? "Selected" : "Print"}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImage(
                                    getPhotoUrl(photo.storage_path),
                                    photo.storage_path.split("/").pop() || `photo-${photo.id}.jpg`
                                  );
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="print">
                <h2 className="text-3xl font-serif mb-6 text-center">Print Selection</h2>
                {printSelection.size === 0 ? (
                  <Card className="p-12 text-center gradient-card">
                    <Printer className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-2xl font-serif mb-2">No Photos Selected</h3>
                    <p className="text-muted-foreground">
                      Click the print icon on photos to select them for printing
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {(() => {
                      const displayPhotos = sections.flatMap((s) => s.photos).filter((p) => printSelection.has(p.id));
                      return displayPhotos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className="relative group aspect-square rounded-sm overflow-hidden shadow-soft hover:shadow-hover transition-smooth cursor-pointer"
                          onClick={() => openPreview(displayPhotos, index)}
                        >
                          <img
                            src={getPhotoUrl(photo.storage_path)}
                            alt={photo.caption || "Wedding photo"}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-smooth">
                            <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="flex-1"
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }}
                              >
                                <Heart
                                  className={`w-4 h-4 mr-2 ${favorites.has(photo.id) ? "fill-primary text-primary" : ""
                                    }`}
                                />
                                {favorites.has(photo.id) ? "Favorited" : "Favorite"}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="flex-1"
                                onClick={(e) => { e.stopPropagation(); togglePrintSelection(photo.id); }}
                              >
                                <Printer className="w-4 h-4 mr-2 fill-primary text-primary" />
                                Selected
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImage(
                                    getPhotoUrl(photo.storage_path),
                                    photo.storage_path.split("/").pop() || `photo-${photo.id}.jpg`
                                  );
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </main>
      )}

      {previewIndex >= 0 && previewPhotos[previewIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm" onClick={closePreview}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={closePreview}
          >
            <X className="w-6 h-6" />
          </Button>

          {previewPhotos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 text-white hover:bg-white/20 h-12 w-12 rounded-full"
              onClick={prevPreview}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}

          <img
            src={getPhotoUrl(previewPhotos[previewIndex].storage_path)}
            alt={previewPhotos[previewIndex].caption || "Preview"}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {previewPhotos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 text-white hover:bg-white/20 h-12 w-12 rounded-full"
              onClick={nextPreview}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientGallery;
