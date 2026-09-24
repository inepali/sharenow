import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { GALLERY_TYPES } from "@/constants/gallery-types";
import { useSubscription } from "@/hooks/use-subscription";
import { useGalleries } from "@/hooks/use-galleries";
import { AlertTriangle, Sparkles } from "lucide-react";

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
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [galleryType, setGalleryType] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const { tier, limits } = useSubscription();
  const { data: galleries = [] } = useGalleries();
  const limitReached = galleries.length >= limits.maxGalleries;

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleCreate = async () => {
    if (limitReached) {
      toast.error(`Gallery limit reached for your ${tier} plan. Please upgrade to create more.`);
      return;
    }

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
      const accessPin = Math.floor(1000 + Math.random() * 9000).toString().padStart(4, "0");

      const { error } = await supabase
        .from("galleries")
        .insert({
          vendor_id: user.id,
          title: title.trim(),
          gallery_type: galleryType || null,
          wedding_date: weddingDate || null,
          description: description.trim() || null,
          cover_image_path: null,
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
          {limitReached ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                    Gallery Limit Reached ({galleries.length}/{limits.maxGalleries})
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Your {tier} plan allows up to {limits.maxGalleries} {limits.maxGalleries === 1 ? "gallery" : "galleries"}. Upgrade your plan to create more galleries.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/pricing");
                }}
              >
                <Sparkles className="w-4 h-4" />
                Upgrade Plan (30 Days Free)
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="title">Gallery Title *</Label>
            <Input
              id="title"
              placeholder="Summer Wedding Collection"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={limitReached}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gallery-type">Gallery Type</Label>
            <Select value={galleryType} onValueChange={setGalleryType} disabled={limitReached}>
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
              disabled={limitReached}
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
              disabled={limitReached}
            />
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
              disabled={loading || limitReached}
              className="flex-1"
            >
              {loading ? "Creating..." : "Create Gallery"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
