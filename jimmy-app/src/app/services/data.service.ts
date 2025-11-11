import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Database, Product, ProductPrice } from '../types/database.types';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = createClient<Database>(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  // Product CRUD operations
  async getProducts(): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*, product_prices(count)')
      .order('created_at', { ascending: false });

    return { data, error };
  }

  async getProduct(id: string): Promise<{ data: Product | null; error: any }> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  }

  async createProduct(name: string): Promise<{ data: Product | null; error: any }> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await this.supabase
      .from('products')
      .insert({ name, user_id: user.id })
      .select()
      .single();

    return { data, error };
  }

  async deleteProduct(id: string): Promise<{ error: any }> {
    const { error } = await this.supabase
      .from('products')
      .delete()
      .eq('id', id);

    return { error };
  }

  // Product Price CRUD operations
  async getProductPrices(productId: string): Promise<{ data: ProductPrice[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('product_prices')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  async createProductPrice(productId: string, price: number): Promise<{ data: ProductPrice | null; error: any }> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await this.supabase
      .from('product_prices')
      .insert({ product_id: productId, price, user_id: user.id })
      .select()
      .single();

    return { data, error };
  }

  async deleteProductPrice(id: string): Promise<{ error: any }> {
    const { error } = await this.supabase
      .from('product_prices')
      .delete()
      .eq('id', id);

    return { error };
  }
}
