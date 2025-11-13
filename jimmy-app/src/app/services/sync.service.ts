import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

// Meta API Types
export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  created_time: string;
  start_time: string;
  stop_time?: string;
}

export interface MetaCampaignInsight {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cpm: string;
  cpp?: string; // Cost per 1000 people reached
  reach: string;
  frequency?: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  action_values?: Array<{
    action_type: string;
    value: string;
  }>;
  cost_per_action_type?: Array<{
    action_type: string;
    value: string;
  }>;
  date_start: string;
  date_stop: string;
}

// WooCommerce API Types
export interface WooCommerceOrder {
  id: number;
  date_created: string;
  status: string;
  total: string;
  customer_id: number;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    country: string;
  };
  payment_method: string;
  payment_method_title: string;
  line_items: Array<{
    id: number;
    product_id: number;
    name: string;
    quantity: number;
    price: number;
    total: string;
    meta_data?: Array<{
      key: string;
      value: any;
    }>;
  }>;
  meta_data: Array<{
    key: string;
    value: any;
  }>;
  // Extracted fields
  utm_campaign?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_content?: string;
  utm_term?: string;
  traffic_source_type?: string;
  device_type?: string;
  referrer?: string;
  has_bump_purchase?: boolean;
}

export interface WooCommerceSummary {
  total_orders: number;
  orders_with_utm: number;
  orders_without_utm: number;
  unique_campaigns: string[];
  date_range: {
    start: string;
    end: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private readonly META_API_VERSION = 'v21.0';
  private readonly META_BASE_URL = `https://graph.facebook.com/${this.META_API_VERSION}`;
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  // ==================== SECRETS MANAGEMENT ====================

  async fetchSecrets(): Promise<{
    woo_url?: string;
    woo_consumer_key?: string;
    woo_consumer_secret?: string;
    meta_access_token?: string;
    meta_ad_account_id?: string;
  }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return {};
      }

