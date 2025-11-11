import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { DataService } from '../../services/data.service';
import { Campaign } from '../../types/database.types';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    MessageModule,
    DialogModule,
    DatePickerModule,
    InputNumberModule,
    TagModule
  ],
  templateUrl: './campaigns.html',
  styleUrl: './campaigns.css',
})
export class Campaigns implements OnInit {
  campaigns: Campaign[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Dialog state
  showDialog = false;
  newCampaignName = '';
  newCampaignStartDate: Date | null = null;
  newCampaignDuration: number | null = null;

  constructor(private dataService: DataService) {}

  async ngOnInit(): Promise<void> {
    await this.loadCampaigns();
  }

  async loadCampaigns(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    const { data, error } = await this.dataService.getCampaigns();

    if (error) {
      this.errorMessage = error.message || 'Failed to load campaigns';
    } else {
      this.campaigns = data || [];
    }

    this.isLoading = false;
  }

  openAddDialog(): void {
    this.newCampaignName = '';
    this.newCampaignStartDate = null;
    this.newCampaignDuration = null;
    this.errorMessage = '';
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  async addCampaign(): Promise<void> {
    if (!this.newCampaignName.trim()) {
      this.errorMessage = 'Campaign name is required';
      return;
    }

    if (!this.newCampaignStartDate) {
      this.errorMessage = 'Start date is required';
      return;
    }

    if (!this.newCampaignDuration || this.newCampaignDuration <= 0) {
      this.errorMessage = 'Duration must be greater than 0';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Format date as YYYY-MM-DD using local timezone
    const year = this.newCampaignStartDate.getFullYear();
    const month = String(this.newCampaignStartDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.newCampaignStartDate.getDate()).padStart(2, '0');
    const startDate = `${year}-${month}-${day}`;

    const { data, error } = await this.dataService.createCampaign(
      this.newCampaignName.trim(),
      startDate,
      this.newCampaignDuration
    );

    if (error) {
      this.errorMessage = error.message || 'Failed to create campaign';
    } else if (data) {
      await this.loadCampaigns();
      this.successMessage = 'Campaign added successfully';
      setTimeout(() => this.successMessage = '', 3000);
      this.closeDialog();
    }

    this.isLoading = false;
  }

  async deleteCampaign(id: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this campaign? All daily spend records will also be deleted.')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { error } = await this.dataService.deleteCampaign(id);

    if (error) {
      this.errorMessage = error.message || 'Failed to delete campaign';
    } else {
      this.campaigns = this.campaigns.filter(c => c.id !== id);
      this.successMessage = 'Campaign deleted successfully';
      setTimeout(() => this.successMessage = '', 3000);
    }

    this.isLoading = false;
  }

  getCampaignStatus(campaign: Campaign): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Parse date as local time (YYYY-MM-DD)
    const [year, month, day] = campaign.start_date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    const startTime = startDate.getTime();

    const endDate = new Date(year, month - 1, day);
    endDate.setDate(endDate.getDate() + campaign.duration_days - 1);
    const endTime = endDate.getTime();

    if (todayTime < startTime) {
      return 'Upcoming';
    } else if (todayTime <= endTime) {
      return 'Active';
    } else {
      return 'Completed';
    }
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'secondary' {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Upcoming':
        return 'info';
      case 'Completed':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  getEndDate(campaign: Campaign): string {
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + campaign.duration_days - 1);
    return endDate.toISOString().split('T')[0];
  }

  getTotalSpend(campaign: any): number {
    if (!campaign.campaign_daily_spend || !Array.isArray(campaign.campaign_daily_spend)) {
      return 0;
    }
    return campaign.campaign_daily_spend.reduce((total: number, spend: any) => {
      return total + (spend.amount || 0);
    }, 0);
  }
}
