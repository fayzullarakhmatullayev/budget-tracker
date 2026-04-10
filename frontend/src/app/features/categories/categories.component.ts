import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CategoryService } from '../../core/services/category.service';
import { AuthService } from '../../core/services/auth.service';
import { Category } from '../../core/models';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { AlertComponent } from '../../shared/components/alert.component';

@Component({
  selector: 'app-categories',
  imports: [ReactiveFormsModule, SpinnerComponent, AlertComponent],
  templateUrl: './categories.component.html',
})
export class CategoriesComponent implements OnInit {
  private svc = inject(CategoryService);
  auth = inject(AuthService);
  private fb = inject(FormBuilder);

  categories = signal<Category[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  formError = signal('');
  saving = signal(false);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    icon: [''],
    color: ['#6366f1'],
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset({ color: '#6366f1' });
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(c: Category) {
    this.editingId.set(c.id);
    this.form.patchValue({ name: c.name, icon: c.icon ?? '', color: c.color ?? '#6366f1' });
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
    const v = this.form.value as { name: string; icon?: string; color?: string };
    const request = this.editingId() ? this.svc.update(this.editingId()!, v) : this.svc.create(v);

    request.subscribe({
      next: () => {
        this.showForm.set(false);
        this.saving.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message ?? 'Failed to save category');
        this.saving.set(false);
      },
    });
  }

  delete(id: string) {
    if (!confirm('Delete this category? This may affect linked budgets and expenses.')) return;
    this.svc.delete(id).subscribe(() => this.load());
  }
}
