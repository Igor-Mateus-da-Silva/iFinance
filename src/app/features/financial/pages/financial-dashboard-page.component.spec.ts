import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinancialDashboardPageComponent } from './financial-dashboard-page.component';
import { FinancialDashboardService } from '../services/financial-dashboard.service';
import { Router } from '@angular/router';

describe('FinancialDashboardPageComponent', () => {
  let component: FinancialDashboardPageComponent;
  let fixture: ComponentFixture<FinancialDashboardPageComponent>;
  let mockDashboardService: any;
  let mockRouter: any;

  const mockMetrics = {
    totalCurrentBalance: 12500.5,
    totalIncome: 6000.0,
    totalExpense: 3200.0,
    netResult: 2800.0,
    savingsRate: 46.7,
    budgetProgressList: [
      {
        group: {
          id: 'bg-1',
          user_id: 'user-1',
          name: 'Necessidades 50%',
          target_percentage: 50,
          type: 'EXPENSE' as const,
        },
        targetPercentage: 50,
        targetAmount: 3000.0,
        spentAmount: 2000.0,
        percentageConsumed: 66.7,
        isOverBudget: false,
        status: 'safe' as const,
      },
    ],
    topCategories: [
      {
        categoryId: 'cat-1',
        categoryName: 'Supermercado',
        categoryColor: '#10b981',
        amount: 1200.0,
        percentageOfTotal: 37.5,
      },
    ],
    topExpenses: [
      {
        id: 'tx-1',
        user_id: 'user-1',
        description: 'Compra do Mês',
        amount: 800.0,
        date: '2026-10-10',
        type: 'EXPENSE' as const,
        payment_method: 'CREDITO' as const,
        is_paid: true,
        is_fixed: false,
        current_installment: 1,
        total_installments: 1,
        account_id: null,
        credit_card_id: null,
        category_id: null,
      },
    ],
  };

  beforeEach(async () => {
    mockDashboardService = {
      getDashboardMetrics: vi.fn().mockResolvedValue(mockMetrics),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [FinancialDashboardPageComponent],
      providers: [
        { provide: FinancialDashboardService, useValue: mockDashboardService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FinancialDashboardPageComponent);
    component = fixture.componentInstance;
  });

  it('deve inicializar o componente e carregar as métricas do mês atual', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockDashboardService.getDashboardMetrics).toHaveBeenCalledTimes(1);
    expect(component.metrics()).toEqual(mockMetrics);
    expect(component.isLoading()).toBe(false);
  });

  it('deve navegar entre meses e recarregar os dados', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const initialMonth = component.selectedYearMonth();
    component.changeMonth(1);

    expect(component.selectedYearMonth()).not.toBe(initialMonth);
    expect(mockDashboardService.getDashboardMetrics).toHaveBeenCalledTimes(2);
  });

  it('deve calcular corretamente o limite de barra de progresso e valores restantes', () => {
    expect(component.getSafeProgressWidth(150)).toBe(100);
    expect(component.getSafeProgressWidth(45)).toBe(45);
    expect(component.getSafeProgressWidth(-10)).toBe(0);

    expect(component.getAvailableAmount(3000, 2000)).toBe(1000);
    expect(component.getAvailableAmount(3000, 3500)).toBe(0);

    expect(component.getOverAmount(3000, 3500)).toBe(500);
    expect(component.getOverAmount(3000, 2000)).toBe(0);
  });

  it('deve redirecionar para a tela de lançamentos e de configurações', () => {
    component.goToTransactions();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/financial/transactions']);

    component.goToSetup();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/financial/setup']);
  });
});
