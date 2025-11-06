-- Create print_products table
CREATE TABLE public.print_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'print', 'canvas', 'album', 'frame', etc.
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_variants table for sizes and pricing
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.print_products(id) ON DELETE CASCADE,
  size_name TEXT NOT NULL, -- e.g., "4x6", "8x10", "16x20"
  dimensions TEXT, -- e.g., "4 x 6 inches"
  price DECIMAL(10,2) NOT NULL,
  stripe_price_id TEXT, -- Optional Stripe price ID for payment integration
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.print_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for print_products
CREATE POLICY "Vendors can view their own products"
  ON public.print_products
  FOR SELECT
  USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can create their own products"
  ON public.print_products
  FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can update their own products"
  ON public.print_products
  FOR UPDATE
  USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can delete their own products"
  ON public.print_products
  FOR DELETE
  USING (auth.uid() = vendor_id);

-- RLS Policies for product_variants
CREATE POLICY "Vendors can view variants of their products"
  ON public.product_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.print_products
      WHERE print_products.id = product_variants.product_id
      AND print_products.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can create variants for their products"
  ON public.product_variants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.print_products
      WHERE print_products.id = product_variants.product_id
      AND print_products.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update variants of their products"
  ON public.product_variants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.print_products
      WHERE print_products.id = product_variants.product_id
      AND print_products.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can delete variants of their products"
  ON public.product_variants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.print_products
      WHERE print_products.id = product_variants.product_id
      AND print_products.vendor_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_print_products_updated_at
  BEFORE UPDATE ON public.print_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();