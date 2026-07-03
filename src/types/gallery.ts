export interface Gallery {
  id: string;
  title: string;
  gallery_type: string | null;
  wedding_date: string | null;
  slug: string;
  is_active: boolean;
  created_at: string;
  cover_image_path: string | null;
  access_pin: string | null;
  description: string | null;
}

export interface Section {
  id: string;
  title: string;
  display_order: number;
  gallery_id?: string;
}

export interface Photo {
  id: string;
  storage_path: string;
  display_order: number;
  caption: string | null;
  section_id?: string;
}

export interface SectionWithPhotos extends Omit<Section, 'gallery_id'> {
  photos: Photo[];
}