      const { data, error } = await this.supabase
        .from('secrets')
        .select('name, value')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching secrets:', error);
        return {};
      }

      const secrets: any = {};
      data?.forEach((secret: any) => {
        secrets[secret.name] = secret.value;
      });

      return secrets;
    } catch (error) {
      console.error('Error fetching secrets:', error);
      return {};
    }
  }

  // ==================== META API METHODS ====================

  /**
   * Test Meta API connection and get account details
   */
  async testMetaConnection(token: string, accountId: string): Promise<{
    success: boolean;
    accountName?: string;
    currency?: string;
    error?: string;
  }> {
    try {
      const url = `${this.META_BASE_URL}/act_${accountId}`;
      const params = new URLSearchParams({
        access_token: token,
        fields: 'id,name,account_id,account_status,currency,timezone_name'
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.error) {
        return {
          success: false,
          error: data.error.message || 'Failed to connect to Meta API'
        };
      }

      return {
        success: true,
        accountName: data.name,
        currency: data.currency
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error connecting to Meta API'
      };
    }
  }

  /**
   * Fetch campaigns from Meta Ads
   */
  async fetchMetaCampaigns(token: string, accountId: string): Promise<{
    campaigns: MetaCampaign[];
    insights: Map<string, MetaCampaignInsight>;
    error?: string;
  }> {
    try {
      // Fetch campaigns
      const campaignsUrl = `${this.META_BASE_URL}/act_${accountId}/campaigns`;
      const campaignParams = new URLSearchParams({
        access_token: token,
        fields: 'id,name,status,objective,daily_budget,lifetime_budget,created_time,start_time,stop_time',
        limit: '100'
      });

      const campaignsResponse = await fetch(`${campaignsUrl}?${campaignParams}`);
      const campaignsData = await campaignsResponse.json();

      if (campaignsData.error) {
        return {
          campaigns: [],
          insights: new Map(),
          error: campaignsData.error.message || 'Failed to fetch campaigns'
        };
      }

      const campaigns: MetaCampaign[] = campaignsData.data || [];

      // Fetch insights for all campaigns
      const insightsUrl = `${this.META_BASE_URL}/act_${accountId}/insights`;
      const insightsParams = new URLSearchParams({
        access_token: token,
        level: 'campaign',
        date_preset: 'maximum',
        fields: 'campaign_id,campaign_name,spend,impressions,clicks,cpc,cpm,cpp,ctr,reach,frequency,actions,action_values,cost_per_action_type'
      });

      const insightsResponse = await fetch(`${insightsUrl}?${insightsParams}`);
      const insightsData = await insightsResponse.json();

      const insightsArray: MetaCampaignInsight[] = insightsData.data || [];
      const insightsMap = new Map<string, MetaCampaignInsight>();

      insightsArray.forEach(insight => {
        insightsMap.set(insight.campaign_id, insight);
      });

      return {
        campaigns,
        insights: insightsMap,
        error: undefined
      };
    } catch (error: any) {
      return {
        campaigns: [],
        insights: new Map(),
        error: error.message || 'Network error fetching campaigns'
      };
    }
  }

  /**
   * Sync campaigns to database (upsert)
   */
  async syncCampaignsToDatabase(
    campaigns: MetaCampaign[],
    insights: Map<string, MetaCampaignInsight>
  ): Promise<{
    success: boolean;
    synced: number;
    error?: string;
  }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          synced: 0,
          error: 'User not authenticated'
        };
      }

      // Prepare campaign records for upsert
      const campaignRecords = campaigns.map(campaign => {
        const insight = insights.get(campaign.id);

        // Extract purchases count and value
        let purchases = 0;
        let purchaseValue = 0;

        if (insight?.actions) {
          const purchaseAction = insight.actions.find(a => a.action_type === 'purchase');
          if (purchaseAction) {
            purchases = parseInt(purchaseAction.value) || 0;
          }
        }

        if (insight?.action_values) {
          const purchaseValueAction = insight.action_values.find(a => a.action_type === 'purchase');
          if (purchaseValueAction) {
            purchaseValue = parseFloat(purchaseValueAction.value) || 0;
          }
        }

        // Determine budget (prefer daily, fallback to lifetime)
        let budget = null;
        if (campaign.daily_budget) {
          budget = parseFloat(campaign.daily_budget) / 100; // Meta returns in cents
        } else if (campaign.lifetime_budget) {
          budget = parseFloat(campaign.lifetime_budget) / 100;
        }

        return {
          id: campaign.id,
          user_id: user.id,
          name: campaign.name,
          budget: budget,
          spend: insight ? parseFloat(insight.spend) : 0,
          impressions: insight ? parseInt(insight.impressions) : 0,
          clicks: insight ? parseInt(insight.clicks) : 0,
          purchases: purchases,
          purchase_value: purchaseValue,
          updated_at: new Date().toISOString()
        };
      });

      // Upsert campaigns
      const { error } = await this.supabase
        .from('campaigns')
        .upsert(campaignRecords, {
          onConflict: 'id'
        });

      if (error) {
        return {
          success: false,
          synced: 0,
          error: error.message
        };
      }

      return {
        success: true,
        synced: campaignRecords.length
      };
    } catch (error: any) {
      return {
        success: false,
        synced: 0,
        error: error.message || 'Failed to sync campaigns to database'
      };
    }
  }

  // ==================== WOOCOMMERCE API METHODS ====================

  /**
   * Test WooCommerce API connection
   */
  async testWooConnection(url: string, consumerKey: string, consumerSecret: string): Promise<{
    success: boolean;
    storeName?: string;
    version?: string;
    error?: string;
  }> {
    try {
      const cleanUrl = url.replace(/\/+$/, ''); // Remove trailing slashes
      const apiUrl = `${cleanUrl}/wp-json/wc/v3`;

      const response = await fetch(`${apiUrl}`, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${consumerKey}:${consumerSecret}`)
        }
      });

      const data = await response.json();

      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to connect to WooCommerce API'
        };
      }

      return {
        success: true,
        storeName: data.store?.name || 'WooCommerce Store',
        version: data.store?.version || 'Unknown'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error connecting to WooCommerce API'
      };
    }
  }

  /**
   * Fetch orders from WooCommerce
   */
  async fetchWooOrders(
    url: string,
    consumerKey: string,
    consumerSecret: string,
    dateRange?: { start: string; end: string }
  ): Promise<{
    orders: WooCommerceOrder[];
    summary: WooCommerceSummary;
    error?: string;
  }> {
    try {
      const cleanUrl = url.replace(/\/+$/, '');
      const apiUrl = `${cleanUrl}/wp-json/wc/v3/orders`;

      const params = new URLSearchParams({
        per_page: '100',
        order: 'desc'
      });

      if (dateRange) {
        params.append('after', `${dateRange.start}T00:00:00`);
        params.append('before', `${dateRange.end}T23:59:59`);
      }

      const response = await fetch(`${apiUrl}?${params}`, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${consumerKey}:${consumerSecret}`)
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          orders: [],
          summary: this.createEmptySummary(),
          error: errorData.message || 'Failed to fetch orders'
        };
      }

      const ordersData: any[] = await response.json();

      // Process and enrich orders with extracted metadata
      const orders: WooCommerceOrder[] = ordersData.map(order => {
        return this.enrichOrder(order);
      });

      // Generate summary
      const summary = this.generateSummary(orders, dateRange);

      return {
        orders,
        summary,
        error: undefined
      };
    } catch (error: any) {
      return {
        orders: [],
        summary: this.createEmptySummary(),
        error: error.message || 'Network error fetching orders'
      };
    }
  }

  /**
   * Enrich order with extracted UTM and metadata
   */
  private enrichOrder(order: any): WooCommerceOrder {
    const enriched: WooCommerceOrder = { ...order };

    // Extract UTM parameters from meta_data
    if (order.meta_data && Array.isArray(order.meta_data)) {
      order.meta_data.forEach((meta: any) => {
        if (meta.key === '_wc_order_attribution_utm_campaign') {
          enriched.utm_campaign = meta.value;
        } else if (meta.key === '_wc_order_attribution_utm_source') {
          enriched.utm_source = meta.value;
        } else if (meta.key === '_wc_order_attribution_utm_medium') {
          enriched.utm_medium = meta.value;
        } else if (meta.key === '_wc_order_attribution_utm_content') {
          enriched.utm_content = meta.value;
        } else if (meta.key === '_wc_order_attribution_utm_term') {
          enriched.utm_term = meta.value;
        } else if (meta.key === '_wc_order_attribution_source_type') {
          enriched.traffic_source_type = meta.value;
        } else if (meta.key === '_wc_order_attribution_device_type') {
          enriched.device_type = meta.value;
        } else if (meta.key === '_wc_order_attribution_referrer') {
          enriched.referrer = meta.value;
        }
      });
    }

    // Check for bump purchases
    if (order.line_items && Array.isArray(order.line_items)) {
      enriched.has_bump_purchase = order.line_items.some((item: any) => {
        if (item.meta_data && Array.isArray(item.meta_data)) {
          return item.meta_data.some((meta: any) => meta.key === '_bump_purchase');
        }
        return false;
      });
    }

    return enriched;
  }

  /**
   * Generate summary statistics from orders
   */
  private generateSummary(orders: WooCommerceOrder[], dateRange?: { start: string; end: string }): WooCommerceSummary {
    const ordersWithUTM = orders.filter(o => o.utm_campaign);
    const uniqueCampaigns = [...new Set(orders.map(o => o.utm_campaign).filter(Boolean))];

    const dates = orders.map(o => o.date_created.split('T')[0]).sort();

    return {
      total_orders: orders.length,
      orders_with_utm: ordersWithUTM.length,
      orders_without_utm: orders.length - ordersWithUTM.length,
      unique_campaigns: uniqueCampaigns as string[],
      date_range: {
        start: dateRange?.start || dates[dates.length - 1] || '',
        end: dateRange?.end || dates[0] || ''
      }
    };
  }

  /**
   * Create empty summary for error cases
   */
  private createEmptySummary(): WooCommerceSummary {
    return {
      total_orders: 0,
      orders_with_utm: 0,
      orders_without_utm: 0,
      unique_campaigns: [],
      date_range: { start: '', end: '' }
    };
  }
}
