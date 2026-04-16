import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Budget, Category, Paginated } from '../models';

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
  private sb = inject(SupabaseService).client;

  getAll(filter: BudgetFilter = {}): Observable<Paginated<Budget>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const rangeFrom = (page - 1) * limit;
    const rangeTo = rangeFrom + limit - 1;

    return from(
      (async () => {
        let query = this.sb
          .from('budgets')
          .select('*, category:categories(*), expenses(amount)', { count: 'exact' })
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .range(rangeFrom, rangeTo);

        if (filter.month) query = query.eq('month', filter.month);
        if (filter.year) query = query.eq('year', filter.year);

        const { data, error, count } = await query;
        if (error) throw { error: { message: error.message } };

        return {
          data: (data ?? []).map((r) => this.mapBudget(r)),
          total: count ?? 0,
          page,
          limit,
        } as Paginated<Budget>;
      })(),
    );
  }

  getOne(id: string): Observable<Budget> {
    return from(
      this.sb
        .from('budgets')
        .select('*, category:categories(*), expenses(amount)')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error) throw { error: { message: error.message } };
          return this.mapBudget(data);
        }),
    );
  }

  create(payload: BudgetPayload): Observable<Budget> {
    return from(
      this.sb
        .from('budgets')
        .insert({
          name: payload.name,
          monthly_limit: payload.monthlyLimit,
          month: payload.month,
          year: payload.year,
          category_id: payload.categoryId,
        })
        .select('*, category:categories(*), expenses(amount)')
        .single()
        .then(({ data, error }) => {
          if (error) throw { error: { message: error.message } };
          return this.mapBudget(data);
        }),
    );
  }

  update(id: string, payload: Partial<BudgetPayload>): Observable<Budget> {
    const patch: Record<string, unknown> = {};
    if (payload.name !== undefined) patch['name'] = payload.name;
    if (payload.monthlyLimit !== undefined) patch['monthly_limit'] = payload.monthlyLimit;
    if (payload.month !== undefined) patch['month'] = payload.month;
    if (payload.year !== undefined) patch['year'] = payload.year;
    if (payload.categoryId !== undefined) patch['category_id'] = payload.categoryId;

    return from(
      this.sb
        .from('budgets')
        .update(patch)
        .eq('id', id)
        .select('*, category:categories(*), expenses(amount)')
        .single()
        .then(({ data, error }) => {
          if (error) throw { error: { message: error.message } };
          return this.mapBudget(data);
        }),
    );
  }

  delete(id: string): Observable<{ message: string }> {
    return from(
      this.sb
        .from('budgets')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) throw { error: { message: error.message } };
          return { message: 'Budget deleted' };
        }),
    );
  }

  private mapBudget(row: Record<string, any>): Budget {
    const expenses: { amount: number | string }[] = row['expenses'] ?? [];
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const monthlyLimit = Number(row['monthly_limit']);
    return {
      id: row['id'],
      name: row['name'],
      monthlyLimit,
      month: row['month'],
      year: row['year'],
      userId: row['user_id'],
      categoryId: row['category_id'],
      category: row['category'] ? this.mapCategory(row['category']) : (undefined as unknown as Category),
      expenses,
      totalSpent,
      remaining: monthlyLimit - totalSpent,
      createdAt: row['created_at'],
      updatedAt: row['updated_at'],
    };
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
