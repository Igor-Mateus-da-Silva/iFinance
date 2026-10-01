import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { ToastService } from '../../core/services/toast.service';

type AuthMode = 'signin' | 'signup' | 'magic-link';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50/70 text-gray-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      <!-- Glow Executivo Suave -->
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[140px] pointer-events-none"></div>

      <!-- Card Central Minimalista -->
      <div class="w-full max-w-md bg-white border border-gray-200/90 rounded-2xl shadow-xl shadow-gray-200/60 p-8 z-10">
        <!-- Logo e Título -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 class="text-2xl font-extrabold text-gray-900 tracking-tight">iFinance <span class="text-blue-600">Capital</span></h1>
          <p class="text-xs text-gray-500 mt-1">Plataforma Executiva de Gestão Financeira & Aportes</p>
        </div>

        <!-- Abas de Modo -->
        <div class="flex p-1 bg-gray-100/80 rounded-xl mb-6 text-xs font-medium text-gray-500">
          <button
            type="button"
            (click)="setMode('signin')"
            [class.bg-white]="authMode() === 'signin'"
            [class.text-blue-700]="authMode() === 'signin'"
            [class.font-semibold]="authMode() === 'signin'"
            [class.shadow-2xs]="authMode() === 'signin'"
            class="flex-1 py-2 text-center rounded-lg transition-all duration-200">
            Entrar
          </button>
          <button
            type="button"
            (click)="setMode('signup')"
            [class.bg-white]="authMode() === 'signup'"
            [class.text-blue-700]="authMode() === 'signup'"
            [class.font-semibold]="authMode() === 'signup'"
            [class.shadow-2xs]="authMode() === 'signup'"
            class="flex-1 py-2 text-center rounded-lg transition-all duration-200">
            Criar Conta
          </button>
          <button
            type="button"
            (click)="setMode('magic-link')"
            [class.bg-white]="authMode() === 'magic-link'"
            [class.text-blue-700]="authMode() === 'magic-link'"
            [class.font-semibold]="authMode() === 'magic-link'"
            [class.shadow-2xs]="authMode() === 'magic-link'"
            class="flex-1 py-2 text-center rounded-lg transition-all duration-200">
            Link Mágico
          </button>
        </div>

        <!-- Formulário de Autenticação -->
        <form (ngSubmit)="handleSubmit()" class="space-y-4">
          <!-- Campo E-mail -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5" for="email">E-mail</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                required
                [(ngModel)]="email"
                name="email"
                placeholder="seu.email@exemplo.com"
                class="w-full pl-9 pr-4 py-2.5 bg-gray-50/70 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all" />
            </div>
          </div>

          <!-- Campo Senha -->
          @if (authMode() !== 'magic-link') {
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1.5" for="password">Senha</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  minlength="6"
                  [(ngModel)]="password"
                  name="password"
                  placeholder="••••••••"
                  class="w-full pl-9 pr-4 py-2.5 bg-gray-50/70 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all" />
              </div>
            </div>
          }

          <!-- Botão de Submissão -->
          <button
            type="submit"
            [disabled]="isLoading()"
            class="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2">
            @if (isLoading()) {
              <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Processando...</span>
            } @else {
              @if (authMode() === 'signin') {
                <span>Acessar Plataforma</span>
              } @else if (authMode() === 'signup') {
                <span>Criar Conta Gratuita</span>
              } @else {
                <span>Enviar Link Mágico por E-mail</span>
              }
            }
          </button>
        </form>

        <!-- Rodapé do Card -->
        <div class="mt-6 text-center text-xs text-gray-400">
          Protegido por Supabase Auth & Criptografia Ponta a Ponta
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  authMode = signal<AuthMode>('signin');
  email: string = '';
  password: string = '';
  isLoading = signal<boolean>(false);

  setMode(mode: AuthMode): void {
    this.authMode.set(mode);
  }

  async handleSubmit(): Promise<void> {
    this.isLoading.set(true);

    try {
      if (this.authMode() === 'signin') {
        await this.supabase.signInWithPassword(this.email, this.password);
        this.toastService.success('Login realizado com sucesso!');
        this.router.navigate(['/hub']);
      } else if (this.authMode() === 'signup') {
        await this.supabase.signUp(this.email, this.password);
        this.toastService.success('Conta criada! Verifique seu e-mail para confirmar seu cadastro.');
      } else if (this.authMode() === 'magic-link') {
        await this.supabase.signInWithOtp(this.email);
        this.toastService.success('Link de acesso enviado para o seu e-mail.');
      }
    } catch (err: any) {
      this.toastService.error(err.message || 'Falha na autenticação. Verifique os dados.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
