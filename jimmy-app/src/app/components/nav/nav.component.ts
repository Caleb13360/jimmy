import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { User } from '@supabase/supabase-js';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AvatarModule,
    ButtonModule,
    MenubarModule
  ],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent implements OnInit {
  items: MenuItem[] = [];
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.items = [
      {
        label: 'Sync',
        icon: 'pi pi-sync',
        routerLink: '/sync'
      },
      {
        label: 'Test',
        icon: 'pi pi-file',
        routerLink: '/test'
      }
    ];

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
    this.router.navigate(['/']);
  }

  getUserInitials(): string {
    if (!this.currentUser?.user_metadata?.['full_name']) {
      return this.currentUser?.email?.charAt(0).toUpperCase() || 'U';
    }
    const names = this.currentUser.user_metadata['full_name'].split(' ');
    return names.map((n: string) => n.charAt(0).toUpperCase()).join('');
  }

  getUserName(): string {
    return this.currentUser?.user_metadata?.['full_name'] ||
           this.currentUser?.email ||
           'User';
  }
}
