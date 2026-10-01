import { Injectable, inject } from '@angular/core';
import {
  BudgetGroup,
  Category,
  CreditCard,
  FinancialAccount,
} from '../../../core/models/database.types';
import { SupabaseService } from '../../../core/services/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class FinanceSetupService {
  private readonly supabase = inject(SupabaseService);

  // ===========================================================================
  // 1. Contas Financeiras (financial_accounts)
  // ===========================================================================
  async getAccounts(): Promise<FinancialAccount[]> {
    const { data, error } = await this.supabase.client
      .from('financial_accounts')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map((item) => ({
      ...item,
      balance: Number(item.balance) || 0,
    }));
  }

  async createAccount(name: string, balance: number): Promise<FinancialAccount> {
    const user = this.supabase.currentUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const { data, error } = await this.supabase.client
      .from('financial_accounts')
      .insert({
        user_id: user.id,
        name: name.trim(),
        balance: Number(balance) || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return { ...data, balance: Number(data.balance) || 0 };
  }

  async updateAccount(id: string, name: string, balance: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('financial_accounts')
      .update({
        name: name.trim(),
        balance: Number(balance) || 0,
      })
      .eq('id', id);

    if (error) throw error;
  }

  async updateAccountBalance(id: string, balance: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('financial_accounts')
      .update({ balance: Number(balance) || 0 })
      .eq('id', id);

    if (error) throw error;
  }

  async deleteAccount(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('financial_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===========================================================================
  // 2. Cartões de Crédito (credit_cards)
  // ===========================================================================
  async getCreditCards(): Promise<CreditCard[]> {
    const { data, error } = await this.supabase.client
      .from('credit_cards')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createCreditCard(payload: {
    name: string;
    closing_day: number;
    due_day: number;
  }): Promise<CreditCard> {
    const user = this.supabase.currentUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const { data, error } = await this.supabase.client
      .from('credit_cards')
      .insert({
        user_id: user.id,
        name: payload.name.trim(),
        closing_day: Number(payload.closing_day),
        due_day: Number(payload.due_day),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCreditCard(
    id: string,
    payload: { name: string; closing_day: number; due_day: number }
  ): Promise<void> {
    const { error } = await this.supabase.client
      .from('credit_cards')
      .update({
        name: payload.name.trim(),
        closing_day: Number(payload.closing_day),
        due_day: Number(payload.due_day),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async deleteCreditCard(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('credit_cards')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===========================================================================
  // 3. Grupos de Orçamento (budget_groups - 50/30/20)
  // ===========================================================================
  async getBudgetGroups(): Promise<BudgetGroup[]> {
    const { data, error } = await this.supabase.client
      .from('budget_groups')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map((item) => ({
      ...item,
      target_percentage: Number(item.target_percentage) || 0,
    }));
  }

  async createBudgetGroup(payload: {
    name: string;
    target_percentage: number;
    type: 'INCOME' | 'EXPENSE';
  }): Promise<BudgetGroup> {
    const user = this.supabase.currentUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const { data, error } = await this.supabase.client
      .from('budget_groups')
      .insert({
        user_id: user.id,
        name: payload.name.trim(),
        target_percentage: Number(payload.target_percentage) || 0,
        type: payload.type,
      })
      .select()
      .single();

    if (error) throw error;
    return { ...data, target_percentage: Number(data.target_percentage) || 0 };
  }

  async updateBudgetGroup(
    id: string,
    payload: { name: string; target_percentage: number }
  ): Promise<void> {
    const { error } = await this.supabase.client
      .from('budget_groups')
      .update({
        name: payload.name.trim(),
        target_percentage: Number(payload.target_percentage) || 0,
      })
      .eq('id', id);

    if (error) throw error;
  }

  async batchUpdateBudgetGroupPercentages(
    items: { id: string; target_percentage: number }[]
  ): Promise<void> {
    const promises = items.map((item) =>
      this.supabase.client
        .from('budget_groups')
        .update({ target_percentage: Number(item.target_percentage) || 0 })
        .eq('id', item.id)
    );

    const results = await Promise.all(promises);
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) throw firstError;
  }

  async deleteBudgetGroup(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('budget_groups')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===========================================================================
  // 4. Categorias (categories)
  // ===========================================================================
  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase.client
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createCategory(payload: {
    name: string;
    type: 'INCOME' | 'EXPENSE';
    budget_group_id: string | null;
    color_or_icon: string;
  }): Promise<Category> {
    const user = this.supabase.currentUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const { data, error } = await this.supabase.client
      .from('categories')
      .insert({
        user_id: user.id,
        name: payload.name.trim(),
        type: payload.type,
        budget_group_id: payload.type === 'EXPENSE' ? payload.budget_group_id : null,
        color_or_icon: payload.color_or_icon || '#10b981',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCategory(
    id: string,
    payload: {
      name: string;
      type: 'INCOME' | 'EXPENSE';
      budget_group_id: string | null;
      color_or_icon: string;
    }
  ): Promise<void> {
    const { error } = await this.supabase.client
      .from('categories')
      .update({
        name: payload.name.trim(),
        type: payload.type,
        budget_group_id: payload.type === 'EXPENSE' ? payload.budget_group_id : null,
        color_or_icon: payload.color_or_icon,
      })
      .eq('id', id);

    if (error) throw error;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===========================================================================
  // 5. Template Sugerido Padrão 50/30/20 com Categorias Populares
  // ===========================================================================
  async seedDefault503020(): Promise<void> {
    // 1. Grupos de Orçamento
    const gNecessidades = await this.createBudgetGroup({
      name: 'Necessidades Básicas (Essencial)',
      target_percentage: 50,
      type: 'EXPENSE',
    });

    const gDesejos = await this.createBudgetGroup({
      name: 'Desejos Pessoais & Estilo de Vida',
      target_percentage: 30,
      type: 'EXPENSE',
    });

    const gPoupanca = await this.createBudgetGroup({
      name: 'Poupança & Futuro (Investimentos)',
      target_percentage: 20,
      type: 'EXPENSE',
    });

    // 2. Categorias de Despesas atreladas aos grupos
    // Necessidades
    await this.createCategory({ name: 'Moradia (Aluguel, Condomínio, Luz)', type: 'EXPENSE', budget_group_id: gNecessidades.id, color_or_icon: '#3b82f6' });
    await this.createCategory({ name: 'Supermercado & Feira', type: 'EXPENSE', budget_group_id: gNecessidades.id, color_or_icon: '#10b981' });
    await this.createCategory({ name: 'Saúde & Farmácia', type: 'EXPENSE', budget_group_id: gNecessidades.id, color_or_icon: '#ef4444' });
    await this.createCategory({ name: 'Transporte & Combustível', type: 'EXPENSE', budget_group_id: gNecessidades.id, color_or_icon: '#f59e0b' });

    // Desejos
    await this.createCategory({ name: 'Restaurantes, Bares & Delivery', type: 'EXPENSE', budget_group_id: gDesejos.id, color_or_icon: '#ec4899' });
    await this.createCategory({ name: 'Lazer, Streaming & Viagens', type: 'EXPENSE', budget_group_id: gDesejos.id, color_or_icon: '#8b5cf6' });
    await this.createCategory({ name: 'Compras Pessoais & Vestuário', type: 'EXPENSE', budget_group_id: gDesejos.id, color_or_icon: '#06b6d4' });

    // Poupança
    await this.createCategory({ name: 'Aportes em Investimentos', type: 'EXPENSE', budget_group_id: gPoupanca.id, color_or_icon: '#10b981' });
    await this.createCategory({ name: 'Reserva de Emergência', type: 'EXPENSE', budget_group_id: gPoupanca.id, color_or_icon: '#6366f1' });

    // 3. Categorias de Receitas (sem grupo de orçamento de despesa)
    await this.createCategory({ name: 'Salário Principal', type: 'INCOME', budget_group_id: null, color_or_icon: '#10b981' });
    await this.createCategory({ name: 'Renda Extra & Freelance', type: 'INCOME', budget_group_id: null, color_or_icon: '#3b82f6' });
    await this.createCategory({ name: 'Rendimentos & Dividendos', type: 'INCOME', budget_group_id: null, color_or_icon: '#f59e0b' });
  }
}
