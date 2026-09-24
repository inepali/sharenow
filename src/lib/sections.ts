import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SECTION_TITLE = "All Photos";

// Album-level uploads (e.g. from the dashboard) need a section to attach
// photos to before the user has organized anything. Finds or creates the
// one section per gallery flagged is_default for that purpose.
export async function getOrCreateDefaultSection(galleryId: string): Promise<string> {
  const { data: existing, error: fetchError } = await supabase
    .from("sections")
    .select("id")
    .eq("gallery_id", galleryId)
    .eq("is_default", true)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (existing) {
    return existing.id;
  }

  const { data: lastSection } = await supabase
    .from("sections")
    .select("display_order")
    .eq("gallery_id", galleryId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (lastSection?.display_order ?? -1) + 1;

  const { data: created, error: insertError } = await supabase
    .from("sections")
    .insert({
      gallery_id: galleryId,
      title: DEFAULT_SECTION_TITLE,
      display_order: nextOrder,
      is_default: true,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    throw new Error(insertError?.message || "Failed to create default section");
  }
  return created.id;
}
