import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
})
export class LayoutComponent {
  auth = inject(AuthService);
  sidebarOpen = signal(true);

  navItems = [
    { label: 'Dashboard', icon: '📊', route: '/dashboard', adminOnly: false },
    { label: 'Budgets', icon: '💰', route: '/budgets', adminOnly: false },
    { label: 'Expenses', icon: '💸', route: '/expenses', adminOnly: false },
    { label: 'Categories', icon: '🏷️', route: '/categories', adminOnly: false },
    { label: 'Admin Panel', icon: '🛡️', route: '/admin', adminOnly: true },
  ];
}
