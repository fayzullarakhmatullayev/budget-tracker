import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { User, AuthResponse } from '../models';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<User | null>(this.loadUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  private loadUser(): User | null {
    try {
      const s = localStorage.getItem('user');
      return s ? (JSON.parse(s) as User) : null;
    } catch {
      return null;
    }
  }

  register(name: string, email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${API}/auth/register`, { name, email, password })
      .pipe(tap((res) => this.handleAuth(res)));
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${API}/auth/login`, { email, password })
      .pipe(tap((res) => this.handleAuth(res)));
  }

  logout() {
    this.http.post(`${API}/auth/logout`, {}).subscribe({ error: () => {} });
    this.clearAuth();
    this.router.navigate(['/auth/login']);
  }

  private handleAuth(res: AuthResponse) {
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    this._user.set(res.user);
  }

  private clearAuth() {
    localStorage.clear();
    this._user.set(null);
  }
}
