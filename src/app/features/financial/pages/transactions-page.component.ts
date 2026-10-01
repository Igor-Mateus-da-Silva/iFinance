import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Category,
  CreditCard,
  FinancialAccount,
  PaymentMethod,
  TransactionDetail,
  TransactionType,
} from '../../../core/models/database.types';
import { FinanceSetupService } from '../services/finance-setup.service';
import { TransactionService } from '../services/transaction.service';

type ViewMode = 'all-transactions' | 'card-invoices';

@Component({
  selector: 'app-transactions-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 font-sans">
      <!-- 1. Cabeçalho Principal e Navegação de Mês -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Lançamentos & Faturas</h1>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Operação Diária
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Controle de despesas, receitas, compras parceladas e faturas de cartão de crédito.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Seletor de Meses Moderno -->
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

            <span class="px-3 text-xs font-bold text-white capitalize min-w-[130px] text-center">
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

          <!-- Botão Novo Lançamento -->
          <button
            type="button"
            (click)="openNewTransactionModal()"
            class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      <!-- Alertas de Feedback -->
      @if (feedback()) {
        <div
          [class.bg-emerald-500/10]="feedback()?.type === 'success'"
          [class.border-emerald-500/30]="feedback()?.type === 'success'"
          [class.text-emerald-300]="feedback()?.type === 'success'"
          [class.bg-rose-500/10]="feedback()?.type === 'error'"
          [class.border-rose-500/30]="feedback()?.type === 'error'"
          [class.text-rose-300]="feedback()?.type === 'error'"
          class="p-4 rounded-xl border text-xs flex items-center justify-between transition-all">
          <span>{{ feedback()?.text }}</span>
          <button (click)="feedback.set(null)" class="text-slate-400 hover:text-white">✕</button>
        </div>
      }

      <!-- 2. Cards de Resumo do Mês -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Receitas -->
        <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span class="font-medium">Receitas do Mês</span>
            <div class="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
          </div>
          <div>
            <div class="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              {{ totalIncome() | currency: 'BRL':'symbol':'1.2-2' }}
            </div>
            <span class="text-[10px] text-slate-500 mt-1 block">
              {{ incomeCount() }} {{ incomeCount() === 1 ? 'entrada' : 'entradas' }} registradas
            </span>
          </div>
        </div>

        <!-- Despesas -->
        <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span class="font-medium">Despesas do Mês</span>
            <div class="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            </div>
          </div>
          <div>
            <div class="text-xl sm:text-2xl font-bold font-mono text-rose-400">
              {{ totalExpense() | currency: 'BRL':'symbol':'1.2-2' }}
            </div>
            <span class="text-[10px] text-slate-500 mt-1 block">
              {{ expenseCount() }} {{ expenseCount() === 1 ? 'saída' : 'saídas' }} registradas
            </span>
          </div>
        </div>

        <!-- Saldo Previsto -->
        <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span class="font-medium">Saldo Previsto</span>
            <div
              [class.bg-emerald-500/10]="netBalance() >= 0"
              [class.text-emerald-400]="netBalance() >= 0"
              [class.border-emerald-500/20]="netBalance() >= 0"
              [class.bg-rose-500/10]="netBalance() < 0"
              [class.text-rose-400]="netBalance() < 0"
              [class.border-rose-500/20]="netBalance() < 0"
              class="w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs">
              {{ netBalance() >= 0 ? '✓' : '!' }}
            </div>
          </div>
          <div>
            <div
              [class.text-emerald-400]="netBalance() >= 0"
              [class.text-rose-400]="netBalance() < 0"
              class="text-xl sm:text-2xl font-bold font-mono">
              {{ netBalance() | currency: 'BRL':'symbol':'1.2-2' }}
            </div>
            <span class="text-[10px] text-slate-500 mt-1 block">
              {{ netBalance() >= 0 ? 'Superávit previsto no mês' : 'Atenção: déficit previsto no mês' }}
            </span>
          </div>
        </div>

        <!-- Status de Pagamento (Pago vs Pendente) -->
        <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span class="font-medium">Situação dos Pagamentos</span>
            <span class="text-[11px] font-bold text-amber-400 font-mono">
              {{ pendingCount() }} pendentes
            </span>
          </div>
          <div>
            <div class="text-sm font-semibold text-slate-200">
              Pago: <span class="font-mono text-emerald-400 font-bold">{{ totalPaid() | currency: 'BRL':'symbol':'1.2-2' }}</span>
            </div>
            <div class="text-xs text-slate-400 mt-0.5">
              Pendente: <span class="font-mono text-amber-400 font-bold">{{ totalPending() | currency: 'BRL':'symbol':'1.2-2' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Abas de Visão: Visão Mensal Geral vs Faturas de Cartão -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex p-1 bg-slate-900 border border-slate-800 rounded-2xl">
          <button
            type="button"
            (click)="activeView.set('all-transactions')"
            [class.bg-emerald-500]="activeView() === 'all-transactions'"
            [class.text-slate-950]="activeView() === 'all-transactions'"
            [class.font-bold]="activeView() === 'all-transactions'"
            class="px-4 py-1.5 text-xs rounded-xl font-medium text-slate-300 transition-all flex items-center gap-2">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>Todas as Transações</span>
          </button>

          <button
            type="button"
            (click)="activeView.set('card-invoices')"
            [class.bg-indigo-500]="activeView() === 'card-invoices'"
            [class.text-slate-950]="activeView() === 'card-invoices'"
            [class.font-bold]="activeView() === 'card-invoices'"
            class="px-4 py-1.5 text-xs rounded-xl font-medium text-slate-300 transition-all flex items-center gap-2">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Faturas de Cartão</span>
            @if (creditCards().length > 0) {
              <span class="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-800 text-indigo-300">
                {{ creditCards().length }}
              </span>
            }
          </button>
        </div>

        @if (activeView() === 'all-transactions') {
          <!-- Filtro rápido por tipo -->
          <div class="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              (click)="typeFilter.set('ALL')"
              [class.bg-slate-800]="typeFilter() === 'ALL'"
              [class.text-white]="typeFilter() === 'ALL'"
              class="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-colors">
              Todas
            </button>
            <button
              (click)="typeFilter.set('EXPENSE')"
              [class.bg-slate-800]="typeFilter() === 'EXPENSE'"
              [class.text-rose-400]="typeFilter() === 'EXPENSE'"
              class="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-colors">
              Despesas
            </button>
            <button
              (click)="typeFilter.set('INCOME')"
              [class.bg-slate-800]="typeFilter() === 'INCOME'"
              [class.text-emerald-400]="typeFilter() === 'INCOME'"
              class="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-colors">
              Receitas
            </button>
          </div>
        }
      </div>

      <!-- 4. Conteúdo: ABA 1 - TODAS AS TRANSAÇÕES -->
      @if (activeView() === 'all-transactions') {
        @if (isLoading()) {
          <div class="p-16 text-center text-slate-400">
            <svg class="animate-spin h-8 w-8 text-emerald-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span class="text-xs">Carregando transações de {{ currentMonthLabel() }}...</span>
          </div>
        } @else if (filteredTransactions().length === 0) {
          <div class="p-12 text-center rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 max-w-xl mx-auto">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center mb-3">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 class="text-base font-bold text-white">Nenhum lançamento em {{ currentMonthLabel() }}</h3>
            <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Registre despesas do dia a dia, receitas salariais ou compras parceladas para acompanhar seu orçamento.
            </p>
            <button
              type="button"
              (click)="openNewTransactionModal()"
              class="mt-5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20">
              Registrar Primeiro Lançamento
            </button>
          </div>
        } @else {
          <!-- Tabela de Lançamentos -->
          <div class="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th class="py-3.5 px-4 font-bold text-center w-24">Status</th>
                    <th class="py-3.5 px-4 font-bold w-24">Data</th>
                    <th class="py-3.5 px-4 font-bold">Descrição</th>
                    <th class="py-3.5 px-4 font-bold">Categoria</th>
                    <th class="py-3.5 px-4 font-bold">Pagamento</th>
                    <th class="py-3.5 px-4 font-bold text-right">Valor</th>
                    <th class="py-3.5 px-4 font-bold text-center w-16">Ação</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-850">
                  @for (t of filteredTransactions(); track t.id) {
                    <tr class="hover:bg-slate-850/40 transition-colors group">
                      <!-- 1. Checkbox / Status com 1 clique -->
                      <td class="py-3 px-4 text-center">
                        <button
                          type="button"
                          (click)="togglePaid(t)"
                          [title]="t.is_paid ? 'Clique para marcar como Pendente' : 'Clique para marcar como Pago'"
                          [class.bg-emerald-500/10]="t.is_paid"
                          [class.border-emerald-500/30]="t.is_paid"
                          [class.text-emerald-400]="t.is_paid"
                          [class.bg-amber-500/10]="!t.is_paid"
                          [class.border-amber-500/30]="!t.is_paid"
                          [class.text-amber-400]="!t.is_paid"
                          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all hover:scale-105">
                          @if (t.is_paid) {
                            <span>✓</span>
                            <span>Pago</span>
                          } @else {
                            <span>⏳</span>
                            <span>Pendente</span>
                          }
                        </button>
                      </td>

                      <!-- 2. Data / Dia -->
                      <td class="py-3 px-4 font-mono text-slate-300 text-[11px] whitespace-nowrap">
                        {{ formatDisplayDate(t.date) }}
                      </td>

                      <!-- 3. Descrição + Tags (Parcela, Fixa, Cartão) -->
                      <td class="py-3 px-4">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-bold text-white text-xs">{{ t.description }}</span>

                          @if (t.total_installments > 1) {
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {{ t.current_installment }}/{{ t.total_installments }}
                            </span>
                          }

                          @if (t.is_fixed) {
                            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              Fixa
                            </span>
                          }

                          @if (t.credit_card) {
                            <span class="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                              <span>💳</span>
                              <span>{{ t.credit_card.name }}</span>
                            </span>
                          }
                        </div>
                      </td>

                      <!-- 4. Categoria -->
                      <td class="py-3 px-4">
                        <div class="flex items-center gap-2">
                          <span
                            class="w-2.5 h-2.5 rounded-full shrink-0"
                            [style.background-color]="t.category?.color_or_icon || '#10b981'"></span>
                          <span class="text-slate-300 text-xs">{{ t.category?.name || 'Sem categoria' }}</span>
                        </div>
                      </td>

                      <!-- 5. Forma de Pagamento -->
                      <td class="py-3 px-4 whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {{ t.payment_method }}
                        </span>
                      </td>

                      <!-- 6. Valor -->
                      <td class="py-3 px-4 text-right font-mono font-bold text-xs whitespace-nowrap">
                        <span [class.text-emerald-400]="t.type === 'INCOME'" [class.text-slate-200]="t.type === 'EXPENSE'">
                          {{ t.type === 'INCOME' ? '+' : '-' }} {{ t.amount | currency: 'BRL':'symbol':'1.2-2' }}
                        </span>
                      </td>

                      <!-- 7. Ações -->
                      <td class="py-3 px-4 text-center">
                        <button
                          type="button"
                          (click)="deleteTransaction(t)"
                          title="Excluir Lançamento"
                          class="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors">
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }

      <!-- 5. Conteúdo: ABA 2 - VISÃO DE FATURAS DE CARTÃO -->
      @if (activeView() === 'card-invoices') {
        @if (creditCards().length === 0) {
          <div class="p-12 text-center rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 max-w-xl mx-auto">
            <h3 class="text-base font-bold text-white">Nenhum Cartão de Crédito Cadastrado</h3>
            <p class="text-xs text-slate-400 mt-1">
              Cadastre seus cartões com o dia de fechamento e vencimento na aba de Configurações para gerenciar faturas.
            </p>
          </div>
        } @else {
          <div class="space-y-6">
            <!-- Seletor de Cartão e Resumo da Fatura -->
            <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <!-- Seletor do Cartão Ativo -->
                <div>
                  <label class="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Selecione o Cartão:
                  </label>
                  <select
                    [ngModel]="selectedCardId()"
                    (ngModelChange)="selectedCardId.set($event)"
                    class="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    @for (card of creditCards(); track card.id) {
                      <option [value]="card.id">
                        💳 {{ card.name }} (Fecha dia {{ card.closing_day }} | Vence dia {{ card.due_day }})
                      </option>
                    }
                  </select>
                </div>

                <!-- Detalhes da Fatura do Mês -->
                <div class="flex flex-wrap items-center gap-4">
                  <div class="bg-slate-850 p-3.5 rounded-2xl border border-slate-800">
                    <span class="text-[10px] text-slate-400 uppercase tracking-wider block">Fatura de {{ currentMonthLabel() }}:</span>
                    <strong class="text-xl font-bold font-mono text-indigo-400">
                      {{ selectedInvoiceTotal() | currency: 'BRL':'symbol':'1.2-2' }}
                    </strong>
                  </div>

                  @if (selectedInvoiceTotal() > 0) {
                    <button
                      type="button"
                      (click)="payEntireInvoice()"
                      [disabled]="selectedInvoiceAllPaid()"
                      class="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20">
                      {{ selectedInvoiceAllPaid() ? '✓ Fatura Paga' : 'Marcar Fatura como Paga' }}
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Lista de Itens da Fatura -->
            @if (cardInvoiceTransactions().length === 0) {
              <div class="p-10 text-center rounded-3xl bg-slate-900/60 border border-dashed border-slate-800">
                <p class="text-xs text-slate-400">Nenhum lançamento ou parcela caindo nesta fatura em {{ currentMonthLabel() }}.</p>
              </div>
            } @else {
              <div class="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th class="py-3 px-4 font-bold text-center w-24">Status</th>
                        <th class="py-3 px-4 font-bold w-24">Data</th>
                        <th class="py-3 px-4 font-bold">Descrição</th>
                        <th class="py-3 px-4 font-bold">Categoria</th>
                        <th class="py-3 px-4 font-bold text-center">Parcela</th>
                        <th class="py-3 px-4 font-bold text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-850">
                      @for (t of cardInvoiceTransactions(); track t.id) {
                        <tr class="hover:bg-slate-850/40 transition-colors">
                          <td class="py-3 px-4 text-center">
                            <button
                              type="button"
                              (click)="togglePaid(t)"
                              [class.bg-emerald-500/10]="t.is_paid"
                              [class.text-emerald-400]="t.is_paid"
                              [class.border-emerald-500/30]="t.is_paid"
                              [class.bg-amber-500/10]="!t.is_paid"
                              [class.text-amber-400]="!t.is_paid"
                              [class.border-amber-500/30]="!t.is_paid"
                              class="px-2 py-0.5 rounded-full text-[10px] font-bold border">
                              {{ t.is_paid ? '✓ Pago' : '⏳ Pendente' }}
                            </button>
                          </td>
                          <td class="py-3 px-4 font-mono text-slate-300">{{ formatDisplayDate(t.date) }}</td>
                          <td class="py-3 px-4 font-bold text-white">{{ t.description }}</td>
                          <td class="py-3 px-4">
                            <span class="text-slate-300">{{ t.category?.name }}</span>
                          </td>
                          <td class="py-3 px-4 text-center font-mono font-bold text-indigo-300">
                            {{ t.total_installments > 1 ? t.current_installment + '/' + t.total_installments : '1x' }}
                          </td>
                          <td class="py-3 px-4 text-right font-mono font-bold text-rose-400">
                            {{ t.amount | currency: 'BRL':'symbol':'1.2-2' }}
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
      }

      <!-- 6. MODAL: NOVO LANÇAMENTO (DESPESA OU RECEITA) -->
      @if (showNewModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div class="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 my-8">
            <!-- Alternador de Tipo no Topo do Modal -->
            <div class="flex p-1 bg-slate-800 rounded-2xl mb-6">
              <button
                type="button"
                (click)="setFormType('EXPENSE')"
                [class.bg-rose-500]="form.type === 'EXPENSE'"
                [class.text-white]="form.type === 'EXPENSE'"
                class="flex-1 py-2 text-center rounded-xl text-xs font-bold transition-all text-slate-400 flex items-center justify-center gap-1.5">
                <span>↓</span>
                <span>Nova Despesa (Saída)</span>
              </button>
              <button
                type="button"
                (click)="setFormType('INCOME')"
                [class.bg-emerald-500]="form.type === 'INCOME'"
                [class.text-slate-950]="form.type === 'INCOME'"
                class="flex-1 py-2 text-center rounded-xl text-xs font-bold transition-all text-slate-400 flex items-center justify-center gap-1.5">
                <span>↑</span>
                <span>Nova Receita (Entrada)</span>
              </button>
            </div>

            <form (ngSubmit)="handleSaveTransaction()" class="space-y-4">
              <!-- Valor (Destaque Principal) -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1" for="txAmount">Valor *</label>
                <div class="relative">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">R$</span>
                  <input
                    id="txAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    [(ngModel)]="form.amount"
                    name="txAmount"
                    placeholder="0,00"
                    class="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white font-mono text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              <!-- Descrição -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1" for="txDesc">Descrição *</label>
                <input
                  id="txDesc"
                  type="text"
                  required
                  [(ngModel)]="form.description"
                  name="txDesc"
                  placeholder="Ex: Mercado Pão de Açúcar, Salário Mensal..."
                  class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              <!-- Data do Lançamento -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1" for="txDate">
                  {{ form.type === 'INCOME' ? 'Data do Recebimento *' : 'Data da Compra / Entrada *' }}
                </label>
                <input
                  id="txDate"
                  type="date"
                  required
                  [(ngModel)]="form.date"
                  name="txDate"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              @if (form.type === 'EXPENSE') {
                <!-- Categoria (Apenas Despesas) -->
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1" for="txCategory">Categoria *</label>
                  <select
                    id="txCategory"
                    required
                    [(ngModel)]="form.category_id"
                    name="txCategory"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="" disabled selected>Selecione uma categoria...</option>
                    @for (cat of expenseCategories(); track cat.id) {
                      <option [value]="cat.id">{{ cat.name }}</option>
                    }
                  </select>
                </div>

                <!-- Forma de Pagamento (Apenas Despesas) -->
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1" for="txMethod">Forma de Pagamento *</label>
                  <select
                    id="txMethod"
                    required
                    [(ngModel)]="form.payment_method"
                    (ngModelChange)="onPaymentMethodChanged($event)"
                    name="txMethod"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="PIX">PIX</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="DEBITO">Cartão de Débito</option>
                    <option value="CREDITO">Cartão de Crédito</option>
                    <option value="VALE">Vale (Alimentação / Refeição)</option>
                  </select>
                </div>

                <!-- Lógica Condicional: Se for CRÉDITO -->
                @if (form.payment_method === 'CREDITO') {
                  <div class="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                    <div>
                      <label class="block text-xs font-semibold text-indigo-300 mb-1" for="txCard">Cartão de Crédito *</label>
                      <select
                        id="txCard"
                        required
                        [(ngModel)]="form.credit_card_id"
                        name="txCard"
                        class="w-full px-3.5 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="" disabled selected>Selecione o cartão...</option>
                        @for (c of creditCards(); track c.id) {
                          <option [value]="c.id">
                            {{ c.name }} (Fecha dia {{ c.closing_day }} | Vence dia {{ c.due_day }})
                          </option>
                        }
                      </select>
                    </div>

                    <div>
                      <label class="block text-xs font-semibold text-indigo-300 mb-1" for="txInstallments">
                        Número de Parcelas (1 a 12)
                      </label>
                      <div class="flex items-center gap-3">
                        <input
                          id="txInstallments"
                          type="number"
                          min="1"
                          max="12"
                          step="1"
                          [(ngModel)]="form.installments"
                          name="txInstallments"
                          class="w-24 px-3 py-1.5 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        @if (form.installments > 1 && (form.amount || 0) > 0) {
                          <span class="text-xs text-indigo-300 font-mono">
                            {{ form.installments }}x de {{ ((form.amount || 0) / form.installments) | currency: 'BRL':'symbol':'1.2-2' }}
                          </span>
                        }
                      </div>
                    </div>

                    <!-- Dica de Virada de Fatura -->
                    @if (selectedCardForForm(); as card) {
                      <p class="text-[11px] text-slate-400 leading-relaxed pt-1">
                        💡 <strong>Virada de Fatura:</strong> O cartão <em>{{ card.name }}</em> fecha todo dia <strong>{{ card.closing_day }}</strong>.
                        @if (isPurchaseAfterClosing(form.date, card.closing_day)) {
                          <span class="text-amber-300 block font-semibold mt-0.5">
                            A data selecionada é a partir do fechamento: a 1ª parcela entrará na fatura do mês seguinte!
                          </span>
                        } @else {
                          <span class="text-emerald-300 block mt-0.5">
                            A compra entrará na fatura do mês atual.
                          </span>
                        }
                      </p>
                    }
                  </div>
                } @else {
                  <!-- Conta Bancária (opcional para outras formas) -->
                  @if (accounts().length > 0) {
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1" for="txAccount">Conta / Carteira</label>
                      <select
                        id="txAccount"
                        [(ngModel)]="form.account_id"
                        name="txAccount"
                        class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option [ngValue]="null">Nenhuma conta associada</option>
                        @for (acc of accounts(); track acc.id) {
                          <option [value]="acc.id">{{ acc.name }} (Saldo: {{ acc.balance | currency: 'BRL':'symbol':'1.2-2' }})</option>
                        }
                      </select>
                    </div>
                  }
                }

                <!-- Checkboxes: Despesa Fixa & Já Pago -->
                <div class="pt-2 space-y-2 border-t border-slate-800 text-xs">
                  <label class="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      [(ngModel)]="form.is_fixed"
                      name="txIsFixed"
                      class="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0" />
                    <span>É uma despesa fixa mensal (repete todo mês)</span>
                  </label>

                  <label class="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      [(ngModel)]="form.is_paid"
                      name="txIsPaid"
                      class="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0" />
                    <span>Já foi pago</span>
                  </label>
                </div>
              } @else {
                <!-- Se for RECEITA: Categoria de Entrada e Conta de Destino -->
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1" for="txCategoryIncome">Categoria de Entrada (Receita)</label>
                  <select
                    id="txCategoryIncome"
                    [(ngModel)]="form.category_id"
                    name="txCategoryIncome"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option [ngValue]="null">Sem categoria (Geral)</option>
                    @for (cat of incomeCategories(); track cat.id) {
                      <option [value]="cat.id">{{ cat.name }}</option>
                    }
                  </select>
                </div>

                @if (accounts().length > 0) {
                  <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1" for="txAccountDest">Conta de Destino (Somar ao saldo da conta)</label>
                    <select
                      id="txAccountDest"
                      [(ngModel)]="form.account_id"
                      name="txAccountDest"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option [ngValue]="null">Nenhuma conta (Não alterar saldo)</option>
                      @for (acc of accounts(); track acc.id) {
                        <option [value]="acc.id">{{ acc.name }} (Saldo atual: {{ acc.balance | currency: 'BRL':'symbol':'1.2-2' }})</option>
                      }
                    </select>
                  </div>
                }
              }

              <!-- Ações do Modal -->
              <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  (click)="showNewModal.set(false)"
                  class="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="!isFormValid() || isSaving()"
                  class="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20">
                  {{ isSaving() ? 'Salvando...' : 'Salvar Lançamento' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class TransactionsPageComponent implements OnInit {
  private readonly transactionService = inject(TransactionService);
  private readonly financeSetupService = inject(FinanceSetupService);

  // Estados principais
  activeView = signal<ViewMode>('all-transactions');
  typeFilter = signal<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  selectedYearMonth = signal<string>(this.getInitialYearMonth());
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dados do banco
  transactions = signal<TransactionDetail[]>([]);
  accounts = signal<FinancialAccount[]>([]);
  creditCards = signal<CreditCard[]>([]);
  categories = signal<Category[]>([]);

  // Cartão selecionado para visão de faturas
  selectedCardId = signal<string>('');

  // Modal e Formulário
  showNewModal = signal<boolean>(false);
  form = {
    type: 'EXPENSE' as TransactionType,
    amount: null as number | null,
    description: '',
    date: this.getTodayIsoDate(),
    category_id: '' as string | null,
    payment_method: 'PIX' as PaymentMethod,
    credit_card_id: '',
    account_id: null as string | null,
    installments: 1,
    is_fixed: false,
    is_paid: true,
  };

  ngOnInit(): void {
    this.initData();
  }

  async initData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [accs, cards, cats] = await Promise.all([
        this.financeSetupService.getAccounts(),
        this.financeSetupService.getCreditCards(),
        this.financeSetupService.getCategories(),
      ]);

      this.accounts.set(accs);
      this.creditCards.set(cards);
      this.categories.set(cats);

      if (cards.length > 0) {
        this.selectedCardId.set(cards[0].id);
      }

      await this.loadTransactions();
    } catch (err: any) {
      this.feedback.set({
        type: 'error',
        text: 'Erro ao carregar dados iniciais: ' + (err.message || 'Falha no banco.'),
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadTransactions(): Promise<void> {
    try {
      const list = await this.transactionService.getTransactionsByMonth(this.selectedYearMonth());
      this.transactions.set(list);
    } catch (err: any) {
      this.feedback.set({
        type: 'error',
        text: 'Erro ao carregar lançamentos: ' + err.message,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Navegação de Mês
  // ---------------------------------------------------------------------------
  changeMonth(delta: number): void {
    const [yearStr, monthStr] = this.selectedYearMonth().split('-');
    const date = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1 + delta, 1));
    const newYearMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    this.selectedYearMonth.set(newYearMonth);
    this.loadTransactions();
  }

  resetToCurrentMonth(): void {
    this.selectedYearMonth.set(this.getInitialYearMonth());
    this.loadTransactions();
  }

  currentMonthLabel = computed(() => {
    const [yearStr, monthStr] = this.selectedYearMonth().split('-');
    const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  });

  isCurrentRealMonth = computed(() => {
    return this.selectedYearMonth() === this.getInitialYearMonth();
  });

  // ---------------------------------------------------------------------------
  // Computeds de Resumo
  // ---------------------------------------------------------------------------
  filteredTransactions = computed(() => {
    const list = this.transactions();
    const filter = this.typeFilter();
    if (filter === 'ALL') return list;
    return list.filter((t) => t.type === filter);
  });

  totalIncome = computed(() => {
    return this.transactions()
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  });

  totalExpense = computed(() => {
    return this.transactions()
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  });

  netBalance = computed(() => {
    return this.totalIncome() - this.totalExpense();
  });

  incomeCount = computed(() => {
    return this.transactions().filter((t) => t.type === 'INCOME').length;
  });

  expenseCount = computed(() => {
    return this.transactions().filter((t) => t.type === 'EXPENSE').length;
  });

  totalPaid = computed(() => {
    return this.transactions()
      .filter((t) => t.is_paid)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  });

  totalPending = computed(() => {
    return this.transactions()
      .filter((t) => !t.is_paid)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  });

  pendingCount = computed(() => {
    return this.transactions().filter((t) => !t.is_paid).length;
  });

  // ---------------------------------------------------------------------------
  // Computeds de Fatura de Cartão
  // ---------------------------------------------------------------------------
  cardInvoiceTransactions = computed(() => {
    const cardId = this.selectedCardId();
    if (!cardId) return [];
    return this.transactions().filter((t) => t.credit_card_id === cardId);
  });

  selectedInvoiceTotal = computed(() => {
    return this.cardInvoiceTransactions().reduce(
      (sum, t) => sum + (Number(t.amount) || 0),
      0
    );
  });

  selectedInvoiceAllPaid = computed(() => {
    const items = this.cardInvoiceTransactions();
    return items.length > 0 && items.every((t) => t.is_paid);
  });

  selectedCardForForm = computed(() => {
    return this.creditCards().find((c) => c.id === this.form.credit_card_id);
  });

  incomeCategories = computed(() => {
    return this.categories().filter((c) => c.type === 'INCOME');
  });

  expenseCategories = computed(() => {
    return this.categories().filter((c) => c.type === 'EXPENSE');
  });

  // ---------------------------------------------------------------------------
  // Ações de Lançamentos
  // ---------------------------------------------------------------------------
  async togglePaid(tx: TransactionDetail): Promise<void> {
    const newStatus = !tx.is_paid;
    // Otimista
    tx.is_paid = newStatus;
    this.transactions.update((list) => [...list]);

    try {
      await this.transactionService.togglePaidStatus(tx.id, newStatus);
    } catch (err: any) {
      // Reverter em caso de falha
      tx.is_paid = !newStatus;
      this.transactions.update((list) => [...list]);
      this.feedback.set({
        type: 'error',
        text: 'Erro ao atualizar status: ' + err.message,
      });
    }
  }

  async payEntireInvoice(): Promise<void> {
    const cardId = this.selectedCardId();
    if (!cardId) return;

    try {
      await this.transactionService.markInvoiceAsPaid(cardId, this.selectedYearMonth());
      this.feedback.set({
        type: 'success',
        text: `Fatura de ${this.currentMonthLabel()} marcada como paga!`,
      });
      await this.loadTransactions();
    } catch (err: any) {
      this.feedback.set({
        type: 'error',
        text: 'Erro ao marcar fatura como paga: ' + err.message,
      });
    }
  }

  async deleteTransaction(tx: TransactionDetail): Promise<void> {
    if (!confirm(`Deseja excluir o lançamento "${tx.description}"?`)) return;

    try {
      await this.transactionService.deleteTransaction(tx.id);
      this.transactions.update((list) => list.filter((item) => item.id !== tx.id));
      this.feedback.set({
        type: 'success',
        text: 'Lançamento excluído com sucesso!',
      });
    } catch (err: any) {
      this.feedback.set({
        type: 'error',
        text: 'Erro ao excluir lançamento: ' + err.message,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Modal de Criação
  // ---------------------------------------------------------------------------
  openNewTransactionModal(): void {
    const defaultCat = this.categories().find((c) => c.type === 'EXPENSE')?.id || '';
    const defaultCard = this.creditCards()[0]?.id || '';
    const defaultAccount = this.accounts()[0]?.id || null;

    this.form = {
      type: 'EXPENSE',
      amount: null,
      description: '',
      date: this.getTodayIsoDate(),
      category_id: defaultCat,
      payment_method: 'PIX',
      credit_card_id: defaultCard,
      account_id: defaultAccount,
      installments: 1,
      is_fixed: false,
      is_paid: true,
    };

    this.showNewModal.set(true);
  }

  setFormType(type: TransactionType): void {
    this.form.type = type;
    if (type === 'INCOME') {
      const firstIncome = this.incomeCategories()[0]?.id || '';
      this.form.category_id = firstIncome;
      this.form.payment_method = 'PIX';
      this.form.is_paid = true;
      this.form.is_fixed = false;
      this.form.installments = 1;
      this.form.credit_card_id = '';
    } else {
      const firstExpense = this.expenseCategories()[0]?.id || '';
      this.form.category_id = firstExpense;
    }
  }

  onPaymentMethodChanged(method: PaymentMethod): void {
    if (method === 'CREDITO') {
      this.form.is_paid = false;
      if (!this.form.credit_card_id && this.creditCards().length > 0) {
        this.form.credit_card_id = this.creditCards()[0].id;
      }
    } else {
      this.form.is_paid = true;
    }
  }

  isPurchaseAfterClosing(dateStr: string, closingDay: number): boolean {
    if (!dateStr || !closingDay) return false;
    const day = parseInt(dateStr.split('-')[2], 10);
    return day >= closingDay;
  }

  isFormValid(): boolean {
    if (!this.form.description?.trim()) return false;
    if (!this.form.amount || this.form.amount <= 0) return false;
    if (!this.form.date) return false;
    if (this.form.type === 'EXPENSE') {
      if (!this.form.category_id) return false;
      if (this.form.payment_method === 'CREDITO' && !this.form.credit_card_id) return false;
    }
    return true;
  }

  async handleSaveTransaction(): Promise<void> {
    if (!this.isFormValid()) return;

    this.isSaving.set(true);
    try {
      const finalAccountId = this.form.account_id && this.form.account_id !== 'null' ? this.form.account_id : null;
      const finalCategoryId = this.form.category_id && this.form.category_id !== 'null' ? this.form.category_id : null;

      await this.transactionService.createTransaction({
        description: this.form.description.trim(),
        amount: Number(this.form.amount),
        date: this.form.date,
        type: this.form.type,
        account_id: this.form.payment_method === 'CREDITO' ? null : finalAccountId,
        credit_card_id: this.form.type === 'EXPENSE' && this.form.payment_method === 'CREDITO' ? (this.form.credit_card_id && this.form.credit_card_id !== 'null' ? this.form.credit_card_id : null) : null,
        category_id: finalCategoryId,
        payment_method: this.form.type === 'EXPENSE' ? this.form.payment_method : 'PIX',
        is_paid: this.form.type === 'INCOME' ? true : this.form.is_paid,
        is_fixed: this.form.type === 'INCOME' ? false : this.form.is_fixed,
        installments: this.form.type === 'EXPENSE' && this.form.payment_method === 'CREDITO' ? this.form.installments : 1,
      });

      this.showNewModal.set(false);
      this.feedback.set({
        type: 'success',
        text:
          this.form.type === 'INCOME' && finalAccountId
            ? 'Receita registrada e saldo da conta atualizado com sucesso!'
            : (this.form.installments > 1
                ? `Compra parcelada em ${this.form.installments}x cadastrada com sucesso!`
                : 'Lançamento registrado com sucesso!'),
      });

      // Recarrega transações e saldo atualizado das contas
      const [transList, freshAccounts] = await Promise.all([
        this.transactionService.getTransactionsByMonth(this.selectedYearMonth()),
        this.financeSetupService.getAccounts(),
      ]);
      this.transactions.set(transList);
      this.accounts.set(freshAccounts);
    } catch (err: any) {
      this.feedback.set({
        type: 'error',
        text: 'Erro ao salvar lançamento: ' + err.message,
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  formatDisplayDate(isoDate: string): string {
    if (!isoDate) return '';
    const [, monthStr, dayStr] = isoDate.split('-');
    return `${dayStr}/${monthStr}`;
  }

  private getInitialYearMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getTodayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
