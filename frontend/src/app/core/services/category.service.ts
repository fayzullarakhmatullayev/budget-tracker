import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Category } from '../models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private sb = inject(SupabaseService).client;

  getAll(): Observable<Category[]> {
    return from(
      this.sb
        .from('categories')
        .select('*')
        .order('name', { ascending: true })
        .then(({ data, error }) => {
          if (error) throw { error: { message: error.message } };
          return (data ?? []).map((r) => this.mapCategory(r));
        }),
    );
  }

  create(payload: { name: string; icon?: string; color?: string }): Observable<Category> {
    return from(
      this.sb
        .from('categories')
        .insert(payload)
        .select('*')
        .single()
        .then(({ data, error }) => {
          if (error) throw { error: { message: error.message } };
          return this.mapCategory(data);
        }),
    );
  }

  update(id: string, payload: Partial<{ name: string; icon: string; color: string }>): Observable<Category> {
    return from(
      this.sb
        .from('categories')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()
        .then(({ data, error }) => {
          if (error) throw { error: { message: error.message } };
          return this.mapCategory(data);
        }),
    );
  }

  delete(id: string): Observable<{ message: string }> {
    return from(
      this.sb
        .from('categories')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) throw { error: { message: error.message } };
          return { message: 'Category deleted' };
        }),
    );
  }

  private mapCategory(row: Record<string, any>): Category {
    return {
      id: row['id'],
      name: row['name'],
      icon: row['icon'],
      color: row['color'],
      createdAt: row['created_at'],
    };
  }
}
