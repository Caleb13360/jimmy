import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TabsModule } from 'primeng/tabs';
import { FormsModule } from '@angular/forms';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

interface DailySales {
  date: string;
  total: number;
  count: number;
}

interface TimeRangeOption {
  label: string;
  value: string;
}

interface MetricOption {
  label: string;
  value: 'revenue' | 'quantity';
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ChartModule,
    MessageModule,
    SelectModule,
    DatePickerModule,
    SelectButtonModule,
    TabsModule,
    FormsModule
  ],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class Analytics implements OnInit {
  chartData: any = null;
  chartOptions: any = null;
  isLoading = false;
  errorMessage = '';
  private supabase: SupabaseClient;

  timeRangeOptions: TimeRangeOption[] = [
    { label: 'Last Week', value: 'week' },
    { label: 'Last Month', value: 'month' },
    { label: 'Last 3 Months', value: '3months' },
    { label: 'All Time', value: 'all' },
    { label: 'Custom Range', value: 'custom' }
  ];
  selectedTimeRange: string = 'all';
  customDateRange: Date[] | null = null;
  showCustomDatePicker: boolean = false;

  metricOptions: MetricOption[] = [
    { label: '$', value: 'revenue' },
    { label: 'Qty', value: 'quantity' }
  ];
  selectedMetric: 'revenue' | 'quantity' = 'revenue';

  private _activeTabValue: string = '0';

  get activeTabValue(): string {
    return this._activeTabValue;
  }

  set activeTabValue(value: string) {
    this._activeTabValue = value;
    // Automatically update the chart when tab value changes
    if (this.salesDataCache && this.salesDataCache.length > 0) {
      // Force chart re-render by clearing it first
      this.chartData = null;
      setTimeout(() => {
        this.updateChartForMetric();
      }, 0);
    }
  }

  private salesDataCache: any[] = [];
  private campaignsCache: any[] = [];
  private productsCache: any[] = [];
  private salesWithCampaignsCache: any[] = [];
  private saleItemsCache: any[] = [];
  private currentUser: any = null;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  async ngOnInit(): Promise<void> {
    this.initializeChartOptions();
    await this.loadSalesData();
  }

  onTimeRangeChange(): void {
    this.showCustomDatePicker = this.selectedTimeRange === 'custom';
    if (this.selectedTimeRange !== 'custom') {
      this.customDateRange = null;
      this.loadSalesData();
    }
  }

  onMetricChange(): void {
    this.updateChartForMetric();
  }

  onTabChange(event: any): void {
    // Note: The activeTabValue setter will automatically handle the chart update
    // This is just a fallback handler
  }

  onCustomDateRangeChange(): void {
    if (this.customDateRange && this.customDateRange.length === 2 && this.customDateRange[0] && this.customDateRange[1]) {
      this.loadSalesData();
    }
  }

  getDateRangeFilter(): { startDate: Date | null; endDate: Date | null } {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (this.selectedTimeRange) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        endDate = now;
        break;
      case '3months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        endDate = now;
        break;
      case 'custom':
        if (this.customDateRange && this.customDateRange.length === 2) {
          startDate = this.customDateRange[0];
          endDate = this.customDateRange[1];
        }
        break;
      case 'all':
      default:
        // No filter for "all time"
        break;
    }

    return { startDate, endDate };
  }

  initializeChartOptions(): void {
    this.updateChartOptions();
  }

  updateChartOptions(): void {
    const isRevenue = this.selectedMetric === 'revenue';
    const showLegend = this.activeTabValue !== '0'; // Show legend for Campaign and Product tabs

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              if (isRevenue) {
                return '$' + context.parsed.y.toFixed(2);
              } else {
                return context.parsed.y + ' sales';
              }
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          title: {
            display: true,
            text: isRevenue ? 'Sales ($)' : 'Quantity'
          },
          beginAtZero: true,
          ticks: {
            callback: function(value: any) {
              if (isRevenue) {
                return '$' + value.toFixed(0);
              } else {
                return value;
              }
            }
          }
        }
      }
    };
  }

  async loadSalesData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Get user once and cache it
      if (!this.currentUser) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) {
          this.errorMessage = 'User not authenticated';
          this.isLoading = false;
          return;
        }
        this.currentUser = user;
      }

      const { startDate, endDate } = this.getDateRangeFilter();

      // Build query with optional date filters
      let query = this.supabase
        .from('sales')
        .select('date_created, order_total')
        .eq('user_id', this.currentUser.id);

      if (startDate) {
        query = query.gte('date_created', startDate.toISOString());
      }
      if (endDate) {
        // Add one day to include the end date
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        query = query.lt('date_created', endDatePlusOne.toISOString());
      }

      query = query.order('date_created', { ascending: true });

      const { data: sales, error } = await query;

      if (error) {
        this.errorMessage = error.message || 'Failed to load sales data';
      } else {
        this.salesDataCache = sales || [];
        await this.loadCampaignsAndProducts();
        await this.loadSalesWithCampaigns();
        await this.loadSaleItems();
        this.processSalesData(this.salesDataCache);
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to load sales data';
    }

    this.isLoading = false;
  }

  async loadCampaignsAndProducts(): Promise<void> {
    if (!this.currentUser) return;

    // Load campaigns
    const { data: campaigns } = await this.supabase
      .from('campaigns')
      .select('id, name')
      .eq('user_id', this.currentUser.id);
    this.campaignsCache = campaigns || [];

    // Load products
    const { data: products } = await this.supabase
      .from('products')
      .select('id, name')
      .eq('user_id', this.currentUser.id);
    this.productsCache = products || [];
  }

  async loadSalesWithCampaigns(): Promise<void> {
    if (!this.currentUser) return;

    const { startDate, endDate } = this.getDateRangeFilter();
    let query = this.supabase
      .from('sales')
      .select('date_created, order_total, campaign_id')
      .eq('user_id', this.currentUser.id);

    if (startDate) {
      query = query.gte('date_created', startDate.toISOString());
    }
    if (endDate) {
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      query = query.lt('date_created', endDatePlusOne.toISOString());
    }

    const { data: salesWithCampaigns } = await query;
    this.salesWithCampaignsCache = salesWithCampaigns || [];
  }

  async loadSaleItems(): Promise<void> {
    if (!this.currentUser) return;

    const { startDate, endDate } = this.getDateRangeFilter();
    let query = this.supabase
      .from('sale_items')
      .select('*, sales!inner(date_created, user_id)')
      .eq('sales.user_id', this.currentUser.id);

    if (startDate) {
      query = query.gte('sales.date_created', startDate.toISOString());
    }
    if (endDate) {
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      query = query.lt('sales.date_created', endDatePlusOne.toISOString());
    }

    const { data: saleItems } = await query;
    this.saleItemsCache = saleItems || [];
  }

  updateChartForMetric(): void {
    this.updateChartOptions();
    this.processSalesData(this.salesDataCache);
  }

  processSalesData(sales: any[]): void {
    if (this.activeTabValue === '0') {
      this.processAllSalesData(sales);
    } else if (this.activeTabValue === '1') {
      this.processCampaignSalesData(sales);
    } else if (this.activeTabValue === '2') {
      this.processProductSalesData(sales);
    }
  }

  processAllSalesData(sales: any[]): void {
    // Group sales by date - track both revenue and quantity
    const dailySalesMap = new Map<string, { revenue: number; count: number }>();

    sales.forEach(sale => {
      const date = sale.date_created.split('T')[0]; // Extract date part (YYYY-MM-DD)
      const current = dailySalesMap.get(date) || { revenue: 0, count: 0 };
      dailySalesMap.set(date, {
        revenue: current.revenue + sale.order_total,
        count: current.count + 1
      });
    });

    // Determine the date range to display
    const { startDate: filterStartDate, endDate: filterEndDate } = this.getDateRangeFilter();

    let startDate: Date;
    let endDate: Date;

    if (filterStartDate && filterEndDate) {
      // Use the filter date range
      startDate = new Date(filterStartDate);
      endDate = new Date(filterEndDate);
    } else if (dailySalesMap.size > 0) {
      // Use the range from first to last sale
      const sortedDates = Array.from(dailySalesMap.keys()).sort();
      startDate = new Date(sortedDates[0]);
      endDate = new Date(sortedDates[sortedDates.length - 1]);
    } else {
      // No sales data and no filter
      this.chartData = {
        labels: [],
        datasets: [{
          label: 'Daily Sales',
          data: [],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(75, 192, 192)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          spanGaps: false
        }]
      };
      return;
    }

    // Fill in all dates in the range with zeros for days with no sales
    const allDatesInRange: string[] = [];
    const allValues: number[] = [];

    const isRevenue = this.selectedMetric === 'revenue';

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      allDatesInRange.push(dateStr);
      const dayData = dailySalesMap.get(dateStr);
      if (isRevenue) {
        allValues.push(dayData ? dayData.revenue : 0);
      } else {
        allValues.push(dayData ? dayData.count : 0);
      }
    }

    // Format dates for display
    const formattedDates = allDatesInRange.map(date => this.formatDateForDisplay(date));

    this.chartData = {
      labels: formattedDates,
      datasets: [{
        label: isRevenue ? 'Daily Sales ($)' : 'Daily Sales (Qty)',
        data: allValues,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(75, 192, 192)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        spanGaps: false
      }]
    };
  }

  async processCampaignSalesData(sales: any[]): Promise<void> {
    try {
      const { startDate: filterStartDate, endDate: filterEndDate } = this.getDateRangeFilter();

      // Use cached sales with campaign data
      const salesWithCampaigns = this.salesWithCampaignsCache;
      if (!salesWithCampaigns || salesWithCampaigns.length === 0) {
        this.chartData = { labels: [], datasets: [] };
        return;
      }

    // Group by campaign and date
    const campaignDataMap = new Map<string, Map<string, { revenue: number; count: number }>>();

    salesWithCampaigns.forEach(sale => {
      const date = sale.date_created.split('T')[0];
      const campaignId = sale.campaign_id || 'organic';

      if (!campaignDataMap.has(campaignId)) {
        campaignDataMap.set(campaignId, new Map());
      }

      const dateMap = campaignDataMap.get(campaignId)!;
      const current = dateMap.get(date) || { revenue: 0, count: 0 };
      dateMap.set(date, {
        revenue: current.revenue + sale.order_total,
        count: current.count + 1
      });
    });

    let displayStartDate: Date;
    let displayEndDate: Date;

    if (filterStartDate && filterEndDate) {
      displayStartDate = new Date(filterStartDate);
      displayEndDate = new Date(filterEndDate);
    } else if (salesWithCampaigns.length > 0) {
      const dates = salesWithCampaigns.map(s => s.date_created.split('T')[0]).sort();
      displayStartDate = new Date(dates[0]);
      displayEndDate = new Date(dates[dates.length - 1]);
    } else {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const allDates: string[] = [];
    for (let d = new Date(displayStartDate); d <= displayEndDate; d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().split('T')[0]);
    }

    const isRevenue = this.selectedMetric === 'revenue';
    const colors = [
      'rgb(75, 192, 192)',
      'rgb(255, 99, 132)',
      'rgb(54, 162, 235)',
      'rgb(255, 206, 86)',
      'rgb(153, 102, 255)',
      'rgb(255, 159, 64)'
    ];

    const datasets: any[] = [];
    let colorIndex = 0;

    campaignDataMap.forEach((dateMap, campaignId) => {
      const campaignName = campaignId === 'organic'
        ? 'Organic'
        : this.campaignsCache.find(c => c.id === campaignId)?.name || campaignId;

      const data = allDates.map(date => {
        const dayData = dateMap.get(date);
        return isRevenue ? (dayData?.revenue || 0) : (dayData?.count || 0);
      });

      const color = colors[colorIndex % colors.length];
      datasets.push({
        label: campaignName,
        data: data,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
        tension: 0.4,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5
      });
      colorIndex++;
    });

    // Create a new object reference to trigger change detection
    this.chartData = {
      labels: [...allDates.map(date => this.formatDateForDisplay(date))],
      datasets: [...datasets]
    };
    } catch (error: any) {
      this.errorMessage = 'Failed to process campaign sales data: ' + (error.message || 'Unknown error');
      this.chartData = { labels: [], datasets: [] };
    }
  }

  async processProductSalesData(sales: any[]): Promise<void> {
    try {
      const { startDate: filterStartDate, endDate: filterEndDate } = this.getDateRangeFilter();

      // Use cached sale items data
      const saleItems = this.saleItemsCache;
      if (!saleItems || saleItems.length === 0) {
        this.chartData = { labels: [], datasets: [] };
        return;
      }

    // Group by product and date
    const productDataMap = new Map<number, Map<string, { revenue: number; count: number }>>();

    saleItems.forEach((item: any) => {
      const date = item.sales.date_created.split('T')[0];
      const productId = item.product_id;

      if (!productDataMap.has(productId)) {
        productDataMap.set(productId, new Map());
      }

      const dateMap = productDataMap.get(productId)!;
      const current = dateMap.get(date) || { revenue: 0, count: 0 };
      dateMap.set(date, {
        revenue: current.revenue + (item.unit_price * item.quantity),
        count: current.count + item.quantity
      });
    });

    let displayStartDate: Date;
    let displayEndDate: Date;

    if (filterStartDate && filterEndDate) {
      displayStartDate = new Date(filterStartDate);
      displayEndDate = new Date(filterEndDate);
    } else if (saleItems.length > 0) {
      const dates = saleItems.map((s: any) => s.sales.date_created.split('T')[0]).sort();
      displayStartDate = new Date(dates[0]);
      displayEndDate = new Date(dates[dates.length - 1]);
    } else {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const allDates: string[] = [];
    for (let d = new Date(displayStartDate); d <= displayEndDate; d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().split('T')[0]);
    }

    const isRevenue = this.selectedMetric === 'revenue';
    const colors = [
      'rgb(75, 192, 192)',
      'rgb(255, 99, 132)',
      'rgb(54, 162, 235)',
      'rgb(255, 206, 86)',
      'rgb(153, 102, 255)',
      'rgb(255, 159, 64)'
    ];

    const datasets: any[] = [];
    let colorIndex = 0;

    productDataMap.forEach((dateMap, productId) => {
      const productName = this.productsCache.find(p => p.id === productId)?.name || `Product ${productId}`;

      const data = allDates.map(date => {
        const dayData = dateMap.get(date);
        return isRevenue ? (dayData?.revenue || 0) : (dayData?.count || 0);
      });

      const color = colors[colorIndex % colors.length];
      datasets.push({
        label: productName,
        data: data,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
        tension: 0.4,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5
      });
      colorIndex++;
    });

    this.chartData = {
      labels: allDates.map(date => this.formatDateForDisplay(date)),
      datasets: datasets
    };
    } catch (error: any) {
      this.errorMessage = 'Failed to process product sales data: ' + (error.message || 'Unknown error');
      this.chartData = { labels: [], datasets: [] };
    }
  }

  formatDateForDisplay(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year}`;
  }
}
