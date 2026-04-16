import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const sb = inject(SupabaseService).client;
  const { data } = await sb.auth.getSession();
  if (data.session) return true;
  router.navigate(['/auth/login']);
  return false;
};

export const guestGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const sb = inject(SupabaseService).client;
  const { data } = await sb.auth.getSession();
  if (!data.session) return true;
  router.navigate(['/dashboard']);
  return false;
};
