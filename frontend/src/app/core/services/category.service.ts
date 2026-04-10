import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Category } from '../models';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<Category[]>(`${API}/categories`);
  }

  create(data: { name: string; icon?: string; color?: string }) {
    return this.http.post<Category>(`${API}/categories`, data);
  }

  update(id: string, data: Partial<{ name: string; icon: string; color: string }>) {
    return this.http.patch<Category>(`${API}/categories/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<{ message: string }>(`${API}/categories/${id}`);
  }
}
