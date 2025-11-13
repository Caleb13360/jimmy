import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, filter } from 'rxjs/operators';

export const loginGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth state to be initialized
  return authService.currentUser$.pipe(
    filter(user => user !== undefined), // Wait until we have a definite state
    take(1),
    map(user => {
      if (user) {
        // User is authenticated, redirect to analytics
        return router.parseUrl('/analytics');
      }
      // User is not authenticated, allow access to login page
      return true;
    })
  );
};
