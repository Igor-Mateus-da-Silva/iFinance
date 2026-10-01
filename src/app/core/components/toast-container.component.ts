import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastService, ToastItem } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-white border shadow-lg shadow-gray-200/50 transition-all duration-300 animate-in fade-in slide-in-from-top-2"
          [class.border-emerald-200]="toast.type === 'success'"
          [class.border-rose-200]="toast.type === 'error'"
          [class.border-blue-200]="toast.type === 'info'"
          [class.border-amber-200]="toast.type === 'warning'">
          
          <!-- Ícone Semântico -->
          <div class="shrink-0 mt-0.5">
            @if (toast.type === 'success') {
              <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            } @else if (toast.type === 'error') {
              <div class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            } @else if (toast.type === 'warning') {
              <div class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            } @else {
              <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            }
          </div>

          <!-- Textos do Alerta -->
          <div class="flex-1 min-w-0">
            @if (toast.title) {
              <h4 class="text-xs font-bold text-gray-900 tracking-tight">{{ toast.title }}</h4>
            }
            <p class="text-xs text-gray-600 leading-relaxed break-words" [class.mt-0.5]="toast.title">
              {{ toast.message }}
            </p>
          </div>

          <!-- Botão Fechar -->
          <button
            type="button"
            (click)="toastService.remove(toast.id)"
            class="shrink-0 p-1 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Fechar notificação">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
}
