import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { DataService } from '../../services/data.service';
import { Product, ProductPrice, Campaign, Sale } from '../../types/database.types';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    CardModule,
    MessageModule,
    DialogModule,
    SelectModule,
    InputNumberModule,
    DatePickerModule
  ],
  templateUrl: './sales.html',
  styleUrl: './sales.css',
})
export class Sales implements OnInit {
  sales: any[] = [];
  products: Product[] = [];
  availablePrices: ProductPrice[] = [];
  campaigns: Campaign[] = [];

  selectedProduct: Product | null = null;
  selectedPrice: ProductPrice | null = null;
  selectedCampaign: Campaign | null = null;
  selectedQuantity: number | null = null;
  selectedDate: Date = new Date();

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showDialog = false;

  constructor(private dataService: DataService) {}

  async ngOnInit(): Promise<void> {
    await this.loadSales();
  }

  async loadSales(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    const { data, error } = await this.dataService.getSales();

    if (error) {
      this.errorMessage = error.message || 'Failed to load sales';
    } else {
      this.sales = data || [];
    }

    this.isLoading = false;
  }

  async openAddDialog(): Promise<void> {
    this.selectedProduct = null;
    this.selectedPrice = null;
    this.selectedCampaign = null;
    this.selectedQuantity = null;
    this.selectedDate = new Date();
    this.availablePrices = [];
    this.errorMessage = '';
    this.showDialog = true;

    // Load dropdown data
    await this.loadDropdownData();
  }

  async loadDropdownData(): Promise<void> {
    const [productsResult, campaignsResult] = await Promise.all([
      this.dataService.getProductsForSales(),
      this.dataService.getCampaignsForSales()
    ]);

    if (productsResult.error) {
      this.errorMessage = 'Failed to load products';
    } else {
      this.products = productsResult.data || [];
    }

    if (campaignsResult.error) {
      this.errorMessage = 'Failed to load campaigns';
    } else {
      this.campaigns = campaignsResult.data || [];
    }
  }

  async onProductChange(): Promise<void> {
    this.selectedPrice = null;
    this.availablePrices = [];

    if (!this.selectedProduct) {
      return;
    }

    const { data, error } = await this.dataService.getProductPricesForSales(this.selectedProduct.id);

    if (error) {
      this.errorMessage = 'Failed to load prices for this product';
    } else {
      this.availablePrices = data || [];
    }
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  async addSale(): Promise<void> {
    if (!this.selectedProduct || !this.selectedPrice || !this.selectedCampaign || !this.selectedQuantity || this.selectedQuantity <= 0) {
      this.errorMessage = 'Please fill in all fields with valid values';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Format date to YYYY-MM-DD in local timezone
    const year = this.selectedDate.getFullYear();
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const { data, error } = await this.dataService.createSale(
      this.selectedProduct.id,
      this.selectedPrice.id,
      this.selectedCampaign.id,
      this.selectedQuantity,
      dateStr
    );

    if (error) {
      this.errorMessage = error.message || 'Failed to create sale';
    } else if (data) {
      await this.loadSales();
      this.successMessage = 'Sale added successfully';
      setTimeout(() => this.successMessage = '', 3000);
      this.closeDialog();
    }

    this.isLoading = false;
  }

  async deleteSale(id: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this sale?')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { error } = await this.dataService.deleteSale(id);

    if (error) {
      this.errorMessage = error.message || 'Failed to delete sale';
    } else {
      this.sales = this.sales.filter(s => s.id !== id);
      this.successMessage = 'Sale deleted successfully';
      setTimeout(() => this.successMessage = '', 3000);
    }

    this.isLoading = false;
  }

  getTotalRevenue(sale: any): number {
    const price = sale.product_prices?.price || 0;
    return price * sale.quantity;
  }
}
