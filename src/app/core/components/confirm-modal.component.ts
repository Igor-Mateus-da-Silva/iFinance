import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (toastService.confirmState().isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop Blur suave -->
        <div
          class="fixed inset-0 bg-gray-950/40 backdrop-blur-xs transition-opacity"
          (click)="onCancel()"></div>

        <!-- Conteúdo do Modal Minimalista -->
        <div
          class="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 z-10 transition-all transform animate-in fade-in zoom-in-95 duration-200">
          
          <div class="flex items-start gap-4">
            <!-- Ícone de Atenção / Ação -->
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              [class.bg-rose-50]="toastService.confirmState().isDestructive"
              [class.text-rose-600]="toastService.confirmState().isDestructive"
              [class.bg-blue-50]="!toastService.confirmState().isDestructive"
              [class.text-blue-600]="!toastService.confirmState().isDestructive">
              @if (toastService.confirmState().isDestructive) {
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              } @else {
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            </div>

            <!-- Textos -->
            <div class="flex-1 min-w-0">
              <h3 class="text-base font-bold text-gray-900 tracking-tight">
                {{ toastService.confirmState().title }}
              </h3>
              <p class="text-xs sm:text-sm text-gray-600 mt-1.5 leading-relaxed">
                {{ toastService.confirmState().message }}
              </p>
            </div>
          </div>

          <!-- Botões de Ação -->
          <div class="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              (click)="onCancel()"
              class="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all">
              {{ toastService.confirmState().cancelText || 'Cancelar' }}
            </button>

            <button
              type="button"
              (click)="onConfirm()"
              [class.bg-rose-600]="toastService.confirmState().isDestructive"
              [class.hover:bg-rose-700]="toastService.confirmState().isDestructive"
              [class.focus:ring-rose-500/20]="toastService.confirmState().isDestructive"
              [class.bg-blue-600]="!toastService.confirmState().isDestructive"
              [class.hover:bg-blue-700]="!toastService.confirmState().isDestructive"
              [class.focus:ring-blue-500/20]="!toastService.confirmState().isDestructive"
              class="px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs focus:outline-none focus:ring-2 transition-all">
              {{ toastService.confirmState().confirmText || 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmModalComponent {
  readonly toastService = inject(ToastService);

  onConfirm(): void {
    this.toastService.handleConfirmResponse(true);
  }

  onCancel(): void {
    this.toastService.handleConfirmResponse(false);
  }
}
