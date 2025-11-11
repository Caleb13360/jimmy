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
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { MenuItem } from 'primeng/api';
import { DataService } from '../../services/data.service';
import { Campaign, CampaignDailySpend } from '../../types/database.types';

@Component({
  selector: 'app-campaign-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputNumberModule,
    CardModule,
    MessageModule,
    BreadcrumbModule,
    DialogModule,
    DatePickerModule
  ],
  templateUrl: './campaign-details.html',
  styleUrl: './campaign-details.css',
})
export class CampaignDetails implements OnInit {
  campaignId: string = '';
  campaign: Campaign | null = null;
  dailySpends: CampaignDailySpend[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  breadcrumbItems: MenuItem[] = [];

  // CPM editing
  editableCpm: number | null = null;
  isSavingCpm = false;

  // Edit daily spend dialog
  showDialog = false;
  editingSpendId: string = '';
  editingSpendDate: string = '';
  editingSpendAmount: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService
  ) {}

  async ngOnInit(): Promise<void> {
    this.campaignId = this.route.snapshot.paramMap.get('id') || '';

    if (!this.campaignId) {
      this.router.navigate(['/campaigns']);
      return;
    }

    await this.loadCampaign();
    await this.loadDailySpends();
  }

  async loadCampaign(): Promise<void> {
    const { data, error } = await this.dataService.getCampaign(this.campaignId);

    if (error || !data) {
      this.errorMessage = 'Failed to load campaign';
      setTimeout(() => this.router.navigate(['/campaigns']), 2000);
    } else {
      this.campaign = data;
      this.editableCpm = data.cpm;
      this.breadcrumbItems = [
        { label: 'Campaigns', routerLink: '/campaigns' },
        { label: this.campaign.name }
      ];
    }
  }

  async loadDailySpends(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    const { data, error } = await this.dataService.getCampaignDailySpend(this.campaignId);

    if (error) {
      this.errorMessage = error.message || 'Failed to load daily spend';
    } else {
      this.dailySpends = data || [];
    }

    this.isLoading = false;
  }

  async saveCpm(): Promise<void> {
    if (!this.campaign) return;

    this.isSavingCpm = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { data, error } = await this.dataService.updateCampaign(this.campaign.id, {
      cpm: this.editableCpm
    });

    if (error) {
      this.errorMessage = error.message || 'Failed to update CPM';
    } else if (data) {
      this.campaign = data;
      this.successMessage = 'CPM updated successfully';
      setTimeout(() => this.successMessage = '', 3000);
    }

    this.isSavingCpm = false;
  }

  openEditSpendDialog(spend: CampaignDailySpend): void {
    this.editingSpendId = spend.id;
    this.editingSpendDate = new Date(spend.spend_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    this.editingSpendAmount = spend.amount;
    this.errorMessage = '';
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.editingSpendId = '';
    this.editingSpendDate = '';
    this.editingSpendAmount = null;
  }

  async updateDailySpend(): Promise<void> {
    if (this.editingSpendAmount === null || this.editingSpendAmount < 0) {
      this.errorMessage = 'Amount must be 0 or greater';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Find the spend record to get the date
    const spendRecord = this.dailySpends.find(s => s.id === this.editingSpendId);
    if (!spendRecord) {
      this.errorMessage = 'Spend record not found';
      this.isLoading = false;
      return;
    }

    const { data, error } = await this.dataService.upsertDailySpend(
      this.campaignId,
      spendRecord.spend_date,
      this.editingSpendAmount
    );

    if (error) {
      this.errorMessage = error.message || 'Failed to update daily spend';
    } else if (data) {
      await this.loadDailySpends();
      this.successMessage = 'Daily spend updated successfully';
      setTimeout(() => this.successMessage = '', 3000);
      this.closeDialog();
    }

    this.isLoading = false;
  }

  getTotalSpend(): number {
    return this.dailySpends.reduce((total, spend) => total + (spend.amount || 0), 0);
  }

  getEndDate(): string {
    if (!this.campaign) return '';
    const startDate = new Date(this.campaign.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + this.campaign.duration_days - 1);
    return endDate.toISOString().split('T')[0];
  }
}
