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
import { toast } from "sonner";

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
  const [weddingCouple, setWeddingCouple] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
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

      const { error } = await supabase
        .from("galleries")
        .insert({
          vendor_id: user.id,
          title: title.trim(),
          wedding_couple: weddingCouple.trim() || null,
          wedding_date: weddingDate || null,
          description: description.trim() || null,
          slug,
          is_active: true,
        });

      if (error) throw error;

      toast.success("Gallery created successfully!");
      
      setTitle("");
      setWeddingCouple("");
      setWeddingDate("");
      setDescription("");
      
      onGalleryCreated();
    } catch (error: any) {
      toast.error(error.message || "Failed to create gallery");
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
            <Label htmlFor="couple">Wedding Couple</Label>
            <Input
              id="couple"
              placeholder="Sarah & John"
              value={weddingCouple}
              onChange={(e) => setWeddingCouple(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Wedding Date</Label>
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
};
