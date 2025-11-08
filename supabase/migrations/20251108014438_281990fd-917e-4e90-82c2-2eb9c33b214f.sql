-- Create print partner products table
CREATE TABLE public.print_partner_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT NOT NULL DEFAULT 'whcc',
  partner_product_uid TEXT NOT NULL,
  partner_sku TEXT,
  product_name TEXT NOT NULL,
  category TEXT,
  base_price DECIMAL NOT NULL,
  product_metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(partner_name, partner_product_uid)
);

-- Enable RLS
ALTER TABLE public.print_partner_products ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view active products
CREATE POLICY "Anyone can view active partner products"
  ON public.print_partner_products
  FOR SELECT
  USING (is_active = true);

-- Allow vendors to view all partner products
CREATE POLICY "Vendors can view all partner products"
  ON public.print_partner_products
  FOR SELECT
  TO authenticated
  USING (true);

-- Update product_variants table with print partner fields
ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS partner_product_id UUID REFERENCES public.print_partner_products(id),
ADD COLUMN IF NOT EXISTS partner_product_uid TEXT,
ADD COLUMN IF NOT EXISTS wholesale_cost DECIMAL,
ADD COLUMN IF NOT EXISTS platform_margin_percent DECIMAL DEFAULT 20,
ADD COLUMN IF NOT EXISTS photographer_margin_percent DECIMAL DEFAULT 30;

-- Create print orders table
CREATE TABLE public.print_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  gallery_id UUID REFERENCES public.galleries(id),
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL NOT NULL,
  shipping_cost DECIMAL NOT NULL,
  tax DECIMAL DEFAULT 0,
  total_amount DECIMAL NOT NULL,
  vendor_id UUID NOT NULL,
  partner_name TEXT NOT NULL DEFAULT 'whcc',
  partner_order_id TEXT,
  status TEXT DEFAULT 'pending',
  tracking_number TEXT,
  tracking_url TEXT,
  revenue_breakdown JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;

-- Vendors can view their print orders
CREATE POLICY "Vendors can view their print orders"
  ON public.print_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = vendor_id);

-- Vendors can create print orders
CREATE POLICY "Vendors can create print orders"
  ON public.print_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = vendor_id);

-- System can update all print orders (for webhooks)
CREATE POLICY "System can update print orders"
  ON public.print_orders
  FOR UPDATE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_print_partner_products_updated_at
  BEFORE UPDATE ON public.print_partner_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_print_orders_updated_at
  BEFORE UPDATE ON public.print_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();