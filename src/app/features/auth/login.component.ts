import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

type AuthMode = 'signin' | 'signup' | 'magic-link';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      <!-- Elementos Decorativos de Fundo (Glow Financeiro) -->
      <div class="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Card Central -->
      <div class="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 z-10">
        <!-- Logo e Título -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/20 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-white tracking-tight">iFinance <span class="text-emerald-400">Capital</span></h1>
          <p class="text-sm text-slate-400 mt-1">Plataforma de Gestão de Patrimônio e Aportes</p>
        </div>

        <!-- Abas de Modo (Entrar vs Criar Conta vs Magic Link) -->
        <div class="flex p-1 bg-slate-800/80 rounded-xl mb-6 text-xs font-medium text-slate-400">
          <button
            type="button"
            (click)="setMode('signin')"
            [class.bg-emerald-500]="authMode() === 'signin'"
            [class.text-slate-950]="authMode() === 'signin'"
            [class.font-semibold]="authMode() === 'signin'"
            class="flex-1 py-2 text-center rounded-lg transition-all duration-200">
            Entrar
          </button>
          <button
            type="button"
            (click)="setMode('signup')"
            [class.bg-emerald-500]="authMode() === 'signup'"
            [class.text-slate-950]="authMode() === 'signup'"
            [class.font-semibold]="authMode() === 'signup'"
            class="flex-1 py-2 text-center rounded-lg transition-all duration-200">
            Criar Conta
          </button>
          <button
            type="button"
            (click)="setMode('magic-link')"
            [class.bg-emerald-500]="authMode() === 'magic-link'"
            [class.text-slate-950]="authMode() === 'magic-link'"
            [class.font-semibold]="authMode() === 'magic-link'"
            class="flex-1 py-2 text-center rounded-lg transition-all duration-200">
            Link Mágico
          </button>
        </div>

        <!-- Mensagens de Feedback (Erro ou Sucesso) -->
        @if (errorMessage()) {
          <div class="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
            <svg class="w-4 h-4 mt-0.5 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        @if (successMessage()) {
          <div class="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start gap-2">
            <svg class="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{{ successMessage() }}</span>
          </div>
        }

        <!-- Formulário de Autenticação -->
        <form (ngSubmit)="handleSubmit()" class="space-y-4">
          <!-- Campo E-mail -->
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1.5" for="email">E-mail</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
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
                class="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>
          </div>

          <!-- Campo Senha (apenas nos modos signin e signup) -->
          @if (authMode() !== 'magic-link') {
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1.5" for="password">Senha</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
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
                  class="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
              </div>
            </div>
          }

          <!-- Botão de Submissão -->
          <button
            type="submit"
            [disabled]="isLoading()"
            class="w-full mt-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
            @if (isLoading()) {
              <svg class="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
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
        <div class="mt-6 text-center text-xs text-slate-500">
          Protegido por Supabase Auth & Criptografia Ponta a Ponta
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  authMode = signal<AuthMode>('signin');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  email = '';
  password = '';

  setMode(mode: AuthMode): void {
    this.authMode.set(mode);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  async handleSubmit(): Promise<void> {
    if (!this.email) {
      this.errorMessage.set('Por favor, informe seu e-mail.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      if (this.authMode() === 'signin') {
        if (!this.password) throw new Error('Informe sua senha.');
        await this.supabase.signInWithPassword(this.email, this.password);
        await this.router.navigate(['/hub']);
      } else if (this.authMode() === 'signup') {
        if (!this.password || this.password.length < 6) {
          throw new Error('A senha precisa ter no mínimo 6 caracteres.');
        }
        await this.supabase.signUp(this.email, this.password);
        this.successMessage.set('Conta criada! Verifique seu e-mail para confirmar seu cadastro ou faça login.');
      } else if (this.authMode() === 'magic-link') {
        await this.supabase.signInWithOtp(this.email);
        this.successMessage.set('Enviamos um link de login para o seu e-mail! Clique nele para acessar.');
      }
    } catch (err: any) {
      this.errorMessage.set(this.formatErrorMessage(err.message || 'Ocorreu um erro inesperado.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private formatErrorMessage(rawMessage: string): string {
    if (rawMessage.includes('Invalid login credentials')) {
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    }
    if (rawMessage.includes('Email not confirmed')) {
      return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
    }
    if (rawMessage.includes('User already registered')) {
      return 'Já existe uma conta cadastrada com este e-mail. Faça login.';
    }
    return rawMessage;
  }
}
