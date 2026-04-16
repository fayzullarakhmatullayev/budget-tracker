import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { from, Observable, map } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { User, Role } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private sb = inject(SupabaseService).client;
  private router = inject(Router);

  private _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  constructor() {
    // Restore session on app start
    this.sb.auth.getSession().then(({ data }) => {
      if (data.session?.user) this.loadProfile(data.session.user.id);
    });
    // Keep state in sync across tabs / token refresh
    this.sb.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        this.loadProfile(session.user.id);
      } else {
        this._user.set(null);
      }
    });
  }

  register(name: string, email: string, password: string): Observable<void> {
    return from(
      this.sb.auth
        .signUp({ email, password, options: { data: { name } } })
        .then(async ({ data, error }) => {
          if (error) throw { error: { message: error.message } };
          if (data.user) await this.loadProfile(data.user.id);
        }),
    );
  }

  login(email: string, password: string): Observable<void> {
    return from(
      this.sb.auth
        .signInWithPassword({ email, password })
        .then(async ({ data, error }) => {
          if (error) throw { error: { message: error.message } };
          if (data.user) await this.loadProfile(data.user.id);
        }),
    );
  }

  logout(): void {
    this.sb.auth.signOut();
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  private async loadProfile(userId: string): Promise<void> {
    const [{ data: profile }, { data: authData }] = await Promise.all([
      this.sb
        .from('profiles')
        .select('id, name, role, created_at, updated_at')
        .eq('id', userId)
        .single(),
      this.sb.auth.getUser(),
    ]);

    if (profile && authData.user) {
      this._user.set({
        id: profile.id,
        email: authData.user.email!,
        name: profile.name,
        role: profile.role as Role,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      });
    }
  }
}
