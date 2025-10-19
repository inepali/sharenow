-- Create galleries table for wedding collections
CREATE TABLE public.galleries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  title TEXT NOT NULL,
  wedding_couple TEXT,
  wedding_date DATE,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sections table for organizing photos within galleries
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create photos table
CREATE TABLE public.photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create favorites table for client favorites
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gallery_id, photo_id, session_id)
);

-- Create profiles table for vendor information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for galleries
CREATE POLICY "Vendors can view their own galleries" 
  ON public.galleries FOR SELECT 
  USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can create galleries" 
  ON public.galleries FOR INSERT 
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can update their own galleries" 
  ON public.galleries FOR UPDATE 
  USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can delete their own galleries" 
  ON public.galleries FOR DELETE 
  USING (auth.uid() = vendor_id);

CREATE POLICY "Anyone can view active galleries by slug" 
  ON public.galleries FOR SELECT 
  USING (is_active = true);

-- RLS Policies for sections
CREATE POLICY "Vendors can manage sections in their galleries" 
  ON public.sections FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries 
      WHERE galleries.id = sections.gallery_id 
      AND galleries.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view sections in active galleries" 
  ON public.sections FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries 
      WHERE galleries.id = sections.gallery_id 
      AND galleries.is_active = true
    )
  );

-- RLS Policies for photos
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

-- RLS Policies for favorites (public access)
CREATE POLICY "Anyone can view favorites" 
  ON public.favorites FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can create favorites" 
  ON public.favorites FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can delete favorites" 
  ON public.favorites FOR DELETE 
  USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_galleries_updated_at
  BEFORE UPDATE ON public.galleries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profiles
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

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage buckets for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-photos', 'gallery-photos', true);

-- Storage policies for gallery-photos bucket
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gallery-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update their photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'gallery-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete their photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'gallery-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-photos');