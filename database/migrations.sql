-- Production Database Setup
-- This file contains all necessary migrations for production

-- ============================================================================
-- 1. CREATE TABLES WITH PROPER CONSTRAINTS
-- ============================================================================

-- Galleries Table
CREATE TABLE IF NOT EXISTS galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(title) > 0 AND length(title) <= 255),
  description TEXT CHECK (length(description) <= 2000),
  wedding_date DATE,
  cover_image_path TEXT,
  access_pin TEXT CHECK (length(access_pin) <= 10),
  is_active BOOLEAN DEFAULT true,
  gallery_type TEXT CHECK (gallery_type IN ('wedding', 'engagement', 'portrait', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint on slug per vendor
  UNIQUE(vendor_id, slug)
);

-- Sections Table
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) > 0 AND length(title) <= 255),
  description TEXT CHECK (length(description) <= 1000),
  display_order INTEGER DEFAULT 0 CHECK (display_order >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Photos Table
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL CHECK (length(storage_path) > 0),
  thumbnail_path TEXT,
  caption TEXT CHECK (length(caption) <= 500),
  display_order INTEGER DEFAULT 0 CHECK (display_order >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Print Orders Table
CREATE TABLE IF NOT EXISTS print_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL CHECK (length(customer_name) > 0),
  customer_email TEXT NOT NULL CHECK (customer_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  partner_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  revenue_breakdown JSONB,
  partner_order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL CHECK (length(session_id) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint to prevent duplicate favorites
  UNIQUE(gallery_id, photo_id, session_id)
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_galleries_vendor_id ON galleries(vendor_id);
CREATE INDEX IF NOT EXISTS idx_galleries_slug ON galleries(slug);
CREATE INDEX IF NOT EXISTS idx_galleries_created_at ON galleries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sections_gallery_id ON sections(gallery_id);
CREATE INDEX IF NOT EXISTS idx_sections_display_order ON sections(gallery_id, display_order);

CREATE INDEX IF NOT EXISTS idx_photos_section_id ON photos(section_id);
CREATE INDEX IF NOT EXISTS idx_photos_display_order ON photos(section_id, display_order);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_print_orders_gallery_id ON print_orders(gallery_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_customer_email ON print_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_print_orders_created_at ON print_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_favorites_session_id ON favorites(session_id);
CREATE INDEX IF NOT EXISTS idx_favorites_gallery_id ON favorites(gallery_id);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Galleries: Users see their own galleries
CREATE POLICY "galleries_users_own" ON galleries
  FOR SELECT
  USING (vendor_id = auth.uid());

CREATE POLICY "galleries_users_insert" ON galleries
  FOR INSERT
  WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "galleries_users_update" ON galleries
  FOR UPDATE
  USING (vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "galleries_users_delete" ON galleries
  FOR DELETE
  USING (vendor_id = auth.uid());

-- Sections: Users see sections of galleries they own
CREATE POLICY "sections_users_see" ON sections
  FOR SELECT
  USING (
    gallery_id IN (
      SELECT id FROM galleries WHERE vendor_id = auth.uid()
    )
  );

CREATE POLICY "sections_users_manage" ON sections
  FOR INSERT
  WITH CHECK (
    gallery_id IN (
      SELECT id FROM galleries WHERE vendor_id = auth.uid()
    )
  );

CREATE POLICY "sections_users_update" ON sections
  FOR UPDATE
  USING (
    gallery_id IN (
      SELECT id FROM galleries WHERE vendor_id = auth.uid()
    )
  );

-- Photos: Users see photos in galleries they own
CREATE POLICY "photos_users_see" ON photos
  FOR SELECT
  USING (
    section_id IN (
      SELECT s.id FROM sections s
      JOIN galleries g ON s.gallery_id = g.id
      WHERE g.vendor_id = auth.uid()
    )
  );

-- Print Orders: Users see their own orders
CREATE POLICY "orders_users_own" ON print_orders
  FOR SELECT
  USING (
    gallery_id IS NULL OR gallery_id IN (
      SELECT id FROM galleries WHERE vendor_id = auth.uid()
    )
  );

-- Favorites: Public read access, session-specific write
CREATE POLICY "favorites_public_read" ON favorites
  FOR SELECT USING (true);

CREATE POLICY "favorites_session_write" ON favorites
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 5. CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_galleries_updated_at
  BEFORE UPDATE ON galleries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_sections_updated_at
  BEFORE UPDATE ON sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_photos_updated_at
  BEFORE UPDATE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_print_orders_updated_at
  BEFORE UPDATE ON print_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant authenticated users access to tables
GRANT SELECT ON galleries TO authenticated;
GRANT INSERT ON galleries TO authenticated;
GRANT UPDATE ON galleries TO authenticated;
GRANT DELETE ON galleries TO authenticated;

GRANT SELECT ON sections TO authenticated;
GRANT INSERT ON sections TO authenticated;
GRANT UPDATE ON sections TO authenticated;
GRANT DELETE ON sections TO authenticated;

GRANT SELECT ON photos TO authenticated;
GRANT INSERT ON photos TO authenticated;
GRANT UPDATE ON photos TO authenticated;
GRANT DELETE ON photos TO authenticated;

GRANT SELECT ON print_orders TO authenticated;
GRANT INSERT ON print_orders TO authenticated;

GRANT SELECT ON favorites TO anon;
GRANT INSERT ON favorites TO anon;

-- ============================================================================
-- 7. VALIDATION CHECKS
-- ============================================================================

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('galleries', 'sections', 'photos', 'print_orders', 'favorites');

-- Verify indexes exist
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('galleries', 'sections', 'photos', 'print_orders', 'favorites');

-- ============================================================================
-- 8. INITIAL DATA (OPTIONAL)
-- ============================================================================

-- Create a test gallery for development (remove in production)
-- INSERT INTO galleries (vendor_id, slug, title, is_active)
-- VALUES (auth.uid(), 'test-gallery', 'Test Gallery', true);
