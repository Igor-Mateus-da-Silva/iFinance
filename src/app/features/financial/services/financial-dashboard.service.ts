import { Injectable, inject } from '@angular/core';
import {
  BudgetGroup,
  Category,
  FinancialAccount,
  TransactionDetail,
} from '../../../core/models/database.types';
import { FinanceSetupService } from './finance-setup.service';
import { TransactionService } from './transaction.service';

export interface BudgetGroupProgress {
  group: BudgetGroup;
  targetPercentage: number;
  targetAmount: number;
  spentAmount: number;
  percentageConsumed: number;
  isOverBudget: boolean;
  status: 'safe' | 'warning' | 'danger'; // safe (<80%), warning (80-99.9%), danger (>=100%)
}

export interface CategoryExpenseSummary {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  percentageOfTotal: number;
}

export interface DashboardMetrics {
  totalCurrentBalance: number;
  totalIncome: number;
  totalExpense: number;
  netResult: number;
  savingsRate: number;
  budgetProgressList: BudgetGroupProgress[];
  topCategories: CategoryExpenseSummary[];
  topExpenses: TransactionDetail[];
}

@Injectable({
  providedIn: 'root',
})
export class FinancialDashboardService {
  private readonly financeSetupService = inject(FinanceSetupService);
  private readonly transactionService = inject(TransactionService);

  /**
   * Carrega os dados brutos e calcula o balanço orçamentário consolidado para o mês.
   */
  async getDashboardMetrics(yearMonth: string): Promise<DashboardMetrics> {
    const [accounts, budgetGroups, categories, transactions] = await Promise.all([
      this.financeSetupService.getAccounts(),
      this.financeSetupService.getBudgetGroups(),
      this.financeSetupService.getCategories(),
      this.transactionService.getTransactionsByMonth(yearMonth),
    ]);

    return this.calculateMetrics(accounts, budgetGroups, categories, transactions);
  }

  /**
   * Função pura para calcular métricas financeiras, facilitando testes unitários isolados.
   */
  calculateMetrics(
    accounts: FinancialAccount[],
    budgetGroups: BudgetGroup[],
    categories: Category[],
    transactions: TransactionDetail[]
  ): DashboardMetrics {
    // 1. Saldo Real das Contas Hoje
    const totalCurrentBalance = accounts.reduce(
      (sum, a) => sum + (Number(a.balance) || 0),
      0
    );

    // 2. Fluxo de Caixa do Mês
    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const netResult = Math.round((totalIncome - totalExpense) * 100) / 100;

    const savingsRate =
      totalIncome > 0
        ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10)
        : 0;

    // 3. Regra 50/30/20: Progresso dos Grupos de Orçamento
    const expenseGroups = budgetGroups.filter((g) => g.type === 'EXPENSE');

    const budgetProgressList: BudgetGroupProgress[] = expenseGroups.map((group) => {
      const targetPercentage = Number(group.target_percentage) || 0;
      const targetAmount = Math.round(((totalIncome * targetPercentage) / 100) * 100) / 100;

      // Identifica categorias vinculadas a este grupo
      const catIdsInGroup = new Set(
        categories
          .filter((c) => c.budget_group_id === group.id)
          .map((c) => c.id)
      );

      // Soma despesas que pertencem a essas categorias
      const spentAmount = transactions
        .filter(
          (t) =>
            t.type === 'EXPENSE' &&
            (catIdsInGroup.has(t.category_id || '') ||
              t.category?.budget_group_id === group.id)
        )
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const roundedSpent = Math.round(spentAmount * 100) / 100;

      let percentageConsumed = 0;
      if (targetAmount > 0) {
        percentageConsumed = Math.round((roundedSpent / targetAmount) * 1000) / 10;
      } else if (roundedSpent > 0) {
        percentageConsumed = 100;
      }

      const isOverBudget = targetAmount > 0 ? roundedSpent > targetAmount : roundedSpent > 0;

      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (targetAmount === 0) {
        status = roundedSpent > 0 ? 'danger' : 'safe';
      } else if (percentageConsumed >= 100) {
        status = 'danger';
      } else if (percentageConsumed >= 80) {
        status = 'warning';
      }

      return {
        group,
        targetPercentage,
        targetAmount,
        spentAmount: roundedSpent,
        percentageConsumed,
        isOverBudget,
        status,
      };
    });

    // 4. Top Categorias de Maior Gasto
    const expenseTransactions = transactions.filter((t) => t.type === 'EXPENSE');
    const categoryTotalsMap = new Map<
      string,
      { name: string; color: string; amount: number }
    >();

    expenseTransactions.forEach((t) => {
      const catId = t.category_id || 'no-category';
      const catName = t.category?.name || 'Geral (Sem Categoria)';
      const catColor = t.category?.color_or_icon || '#64748b';
      const existing = categoryTotalsMap.get(catId) || {
        name: catName,
        color: catColor,
        amount: 0,
      };
      existing.amount += Number(t.amount) || 0;
      categoryTotalsMap.set(catId, existing);
    });

    const topCategories: CategoryExpenseSummary[] = Array.from(
      categoryTotalsMap.entries()
    )
      .map(([id, info]) => {
        const roundedAmount = Math.round(info.amount * 100) / 100;
        const percentageOfTotal =
          totalExpense > 0
            ? Math.round((roundedAmount / totalExpense) * 1000) / 10
            : 0;

        return {
          categoryId: id,
          categoryName: info.name,
          categoryColor: info.color,
          amount: roundedAmount,
          percentageOfTotal,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // 5. Maiores Transações Individuais
    const topExpenses = [...expenseTransactions]
      .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
      .slice(0, 5);

    return {
      totalCurrentBalance: Math.round(totalCurrentBalance * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netResult,
      savingsRate,
      budgetProgressList,
      topCategories,
      topExpenses,
    };
  }
}
