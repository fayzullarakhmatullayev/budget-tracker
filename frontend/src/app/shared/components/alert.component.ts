import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-alert',
  imports: [NgClass],
  template: `
    @if (message()) {
      <div
        class="px-4 py-3 rounded-lg text-sm font-medium"
        [ngClass]="{
          'bg-red-50 text-red-700 border border-red-200': type() === 'error',
          'bg-green-50 text-green-700 border border-green-200': type() === 'success',
          'bg-yellow-50 text-yellow-700 border border-yellow-200': type() === 'warning',
          'bg-blue-50 text-blue-700 border border-blue-200': type() === 'info',
        }"
      >
        {{ message() }}
      </div>
    }
  `,
})
export class AlertComponent {
  message = input<string>('');
  type = input<'error' | 'success' | 'warning' | 'info'>('error');
}
