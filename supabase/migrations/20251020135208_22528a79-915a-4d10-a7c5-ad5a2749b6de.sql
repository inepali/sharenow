-- Add cover_image column to galleries table
ALTER TABLE galleries 
ADD COLUMN cover_image_path text;

COMMENT ON COLUMN galleries.cover_image_path IS 'Storage path for the gallery cover image displayed on the galleries list';
