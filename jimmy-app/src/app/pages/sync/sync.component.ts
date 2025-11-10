import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-sync',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule
  ],
  templateUrl: './sync.component.html',
  styleUrl: './sync.component.css'
})
export class SyncComponent {
  isLoading = false;

  async onSync(): Promise<void> {
    this.isLoading = true;
    try {
      // Phase 2: Implement sync logic here
      console.log('Sync button clicked');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
    } finally {
      this.isLoading = false;
    }
  }
}
