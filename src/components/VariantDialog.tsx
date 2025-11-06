import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVariantCreated: () => void;
  productId: string;
  variant?: any;
}

export const VariantDialog = ({ open, onOpenChange, onVariantCreated, productId, variant }: VariantDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    size_name: variant?.size_name || "",
    dimensions: variant?.dimensions || "",
    price: variant?.price || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (variant) {
        const { error } = await supabase
          .from("product_variants")
          .update(formData)
          .eq("id", variant.id);

        if (error) throw error;
        toast.success("Variant updated successfully");
      } else {
        const { error } = await supabase
          .from("product_variants")
          .insert([{ ...formData, product_id: productId }]);

        if (error) throw error;
        toast.success("Variant created successfully");
      }

      onVariantCreated();
      onOpenChange(false);
      setFormData({ size_name: "", dimensions: "", price: "" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{variant ? "Edit Variant" : "Add Size/Variant"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="size_name">Size Name</Label>
            <Input
              id="size_name"
              value={formData.size_name}
              onChange={(e) => setFormData({ ...formData, size_name: e.target.value })}
              placeholder="e.g., 8x10, 16x20"
              required
            />
          </div>
          <div>
            <Label htmlFor="dimensions">Dimensions</Label>
            <Input
              id="dimensions"
              value={formData.dimensions}
              onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
              placeholder="e.g., 8 x 10 inches"
            />
          </div>
          <div>
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="29.99"
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : variant ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
