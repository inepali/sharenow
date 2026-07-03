import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderItem, RevenueBreakdown } from "@/types";

async function fetchOrders(): Promise<Order[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("print_orders")
    .select(`
      *,
      gallery:gallery_id (
        title
      )
    `)
    .eq("vendor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(order => ({
    ...order,
    revenue_breakdown: order.revenue_breakdown as unknown as RevenueBreakdown | null,
    items: order.items as unknown as OrderItem[] | null,
  })) as Order[];
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });
}
