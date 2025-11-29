export interface Product {
    id: string;
    name: string;
    description: string | null;
    category: string;
    is_active: boolean;
    vendor_id: string;
    created_at: string;
}

export interface Variant {
    id: string;
    product_id: string;
    size_name: string;
    dimensions: string | null;
    price: number;
    wholesale_cost: number | null;
    platform_margin_percent: number;
    photographer_margin_percent: number;
}

export interface PartnerProduct {
    id: string;
    partner_name: string;
    partner_product_uid: string;
    partner_sku: string;
    product_name: string;
    category: string;
    base_price: number;
    product_metadata: Record<string, unknown>;
    is_active: boolean;
}

export interface OrderItem {
    quantity: number;
    productName: string;
    customerPrice: number;
    photoId?: string;
    photoUrl?: string;
    partnerProductUid?: string;
    wholesaleCost?: number;
    platformMargin?: number;
    photographerMargin?: number;
}

export interface RevenueBreakdown {
    photographerEarning: number;
    wholesale: number;
    platformEarning: number;
}

export interface Order {
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
    vendor_id: string;
    shipping_address: Record<string, unknown>;
}

export interface CartItem {
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
