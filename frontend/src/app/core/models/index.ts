export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  name: string;
  monthlyLimit: number | string;
  month: number;
  year: number;
  userId: string;
  categoryId: string;
  category: Category;
  expenses: { amount: number | string }[];
  totalSpent: number;
  remaining: number;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  amount: number | string;
  description?: string;
  date: string;
  userId: string;
  categoryId: string;
  budgetId?: string;
  category: Category;
  budget?: { id: string; name: string; monthlyLimit: number | string };
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardSummary {
  period: { month: number; year: number };
  totals: {
    spent: number;
    budgeted: number;
    remaining: number;
    expenseCount: number;
    budgetCount: number;
  };
  categoryBreakdown: (Category & { totalSpent: number })[];
  budgetVsActual: {
    id: string;
    name: string;
    category: Category;
    monthlyLimit: number;
    totalSpent: number;
    remaining: number;
  }[];
  monthlyTrend: { month: number; year: number; total: number }[];
}

export interface ApiError {
  statusCode: number;
  message: string;
  field?: string;
}
