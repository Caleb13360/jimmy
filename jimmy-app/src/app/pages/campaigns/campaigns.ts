import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

interface CampaignData {
  id: string;
  name: string;
  budget: number | null;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchase_value: number;
  start_date: string;
  end_date: string | null;
  // Calculated columns
  cpm: number;
  roas: number;
  ctr: number;
  cpc: number;
  cost_per_purchase: number;
  avg_order_value: number;
  conversion_rate: number;
}

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    CardModule,
    MessageModule,
    TagModule,
    ButtonModule
  ],
  templateUrl: './campaigns.html',
  styleUrl: './campaigns.css',
})
export class Campaigns implements OnInit {
  campaigns: CampaignData[] = [];
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
    await this.loadCampaigns();
  }

  async loadCampaigns(): Promise<void> {
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
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        this.errorMessage = error.message || 'Failed to load campaigns';
      } else {
        this.campaigns = (data || []).map(campaign => ({
          ...campaign,
          // Calculate CPM: (spend / impressions) × 1000
          cpm: campaign.impressions > 0
            ? (campaign.spend / campaign.impressions) * 1000
            : 0,
          // Calculate ROAS: purchase_value / spend
          roas: campaign.spend > 0
            ? campaign.purchase_value / campaign.spend
            : 0,
          // Calculate CTR: (clicks / impressions) × 100
          ctr: campaign.impressions > 0
            ? (campaign.clicks / campaign.impressions) * 100
            : 0,
          // Calculate CPC: spend / clicks
          cpc: campaign.clicks > 0
            ? campaign.spend / campaign.clicks
            : 0,
          // Calculate Cost per Purchase: spend / purchases
          cost_per_purchase: campaign.purchases > 0
            ? campaign.spend / campaign.purchases
            : 0,
          // Calculate Average Order Value: purchase_value / purchases
          avg_order_value: campaign.purchases > 0
            ? campaign.purchase_value / campaign.purchases
            : 0,
          // Calculate Conversion Rate: (purchases / clicks) × 100
          conversion_rate: campaign.clicks > 0
            ? (campaign.purchases / campaign.clicks) * 100
            : 0
        }));
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to load campaigns';
    }

    this.isLoading = false;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  }

  formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  formatDecimal(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  }

  getROASSeverity(roas: number): 'success' | 'warn' | 'danger' {
    if (roas >= 3) return 'success';
    if (roas >= 2) return 'warn';
    return 'danger';
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Ongoing';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
