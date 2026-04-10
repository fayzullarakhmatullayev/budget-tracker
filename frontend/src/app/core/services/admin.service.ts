import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

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
  private http = inject(HttpClient);

  getOverview() {
    return this.http.get<PlatformOverview>(`${API}/admin/overview`);
  }

  getUsers(page = 1, limit = 10, search?: string) {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get<{ data: AdminUser[]; total: number; page: number; limit: number }>(
      `${API}/admin/users`,
      { params },
    );
  }

  updateRole(userId: string, role: 'ADMIN' | 'USER') {
    return this.http.patch(`${API}/admin/users/${userId}/role`, { role });
  }

  deleteUser(userId: string) {
    return this.http.delete(`${API}/admin/users/${userId}`);
  }
}
