import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const adminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const sb = inject(SupabaseService).client;

  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) {
    router.navigate(['/auth/login']);
    return false;
  }

  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', sessionData.session.user.id)
    .single();

  if (profile?.role === 'ADMIN') return true;
  router.navigate(['/dashboard']);
  return false;
};
