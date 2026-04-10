import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

let isRefreshing = false;

function addBearer(req: HttpRequest<unknown>, token: string) {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function clearAndRedirect(router: Router) {
  localStorage.clear();
  router.navigate(['/auth/login']);
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  const accessToken = localStorage.getItem('accessToken');
  const authedReq = accessToken ? addBearer(req, accessToken) : req;

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Only attempt refresh on 401, and not on the auth endpoints themselves
      const isAuthRoute = req.url.includes('/auth/login') ||
                          req.url.includes('/auth/register') ||
                          req.url.includes('/auth/refresh');

      if (err.status !== 401 || isAuthRoute || isRefreshing) {
        if (err.status === 401) {
          clearAndRedirect(router);
        }
        return throwError(() => err);
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        clearAndRedirect(router);
        return throwError(() => err);
      }

      isRefreshing = true;

      return http.post<{ accessToken: string; refreshToken: string }>(
        `${environment.apiUrl}/auth/refresh`,
        { refreshToken },
      ).pipe(
        switchMap((tokens) => {
          isRefreshing = false;
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
          // Retry the original request with the new access token
          return next(addBearer(req, tokens.accessToken));
        }),
        catchError((refreshErr) => {
          isRefreshing = false;
          clearAndRedirect(router);
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
