import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { FieldsetModule } from 'primeng/fieldset';
import { DatePicker } from 'primeng/datepicker';

// Services
import {
  SyncService,
  MetaCampaign,
  MetaCampaignInsight,
  WooCommerceOrder,
  WooCommerceSummary,
  WooCommerceProduct
} from '../../services/sync.service';

@Component({
  selector: 'app-sync',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    TableModule,
    TagModule,
    MessageModule,
    ProgressSpinnerModule,
    PanelModule,
    DividerModule,
    FieldsetModule,
    DatePicker
  ],
  templateUrl: './sync.html',
  styleUrls: ['./sync.css']
})
export class SyncComponent implements OnInit {
  // Meta section properties
  metaToken: string = '';
  metaAccountId: string = '';
  metaCampaigns: MetaCampaign[] = [];
  metaInsights: Map<string, MetaCampaignInsight> = new Map();
  metaLoading: boolean = false;
  metaError: string = '';
  metaSuccess: string = '';
  metaAccountInfo: any = null;
  showMetaRawJson: boolean = false;
  selectedMetaCampaign: MetaCampaign | null = null;

  // WooCommerce section properties
  wooUrl: string = '';
  wooKey: string = '';
  wooSecret: string = '';
  wooOrders: WooCommerceOrder[] = [];
  wooProducts: WooCommerceProduct[] = [];
  wooSummary: WooCommerceSummary | null = null;
  wooLoading: boolean = false;
  wooError: string = '';
  wooSuccess: string = '';
  wooStoreInfo: any = null;
  wooDateRange: Date[] = [];
  showWooRawJson: boolean = false;
  selectedWooOrder: WooCommerceOrder | null = null;

  constructor(private syncService: SyncService) {
    // Leave date range empty by default to fetch all orders
  }

  async ngOnInit() {
    // Fetch and prefill secrets from database
    const secrets = await this.syncService.fetchSecrets();

    if (secrets.meta_access_token) {
      this.metaToken = secrets.meta_access_token;
    }
    if (secrets.meta_ad_account_id) {
      this.metaAccountId = secrets.meta_ad_account_id;
    }
    if (secrets.woo_url) {
      this.wooUrl = secrets.woo_url;
    }
    if (secrets.woo_consumer_key) {
      this.wooKey = secrets.woo_consumer_key;
    }
    if (secrets.woo_consumer_secret) {
      this.wooSecret = secrets.woo_consumer_secret;
    }
  }

  // ==================== META METHODS ====================

  async testMetaConnection() {
    if (!this.metaToken || !this.metaAccountId) {
      this.metaError = 'Please enter both access token and account ID';
      return;
    }

    this.metaLoading = true;
    this.metaError = '';
    this.metaSuccess = '';

    const result = await this.syncService.testMetaConnection(this.metaToken, this.metaAccountId);

    this.metaLoading = false;

    if (result.success) {
      this.metaSuccess = `Connected successfully! Account: ${result.accountName} (${result.currency})`;
      this.metaAccountInfo = result;
    } else {
      this.metaError = result.error || 'Connection failed';
      this.metaAccountInfo = null;
    }
  }

  async fetchMetaCampaigns() {
    if (!this.metaToken || !this.metaAccountId) {
      this.metaError = 'Please enter both access token and account ID';
      return;
    }

    this.metaLoading = true;
    this.metaError = '';
    this.metaSuccess = '';
    this.metaCampaigns = [];
    this.metaInsights = new Map();

    const result = await this.syncService.fetchMetaCampaigns(this.metaToken, this.metaAccountId);

    this.metaLoading = false;

    if (result.error) {
      this.metaError = result.error;
    } else {
      this.metaCampaigns = result.campaigns;
      this.metaInsights = result.insights;
      this.metaSuccess = `Fetched ${result.campaigns.length} campaigns with insights`;

      // Auto-sync to database
      await this.syncCampaignsToDatabase();
    }
  }

  async syncCampaignsToDatabase() {
    if (this.metaCampaigns.length === 0) {
      this.metaError = 'No campaigns to sync. Fetch campaigns first.';
      return;
    }

    this.metaLoading = true;
    this.metaError = '';

    const syncResult = await this.syncService.syncCampaignsToDatabase(
      this.metaCampaigns,
      this.metaInsights
    );

    this.metaLoading = false;

    if (syncResult.success) {
      this.metaSuccess = `Synced ${syncResult.synced} campaigns to database`;
    } else {
      this.metaError = syncResult.error || 'Failed to sync campaigns';
    }
  }

  toggleMetaRawJson() {
    this.showMetaRawJson = !this.showMetaRawJson;
  }

  getMetaInsight(campaignId: string): MetaCampaignInsight | undefined {
    return this.metaInsights.get(campaignId);
  }

