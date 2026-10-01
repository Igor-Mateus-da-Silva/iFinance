import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssetClass } from '../../../core/models/database.types';
import { AssetClassesService } from '../services/asset-classes.service';
import { PortfolioHolding, PortfolioService } from '../services/portfolio.service';
import { ToastService } from '../../../core/services/toast.service';

interface EditableHolding extends PortfolioHolding {
  editPrice: number;
  editQuantity: number;
  isDirty: boolean;
  isSaving: boolean;
}

interface GroupedHoldings {
  classId: string;
  className: string;
  parentClassName: string | null;
  targetPercentage: number;
  totalClassValue: number;
  portfolioPercentage: number;
  items: EditableHolding[];
}

@Component({
  selector: 'app-portfolio-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 font-sans">
      <!-- 1. Cabeçalho e Ações Principais -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Carteira de Custódia</h1>
          <p class="text-xs sm:text-sm text-gray-500 mt-1">
            Gerencie seus ativos, cotações atualizadas e posições consolidadas por classe.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="openAddModal()"
            [disabled]="availableClasses().length === 0"
            class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Adicionar Ativo</span>
          </button>
        </div>
      </div>

      <!-- 2. Alertas de Feedback -->
      @if (feedback()) {
        <div
          [class.bg-emerald-50]="feedback()?.type === 'success'"
          [class.border-emerald-200]="feedback()?.type === 'success'"
          [class.text-emerald-700]="feedback()?.type === 'success'"
          [class.bg-rose-50]="feedback()?.type === 'error'"
          [class.border-rose-200]="feedback()?.type === 'error'"
          [class.text-rose-700]="feedback()?.type === 'error'"
          class="p-4 rounded-xl border text-xs flex items-center justify-between transition-all font-medium">
          <span>{{ feedback()?.text }}</span>
          <button (click)="feedback.set(null)" class="text-gray-400 hover:text-gray-700">✕</button>
        </div>
      }

      <!-- 3. Cards de Resumo do Patrimônio -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Card 1: Patrimônio Total -->
        <div class="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-xs flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Patrimônio Total</span>
            <span class="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {{ totalPortfolioValue() | currency: 'BRL':'symbol':'1.2-2' }}
            </span>
          </div>
        </div>

        <!-- Card 2: Total de Ativos -->
        <div class="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-xs flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Ativos em Carteira</span>
            <span class="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {{ totalAssetsCount() }}
            </span>
          </div>
        </div>

        <!-- Card 3: Classes Ativas -->
        <div class="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-xs flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
          </div>
          <div>
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Classes com Posição</span>
            <span class="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {{ activeClassesCount() }}
            </span>
          </div>
        </div>

        <!-- Card 4: Maior Posição -->
        <div class="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-xs flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div class="truncate">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Maior Ativo</span>
            @if (topAsset()) {
              <div class="flex items-baseline gap-1.5 truncate">
                <span class="text-lg font-black text-gray-900">{{ topAsset()?.ticker }}</span>
                <span class="text-xs text-amber-700 font-semibold">({{ topAssetWeight() | number: '1.1-1' }}%)</span>
              </div>
            } @else {
              <span class="text-sm font-semibold text-gray-400">Nenhum</span>
            }
          </div>
        </div>
      </div>

      <!-- 4. Filtro / Barra de Busca -->
      @if (holdings().length > 0) {
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="relative w-full sm:w-80">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              [(ngModel)]="searchFilter"
              placeholder="Buscar por ticker ou classe..."
              class="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs" />
          </div>

          <div class="text-xs text-gray-500">
            Dica: Edite a <strong class="text-gray-800">Cotação</strong> e a <strong class="text-gray-800">Quantidade</strong> diretamente nos inputs para atualização instantânea.
          </div>
        </div>
      }

      <!-- 5. Listagem de Ativos Agrupados por Classe -->
      @if (isLoading()) {
        <div class="p-16 text-center text-gray-400">
          <svg class="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span class="text-xs">Carregando carteira de investimentos...</span>
        </div>
      } @else if (holdings().length === 0) {
        <!-- Empty State -->
        <div class="p-12 text-center rounded-2xl bg-white border border-dashed border-gray-300 max-w-xl mx-auto shadow-xs">
          <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-4">
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-gray-900">Sua carteira está vazia</h3>
          <p class="text-xs text-gray-500 mt-2 leading-relaxed">
            Cadastre seus primeiros ativos vinculando-os às classes definidas na sua estratégia para começar o acompanhamento patrimonial.
          </p>
          <div class="mt-6">
            <button
              (click)="openAddModal()"
              [disabled]="availableClasses().length === 0"
              class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm shadow-blue-500/20">
              Cadastrar Primeiro Ativo
            </button>
          </div>
        </div>
      } @else {
        <div class="space-y-6">
          @for (group of filteredGroups(); track group.classId) {
            <div class="bg-white border border-gray-200/90 rounded-2xl overflow-hidden shadow-xs">
              <!-- Cabeçalho do Grupo de Classe -->
              <div class="px-6 py-4 bg-gray-50/70 border-b border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {{ group.className.charAt(0) }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="text-sm font-bold text-gray-900">{{ group.className }}</h3>
                      @if (group.parentClassName) {
                        <span class="text-[10px] text-gray-500">↳ em {{ group.parentClassName }}</span>
                      }
                    </div>
                    <span class="text-[11px] text-gray-500">
                      Meta da Classe: <strong class="text-gray-800">{{ group.targetPercentage }}%</strong>
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-4 text-xs">
                  <div>
                    <span class="text-gray-500 text-[11px] block text-right">Total na Classe:</span>
                    <strong class="text-gray-900 text-sm">{{ group.totalClassValue | currency: 'BRL':'symbol':'1.2-2' }}</strong>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                    {{ group.portfolioPercentage | number: '1.1-1' }}% do Total
                  </span>
                </div>
              </div>

              <!-- Tabela de Ativos da Classe -->
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/40">
                      <th class="py-3 px-6">Ticker / Ativo</th>
                      <th class="py-3 px-4">Cotação Atual (R$)</th>
                      <th class="py-3 px-4">Quantidade</th>
                      <th class="py-3 px-6 text-right">Valor Total (R$)</th>
                      <th class="py-3 px-4 text-right">% Carteira</th>
                      <th class="py-3 px-6 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 text-xs">
                    @for (item of group.items; track item.assetId) {
                      <tr class="hover:bg-gray-50/60 transition-colors">
                        <!-- Ticker -->
                        <td class="py-3.5 px-6 font-bold text-gray-900">
                          <div class="flex items-center gap-2.5">
                            <span class="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-900 font-mono text-xs font-bold border border-gray-200">
                              {{ item.ticker }}
                            </span>
                          </div>
                        </td>

                        <!-- Preço Atual (Quick Edit) -->
                        <td class="py-3.5 px-4">
                          <div class="flex items-center gap-1.5 w-32">
                            <span class="text-gray-400 font-medium text-xs">R$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              [(ngModel)]="item.editPrice"
                              (ngModelChange)="onItemChanged(item)"
                              class="w-full py-1 px-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600" />
                          </div>
                        </td>

                        <!-- Quantidade (Quick Edit) -->
                        <td class="py-3.5 px-4">
                          <div class="w-28">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              [(ngModel)]="item.editQuantity"
                              (ngModelChange)="onItemChanged(item)"
                              class="w-full py-1 px-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600" />
                          </div>
                        </td>

                        <!-- Valor Total da Posição -->
                        <td class="py-3.5 px-6 text-right font-black text-gray-900">
                          {{ (item.editPrice * item.editQuantity) | currency: 'BRL':'symbol':'1.2-2' }}
                        </td>

                        <!-- Percentual no Total -->
                        <td class="py-3.5 px-4 text-right text-gray-600 font-mono font-medium">
                          {{ getItemWeight(item.editPrice * item.editQuantity) | number: '1.2-2' }}%
                        </td>

                        <!-- Botão Salvar Rápido & Excluir -->
                        <td class="py-3.5 px-6 text-center">
                          <div class="flex items-center justify-center gap-1.5">
                            @if (item.isDirty) {
                              <button
                                (click)="saveQuickEdit(item)"
                                [disabled]="item.isSaving"
                                title="Salvar alteração no Supabase"
                                class="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors">
                                @if (item.isSaving) {
                                  <svg class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                  </svg>
                                } @else {
                                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                }
                              </button>
                            }

                            <button
                              (click)="deleteAsset(item)"
                              title="Excluir ativo da carteira"
                              class="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors">
                              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- 6. Modal de Adicionar Novo Ativo -->
      @if (showAddModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-xs">
          <div class="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <h3 class="text-base font-bold text-gray-900 mb-1">Adicionar Ativo à Carteira</h3>
            <p class="text-xs text-gray-500 mb-6">
              Cadastre o ticker, preço atual de cotação e a quantidade em custódia.
            </p>

            <form (ngSubmit)="handleAddAssetSubmit()" class="space-y-4">
              <!-- Classe / Subclasse -->
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="assetClassSelect">
                  Classe de Ativo *
                </label>
                <select
                  id="assetClassSelect"
                  required
                  [(ngModel)]="addModel.asset_class_id"
                  name="assetClassSelect"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all">
                  <option value="" disabled selected>Selecione a classe...</option>
                  @for (cls of availableClasses(); track cls.id) {
                    <option [value]="cls.id">
                      {{ formatClassOption(cls) }}
                    </option>
                  }
                </select>
              </div>

              <!-- Ticker -->
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="ticker">
                  Ticker / Código do Ativo *
                </label>
                <input
                  id="ticker"
                  type="text"
                  required
                  [(ngModel)]="addModel.ticker"
                  name="ticker"
                  placeholder="Ex: PETR4, IVVB11, BTC, MXRF11..."
                  class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 font-mono text-xs uppercase placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all" />
              </div>

              <!-- Grid com Preço Atual e Quantidade -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1" for="currentPrice">
                    Cotação Atual (R$) *
                  </label>
                  <input
                    id="currentPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    [(ngModel)]="addModel.current_price"
                    name="currentPrice"
                    placeholder="0.00"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all" />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1" for="quantity">
                    Quantidade *
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    min="0"
                    step="any"
                    required
                    [(ngModel)]="addModel.quantity"
                    name="quantity"
                    placeholder="0"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all" />
                </div>
              </div>

              <!-- Valor Total Calculado na Hora -->
              <div class="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                <span class="text-gray-500">Valor Total Estimado:</span>
                <strong class="text-blue-700 font-mono font-bold text-sm">
                  {{ (addModel.current_price * addModel.quantity) | currency: 'BRL':'symbol':'1.2-2' }}
                </strong>
              </div>

              <!-- Ações do Modal -->
              <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  (click)="closeAddModal()"
                  class="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="isModalSubmitting() || !addModel.ticker || !addModel.asset_class_id"
                  class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs">
                  {{ isModalSubmitting() ? 'Cadastrando...' : 'Salvar Ativo' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class PortfolioPageComponent implements OnInit {
  private readonly portfolioService = inject(PortfolioService);
  private readonly classesService = inject(AssetClassesService);
  private readonly toastService = inject(ToastService);

  holdings = signal<EditableHolding[]>([]);
  availableClasses = signal<AssetClass[]>([]);
  isLoading = signal<boolean>(true);
  isModalSubmitting = signal<boolean>(false);
  showAddModal = signal<boolean>(false);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  searchFilter = '';

  addModel = {
    ticker: '',
    asset_class_id: '',
    current_price: 0,
    quantity: 0,
  };

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [holdingsData, classesData] = await Promise.all([
        this.portfolioService.getHoldings(),
        this.classesService.getClasses(),
      ]);

      this.availableClasses.set(classesData);
      this.holdings.set(
        holdingsData.map((h) => ({
          ...h,
          editPrice: h.currentPrice,
          editQuantity: h.quantity,
          isDirty: false,
          isSaving: false,
        }))
      );
    } catch (err: any) {
      this.feedback.set({
        type: 'error',
        text: 'Erro ao carregar carteira: ' + (err.message || 'Falha no Supabase.'),
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Estatísticas Computadas (Dashboard Cards)
  // ---------------------------------------------------------------------------
  totalPortfolioValue = computed(() => {
    return this.holdings().reduce(
      (sum, item) => sum + item.editPrice * item.editQuantity,
      0
    );
  });

  totalAssetsCount = computed(() => this.holdings().length);

  activeClassesCount = computed(() => {
    const classIds = new Set(this.holdings().map((h) => h.assetClassId));
    return classIds.size;
  });

  topAsset = computed(() => {
    const list = [...this.holdings()];
    if (!list.length) return null;
    return list.sort(
      (a, b) => b.editPrice * b.editQuantity - a.editPrice * a.editQuantity
    )[0];
  });

  topAssetWeight = computed(() => {
    const total = this.totalPortfolioValue();
    const top = this.topAsset();
    if (!total || !top) return 0;
    return ((top.editPrice * top.editQuantity) / total) * 100;
  });

  getItemWeight(itemValue: number): number {
    const total = this.totalPortfolioValue();
    return total > 0 ? (itemValue / total) * 100 : 0;
  }

  // ---------------------------------------------------------------------------
  // Agrupamento por Classe e Filtro de Busca
  // ---------------------------------------------------------------------------
  filteredGroups = computed<GroupedHoldings[]>(() => {
    const query = this.searchFilter.trim().toLowerCase();
    const all = this.holdings();

    const filtered = query
      ? all.filter(
          (h) =>
            h.ticker.toLowerCase().includes(query) ||
            h.assetClassName.toLowerCase().includes(query) ||
            (h.parentClassName && h.parentClassName.toLowerCase().includes(query))
        )
      : all;

    const groupMap = new Map<string, GroupedHoldings>();

    for (const item of filtered) {
      const existing = groupMap.get(item.assetClassId);
      if (existing) {
        existing.items.push(item);
        existing.totalClassValue += item.editPrice * item.editQuantity;
      } else {
        groupMap.set(item.assetClassId, {
          classId: item.assetClassId,
          className: item.assetClassName,
          parentClassName: item.parentClassName,
          targetPercentage: item.targetPercentage,
          totalClassValue: item.editPrice * item.editQuantity,
          portfolioPercentage: 0,
          items: [item],
        });
      }
    }

    const total = this.totalPortfolioValue();
    for (const grp of groupMap.values()) {
      grp.portfolioPercentage = total > 0 ? (grp.totalClassValue / total) * 100 : 0;
    }

    return Array.from(groupMap.values()).sort(
      (a, b) => b.totalClassValue - a.totalClassValue
    );
  });

  // ---------------------------------------------------------------------------
  // Quick Edit (Atualização Rápida)
  // ---------------------------------------------------------------------------
  onItemChanged(item: EditableHolding): void {
    const priceChanged = item.editPrice !== item.currentPrice;
    const qtyChanged = item.editQuantity !== item.quantity;
    item.isDirty = priceChanged || qtyChanged;
    // Dispara a recomputação dos signals
    this.holdings.update((list) => [...list]);
  }

  async saveQuickEdit(item: EditableHolding): Promise<void> {
    item.isSaving = true;
    try {
      await this.portfolioService.updateQuickValues(
        item.assetId,
        item.portfolioId,
        Number(item.editPrice) || 0,
        Number(item.editQuantity) || 0
      );

      item.currentPrice = Number(item.editPrice) || 0;
      item.quantity = Number(item.editQuantity) || 0;
      item.totalValue = item.currentPrice * item.quantity;
      item.isDirty = false;

      this.feedback.set({
        type: 'success',
        text: `Ativo "${item.ticker}" atualizado com sucesso!`,
      });
    } catch (err: any) {
      this.feedback.set({
        type: 'error',
        text: 'Erro ao atualizar ativo: ' + (err.message || 'Falha no Supabase.'),
      });
    } finally {
      item.isSaving = false;
      this.holdings.update((list) => [...list]);
    }
  }

  // ---------------------------------------------------------------------------
  // Modal de Adicionar Ativo
  // ---------------------------------------------------------------------------
  openAddModal(): void {
    this.addModel = {
      ticker: '',
      asset_class_id: this.availableClasses()[0]?.id || '',
      current_price: 0,
      quantity: 0,
    };
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  formatClassOption(cls: AssetClass): string {
    if (cls.parent_id) {
      const parent = this.availableClasses().find((p) => p.id === cls.parent_id);
      return `${parent?.name || 'Pai'} ↳ ${cls.name}`;
    }
    return `${cls.name} (${cls.target_percentage}%)`;
  }

  async handleAddAssetSubmit(): Promise<void> {
    if (!this.addModel.ticker.trim() || !this.addModel.asset_class_id) return;

    this.isModalSubmitting.set(true);
    try {
      await this.portfolioService.createAssetWithHolding({
        ticker: this.addModel.ticker,
        asset_class_id: this.addModel.asset_class_id,
        current_price: Number(this.addModel.current_price) || 0,
        quantity: Number(this.addModel.quantity) || 0,
      });

      this.closeAddModal();
      await this.loadData();

      this.feedback.set({
        type: 'success',
        text: `Ativo "${this.addModel.ticker.toUpperCase()}" cadastrado com sucesso!`,
      });
    } catch (err: any) {
      this.feedback.set({
        type: 'error',
        text: 'Erro ao cadastrar ativo: ' + (err.message || 'Falha no Supabase.'),
      });
    } finally {
      this.isModalSubmitting.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Exclusão de Ativo
  // ---------------------------------------------------------------------------
  async deleteAsset(item: EditableHolding): Promise<void> {
    const confirmDelete = await this.toastService.confirm({
      title: 'Excluir Ativo',
      message: `Deseja realmente remover o ativo "${item.ticker}" da sua carteira de investimentos?`,
      confirmText: 'Excluir Ativo',
      cancelText: 'Cancelar',
      isDestructive: true,
    });
    if (!confirmDelete) return;

    try {
      await this.portfolioService.deleteAsset(item.assetId);
      await this.loadData();
      this.toastService.success(`Ativo "${item.ticker}" excluído da carteira.`);
      this.feedback.set({
        type: 'success',
        text: `Ativo "${item.ticker}" excluído da carteira.`,
      });
    } catch (err: any) {
      this.toastService.error('Erro ao excluir ativo: ' + (err.message || 'Falha no Supabase.'));
      this.feedback.set({
        type: 'error',
        text: 'Erro ao excluir ativo: ' + (err.message || 'Falha no Supabase.'),
      });
    }
  }
}
