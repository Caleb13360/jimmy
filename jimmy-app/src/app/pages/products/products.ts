import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { DataService } from '../../services/data.service';
import { Product } from '../../types/database.types';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    MessageModule
  ],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit {
  products: any[] = [];
  newProductName = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private dataService: DataService) {}

  async ngOnInit(): Promise<void> {
    await this.loadProducts();
  }

  async loadProducts(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    const { data, error } = await this.dataService.getProducts();

    if (error) {
      this.errorMessage = error.message || 'Failed to load products';
    } else {
      this.products = data || [];
    }

    this.isLoading = false;
  }

  async addProduct(): Promise<void> {
    if (!this.newProductName.trim()) {
      this.errorMessage = 'Product name is required';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { data, error } = await this.dataService.createProduct(this.newProductName.trim());

    if (error) {
      this.errorMessage = error.message || 'Failed to create product';
    } else if (data) {
      // Reload products to get the updated count
      await this.loadProducts();
      this.newProductName = '';
      this.successMessage = 'Product added successfully';
      setTimeout(() => this.successMessage = '', 3000);
    }

    this.isLoading = false;
  }

  async deleteProduct(id: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { error } = await this.dataService.deleteProduct(id);

    if (error) {
      this.errorMessage = error.message || 'Failed to delete product';
    } else {
      this.products = this.products.filter(p => p.id !== id);
      this.successMessage = 'Product deleted successfully';
      setTimeout(() => this.successMessage = '', 3000);
    }

    this.isLoading = false;
  }
}
