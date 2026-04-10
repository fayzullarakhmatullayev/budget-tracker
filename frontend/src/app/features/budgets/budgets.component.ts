import { Component, inject, signal, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BudgetService, BudgetPayload } from '../../core/services/budget.service';
import { CategoryService } from '../../core/services/category.service';
import { Budget, Category } from '../../core/models';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { AlertComponent } from '../../shared/components/alert.component';

@Component({
  selector: 'app-budgets',
  imports: [CurrencyPipe, ReactiveFormsModule, SpinnerComponent, AlertComponent],
  templateUrl: './budgets.component.html',
})
export class BudgetsComponent implements OnInit {
  private budgetSvc = inject(BudgetService);
  private categorySvc = inject(CategoryService);
  private fb = inject(FormBuilder);

  budgets = signal<Budget[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  formError = signal('');
  formSuccess = signal('');
  saving = signal(false);

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

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    monthlyLimit: [null as number | null, [Validators.required, Validators.min(1)]],
    month: [this.currentMonth, [Validators.required, Validators.min(1), Validators.max(12)]],
    year: [this.currentYear, [Validators.required, Validators.min(2000)]],
    categoryId: ['', Validators.required],
  });

  ngOnInit() {
    this.categorySvc.getAll().subscribe((cats) => this.categories.set(cats));
    this.loadBudgets();
  }

  loadBudgets() {
    this.loading.set(true);
    this.budgetSvc.getAll({ month: this.filterMonth(), year: this.filterYear() }).subscribe({
      next: (res) => {
        this.budgets.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset({
      month: this.currentMonth,
      year: this.currentYear,
    });
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(b: Budget) {
    this.editingId.set(b.id);
    this.form.patchValue({
      name: b.name,
      monthlyLimit: Number(b.monthlyLimit),
      month: b.month,
      year: b.year,
      categoryId: b.categoryId,
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
    const payload = this.form.value as BudgetPayload;
    const request = this.editingId()
      ? this.budgetSvc.update(this.editingId()!, payload)
      : this.budgetSvc.create(payload);

    request.subscribe({
      next: () => {
        this.showForm.set(false);
        this.saving.set(false);
        this.loadBudgets();
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message ?? 'Failed to save budget');
        this.saving.set(false);
      },
    });
  }

  delete(id: string) {
    if (!confirm('Delete this budget?')) return;
    this.budgetSvc.delete(id).subscribe(() => this.loadBudgets());
  }

  budgetPercent(b: Budget): number {
    const limit = Number(b.monthlyLimit);
    if (!limit) return 0;
    return Math.min(100, Math.round((b.totalSpent / limit) * 100));
  }
}
