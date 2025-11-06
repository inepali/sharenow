import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Package } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { ProductDialog } from "@/components/ProductDialog";
import { VariantDialog } from "@/components/VariantDialog";

const Store = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<Record<string, any[]>>({});
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [activeProductId, setActiveProductId] = useState<string>("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchProducts();
  };

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: productsData, error: productsError } = await supabase
        .from("print_products")
        .select("*")
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      setProducts(productsData || []);

      if (productsData && productsData.length > 0) {
        const { data: variantsData, error: variantsError } = await supabase
          .from("product_variants")
          .select("*")
          .in("product_id", productsData.map(p => p.id))
          .order("price", { ascending: true });

        if (variantsError) throw variantsError;

        const variantsByProduct: Record<string, any[]> = {};
        variantsData?.forEach(variant => {
          if (!variantsByProduct[variant.product_id]) {
            variantsByProduct[variant.product_id] = [];
          }
          variantsByProduct[variant.product_id].push(variant);
        });
        setVariants(variantsByProduct);
      }
    } catch (error: any) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setShowProductDialog(true);
  };

  const handleAddVariant = (productId: string) => {
    setActiveProductId(productId);
    setSelectedVariant(null);
    setShowVariantDialog(true);
  };

  const handleEditVariant = (variant: any) => {
    setActiveProductId(variant.product_id);
    setSelectedVariant(variant);
    setShowVariantDialog(true);
  };

  const handleProductDialogClose = () => {
    setShowProductDialog(false);
    setSelectedProduct(null);
  };

  const handleVariantDialogClose = () => {
    setShowVariantDialog(false);
    setSelectedVariant(null);
    setActiveProductId("");
  };

  if (loading) {
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
            <Button onClick={() => setShowProductDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Product
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
                onUpdate={fetchProducts}
              />
            ))}
          </div>
        )}
      </main>

      <ProductDialog
        open={showProductDialog}
        onOpenChange={handleProductDialogClose}
        onProductCreated={fetchProducts}
        product={selectedProduct}
      />

      <VariantDialog
        open={showVariantDialog}
        onOpenChange={handleVariantDialogClose}
        onVariantCreated={fetchProducts}
        productId={activeProductId}
        variant={selectedVariant}
      />
    </div>
  );
};

export default Store;
