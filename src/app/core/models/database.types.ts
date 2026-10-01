// ==============================================================================
// Módulo de Investimentos
// ==============================================================================
export interface AssetClass {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  target_percentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface Asset {
  id: string;
  user_id: string;
  ticker: string;
  current_price: number;
  asset_class_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface PortfolioItem {
  id: string;
  user_id: string;
  asset_id: string;
  quantity: number;
  average_price: number;
  created_at?: string;
  updated_at?: string;
}

export interface PortfolioItemDetail extends PortfolioItem {
  asset?: Asset;
  asset_class?: AssetClass;
}

// ==============================================================================
// Módulo de Controle Financeiro
// ==============================================================================
export interface FinancialAccount {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  closing_day: number;
  due_day: number;
  created_at?: string;
  updated_at?: string;
}

export type BudgetGroupType = 'INCOME' | 'EXPENSE';

export interface BudgetGroup {
  id: string;
  user_id: string;
  name: string;
  target_percentage: number;
  type: BudgetGroupType;
  created_at?: string;
  updated_at?: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  budget_group_id: string | null;
  color_or_icon: string;
  created_at?: string;
  updated_at?: string;
}

export type PaymentMethod = 'PIX' | 'DINHEIRO' | 'CREDITO' | 'DEBITO' | 'VALE';

export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  date: string;
  type: TransactionType;
  account_id: string | null;
  credit_card_id: string | null;
  category_id: string | null;
  payment_method: PaymentMethod;
  is_paid: boolean;
  is_fixed: boolean;
  fixed_group_id?: string | null;
  current_installment: number;
  total_installments: number;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionDetail extends Transaction {
  category?: Category;
  financial_account?: FinancialAccount;
  credit_card?: CreditCard;
}

export interface CreateTransactionDto {
  description: string;
  amount: number;
  date: string; // 'YYYY-MM-DD'
  type: TransactionType;
  account_id?: string | null;
  credit_card_id?: string | null;
  category_id?: string | null;
  payment_method?: PaymentMethod | null;
  is_paid?: boolean;
  is_fixed?: boolean;
  installments?: number; // 1 a 12
}
