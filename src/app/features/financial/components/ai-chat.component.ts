import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AssetClass,
  Category,
  CreditCard,
  FinancialAccount,
  PaymentMethod,
  TransactionType,
} from '../../../core/models/database.types';
import {
  AiAssistantService,
  ChatMessage,
  InvestmentExtractionResult,
  ReceiptExtractionResult,
} from '../services/ai-assistant.service';
import { FinanceSetupService } from '../services/finance-setup.service';
import { TransactionService } from '../services/transaction.service';
import { PortfolioService } from '../../investments/services/portfolio.service';
import { AssetClassesService } from '../../investments/services/asset-classes.service';
import {
  ToastService,
  DEMO_LIMIT_MESSAGE,
  isDemoLimitError,
} from '../../../core/services/toast.service';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- 1. Botão Flutuante (FAB) da IA -->
    <div class="fixed bottom-20 md:bottom-16 right-4 sm:right-6 z-40">
      <button
        type="button"
        (click)="toggleChat()"
        [title]="isOpen() ? 'Fechar Assistente IA' : (isInvestments() ? 'Abrir Assistente de Investimentos' : 'Abrir Assistente Financeiro')"
        class="relative group flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all">
        <div class="relative flex items-center justify-center">
          <svg class="w-5 h-5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span class="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
        </div>
        <span class="hidden sm:inline font-semibold tracking-wide">
          {{ isInvestments() ? 'IA Investimentos' : 'IA Financeira' }}
        </span>
      </button>
    </div>

    <!-- 2. Backdrop para Mobile / Fundo Transparente -->
    @if (isOpen()) {
      <div
        (click)="closeChat()"
        class="fixed inset-0 bg-gray-950/40 backdrop-blur-xs z-40 transition-opacity"></div>
    }

    <!-- 3. Drawer Deslizante Lateral -->
    <div
      [class.translate-x-0]="isOpen()"
      [class.translate-x-full]="!isOpen()"
      class="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white border-l border-gray-200 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out">
      
      <!-- Topo do Drawer: Header com Status e Fechar -->
      <div class="p-4 sm:p-5 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700 font-black shadow-2xs">
            <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-gray-900 tracking-tight">
                {{ isInvestments() ? 'Assistente de Investimentos' : 'Assistente Financeiro' }}
              </h2>
            </div>
            <p class="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>
                {{ isInvestments() ? 'Carteira & alocação estratégica em tempo real' : 'Contexto financeiro em tempo real' }}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          (click)="closeChat()"
          class="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Área de Mensagens com Rolagem Suave -->
      <div #messagesContainer class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs font-sans">
        @for (msg of messages(); track msg.id) {
          <div
            [class.justify-end]="msg.role === 'user'"
            [class.justify-start]="msg.role === 'model'"
            class="flex items-start gap-2.5">
            
            @if (msg.role === 'model') {
              <div class="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center flex-shrink-0 text-blue-600 mt-0.5">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            }

            <div
              [class.bg-blue-600]="msg.role === 'user'"
              [class.text-white]="msg.role === 'user'"
              [class.rounded-br-sm]="msg.role === 'user'"
              [class.bg-gray-100]="msg.role === 'model'"
              [class.border]="msg.role === 'model'"
              [class.border-gray-200]="msg.role === 'model'"
              [class.text-gray-900]="msg.role === 'model'"
              [class.rounded-bl-sm]="msg.role === 'model'"
              class="max-w-[85%] p-3.5 rounded-2xl shadow-xs space-y-2 leading-relaxed">
              
              <!-- Texto da Mensagem (formatado com quebras de linha) -->
              <div class="whitespace-pre-wrap select-text break-words">
                {{ msg.text }}
                @if (msg.isStreaming) {
                  <span class="inline-block w-1.5 h-3.5 bg-blue-600 ml-1 animate-pulse align-middle"></span>
                }
              </div>

              <!-- Card Especial: Comprovante Financeiro Reconhecido -->
              @if (msg.receiptData; as receipt) {
                <div class="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="font-bold text-emerald-800 flex items-center gap-1">
                      <span>✓ Comprovante Lido com Sucesso</span>
                    </span>
                    <span class="font-mono text-gray-500">{{ receipt.date }}</span>
                  </div>

                  <div class="text-xs space-y-0.5">
                    <p class="font-bold text-gray-900">{{ receipt.description }}</p>
                    <p class="text-gray-600">
                      Valor: <strong class="text-emerald-700 font-mono">{{ receipt.amount | currency: 'BRL':'symbol':'1.2-2' }}</strong>
                    </p>
                    @if (receipt.suggested_category_name) {
                      <p class="text-[11px] text-gray-500">
                        Categoria sugerida: <span class="text-gray-800 font-medium">{{ receipt.suggested_category_name }}</span>
                      </p>
                    }
                  </div>

                  <button
                    type="button"
                    (click)="openModalFromReceipt(receipt)"
                    class="w-full mt-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-xs">
                    <span>Revisar e Salvar Lançamento →</span>
                  </button>
                </div>
              }

              <!-- Card Especial: Nota de Corretagem Reconhecida (Investimentos) -->
              @if (msg.investmentData; as inv) {
                <div class="mt-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="font-bold text-blue-900 flex items-center gap-1">
                      <span>✓ Nota de Corretagem Reconhecida</span>
                    </span>
                    <span class="font-mono text-gray-500">{{ inv.date }}</span>
                  </div>

                  <div class="text-xs space-y-0.5">
                    <p class="font-black text-blue-950 text-sm tracking-wide">{{ inv.ticker }}</p>
                    <p class="text-gray-700">
                      Operação: <strong class="text-gray-900 font-mono">{{ inv.quantity }} un.</strong> @ <strong class="text-gray-900 font-mono">{{ inv.price | currency: 'BRL':'symbol':'1.2-2' }}</strong>
                    </p>
                    <p class="text-gray-700">
                      Valor Total: <strong class="text-blue-700 font-mono font-bold">{{ inv.total | currency: 'BRL':'symbol':'1.2-2' }}</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    (click)="openModalFromInvestment(inv)"
                    class="w-full mt-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-xs">
                    <span>Adicionar Ativo à Carteira →</span>
                  </button>
                </div>
              }

              <div
                [class.text-blue-100]="msg.role === 'user'"
                [class.text-gray-400]="msg.role === 'model'"
                class="text-[9px] text-right">
                {{ msg.timestamp | date: 'HH:mm' }}
              </div>
            </div>
          </div>
        }

        <!-- Indicador de Análise de Imagem (Comprovante ou Nota) -->
        @if (isAnalyzingReceipt()) {
          <div class="flex items-start gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center flex-shrink-0 text-blue-600 animate-spin">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div class="p-3.5 rounded-2xl rounded-bl-sm bg-gray-100 border border-gray-200 text-gray-700 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              <span>
                {{ isInvestments() ? 'Analisando nota de corretagem com visão computacional do Gemini...' : 'Analisando comprovante com visão computacional do Gemini...' }}
              </span>
            </div>
          </div>
        }
      </div>

      <!-- Sugestões Rápidas de Perguntas Dinâmicas por Rota -->
      @if (messages().length <= 2 && !isStreaming()) {
        <div class="px-4 py-2 bg-gray-50/80 border-t border-gray-200 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
          @if (isInvestments()) {
            <button
              type="button"
              (click)="askQuickQuestion('Onde devo aportar meus R$ 500 hoje?')"
              class="px-2.5 py-1 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-[10px] text-gray-700 font-medium whitespace-nowrap transition-colors shadow-2xs">
              🎯 Onde aportar R$ 500 hoje?
            </button>
            <button
              type="button"
              (click)="askQuickQuestion('Quais classes estão mais abaixo da meta na minha estratégia?')"
              class="px-2.5 py-1 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-[10px] text-gray-700 font-medium whitespace-nowrap transition-colors shadow-2xs">
              ⚖️ Classes mais defasadas?
            </button>
            <button
              type="button"
              (click)="askQuickQuestion('Faça um diagnóstico geral da diversificação da minha carteira.')"
              class="px-2.5 py-1 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-[10px] text-gray-700 font-medium whitespace-nowrap transition-colors shadow-2xs">
              📈 Diagnóstico da carteira
            </button>
          } @else {
            <button
              type="button"
              (click)="askQuickQuestion('Como está meu teto de gastos do mês?')"
              class="px-2.5 py-1 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-[10px] text-gray-700 font-medium whitespace-nowrap transition-colors shadow-2xs">
              📊 Meu teto de gastos?
            </button>
            <button
              type="button"
              (click)="askQuickQuestion('Posso gastar R$ 150 em lazer hoje?')"
              class="px-2.5 py-1 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-[10px] text-gray-700 font-medium whitespace-nowrap transition-colors shadow-2xs">
              🍕 Posso gastar R$ 150 em lazer?
            </button>
            <button
              type="button"
              (click)="askQuickQuestion('Onde mais gastei dinheiro este mês?')"
              class="px-2.5 py-1 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-[10px] text-gray-700 font-medium whitespace-nowrap transition-colors shadow-2xs">
              🔍 Onde mais gastei?
            </button>
          }
        </div>
      }

      <!-- Rodapé: Campo de Texto, Câmera & Anexo de Documento -->
      <div class="p-4 border-t border-gray-200 bg-white space-y-2">
        <form (ngSubmit)="handleSendMessage()" class="flex items-center gap-2">
          <!-- Input oculto para carregar imagem da galeria/arquivos -->
          <input
            #fileInput
            type="file"
            accept="image/*"
            (change)="onFileSelected($event)"
            class="hidden" />

          <!-- Input oculto com capture para Câmera Nativa do Celular -->
          <input
            #cameraInput
            type="file"
            accept="image/*"
            capture="environment"
            (change)="onFileSelected($event)"
            class="hidden" />

          <!-- Botão Tirar Foto com a Câmera -->
          <button
            type="button"
            (click)="openCamera()"
            [disabled]="isStreaming() || isAnalyzingReceipt()"
            [title]="isInvestments() ? 'Fotografar nota de corretagem com a câmera' : 'Tirar foto de um comprovante com a câmera'"
            class="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-600 hover:text-blue-700 border border-gray-200 transition-colors flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <!-- Botão de Anexo de Imagem (Clipe / Galeria) -->
          <button
            type="button"
            (click)="triggerFileInput()"
            [disabled]="isStreaming() || isAnalyzingReceipt()"
            [title]="isInvestments() ? 'Anexar nota de corretagem da galeria ou arquivo' : 'Anexar comprovante da galeria ou arquivo'"
            class="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-600 hover:text-blue-700 border border-gray-200 transition-colors flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <!-- Input de Texto -->
          <input
            type="text"
            [(ngModel)]="userInput"
            name="chatInput"
            [disabled]="isStreaming() || isAnalyzingReceipt()"
            [placeholder]="isInvestments() ? 'Pergunte sobre sua carteira ou anexe uma nota...' : 'Pergunte ao Gemini ou anexe um comprovante...'"
            class="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-50/80 border border-gray-300 text-gray-900 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />

          <!-- Botão Enviar -->
          <button
            type="submit"
            [disabled]="!userInput.trim() || isStreaming() || isAnalyzingReceipt()"
            class="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-all font-bold shadow-xs">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>
    </div>

    <!-- 4. Modal de Câmera ao Vivo para Tirar Foto -->
    @if (showCameraModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-xs">
        <div class="w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div class="p-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 class="text-sm font-bold text-gray-900">
                {{ isInvestments() ? 'Fotografar Nota de Corretagem' : 'Fotografar Comprovante' }}
              </h3>
            </div>
            <button
              type="button"
              (click)="closeCamera()"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              ✕
            </button>
          </div>

          <div class="p-4 space-y-4">
            <!-- Visualizador de Vídeo da Câmera -->
            <div class="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-gray-300 shadow-inner">
              <video #videoElement autoplay playsinline class="w-full h-full object-cover"></video>
              <canvas #canvasElement class="hidden"></canvas>

              <!-- Guia visual para enquadrar documento -->
              <div class="absolute inset-4 border-2 border-dashed border-emerald-400/70 rounded-xl pointer-events-none flex items-center justify-center">
                <span class="text-[10px] font-semibold text-emerald-800 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-emerald-300 shadow-xs">
                  {{ isInvestments() ? 'Enquadre a nota de corretagem aqui' : 'Enquadre o comprovante aqui' }}
                </span>
              </div>
            </div>

            @if (cameraError()) {
              <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
                {{ cameraError() }}
              </div>
            }

            <!-- Ações da Câmera -->
            <div class="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                (click)="triggerNativeCamera()"
                class="px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors">
                Câmera do Celular
              </button>

              <button
                type="button"
                (click)="capturePhoto()"
                class="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2">
                <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Tirar Foto</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- 5. Modal de Novo Lançamento Financeiro Pré-preenchido por IA -->
    @if (showTransactionModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-xs overflow-y-auto">
        <div class="w-full max-w-lg bg-white border border-gray-200 rounded-3xl shadow-2xl p-6 sm:p-8 my-8 animate-in fade-in zoom-in-95 duration-200">
          
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Novo Lançamento</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                  Pré-preenchido por IA
                </span>
              </h3>
              <p class="text-xs text-gray-500 mt-0.5">Revise os dados antes de salvar no sistema.</p>
            </div>
            <button
              type="button"
              (click)="closeTransactionModal()"
              class="p-2 rounded-xl text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
              ✕
            </button>
          </div>

          <!-- Tipo: Despesa ou Receita -->
          <div class="flex p-1 bg-gray-100 rounded-2xl mb-5">
            <button
              type="button"
              (click)="modalForm.type = 'EXPENSE'"
              [class.bg-rose-500]="modalForm.type === 'EXPENSE'"
              [class.text-white]="modalForm.type === 'EXPENSE'"
              [class.shadow-2xs]="modalForm.type === 'EXPENSE'"
              class="flex-1 py-2 text-center rounded-xl text-xs font-bold transition-all text-gray-600 hover:text-gray-900">
              ↓ Despesa
            </button>
            <button
              type="button"
              (click)="modalForm.type = 'INCOME'"
              [class.bg-emerald-600]="modalForm.type === 'INCOME'"
              [class.text-white]="modalForm.type === 'INCOME'"
              [class.shadow-2xs]="modalForm.type === 'INCOME'"
              class="flex-1 py-2 text-center rounded-xl text-xs font-bold transition-all text-gray-600 hover:text-gray-900">
              ↑ Receita
            </button>
          </div>

          <form (ngSubmit)="handleSaveFromModal()" class="space-y-4">
            <!-- Valor -->
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1" for="modalAmount">Valor *</label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">R$</span>
                <input
                  id="modalAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  [(ngModel)]="modalForm.amount"
                  name="modalAmount"
                  class="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50/70 border border-gray-300 text-gray-900 font-mono text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
              </div>
            </div>

            <!-- Descrição -->
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1" for="modalDesc">Descrição *</label>
              <input
                id="modalDesc"
                type="text"
                required
                [(ngModel)]="modalForm.description"
                name="modalDesc"
                class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
            </div>

            <!-- Data -->
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1" for="modalDate">Data *</label>
              <input
                id="modalDate"
                type="date"
                required
                [(ngModel)]="modalForm.date"
                name="modalDate"
                class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
            </div>

            <!-- Categoria -->
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1" for="modalCategory">Categoria</label>
              <select
                id="modalCategory"
                [(ngModel)]="modalForm.category_id"
                name="modalCategory"
                class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600">
                <option value="">Sem categoria (Geral)</option>
                @for (c of availableCategories(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>

            <!-- Forma de Pagamento -->
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1" for="modalMethod">Forma de Pagamento</label>
              <select
                id="modalMethod"
                [(ngModel)]="modalForm.payment_method"
                name="modalMethod"
                class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600">
                <option value="PIX">PIX</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="DEBITO">Cartão de Débito</option>
                <option value="CREDITO">Cartão de Crédito</option>
                <option value="VALE">Vale</option>
              </select>
            </div>

            <!-- Conta Bancária (se não for crédito) -->
            @if (modalForm.payment_method !== 'CREDITO' && accounts().length > 0) {
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="modalAccount">Conta Financeira</label>
                <select
                  id="modalAccount"
                  [(ngModel)]="modalForm.account_id"
                  name="modalAccount"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600">
                  <option [ngValue]="null">Nenhuma conta associada</option>
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">{{ acc.name }} (Saldo: {{ acc.balance | currency: 'BRL':'symbol':'1.2-2' }})</option>
                  }
                </select>
              </div>
            }

            <!-- Botões de Ação do Modal -->
            <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                (click)="closeTransactionModal()"
                class="px-4 py-2.5 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="!modalForm.amount || !modalForm.description || isSaving()"
                class="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs">
                {{ isSaving() ? 'Gravando...' : 'Confirmar e Salvar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- 6. Modal de Adicionar Ativo à Carteira (Investimentos) Pré-preenchido por IA -->
    @if (showAssetModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-xs overflow-y-auto">
        <div class="w-full max-w-lg bg-white border border-gray-200 rounded-3xl shadow-2xl p-6 sm:p-8 my-8 animate-in fade-in zoom-in-95 duration-200">
          
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Adicionar Ativo à Carteira</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                  Nota lida por IA
                </span>
              </h3>
              <p class="text-xs text-gray-500 mt-0.5">Revise os dados extraídos da nota de corretagem antes de salvar na sua carteira.</p>
            </div>
            <button
              type="button"
              (click)="closeAssetModal()"
              class="p-2 rounded-xl text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
              ✕
            </button>
          </div>

          <form (ngSubmit)="handleSaveAssetFromModal()" class="space-y-4">
            <!-- Classe de Ativo -->
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1" for="assetClassSelect">Classe de Ativo *</label>
              <select
                id="assetClassSelect"
                [(ngModel)]="assetModalForm.asset_class_id"
                name="assetClassSelect"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600">
                <option value="" disabled>Selecione uma classe</option>
                @for (cls of assetClasses(); track cls.id) {
                  <option [value]="cls.id">{{ formatClassOption(cls) }}</option>
                }
              </select>
            </div>

            <!-- Ticker -->
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1" for="modalTicker">Ticker / Código do Ativo *</label>
              <input
                id="modalTicker"
                type="text"
                required
                [(ngModel)]="assetModalForm.ticker"
                name="modalTicker"
                placeholder="Ex: PETR4, IVVB11, MXRF11"
                class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 font-mono text-sm uppercase font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <!-- Cotação Unitária -->
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="modalPrice">Cotação Unitária (R$) *</label>
                <input
                  id="modalPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  [(ngModel)]="assetModalForm.current_price"
                  name="modalPrice"
                  placeholder="0.00"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
              </div>

              <!-- Quantidade -->
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="modalQty">Quantidade *</label>
                <input
                  id="modalQty"
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  [(ngModel)]="assetModalForm.quantity"
                  name="modalQty"
                  placeholder="0"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/70 border border-gray-300 text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
              </div>
            </div>

            <!-- Total Estimado -->
            <div class="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 flex items-center justify-between text-xs">
              <span class="text-blue-900 font-medium">Valor Total da Operação:</span>
              <strong class="text-blue-700 font-mono font-bold text-sm">
                {{ ((assetModalForm.current_price || 0) * (assetModalForm.quantity || 0)) | currency: 'BRL':'symbol':'1.2-2' }}
              </strong>
            </div>

            <!-- Botões de Ação do Modal -->
            <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                (click)="closeAssetModal()"
                class="px-4 py-2.5 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="!assetModalForm.ticker || !assetModalForm.asset_class_id || !assetModalForm.current_price || !assetModalForm.quantity || isSavingAsset()"
                class="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs">
                {{ isSavingAsset() ? 'Adicionando...' : 'Confirmar e Adicionar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class AiChatComponent implements OnInit, OnDestroy {
  private readonly aiService = inject(AiAssistantService);
  private readonly transactionService = inject(TransactionService);
  private readonly setupService = inject(FinanceSetupService);
  private readonly portfolioService = inject(PortfolioService);
  private readonly assetClassesService = inject(AssetClassesService);
  private readonly toastService = inject(ToastService);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef;
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') private cameraInput?: ElementRef<HTMLInputElement>;
  @ViewChild('videoElement') private videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') private canvasElement?: ElementRef<HTMLCanvasElement>;

  readonly isOpen = signal<boolean>(false);
  readonly isStreaming = signal<boolean>(false);
  readonly isAnalyzingReceipt = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isSavingAsset = signal<boolean>(false);
  readonly showTransactionModal = signal<boolean>(false);
  readonly showAssetModal = signal<boolean>(false);
  readonly showCameraModal = signal<boolean>(false);
  readonly cameraError = signal<string | null>(null);

  // Rota ativa: detecta dinamicamente se o usuário está em Investimentos
  readonly isInvestments = computed(() => this.aiService.isInvestmentsRoute());

  private mediaStream: MediaStream | null = null;

  userInput: string = '';

  // Histórico de mensagens
  readonly messages = signal<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! Sou o assistente inteligente do **iFinance**. 🤖\nComo posso te ajudar hoje?',
      timestamp: new Date(),
    },
  ]);

  // Dados auxiliares para o modal financeiro
  readonly accounts = signal<FinancialAccount[]>([]);
  readonly creditCards = signal<CreditCard[]>([]);
  readonly categories = signal<Category[]>([]);

  // Dados auxiliares para o modal de investimentos
  readonly assetClasses = signal<AssetClass[]>([]);

  // Formulário do modal financeiro pré-preenchido
  modalForm = {
    type: 'EXPENSE' as TransactionType,
    amount: null as number | null,
    description: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '' as string | null,
    payment_method: 'PIX' as PaymentMethod,
    credit_card_id: '' as string | null,
    account_id: null as string | null,
  };

  // Formulário do modal de ativo pré-preenchido
  assetModalForm = {
    ticker: '',
    asset_class_id: '',
    current_price: null as number | null,
    quantity: null as number | null,
    date: new Date().toISOString().split('T')[0],
  };

  constructor() {
    // Sincroniza abertura remota de modais acionados pelo serviço
    effect(() => {
      if (this.aiService.isAssetModalRequested()) {
        const prefill = this.aiService.assetPrefill();
        if (prefill) {
          this.assetModalForm = {
            ticker: prefill.ticker,
            asset_class_id:
              prefill.asset_class_id ||
              this.autoSelectAssetClass(prefill.ticker, this.assetClasses()),
            current_price: prefill.current_price,
            quantity: prefill.quantity,
            date: prefill.date || new Date().toISOString().split('T')[0],
          };
          this.showAssetModal.set(true);
          this.aiService.clearAssetModalRequest();
        }
      }

      if (this.aiService.isModalRequested()) {
        const prefill = this.aiService.modalPrefill();
        if (prefill) {
          this.openModalFromReceipt({
            amount: prefill.amount,
            date: prefill.date,
            description: prefill.description,
            suggested_category_type: prefill.type,
            suggested_category_name: prefill.suggestedCategoryName,
          });
          this.aiService.clearModalRequest();
        }
      }
    });
  }

  ngOnInit(): void {
    this.loadAuxiliaryData();
  }

  async loadAuxiliaryData(): Promise<void> {
    try {
      const [accs, cards, cats, classes] = await Promise.all([
        this.setupService.getAccounts(),
        this.setupService.getCreditCards(),
        this.setupService.getCategories(),
        this.assetClassesService.getClasses(),
      ]);
      this.accounts.set(accs);
      this.creditCards.set(cards);
      this.categories.set(cats);
      this.assetClasses.set(classes);
    } catch (err) {
      console.warn('Erro ao carregar dados auxiliares para o chat:', err);
    }
  }

  availableCategories = () => {
    return this.categories().filter((c) => c.type === this.modalForm.type);
  };

  toggleChat(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.scrollToBottom();
    }
  }

  closeChat(): void {
    this.isOpen.set(false);
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  triggerNativeCamera(): void {
    this.closeCamera();
    this.cameraInput?.nativeElement.click();
  }

  async openCamera(): Promise<void> {
    this.cameraError.set(null);
    this.showCameraModal.set(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Acesso direto à câmera não suportado neste navegador.');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setTimeout(() => {
        if (this.videoElement?.nativeElement && this.mediaStream) {
          this.videoElement.nativeElement.srcObject = this.mediaStream;
        }
      }, 150);
    } catch {
      this.cameraError.set(
        'Não foi possível iniciar o vídeo da câmera ao vivo. Use a opção "Câmera do Celular" abaixo.'
      );
    }
  }

  capturePhoto(): void {
    const video = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;
    if (!video || !canvas) {
      this.triggerNativeCamera();
      return;
    }

    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;
    const maxDim = 1600;

    // Redimensionamento proporcional para economizar memória e payload
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.triggerNativeCamera();
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const prefix = this.isInvestments() ? 'nota' : 'comprovante';
          const file = new File([blob], `${prefix}-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          this.closeCamera();
          this.processFile(file);
        } else {
          this.triggerNativeCamera();
        }
      },
      'image/jpeg',
      0.85
    );
  }

  closeCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.showCameraModal.set(false);
    this.cameraError.set(null);
  }

  ngOnDestroy(): void {
    this.closeCamera();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    input.value = ''; // Permite selecionar a mesma imagem novamente se necessário
    await this.processFile(file);
  }

  /**
   * Mantido para retrocompatibilidade com testes unitários
   */
  async processReceiptFile(file: File): Promise<void> {
    return this.processFile(file);
  }

  async processFile(file: File): Promise<void> {
    // 1. Validação de Tipo de Arquivo (Defesa contra arquivos binários arbitrários)
    if (!file.type.startsWith('image/')) {
      this.messages.update((list) => [
        ...list,
        {
          id: crypto.randomUUID(),
          role: 'model',
          text: '⚠️ **Formato inválido:** Por favor, selecione um arquivo de imagem (JPG, PNG ou WEBP).',
          timestamp: new Date(),
        },
      ]);
      this.scrollToBottom();
      return;
    }

    // 2. Validação de Tamanho Máximo Inicial (Anti-DoS / Limite de 10 MB antes da compressão)
    const MAX_RAW_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_RAW_SIZE) {
      this.messages.update((list) => [
        ...list,
        {
          id: crypto.randomUUID(),
          role: 'model',
          text: '⚠️ **Arquivo muito grande:** A imagem excede o limite máximo permitido de 10 MB. Por favor, envie uma foto menor ou corte o documento.',
          timestamp: new Date(),
        },
      ]);
      this.scrollToBottom();
      return;
    }

    this.isAnalyzingReceipt.set(true);

    // 3. Otimização e Compressão Inteligente de Imagem (Reduz de MBs para ~250KB)
    let fileToSend = file;
    try {
      fileToSend = await this.optimizeImage(file);
    } catch {
      fileToSend = file;
    }

    const sizeKb = Math.round(fileToSend.size / 1024);
    const isInv = this.isInvestments();

    // Mensagem de usuário registrando o envio do documento
    this.messages.update((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        role: 'user',
        text: isInv
          ? `📷 [Nota de Corretagem anexada: ${file.name} (${sizeKb} KB)]`
          : `📷 [Comprovante anexado: ${file.name} (${sizeKb} KB)]`,
        timestamp: new Date(),
        isReceipt: !isInv,
        isInvestmentNote: isInv,
      },
    ]);
    this.scrollToBottom();

    try {
      if (isInv) {
        // Extração de Nota de Corretagem (Módulo de Investimentos)
        const extracted = await this.aiService.extractInvestmentData(fileToSend);

        this.messages.update((list) => [
          ...list,
          {
            id: crypto.randomUUID(),
            role: 'model',
            text: `Analisei sua nota de corretagem! Identifiquei o ativo **${extracted.ticker}** (${extracted.quantity} un. a R$ ${extracted.price.toFixed(
              2
            )} = Total: R$ ${extracted.total.toFixed(2)}).`,
            timestamp: new Date(),
            investmentData: extracted,
          },
        ]);
        this.scrollToBottom();

        // Automaticamente abre o modal de Adicionar Ativo pré-preenchido
        this.openModalFromInvestment(extracted);
      } else {
        // Extração de Comprovante Financeiro (Módulo Financeiro)
        const extracted = await this.aiService.extractReceiptData(fileToSend);

        this.messages.update((list) => [
          ...list,
          {
            id: crypto.randomUUID(),
            role: 'model',
            text: `Analisei seu comprovante! Identifiquei uma transação de **${extracted.description}** no valor de **R$ ${extracted.amount.toFixed(
              2
            )}**.`,
            timestamp: new Date(),
            receiptData: extracted,
          },
        ]);
        this.scrollToBottom();

        // Automaticamente abre o modal de Novo Lançamento pré-preenchido
        this.openModalFromReceipt(extracted);
      }
    } catch (err: any) {
      const errorText = isDemoLimitError(err)
        ? `⚠️ ${DEMO_LIMIT_MESSAGE}`
        : `❌ Não consegui extrair os dados do documento: ${err.message || 'Erro desconhecido'}.`;
      this.messages.update((list) => [
        ...list,
        {
          id: crypto.randomUUID(),
          role: 'model',
          text: errorText,
          timestamp: new Date(),
        },
      ]);
    } finally {
      this.isAnalyzingReceipt.set(false);
      this.scrollToBottom();
    }
  }

  /**
   * Otimiza a imagem redimensionando para até 1600px e comprimindo em JPEG 0.85
   */
  private async optimizeImage(file: File, maxDim = 1600, quality = 0.85): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      return file;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
              const optimized = new File([blob], cleanName, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(optimized);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  }

  openModalFromReceipt(receipt: ReceiptExtractionResult): void {
    let matchedCatId = '';
    if (receipt.suggested_category_name) {
      const found = this.categories().find((c) =>
        c.name.toLowerCase().includes(receipt.suggested_category_name!.toLowerCase())
      );
      if (found) matchedCatId = found.id;
    }

    this.modalForm = {
      type: receipt.suggested_category_type,
      amount: receipt.amount,
      description: receipt.description,
      date: receipt.date,
      category_id: matchedCatId,
      payment_method: 'PIX',
      credit_card_id: this.creditCards()[0]?.id || null,
      account_id: this.accounts()[0]?.id || null,
    };

    this.showTransactionModal.set(true);
  }

  closeTransactionModal(): void {
    this.showTransactionModal.set(false);
  }

  openModalFromInvestment(note: InvestmentExtractionResult): void {
    const selectedClassId = this.autoSelectAssetClass(note.ticker, this.assetClasses());
    this.assetModalForm = {
      ticker: note.ticker,
      asset_class_id: selectedClassId,
      current_price: note.price,
      quantity: note.quantity,
      date: note.date,
    };
    this.showAssetModal.set(true);
  }

  closeAssetModal(): void {
    this.showAssetModal.set(false);
  }

  formatClassOption(cls: AssetClass): string {
    if (cls.parent_id) {
      const parent = this.assetClasses().find((p) => p.id === cls.parent_id);
      return `${parent?.name || 'Pai'} ↳ ${cls.name}`;
    }
    return `${cls.name} (${cls.target_percentage}%)`;
  }

  private autoSelectAssetClass(ticker: string, classes: AssetClass[]): string {
    if (!classes || classes.length === 0) return '';
    const upper = ticker.toUpperCase();

    // Se terminar em 11 ou 12: sugere FIIs ou ETFs
    if (upper.endsWith('11') || upper.endsWith('12')) {
      const fiiOrEtf = classes.find(
        (c) =>
          c.name.toLowerCase().includes('fii') ||
          c.name.toLowerCase().includes('imobili') ||
          c.name.toLowerCase().includes('etf')
      );
      if (fiiOrEtf) return fiiOrEtf.id;
    }

    // Se terminar em 3, 4, 5, 6, 33, 34: sugere Ações / BDRs
    if (/([3-6]|33|34)$/.test(upper)) {
      const acoes = classes.find(
        (c) =>
          c.name.toLowerCase().includes('ação') ||
          c.name.toLowerCase().includes('acoes') ||
          c.name.toLowerCase().includes('ações')
      );
      if (acoes) return acoes.id;
    }

    return classes[0].id;
  }

  async handleSaveAssetFromModal(): Promise<void> {
    if (
      !this.assetModalForm.ticker ||
      !this.assetModalForm.asset_class_id ||
      !this.assetModalForm.current_price ||
      !this.assetModalForm.quantity
    ) {
      return;
    }

    this.isSavingAsset.set(true);
    try {
      const ticker = this.assetModalForm.ticker.trim().toUpperCase();
      const currentPrice = Number(this.assetModalForm.current_price);
      const quantity = Number(this.assetModalForm.quantity);
      const total = currentPrice * quantity;

      await this.portfolioService.createAssetWithHolding({
        ticker,
        asset_class_id: this.assetModalForm.asset_class_id,
        current_price: currentPrice,
        quantity: quantity,
        average_price: currentPrice,
      });

      this.showAssetModal.set(false);

      this.messages.update((list) => [
        ...list,
        {
          id: crypto.randomUUID(),
          role: 'model',
          text: `✅ **Ativo adicionado à sua carteira com sucesso!**\n"${ticker}" (${quantity} un. a R$ ${currentPrice.toFixed(
            2
          )}) totalizando R$ ${total.toFixed(2)} já foi incorporado ao seu patrimônio.`,
          timestamp: new Date(),
        },
      ]);

      this.toastService.success(`Ativo "${ticker}" adicionado à carteira!`);
      this.scrollToBottom();
    } catch (err: any) {
      if (!isDemoLimitError(err)) {
        this.toastService.error('Erro ao adicionar ativo: ' + (err.message || 'Falha no Supabase.'));
      }
    } finally {
      this.isSavingAsset.set(false);
    }
  }

  async handleSaveFromModal(): Promise<void> {
    if (!this.modalForm.amount || !this.modalForm.description) return;

    this.isSaving.set(true);
    try {
      await this.transactionService.createTransaction({
        amount: this.modalForm.amount,
        description: this.modalForm.description,
        date: this.modalForm.date,
        type: this.modalForm.type,
        category_id: this.modalForm.category_id || null,
        payment_method: this.modalForm.payment_method,
        account_id: this.modalForm.account_id,
        credit_card_id: this.modalForm.credit_card_id,
        installments: 1,
        is_paid: true,
        is_fixed: false,
      });

      this.showTransactionModal.set(false);

      this.messages.update((list) => [
        ...list,
        {
          id: crypto.randomUUID(),
          role: 'model',
          text: `✅ **Lançamento salvo com sucesso!**\n"${this.modalForm.description}" no valor de R$ ${this.modalForm.amount?.toFixed(
            2
          )} já foi computado no seu saldo e orçamento.`,
          timestamp: new Date(),
        },
      ]);
      this.toastService.success(`Lançamento "${this.modalForm.description}" registrado com sucesso!`);
      this.scrollToBottom();
    } catch (err: any) {
      if (!isDemoLimitError(err)) {
        this.toastService.error('Erro ao salvar lançamento: ' + err.message);
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  handleSendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isStreaming()) return;

    this.userInput = '';

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    const modelMsgId = crypto.randomUUID();
    const modelMsg: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      text: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    this.messages.update((list) => [...list, userMsg, modelMsg]);
    this.scrollToBottom();

    this.isStreaming.set(true);

    this.aiService.sendMessageStream(text, this.messages()).subscribe({
      next: (chunk) => {
        this.messages.update((list) =>
          list.map((m) => (m.id === modelMsgId ? { ...m, text: m.text + chunk } : m))
        );
        this.scrollToBottom();
      },
      error: (err) => {
        const errorText = isDemoLimitError(err)
          ? `⚠️ ${DEMO_LIMIT_MESSAGE}`
          : `❌ Erro ao processar resposta: ${err.message || 'Falha na conexão.'}`;
        this.messages.update((list) =>
          list.map((m) =>
            m.id === modelMsgId
              ? {
                  ...m,
                  text: errorText,
                  isStreaming: false,
                }
              : m
          )
        );
        this.isStreaming.set(false);
        this.scrollToBottom();
      },
      complete: () => {
        this.messages.update((list) =>
          list.map((m) => (m.id === modelMsgId ? { ...m, isStreaming: false } : m))
        );
        this.isStreaming.set(false);
        this.scrollToBottom();
      },
    });
  }

  askQuickQuestion(question: string): void {
    this.userInput = question;
    this.handleSendMessage();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }
}
