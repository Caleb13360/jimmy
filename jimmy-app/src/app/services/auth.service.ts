import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  private currentUserSubject: BehaviorSubject<User | null | undefined>;
  public currentUser$: Observable<User | null | undefined>;
  private authInitialized = false;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );

    // Start with undefined to indicate "not yet initialized"
    this.currentUserSubject = new BehaviorSubject<User | null | undefined>(undefined);
    this.currentUser$ = this.currentUserSubject.asObservable();

    // Initialize auth state
    this.initializeAuthState();
  }

  private async initializeAuthState(): Promise<void> {
    const { data: { session } } = await this.supabase.auth.getSession();
    this.currentUserSubject.next(session?.user ?? null);
    this.authInitialized = true;

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUserSubject.next(session?.user ?? null);
    });
  }

  async signInWithEmail(email: string, password: string): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  }

  async signUpWithEmail(email: string, password: string): Promise<{ error: any }> {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;

    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo
      }
    });
    return { error };
  }

  async signOut(): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }

  getCurrentUser(): User | null | undefined {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    // Return false if not initialized yet or if user is null
    return this.authInitialized && this.currentUserSubject.value !== null;
  }
}
