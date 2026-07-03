import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product, Variant, PartnerProduct } from "@/types";

interface ProductsData {
  products: Product[];
  variants: Record<string, Variant[]>;
  partnerProducts: PartnerProduct[];
}

async function fetchProducts(): Promise<ProductsData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: productsData, error: productsError } = await supabase
    .from("print_products")
    .select("*")
    .eq("vendor_id", user.id)
    .order("created_at", { ascending: false });

  if (productsError) throw productsError;

  const products = productsData || [];
  const variantsByProduct: Record<string, Variant[]> = {};

  if (products.length > 0) {
    const { data: variantsData, error: variantsError } = await supabase
      .from("product_variants")
      .select("*")
      .in("product_id", products.map(p => p.id))
      .order("price", { ascending: true });

    if (variantsError) throw variantsError;

    variantsData?.forEach(variant => {
      if (!variantsByProduct[variant.product_id]) {
        variantsByProduct[variant.product_id] = [];
      }
      variantsByProduct[variant.product_id].push(variant as Variant);
    });
  }

  // Fetch partner products
  const { data: partnerData, error: partnerError } = await supabase
    .from("print_partner_products")
    .select("*")
    .eq("is_active", true);

  if (partnerError) throw partnerError;

  return {
    products: products as Product[],
    variants: variantsByProduct,
    partnerProducts: (partnerData as unknown as PartnerProduct[]) || [],
  };
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
}
