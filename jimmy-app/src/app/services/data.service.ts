import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Database, Product, Campaign, Sale } from '../types/database.types';

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
      .select('*')
      .order('created_at', { ascending: false });

    return { data, error };
  }

  async getProduct(id: number): Promise<{ data: Product | null; error: any }> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  }

  async createProduct(id: number, name: string): Promise<{ data: Product | null; error: any }> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await this.supabase
      .from('products')
      .insert({ id, name, user_id: user.id })
      .select()
      .single();

    return { data, error };
  }

  async deleteProduct(id: number): Promise<{ error: any }> {
    const { error } = await this.supabase
      .from('products')
      .delete()
      .eq('id', id);

    return { error };
  }

  // Campaign CRUD operations
  async getCampaigns(): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select('*')
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

  async createCampaign(name: string, start_date: string, end_date?: string): Promise<{ data: Campaign | null; error: any }> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await this.supabase
      .from('campaigns')
      .insert({ id: name, name, start_date, end_date: end_date || null, user_id: user.id })
      .select()
      .single();

    return { data, error };
  }

  async updateCampaign(id: string, updates: { name?: string; start_date?: string; end_date?: string; budget?: number }): Promise<{ data: Campaign | null; error: any }> {
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

  // Helper methods for dropdown data
  async getProductsForSales(): Promise<{ data: Product[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    return { data, error };
  }

  async getCampaignsForSales(): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return { data: null, error };
    }

    // Add "Organic" as a special campaign option for unattributed sales
    const campaignsWithOrganic = [
      { id: 'organic', name: 'Organic (No Campaign)' },
      ...(data || [])
    ];

    return { data: campaignsWithOrganic, error: null };
  }
}
