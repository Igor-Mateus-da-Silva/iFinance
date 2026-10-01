import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-financial-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-white tracking-tight">Controle Financeiro</h2>
          <p class="text-sm text-slate-400 mt-1">Visão geral do orçamento mensal e despesas.</p>
        </div>
      </div>

      <div class="p-8 border border-slate-800 rounded-2xl bg-slate-900/50 text-center">
        <div class="w-12 h-12 mx-auto rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-white">Módulo Financeiro (Mock)</h3>
        <p class="text-xs text-slate-400 max-w-md mx-auto mt-2">
          Área reservada para o controle orçamentário e fluxo de caixa pessoal.
        </p>
      </div>
    </div>
  `,
})
export class FinancialDashboardPageComponent {}
