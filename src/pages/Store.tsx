import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Package, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ProductCard } from "@/components/ProductCard";
import { ProductDialog } from "@/components/ProductDialog";
import { VariantDialog } from "@/components/VariantDialog";
import { useProducts } from "@/hooks/use-products";
import { useQueryClient } from "@tanstack/react-query";
import type { Product, Variant } from "@/types";

const Store = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useProducts();
  const products = data?.products ?? [];
  const variants = data?.variants ?? {};
  const partnerProducts = data?.partnerProducts ?? [];

  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [activeProductId, setActiveProductId] = useState<string>("");
  const [syncingProducts, setSyncingProducts] = useState(false);

  const invalidateProducts = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const syncWHCCProducts = async () => {
    setSyncingProducts(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-whcc-products');
      if (error) throw error;
      toast.success(`Synced ${data.count} WHCC products`);
      invalidateProducts();
    } catch (error: unknown) {
      console.error("Error syncing WHCC products:", error);
      toast.error("Failed to sync WHCC products");
    } finally {
      setSyncingProducts(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDialog(true);
  };

  const handleAddVariant = (productId: string) => {
    setActiveProductId(productId);
    setSelectedVariant(null);
    setShowVariantDialog(true);
  };

  const handleEditVariant = (variant: Variant) => {
    setActiveProductId(variant.product_id);
    setSelectedVariant(variant);
    setShowVariantDialog(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif">Product Catalog</h1>
              <p className="text-muted-foreground mt-1">
                Manage your print products, sizes, and pricing
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={syncWHCCProducts}
                disabled={syncingProducts}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncingProducts ? 'animate-spin' : ''}`} />
                Sync WHCC Products
              </Button>
              <Button onClick={() => setShowProductDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Product
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {partnerProducts.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-serif mb-4">WHCC Partner Products ({partnerProducts.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {partnerProducts.slice(0, 6).map((product) => (
                <div key={product.id} className="border rounded-lg p-3">
                  <p className="font-medium">{product.product_name}</p>
                  <p className="text-sm text-muted-foreground">{product.category}</p>
                  <p className="text-sm">Wholesale: ${product.base_price.toFixed(2)}</p>
                </div>
              ))}
            </div>
            {partnerProducts.length > 6 && (
              <p className="text-sm text-muted-foreground mt-4">
                +{partnerProducts.length - 6} more products available
              </p>
            )}
          </Card>
        )}

        {products.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-serif mb-2">No products yet</h2>
              <p className="text-muted-foreground mb-6">
                Create your first product to start offering prints to your clients
              </p>
              <Button onClick={() => setShowProductDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Product
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                variants={variants[product.id] || []}
                onEdit={() => handleEditProduct(product)}
                onAddVariant={() => handleAddVariant(product.id)}
                onEditVariant={handleEditVariant}
                onUpdate={invalidateProducts}
              />
            ))}
          </div>
        )}
      </main>

      <ProductDialog
        open={showProductDialog}
        onOpenChange={() => { setShowProductDialog(false); setSelectedProduct(null); }}
        onProductCreated={invalidateProducts}
        product={selectedProduct}
      />

      <VariantDialog
        open={showVariantDialog}
        onOpenChange={() => { setShowVariantDialog(false); setSelectedVariant(null); setActiveProductId(""); }}
        onVariantCreated={invalidateProducts}
        productId={activeProductId}
        variant={selectedVariant}
      />
    </div>
  );
};

export default Store;
