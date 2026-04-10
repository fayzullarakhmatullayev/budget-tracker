import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardSummary } from '../../core/models';
import { SpinnerComponent } from '../../shared/components/spinner.component';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DecimalPipe, RouterLink, SpinnerComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private svc = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('trendChart') trendChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;

  loading = signal(true);
  summary = signal<DashboardSummary | null>(null);

  private trendChart?: Chart;
  private categoryChart?: Chart;

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

  ngOnInit() {
    this.svc.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
        this.cdr.detectChanges();
        // Render charts after the DOM has updated
        setTimeout(() => this.renderCharts(data), 0);
      },
      error: () => this.loading.set(false),
    });
  }

  renderCharts(data: DashboardSummary) {
    this.destroyCharts();

    if (this.trendChartRef?.nativeElement) {
      this.trendChart = new Chart(this.trendChartRef.nativeElement, {
        type: 'line',
        data: {
          labels: data.monthlyTrend.map((t) => `${this.months[t.month - 1]} ${t.year}`),
          datasets: [
            {
              label: 'Spending',
              data: data.monthlyTrend.map((t) => t.total),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.08)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#3b82f6',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } },
        },
      });
    }

    if (this.categoryChartRef?.nativeElement && data.categoryBreakdown.length) {
      const colors = data.categoryBreakdown.map((c) => c.color ?? '#6366f1');
      this.categoryChart = new Chart(this.categoryChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: data.categoryBreakdown.map((c) => c.name),
          datasets: [
            {
              data: data.categoryBreakdown.map((c) => c.totalSpent),
              backgroundColor: colors,
              borderWidth: 2,
              borderColor: '#fff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, padding: 16 } },
          },
        },
      });
    }
  }

  private destroyCharts() {
    this.trendChart?.destroy();
    this.categoryChart?.destroy();
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  budgetPercent(item: { totalSpent: number; monthlyLimit: number }): number {
    if (!item.monthlyLimit) return 0;
    return Math.min(100, Math.round((item.totalSpent / item.monthlyLimit) * 100));
  }

  clamp(val: number): number {
    return Math.min(100, Math.max(0, val));
  }
}
