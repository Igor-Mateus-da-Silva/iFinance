import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-aportes-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-white tracking-tight">Aportes Inteligentes</h2>
          <p class="text-sm text-slate-400 mt-1">Calcule exatamente onde alocar seus novos recursos para equilibrar seu patrimônio.</p>
        </div>
      </div>

      <div class="p-8 border border-slate-800 rounded-2xl bg-slate-900/50 text-center">
        <div class="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-white">Aporte Engine Integrado</h3>
        <p class="text-xs text-slate-400 max-w-md mx-auto mt-2">
          O algoritmo de cálculo de aporte já está testado e pronto para ser conectado a esta interface.
        </p>
      </div>
    </div>
  `,
})
export class AportesPageComponent {}
