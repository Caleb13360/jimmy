export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      product_prices: {
        Row: {
          created_at: string | null
          id: string
          price: number
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          price: number
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          price?: number
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
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

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductPrice = Database['public']['Tables']['product_prices']['Row'];
export type ProductPriceInsert = Database['public']['Tables']['product_prices']['Insert'];
