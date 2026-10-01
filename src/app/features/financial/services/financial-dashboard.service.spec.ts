import { TestBed } from '@angular/core/testing';
import {
  FinancialDashboardService,
} from './financial-dashboard.service';
import { FinanceSetupService } from './finance-setup.service';
import { TransactionService } from './transaction.service';
import {
  BudgetGroup,
  Category,
  FinancialAccount,
  TransactionDetail,
} from '../../../core/models/database.types';

describe('FinancialDashboardService', () => {
  let service: FinancialDashboardService;
  let mockFinanceSetup: any;
  let mockTransactionService: any;

  const mockAccounts: FinancialAccount[] = [
    {
      id: 'acc-1',
      user_id: 'user-1',
      name: 'Nubank',
      balance: 1500.5,
      created_at: '2026-01-01',
    },
    {
      id: 'acc-2',
      user_id: 'user-1',
      name: 'Inter',
      balance: 3500.0,
      created_at: '2026-01-01',
    },
  ];

  const mockBudgetGroups: BudgetGroup[] = [
    {
      id: 'bg-1',
      user_id: 'user-1',
      name: 'Necessidades Básicas',
      target_percentage: 50,
      type: 'EXPENSE',
      created_at: '2026-01-01',
    },
    {
      id: 'bg-2',
      user_id: 'user-1',
      name: 'Desejos Pessoais',
      target_percentage: 30,
      type: 'EXPENSE',
      created_at: '2026-01-01',
    },
    {
      id: 'bg-3',
      user_id: 'user-1',
      name: 'Investimentos',
      target_percentage: 20,
      type: 'EXPENSE',
      created_at: '2026-01-01',
    },
  ];

  const mockCategories: Category[] = [
    {
      id: 'cat-mercado',
      user_id: 'user-1',
      name: 'Supermercado',
      type: 'EXPENSE',
      budget_group_id: 'bg-1',
      color_or_icon: '#10b981',
      created_at: '2026-01-01',
    },
    {
      id: 'cat-aluguel',
      user_id: 'user-1',
      name: 'Aluguel',
      type: 'EXPENSE',
      budget_group_id: 'bg-1',
      color_or_icon: '#3b82f6',
      created_at: '2026-01-01',
    },
    {
      id: 'cat-lazer',
      user_id: 'user-1',
      name: 'Lazer e Restaurantes',
      type: 'EXPENSE',
      budget_group_id: 'bg-2',
      color_or_icon: '#f59e0b',
      created_at: '2026-01-01',
    },
    {
      id: 'cat-salario',
      user_id: 'user-1',
      name: 'Salário',
      type: 'INCOME',
      budget_group_id: null,
      color_or_icon: '#10b981',
      created_at: '2026-01-01',
    },
  ];

  const mockTransactions: TransactionDetail[] = [
    {
      id: 'tx-1',
      user_id: 'user-1',
      account_id: 'acc-1',
      category_id: 'cat-salario',
      credit_card_id: null,
      description: 'Salário Mensal',
      amount: 5000.0,
      date: '2026-10-05',
      type: 'INCOME',
      payment_method: 'PIX',
      is_paid: true,
      is_fixed: false,
      current_installment: 1,
      total_installments: 1,
      created_at: '2026-10-05',
    },
    {
      id: 'tx-2',
      user_id: 'user-1',
      account_id: 'acc-1',
      category_id: 'cat-aluguel',
      credit_card_id: null,
      description: 'Aluguel do Apartamento',
      amount: 1500.0,
      date: '2026-10-10',
      type: 'EXPENSE',
      payment_method: 'DINHEIRO',
      is_paid: true,
      is_fixed: true,
      current_installment: 1,
      total_installments: 1,
      created_at: '2026-10-10',
      category: mockCategories[1],
    },
    {
      id: 'tx-3',
      user_id: 'user-1',
      account_id: 'acc-1',
      category_id: 'cat-mercado',
      credit_card_id: null,
      description: 'Compras Semanal Mercado',
      amount: 600.0,
      date: '2026-10-12',
      type: 'EXPENSE',
      payment_method: 'DEBITO',
      is_paid: true,
      is_fixed: false,
      current_installment: 1,
      total_installments: 1,
      created_at: '2026-10-12',
      category: mockCategories[0],
    },
    {
      id: 'tx-4',
      user_id: 'user-1',
      account_id: null,
      category_id: 'cat-lazer',
      credit_card_id: 'card-1',
      description: 'Jantar Restaurante',
      amount: 300.0,
      date: '2026-10-15',
      type: 'EXPENSE',
      payment_method: 'CREDITO',
      is_paid: false,
      is_fixed: false,
      current_installment: 1,
      total_installments: 1,
      created_at: '2026-10-15',
      category: mockCategories[2],
    },
  ];

  beforeEach(() => {
    mockFinanceSetup = {
      getAccounts: vi.fn().mockResolvedValue(mockAccounts),
      getBudgetGroups: vi.fn().mockResolvedValue(mockBudgetGroups),
      getCategories: vi.fn().mockResolvedValue(mockCategories),
    };

    mockTransactionService = {
      getTransactionsByMonth: vi.fn().mockResolvedValue(mockTransactions),
    };

    TestBed.configureTestingModule({
      providers: [
        FinancialDashboardService,
        { provide: FinanceSetupService, useValue: mockFinanceSetup },
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    });

    service = TestBed.inject(FinancialDashboardService);
  });

  describe('Cálculo de Métricas (calculateMetrics)', () => {
    it('deve calcular corretamente o saldo total das contas hoje', () => {
      const metrics = service.calculateMetrics(
        mockAccounts,
        mockBudgetGroups,
        mockCategories,
        mockTransactions
      );

      // 1500.5 + 3500.0 = 5000.5
      expect(metrics.totalCurrentBalance).toBe(5000.5);
    });

    it('deve calcular receitas, despesas e resultado líquido do mês', () => {
      const metrics = service.calculateMetrics(
        mockAccounts,
        mockBudgetGroups,
        mockCategories,
        mockTransactions
      );

      // Receita: 5000.0
      expect(metrics.totalIncome).toBe(5000.0);
      // Despesas: 1500.0 + 600.0 + 300.0 = 2400.0
      expect(metrics.totalExpense).toBe(2400.0);
      // Resultado Líquido: 5000.0 - 2400.0 = 2600.0
      expect(metrics.netResult).toBe(2600.0);
      // Taxa de sobra: (2600 / 5000) * 100 = 52.0%
      expect(metrics.savingsRate).toBe(52.0);
    });

    it('deve calcular o progresso dos grupos orçamentários (50/30/20)', () => {
      const metrics = service.calculateMetrics(
        mockAccounts,
        mockBudgetGroups,
        mockCategories,
        mockTransactions
      );

      const progress50 = metrics.budgetProgressList.find((p) => p.group.id === 'bg-1');
      expect(progress50).toBeDefined();
      // Alvo 50% de 5000 = 2500
      expect(progress50!.targetAmount).toBe(2500);
      // Gastos: Aluguel (1500) + Mercado (600) = 2100
      expect(progress50!.spentAmount).toBe(2100);
      // % Consumido: (2100 / 2500) * 100 = 84%
      expect(progress50!.percentageConsumed).toBe(84.0);
      // 84% fica no status warning (80-99.9%)
      expect(progress50!.status).toBe('warning');
      expect(progress50!.isOverBudget).toBe(false);

      const progress30 = metrics.budgetProgressList.find((p) => p.group.id === 'bg-2');
      expect(progress30).toBeDefined();
      // Alvo 30% de 5000 = 1500
      expect(progress30!.targetAmount).toBe(1500);
      // Gastos: Lazer (300)
      expect(progress30!.spentAmount).toBe(300);
      // % Consumido: (300 / 1500) * 100 = 20%
      expect(progress30!.percentageConsumed).toBe(20.0);
      expect(progress30!.status).toBe('safe');
      expect(progress30!.isOverBudget).toBe(false);
    });

    it('deve marcar status como danger se o orçamento for estourado (> 100%)', () => {
      const heavyExpenses: TransactionDetail[] = [
        ...mockTransactions,
        {
          id: 'tx-extra',
          user_id: 'user-1',
          account_id: 'acc-1',
          category_id: 'cat-mercado',
          credit_card_id: null,
          description: 'Mercado Extra',
          amount: 600.0, // total bg-1 agora é 2100 + 600 = 2700 (> 2500)
          date: '2026-10-20',
          type: 'EXPENSE',
          payment_method: 'DEBITO',
          is_paid: true,
          is_fixed: false,
          current_installment: 1,
          total_installments: 1,
          created_at: '2026-10-20',
          category: mockCategories[0],
        },
      ];

      const metrics = service.calculateMetrics(
        mockAccounts,
        mockBudgetGroups,
        mockCategories,
        heavyExpenses
      );

      const progress50 = metrics.budgetProgressList.find((p) => p.group.id === 'bg-1');
      expect(progress50!.spentAmount).toBe(2700);
      expect(progress50!.percentageConsumed).toBe(108.0);
      expect(progress50!.isOverBudget).toBe(true);
      expect(progress50!.status).toBe('danger');
    });

    it('deve ranquear as top 5 categorias e as top 5 maiores despesas', () => {
      const metrics = service.calculateMetrics(
        mockAccounts,
        mockBudgetGroups,
        mockCategories,
        mockTransactions
      );

      // Top Categorias: Aluguel (1500), Mercado (600), Lazer (300)
      expect(metrics.topCategories.length).toBe(3);
      expect(metrics.topCategories[0].categoryName).toBe('Aluguel');
      expect(metrics.topCategories[0].amount).toBe(1500);
      expect(metrics.topCategories[1].categoryName).toBe('Supermercado');
      expect(metrics.topCategories[1].amount).toBe(600);

      // Top Maiores Despesas
      expect(metrics.topExpenses.length).toBe(3);
      expect(metrics.topExpenses[0].description).toBe('Aluguel do Apartamento');
      expect(metrics.topExpenses[0].amount).toBe(1500);
      expect(metrics.topExpenses[1].description).toBe('Compras Semanal Mercado');
      expect(metrics.topExpenses[1].amount).toBe(600);
    });
  });

  describe('Integração de busca (getDashboardMetrics)', () => {
    it('deve buscar dados em paralelo e chamar calculateMetrics com o mês correto', async () => {
      const metrics = await service.getDashboardMetrics('2026-10');

      expect(mockFinanceSetup.getAccounts).toHaveBeenCalledTimes(1);
      expect(mockFinanceSetup.getBudgetGroups).toHaveBeenCalledTimes(1);
      expect(mockFinanceSetup.getCategories).toHaveBeenCalledTimes(1);
      expect(mockTransactionService.getTransactionsByMonth).toHaveBeenCalledWith('2026-10');

      expect(metrics.totalIncome).toBe(5000);
      expect(metrics.totalExpense).toBe(2400);
    });
  });
});
