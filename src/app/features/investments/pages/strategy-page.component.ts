import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssetClass } from '../../../core/models/database.types';
import { AssetClassesService } from '../services/asset-classes.service';
import { ToastService } from '../../../core/services/toast.service';

interface ClassFormModel {
  id?: string;
  name: string;
  parent_id: string | null;
  target_percentage: number;
}

@Component({
  selector: 'app-strategy-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 font-sans">
      <!-- 1. Cabeçalho da Página e Ações Globais -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Estratégia de Alocação</h1>
          <p class="text-xs sm:text-sm text-gray-500 mt-1">
            Defina sua distribuição patrimonial ideal entre Classes Raiz e Subclasses especializadas.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="seedDefaultTemplate()"
            class="px-3.5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
            title="Preencher com o modelo sugerido (Renda Fixa 25%, Ações 40%, FIIs 15%, Cripto 5%, Reserva 15%)">
            <svg class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Modelo Sugerido</span>
          </button>

          <button
            type="button"
            (click)="openModalForRoot()"
            class="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-800 hover:text-gray-900 border border-gray-200 text-xs font-semibold transition-all flex items-center gap-2 shadow-2xs">
            <svg class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nova Classe Raiz</span>
          </button>

          <button
            type="button"
            (click)="saveAllPercentages()"
            [disabled]="!isAllValid() || isSaving() || classes().length === 0"
            [title]="!isAllValid() ? 'Distribuição precisa somar 100% para salvar' : 'Salvar alterações de metas no banco'"
            class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2">
            @if (isSaving()) {
              <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Salvando Metas...</span>
            } @else {
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Salvar Distribuição (100%)</span>
            }
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
          class="p-4 rounded-xl border text-xs flex items-center justify-between transition-all">
          <div class="flex items-center gap-2 font-medium">
            <span>{{ feedback()?.text }}</span>
          </div>
          <button (click)="feedback.set(null)" class="text-gray-400 hover:text-gray-700">✕</button>
        </div>
      }

      <!-- 3. Painel de Validação Global em Tempo Real (Classes Raiz) -->
      @if (classes().length > 0) {
        <div class="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div class="flex items-center gap-2.5">
              <span class="text-xs font-bold uppercase tracking-wider text-gray-500">Soma das Classes Raiz:</span>
              <span
                [class.text-blue-700]="isRootValid()"
                [class.text-amber-600]="totalRootPercentage() < 100"
                [class.text-rose-600]="totalRootPercentage() > 100"
                class="text-sm font-extrabold">
                {{ totalRootPercentage() | number: '1.2-2' }}% de 100%
              </span>
            </div>

            <div class="flex items-center gap-2">
              @if (isRootValid()) {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  Raízes Balanceadas
                </span>
              } @else if (totalRootPercentage() < 100) {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                  Falta alocar {{ (100 - totalRootPercentage()) | number: '1.2-2' }}%
                </span>
              } @else {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                  Excedeu em {{ (totalRootPercentage() - 100) | number: '1.2-2' }}%
                </span>
              }
            </div>
          </div>

          <!-- Barra de Progresso Global -->
          <div class="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/60">
            <div
              class="h-full rounded-full transition-all duration-300 ease-out"
              [class.bg-blue-600]="isRootValid()"
              [class.bg-amber-500]="totalRootPercentage() < 100"
              [class.bg-rose-500]="totalRootPercentage() > 100"
              [style.width.%]="rootBarWidth()"></div>
          </div>

          @if (!isAllValid()) {
            <p class="text-[11px] text-gray-500 mt-3 flex items-center gap-1.5 font-medium">
              <svg class="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ validationHint() }}</span>
            </p>
          }
        </div>
      }

      <!-- 4. Lista em Árvore/Cards de Classes e Subclasses -->
      @if (isLoading()) {
        <div class="p-16 text-center text-gray-400">
          <svg class="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span class="text-xs">Carregando classes de ativos do Supabase...</span>
        </div>
      } @else if (rootClasses().length === 0) {
        <!-- Empty State Inicial -->
        <div class="p-12 text-center rounded-2xl bg-white border border-dashed border-gray-300 max-w-xl mx-auto shadow-xs">
          <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-4">
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-gray-900">Nenhuma classe configurada ainda</h3>
          <p class="text-xs text-gray-500 mt-2 leading-relaxed">
            Para montar sua carteira de investimentos com segurança, defina as classes de ativos (ex: Renda Fixa, Ações, FIIs) e a meta percentual de cada uma.
          </p>

          <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              (click)="openModalForRoot()"
              class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm shadow-blue-500/20">
              Criar Primeira Classe Raiz
            </button>
            <button
              (click)="seedDefaultTemplate()"
              class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold transition-all">
              Carregar Modelo Sugerido
            </button>
          </div>
        </div>
      } @else {
        <div class="grid grid-cols-1 gap-5">
          @for (root of rootClasses(); track root.id) {
            <div class="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs transition-all hover:border-gray-300">
              <!-- Linha Principal da Classe Raiz -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {{ root.name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="text-base font-bold text-gray-900">{{ root.name }}</h3>
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                        Classe Raiz
                      </span>
                    </div>
                    <span class="text-xs text-gray-500">
                      {{ getSubclasses(root.id).length }} {{ getSubclasses(root.id).length === 1 ? 'subclasse' : 'subclasses' }}
                    </span>
                  </div>
                </div>

                <!-- Input de Porcentagem Alvo da Raiz e Ações -->
                <div class="flex items-center gap-3 sm:gap-4">
                  <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                    <span class="text-xs text-gray-500 font-medium">Meta Global:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      [(ngModel)]="root.target_percentage"
                      (ngModelChange)="onPercentageChanged()"
                      class="w-16 bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-right font-bold text-sm text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <span class="text-xs text-gray-600 font-bold">%</span>
                  </div>

                  <div class="flex items-center gap-1">
                    <button
                      (click)="openModalForSubclass(root.id)"
                      title="Adicionar Subclasse"
                      class="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-blue-700 border border-gray-200 transition-colors">
                      <svg class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button
                      (click)="openEditModal(root)"
                      title="Editar Nome"
                      class="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      (click)="deleteClass(root.id, root.name)"
                      title="Excluir Classe"
                      class="p-2 rounded-xl hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Validação e Barra das Subclasses desta Raiz -->
              @if (getSubclasses(root.id).length > 0) {
                <div class="mt-4 pt-1">
                  <div class="flex items-center justify-between text-xs mb-2">
                    <span class="text-gray-500 font-medium">Distribuição interna das Subclasses:</span>
                    <span
                      [class.text-blue-700]="isSubclassTotalValid(root.id)"
                      [class.text-amber-600]="getSubclassTotal(root.id) < 100"
                      [class.text-rose-600]="getSubclassTotal(root.id) > 100"
                      class="font-bold">
                      {{ getSubclassTotal(root.id) | number: '1.2-2' }}% de 100% da classe
                    </span>
                  </div>

                  <!-- Barra de Progresso da Subclasse -->
                  <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/60 mb-3.5">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      [class.bg-blue-600]="isSubclassTotalValid(root.id)"
                      [class.bg-amber-500]="getSubclassTotal(root.id) < 100"
                      [class.bg-rose-500]="getSubclassTotal(root.id) > 100"
                      [style.width.%]="subclassBarWidth(root.id)"></div>
                  </div>

                  <!-- Lista de Subclasses -->
                  <div class="space-y-2">
                    @for (sub of getSubclasses(root.id); track sub.id) {
                      <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 border border-gray-200/80 hover:border-gray-300 transition-all">
                        <div class="flex items-center gap-3">
                          <span class="text-gray-400 font-mono text-xs">↳</span>
                          <div>
                            <span class="text-xs font-bold text-gray-900">{{ sub.name }}</span>
                            <span class="block text-[11px] text-gray-500">
                              Impacto real na carteira total:
                              <strong class="text-gray-700">{{ getEffectivePercentage(root, sub) | number: '1.2-2' }}%</strong>
                            </span>
                          </div>
                        </div>

                        <div class="flex items-center gap-3">
                          <div class="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              [(ngModel)]="sub.target_percentage"
                              (ngModelChange)="onPercentageChanged()"
                              class="w-14 bg-transparent text-right font-bold text-xs text-blue-700 focus:outline-none" />
                            <span class="text-[11px] text-gray-500 font-semibold">%</span>
                          </div>

                          <div class="flex items-center gap-1">
                            <button
                              (click)="openEditModal(sub)"
                              title="Editar"
                              class="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors">
                              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              (click)="deleteClass(sub.id, sub.name)"
                              title="Excluir"
                              class="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors">
                              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <div class="mt-4 p-3 rounded-xl bg-gray-50 border border-dashed border-gray-300 flex items-center justify-between text-xs text-gray-500">
                  <span>Esta classe ainda não possui subclasses. Ela atuará diretamente como folha da carteira.</span>
                  <button
                    (click)="openModalForSubclass(root.id)"
                    class="text-xs text-blue-600 hover:text-blue-700 font-semibold underline transition-colors">
                    + Adicionar Subclasse
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- 5. Modal de Cadastro/Edição de Classe -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-xs">
          <div class="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <h3 class="text-base font-bold text-gray-900 mb-1">
              {{ formModel.id ? 'Editar Classe de Ativo' : (formModel.parent_id ? 'Nova Subclasse' : 'Nova Classe Raiz') }}
            </h3>
            <p class="text-xs text-gray-500 mb-6">
              {{ formModel.parent_id ? 'As subclasses dividem a porcentagem da classe pai.' : 'As classes raiz dividem o bolo total de 100% da carteira.' }}
            </p>

            <form (ngSubmit)="handleModalSubmit()" class="space-y-4">
              <!-- Nome -->
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="className">Nome da Classe</label>
                <input
                  id="className"
                  type="text"
                  required
                  [(ngModel)]="formModel.name"
                  name="className"
                  placeholder="Ex: Ações Brasileiras, Renda Fixa Pós, FIIs..."
                  class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all" />
              </div>

              <!-- Classe Pai (Select se não for raiz) -->
              @if (formModel.parent_id || (!formModel.id && availableParents().length > 0)) {
                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1" for="parentSelect">Pertence à Classe Pai:</label>
                  <select
                    id="parentSelect"
                    [(ngModel)]="formModel.parent_id"
                    name="parentSelect"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all">
                    <option [ngValue]="null">Nenhuma (É uma Classe Raiz)</option>
                    @for (parent of availableParents(); track parent.id) {
                      <option [ngValue]="parent.id">{{ parent.name }}</option>
                    }
                  </select>
                </div>
              }

              <!-- Porcentagem Inicial -->
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="targetPercentage">
                  Meta Inicial (%)
                </label>
                <input
                  id="targetPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  required
                  [(ngModel)]="formModel.target_percentage"
                  name="targetPercentage"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all" />
              </div>

              <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="isModalSubmitting() || !formModel.name"
                  class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs">
                  {{ isModalSubmitting() ? 'Salvando...' : 'Confirmar' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class StrategyPageComponent implements OnInit {
  private readonly classesService = inject(AssetClassesService);
  private readonly toastService = inject(ToastService);

  classes = signal<AssetClass[]>([]);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  isModalSubmitting = signal<boolean>(false);
  showModal = signal<boolean>(false);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  formModel: ClassFormModel = {
    name: '',
    parent_id: null,
    target_percentage: 0,
  };

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.classesService.getClasses();
      this.classes.set(data);
    } catch (err: any) {
      this.feedback.set({
        type: 'error',
        text: 'Erro ao carregar classes: ' + (err.message || 'Falha de comunicação com o Supabase.'),
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  // Classes Raiz
  rootClasses = computed(() => {
    return this.classes().filter((c) => !c.parent_id);
  });

  // Lista de pais disponíveis para o modal
  availableParents = computed(() => {
    return this.classes().filter((c) => !c.parent_id);
  });

  // Soma das porcentagens de todas as raízes
  totalRootPercentage = computed(() => {
    const sum = this.rootClasses().reduce((acc, c) => acc + (Number(c.target_percentage) || 0), 0);
    return Math.round(sum * 100) / 100;
  });

  // Validação: Raízes devem somar 100%
  isRootValid = computed(() => {
    return Math.abs(this.totalRootPercentage() - 100) < 0.01;
  });

  rootBarWidth = computed(() => {
    return Math.min(100, this.totalRootPercentage());
  });

  // Retorna subclasses de um pai
  getSubclasses(parentId: string): AssetClass[] {
    return this.classes().filter((c) => c.parent_id === parentId);
  }

  // Soma de subclasses de um pai
  getSubclassTotal(parentId: string): number {
    const subs = this.getSubclasses(parentId);
    const sum = subs.reduce((acc, s) => acc + (Number(s.target_percentage) || 0), 0);
    return Math.round(sum * 100) / 100;
  }

  isSubclassTotalValid(parentId: string): boolean {
    return Math.abs(this.getSubclassTotal(parentId) - 100) < 0.01;
  }

  subclassBarWidth(parentId: string): number {
    return Math.min(100, this.getSubclassTotal(parentId));
  }

  // Impacto real na carteira total
  getEffectivePercentage(parent: AssetClass, sub: AssetClass): number {
    const parentVal = Number(parent.target_percentage) || 0;
    const subVal = Number(sub.target_percentage) || 0;
    return (parentVal * subVal) / 100;
  }

  // Validação Geral (Raízes em 100% e todas as raízes com subclasses em 100%)
  isAllValid = computed(() => {
    if (!this.isRootValid() || this.rootClasses().length === 0) {
      return false;
    }

    for (const root of this.rootClasses()) {
      const subs = this.getSubclasses(root.id);
      if (subs.length > 0 && !this.isSubclassTotalValid(root.id)) {
        return false;
      }
    }

    return true;
  });

  // Mensagem didática de auxílio
  validationHint = computed(() => {
    if (!this.isRootValid()) {
      const diff = 100 - this.totalRootPercentage();
      if (diff > 0) {
        return `As Classes Raiz somam ${this.totalRootPercentage()}%. Faltam ${diff.toFixed(1)}% para fechar 100%.`;
      } else {
        return `As Classes Raiz ultrapassaram 100% (atual: ${this.totalRootPercentage()}%). Reduza ${Math.abs(diff).toFixed(1)}%.`;
      }
    }

    for (const root of this.rootClasses()) {
      const subs = this.getSubclasses(root.id);
      if (subs.length > 0 && !this.isSubclassTotalValid(root.id)) {
        const total = this.getSubclassTotal(root.id);
        const diff = 100 - total;
        return `As subclasses de "${root.name}" somam ${total}%. Devem somar exatamente 100% (diferença de ${Math.abs(diff).toFixed(1)}%).`;
      }
    }

    return 'Todas as porcentagens estão perfeitamente equilibradas em 100%!';
  });

  onPercentageChanged(): void {
    // Reavalia computeds via signals
    this.classes.update((list) => [...list]);
  }

  async saveAllPercentages(): Promise<void> {
    if (!this.isAllValid()) return;

    this.isSaving.set(true);
    this.feedback.set(null);

    try {
      const payload = this.classes().map((c) => ({
        id: c.id,
        target_percentage: Number(c.target_percentage) || 0,
      }));

      await this.classesService.batchUpdatePercentages(payload);
      this.feedback.set({
        type: 'success',
        text: 'Estratégia de metas 100% salva no banco com sucesso!',
      });
    } catch (err: any) {
      this.feedback.set({
        type: 'error',
        text: 'Erro ao salvar metas: ' + (err.message || 'Erro inesperado no Supabase.'),
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  openModalForRoot(): void {
    this.formModel = {
      name: '',
      parent_id: null,
      target_percentage: 0,
    };
    this.showModal.set(true);
  }

  openModalForSubclass(parentId: string): void {
    this.formModel = {
      name: '',
      parent_id: parentId,
      target_percentage: 0,
    };
    this.showModal.set(true);
  }

  openEditModal(item: AssetClass): void {
    this.formModel = {
      id: item.id,
      name: item.name,
      parent_id: item.parent_id,
      target_percentage: Number(item.target_percentage) || 0,
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  async handleModalSubmit(): Promise<void> {
    if (!this.formModel.name.trim()) return;

    this.isModalSubmitting.set(true);
    try {
      if (this.formModel.id) {
        await this.classesService.updateClass(this.formModel.id, {
          name: this.formModel.name,
          parent_id: this.formModel.parent_id,
          target_percentage: this.formModel.target_percentage,
        });
      } else {
        await this.classesService.createClass({
          name: this.formModel.name,
          parent_id: this.formModel.parent_id,
          target_percentage: this.formModel.target_percentage,
        });
      }

      this.closeModal();
      await this.loadData();
      this.feedback.set({
        type: 'success',
        text: `Classe "${this.formModel.name}" gravada com sucesso!`,
      });
    } catch (err: any) {
      this.feedback.set({
        type: 'error',
        text: 'Erro ao salvar classe: ' + (err.message || 'Falha no Supabase.'),
      });
    } finally {
      this.isModalSubmitting.set(false);
    }
  }

  async deleteClass(id: string, name: string): Promise<void> {
    const confirmDelete = await this.toastService.confirm({
      title: 'Excluir Classe de Ativo',
      message: `Deseja realmente excluir "${name}"? Se houver subclasses ou ativos vinculados, eles serão afetados.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      isDestructive: true,
    });
    if (!confirmDelete) return;

    try {
      await this.classesService.deleteClass(id);
      await this.loadData();
      this.toastService.success(`Classe "${name}" excluída com sucesso.`);
      this.feedback.set({
        type: 'success',
        text: `Classe "${name}" excluída com sucesso.`,
      });
    } catch (err: any) {
      this.toastService.error('Erro ao excluir classe: ' + (err.message || 'Falha no Supabase.'));
      this.feedback.set({
        type: 'error',
        text: 'Erro ao excluir classe: ' + (err.message || 'Falha no Supabase.'),
      });
    }
  }

  // Preenche o modelo sugerido configurado pelo usuário (sem subclasses iniciais)
  async seedDefaultTemplate(): Promise<void> {
    if (this.classes().length > 0) {
      const confirmOverwrite = await this.toastService.confirm({
        title: 'Aplicar Modelo Sugerido',
        message: 'Você já possui classes cadastradas. Deseja adicionar as 5 classes do modelo sugerido (Renda Fixa 25%, Ações 40%, FIIs & REITs 15%, Cripto 5%, Reserva 15%)?',
        confirmText: 'Adicionar Modelo',
        cancelText: 'Cancelar',
        isDestructive: false,
      });
      if (!confirmOverwrite) return;
    }

    this.isLoading.set(true);
    try {
      const templateClasses = [
        { name: 'Renda Fixa', target_percentage: 25 },
        { name: 'Ações', target_percentage: 40 },
        { name: 'Fundos Imobiliários & REITs', target_percentage: 15 },
        { name: 'Criptomoedas', target_percentage: 5 },
        { name: 'Reserva de Valor', target_percentage: 15 },
      ];

      for (const item of templateClasses) {
        await this.classesService.createClass({
          name: item.name,
          parent_id: null,
          target_percentage: item.target_percentage,
        });
      }

      await this.loadData();
      this.feedback.set({
        type: 'success',
        text: 'Modelo sugerido inserido com sucesso (100% equilibrado em 5 classes raiz)!',
      });
    } catch (err: any) {
      this.feedback.set({
        type: 'error',
        text: 'Erro ao carregar modelo: ' + (err.message || 'Verifique sua conexão com o Supabase.'),
      });
    } finally {
      this.isLoading.set(false);
    }
  }
}
