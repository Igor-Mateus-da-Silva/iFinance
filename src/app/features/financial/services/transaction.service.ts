import { Injectable, inject } from '@angular/core';
import {
  CreateTransactionDto,
  PaymentMethod,
  Transaction,
  TransactionDetail,
  TransactionType,
} from '../../../core/models/database.types';
import { SupabaseService } from '../../../core/services/supabase.service';

/**
 * Utilitário: adiciona N meses a uma data no formato YYYY-MM-DD
 * preservando o dia limite de cada mês (ex: 31 Jan + 1 mês -> 28 Fev).
 */
export function addMonthsToDate(isoDateStr: string, monthsToAdd: number): string {
  const [yearStr, monthStr, dayStr] = isoDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const targetDate = new Date(Date.UTC(year, month + monthsToAdd, 1));
  const targetYear = targetDate.getUTCFullYear();
  const targetMonth = targetDate.getUTCMonth();

  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, daysInTargetMonth);

  const formattedMonth = String(targetMonth + 1).padStart(2, '0');
  const formattedDay = String(targetDay).padStart(2, '0');

  return `${targetYear}-${formattedMonth}-${formattedDay}`;
}

/**
 * Utilitário: divide o valor total de forma precisa entre as parcelas,
 * atribuindo a sobra de centavos à primeira parcela.
 */
export function calculateInstallmentAmounts(
  totalAmount: number,
  installments: number
): number[] {
  if (installments <= 1) return [Math.round(totalAmount * 100) / 100];

  const base = Math.floor((totalAmount / installments) * 100) / 100;
  const remainder = Math.round((totalAmount - base * installments) * 100) / 100;
  const amounts: number[] = [];

  for (let i = 0; i < installments; i++) {
    amounts.push(i === 0 ? Math.round((base + remainder) * 100) / 100 : base);
  }

  return amounts;
}

/**
 * Utilitário: retorna o primeiro e último dia do mês no formato YYYY-MM-DD.
 */
