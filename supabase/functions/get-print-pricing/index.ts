import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PricingBreakdown {
  wholesaleCost: number;
  platformMargin: number;
  photographerMargin: number;
  customerPrice: number;
  platformEarning: number;
  photographerEarning: number;
}

function calculatePricing(
  wholesaleCost: number,
  platformMarginPercent: number = 20,
  photographerMarginPercent: number = 30
): PricingBreakdown {
  const costWithPlatformMargin = wholesaleCost * (1 + platformMarginPercent / 100);
  const customerPrice = costWithPlatformMargin * (1 + photographerMarginPercent / 100);
  const platformEarning = wholesaleCost * (platformMarginPercent / 100);
  const photographerEarning = customerPrice - costWithPlatformMargin;

  return {
    wholesaleCost,
    platformMargin: platformMarginPercent,
    photographerMargin: photographerMarginPercent,
    customerPrice: Math.round(customerPrice * 100) / 100,
    platformEarning: Math.round(platformEarning * 100) / 100,
    photographerEarning: Math.round(photographerEarning * 100) / 100
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, variantId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    let pricing: PricingBreakdown;

    if (variantId) {
      // Get pricing from product variant
      const { data: variant, error } = await supabaseClient
        .from('product_variants')
        .select(`
          *,
          partner_product:partner_product_id (
            base_price
          )
        `)
        .eq('id', variantId)
        .single();

      if (error) throw error;

      const wholesaleCost = variant.wholesale_cost || variant.partner_product?.base_price || 0;
      pricing = calculatePricing(
        wholesaleCost,
        variant.platform_margin_percent || 20,
        variant.photographer_margin_percent || 30
      );
    } else if (productId) {
      // Get base pricing from partner product
      const { data: partnerProduct, error } = await supabaseClient
        .from('print_partner_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      pricing = calculatePricing(partnerProduct.base_price);
    } else {
      throw new Error('Either productId or variantId is required');
    }

    return new Response(
      JSON.stringify({ pricing }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in get-print-pricing:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
