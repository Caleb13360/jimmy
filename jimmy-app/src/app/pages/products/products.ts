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
  image_url: string | null;
  updated_at: string;
  sales_count?: number;
  min_sold_price?: number | null;
  max_sold_price?: number | null;
  total_sales_revenue?: number;
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
        const products = data || [];

        // Get all sale items for this user in one query
        const { data: allSaleItems, error: saleItemsError } = await this.supabase
          .from('sale_items')
          .select('product_id, unit_price, quantity');

        if (saleItemsError) {
          console.error('Error loading sale items:', saleItemsError);
          // Still show products even if sale items fail to load
          this.products = products.map(p => ({
            ...p,
            sales_count: 0,
            min_sold_price: null,
            max_sold_price: null,
            total_sales_revenue: 0
          }));
        } else {
          // Group sale items by product
          const saleItemsByProduct = new Map<number, any[]>();
          allSaleItems?.forEach(item => {
            if (!saleItemsByProduct.has(item.product_id)) {
              saleItemsByProduct.set(item.product_id, []);
            }
            saleItemsByProduct.get(item.product_id)!.push(item);
          });

          // Calculate stats for each product
          this.products = products.map(product => {
            const items = saleItemsByProduct.get(product.id) || [];

            let minPrice: number | null = null;
            let maxPrice: number | null = null;
            let totalCount = 0;
            let totalRevenue = 0;

            if (items.length > 0) {
              const prices = items.map(item => item.unit_price);
              minPrice = Math.min(...prices);
              maxPrice = Math.max(...prices);
              totalCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
              totalRevenue = items.reduce((sum, item) => sum + (item.unit_price * (item.quantity || 1)), 0);
            }

            return {
              ...product,
              sales_count: totalCount,
              min_sold_price: minPrice,
              max_sold_price: maxPrice,
              total_sales_revenue: totalRevenue
            };
          });
        }
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

  formatPriceRange(minPrice: number | null | undefined, maxPrice: number | null | undefined): string {
    if (!minPrice && !maxPrice) return '-';
    if (minPrice === maxPrice) return this.formatCurrency(minPrice ?? null);
    return `${this.formatCurrency(minPrice ?? null)} - ${this.formatCurrency(maxPrice ?? null)}`;
  }

}
