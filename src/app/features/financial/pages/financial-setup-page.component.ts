import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BudgetGroup,
  Category,
  CreditCard,
  FinancialAccount,
} from '../../../core/models/database.types';
import { FinanceSetupService } from '../services/finance-setup.service';
import { ToastService } from '../../../core/services/toast.service';
import { SupabaseService } from '../../../core/services/supabase.service';

type SetupTab = 'accounts-cards' | 'budget-categories';

@Component({
  selector: 'app-financial-setup-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 font-sans">
      <!-- 1. Cabeçalho Principal -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Configurações Financeiras</h1>
          <p class="text-sm text-gray-500 mt-1">
            Cadastre suas contas bancárias, cartões de crédito e defina a regra de orçamento 50/30/20 com categorias.
          </p>
        </div>

        <!-- Seletor de Abas -->
        <div class="flex p-1 bg-gray-100 border border-gray-200/80 rounded-2xl">
          <button
            type="button"
            (click)="activeTab.set('accounts-cards')"
            [class.bg-white]="activeTab() === 'accounts-cards'"
            [class.text-blue-700]="activeTab() === 'accounts-cards'"
            [class.shadow-2xs]="activeTab() === 'accounts-cards'"
            [class.font-bold]="activeTab() === 'accounts-cards'"
            class="px-4 py-2 text-xs rounded-xl font-medium text-gray-600 hover:text-gray-900 transition-all flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Contas & Cartões</span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('budget-categories')"
            [class.bg-white]="activeTab() === 'budget-categories'"
            [class.text-blue-700]="activeTab() === 'budget-categories'"
            [class.shadow-2xs]="activeTab() === 'budget-categories'"
            [class.font-bold]="activeTab() === 'budget-categories'"
            class="px-4 py-2 text-xs rounded-xl font-medium text-gray-600 hover:text-gray-900 transition-all flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
            <span>Orçamento & Categorias</span>
          </button>
        </div>
      </div>

      <!-- Alertas de Feedback -->
      @if (feedback()) {
        <div
          [class.bg-emerald-50]="feedback()?.type === 'success'"
          [class.border-emerald-200]="feedback()?.type === 'success'"
          [class.text-emerald-800]="feedback()?.type === 'success'"
          [class.bg-rose-50]="feedback()?.type === 'error'"
          [class.border-rose-200]="feedback()?.type === 'error'"
          [class.text-rose-800]="feedback()?.type === 'error'"
          class="p-4 rounded-xl border text-xs flex items-center justify-between transition-all shadow-xs">
          <span>{{ feedback()?.text }}</span>
          <button (click)="feedback.set(null)" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      }

      @if (isLoading()) {
        <div class="p-16 text-center text-gray-400">
          <svg class="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span class="text-xs">Carregando configurações financeiras...</span>
        </div>
      } @else {
        <!-- ================================================================= -->
        <!-- ABA 1: CONTAS E CARTÕES -->
        <!-- ================================================================= -->
        @if (activeTab() === 'accounts-cards') {
          <div class="space-y-8">
            <!-- 1.1 Seção de Contas Bancárias / Carteiras -->
            <div class="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 class="text-lg font-bold text-gray-900 tracking-tight">Contas Bancárias & Carteiras</h2>
                  <p class="text-xs text-gray-500 mt-0.5">
                    Saldo disponível para movimentação e conciliação bancária.
                  </p>
                </div>

                <div class="flex items-center gap-3">
                  <div class="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                    <span class="text-gray-600">Saldo Consolidado: </span>
                    <strong class="text-emerald-600 font-mono">{{ totalAccountBalance() | currency: 'BRL':'symbol':'1.2-2' }}</strong>
                  </div>

                  <button
                    type="button"
                    (click)="openAccountModal()"
                    class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Nova Conta</span>
                  </button>
                </div>
              </div>

              @if (accounts().length === 0) {
                <div class="p-8 rounded-2xl bg-gray-50 border border-dashed border-gray-300 text-center">
                  <p class="text-xs text-gray-500">Nenhuma conta cadastrada ainda. Adicione sua primeira conta (ex: Nubank, Itaú, Carteira).</p>
                </div>
              } @else {
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  @for (acc of accounts(); track acc.id) {
                    <div class="p-5 rounded-2xl bg-white border border-gray-200/90 hover:border-blue-500/30 transition-all flex flex-col justify-between shadow-xs">
                      <div class="flex items-start justify-between gap-2 mb-4">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-700 flex items-center justify-center font-bold">
                            {{ acc.name.charAt(0).toUpperCase() }}
                          </div>
                          <div>
                            <h3 class="text-sm font-bold text-gray-900">{{ acc.name }}</h3>
                            <span class="text-[10px] text-gray-400">Conta Ativa</span>
                          </div>
                        </div>

                        <button
                          (click)="deleteAccount(acc)"
                          title="Excluir Conta"
                          class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-rose-600 transition-colors">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <!-- Quick Edit de Saldo da Conta -->
                      <div class="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <span class="text-[11px] font-semibold text-gray-500">Saldo Atual:</span>
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs text-gray-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            [(ngModel)]="acc.balance"
                            (change)="updateAccountBalance(acc)"
                            class="w-28 text-right px-2 py-1 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- 1.2 Seção de Cartões de Crédito -->
            <div class="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 class="text-lg font-bold text-gray-900 tracking-tight">Cartões de Crédito</h2>
                  <p class="text-xs text-gray-500 mt-0.5">
                    Controle de faturas, dias de fechamento e datas de vencimento.
                  </p>
                </div>

                <button
                  type="button"
                  (click)="openCardModal()"
                  class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Novo Cartão</span>
                </button>
              </div>

              @if (creditCards().length === 0) {
                <div class="p-8 rounded-2xl bg-gray-50 border border-dashed border-gray-300 text-center">
                  <p class="text-xs text-gray-500">Nenhum cartão de crédito cadastrado ainda (ex: XP Visa Infinite, Nubank Mastercard).</p>
                </div>
              } @else {
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  @for (card of creditCards(); track card.id) {
                    <div class="p-5 rounded-2xl bg-white border border-gray-200/90 hover:border-blue-500/30 transition-all flex flex-col justify-between shadow-xs">
                      <div class="flex items-start justify-between gap-2 mb-4">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-700 flex items-center justify-center font-bold">
                            💳
                          </div>
                          <div>
                            <h3 class="text-sm font-bold text-gray-900">{{ card.name }}</h3>
                            <span class="text-[10px] text-gray-400">Cartão de Crédito</span>
                          </div>
                        </div>

                        <button
                          (click)="deleteCreditCard(card)"
                          title="Excluir Cartão"
                          class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-rose-600 transition-colors">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div class="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                        <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
                          <span class="text-[10px] text-gray-500 block">Fecha dia:</span>
                          <strong class="text-gray-900 font-mono text-sm">{{ card.closing_day }}</strong>
                        </div>
                        <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
                          <span class="text-[10px] text-gray-500 block">Vence dia:</span>
                          <strong class="text-blue-700 font-mono text-sm">{{ card.due_day }}</strong>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- ================================================================= -->
        <!-- ABA 2: ORÇAMENTO E CATEGORIAS -->
        <!-- ================================================================= -->
        @if (activeTab() === 'budget-categories') {
          <div class="space-y-8">
            <!-- 2.1 Gestão de Grupos de Orçamento (50/30/20) -->
            <div class="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div class="flex items-center gap-2">
                    <h2 class="text-lg font-bold text-gray-900 tracking-tight">Metas de Orçamento (50/30/20)</h2>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                      Editável
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 mt-0.5">
                    A soma das metas de despesas deve fechar exatamente em 100%.
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  @if (budgetGroups().length === 0) {
                    <button
                      type="button"
                      (click)="seedDefault503020()"
                      [disabled]="isDemoAccount()"
                      [title]="isDemoAccount() ? 'Indisponível na conta Demonstração' : 'Carregar Padrão 50/30/20'"
                      [class.opacity-40]="isDemoAccount()"
                      [class.cursor-not-allowed]="isDemoAccount()"
                      class="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 text-xs font-semibold transition-all">
                      Carregar Padrão 50/30/20
                    </button>
                  }

                  @if (expenseBudgetGroups().length > 0) {
                    <button
                      type="button"
                      (click)="autoBalanceBudget()"
                      title="Ajustar automaticamente os percentuais para somar 100%"
                      class="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-blue-700 hover:text-blue-800 border border-gray-200 text-xs font-semibold transition-all flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Equilibrar em 100%</span>
                    </button>
                  }

                  <button
                    type="button"
                    (click)="openBudgetGroupModal()"
                    class="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 text-xs font-semibold transition-all flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Novo Grupo</span>
                  </button>

                  <button
                    type="button"
                    (click)="saveBudgetPercentages()"
                    [disabled]="!isBudgetValid() || isSavingBudget()"
                    [title]="!isBudgetValid() ? budgetValidationHint() : 'Salvar metas no banco de dados'"
                    class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-xs">
                    {{ isSavingBudget() ? 'Salvando...' : 'Salvar Metas (100%)' }}
                  </button>
                </div>
              </div>

              <!-- Barra de Progresso da Regra de Orçamento -->
              @if (expenseBudgetGroups().length > 0) {
                <div class="mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <div class="flex items-center justify-between text-xs mb-2">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[11px]">Soma das Despesas:</span>
                    <span
                      [class.text-emerald-600]="isBudgetValid()"
                      [class.text-amber-600]="totalBudgetPercentage() < 100"
                      [class.text-rose-600]="totalBudgetPercentage() > 100"
                      class="font-mono font-black text-sm">
                      {{ totalBudgetPercentage() | number: '1.1-1' }}% de 100%
                    </span>
                  </div>

                  <div class="w-full h-3 bg-gray-200/80 rounded-full overflow-hidden p-0.5 border border-gray-300/60">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      [class.bg-emerald-500]="isBudgetValid()"
                      [class.bg-amber-500]="totalBudgetPercentage() < 100"
                      [class.bg-rose-500]="totalBudgetPercentage() > 100"
                      [style.width.%]="budgetBarWidth()"></div>
                  </div>

                  @if (!isBudgetValid()) {
                    <p class="text-[11px] text-gray-500 mt-3 flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{{ budgetValidationHint() }}</span>
                    </p>
                  }
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  @for (grp of expenseBudgetGroups(); track grp.id) {
                    <div class="p-5 rounded-2xl bg-white border border-gray-200/90 hover:border-gray-300 transition-all flex flex-col justify-between shadow-xs">
                      <div>
                        <div class="flex items-start justify-between gap-2 mb-3">
                          <h3 class="text-sm font-bold text-gray-900">{{ grp.name }}</h3>
                          <button
                            (click)="deleteBudgetGroup(grp)"
                            title="Excluir Grupo"
                            class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-rose-600 transition-colors">
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <span class="text-[11px] text-gray-400">
                          {{ getCategoriesCountForGroup(grp.id) }} categorias vinculadas
                        </span>
                      </div>

                      <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span class="text-xs text-gray-500 font-semibold">Meta de Saída:</span>
                        <div class="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            [(ngModel)]="grp.target_percentage"
                            (ngModelChange)="onBudgetPercentageChanged()"
                            class="w-16 text-right px-2 py-1 rounded-lg bg-gray-50 border border-gray-300 text-blue-700 font-mono text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
                          <span class="text-xs font-bold text-gray-500">%</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- 2.2 Gestão de Categorias -->
            <div class="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 class="text-lg font-bold text-gray-900 tracking-tight">Categorias de Transações</h2>
                  <p class="text-xs text-gray-500 mt-0.5">
                    Despesas associadas aos Grupos de Orçamento e Categorias de Receitas.
                  </p>
                </div>

                <button
                  type="button"
                  (click)="openCategoryModal()"
                  class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Nova Categoria</span>
                </button>
              </div>

              @if (categories().length === 0) {
                <div class="p-8 rounded-2xl bg-gray-50 border border-dashed border-gray-300 text-center">
                  <p class="text-xs text-gray-500">Nenhuma categoria cadastrada ainda.</p>
                </div>
              } @else {
                <div class="space-y-6">
                  <!-- Categorias de Receitas -->
                  <div>
                    <h3 class="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Categorias de Entrada (Receitas)
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      @for (cat of incomeCategories(); track cat.id) {
                        <div class="p-3.5 rounded-xl bg-white border border-gray-200/90 flex items-center justify-between shadow-2xs hover:border-gray-300 transition-colors">
                          <div class="flex items-center gap-3">
                            <span class="w-3.5 h-3.5 rounded-full shrink-0" [style.background-color]="cat.color_or_icon || '#10b981'"></span>
                            <span class="text-xs font-semibold text-gray-900">{{ cat.name }}</span>
                          </div>
                          <button
                            (click)="deleteCategory(cat)"
                            class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-rose-600 transition-colors">
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Categorias de Despesas Agrupadas pelo Grupo de Orçamento -->
                  @for (grp of expenseBudgetGroups(); track grp.id) {
                    <div class="pt-4 border-t border-gray-200">
                      <h3 class="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                        Despesas: {{ grp.name }} ({{ grp.target_percentage }}%)
                      </h3>
                      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        @for (cat of getCategoriesByGroup(grp.id); track cat.id) {
                          <div class="p-3.5 rounded-xl bg-white border border-gray-200/90 flex items-center justify-between shadow-2xs hover:border-gray-300 transition-colors">
                            <div class="flex items-center gap-3">
                              <span class="w-3.5 h-3.5 rounded-full shrink-0" [style.background-color]="cat.color_or_icon || '#ef4444'"></span>
                              <span class="text-xs font-semibold text-gray-900">{{ cat.name }}</span>
                            </div>
                            <button
                              (click)="deleteCategory(cat)"
                              class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-rose-600 transition-colors">
                              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- ================================================================= -->
      <!-- MODAL: NOVA CONTA -->
      <!-- ================================================================= -->
      @if (showAccountModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-xs">
          <div class="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-1">Nova Conta Bancária</h3>
            <p class="text-xs text-gray-500 mb-6">Cadastre uma conta corrente, poupança ou carteira de dinheiro.</p>

            <form (ngSubmit)="handleCreateAccount()" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="accName">Nome da Conta *</label>
                <input
                  id="accName"
                  type="text"
                  required
                  [(ngModel)]="accountForm.name"
                  name="accName"
                  placeholder="Ex: Nubank, Itaú, Carteira Física..."
                  class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="accBalance">Saldo Inicial (R$)</label>
                <input
                  id="accBalance"
                  type="number"
                  step="0.01"
                  required
                  [(ngModel)]="accountForm.balance"
                  name="accBalance"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
              </div>

              <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  (click)="showAccountModal.set(false)"
                  class="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="!accountForm.name"
                  class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs">
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ================================================================= -->
      <!-- MODAL: NOVO CARTÃO -->
      <!-- ================================================================= -->
      @if (showCardModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-xs">
          <div class="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-1">Novo Cartão de Crédito</h3>
            <p class="text-xs text-gray-500 mb-6">Informe as datas de corte e vencimento da fatura.</p>

            <form (ngSubmit)="handleCreateCard()" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="cardName">Nome do Cartão *</label>
                <input
                  id="cardName"
                  type="text"
                  required
                  [(ngModel)]="cardForm.name"
                  name="cardName"
                  placeholder="Ex: XP Visa Infinite, Nubank..."
                  class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1" for="closingDay">Dia Fechamento *</label>
                  <input
                    id="closingDay"
                    type="number"
                    min="1"
                    max="31"
                    required
                    [(ngModel)]="cardForm.closing_day"
                    name="closingDay"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1" for="dueDay">Dia Vencimento *</label>
                  <input
                    id="dueDay"
                    type="number"
                    min="1"
                    max="31"
                    required
                    [(ngModel)]="cardForm.due_day"
                    name="dueDay"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
                </div>
              </div>

              <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  (click)="showCardModal.set(false)"
                  class="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="!cardForm.name || !cardForm.closing_day || !cardForm.due_day"
                  class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs">
                  Salvar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ================================================================= -->
      <!-- MODAL: NOVO GRUPO DE ORÇAMENTO -->
      <!-- ================================================================= -->
      @if (showBudgetGroupModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-xs">
          <div class="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-1">Novo Grupo de Orçamento</h3>
            <p class="text-xs text-gray-500 mb-6">Crie uma fatia da regra orçamentária (ex: Necessidades, Desejos).</p>

            <form (ngSubmit)="handleCreateBudgetGroup()" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="bgName">Nome do Grupo *</label>
                <input
                  id="bgName"
                  type="text"
                  required
                  [(ngModel)]="budgetGroupForm.name"
                  name="bgName"
                  placeholder="Ex: Custos Fixos, Estilo de Vida..."
                  class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="bgPercentage">Meta de Porcentagem (%)</label>
                <input
                  id="bgPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  required
                  [(ngModel)]="budgetGroupForm.target_percentage"
                  name="bgPercentage"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
              </div>

              <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  (click)="showBudgetGroupModal.set(false)"
                  class="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="!budgetGroupForm.name"
                  class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs">
                  Salvar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ================================================================= -->
      <!-- MODAL: NOVA CATEGORIA -->
      <!-- ================================================================= -->
      @if (showCategoryModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-xs">
          <div class="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-1">Nova Categoria</h3>
            <p class="text-xs text-gray-500 mb-6">Classifique suas despesas ou receitas para análises detalhadas.</p>

            <form (ngSubmit)="handleCreateCategory()" class="space-y-4">
              <!-- Tipo da Categoria -->
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Tipo de Transação *</label>
                <div class="flex p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    (click)="categoryForm.type = 'EXPENSE'"
                    [class.bg-rose-500]="categoryForm.type === 'EXPENSE'"
                    [class.text-white]="categoryForm.type === 'EXPENSE'"
                    [class.shadow-2xs]="categoryForm.type === 'EXPENSE'"
                    class="flex-1 py-1.5 text-center rounded-lg text-xs font-bold transition-all text-gray-600 hover:text-gray-900">
                    Despesa (Saída)
                  </button>
                  <button
                    type="button"
                    (click)="categoryForm.type = 'INCOME'"
                    [class.bg-emerald-600]="categoryForm.type === 'INCOME'"
                    [class.text-white]="categoryForm.type === 'INCOME'"
                    [class.shadow-2xs]="categoryForm.type === 'INCOME'"
                    class="flex-1 py-1.5 text-center rounded-lg text-xs font-bold transition-all text-gray-600 hover:text-gray-900">
                    Receita (Entrada)
                  </button>
                </div>
              </div>

              <!-- Nome da Categoria -->
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="catName">Nome da Categoria *</label>
                <input
                  id="catName"
                  type="text"
                  required
                  [(ngModel)]="categoryForm.name"
                  name="catName"
                  placeholder="Ex: Alimentação, Combustível, Salário..."
                  class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
              </div>

              <!-- Grupo de Orçamento (Obrigatório se Despesa) -->
              @if (categoryForm.type === 'EXPENSE') {
                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1" for="catGroup">Grupo de Orçamento *</label>
                  <select
                    id="catGroup"
                    required
                    [(ngModel)]="categoryForm.budget_group_id"
                    name="catGroup"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600">
                    <option value="" disabled selected>Selecione um grupo de despesa...</option>
                    @for (grp of expenseBudgetGroups(); track grp.id) {
                      <option [value]="grp.id">{{ grp.name }} ({{ grp.target_percentage }}%)</option>
                    }
                  </select>
                </div>
              }

              <!-- Seletor de Cor -->
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Cor da Categoria</label>
                <div class="flex items-center gap-2">
                  @for (color of ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b']; track color) {
                    <button
                      type="button"
                      (click)="categoryForm.color_or_icon = color"
                      [style.background-color]="color"
                      [class.ring-2]="categoryForm.color_or_icon === color"
                      [class.ring-gray-900]="categoryForm.color_or_icon === color"
                      class="w-6 h-6 rounded-full transition-transform hover:scale-110 shadow-2xs"></button>
                  }
                </div>
              </div>

              <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  (click)="showCategoryModal.set(false)"
                  class="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="!categoryForm.name || (categoryForm.type === 'EXPENSE' && !categoryForm.budget_group_id)"
                  class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs">
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class FinancialSetupPageComponent implements OnInit {
  private readonly financeService = inject(FinanceSetupService);
  private readonly toastService = inject(ToastService);
  private readonly supabaseService = inject(SupabaseService);

  readonly isDemoAccount = this.supabaseService.isDemoAccount;

  activeTab = signal<SetupTab>('accounts-cards');
  isLoading = signal<boolean>(true);
  isSavingBudget = signal<boolean>(false);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dados
  accounts = signal<FinancialAccount[]>([]);
  creditCards = signal<CreditCard[]>([]);
  budgetGroups = signal<BudgetGroup[]>([]);
  categories = signal<Category[]>([]);

  // Modais
  showAccountModal = signal<boolean>(false);
  showCardModal = signal<boolean>(false);
  showBudgetGroupModal = signal<boolean>(false);
  showCategoryModal = signal<boolean>(false);

  // Forms
  accountForm = { name: '', balance: 0 };
  cardForm = { name: '', closing_day: 1, due_day: 10 };
  budgetGroupForm = { name: '', target_percentage: 0, type: 'EXPENSE' as const };
  categoryForm = {
    name: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    budget_group_id: '',
    color_or_icon: '#10b981',
  };

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [accs, cards, groups, cats] = await Promise.all([
        this.financeService.getAccounts(),
        this.financeService.getCreditCards(),
        this.financeService.getBudgetGroups(),
        this.financeService.getCategories(),
      ]);

      this.accounts.set(accs);
      this.creditCards.set(cards);
      this.budgetGroups.set(groups);
      this.categories.set(cats);
    } catch (err: any) {
      this.feedback.set({
        type: 'error',
        text: 'Erro ao carregar dados: ' + (err.message || 'Falha no Supabase.'),
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Computeds
  // ---------------------------------------------------------------------------
  totalAccountBalance = computed(() => {
    return this.accounts().reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  });

  expenseBudgetGroups = computed(() => {
    return this.budgetGroups().filter((g) => g.type === 'EXPENSE');
  });

  incomeCategories = computed(() => {
    return this.categories().filter((c) => c.type === 'INCOME');
  });

  totalBudgetPercentage = computed(() => {
    const sum = this.expenseBudgetGroups().reduce(
      (acc, g) => acc + (Number(g.target_percentage) || 0),
      0
    );
    return Math.round(sum * 10) / 10;
  });

  isBudgetValid = computed(() => {
    return (
      this.expenseBudgetGroups().length > 0 &&
      Math.abs(this.totalBudgetPercentage() - 100) < 0.1
    );
  });

  budgetBarWidth = computed(() => {
    return Math.min(100, this.totalBudgetPercentage());
  });

  budgetValidationHint = computed(() => {
    if (this.expenseBudgetGroups().length === 0) {
      return 'Nenhum grupo de despesas cadastrado. Adicione grupos ou carregue o modelo padrão 50/30/20.';
    }
    const total = this.totalBudgetPercentage();
    const diff = Math.round((100 - total) * 10) / 10;
    if (diff > 0) {
      return `As metas de despesas somam ${total}%. Faltam ${diff}% para fechar exatamente em 100%.`;
    }
    if (diff < 0) {
      return `As metas de despesas ultrapassaram 100% (atual: ${total}%). Reduza ${Math.abs(diff)}% para salvar.`;
    }
    return 'Metas perfeitamente equilibradas em 100%!';
  });

  onBudgetPercentageChanged(): void {
    // Reavalia computeds via signals emitindo nova referência de array
    this.budgetGroups.update((list) => [...list]);
  }

  autoBalanceBudget(): void {
    const expenses = this.expenseBudgetGroups();
    if (expenses.length === 0) return;

    if (expenses.length === 3) {
      // Padrão clássico 50 / 30 / 20 para 3 grupos
      expenses[0].target_percentage = 50;
      expenses[1].target_percentage = 30;
      expenses[2].target_percentage = 20;
    } else {
      // Distribuição proporcional inteligente somando 100%
      const currentSum = expenses.reduce((s, g) => s + (Number(g.target_percentage) || 0), 0);
      if (currentSum > 0) {
        let accumulated = 0;
        expenses.forEach((g, idx) => {
          if (idx === expenses.length - 1) {
            g.target_percentage = Math.max(0, 100 - accumulated);
          } else {
            const prop = Math.round(((Number(g.target_percentage) || 0) / currentSum) * 100);
            g.target_percentage = prop;
            accumulated += prop;
          }
        });
      } else {
        const equalShare = Math.floor(100 / expenses.length);
        let accumulated = 0;
        expenses.forEach((g, idx) => {
          if (idx === expenses.length - 1) {
            g.target_percentage = 100 - accumulated;
          } else {
            g.target_percentage = equalShare;
            accumulated += equalShare;
          }
        });
      }
    }

    this.budgetGroups.update((list) => [...list]);
    this.feedback.set({
      type: 'success',
      text: 'Metas equilibradas automaticamente em 100%! Clique em "Salvar Metas" para persistir.',
    });
  }

  getCategoriesCountForGroup(groupId: string): number {
    return this.categories().filter((c) => c.budget_group_id === groupId).length;
  }

  getCategoriesByGroup(groupId: string): Category[] {
    return this.categories().filter((c) => c.budget_group_id === groupId);
  }

  // ---------------------------------------------------------------------------
  // Ações de Contas
  // ---------------------------------------------------------------------------
  openAccountModal(): void {
    this.accountForm = { name: '', balance: 0 };
    this.showAccountModal.set(true);
  }

  async handleCreateAccount(): Promise<void> {
    if (!this.accountForm.name) return;
    try {
      await this.financeService.createAccount(
        this.accountForm.name,
        this.accountForm.balance
      );
      this.showAccountModal.set(false);
      await this.loadData();
      this.feedback.set({ type: 'success', text: 'Conta criada com sucesso!' });
    } catch (err: any) {
      this.feedback.set({ type: 'error', text: 'Erro ao criar conta: ' + err.message });
    }
  }

  async updateAccountBalance(acc: FinancialAccount): Promise<void> {
    try {
      await this.financeService.updateAccountBalance(acc.id, acc.balance);
      this.feedback.set({
        type: 'success',
        text: `Saldo de "${acc.name}" atualizado para R$ ${acc.balance.toFixed(2)}.`,
      });
      this.accounts.update((list) => [...list]);
    } catch (err: any) {
      this.feedback.set({ type: 'error', text: 'Erro ao atualizar saldo: ' + err.message });
    }
  }

  async deleteAccount(acc: FinancialAccount): Promise<void> {
    const confirmed = await this.toastService.confirm({
      title: 'Excluir Conta Bancária',
      message: `Deseja realmente excluir a conta "${acc.name}"? Todos os lançamentos vinculados ficarão sem conta associada.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      isDestructive: true,
    });
    if (!confirmed) return;
    try {
      await this.financeService.deleteAccount(acc.id);
      await this.loadData();
      this.toastService.success('Conta excluída com sucesso!');
      this.feedback.set({ type: 'success', text: 'Conta excluída com sucesso!' });
    } catch (err: any) {
      this.toastService.error('Erro ao excluir conta: ' + err.message);
      this.feedback.set({ type: 'error', text: 'Erro ao excluir conta: ' + err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // Ações de Cartões
  // ---------------------------------------------------------------------------
  openCardModal(): void {
    this.cardForm = { name: '', closing_day: 1, due_day: 10 };
    this.showCardModal.set(true);
  }

  async handleCreateCard(): Promise<void> {
    if (!this.cardForm.name) return;
    try {
      await this.financeService.createCreditCard(this.cardForm);
      this.showCardModal.set(false);
      await this.loadData();
      this.feedback.set({ type: 'success', text: 'Cartão de crédito cadastrado!' });
    } catch (err: any) {
      this.feedback.set({ type: 'error', text: 'Erro ao cadastrar cartão: ' + err.message });
    }
  }

  async deleteCreditCard(card: CreditCard): Promise<void> {
    const confirmed = await this.toastService.confirm({
      title: 'Excluir Cartão de Crédito',
      message: `Deseja realmente excluir o cartão "${card.name}"? As compras e faturas vinculadas serão desassociadas.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      isDestructive: true,
    });
    if (!confirmed) return;
    try {
      await this.financeService.deleteCreditCard(card.id);
      await this.loadData();
      this.toastService.success('Cartão excluído com sucesso!');
      this.feedback.set({ type: 'success', text: 'Cartão excluído com sucesso!' });
    } catch (err: any) {
      this.toastService.error('Erro ao excluir cartão: ' + err.message);
      this.feedback.set({ type: 'error', text: 'Erro ao excluir cartão: ' + err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // Ações de Grupos de Orçamento
  // ---------------------------------------------------------------------------
  openBudgetGroupModal(): void {
    const remaining = Math.max(0, Math.round((100 - this.totalBudgetPercentage()) * 10) / 10);
    this.budgetGroupForm = { name: '', target_percentage: remaining, type: 'EXPENSE' };
    this.showBudgetGroupModal.set(true);
  }

  async handleCreateBudgetGroup(): Promise<void> {
    const groupName = this.budgetGroupForm.name?.trim();
    if (!groupName) return;

    const newTarget = Number(this.budgetGroupForm.target_percentage) || 0;
    if (newTarget < 0) {
      this.feedback.set({ type: 'error', text: 'A porcentagem não pode ser negativa.' });
      return;
    }

    if (this.budgetGroupForm.type === 'EXPENSE') {
      const currentSum = this.totalBudgetPercentage();
      if (currentSum + newTarget > 100) {
        this.feedback.set({
          type: 'error',
          text: `Não é possível adicionar ${newTarget}%. A soma das despesas ultrapassaria 100% (atual: ${currentSum}%). Ajuste os grupos existentes antes.`,
        });
        return;
      }
    }

    try {
      await this.financeService.createBudgetGroup({
        ...this.budgetGroupForm,
        name: groupName,
        target_percentage: newTarget,
      });
      this.showBudgetGroupModal.set(false);
      await this.loadData();
      this.feedback.set({ type: 'success', text: 'Grupo de orçamento criado!' });
    } catch (err: any) {
      this.feedback.set({ type: 'error', text: 'Erro ao criar grupo: ' + err.message });
    }
  }

  async saveBudgetPercentages(): Promise<void> {
    if (!this.isBudgetValid()) {
      this.feedback.set({
        type: 'error',
        text: 'A soma das metas de despesas deve ser exatamente 100% para salvar.',
      });
      return;
    }

    const currentSum = this.expenseBudgetGroups().reduce(
      (acc, g) => acc + (Number(g.target_percentage) || 0),
      0
    );
    if (Math.abs(currentSum - 100) > 0.1) {
      this.feedback.set({
        type: 'error',
        text: `A soma das metas é ${currentSum}%. Ajuste os valores para somar exatamente 100%.`,
      });
      return;
    }

    this.isSavingBudget.set(true);
    try {
      const payload = this.expenseBudgetGroups().map((g) => ({
        id: g.id,
        target_percentage: Number(g.target_percentage) || 0,
      }));
      await this.financeService.batchUpdateBudgetGroupPercentages(payload);
      this.feedback.set({
        type: 'success',
        text: 'Metas do orçamento 50/30/20 salvas com 100% de sucesso!',
      });
    } catch (err: any) {
      this.feedback.set({ type: 'error', text: 'Erro ao salvar metas: ' + err.message });
    } finally {
      this.isSavingBudget.set(false);
    }
  }

  async deleteBudgetGroup(grp: BudgetGroup): Promise<void> {
    const confirmed = await this.toastService.confirm({
      title: 'Excluir Grupo Orçamentário',
      message: `Deseja excluir o grupo "${grp.name}"? As categorias vinculadas ficarão sem grupo associado.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      isDestructive: true,
    });
    if (!confirmed) return;
    try {
      await this.financeService.deleteBudgetGroup(grp.id);
      await this.loadData();
      this.toastService.success('Grupo excluído com sucesso!');
      this.feedback.set({ type: 'success', text: 'Grupo excluído com sucesso!' });
    } catch (err: any) {
      this.toastService.error('Erro ao excluir grupo: ' + err.message);
      this.feedback.set({ type: 'error', text: 'Erro ao excluir grupo: ' + err.message });
    }
  }

  async seedDefault503020(): Promise<void> {
    if (this.isDemoAccount()) {
      this.toastService.warning(
        'A carga automática de modelo padrão está desativada para a conta de demonstração.',
        'Conta Demo'
      );
      return;
    }
    this.isLoading.set(true);
    try {
      await this.financeService.seedDefault503020();
      await this.loadData();
      this.feedback.set({
        type: 'success',
        text: 'Modelo 50/30/20 e categorias essenciais configurados com sucesso!',
      });
    } catch (err: any) {
      this.feedback.set({ type: 'error', text: 'Erro ao carregar modelo: ' + err.message });
    } finally {
      this.isLoading.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Ações de Categorias
  // ---------------------------------------------------------------------------
  openCategoryModal(): void {
    const firstGroup = this.expenseBudgetGroups()[0]?.id || '';
    this.categoryForm = {
      name: '',
      type: 'EXPENSE',
      budget_group_id: firstGroup,
      color_or_icon: '#10b981',
    };
    this.showCategoryModal.set(true);
  }

  async handleCreateCategory(): Promise<void> {
    if (!this.categoryForm.name) return;
    try {
      await this.financeService.createCategory(this.categoryForm);
      this.showCategoryModal.set(false);
      await this.loadData();
      this.feedback.set({ type: 'success', text: 'Categoria cadastrada com sucesso!' });
    } catch (err: any) {
      this.feedback.set({ type: 'error', text: 'Erro ao cadastrar categoria: ' + err.message });
    }
  }

  async deleteCategory(cat: Category): Promise<void> {
    const confirmed = await this.toastService.confirm({
      title: 'Excluir Categoria',
      message: `Deseja realmente excluir a categoria "${cat.name}"?`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      isDestructive: true,
    });
    if (!confirmed) return;
    try {
      await this.financeService.deleteCategory(cat.id);
      await this.loadData();
      this.toastService.success('Categoria excluída com sucesso!');
      this.feedback.set({ type: 'success', text: 'Categoria excluída com sucesso!' });
    } catch (err: any) {
      this.toastService.error('Erro ao excluir categoria: ' + err.message);
      this.feedback.set({ type: 'error', text: 'Erro ao excluir categoria: ' + err.message });
    }
  }
}
