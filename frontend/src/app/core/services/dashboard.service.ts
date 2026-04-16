import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { DashboardSummary } from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private sb = inject(SupabaseService).client;

  getSummary(month?: number, year?: number): Observable<DashboardSummary> {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();

    return from(
      this.sb
        .rpc('get_dashboard_summary', { p_month: m, p_year: y })
        .then(({ data, error }) => {
          if (error) throw { error: { message: error.message } };
          return data as DashboardSummary;
        }),
    );
  }
}
