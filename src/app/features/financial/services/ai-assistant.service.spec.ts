import { TestBed } from '@angular/core/testing';
import { AiAssistantService } from './ai-assistant.service';
import { FinancialDashboardService } from './financial-dashboard.service';
import { FinanceSetupService } from './finance-setup.service';

import { firstValueFrom } from 'rxjs';

describe('AiAssistantService', () => {
  let service: AiAssistantService;
  let mockDashboardService: any;
  let mockSetupService: any;

  beforeEach(() => {
    mockDashboardService = {
      getDashboardMetrics: vi.fn().mockResolvedValue({
        totalCurrentBalance: 7800.5,
        totalIncome: 6500.0,
        totalExpense: 3400.0,
        netResult: 3100.0,
        savingsRate: 47.7,
        budgetProgressList: [
          {
            group: { id: 'bg-1', name: 'Necessidades', target_percentage: 50, type: 'EXPENSE' },
            targetPercentage: 50,
            targetAmount: 3250.0,
            spentAmount: 2100.0,
            percentageConsumed: 64.6,
            isOverBudget: false,
            status: 'safe',
          },
        ],
        topCategories: [{ categoryName: 'Mercado', amount: 950.0, percentageOfTotal: 27.9 }],
      }),
    };

    mockSetupService = {
      getCategories: vi.fn().mockResolvedValue([
        { id: 'cat-1', name: 'Mercado', type: 'EXPENSE' },
        { id: 'cat-2', name: 'Salário', type: 'INCOME' },
      ]),
    };

    TestBed.configureTestingModule({
      providers: [
        AiAssistantService,
        { provide: FinancialDashboardService, useValue: mockDashboardService },
        { provide: FinanceSetupService, useValue: mockSetupService },
      ],
    });

    service = TestBed.inject(AiAssistantService);
  });

  describe('Gerenciamento de Modal e Prefill', () => {
    it('deve emitir sinal de abertura de modal com os dados pré-preenchidos', () => {
      expect(service.isModalRequested()).toBe(false);
      expect(service.modalPrefill()).toBeNull();

      service.openTransactionWithPrefill({
        amount: 89.9,
        date: '2026-10-01',
        description: 'Almoço Restaurante',
        type: 'EXPENSE',
        suggestedCategoryName: 'Alimentação',
      });

      expect(service.isModalRequested()).toBe(true);
      expect(service.modalPrefill()).toEqual({
        amount: 89.9,
        date: '2026-10-01',
        description: 'Almoço Restaurante',
        type: 'EXPENSE',
        suggestedCategoryName: 'Alimentação',
      });

      service.clearModalRequest();
      expect(service.isModalRequested()).toBe(false);
      expect(service.modalPrefill()).toBeNull();
    });
  });

  describe('Construção do Contexto Financeiro', () => {
    it('deve formatar métricas financeiras em texto para o System Instruction', async () => {
      const context = await service.buildFinancialContext();

      expect(context).toContain('Saldo Consolidado em Contas (Dinheiro Real Hoje): R$ 7800.50');
      expect(context).toContain('Receitas do Mês: R$ 6500.00');
      expect(context).toContain('Necessidades');
      expect(context).toContain('Superávit');
      expect(context).toContain('Mercado');
    });
  });

  describe('Streaming de Mensagens', () => {
    it('deve avisar amigavelmente quando a chave de API não estiver configurada', async () => {
      // Força apiKey vazia
      (service as any).getApiKey = () => '';

      const message = await firstValueFrom(service.sendMessageStream('Posso gastar R$ 100 hoje?'));
      expect(message).toContain('Chave da API do Google Gemini não encontrada');
    });
  });
});

