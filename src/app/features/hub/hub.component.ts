import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      <!-- Glows de Fundo -->
      <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <!-- Barra Superior Minimalista -->
      <header class="w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-20">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 class="text-base font-bold text-white tracking-tight leading-none">iFinance <span class="text-emerald-400">Capital</span></h1>
            <span class="text-xs text-slate-400">Central de Operações</span>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <span class="text-xs text-slate-400 hidden sm:inline-block">
            Conectado como <strong class="text-slate-200">{{ supabase.currentUser()?.email }}</strong>
          </span>
          <button
            (click)="handleLogout()"
            class="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-750 text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </header>

      <!-- Conteúdo Principal do Hub -->
      <main class="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col justify-center z-10">
        <div class="text-center max-w-xl mx-auto mb-10">
          <span class="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20 mb-3">
            Selecione seu Módulo
          </span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">O que deseja gerenciar hoje?</h2>
          <p class="text-sm text-slate-400 mt-2">Escolha uma das áreas da sua vida financeira para começar suas análises e projeções.</p>
        </div>

        <!-- Grid com os Dois Módulos -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Card Módulo 1: Investimentos -->
          <div
            (click)="navigateTo('/investments/strategy')"
            class="group relative bg-slate-900/70 hover:bg-slate-850/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-8 cursor-pointer transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col justify-between">
            <div class="absolute -top-3 right-6 px-3 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-md">
              Fase 1 Disponível
            </div>

            <div>
              <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300">
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>

              <h3 class="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">Controle de Investimentos</h3>
              <p class="text-sm text-slate-400 mt-2 leading-relaxed">
                Defina sua estratégia de alocação por classes e subclasses, acompanhe a custódia da carteira e utilize o <strong>Aporte Engine Inteligente</strong> para rebalancear seu patrimônio.
              </p>

              <div class="mt-6 flex flex-wrap gap-2">
                <span class="text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">Estratégia de Metas</span>
                <span class="text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">Custódia & Cotação</span>
                <span class="text-[11px] font-medium px-2.5 py-1 rounded-md bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 font-semibold">Cálculo de Aporte</span>
              </div>
            </div>

            <div class="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-sm font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Abrir Investimentos</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </div>

          <!-- Card Módulo 2: Controle Financeiro -->
          <div
            (click)="navigateTo('/financial/dashboard')"
            class="group relative bg-slate-900/70 hover:bg-slate-850/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-8 cursor-pointer transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between">
            <div class="absolute -top-3 right-6 px-3 py-0.5 bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-full border border-slate-600">
              Mock Inicial
            </div>

            <div>
              <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-slate-950 transition-all duration-300">
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h3 class="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">Controle Financeiro</h3>
              <p class="text-sm text-slate-400 mt-2 leading-relaxed">
                Gestão completa do orçamento mensal, despesas fixas e variáveis, receitas e fluxo de caixa pessoal para manter suas contas em dia.
              </p>

              <div class="mt-6 flex flex-wrap gap-2">
                <span class="text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">Fluxo de Caixa</span>
                <span class="text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">Categorização</span>
                <span class="text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">Metas de Gastos</span>
              </div>
            </div>

            <div class="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-sm font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Abrir Financeiro (Em Breve)</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </div>
        </div>
      </main>

      <footer class="w-full text-center py-4 border-t border-slate-900 text-xs text-slate-600">
        iFinance Capital &bull; Versão 1.0.0 &bull; Arquitetura Limpa & Signals
      </footer>
    </div>
  `,
})
export class HubComponent {
  readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  async handleLogout(): Promise<void> {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
