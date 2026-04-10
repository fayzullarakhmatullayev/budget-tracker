import { Component } from '@angular/core';

@Component({
  selector: 'app-spinner',
  template: `
    <div class="flex justify-center items-center p-8">
      <div
        class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"
      ></div>
    </div>
  `,
})
export class SpinnerComponent {}