  getMetaStatusSeverity(status: string): 'success' | 'danger' | 'secondary' | 'info' | 'warn' {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'success';
      case 'PAUSED':
        return 'warn';
      case 'ARCHIVED':
        return 'secondary';
      default:
        return 'info';
    }
  }

  formatMetaBudget(budget: string | undefined): string {
    if (!budget) return 'N/A';
    return '$' + (parseFloat(budget) / 100).toFixed(2);
  }

  formatMetaNumber(value: string | undefined): string {
    if (!value) return '0';
    return parseFloat(value).toLocaleString();
  }

  formatMetaCurrency(value: string | undefined): string {
    if (!value) return '$0.00';
    return '$' + parseFloat(value).toFixed(2);
  }

  formatMetaPercentage(value: string | undefined): string {
    if (!value) return '0%';
    return parseFloat(value).toFixed(2) + '%';
  }

  getPurchaseCount(insight: MetaCampaignInsight): number {
    if (!insight.actions) return 0;
    const purchaseAction = insight.actions.find(a =>
      a.action_type === 'purchase' || a.action_type === 'omni_purchase'
    );
    return purchaseAction ? parseInt(purchaseAction.value) : 0;
  }

  getPurchaseValue(insight: MetaCampaignInsight): number {
    if (!insight.action_values) return 0;
    const purchaseValue = insight.action_values.find(a =>
      a.action_type === 'purchase' || a.action_type === 'omni_purchase'
    );
    return purchaseValue ? parseFloat(purchaseValue.value) : 0;
  }

  calculateROAS(insight: MetaCampaignInsight): string {
    const spend = parseFloat(insight.spend || '0');
    const revenue = this.getPurchaseValue(insight);
    if (spend === 0) return 'N/A';
    return (revenue / spend).toFixed(2) + 'x';
  }

  // ==================== WOOCOMMERCE METHODS ====================

  async testWooConnection() {
    if (!this.wooUrl || !this.wooKey || !this.wooSecret) {
      this.wooError = 'Please enter store URL, consumer key, and consumer secret';
      return;
    }

    this.wooLoading = true;
    this.wooError = '';
    this.wooSuccess = '';

    const result = await this.syncService.testWooConnection(this.wooUrl, this.wooKey, this.wooSecret);

    this.wooLoading = false;

    if (result.success) {
      this.wooSuccess = `Connected successfully! Store: ${result.storeName} (v${result.version})`;
      this.wooStoreInfo = result;
    } else {
      this.wooError = result.error || 'Connection failed';
      this.wooStoreInfo = null;
    }
  }

  async fetchWooOrders() {
    if (!this.wooUrl || !this.wooKey || !this.wooSecret) {
      this.wooError = 'Please enter store URL, consumer key, and consumer secret';
      return;
    }

    this.wooLoading = true;
    this.wooError = '';
    this.wooSuccess = '';
    this.wooOrders = [];
    this.wooProducts = [];
    this.wooSummary = null;

    // Fetch products first
    const productsResult = await this.syncService.fetchWooProducts(
      this.wooUrl,
      this.wooKey,
      this.wooSecret
    );

    if (productsResult.error) {
      this.wooError = `Products: ${productsResult.error}`;
      this.wooLoading = false;
      return;
    }

    this.wooProducts = productsResult.products;

    // Fetch orders
    let dateRange: { start: string; end: string } | undefined;
    if (this.wooDateRange && this.wooDateRange.length === 2) {
      dateRange = {
        start: this.wooDateRange[0].toISOString().split('T')[0],
        end: this.wooDateRange[1].toISOString().split('T')[0]
      };
    }

    const ordersResult = await this.syncService.fetchWooOrders(
      this.wooUrl,
      this.wooKey,
      this.wooSecret,
      dateRange
    );

    this.wooLoading = false;

    if (ordersResult.error) {
      this.wooError = `Orders: ${ordersResult.error}`;
    } else {
      this.wooOrders = ordersResult.orders;
      this.wooSummary = ordersResult.summary;
      this.wooSuccess = `Fetched ${productsResult.products.length} products and ${ordersResult.orders.length} orders`;

      // Auto-sync to database
      await this.syncWooCommerceToDatabase();
    }
  }

  async syncWooCommerceToDatabase() {
    if (this.wooProducts.length === 0 && this.wooOrders.length === 0) {
      this.wooError = 'No products or orders to sync. Fetch data first.';
      return;
    }

    this.wooLoading = true;
    this.wooError = '';

    // Sync products first
    if (this.wooProducts.length > 0) {
      const productsSync = await this.syncService.syncProductsToDatabase(this.wooProducts);
      if (!productsSync.success) {
        this.wooError = `Products sync failed: ${productsSync.error}`;
        this.wooLoading = false;
        return;
      }
    }

    // Sync sales and sale items
    if (this.wooOrders.length > 0) {
      const salesSync = await this.syncService.syncSalesToDatabase(this.wooOrders);
      if (!salesSync.success) {
        this.wooError = `Sales sync failed: ${salesSync.error}`;
        this.wooLoading = false;
        return;
      }

      this.wooSuccess = `Synced ${this.wooProducts.length} products, ${salesSync.syncedSales} sales, and ${salesSync.syncedItems} sale items to database`;
    } else {
      this.wooSuccess = `Synced ${this.wooProducts.length} products to database`;
    }

    this.wooLoading = false;
  }

  toggleWooRawJson() {
    this.showWooRawJson = !this.showWooRawJson;
  }

  getWooStatusSeverity(status: string): 'success' | 'danger' | 'secondary' | 'info' | 'warn' {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'info';
      case 'on-hold':
        return 'warn';
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

  formatWooDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString();
  }

  hasUTM(order: WooCommerceOrder): boolean {
    return !!order.utm_campaign;
  }
}
