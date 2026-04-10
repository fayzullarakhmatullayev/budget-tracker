import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Expense, Paginated } from '../models';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

export interface ExpenseFilter {
  categoryId?: string;
  budgetId?: string;
  month?: number;
  year?: number;
  page?: number;
  limit?: number;
}

export interface ExpensePayload {
  amount: number;
  description?: string;
  date: string;
  categoryId: string;
  budgetId?: string;
}

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private http = inject(HttpClient);

  getAll(filter: ExpenseFilter = {}) {
    let params = new HttpParams();
    if (filter.categoryId) params = params.set('categoryId', filter.categoryId);
    if (filter.budgetId) params = params.set('budgetId', filter.budgetId);
    if (filter.month) params = params.set('month', filter.month);
    if (filter.year) params = params.set('year', filter.year);
    if (filter.page) params = params.set('page', filter.page);
    if (filter.limit) params = params.set('limit', filter.limit);
    return this.http.get<Paginated<Expense>>(`${API}/expenses`, { params });
  }

  create(data: ExpensePayload) {
    return this.http.post<Expense>(`${API}/expenses`, data);
  }

  update(id: string, data: Partial<ExpensePayload>) {
    return this.http.patch<Expense>(`${API}/expenses/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<{ message: string }>(`${API}/expenses/${id}`);
  }
}
