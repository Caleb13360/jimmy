import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    MessageModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  isLoading = false;
  isSignUp = false;
  email = '';
  password = '';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/sync']);
    }
  }

  async onSubmit(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const { error } = this.isSignUp
        ? await this.authService.signUpWithEmail(this.email, this.password)
        : await this.authService.signInWithEmail(this.email, this.password);

      if (error) {
        this.errorMessage = error.message || 'Authentication failed';
        console.error('Auth error:', error);
      } else {
        if (this.isSignUp) {
          this.errorMessage = 'Check your email to confirm your account';
        } else {
          this.router.navigate(['/sync']);
        }
      }
    } catch (err: any) {
      this.errorMessage = err.message || 'Unexpected error occurred';
      console.error('Unexpected error:', err);
    } finally {
      this.isLoading = false;
    }
  }

  toggleMode(): void {
    this.isSignUp = !this.isSignUp;
    this.errorMessage = '';
  }
}
