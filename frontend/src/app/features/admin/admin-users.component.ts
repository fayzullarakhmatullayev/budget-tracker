import { Component, inject, signal, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService, AdminUser, PlatformOverview } from '../../core/services/admin.service';
import { SpinnerComponent } from '../../shared/components/spinner.component';

@Component({
  selector: 'app-admin-users',
  imports: [CurrencyPipe, DatePipe, NgClass, FormsModule, SpinnerComponent],
  templateUrl: './admin-users.component.html',
})
export class AdminUsersComponent implements OnInit {
  private svc = inject(AdminService);

  overview = signal<PlatformOverview | null>(null);
  users = signal<AdminUser[]>([]);
  total = signal(0);
  page = signal(1);
  readonly limit = 8;

  loadingOverview = signal(true);
  loadingUsers = signal(true);
  searchQuery = signal('');
  searchInput = '';

  selectedUser = signal<AdminUser | null>(null);

  ngOnInit() {
    this.loadOverview();
    this.loadUsers();
  }

  loadOverview() {
    this.loadingOverview.set(true);
    this.svc.getOverview().subscribe({
      next: (d) => {
        this.overview.set(d);
        this.loadingOverview.set(false);
      },
      error: () => this.loadingOverview.set(false),
    });
  }

  loadUsers() {
    this.loadingUsers.set(true);
    this.svc.getUsers(this.page(), this.limit, this.searchQuery() || undefined).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.total.set(res.total);
        this.loadingUsers.set(false);
      },
      error: () => this.loadingUsers.set(false),
    });
  }

  search() {
    this.searchQuery.set(this.searchInput);
    this.page.set(1);
    this.loadUsers();
  }

  clearSearch() {
    this.searchInput = '';
    this.searchQuery.set('');
    this.page.set(1);
    this.loadUsers();
  }

  changePage(p: number) {
    this.page.set(p);
    this.loadUsers();
  }

  toggleRole(user: AdminUser) {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`Change ${user.name}'s role to ${newRole}?`)) return;
    this.svc.updateRole(user.id, newRole).subscribe({
      next: () => this.loadUsers(),
      error: (e: HttpErrorResponse) => alert(e.error?.message ?? 'Failed to update role'),
    });
  }

  deleteUser(user: AdminUser) {
    if (!confirm(`Delete ${user.name}? This will remove all their data permanently.`)) return;
    this.svc.deleteUser(user.id).subscribe({
      next: () => {
        this.loadUsers();
        this.loadOverview();
      },
      error: (e: HttpErrorResponse) => alert(e.error?.message ?? 'Failed to delete user'),
    });
  }

  get totalPages() {
    return Math.ceil(this.total() / this.limit);
  }

  initials(name: string) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  budgetUtilization(user: AdminUser): number {
    if (!user.stats.thisMonthBudgeted) return 0;
    return Math.min(
      100,
      Math.round((user.stats.thisMonthSpent / user.stats.thisMonthBudgeted) * 100),
    );
  }

  spendingChangeClass(change: number | null): string {
    if (change === null) return 'text-gray-500';
    return change > 0 ? 'text-red-600' : 'text-green-600';
  }

  spendingChangeLabel(change: number | null): string {
    if (change === null) return 'No data';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change}% vs last month`;
  }
}
