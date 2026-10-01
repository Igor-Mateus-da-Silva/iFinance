import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Asset, AssetClass, PortfolioItem } from '../../../core/models/database.types';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AporteRecommendationResult } from '../models/aporte.model';
import { AporteEngineService } from '../services/aporte-engine.service';
import { AssetClassesService } from '../services/asset-classes.service';

@Component({
  selector: 'app-aportes-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 font-sans">
      <!-- 1. Cabeçalho Principal -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Aportes Inteligentes</h1>
          <p class="text-sm text-slate-400 mt-1">
            Simulador de rebalanceamento: o algoritmo calcula compras otimizadas para aproximar sua carteira da estratégia ideal.
          </p>
        </div>

        <button
          type="button"
          (click)="loadData()"
          [disabled]="isLoading()"
          class="self-start md:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all flex items-center gap-2">
          <svg class="w-4 h-4 text-emerald-400" [class.animate-spin]="isLoading()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Atualizar Dados da Carteira</span>
        </button>
      </div>

      <!-- 2. Alertas de Estado Vazio (Sem Classes ou Sem Ativos) -->
      @if (!isLoading() && assetClasses().length === 0) {
        <div class="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <svg class="w-6 h-6 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Você precisa definir suas classes na <strong>Estratégia</strong> antes de calcular aportes.</span>
          </div>
          <button
            (click)="goToStrategy()"
            class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap">
            Ir para Estratégia
          </button>
        </div>
      }

      @if (!isLoading() && assets().length === 0 && assetClasses().length > 0) {
        <div class="p-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <svg class="w-6 h-6 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Nenhum ativo cadastrado na carteira. Cadastre seus ativos para que o motor sugira as compras.</span>
          </div>
          <button
            (click)="goToPortfolio()"
            class="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs whitespace-nowrap">
            Cadastrar Ativos
          </button>
        </div>
      }

      <!-- 3. Painel de Simulação (Input de Aporte em Destaque) -->
      <div class="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <!-- Glow Decorativo -->
        <div class="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="max-w-2xl">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Simulador de Aporte Otimizado
          </span>
          <h2 class="text-xl sm:text-2xl font-bold text-white tracking-tight">Quanto você deseja investir hoje?</h2>
          <p class="text-xs text-slate-400 mt-1 mb-6">
            Informe o valor financeiro disponível. O algoritmo distribuirá o dinheiro nos ativos mais atrasados em relação à sua meta.
          </p>

          <!-- Input Principal com Formatação e Botão de Ação -->
          <div class="flex flex-col sm:flex-row items-stretch gap-3">
            <div class="relative flex-1">
              <span class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold text-base">
                R$
              </span>
              <input
                type="number"
                min="0"
                step="50"
                [(ngModel)]="contributionAmount"
                (ngModelChange)="onAmountChanged()"
                placeholder="Ex: 1000.00"
                class="w-full pl-12 pr-4 py-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl text-white font-mono text-lg font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>

            <button
              type="button"
              (click)="calculateAporte()"
              [disabled]="contributionAmount <= 0 || isLoading()"
              class="px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>Calcular Aporte</span>
            </button>
          </div>

          <!-- Botões de Atalho de Valores Rápidos -->
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <span class="text-[11px] font-semibold text-slate-400 mr-1">Atalhos rápidos:</span>
            @for (preset of [500, 1000, 2500, 5000, 10000]; track preset) {
              <button
                type="button"
                (click)="setPresetAmount(preset)"
                class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-mono transition-colors">
                + R$ {{ preset | number: '1.0-0' }}
              </button>
            }
          </div>
        </div>
      </div>

      <!-- 4. Resumo Pós-Cálculo (Cards de Impacto) -->
      @if (result(); as res) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Patrimônio Atual -->
          <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div class="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
              <span>Patrimônio Atual</span>
              <span class="w-2 h-2 rounded-full bg-slate-500"></span>
            </div>
            <div class="text-xl sm:text-2xl font-black text-white font-mono">
              {{ res.totalCurrentValue | currency: 'BRL':'symbol':'1.2-2' }}
            </div>
            <span class="text-[11px] text-slate-500 mt-1 block">Posição consolidada da carteira</span>
          </div>

          <!-- Valor do Aporte -->
          <div class="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 shadow-xl">
            <div class="flex items-center justify-between text-emerald-400 text-xs mb-1 font-semibold">
              <span>Valor do Aporte</span>
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <div class="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              + {{ res.contributionAmount | currency: 'BRL':'symbol':'1.2-2' }}
            </div>
            <span class="text-[11px] text-emerald-500/80 mt-1 block">Capital novo a ser injetado</span>
          </div>

          <!-- Patrimônio Projetado -->
          <div class="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-850 border border-slate-800 shadow-xl">
            <div class="flex items-center justify-between text-cyan-400 text-xs mb-1 font-semibold">
              <span>Patrimônio Projetado</span>
              <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
            </div>
            <div class="text-xl sm:text-2xl font-black text-white font-mono">
              {{ res.projectedTotalValue | currency: 'BRL':'symbol':'1.2-2' }}
            </div>
            <span class="text-[11px] text-slate-500 mt-1 block">Total após a liquidação das ordens</span>
          </div>

          <!-- Sobra / Troco Não Alocado -->
          <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div class="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
              <span>Sobra / Caixa Restante</span>
              <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            </div>
            <div class="text-xl sm:text-2xl font-black text-amber-300 font-mono">
              {{ res.unallocatedAmount | currency: 'BRL':'symbol':'1.2-2' }}
            </div>
            <span class="text-[11px] text-slate-500 mt-1 block">Fração residual de cotas inteiras</span>
          </div>
        </div>

        <!-- 5. A LISTA DE COMPRAS (O Mais Importante) -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white tracking-tight">Lista de Compras Recomendadas</h3>
                <p class="text-xs text-slate-400">Execute estas ordens na sua corretora para rebalancear a carteira.</p>
              </div>
            </div>

            <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {{ res.suggestions.length }} {{ res.suggestions.length === 1 ? 'ordem sugerida' : 'ordens sugeridas' }}
            </span>
          </div>

          @if (res.suggestions.length === 0) {
            <div class="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
              <p class="text-xs text-slate-400">
                Nenhuma compra específica recomendada para este valor. Cadastre ativos dentro das classes defasadas para gerar ordens.
              </p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (sug of res.suggestions; track sug.assetId) {
                <div class="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <!-- Topo do Card da Ordem: Ticker e Classe -->
                    <div class="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span class="text-lg font-black text-white font-mono tracking-tight block">
                          {{ sug.ticker }}
                        </span>
                        <span class="text-[11px] text-slate-400 font-medium">
                          Classe: <strong class="text-slate-300">{{ sug.className }}</strong>
                        </span>
                      </div>
                      <span class="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
                        COMPRAR
                      </span>
                    </div>

                    <!-- Dados Financeiros da Ordem -->
                    <div class="space-y-2 py-3 border-y border-slate-800/80 text-xs">
                      <div class="flex items-center justify-between">
                        <span class="text-slate-400">Preço da Cota:</span>
                        <span class="font-mono text-slate-200 font-semibold">
                          {{ sug.currentPrice | currency: 'BRL':'symbol':'1.2-2' }}
                        </span>
                      </div>

                      <div class="flex items-center justify-between">
                        <span class="text-slate-400">Posição Atual em Custódia:</span>
                        <span class="font-mono text-slate-400">
                          {{ sug.currentQuantity }} cotas ({{ sug.currentTotal | currency: 'BRL':'symbol':'1.2-2' }})
                        </span>
                      </div>

                      <div class="flex items-center justify-between pt-1">
                        <span class="text-slate-300 font-semibold">Quantidade a Comprar:</span>
                        <span class="text-sm font-black font-mono text-emerald-400">
                          + {{ sug.suggestedQuantity }} {{ sug.suggestedQuantity === 1 ? 'cota' : 'cotas' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Rodapé do Card: Total da Ordem -->
                  <div class="mt-4 pt-3 flex items-center justify-between">
                    <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total da Ordem:</span>
                    <span class="text-base font-black font-mono text-white">
                      {{ sug.suggestedTotal | currency: 'BRL':'symbol':'1.2-2' }}
                    </span>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- 6. Análise de Rebalanceamento Visual (Por que o algoritmo escolheu isso?) -->
        <div class="space-y-4 pt-4">
          <div>
            <h3 class="text-lg font-bold text-white tracking-tight">Análise de Rebalanceamento por Classe</h3>
            <p class="text-xs text-slate-400">
              Veja a evolução comparativa da sua carteira: Situação Atual ➔ Impacto do Aporte ➔ Meta Alvo da Estratégia.
            </p>
          </div>

          <div class="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-slate-800/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/60">
                    <th class="py-3.5 px-6">Classe de Ativo</th>
                    <th class="py-3.5 px-4 text-right">Atual (R$)</th>
                    <th class="py-3.5 px-4 text-center">Situação (% Atual)</th>
                    <th class="py-3.5 px-4 text-center">Aporte Recomendado</th>
                    <th class="py-3.5 px-4 text-center">Projetado (% Pós-Aporte)</th>
                    <th class="py-3.5 px-6 text-right">Meta Alvo (%)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 text-xs">
                  @for (cls of res.classAllocations; track cls.id) {
                    <tr class="hover:bg-slate-800/30 transition-colors" [class.bg-slate-850]="!cls.parentId">
                      <!-- Nome da Classe -->
                      <td class="py-3.5 px-6">
                        <div class="flex items-center gap-2">
                          @if (cls.parentId) {
                            <span class="text-slate-600 font-mono text-xs ml-3">↳</span>
                            <span class="text-slate-300 font-medium">{{ cls.name }}</span>
                          } @else {
                            <span class="font-bold text-white">{{ cls.name }}</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                              Raiz
                            </span>
                          }
                        </div>
                      </td>

                      <!-- Valor Atual -->
                      <td class="py-3.5 px-4 text-right font-mono text-slate-300">
                        {{ cls.currentValue | currency: 'BRL':'symbol':'1.2-2' }}
                      </td>

                      <!-- Porcentagem Atual com Barra Mini -->
                      <td class="py-3.5 px-4 text-center">
                        <div class="flex flex-col items-center gap-1">
                          <span class="font-mono text-xs font-semibold text-slate-300">
                            {{ cls.currentPercentage | number: '1.1-1' }}%
                          </span>
                          <div class="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div class="h-full bg-slate-500 rounded-full" [style.width.%]="cls.currentPercentage"></div>
                          </div>
                        </div>
                      </td>

                      <!-- Aporte Recomendado -->
                      <td class="py-3.5 px-4 text-center">
                        @if (cls.suggestedContribution > 0) {
                          <span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/20">
                            + {{ cls.suggestedContribution | currency: 'BRL':'symbol':'1.2-2' }}
                          </span>
                        } @else {
                          <span class="text-slate-500 font-mono text-xs">—</span>
                        }
                      </td>

                      <!-- Porcentagem Projetada com Barra Mini -->
                      <td class="py-3.5 px-4 text-center">
                        <div class="flex flex-col items-center gap-1">
                          <span class="font-mono text-xs font-bold text-cyan-400">
                            {{ cls.projectedPercentage | number: '1.1-1' }}%
                          </span>
                          <div class="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div class="h-full bg-cyan-400 rounded-full" [style.width.%]="cls.projectedPercentage"></div>
                          </div>
                        </div>
                      </td>

                      <!-- Meta Alvo Ideal -->
                      <td class="py-3.5 px-6 text-right">
                        <span class="font-mono text-xs font-extrabold text-emerald-400">
                          {{ cls.effectiveTargetPercentage | number: '1.1-1' }}%
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AportesPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly classesService = inject(AssetClassesService);
  private readonly aporteEngine = inject(AporteEngineService);
  private readonly router = inject(Router);

  isLoading = signal<boolean>(true);
  assetClasses = signal<AssetClass[]>([]);
  assets = signal<Asset[]>([]);
  portfolioItems = signal<PortfolioItem[]>([]);

  // Valor digitado pelo usuário (padrão inicial de R$ 1.000,00)
  contributionAmount = 1000;

  // Resultado reativo da simulação
  result = signal<AporteRecommendationResult | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      // Busca dados necessários para o cálculo em paralelo
      const [classesData, assetsRes, portfolioRes] = await Promise.all([
        this.classesService.getClasses(),
        this.supabase.client.from('assets').select('*'),
        this.supabase.client.from('portfolio').select('*'),
      ]);

      if (assetsRes.error) throw assetsRes.error;
      if (portfolioRes.error) throw portfolioRes.error;

      this.assetClasses.set(classesData);
      this.assets.set(
        (assetsRes.data || []).map((a) => ({
          ...a,
          current_price: Number(a.current_price) || 0,
        }))
      );
      this.portfolioItems.set(
        (portfolioRes.data || []).map((p) => ({
          ...p,
          quantity: Number(p.quantity) || 0,
          average_price: Number(p.average_price) || 0,
        }))
      );

      // Executa o cálculo inicial
      this.calculateAporte();
    } catch (err: any) {
      console.error('Erro ao carregar dados para cálculo de aportes:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  calculateAporte(): void {
    const amount = Number(this.contributionAmount) || 0;
    if (amount <= 0) {
      this.result.set(null);
      return;
    }

    const res = this.aporteEngine.calculateAporte({
      contributionAmount: amount,
      assetClasses: this.assetClasses(),
      assets: this.assets(),
      portfolioItems: this.portfolioItems(),
    });

    this.result.set(res);
  }

  onAmountChanged(): void {
    this.calculateAporte();
  }

  setPresetAmount(val: number): void {
    this.contributionAmount = (Number(this.contributionAmount) || 0) + val;
    this.calculateAporte();
  }

  goToStrategy(): void {
    this.router.navigate(['/investments/strategy']);
  }

  goToPortfolio(): void {
    this.router.navigate(['/investments/portfolio']);
  }
}
