import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Expense, Paginated } from '../models';

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

const EXPENSE_SELECT = '*, category:categories(*), budget:budgets(id, name, monthly_limit)';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private sb = inject(SupabaseService).client;

  getAll(filter: ExpenseFilter = {}): Observable<Paginated<Expense>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const rangeFrom = (page - 1) * limit;
    const rangeTo = rangeFrom + limit - 1;

    return from(
      (async () => {
        let query = this.sb
          .from('expenses')
          .select(EXPENSE_SELECT, { count: 'exact' })
          .order('date', { ascending: false })
          .range(rangeFrom, rangeTo);

        if (filter.categoryId) query = query.eq('category_id', filter.categoryId);
        if (filter.budgetId) query = query.eq('budget_id', filter.budgetId);

        if (filter.month || filter.year) {
          const year = filter.year ?? new Date().getFullYear();
          const month = filter.month;
          if (month) {
            const from = new Date(year, month - 1, 1).toISOString();
            const to = new Date(year, month, 1).toISOString();
            query = query.gte('date', from).lt('date', to);
          } else {
            const from = new Date(year, 0, 1).toISOString();
            const to = new Date(year + 1, 0, 1).toISOString();
            query = query.gte('date', from).lt('date', to);
          }
        }

        const { data, error, count } = await query;
        if (error) throw { error: { message: error.message } };

        return {
          data: (data ?? []).map((r) => this.mapExpense(r)),
          total: count ?? 0,
          page,
          limit,
        } as Paginated<Expense>;
      })(),
    );
  }

  create(payload: ExpensePayload): Observable<Expense> {
    return from(
      (async () => {
        const { data: { session } } = await this.sb.auth.getSession();
        if (!session) throw { error: { message: 'Not authenticated' } };
        const { data, error } = await this.sb
          .from('expenses')
          .insert({
            amount: payload.amount,
            description: payload.description,
            date: payload.date,
            category_id: payload.categoryId,
            budget_id: payload.budgetId ?? null,
            user_id: session.user.id,
          })
          .select(EXPENSE_SELECT)
          .single();
        if (error) throw { error: { message: error.message } };
        return this.mapExpense(data);
      })(),
    );
  }

  update(id: string, payload: Partial<ExpensePayload>): Observable<Expense> {
    const patch: Record<string, unknown> = {};
    if (payload.amount !== undefined) patch['amount'] = payload.amount;
    if (payload.description !== undefined) patch['description'] = payload.description;
    if (payload.date !== undefined) patch['date'] = payload.date;
    if (payload.categoryId !== undefined) patch['category_id'] = payload.categoryId;
    if ('budgetId' in payload) patch['budget_id'] = payload.budgetId ?? null;

    return from(
      this.sb
        .from('expenses')
        .update(patch)
        .eq('id', id)
        .select(EXPENSE_SELECT)
        .single()
        .then(({ data, error }) => {
          if (error) throw { error: { message: error.message } };
          return this.mapExpense(data);
        }),
    );
  }

  delete(id: string): Observable<{ message: string }> {
    return from(
      this.sb
        .from('expenses')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) throw { error: { message: error.message } };
          return { message: 'Expense deleted' };
        }),
    );
  }

  private mapExpense(row: Record<string, any>): Expense {
    return {
      id: row['id'],
      amount: row['amount'],
      description: row['description'],
      date: row['date'],
      userId: row['user_id'],
      categoryId: row['category_id'],
      budgetId: row['budget_id'],
      category: row['category']
        ? { id: row['category']['id'], name: row['category']['name'], icon: row['category']['icon'], color: row['category']['color'], createdAt: row['category']['created_at'] }
        : undefined as any,
      budget: row['budget']
        ? { id: row['budget']['id'], name: row['budget']['name'], monthlyLimit: row['budget']['monthly_limit'] }
        : undefined,
      createdAt: row['created_at'],
      updatedAt: row['updated_at'],
    };
  }
}
