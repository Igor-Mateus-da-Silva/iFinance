import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-portfolio-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-white tracking-tight">Carteira & Cotações</h2>
          <p class="text-sm text-slate-400 mt-1">Cadastre seus ativos, quantidade possuída e cotações de mercado.</p>
        </div>
      </div>

      <div class="p-8 border border-slate-800 rounded-2xl bg-slate-900/50 text-center">
        <div class="w-12 h-12 mx-auto rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-white">Módulo de Carteira de Ativos</h3>
        <p class="text-xs text-slate-400 max-w-md mx-auto mt-2">
          Interface para registro de quantidade em custódia, preço médio e atualização de preço atual.
        </p>
      </div>
    </div>
  `,
})
export class PortfolioPageComponent {}
