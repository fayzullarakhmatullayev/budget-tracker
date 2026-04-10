import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Budget, Paginated } from '../models';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

export interface BudgetFilter {
  month?: number;
  year?: number;
  page?: number;
  limit?: number;
}

export interface BudgetPayload {
  name: string;
  monthlyLimit: number;
  month: number;
  year: number;
  categoryId: string;
}

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private http = inject(HttpClient);

  getAll(filter: BudgetFilter = {}) {
    let params = new HttpParams();
    if (filter.month) params = params.set('month', filter.month);
    if (filter.year) params = params.set('year', filter.year);
    if (filter.page) params = params.set('page', filter.page);
    if (filter.limit) params = params.set('limit', filter.limit);
    return this.http.get<Paginated<Budget>>(`${API}/budgets`, { params });
  }

  getOne(id: string) {
    return this.http.get<Budget>(`${API}/budgets/${id}`);
  }

  create(data: BudgetPayload) {
    return this.http.post<Budget>(`${API}/budgets`, data);
  }

  update(id: string, data: Partial<BudgetPayload>) {
    return this.http.patch<Budget>(`${API}/budgets/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<{ message: string }>(`${API}/budgets/${id}`);
  }
}
