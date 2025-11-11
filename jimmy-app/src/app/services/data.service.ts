import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Database, Product, ProductPrice, Campaign, CampaignDailySpend, Sale } from '../types/database.types';

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

  // Campaign CRUD operations
  async getCampaigns(): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select(`
        *,
        campaign_daily_spend(amount)
      `)
      .order('start_date', { ascending: false });

    return { data, error };
  }

  async getCampaign(id: string): Promise<{ data: Campaign | null; error: any }> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  }

  async createCampaign(name: string, start_date: string, duration_days: number): Promise<{ data: Campaign | null; error: any }> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Create the campaign
    const { data, error } = await this.supabase
      .from('campaigns')
      .insert({ name, start_date, duration_days, user_id: user.id })
      .select()
      .single();

    if (error || !data) {
      return { data, error };
    }

    // Create daily spend rows for each day in the campaign
    const dailySpendRows: { campaign_id: string; spend_date: string; amount: number | null }[] = [];

    // Parse the start_date string (YYYY-MM-DD) to avoid timezone issues
    const [year, month, day] = start_date.split('-').map(Number);

    for (let i = 0; i < duration_days; i++) {
      // Create date in local timezone
      const currentDate = new Date(year, month - 1, day + i);
      const dateYear = currentDate.getFullYear();
      const dateMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dateDay = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${dateYear}-${dateMonth}-${dateDay}`;

      dailySpendRows.push({
        campaign_id: data.id,
        spend_date: dateStr,
        amount: null
      });
    }

    // Insert all daily spend rows
    const { error: spendError } = await this.supabase
      .from('campaign_daily_spend')
      .insert(dailySpendRows);

    if (spendError) {
      // If daily spend creation fails, we still return the campaign
      // but log the error
      console.error('Failed to create daily spend rows:', spendError);
    }

    return { data, error };
  }

  async updateCampaign(id: string, updates: { name?: string; start_date?: string; duration_days?: number; cpm?: number | null }): Promise<{ data: Campaign | null; error: any }> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  async deleteCampaign(id: string): Promise<{ error: any }> {
    const { error } = await this.supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    return { error };
  }

  // Campaign Daily Spend CRUD operations
  async getCampaignDailySpend(campaignId: string): Promise<{ data: CampaignDailySpend[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('campaign_daily_spend')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('spend_date', { ascending: true });

    return { data, error };
  }

  async upsertDailySpend(campaignId: string, spend_date: string, amount: number): Promise<{ data: CampaignDailySpend | null; error: any }> {
    const { data, error } = await this.supabase
      .from('campaign_daily_spend')
      .upsert({ campaign_id: campaignId, spend_date, amount }, { onConflict: 'campaign_id,spend_date' })
      .select()
      .single();

    return { data, error };
  }

  async deleteDailySpend(id: string): Promise<{ error: any }> {
    const { error } = await this.supabase
      .from('campaign_daily_spend')
      .delete()
      .eq('id', id);

    return { error };
  }

  // Sales CRUD operations
  async getSales(): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('sales')
      .select(`
        *,
        products(name),
        product_prices(price),
        campaigns(name)
      `)
      .order('sale_date', { ascending: false });

    return { data, error };
  }

  async createSale(product_id: string, product_price_id: string, campaign_id: string, quantity: number, sale_date: string): Promise<{ data: Sale | null; error: any }> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await this.supabase
      .from('sales')
      .insert({
        product_id,
        product_price_id,
        campaign_id,
        quantity,
        sale_date,
        user_id: user.id
      })
      .select()
      .single();

    return { data, error };
  }

  async deleteSale(id: string): Promise<{ error: any }> {
    const { error } = await this.supabase
      .from('sales')
      .delete()
      .eq('id', id);

    return { error };
  }

  // Helper methods for Sales dropdown data
  async getProductsForSales(): Promise<{ data: Product[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    return { data, error };
  }

  async getProductPricesForSales(productId: string): Promise<{ data: ProductPrice[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('product_prices')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  async getCampaignsForSales(): Promise<{ data: Campaign[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .order('name', { ascending: true });

    return { data, error };
  }

  // Analytics operations
  async getSalesAnalytics(filters?: {
    startDate?: string;
    endDate?: string;
    productId?: string;
    campaignId?: string;
  }): Promise<{ data: any[] | null; error: any }> {
    let query = this.supabase
      .from('sales')
      .select(`
        *,
        products(id, name),
        product_prices(price),
        campaigns(id, name)
      `)
      .order('sale_date', { ascending: true });

    if (filters?.startDate) {
      query = query.gte('sale_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('sale_date', filters.endDate);
    }

    if (filters?.productId) {
      query = query.eq('product_id', filters.productId);
    }

    if (filters?.campaignId) {
      query = query.eq('campaign_id', filters.campaignId);
    }

    const { data, error } = await query;

    return { data, error };
  }
}
