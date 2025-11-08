import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      galleryId, 
      customerName, 
      customerEmail, 
      shippingAddress, 
      items 
    } = await req.json();

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

    // Calculate totals and revenue breakdown
    let subtotal = 0;
    let totalWholesale = 0;
    let totalPlatformEarning = 0;
    let totalPhotographerEarning = 0;

    for (const item of items) {
      const wholesaleCost = item.wholesaleCost || 0;
      const platformMargin = item.platformMargin || 20;
      const photographerMargin = item.photographerMargin || 30;
      const quantity = item.quantity || 1;

      const costWithPlatformMargin = wholesaleCost * (1 + platformMargin / 100);
      const itemPrice = costWithPlatformMargin * (1 + photographerMargin / 100);
      
      subtotal += itemPrice * quantity;
      totalWholesale += wholesaleCost * quantity;
      totalPlatformEarning += (wholesaleCost * (platformMargin / 100)) * quantity;
      totalPhotographerEarning += (itemPrice - costWithPlatformMargin) * quantity;
    }

    const shippingCost = 9.99; // TODO: Calculate based on items and destination
    const totalAmount = subtotal + shippingCost;

    const orderNumber = generateOrderNumber();

    // Create order in database
    const { data: order, error: orderError } = await supabaseClient
      .from('print_orders')
      .insert({
        order_number: orderNumber,
        gallery_id: galleryId,
        customer_name: customerName,
        customer_email: customerEmail,
        shipping_address: shippingAddress,
        items: items,
        subtotal: Math.round(subtotal * 100) / 100,
        shipping_cost: shippingCost,
        total_amount: Math.round(totalAmount * 100) / 100,
        vendor_id: user.id,
        partner_name: 'whcc',
        status: 'pending',
        revenue_breakdown: {
          wholesale: Math.round(totalWholesale * 100) / 100,
          platformEarning: Math.round(totalPlatformEarning * 100) / 100,
          photographerEarning: Math.round(totalPhotographerEarning * 100) / 100
        }
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw orderError;
    }

    console.log('Order created:', orderNumber);

    // TODO: Submit order to WHCC API
    // const whccApiKey = Deno.env.get('WHCC_API_KEY');
    // const whccResponse = await fetch('https://api.whcc.com/v1/orders', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${whccApiKey}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     orderNumber: orderNumber,
    //     customer: { name: customerName, email: customerEmail },
    //     shipping: shippingAddress,
    //     items: items.map(item => ({
    //       productUid: item.partnerProductUid,
    //       quantity: item.quantity,
    //       photoUrl: item.photoUrl
    //     }))
    //   })
    // });
    // const whccOrder = await whccResponse.json();
    
    // Update order with WHCC order ID
    // await supabaseClient
    //   .from('print_orders')
    //   .update({ 
    //     partner_order_id: whccOrder.orderId,
    //     status: 'submitted'
    //   })
    //   .eq('id', order.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        order: order,
        message: 'Order created successfully. WHCC integration pending API setup.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-print-order:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
