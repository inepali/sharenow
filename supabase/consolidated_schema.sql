-- ============================================================================
-- SHARENOW CONSOLIDATED SUPABASE SCHEMA
-- Use this script in the Supabase SQL Editor to re-create all database objects.
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. DROP EXISTING TRIGGERS & FUNCTIONS (FOR IDEMPOTENCY)
-- ============================================================================

DO $$
BEGIN
  -- Drop trigger on auth.users if it exists (auth.users always exists in Supabase)
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

  -- Drop other triggers only if their respective tables exist
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'galleries') THEN
    DROP TRIGGER IF EXISTS update_galleries_updated_at ON public.galleries;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'print_products') THEN
    DROP TRIGGER IF EXISTS update_print_products_updated_at ON public.print_products;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_variants') THEN
    DROP TRIGGER IF EXISTS update_product_variants_updated_at ON public.product_variants;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'print_partner_products') THEN
    DROP TRIGGER IF EXISTS update_print_partner_products_updated_at ON public.print_partner_products;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'print_orders') THEN
    DROP TRIGGER IF EXISTS update_print_orders_updated_at ON public.print_orders;
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- ============================================================================
-- 2. CREATE FUNCTION: TIMESTAMP UPDATES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================================
-- 3. CREATE TABLES WITH PROPER SCHEMAS & CONSTRAINTS
-- ============================================================================

-- 3.1 Profiles Table (Vendor Information)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3.2 Galleries Table
CREATE TABLE IF NOT EXISTS public.galleries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  gallery_type TEXT,
  wedding_date DATE,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  access_pin TEXT CHECK (length(access_pin) <= 10),
  cover_image_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3.3 Sections Table
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3.4 Photos Table
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  caption TEXT,
  file_size BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3.5 Favorites Table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gallery_id, photo_id, session_id)
);

-- 3.6 Print Products Table
CREATE TABLE IF NOT EXISTS public.print_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- e.g., 'print', 'canvas', 'album', 'frame'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3.7 Print Partner Products Table
CREATE TABLE IF NOT EXISTS public.print_partner_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT NOT NULL DEFAULT 'whcc',
  partner_product_uid TEXT NOT NULL,
  partner_sku TEXT,
  product_name TEXT NOT NULL,
  category TEXT,
  base_price DECIMAL NOT NULL,
  product_metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(partner_name, partner_product_uid)
);

-- 3.8 Product Variants Table (Pricing & Sizes)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.print_products(id) ON DELETE CASCADE,
  size_name TEXT NOT NULL, -- e.g., "4x6", "8x10", "16x20"
  dimensions TEXT, -- e.g., "4 x 6 inches"
  price DECIMAL(10,2) NOT NULL,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  partner_product_id UUID REFERENCES public.print_partner_products(id),
  partner_product_uid TEXT,
  wholesale_cost DECIMAL,
  platform_margin_percent DECIMAL DEFAULT 20,
  photographer_margin_percent DECIMAL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3.9 Print Orders Table
CREATE TABLE IF NOT EXISTS public.print_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  gallery_id UUID REFERENCES public.galleries(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL NOT NULL,
  shipping_cost DECIMAL NOT NULL,
  tax DECIMAL DEFAULT 0,
  total_amount DECIMAL NOT NULL,
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL DEFAULT 'whcc',
  partner_order_id TEXT,
  status TEXT DEFAULT 'pending',
  tracking_number TEXT,
  tracking_url TEXT,
  revenue_breakdown JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. CREATE DATABASE TRIGGERS
-- ============================================================================

-- Triggers for automatic updated_at timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_galleries_updated_at
  BEFORE UPDATE ON public.galleries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_print_products_updated_at
  BEFORE UPDATE ON public.print_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_print_partner_products_updated_at
  BEFORE UPDATE ON public.print_partner_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_print_orders_updated_at
  BEFORE UPDATE ON public.print_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 5. CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_galleries_vendor_id ON public.galleries(vendor_id);
CREATE INDEX IF NOT EXISTS idx_galleries_slug ON public.galleries(slug);
CREATE INDEX IF NOT EXISTS idx_galleries_created_at ON public.galleries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sections_gallery_id ON public.sections(gallery_id);
CREATE INDEX IF NOT EXISTS idx_sections_display_order ON public.sections(gallery_id, display_order);

CREATE INDEX IF NOT EXISTS idx_photos_section_id ON public.photos(section_id);
CREATE INDEX IF NOT EXISTS idx_photos_display_order ON public.photos(section_id, display_order);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON public.photos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_favorites_session_id ON public.favorites(session_id);
CREATE INDEX IF NOT EXISTS idx_favorites_gallery_id ON public.favorites(gallery_id);

CREATE INDEX IF NOT EXISTS idx_print_products_vendor_id ON public.print_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);

CREATE INDEX IF NOT EXISTS idx_print_orders_vendor_id ON public.print_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_gallery_id ON public.print_orders(gallery_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_created_at ON public.print_orders(created_at DESC);

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_partner_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- 7.1 Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = user_id);

-- 7.2 Galleries Policies
DROP POLICY IF EXISTS "Vendors can view their own galleries" ON public.galleries;
CREATE POLICY "Vendors can view their own galleries" 
  ON public.galleries FOR SELECT 
  USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "Vendors can create galleries" ON public.galleries;
