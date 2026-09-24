-- Album-level uploads (from the dashboard) attach photos to a section
-- without the user picking one first; is_default marks that section so
-- it can be found/created on demand instead of being named by convention.
ALTER TABLE public.sections ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX sections_one_default_per_gallery
  ON public.sections (gallery_id)
  WHERE is_default;
