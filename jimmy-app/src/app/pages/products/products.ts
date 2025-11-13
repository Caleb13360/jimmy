import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

interface ProductData {
  id: number;
  name: string;
  status: string | null;
  price: number | null;
  sale_price: number | null;
  image_url: string | null;
  updated_at: string;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    CardModule,
    MessageModule,
    TagModule,
    ButtonModule,
    ImageModule
  ],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit {
  products: ProductData[] = [];
  isLoading = false;
  errorMessage = '';
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  async ngOnInit(): Promise<void> {
    await this.loadProducts();
  }

  async loadProducts(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        this.errorMessage = 'User not authenticated';
        this.isLoading = false;
        return;
      }

      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        this.errorMessage = error.message || 'Failed to load products';
      } else {
        this.products = data || [];
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to load products';
    }

    this.isLoading = false;
  }

  formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  getStatusSeverity(status: string | null): 'success' | 'danger' | 'warn' | 'secondary' {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'publish':
        return 'success';
      case 'draft':
        return 'warn';
      case 'pending':
        return 'warn';
      case 'private':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

}
