import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { DataService } from '../../services/data.service';
import { Product, ProductPrice } from '../../types/database.types';

@Component({
  selector: 'app-product-prices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputNumberModule,
    CardModule,
    MessageModule,
    BreadcrumbModule
  ],
  templateUrl: './product-prices.html',
  styleUrl: './product-prices.css',
})
export class ProductPrices implements OnInit {
  productId: string = '';
  product: Product | null = null;
  prices: ProductPrice[] = [];
  newPrice: number | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  breadcrumbItems: MenuItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService
  ) {}

  async ngOnInit(): Promise<void> {
    this.productId = this.route.snapshot.paramMap.get('id') || '';

    if (!this.productId) {
      this.router.navigate(['/products']);
      return;
    }

    await this.loadProduct();
    await this.loadPrices();
  }

  async loadProduct(): Promise<void> {
    const { data, error } = await this.dataService.getProduct(this.productId);

    if (error || !data) {
      this.errorMessage = 'Failed to load product';
      setTimeout(() => this.router.navigate(['/products']), 2000);
    } else {
      this.product = data;
      this.breadcrumbItems = [
        { label: 'Products', routerLink: '/products' },
        { label: this.product.name }
      ];
    }
  }

  async loadPrices(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    const { data, error } = await this.dataService.getProductPrices(this.productId);

    if (error) {
      this.errorMessage = error.message || 'Failed to load prices';
    } else {
      this.prices = data || [];
    }

    this.isLoading = false;
  }

  async addPrice(): Promise<void> {
    if (this.newPrice === null || this.newPrice < 0) {
      this.errorMessage = 'Please enter a valid price';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { data, error } = await this.dataService.createProductPrice(this.productId, this.newPrice);

    if (error) {
      this.errorMessage = error.message || 'Failed to create price';
    } else if (data) {
      this.prices.unshift(data);
      this.newPrice = null;
      this.successMessage = 'Price added successfully';
      setTimeout(() => this.successMessage = '', 3000);
    }

    this.isLoading = false;
  }

  async deletePrice(id: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this price entry?')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { error } = await this.dataService.deleteProductPrice(id);

    if (error) {
      this.errorMessage = error.message || 'Failed to delete price';
    } else {
      this.prices = this.prices.filter(p => p.id !== id);
      this.successMessage = 'Price deleted successfully';
      setTimeout(() => this.successMessage = '', 3000);
    }

    this.isLoading = false;
  }
}
