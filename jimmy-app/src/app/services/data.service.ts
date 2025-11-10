import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  // Phase 2: Implement CRUD operations for your tables
  // Example methods:
  // async getRecords(tableName: string) { ... }
  // async createRecord(tableName: string, data: any) { ... }
  // async updateRecord(tableName: string, id: string, data: any) { ... }
  // async deleteRecord(tableName: string, id: string) { ... }
}
