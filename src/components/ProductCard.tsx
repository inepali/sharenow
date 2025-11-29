import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Product, Variant } from "@/types";

interface ProductCardProps {
  product: Product;
  variants: Variant[];
  onEdit: () => void;
  onAddVariant: () => void;
  onEditVariant: (variant: Variant) => void;
  onUpdate: () => void;
}

export const ProductCard = ({ product, variants, onEdit, onAddVariant, onEditVariant, onUpdate }: ProductCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("print_products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;
      toast.success("Product deleted");
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete product";
      toast.error(errorMessage);
    }
    setShowDeleteDialog(false);
  };

  const handleDeleteVariant = async () => {
    if (!deleteVariantId) return;
    try {
      const { error } = await supabase
        .from("product_variants")
        .delete()
        .eq("id", deleteVariantId);

      if (error) throw error;
      toast.success("Variant deleted");
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete variant";
      toast.error(errorMessage);
    }
    setDeleteVariantId(null);
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold">{product.name}</h3>
              <Badge variant="outline">{product.category}</Badge>
              {!product.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            {product.description && (
              <p className="text-sm text-muted-foreground">{product.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Sizes & Pricing</h4>
            <Button variant="outline" size="sm" onClick={onAddVariant}>
              <Plus className="h-4 w-4 mr-1" />
              Add Size
            </Button>
          </div>

          {variants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No sizes added yet. Click "Add Size" to get started.
            </p>
          ) : (
            <div className="grid gap-2">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{variant.size_name}</p>
                    {variant.dimensions && (
                      <p className="text-sm text-muted-foreground">{variant.dimensions}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold flex items-center">
                      <DollarSign className="h-4 w-4" />
                      {variant.price.toFixed(2)}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => onEditVariant(variant)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteVariantId(variant.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this product and all its variants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteVariantId} onOpenChange={(open) => !open && setDeleteVariantId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this size/variant. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVariant}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