CREATE POLICY "Vendors can create galleries" 
  ON public.galleries FOR INSERT 
  WITH CHECK (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "Vendors can update their own galleries" ON public.galleries;
CREATE POLICY "Vendors can update their own galleries" 
  ON public.galleries FOR UPDATE 
  USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "Vendors can delete their own galleries" ON public.galleries;
CREATE POLICY "Vendors can delete their own galleries" 
  ON public.galleries FOR DELETE 
  USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "Anyone can view active galleries by slug" ON public.galleries;
CREATE POLICY "Anyone can view active galleries by slug" 
  ON public.galleries FOR SELECT 
  USING (is_active = true);

-- 7.3 Sections Policies
DROP POLICY IF EXISTS "Vendors can manage sections in their galleries" ON public.sections;
CREATE POLICY "Vendors can manage sections in their galleries" 
  ON public.sections FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries 
      WHERE galleries.id = sections.gallery_id 
      AND galleries.vendor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view sections in active galleries" ON public.sections;
CREATE POLICY "Anyone can view sections in active galleries" 
  ON public.sections FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries 
      WHERE galleries.id = sections.gallery_id 
      AND galleries.is_active = true
    )
  );

-- 7.4 Photos Policies
DROP POLICY IF EXISTS "Vendors can manage photos in their galleries" ON public.photos;
CREATE POLICY "Vendors can manage photos in their galleries" 
  ON public.photos FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.sections 
      JOIN public.galleries ON galleries.id = sections.gallery_id 
      WHERE sections.id = photos.section_id 
      AND galleries.vendor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view photos in active galleries" ON public.photos;
CREATE POLICY "Anyone can view photos in active galleries" 
  ON public.photos FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.sections 
      JOIN public.galleries ON galleries.id = sections.gallery_id 
      WHERE sections.id = photos.section_id 
      AND galleries.is_active = true
    )
  );

-- 7.5 Favorites Policies
DROP POLICY IF EXISTS "Anyone can view favorites" ON public.favorites;
CREATE POLICY "Anyone can view favorites" 
  ON public.favorites FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Anyone can create favorites" ON public.favorites;
CREATE POLICY "Anyone can create favorites" 
  ON public.favorites FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
CREATE POLICY "Users can delete their own favorites" 
  ON public.favorites FOR DELETE 
  USING (true);

-- 7.6 Print Products Policies
DROP POLICY IF EXISTS "Vendors can view their own products" ON public.print_products;
CREATE POLICY "Vendors can view their own products"
  ON public.print_products FOR SELECT
  USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "Vendors can create their own products" ON public.print_products;
CREATE POLICY "Vendors can create their own products"
  ON public.print_products FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "Vendors can update their own products" ON public.print_products;
CREATE POLICY "Vendors can update their own products"
  ON public.print_products FOR UPDATE
  USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "Vendors can delete their own products" ON public.print_products;
CREATE POLICY "Vendors can delete their own products"
  ON public.print_products FOR DELETE
  USING (auth.uid() = vendor_id);

-- 7.7 Print Partner Products Policies
DROP POLICY IF EXISTS "Anyone can view active partner products" ON public.print_partner_products;
CREATE POLICY "Anyone can view active partner products"
  ON public.print_partner_products FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Vendors can view all partner products" ON public.print_partner_products;
CREATE POLICY "Vendors can view all partner products"
  ON public.print_partner_products FOR SELECT
  TO authenticated
  USING (true);

-- 7.8 Product Variants Policies
DROP POLICY IF EXISTS "Vendors can view variants of their products" ON public.product_variants;
CREATE POLICY "Vendors can view variants of their products"
  ON public.product_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.print_products
      WHERE print_products.id = product_variants.product_id
      AND print_products.vendor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Vendors can create variants for their products" ON public.product_variants;
CREATE POLICY "Vendors can create variants for their products"
  ON public.product_variants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.print_products
      WHERE print_products.id = product_variants.product_id
      AND print_products.vendor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Vendors can update variants of their products" ON public.product_variants;
CREATE POLICY "Vendors can update variants of their products"
  ON public.product_variants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.print_products
      WHERE print_products.id = product_variants.product_id
      AND print_products.vendor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Vendors can delete variants of their products" ON public.product_variants;
CREATE POLICY "Vendors can delete variants of their products"
  ON public.product_variants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.print_products
      WHERE print_products.id = product_variants.product_id
      AND print_products.vendor_id = auth.uid()
    )
  );

-- 7.9 Print Orders Policies
DROP POLICY IF EXISTS "Vendors can view their print orders" ON public.print_orders;
CREATE POLICY "Vendors can view their print orders"
  ON public.print_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "Vendors can create print orders" ON public.print_orders;
CREATE POLICY "Vendors can create print orders"
  ON public.print_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "System can update print orders" ON public.print_orders;
CREATE POLICY "System can update print orders"
  ON public.print_orders FOR UPDATE
  USING (true);

-- ============================================================================
-- 8. STORAGE BUCKET & SECURITY POLICIES
-- ============================================================================

-- Create the bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-photos', 'gallery-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies for clean creation
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Gallery owners can update their photos" ON storage.objects;
DROP POLICY IF EXISTS "Gallery owners can delete their photos" ON storage.objects;

-- Create Storage Policies

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gallery-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-photos');

CREATE POLICY "Gallery owners can update their photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'gallery-photos'
  AND auth.uid() IN (
    SELECT g.vendor_id 
    FROM public.galleries g
    JOIN public.photos p ON p.section_id IN (
      SELECT s.id FROM public.sections s WHERE s.gallery_id = g.id
    )
    WHERE p.storage_path = name
  )
);

CREATE POLICY "Gallery owners can delete their photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gallery-photos'
  AND auth.uid() IN (
    SELECT g.vendor_id 
    FROM public.galleries g
    JOIN public.photos p ON p.section_id IN (
      SELECT s.id FROM public.sections s WHERE s.gallery_id = g.id
    )
    WHERE p.storage_path = name
  )
);
