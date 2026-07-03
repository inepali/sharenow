import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { GALLERY_TYPES } from "@/constants/gallery-types";

interface CreateGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGalleryCreated: () => void;
}

export const CreateGalleryDialog = ({
  open,
  onOpenChange,
  onGalleryCreated,
}: CreateGalleryDialogProps) => {
  const [title, setTitle] = useState("");
  const [galleryType, setGalleryType] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Cover image must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setCoverImage(file);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a gallery title");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const slug = generateSlug(title) + "-" + Date.now().toString(36);
      let coverImagePath: string | null = null;

      // Upload cover image if provided
      if (coverImage) {
        const fileExt = coverImage.name.split(".").pop();
        const filePath = `${slug}/cover.${fileExt}`;

        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('r2-presigned-url', {
          body: { fileName: filePath, contentType: coverImage.type }
        });

        if (edgeError) {
          toast.error("Failed to get upload URL");
          throw edgeError;
        }

        const uploadRes = await fetch(edgeData.url, {
          method: 'PUT',
          body: coverImage,
          headers: { 'Content-Type': coverImage.type }
        });

        if (!uploadRes.ok) {
          toast.error("Failed to upload cover image");
          throw new Error("R2 upload failed");
        }

        coverImagePath = filePath;
      }

      const accessPin = Math.floor(1000 + Math.random() * 9000).toString().padStart(4, '0');

      const { error } = await supabase
        .from("galleries")
        .insert({
          vendor_id: user.id,
          title: title.trim(),
          gallery_type: galleryType || null,
          wedding_date: weddingDate || null,
          description: description.trim() || null,
          cover_image_path: coverImagePath,
          access_pin: accessPin,
          slug,
          is_active: true,
        });

      if (error) throw error;

      toast.success("Gallery created successfully!");

      setTitle("");
      setGalleryType("");
      setWeddingDate("");
      setDescription("");
      setCoverImage(null);

      onGalleryCreated();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create gallery";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Create New Gallery</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Gallery Title *</Label>
            <Input
              id="title"
              placeholder="Summer Wedding Collection"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gallery-type">Gallery Type</Label>
            <Select value={galleryType} onValueChange={setGalleryType}>
              <SelectTrigger id="gallery-type">
                <SelectValue placeholder="Select gallery type" />
              </SelectTrigger>
              <SelectContent>
                {GALLERY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Event Date</Label>
            <Input
              id="date"
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="A beautiful summer wedding..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover-image">Cover Image</Label>
            <div className="flex items-center gap-3">
              <Input
                id="cover-image"
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("cover-image")?.click()}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {coverImage ? coverImage.name : "Upload Cover Image"}
              </Button>
            </div>
            {coverImage && (
              <p className="text-sm text-muted-foreground">
                Selected: {coverImage.name} ({(coverImage.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Creating..." : "Create Gallery"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
