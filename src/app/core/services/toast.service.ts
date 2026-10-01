import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export interface ConfirmDialogState extends ConfirmDialogOptions {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);
  readonly confirmState = signal<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
  });

  show(message: string, type: ToastType = 'info', title?: string, duration: number = 4000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = { id, type, message, title, duration };

    this.toasts.update((current) => [...current, item]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(message: string, title: string = 'Sucesso'): void {
    this.show(message, 'success', title);
  }

  error(message: string, title: string = 'Atenção'): void {
    this.show(message, 'error', title, 5000);
  }

  info(message: string, title: string = 'Informação'): void {
    this.show(message, 'info', title);
  }

  warning(message: string, title: string = 'Aviso'): void {
    this.show(message, 'warning', title, 4500);
  }

  remove(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmState.set({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Confirmar',
        cancelText: options.cancelText ?? 'Cancelar',
        isDestructive: options.isDestructive ?? true,
        resolve,
      });
    });
  }

  handleConfirmResponse(confirmed: boolean): void {
    const state = this.confirmState();
    if (state.resolve) {
      state.resolve(confirmed);
    }
    this.confirmState.set({
      isOpen: false,
      title: '',
      message: '',
    });
  }
}
