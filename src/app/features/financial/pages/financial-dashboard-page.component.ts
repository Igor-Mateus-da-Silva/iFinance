import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  DashboardMetrics,
  FinancialDashboardService,
} from '../services/financial-dashboard.service';

@Component({
  selector: 'app-financial-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8 font-sans">
      <!-- 1. Topo: Cabeçalho & Navegador de Meses -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Painel de Balanço Mensal</h1>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Visão Orçamentária
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Acompanhe o teto de gastos da regra 50/30/20, fluxo de caixa e o saldo real das suas contas.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Navegador de Mês -->
          <div class="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1 shadow-lg">
            <button
              type="button"
              (click)="changeMonth(-1)"
              title="Mês Anterior"
              class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span class="px-3 text-xs font-bold text-white capitalize min-w-[140px] text-center">
              {{ currentMonthLabel() }}
            </span>

            <button
              type="button"
              (click)="changeMonth(1)"
              title="Próximo Mês"
              class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          @if (!isCurrentRealMonth()) {
            <button
              type="button"
              (click)="resetToCurrentMonth()"
              class="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-all">
              Mês Atual
            </button>
          }

          <!-- Ação Rápida: Ir para Lançamentos -->
          <button
            type="button"
            (click)="goToTransactions()"
            class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Lançamentos</span>
          </button>
        </div>
      </div>

      <!-- Alerta de Erro -->
      @if (errorMessage()) {
        <div class="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between">
          <span>{{ errorMessage() }}</span>
          <button (click)="loadData()" class="underline font-bold text-white ml-3">Tentar novamente</button>
        </div>
      }

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="space-y-6 animate-pulse">
          <div class="h-32 bg-slate-900/60 rounded-3xl border border-slate-800"></div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="h-28 bg-slate-900/60 rounded-2xl border border-slate-800"></div>
            <div class="h-28 bg-slate-900/60 rounded-2xl border border-slate-800"></div>
            <div class="h-28 bg-slate-900/60 rounded-2xl border border-slate-800"></div>
          </div>
          <div class="h-44 bg-slate-900/60 rounded-3xl border border-slate-800"></div>
        </div>
      } @else if (metrics(); as m) {
        <!-- Topo Destaque: Card Grande de Saldo Atual das Contas (Dinheiro Real Hoje) -->
        <div class="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 shadow-2xl">
          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span class="text-xs uppercase tracking-wider font-bold text-slate-400">Saldo Consolidado em Contas</span>
              </div>
              <p class="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono tracking-tight text-white">
                {{ m.totalCurrentBalance | currency: 'BRL':'symbol':'1.2-2' }}
              </p>
              <p class="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                <span>Disponibilidade imediata hoje somando todas as contas cadastradas.</span>
              </p>
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                (click)="goToSetup()"
                class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center gap-2">
                <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
                <span>Ajustar Contas & Metas</span>
              </button>
            </div>
          </div>

          <!-- Decoração de fundo sutil -->
          <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        <!-- Linha 1: Resumo do Fluxo de Caixa do Mês Selecionado -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Receitas do Mês -->
          <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition-all shadow-lg flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-400">Receitas em {{ currentMonthLabel() }}</span>
              <div class="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
            </div>
            <div class="mt-3">
              <span class="text-2xl font-bold font-mono text-emerald-400">
                + {{ m.totalIncome | currency: 'BRL':'symbol':'1.2-2' }}
              </span>
              <p class="text-[11px] text-slate-500 mt-1">Base para cálculo das metas 50/30/20</p>
            </div>
          </div>

          <!-- Despesas do Mês -->
          <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/30 transition-all shadow-lg flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-400">Despesas em {{ currentMonthLabel() }}</span>
              <div class="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
            </div>
            <div class="mt-3">
              <span class="text-2xl font-bold font-mono text-rose-400">
                - {{ m.totalExpense | currency: 'BRL':'symbol':'1.2-2' }}
              </span>
              <p class="text-[11px] text-slate-500 mt-1">Total de saídas e compras no cartão</p>
            </div>
          </div>

          <!-- Resultado do Mês (Receitas - Despesas) -->
          <div
            [class.border-emerald-500/30]="m.netResult >= 0"
            [class.border-rose-500/30]="m.netResult < 0"
            class="p-5 rounded-2xl bg-slate-900/80 border shadow-lg flex flex-col justify-between transition-all">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-400">Resultado do Mês</span>
              <span
                [class.bg-emerald-500/10]="m.netResult >= 0"
                [class.text-emerald-400]="m.netResult >= 0"
                [class.bg-rose-500/10]="m.netResult < 0"
                [class.text-rose-400]="m.netResult < 0"
                class="px-2 py-0.5 rounded-full text-[10px] font-bold">
                {{ m.netResult >= 0 ? 'Superávit' : 'Déficit' }}
              </span>
            </div>
            <div class="mt-3">
              <span
                [class.text-emerald-400]="m.netResult >= 0"
                [class.text-rose-400]="m.netResult < 0"
                class="text-2xl font-bold font-mono">
                {{ m.netResult | currency: 'BRL':'symbol':'1.2-2' }}
              </span>
              <p class="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Taxa de Sobra:</span>
                <strong class="font-mono text-white">{{ m.savingsRate }}%</strong>
              </p>
            </div>
          </div>
        </div>

        <!-- Linha 2: O Termômetro do Orçamento (A Regra 50/30/20) -->
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 class="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>🎯 O Termômetro do Orçamento (Regra 50/30/20)</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">
                Valores calculados dinamicamente com base nas receitas efetivas do mês de {{ currentMonthLabel() }}.
              </p>
            </div>

            <div class="flex items-center gap-3 text-[11px] text-slate-400">
              <span class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Confortável (&lt;80%)
              </span>
              <span class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Atenção (80-99%)
              </span>
              <span class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Estourou (≥100%)
              </span>
            </div>
          </div>

          @if (m.budgetProgressList.length === 0) {
            <div class="p-8 text-center rounded-3xl bg-slate-900/60 border border-dashed border-slate-800">
              <p class="text-sm font-semibold text-slate-300">Nenhum grupo de orçamento 50/30/20 cadastrado</p>
              <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Configure seus grupos (ex: Necessidades 50%, Desejos 30%, Investimentos 20%) para ver o termômetro.
              </p>
              <button
                type="button"
                (click)="goToSetup()"
                class="mt-4 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 text-xs font-bold transition-all">
                Configurar Regra 50/30/20 →
              </button>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (item of m.budgetProgressList; track item.group.id) {
                <div
                  [class.border-rose-500/40]="item.status === 'danger'"
                  [class.border-amber-500/40]="item.status === 'warning'"
                  [class.border-slate-800]="item.status === 'safe'"
                  class="p-5 rounded-3xl bg-slate-900/80 border transition-all hover:shadow-xl flex flex-col justify-between space-y-4">
                  <!-- Header do Grupo -->
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="text-sm font-bold text-white">{{ item.group.name }}</h3>
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {{ item.targetPercentage }}%
                        </span>
                      </div>
                      <p class="text-[11px] text-slate-400 mt-1">
                        Meta: <strong class="font-mono text-slate-200">{{ item.targetAmount | currency: 'BRL':'symbol':'1.2-2' }}</strong>
                      </p>
                    </div>

                    <!-- Badge de Status -->
                    <span
                      [class.bg-emerald-500/10]="item.status === 'safe'"
                      [class.text-emerald-400]="item.status === 'safe'"
                      [class.border-emerald-500/20]="item.status === 'safe'"
                      [class.bg-amber-500/10]="item.status === 'warning'"
                      [class.text-amber-400]="item.status === 'warning'"
                      [class.border-amber-500/20]="item.status === 'warning'"
                      [class.bg-rose-500/10]="item.status === 'danger'"
                      [class.text-rose-400]="item.status === 'danger'"
                      [class.border-rose-500/20]="item.status === 'danger'"
                      class="px-2.5 py-1 rounded-full text-[10px] font-bold border">
                      @if (item.status === 'safe') {
                        ✓ {{ item.percentageConsumed }}%
                      } @else if (item.status === 'warning') {
                        ⚠️ {{ item.percentageConsumed }}%
                      } @else {
                        🚨 {{ item.percentageConsumed }}%
                      }
                    </span>
                  </div>

                  <!-- Barra de Progresso com Tailwind -->
                  <div class="space-y-1.5">
                    <div class="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                      <div
                        [style.width.%]="getSafeProgressWidth(item.percentageConsumed)"
                        [class.bg-emerald-500]="item.status === 'safe'"
                        [class.bg-amber-500]="item.status === 'warning'"
                        [class.bg-rose-500]="item.status === 'danger'"
                        class="h-full rounded-full transition-all duration-500">
                      </div>
                    </div>

                    <div class="flex items-center justify-between text-[11px]">
                      <span class="text-slate-400">Gasto:</span>
                      <span class="font-mono font-bold text-white">
                        {{ item.spentAmount | currency: 'BRL':'symbol':'1.2-2' }}
                      </span>
                    </div>
                  </div>

                  <!-- Rodapé: Saldo restante ou estouro -->
                  <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    @if (item.isOverBudget) {
                      <span class="text-rose-400 font-semibold flex items-center gap-1">
                        <span>Excedeu em:</span>
                        <strong class="font-mono font-bold">{{ getOverAmount(item.targetAmount, item.spentAmount) | currency: 'BRL':'symbol':'1.2-2' }}</strong>
                      </span>
                    } @else {
                      <span class="text-slate-400">Ainda pode gastar:</span>
                      <strong class="font-mono font-bold text-emerald-400">
                        {{ getAvailableAmount(item.targetAmount, item.spentAmount) | currency: 'BRL':'symbol':'1.2-2' }}
                      </strong>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Linha 3: Top Gastos do Mês (Categorias & Maiores Transações) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Coluna 1: Top 5 Categorias Onde Mais Gastou -->
          <div class="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>📊 Top 5 Categorias de Despesa</span>
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">Onde o dinheiro foi mais concentrado neste mês.</p>
              </div>
            </div>

            @if (m.topCategories.length === 0) {
              <div class="p-8 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800">
                <p class="text-xs text-slate-400">Nenhuma despesa registrada para categorizar neste mês.</p>
              </div>
            } @else {
              <div class="space-y-3.5">
                @for (cat of m.topCategories; track cat.categoryId) {
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <div class="flex items-center gap-2">
                        <span
                          [style.backgroundColor]="cat.categoryColor"
                          class="w-3 h-3 rounded-full flex-shrink-0">
                        </span>
                        <span class="font-semibold text-slate-200">{{ cat.categoryName }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-white">
                          {{ cat.amount | currency: 'BRL':'symbol':'1.2-2' }}
                        </span>
                        <span class="text-[10px] font-mono text-slate-400 min-w-[36px] text-right">
                          ({{ cat.percentageOfTotal }}%)
                        </span>
                      </div>
                    </div>

                    <!-- Mini barra de progresso da categoria -->
                    <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        [style.width.%]="cat.percentageOfTotal"
                        [style.backgroundColor]="cat.categoryColor"
                        class="h-full rounded-full transition-all duration-300">
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Coluna 2: Maiores Transações Individuais -->
          <div class="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>💳 Maiores Compras do Mês</span>
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">As compras individuais de maior valor em {{ currentMonthLabel() }}.</p>
              </div>
              <button
                type="button"
                (click)="goToTransactions()"
                class="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                Ver todas →
              </button>
            </div>

            @if (m.topExpenses.length === 0) {
              <div class="p-8 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800">
                <p class="text-xs text-slate-400">Nenhuma compra registrada neste mês.</p>
              </div>
            } @else {
              <div class="divide-y divide-slate-800/80">
                @for (tx of m.topExpenses; track tx.id) {
                  <div class="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center flex-shrink-0 text-slate-300">
                        <span class="text-xs font-mono font-bold">{{ tx.date.split('-')[2] }}</span>
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs font-bold text-white truncate">{{ tx.description }}</p>
                        <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span>{{ tx.category?.name || 'Geral' }}</span>
                          <span>•</span>
                          <span class="font-mono">{{ tx.payment_method }}</span>
                          @if (tx.total_installments && tx.total_installments > 1) {
                            <span class="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                              {{ tx.current_installment }}/{{ tx.total_installments }}x
                            </span>
                          }
                        </div>
                      </div>
                    </div>

                    <div class="text-right flex-shrink-0">
                      <span class="font-mono font-bold text-sm text-rose-400">
                        - {{ tx.amount | currency: 'BRL':'symbol':'1.2-2' }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class FinancialDashboardPageComponent implements OnInit {
  private readonly dashboardService = inject(FinancialDashboardService);
  private readonly router = inject(Router);

  readonly selectedYearMonth = signal<string>(this.getInitialYearMonth());
  readonly isLoading = signal<boolean>(true);
  readonly metrics = signal<DashboardMetrics | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly currentMonthLabel = computed(() => {
    const [yearStr, monthStr] = this.selectedYearMonth().split('-');
    const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  });

  readonly isCurrentRealMonth = computed(() => {
    return this.selectedYearMonth() === this.getInitialYearMonth();
  });

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const data = await this.dashboardService.getDashboardMetrics(this.selectedYearMonth());
      this.metrics.set(data);
    } catch (err: any) {
      this.errorMessage.set('Erro ao carregar métricas do dashboard: ' + (err.message || 'Falha de conexão.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  changeMonth(delta: number): void {
    const [yearStr, monthStr] = this.selectedYearMonth().split('-');
    const date = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1 + delta, 1));
    const newYearMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    this.selectedYearMonth.set(newYearMonth);
    this.loadData();
  }

  resetToCurrentMonth(): void {
    this.selectedYearMonth.set(this.getInitialYearMonth());
    this.loadData();
  }

  getSafeProgressWidth(percentage: number): number {
    return Math.min(100, Math.max(0, percentage));
  }

  getAvailableAmount(target: number, spent: number): number {
    return Math.max(0, Math.round((target - spent) * 100) / 100);
  }

  getOverAmount(target: number, spent: number): number {
    return Math.max(0, Math.round((spent - target) * 100) / 100);
  }

  goToTransactions(): void {
    this.router.navigate(['/financial/transactions']);
  }

  goToSetup(): void {
    this.router.navigate(['/financial/setup']);
  }

  private getInitialYearMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
