import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

interface SaleData {
  id: number;
  campaign_id: string | null;
  campaign_name?: string;
  date_created: string;
  order_total: number;
  order_status: string;
  utm_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  device_type: string | null;
  traffic_source_type: string | null;
  session_count: number | null;
  session_page_views: number | null;
  time_to_conversion_hours: number | null;
  has_bump: boolean;
  item_count?: number;
  product_names?: string;
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    CardModule,
    MessageModule,
    TagModule,
    ButtonModule
  ],
  templateUrl: './sales.html',
  styleUrl: './sales.css',
})
export class Sales implements OnInit {
  sales: SaleData[] = [];
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
    await this.loadSales();
  }

  async loadSales(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        this.errorMessage = 'User not authenticated';
        this.isLoading = false;
        return;
      }

      // Get sales with campaign name
      const { data: salesData, error: salesError } = await this.supabase
        .from('sales')
        .select('*, campaigns(name)')
        .eq('user_id', user.id)
        .order('date_created', { ascending: false });

      if (salesError) {
        this.errorMessage = salesError.message || 'Failed to load sales';
      } else {
        // Get sale items count and product names for each sale
        const salesWithItems = await Promise.all((salesData || []).map(async (sale: any) => {
          const { data: items } = await this.supabase
            .from('sale_items')
            .select('product_name, quantity')
            .eq('sale_id', sale.id);

          const itemCount = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
          const productNames = items?.map(item => item.product_name).join(', ') || '-';

          return {
            ...sale,
            campaign_name: sale.campaigns?.name || null,
            item_count: itemCount,
            product_names: productNames
          };
        }));

        this.sales = salesWithItems;
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to load sales';
    }

    this.isLoading = false;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatNumber(value: number | null): string {
    if (value === null || value === undefined) return '-';
    return value.toString();
  }

  getStatusSeverity(status: string): 'success' | 'danger' | 'warn' | 'secondary' | 'info' {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'info';
      case 'on-hold':
      case 'pending':
        return 'warn';
      case 'cancelled':
      case 'refunded':
      case 'failed':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  getDeviceIcon(deviceType: string | null): string {
    if (!deviceType) return 'pi-question';
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return 'pi-mobile';
      case 'desktop':
        return 'pi-desktop';
      case 'tablet':
        return 'pi-tablet';
      default:
        return 'pi-question';
    }
  }
}
