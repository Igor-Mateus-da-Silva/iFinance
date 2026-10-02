import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AiAssistantService } from './ai-assistant.service';
import { FinancialDashboardService } from './financial-dashboard.service';
import { FinanceSetupService } from './finance-setup.service';
import { PortfolioService } from '../../investments/services/portfolio.service';
import { AssetClassesService } from '../../investments/services/asset-classes.service';
import { SupabaseService } from '../../../core/services/supabase.service';

describe('AiAssistantService', () => {
  let service: AiAssistantService;
  let mockDashboardService: any;
  let mockSetupService: any;
  let mockPortfolioService: any;
  let mockAssetClassesService: any;
  let mockSupabaseService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockRouter = {
      url: '/financial/dashboard',
    };

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

    mockPortfolioService = {
      getHoldings: vi.fn().mockResolvedValue([
        {
          portfolioId: 'p-1',
          assetId: 'a-1',
          ticker: 'PETR4',
          currentPrice: 38.0,
          quantity: 100,
          totalValue: 3800.0,
          assetClassId: 'cls-1',
          assetClassName: 'Ações Brasileiras',
        },
      ]),
    };

    mockAssetClassesService = {
      getClasses: vi.fn().mockResolvedValue([
        { id: 'cls-1', name: 'Ações Brasileiras', target_percentage: 60 },
        { id: 'cls-2', name: 'Fundos Imobiliários', target_percentage: 40 },
      ]),
    };

    mockSupabaseService = {
      getAccessToken: vi.fn().mockResolvedValue('fake-jwt-token-123'),
    };

    TestBed.configureTestingModule({
      providers: [
        AiAssistantService,
        { provide: Router, useValue: mockRouter },
        { provide: FinancialDashboardService, useValue: mockDashboardService },
        { provide: FinanceSetupService, useValue: mockSetupService },
        { provide: PortfolioService, useValue: mockPortfolioService },
        { provide: AssetClassesService, useValue: mockAssetClassesService },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    });

    service = TestBed.inject(AiAssistantService);
  });

  describe('Roteamento e Detecção de Módulo', () => {
    it('deve retornar false quando a rota for financeira', () => {
      mockRouter.url = '/financial/dashboard';
      expect(service.isInvestmentsRoute()).toBe(false);
    });

    it('deve retornar true quando a rota for de investimentos', () => {
      mockRouter.url = '/investments/portfolio';
      expect(service.isInvestmentsRoute()).toBe(true);
    });
  });

  describe('Gerenciamento de Modal e Prefill', () => {
    it('deve emitir sinal de abertura de modal financeiro com os dados pré-preenchidos', () => {
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

    it('deve emitir sinal de abertura de modal de ativo de investimentos com dados pré-preenchidos', () => {
      expect(service.isAssetModalRequested()).toBe(false);
      expect(service.assetPrefill()).toBeNull();

      service.openAssetWithPrefill({
        ticker: 'VALE3',
        current_price: 60.5,
        quantity: 50,
        asset_class_id: 'cls-1',
      });

      expect(service.isAssetModalRequested()).toBe(true);
      expect(service.assetPrefill()?.ticker).toBe('VALE3');
      expect(service.assetPrefill()?.current_price).toBe(60.5);

      service.clearAssetModalRequest();
      expect(service.isAssetModalRequested()).toBe(false);
      expect(service.assetPrefill()).toBeNull();
    });
  });

  describe('Construção de Contextos Dinâmicos', () => {
    it('deve formatar métricas financeiras em texto para o System Instruction', async () => {
      const context = await service.buildFinancialContext();

      expect(context).toContain('Saldo Consolidado em Contas (Dinheiro Real Hoje): R$ 7800.50');
      expect(context).toContain('Receitas do Mês: R$ 6500.00');
      expect(context).toContain('Necessidades');
      expect(context).toContain('Superávit');
      expect(context).toContain('Mercado');
    });

    it('deve formatar métricas da carteira e classes de investimentos para o System Instruction', async () => {
      const context = await service.buildInvestmentsContext();

      expect(context).toContain('Patrimônio Total Consolidado: R$ 3800.00');
      expect(context).toContain('Ações Brasileiras');
      expect(context).toContain('PETR4');
      expect(context).toContain('ABAIXO DA META (Prioridade de Aporte)');
    });
  });

  describe('Streaming de Mensagens', () => {
    it('deve avisar amigavelmente quando o usuário não possuir sessão ativa', async () => {
      mockSupabaseService.getAccessToken.mockResolvedValue(null);

      const message = await firstValueFrom(service.sendMessageStream('Posso gastar R$ 100 hoje?'));
      expect(message).toContain('Sessão não encontrada');
    });
  });
});
