export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      favorites: {
        Row: {
          created_at: string
          gallery_id: string
          id: string
          photo_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          gallery_id: string
          id?: string
          photo_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          gallery_id?: string
          id?: string
          photo_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      galleries: {
        Row: {
          access_pin: string | null
          cover_image_path: string | null
          created_at: string
          description: string | null
          gallery_type: string | null
          id: string
          is_active: boolean
          slug: string
          title: string
          updated_at: string
          vendor_id: string
          wedding_date: string | null
        }
        Insert: {
          access_pin?: string | null
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          gallery_type?: string | null
          id?: string
          is_active?: boolean
          slug: string
          title: string
          updated_at?: string
          vendor_id: string
          wedding_date?: string | null
        }
        Update: {
          access_pin?: string | null
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          gallery_type?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
          updated_at?: string
          vendor_id?: string
          wedding_date?: string | null
        }
        Relationships: []
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          section_id: string
          storage_path: string
          thumbnail_path: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          section_id: string
          storage_path: string
          thumbnail_path?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          section_id?: string
          storage_path?: string
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      print_orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          gallery_id: string | null
          id: string
          items: Json
          order_number: string
          partner_name: string
          partner_order_id: string | null
          revenue_breakdown: Json | null
          shipping_address: Json
          shipping_cost: number
          status: string | null
          subtotal: number
          tax: number | null
          total_amount: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          gallery_id?: string | null
          id?: string
          items: Json
          order_number: string
          partner_name?: string
          partner_order_id?: string | null
          revenue_breakdown?: Json | null
          shipping_address: Json
          shipping_cost: number
          status?: string | null
          subtotal: number
          tax?: number | null
          total_amount: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          gallery_id?: string | null
          id?: string
          items?: Json
          order_number?: string
          partner_name?: string
          partner_order_id?: string | null
          revenue_breakdown?: Json | null
          shipping_address?: Json
          shipping_cost?: number
          status?: string | null
          subtotal?: number
          tax?: number | null
          total_amount?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_orders_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      print_partner_products: {
        Row: {
          base_price: number
          category: string | null
          created_at: string
          id: string
          is_active: boolean | null
          partner_name: string
          partner_product_uid: string
          partner_sku: string | null
          product_metadata: Json | null
          product_name: string
          updated_at: string
        }
        Insert: {
          base_price: number
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          partner_name?: string
          partner_product_uid: string
          partner_sku?: string | null
          product_metadata?: Json | null
          product_name: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          partner_name?: string
          partner_product_uid?: string
          partner_sku?: string | null
          product_metadata?: Json | null
          product_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      print_products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          created_at: string
          dimensions: string | null
          id: string
          is_active: boolean
          partner_product_id: string | null
          partner_product_uid: string | null
          photographer_margin_percent: number | null
          platform_margin_percent: number | null
          price: number
          product_id: string
          size_name: string
          stripe_price_id: string | null
          updated_at: string
          wholesale_cost: number | null
        }
        Insert: {
          created_at?: string
          dimensions?: string | null
          id?: string
          is_active?: boolean
          partner_product_id?: string | null
          partner_product_uid?: string | null
          photographer_margin_percent?: number | null
          platform_margin_percent?: number | null
          price: number
          product_id: string
          size_name: string
          stripe_price_id?: string | null
          updated_at?: string
          wholesale_cost?: number | null
        }
        Update: {
          created_at?: string
          dimensions?: string | null
          id?: string
          is_active?: boolean
          partner_product_id?: string | null
          partner_product_uid?: string | null
          photographer_margin_percent?: number | null
          platform_margin_percent?: number | null
          price?: number
          product_id?: string
          size_name?: string
          stripe_price_id?: string | null
          updated_at?: string
          wholesale_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_partner_product_id_fkey"
            columns: ["partner_product_id"]
            isOneToOne: false
            referencedRelation: "print_partner_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "print_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          email: string | null
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          display_order: number
          gallery_id: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          gallery_id: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          display_order?: number
          gallery_id?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
