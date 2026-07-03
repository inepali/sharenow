import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Gallery, Photo, SectionWithPhotos } from "@/types";

interface ClientGalleryData {
  gallery: Gallery;
  sections: SectionWithPhotos[];
}

/**
 * Fetches gallery data with sections and photos in an optimized way.
 * Fixes the N+1 query problem by fetching all photos in a single query.
 */
async function fetchClientGallery(slug: string): Promise<ClientGalleryData> {
  // 1. Fetch gallery
  const { data: galleryData, error: galleryError } = await supabase
    .from("galleries")
    .select("id, title, gallery_type, wedding_date, description, cover_image_path, slug, is_active, created_at, access_pin")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (galleryError) throw galleryError;

  // 2. Fetch all sections for the gallery
  const { data: sectionsData, error: sectionsError } = await supabase
    .from("sections")
    .select("id, title, display_order")
    .eq("gallery_id", galleryData.id)
    .order("display_order", { ascending: true });

  if (sectionsError) throw sectionsError;

  const sections = sectionsData || [];

  if (sections.length === 0) {
    return {
      gallery: galleryData as Gallery,
      sections: [],
    };
  }

  // 3. Fetch ALL photos for all sections in ONE query (fixes N+1)
  const sectionIds = sections.map(s => s.id);
  const { data: allPhotos, error: photosError } = await supabase
    .from("photos")
    .select("*")
    .in("section_id", sectionIds)
    .order("display_order", { ascending: true });

  if (photosError) throw photosError;

  // 4. Group photos by section
  const photosBySection = new Map<string, Photo[]>();
  for (const photo of (allPhotos || [])) {
    const existing = photosBySection.get(photo.section_id) || [];
    existing.push(photo);
    photosBySection.set(photo.section_id, existing);
  }

  const sectionsWithPhotos: SectionWithPhotos[] = sections.map(section => ({
    ...section,
    photos: photosBySection.get(section.id) || [],
  }));

  return {
    gallery: galleryData as Gallery,
    sections: sectionsWithPhotos,
  };
}

export function useClientGallery(slug: string | undefined) {
  return useQuery({
    queryKey: ["clientGallery", slug],
    queryFn: () => fetchClientGallery(slug!),
    enabled: !!slug,
  });
}

export function useFavorites(galleryId: string | undefined, sessionId: string) {
  return useQuery({
    queryKey: ["favorites", galleryId, sessionId],
    queryFn: async () => {
      if (!galleryId) return new Set<string>();
      const { data } = await supabase
        .from("favorites")
        .select("photo_id")
        .eq("gallery_id", galleryId)
        .eq("session_id", sessionId);

      return new Set((data || []).map(f => f.photo_id));
    },
    enabled: !!galleryId,
  });
}
