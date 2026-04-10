import { Component, inject, signal, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ExpenseService, ExpensePayload } from '../../core/services/expense.service';
import { CategoryService } from '../../core/services/category.service';
import { BudgetService } from '../../core/services/budget.service';
import { Expense, Category, Budget } from '../../core/models';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { AlertComponent } from '../../shared/components/alert.component';

@Component({
  selector: 'app-expenses',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, SpinnerComponent, AlertComponent],
  templateUrl: './expenses.component.html',
})
export class ExpensesComponent implements OnInit {
  private expenseSvc = inject(ExpenseService);
  private categorySvc = inject(CategoryService);
  private budgetSvc = inject(BudgetService);
  private fb = inject(FormBuilder);

  expenses = signal<Expense[]>([]);
  categories = signal<Category[]>([]);
  budgets = signal<Budget[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  formError = signal('');
  saving = signal(false);
  total = signal(0);
  page = signal(1);
  readonly limit = 10;

  readonly currentMonth = new Date().getMonth() + 1;
  readonly currentYear = new Date().getFullYear();
  readonly months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  filterMonth = signal(this.currentMonth);
  filterYear = signal(this.currentYear);
  filterCategory = signal('');

  form = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: [''],
    date: [new Date().toISOString().split('T')[0], Validators.required],
    categoryId: ['', Validators.required],
    budgetId: [''],
  });

  ngOnInit() {
    this.categorySvc.getAll().subscribe((cats) => this.categories.set(cats));
    this.budgetSvc
      .getAll({ month: this.currentMonth, year: this.currentYear, limit: 100 })
      .subscribe((res) => this.budgets.set(res.data));
    this.loadExpenses();
  }

  loadExpenses() {
    this.loading.set(true);
    this.expenseSvc
      .getAll({
        month: this.filterMonth(),
        year: this.filterYear(),
        categoryId: this.filterCategory() || undefined,
        page: this.page(),
        limit: this.limit,
      })
      .subscribe({
        next: (res) => {
          this.expenses.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset({ date: new Date().toISOString().split('T')[0] });
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(e: Expense) {
    this.editingId.set(e.id);
    this.form.patchValue({
      amount: Number(e.amount),
      description: e.description ?? '',
      date: e.date.split('T')[0],
      categoryId: e.categoryId,
      budgetId: e.budgetId ?? '',
    });
    this.formError.set('');
    this.showForm.set(true);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    const v = this.form.value;
    const payload: ExpensePayload = {
      amount: v.amount!,
      description: v.description || undefined,
      date: new Date(v.date!).toISOString(),
      categoryId: v.categoryId!,
      budgetId: v.budgetId || undefined,
    };
    const request = this.editingId()
      ? this.expenseSvc.update(this.editingId()!, payload)
      : this.expenseSvc.create(payload);

    request.subscribe({
      next: () => {
        this.showForm.set(false);
        this.saving.set(false);
        this.loadExpenses();
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message ?? 'Failed to save expense');
        this.saving.set(false);
      },
    });
  }

  delete(id: string) {
    if (!confirm('Delete this expense?')) return;
    this.expenseSvc.delete(id).subscribe(() => this.loadExpenses());
  }

  get totalPages() {
    return Math.ceil(this.total() / this.limit);
  }

  changePage(p: number) {
    this.page.set(p);
    this.loadExpenses();
  }

  applyFilters() {
    this.page.set(1);
    this.loadExpenses();
  }
}
