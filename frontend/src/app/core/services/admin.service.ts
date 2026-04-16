import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface PlatformOverview {
  users: { total: number; newThisMonth: number; activeThisMonth: number };
  budgets: { total: number; activeThisMonth: number; totalLimitThisMonth: number };
  expenses: {
    total: number;
    spentThisMonth: number;
    spentLastMonth: number;
    spendingChange: number | null;
  };
  topCategories: {
    id: string; name: string; icon?: string; color?: string;
    totalSpent: number; expenseCount: number;
  }[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  stats: {
    budgetCount: number;
    expenseCount: number;
    allTimeSpent: number;
    thisMonthSpent: number;
    thisMonthBudgeted: number;
    lastActiveAt: string | null;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private sb = inject(SupabaseService).client;

  getOverview(): Observable<PlatformOverview> {
    return from(
      this.sb
        .rpc('get_admin_overview')
        .then(({ data, error }) => {
          if (error) throw { error: { message: error.message } };
          return data as PlatformOverview;
        }),
    );
  }

  getUsers(
    page = 1,
    limit = 10,
    search?: string,
  ): Observable<{ data: AdminUser[]; total: number; page: number; limit: number }> {
    return from(
      this.sb
        .rpc('get_admin_users', { p_page: page, p_limit: limit, p_search: search ?? null })
        .then(({ data, error }) => {
          if (error) throw { error: { message: error.message } };
          return data as { data: AdminUser[]; total: number; page: number; limit: number };
        }),
    );
  }

  updateRole(userId: string, role: 'ADMIN' | 'USER'): Observable<unknown> {
    return from(
      this.sb
        .rpc('admin_update_user_role', { p_user_id: userId, p_role: role })
        .then(({ data, error }) => {
          if (error) throw { error: { message: error.message } };
          return data;
        }),
    );
  }

  deleteUser(userId: string): Observable<unknown> {
    return from(
      this.sb
        .rpc('admin_delete_user', { p_user_id: userId })
        .then(({ error }) => {
          if (error) throw { error: { message: error.message } };
          return { message: 'User deleted' };
        }),
    );
  }
}
