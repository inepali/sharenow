import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";

interface CartItem {
  id: string;
  photoId: string;
  photoUrl: string;
  productId: string;
  productName: string;
  partnerProductUid: string;
  quantity: number;
  wholesaleCost: number;
  platformMargin: number;
  photographerMargin: number;
  customerPrice: number;
}

interface PrintShopCartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  galleryId: string;
  availableProducts: any[];
  selectedPhoto?: { id: string; url: string };
}

export const PrintShopCart = ({ 
  open, 
  onOpenChange, 
  galleryId, 
  availableProducts,
  selectedPhoto 
}: PrintShopCartProps) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip: ""
  });
  const [loading, setLoading] = useState(false);

  const addToCart = async (productId: string) => {
    if (!selectedPhoto) return;

    const product = availableProducts.find(p => p.id === productId);
    if (!product) return;

    // Get pricing from edge function
    const { data: pricingData, error } = await supabase.functions.invoke('get-print-pricing', {
      body: { productId }
    });

    if (error) {
      toast.error("Failed to get pricing");
      return;
    }

    const newItem: CartItem = {
      id: `${selectedPhoto.id}-${productId}-${Date.now()}`,
      photoId: selectedPhoto.id,
      photoUrl: selectedPhoto.url,
      productId: product.id,
      productName: product.product_name,
      partnerProductUid: product.partner_product_uid,
      quantity: 1,
      wholesaleCost: pricingData.pricing.wholesaleCost,
      platformMargin: pricingData.pricing.platformMargin,
      photographerMargin: pricingData.pricing.photographerMargin,
      customerPrice: pricingData.pricing.customerPrice
    };

    setCart([...cart, newItem]);
    toast.success("Added to cart");
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
    toast.success("Removed from cart");
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.customerPrice * item.quantity), 0);
    const shipping = 9.99;
    return { subtotal, shipping, total: subtotal + shipping };
  };

  const handleCheckout = async () => {
    if (!customerName || !customerEmail || !shippingAddress.street) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-print-order', {
        body: {
          galleryId,
          customerName,
          customerEmail,
          shippingAddress,
          items: cart.map(item => ({
            photoId: item.photoId,
            photoUrl: item.photoUrl,
            partnerProductUid: item.partnerProductUid,
            productName: item.productName,
            quantity: item.quantity,
            wholesaleCost: item.wholesaleCost,
            platformMargin: item.platformMargin,
            photographerMargin: item.photographerMargin,
            customerPrice: item.customerPrice
          }))
        }
      });

      if (error) throw error;

      toast.success("Order placed successfully!");
      setCart([]);
      onOpenChange(false);
      
      // TODO: Redirect to Stripe checkout
      // window.location.href = data.checkoutUrl;
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, shipping, total } = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Print Shop Cart
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {selectedPhoto && (
            <div>
              <Label>Add prints of this photo:</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {availableProducts.map(product => (
                  <Button
                    key={product.id}
                    variant="outline"
                    size="sm"
                    onClick={() => addToCart(product.id)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {product.product_name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {cart.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Cart Items</h3>
              <div className="space-y-2">
                {cart.map(item => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          ${item.customerPrice.toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t pt-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <Label>Street Address *</Label>
              <Input
                value={shippingAddress.street}
                onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City *</Label>
                <Input
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  placeholder="New York"
                />
              </div>
              <div>
                <Label>State *</Label>
                <Input
                  value={shippingAddress.state}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                  placeholder="NY"
                />
              </div>
              <div>
                <Label>ZIP *</Label>
                <Input
                  value={shippingAddress.zip}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                  placeholder="10001"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="w-full"
          >
            {loading ? "Processing..." : "Checkout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
