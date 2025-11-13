import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
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
    ToolbarModule
  ],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent implements OnInit {
  currentUser: User | null | undefined = undefined;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
    this.router.navigate(['/login']);
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
