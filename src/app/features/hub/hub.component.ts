import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50/70 text-gray-900 flex flex-col font-sans relative overflow-hidden selection:bg-blue-600 selection:text-white">
      <!-- Barra Superior Minimalista Executiva -->
      <header class="w-full border-b border-gray-200/80 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center justify-between z-20">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-sm shadow-blue-500/20">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 class="text-base font-bold text-gray-900 tracking-tight leading-none">iFinance <span class="text-blue-600">Capital</span></h1>
            <span class="text-xs text-gray-500">Central Executiva</span>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <span class="text-xs text-gray-600 hidden sm:inline-block">
            Conectado como <strong class="text-gray-900 font-semibold">{{ supabase.currentUser()?.email }}</strong>
          </span>
          <button
            type="button"
            (click)="handleLogout()"
            class="px-3.5 py-1.5 rounded-xl border border-gray-200 hover:border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-gray-700 hover:text-rose-600 transition-all flex items-center gap-1.5 shadow-2xs">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </header>

      <!-- Conteúdo Principal do Hub -->
      <main class="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col justify-center z-10">
        <div class="text-center max-w-xl mx-auto mb-10">
          <span class="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200/60 mb-3">
            Plataforma Integrada
          </span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">O que deseja gerenciar hoje?</h2>
          <p class="text-sm text-gray-600 mt-2">Escolha uma das frentes para iniciar suas análises, orçamentos e projeções.</p>
        </div>

        <!-- Grid com os Dois Módulos -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Card Módulo 1: Investimentos -->
          <div
            (click)="navigateTo('/investments/strategy')"
            class="group relative bg-white hover:border-blue-500/80 border border-gray-200/90 rounded-2xl p-8 cursor-pointer transition-all duration-300 shadow-xs hover:shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between">
            <div class="absolute -top-3 right-6 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-xs">
              Módulo Ativo
            </div>

            <div>
              <div class="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>

              <h3 class="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Controle de Investimentos</h3>
              <p class="text-sm text-gray-600 mt-2.5 leading-relaxed">
                Defina sua estratégia de alocação por classes e subclasses, acompanhe a custódia da carteira e utilize o <strong>Aporte Engine Inteligente</strong> para rebalancear seu patrimônio.
              </p>

              <div class="mt-6 flex flex-wrap gap-2">
                <span class="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700 border border-gray-200">Estratégia de Metas</span>
                <span class="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700 border border-gray-200">Custódia & Cotação</span>
                <span class="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60">Cálculo de Aporte</span>
              </div>
            </div>

            <div class="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
              <span>Acessar Investimentos</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </div>

          <!-- Card Módulo 2: Controle Financeiro -->
          <div
            (click)="navigateTo('/financial/dashboard')"
            class="group relative bg-white hover:border-blue-500/80 border border-gray-200/90 rounded-2xl p-8 cursor-pointer transition-all duration-300 shadow-xs hover:shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between">
            <div class="absolute -top-3 right-6 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-xs">
              Módulo Ativo
            </div>

            <div>
              <div class="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h3 class="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Controle Financeiro</h3>
              <p class="text-sm text-gray-600 mt-2.5 leading-relaxed">
                Gestão completa com a metodologia <strong>50/30/20</strong>, faturas de cartões com virada automática de corte e <strong>Assistente IA</strong> para leitura de comprovantes.
              </p>

              <div class="mt-6 flex flex-wrap gap-2">
                <span class="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700 border border-gray-200">Metodologia 50/30/20</span>
                <span class="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700 border border-gray-200">Faturas & Cartões</span>
                <span class="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60">Assistente IA Gemini</span>
              </div>
            </div>

            <div class="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
              <span>Acessar Financeiro</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </div>
        </div>
      </main>

      <footer class="w-full text-center py-4 border-t border-gray-200/60 text-xs text-gray-500 bg-white/50">
        iFinance Capital &bull; Versão 1.0.0 &bull; PWA & Minimalismo Executivo
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