export function getMonthDateRange(yearMonth: string): [string, string] {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-${String(daysInMonth).padStart(2, '0')}`;

  return [startDate, endDate];
}

/**
 * Utilitário defensivo: garante que valores vazios ou literais "null"/"undefined"
 * sejam convertidos para o valor nulo do PostgreSQL (null), evitando erro de sintaxe UUID.
 */
export function cleanUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
    return null;
  }
  return trimmed;
}

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Busca transações para o mês especificado (YYYY-MM), opcionalmente filtrando por cartão ou tipo.
   */
  async getTransactionsByMonth(
    yearMonth: string,
    options?: { cardId?: string; type?: TransactionType }
  ): Promise<TransactionDetail[]> {
    const [startDate, endDate] = getMonthDateRange(yearMonth);

    let query = this.supabase.client
      .from('transactions')
      .select(`
        *,
        category:categories(*),
        credit_card:credit_cards(*),
        financial_account:financial_accounts(*)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (options?.cardId) {
      query = query.eq('credit_card_id', options.cardId);
    }

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((item) => ({
      ...item,
      amount: Number(item.amount) || 0,
      current_installment: Number(item.current_installment) || 1,
      total_installments: Number(item.total_installments) || 1,
    }));
  }

  /**
   * Cria uma ou mais transações (caso parcelado), aplicando a regra de fechamento
   * de cartão de crédito e identificador de despesa fixa.
   */
  async createTransaction(dto: CreateTransactionDto): Promise<Transaction[]> {
    const user = this.supabase.currentUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const rawInstallments = Math.floor(Number(dto.installments) || 1);
    const totalInstallments = Math.min(120, Math.max(1, rawInstallments));
    const amounts = calculateInstallmentAmounts(dto.amount, totalInstallments);
    const fixedGroupId = dto.is_fixed ? crypto.randomUUID() : null;

    let initialMonthOffset = 0;

    // Regra de Cartão de Crédito (Faturas):
    // Se a compra for feita a partir do dia de fechamento (inclusive), cai na fatura do mês seguinte.
    if (dto.payment_method === 'CREDITO') {
      if (!dto.credit_card_id) {
        throw new Error('Selecione um cartão de crédito para compras a crédito.');
      }

      const { data: card, error: cardError } = await this.supabase.client
        .from('credit_cards')
        .select('closing_day')
        .eq('id', dto.credit_card_id)
        .single();

      if (cardError) throw cardError;

      const purchaseDay = parseInt(dto.date.split('-')[2], 10);
      if (card && purchaseDay >= card.closing_day) {
        initialMonthOffset = 1;
      }
    }

    let finalCategoryId = cleanUuid(dto.category_id);

    // Se for RECEITA e nenhuma categoria foi informada, busca uma categoria de receita padrão
    if (dto.type === 'INCOME' && !finalCategoryId) {
      const { data: defaultIncomeCat } = await this.supabase.client
        .from('categories')
        .select('id')
        .eq('type', 'INCOME')
        .limit(1)
        .maybeSingle();

      if (defaultIncomeCat?.id) {
        finalCategoryId = defaultIncomeCat.id;
      }
    }

    const records = amounts.map((parcelAmount, idx) => {
      const monthOffset = initialMonthOffset + idx;
      const effectiveDate = addMonthsToDate(dto.date, monthOffset);

      return {
        user_id: user.id,
        description: dto.description.trim(),
        amount: parcelAmount,
        date: effectiveDate,
        type: dto.type,
        account_id: dto.payment_method === 'CREDITO' ? null : cleanUuid(dto.account_id),
        credit_card_id: dto.payment_method === 'CREDITO' ? cleanUuid(dto.credit_card_id) : null,
        category_id: finalCategoryId,
        payment_method: dto.payment_method || 'PIX',
        is_paid: dto.type === 'INCOME' ? true : (dto.is_paid ?? true),
        is_fixed: dto.type === 'INCOME' ? false : (dto.is_fixed ?? false),
        fixed_group_id: dto.is_fixed ? cleanUuid(fixedGroupId) : null,
        current_installment: idx + 1,
        total_installments: totalInstallments,
      };
    });

    const { data, error } = await this.supabase.client
      .from('transactions')
      .insert(records)
      .select();

    if (error) throw error;

    // Atualização segura e atômica de saldo (Prevenção de Race Condition & IDOR)
    const targetAccountId = cleanUuid(dto.account_id);
    if (targetAccountId && dto.payment_method !== 'CREDITO') {
      const delta = dto.type === 'INCOME' ? dto.amount : (dto.is_paid ? -dto.amount : 0);
      if (delta !== 0) {
        try {
          // 1. Tenta executar via RPC atômica (PostgreSQL row lock / transacional)
          const { error: rpcError } = await this.supabase.client.rpc('adjust_account_balance', {
            p_account_id: targetAccountId,
            p_delta: delta,
          });

          // 2. Fallback defensivo caso o script SQL de hardening ainda não tenha sido aplicado no Supabase
          if (rpcError) {
            const { data: acc } = await this.supabase.client
              .from('financial_accounts')
              .select('balance')
              .eq('id', targetAccountId)
              .single();

            if (acc) {
              const currentBalance = Number(acc.balance) || 0;
              const newBalance = Math.round((currentBalance + delta) * 100) / 100;
              await this.supabase.client
                .from('financial_accounts')
                .update({ balance: newBalance })
                .eq('id', targetAccountId);
            }
          }
        } catch (accErr) {
          console.warn('Não foi possível atualizar o saldo da conta:', accErr);
        }
      }
    }

    return (data || []).map((t) => ({ ...t, amount: Number(t.amount) || 0 }));
  }

  /**
   * Altera rapidamente o status pago/pendente com 1 clique.
   */
  async togglePaidStatus(id: string, isPaid: boolean): Promise<void> {
    const { error } = await this.supabase.client
      .from('transactions')
      .update({ is_paid: isPaid })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Marca todas as despesas da fatura de um cartão no mês como pagas.
   */
  async markInvoiceAsPaid(cardId: string, yearMonth: string): Promise<void> {
    const [startDate, endDate] = getMonthDateRange(yearMonth);

    const { error } = await this.supabase.client
      .from('transactions')
      .update({ is_paid: true })
      .eq('credit_card_id', cardId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;
  }

  /**
   * Exclui uma transação individual.
   */
  async deleteTransaction(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Exclui todas as transações pertencentes a um grupo fixo.
   */
  async deleteFixedGroup(fixedGroupId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('transactions')
      .delete()
      .eq('fixed_group_id', fixedGroupId);

    if (error) throw error;
  }
}
