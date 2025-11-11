import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { ChartModule } from 'primeng/chart';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { DataService } from '../../services/data.service';
import { Product, Campaign } from '../../types/database.types';

interface DateRangeOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    SelectModule,
    DatePickerModule,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    ChartModule,
    MessageModule,
    ButtonModule
  ],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class Analytics implements OnInit {
  // Filter options
  dateRangeOptions: DateRangeOption[] = [
    { label: 'Last 7 days', value: 'last7days' },
    { label: 'Last month', value: 'lastMonth' },
    { label: 'Last 3 months', value: 'last3Months' },
    { label: 'All time', value: 'allTime' },
    { label: 'Custom', value: 'custom' }
  ];

  selectedDateRange: DateRangeOption | null = null;
  customStartDate: Date | null = null;
  customEndDate: Date | null = null;
  showCustomDatePicker = false;

  products: Product[] = [];
  campaigns: Campaign[] = [];
  selectedProduct: Product | null = null;
  selectedCampaign: Campaign | null = null;

  // Chart data
  productChartData: any = null;
  campaignChartData: any = null;
  productChartOptions: any = null;
  campaignChartOptions: any = null;

  // Chart display mode
  showRevenue = false; // false = quantity, true = revenue
  cachedSalesData: any[] = [];

  isLoading = false;
  errorMessage = '';

  constructor(private dataService: DataService) {}

  async ngOnInit(): Promise<void> {
    this.initializeChartOptions();
    await this.loadFilterData();

    // Set default to "All time"
    this.selectedDateRange = this.dateRangeOptions[3];
    await this.loadAnalyticsData();
  }

  initializeChartOptions(): void {
    this.updateChartOptions();
  }

  updateChartOptions(): void {
    if (this.showRevenue) {
      // Revenue mode
      this.productChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
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
              text: 'Revenue ($)'
            },
            beginAtZero: true,
            ticks: {
              callback: function(value: any) {
                return '$' + value.toFixed(2);
              }
            }
          }
        }
      };

      this.campaignChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
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
              text: 'Revenue ($)'
            },
            beginAtZero: true,
            ticks: {
              callback: function(value: any) {
                return '$' + value.toFixed(2);
              }
            }
          }
        }
      };
    } else {
      // Quantity mode
      this.productChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
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
              text: 'Quantity Sold'
            },
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      };

      this.campaignChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
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
              text: 'Quantity Sold'
            },
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      };
    }
  }

  toggleDisplayMode(): void {
    this.showRevenue = !this.showRevenue;
    this.updateChartOptions();
    this.processProductData(this.cachedSalesData);
    this.processCampaignData(this.cachedSalesData);
  }

  async loadFilterData(): Promise<void> {
    const [productsResult, campaignsResult] = await Promise.all([
      this.dataService.getProductsForSales(),
      this.dataService.getCampaignsForSales()
    ]);

    if (productsResult.data) {
      this.products = productsResult.data;
    }

    if (campaignsResult.data) {
      this.campaigns = campaignsResult.data;
    }
  }

  onDateRangeChange(): void {
    this.showCustomDatePicker = this.selectedDateRange?.value === 'custom';

    if (!this.showCustomDatePicker) {
      this.customStartDate = null;
      this.customEndDate = null;
      this.loadAnalyticsData();
    }
  }

  onCustomDateChange(): void {
    if (this.customStartDate && this.customEndDate) {
      this.loadAnalyticsData();
    }
  }

  onFilterChange(): void {
    this.loadAnalyticsData();
  }

  getDateRange(): { startDate?: string; endDate?: string } {
    if (!this.selectedDateRange) {
      return {};
    }

    const today = new Date();
    let startDate: Date | null = null;

    switch (this.selectedDateRange.value) {
      case 'last7days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'lastMonth':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'last3Months':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'custom':
        if (this.customStartDate && this.customEndDate) {
          return {
            startDate: this.formatDate(this.customStartDate),
            endDate: this.formatDate(this.customEndDate)
          };
        }
        return {};
      case 'allTime':
      default:
        return {};
    }

    if (startDate) {
      return {
        startDate: this.formatDate(startDate),
        endDate: this.formatDate(today)
      };
    }

    return {};
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async loadAnalyticsData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    const dateRange = this.getDateRange();
    const filters = {
      ...dateRange,
      productId: this.selectedProduct?.id,
      campaignId: this.selectedCampaign?.id
    };

    const { data, error } = await this.dataService.getSalesAnalytics(filters);

    if (error) {
      this.errorMessage = error.message || 'Failed to load analytics data';
    } else if (data) {
      this.cachedSalesData = data;
      this.processProductData(data);
      this.processCampaignData(data);
    }

    this.isLoading = false;
  }

  processProductData(salesData: any[]): void {
    // Group by product and date
    const productMap = new Map<string, Map<string, number>>();

    salesData.forEach(sale => {
      const productId = sale.product_id;
      const productName = sale.products?.name || 'Unknown';
      const saleDate = sale.sale_date;
      const quantity = sale.quantity;
      const price = sale.product_prices?.price || 0;
      const value = this.showRevenue ? (quantity * price) : quantity;

      if (!productMap.has(productId)) {
        productMap.set(productId, new Map<string, number>());
      }

      const dateMap = productMap.get(productId)!;
      const currentValue = dateMap.get(saleDate) || 0;
      dateMap.set(saleDate, currentValue + value);
    });

    // Get all unique dates and sort them
    const allDates = new Set<string>();
    productMap.forEach(dateMap => {
      dateMap.forEach((_, date) => allDates.add(date));
    });
    const sortedDates = Array.from(allDates).sort();

    // Fill in all dates in the range with zeros
    if (sortedDates.length > 1) {
      const startDate = new Date(sortedDates[0]);
      const endDate = new Date(sortedDates[sortedDates.length - 1]);
      const allDatesInRange: string[] = [];

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        allDatesInRange.push(d.toISOString().split('T')[0]);
      }

      // Use the full date range instead of just dates with sales
      sortedDates.length = 0;
      sortedDates.push(...allDatesInRange);
    }

    // Build datasets for each product
    const datasets: any[] = [];
    const colors = [
      'rgb(75, 192, 192)',
      'rgb(255, 99, 132)',
      'rgb(54, 162, 235)',
      'rgb(255, 205, 86)',
      'rgb(153, 102, 255)'
    ];

    let colorIndex = 0;
    productMap.forEach((dateMap, productId) => {
      const product = salesData.find(s => s.product_id === productId);
      const productName = product?.products?.name || 'Unknown';

      const data = sortedDates.map(date => dateMap.get(date) || 0);

      datasets.push({
        label: productName,
        data: data,
        borderColor: colors[colorIndex % colors.length],
        backgroundColor: colors[colorIndex % colors.length] + '33',
        tension: 0.4
      });

      colorIndex++;
    });

    this.productChartData = {
      labels: sortedDates.map(date => this.formatDateForDisplay(date)),
      datasets: datasets
    };
  }

  processCampaignData(salesData: any[]): void {
    // Group by campaign and date
    const campaignMap = new Map<string, Map<string, number>>();

    salesData.forEach(sale => {
      const campaignId = sale.campaign_id;
      const campaignName = sale.campaigns?.name || 'Unknown';
      const saleDate = sale.sale_date;
      const quantity = sale.quantity;
      const price = sale.product_prices?.price || 0;
      const value = this.showRevenue ? (quantity * price) : quantity;

      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, new Map<string, number>());
      }

      const dateMap = campaignMap.get(campaignId)!;
      const currentValue = dateMap.get(saleDate) || 0;
      dateMap.set(saleDate, currentValue + value);
    });

    // Get all unique dates and sort them
    const allDates = new Set<string>();
    campaignMap.forEach(dateMap => {
      dateMap.forEach((_, date) => allDates.add(date));
    });
    const sortedDates = Array.from(allDates).sort();

    // Fill in all dates in the range with zeros
    if (sortedDates.length > 1) {
      const startDate = new Date(sortedDates[0]);
      const endDate = new Date(sortedDates[sortedDates.length - 1]);
      const allDatesInRange: string[] = [];

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        allDatesInRange.push(d.toISOString().split('T')[0]);
      }

      // Use the full date range instead of just dates with sales
      sortedDates.length = 0;
      sortedDates.push(...allDatesInRange);
    }

    // Build datasets for each campaign
    const datasets: any[] = [];
    const colors = [
      'rgb(75, 192, 192)',
      'rgb(255, 99, 132)',
      'rgb(54, 162, 235)',
      'rgb(255, 205, 86)',
      'rgb(153, 102, 255)'
    ];

    let colorIndex = 0;
    campaignMap.forEach((dateMap, campaignId) => {
      const campaign = salesData.find(s => s.campaign_id === campaignId);
      const campaignName = campaign?.campaigns?.name || 'Unknown';

      const data = sortedDates.map(date => dateMap.get(date) || 0);

      datasets.push({
        label: campaignName,
        data: data,
        borderColor: colors[colorIndex % colors.length],
        backgroundColor: colors[colorIndex % colors.length] + '33',
        tension: 0.4
      });

      colorIndex++;
    });

    this.campaignChartData = {
      labels: sortedDates.map(date => this.formatDateForDisplay(date)),
      datasets: datasets
    };
  }

  formatDateForDisplay(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
}
