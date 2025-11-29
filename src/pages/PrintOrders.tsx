import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, ExternalLink } from "lucide-react";

interface OrderItem {
  quantity: number;
  productName: string;
  customerPrice: number;
}

interface RevenueBreakdown {
  photographerEarning: number;
  wholesale: number;
  platformEarning: number;
}

interface Order {
  id: string;
  order_number: string;
  gallery: { title: string } | null;
  created_at: string;
  status: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  revenue_breakdown: RevenueBreakdown | null;
  tracking_url: string | null;
  items: OrderItem[] | null;
}

const PrintOrders = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchOrders();
  };

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      // Cast the data to Order[] since Supabase returns Json for jsonb columns
      const typedData = (data || []).map(order => ({
        ...order,
        revenue_breakdown: order.revenue_breakdown as unknown as RevenueBreakdown | null,
        items: order.items as unknown as OrderItem[] | null
      })) as Order[];

      setOrders(typedData);
    } catch (error: unknown) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      case "submitted": return "bg-blue-500/10 text-blue-500";
      case "processing": return "bg-purple-500/10 text-purple-500";
      case "shipped": return "bg-green-500/10 text-green-500";
      case "delivered": return "bg-green-600/10 text-green-600";
      case "failed": return "bg-red-500/10 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
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
              <h1 className="text-3xl font-serif">Print Orders</h1>
              <p className="text-muted-foreground mt-1">
                Track your client print orders and earnings
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-serif mb-2">No orders yet</h2>
              <p className="text-muted-foreground mb-6">
                Print orders from your clients will appear here
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{order.order_number}</h3>
                    <p className="text-sm text-muted-foreground">
                      {order.gallery?.title || "Gallery"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Customer</p>
                    <p>{order.customer_name}</p>
                    <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                    <p className="text-lg font-semibold">${order.total_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Your Earnings</p>
                    <p className="text-lg font-semibold text-green-600">
                      ${order.revenue_breakdown?.photographerEarning?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>

                {order.revenue_breakdown && (
                  <div className="text-xs text-muted-foreground mb-4">
                    <span>Wholesale: ${order.revenue_breakdown.wholesale?.toFixed(2)}</span>
                    <span className="mx-2">•</span>
                    <span>Platform: ${order.revenue_breakdown.platformEarning?.toFixed(2)}</span>
                    <span className="mx-2">•</span>
                    <span>You earn: ${order.revenue_breakdown.photographerEarning?.toFixed(2)}</span>
                  </div>
                )}

                {order.tracking_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(order.tracking_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Track Shipment
                  </Button>
                )}

                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Items ({order.items?.length || 0})</p>
                  <div className="space-y-1">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="text-sm text-muted-foreground">
                        {item.quantity}x {item.productName} - ${item.customerPrice?.toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PrintOrders;
