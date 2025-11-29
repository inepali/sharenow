import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('Unauthorized');
    }

    console.log('Syncing WHCC products for user:', user.id);

    // TODO: Replace with actual WHCC API integration
    // const whccApiKey = Deno.env.get('WHCC_API_KEY');
    // const whccResponse = await fetch('https://api.whcc.com/v1/products', {
    //   headers: { 'Authorization': `Bearer ${whccApiKey}` }
    // });
    // const whccProducts = await whccResponse.json();

    // Mock WHCC product data for now
    const mockProducts = [
      {
        partner_product_uid: 'WHCC_PRINT_4X6',
        partner_sku: 'PRINT-4X6-LUSTRE',
        product_name: '4x6 Lustre Print',
        category: 'prints',
        base_price: 0.29,
        product_metadata: {
          dimensions: '4x6',
          finish: 'lustre',
          description: 'Professional quality 4x6 lustre print'
        }
      },
      {
        partner_product_uid: 'WHCC_PRINT_5X7',
        partner_sku: 'PRINT-5X7-LUSTRE',
        product_name: '5x7 Lustre Print',
        category: 'prints',
        base_price: 0.79,
        product_metadata: {
          dimensions: '5x7',
          finish: 'lustre',
          description: 'Professional quality 5x7 lustre print'
        }
      },
      {
        partner_product_uid: 'WHCC_PRINT_8X10',
        partner_sku: 'PRINT-8X10-LUSTRE',
        product_name: '8x10 Lustre Print',
        category: 'prints',
        base_price: 1.99,
        product_metadata: {
          dimensions: '8x10',
          finish: 'lustre',
          description: 'Professional quality 8x10 lustre print'
        }
      },
      {
        partner_product_uid: 'WHCC_PRINT_11X14',
        partner_sku: 'PRINT-11X14-LUSTRE',
        product_name: '11x14 Lustre Print',
        category: 'prints',
        base_price: 4.99,
        product_metadata: {
          dimensions: '11x14',
          finish: 'lustre',
          description: 'Professional quality 11x14 lustre print'
        }
      }
    ];

    // Upsert products into database
    const { data: insertedProducts, error: insertError } = await supabaseClient
      .from('print_partner_products')
      .upsert(
        mockProducts.map(p => ({
          partner_name: 'whcc',
          ...p
        })),
        { onConflict: 'partner_name,partner_product_uid' }
      )
      .select();

    if (insertError) {
      console.error('Error inserting products:', insertError);
      throw insertError;
    }

    console.log(`Successfully synced ${insertedProducts?.length || 0} WHCC products`);

    return new Response(
      JSON.stringify({
        success: true,
        count: insertedProducts?.length || 0,
        products: insertedProducts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in sync-whcc-products:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
