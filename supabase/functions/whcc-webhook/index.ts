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
    const payload = await req.json();

    console.log('Received WHCC webhook:', payload);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // TODO: Verify webhook signature from WHCC
    // const signature = req.headers.get('X-WHCC-Signature');
    // const isValid = verifyWhccSignature(signature, payload);
    // if (!isValid) throw new Error('Invalid webhook signature');

    const { orderId, status, trackingNumber, trackingUrl } = payload;

    // Update order in database
    const { data: order, error } = await supabaseClient
      .from('print_orders')
      .update({
        status: status.toLowerCase(),
        tracking_number: trackingNumber,
        tracking_url: trackingUrl
      })
      .eq('partner_order_id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order:', error);
      throw error;
    }

    console.log('Order updated:', order.order_number, 'Status:', status);

    // TODO: Send email notification to customer and photographer
    // if (status === 'SHIPPED') {
    //   await sendShippingNotification(order);
    // }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in whcc-webhook:', error);
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
