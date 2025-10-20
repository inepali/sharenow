import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Download, Camera } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

interface Gallery {
  id: string;
  title: string;
  wedding_couple: string | null;
  wedding_date: string | null;
  description: string | null;
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
  const [loading, setLoading] = useState(true);
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
    } catch (error: any) {
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

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage
      .from("gallery-photos")
      .getPublicUrl(path);
    return data.publicUrl;
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

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero border-b">
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/80 mb-6 shadow-soft">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif mb-3">{gallery.title}</h1>
          {gallery.wedding_couple && (
            <p className="text-xl text-foreground/80 mb-2">{gallery.wedding_couple}</p>
          )}
          {gallery.wedding_date && (
            <p className="text-muted-foreground mb-4">
              {new Date(gallery.wedding_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          {gallery.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">{gallery.description}</p>
          )}
          <Button onClick={downloadGallery} variant="secondary" size="lg" className="mt-4">
            <Download className="w-4 h-4 mr-2" />
            Download Entire Gallery
          </Button>
        </div>
      </header>

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
            <TabsList className="w-full justify-start mb-8 flex-wrap h-auto">
              {sections.map((section) => (
                <TabsTrigger key={section.id} value={section.id} className="px-6">
                  {section.title}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {sections.map((section) => (
              <TabsContent key={section.id} value={section.id}>
                <h2 className="text-3xl font-serif mb-6 text-center">{section.title}</h2>
                
                {section.photos.length === 0 ? (
                  <Card className="p-8 text-center gradient-card">
                    <p className="text-muted-foreground">No photos in this section yet</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {section.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group aspect-square rounded-lg overflow-hidden shadow-soft hover:shadow-hover transition-smooth"
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
                              onClick={() => toggleFavorite(photo.id)}
                            >
                              <Heart
                                className={`w-4 h-4 mr-2 ${
                                  favorites.has(photo.id) ? "fill-primary text-primary" : ""
                                }`}
                              />
                              {favorites.has(photo.id) ? "Favorited" : "Favorite"}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => downloadImage(
                                getPhotoUrl(photo.storage_path),
                                photo.storage_path.split("/").pop() || `photo-${photo.id}.jpg`
                              )}
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
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default ClientGallery;
