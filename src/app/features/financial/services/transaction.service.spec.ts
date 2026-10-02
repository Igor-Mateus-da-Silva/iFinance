import { TestBed } from '@angular/core/testing';
import {
  TransactionService,
  addMonthsToDate,
  calculateInstallmentAmounts,
  cleanUuid,
  getMonthDateRange,
} from './transaction.service';
import { SupabaseService } from '../../../core/services/supabase.service';

describe('TransactionService & Date Helpers', () => {
  let service: TransactionService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      currentUser: vi.fn().mockReturnValue({ id: 'user-teste-123' }),
      client: {
        from: vi.fn(),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        TransactionService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    service = TestBed.inject(TransactionService);
  });

  describe('Utilitários Matemáticos e de Datas', () => {
    it('deve calcular valores de parcelas com soma exata e resto no primeiro item', () => {
      // 100 / 3 = 33.34 + 33.33 + 33.33 = 100.00
      const amounts = calculateInstallmentAmounts(100, 3);
      expect(amounts).toEqual([33.34, 33.33, 33.33]);
      expect(amounts.reduce((a, b) => a + b, 0)).toBe(100);

      // Parcela única
      expect(calculateInstallmentAmounts(50, 1)).toEqual([50]);
    });

    it('deve avançar N meses preservando limites de fim de mês', () => {
      expect(addMonthsToDate('2026-10-15', 1)).toBe('2026-11-15');
      expect(addMonthsToDate('2026-10-31', 1)).toBe('2026-11-30'); // Nov tem 30 dias
      expect(addMonthsToDate('2026-11-20', 2)).toBe('2027-01-20'); // vira o ano
    });

    it('deve retornar o intervalo correto de datas para o mês', () => {
      const [start, end] = getMonthDateRange('2026-02');
      expect(start).toBe('2026-02-01');
      expect(end).toBe('2026-02-28');

      const [startOut, endOut] = getMonthDateRange('2026-10');
      expect(startOut).toBe('2026-10-01');
      expect(endOut).toBe('2026-10-31');
    });
  });

  describe('Regra de Cartão de Crédito e Faturas', () => {
    it('deve manter competência no mês atual se compra for antes do dia de fechamento', async () => {
      const insertedRows: any[] = [];

      mockSupabase.client.from.mockImplementation((table: string) => {
        if (table === 'credit_cards') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { closing_day: 20 },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'transactions') {
          return {
            insert: vi.fn().mockImplementation((records) => {
              insertedRows.push(...records);
              return {
                select: vi.fn().mockResolvedValue({ data: records, error: null }),
              };
            }),
          };
        }
        return {};
      });

      // Compra no dia 15 (antes do fechamento no dia 20)
      await service.createTransaction({
        description: 'Mercado',
        amount: 150,
        date: '2026-10-15',
        type: 'EXPENSE',
        credit_card_id: 'card-1',
        category_id: 'cat-1',
        payment_method: 'CREDITO',
        is_paid: false,
        is_fixed: false,
        installments: 1,
      });

      expect(insertedRows.length).toBe(1);
      expect(insertedRows[0].date).toBe('2026-10-15');
      expect(insertedRows[0].current_installment).toBe(1);
      expect(insertedRows[0].total_installments).toBe(1);
    });

    it('deve jogar competência para o mês seguinte se compra for a partir do dia de fechamento', async () => {
      const insertedRows: any[] = [];

      mockSupabase.client.from.mockImplementation((table: string) => {
        if (table === 'credit_cards') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { closing_day: 20 },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'transactions') {
          return {
            insert: vi.fn().mockImplementation((records) => {
              insertedRows.push(...records);
              return {
                select: vi.fn().mockResolvedValue({ data: records, error: null }),
              };
            }),
          };
        }
        return {};
      });

      // Compra no dia 20 (igual ao fechamento) em 3 parcelas
      await service.createTransaction({
        description: 'Notebook',
        amount: 300,
        date: '2026-10-20',
        type: 'EXPENSE',
        credit_card_id: 'card-1',
        category_id: 'cat-tech',
        payment_method: 'CREDITO',
        is_paid: false,
        is_fixed: false,
        installments: 3,
      });

      expect(insertedRows.length).toBe(3);
      // Fatura fechou dia 20, então parcela 1 vai para novembro!
      expect(insertedRows[0].date).toBe('2026-11-20');
      expect(insertedRows[0].current_installment).toBe(1);
      expect(insertedRows[0].amount).toBe(100);

      // Parcela 2 vai para dezembro
      expect(insertedRows[1].date).toBe('2026-12-20');
      expect(insertedRows[1].current_installment).toBe(2);

      // Parcela 3 vai para janeiro
      expect(insertedRows[2].date).toBe('2027-01-20');
      expect(insertedRows[2].current_installment).toBe(3);
    });

    it('deve gerar fixed_group_id para transações fixas', async () => {
      const insertedRows: any[] = [];

      mockSupabase.client.from.mockImplementation((table: string) => {
        if (table === 'transactions') {
          return {
            insert: vi.fn().mockImplementation((records) => {
              insertedRows.push(...records);
              return {
                select: vi.fn().mockResolvedValue({ data: records, error: null }),
              };
            }),
          };
        }
        return {};
      });

      await service.createTransaction({
        description: 'Internet Fibra',
        amount: 120,
        date: '2026-10-05',
        type: 'EXPENSE',
        category_id: 'cat-services',
        payment_method: 'PIX',
        is_paid: true,
        is_fixed: true,
        installments: 1,
      });

      expect(insertedRows.length).toBe(1);
      expect(insertedRows[0].is_fixed).toBe(true);
      expect(insertedRows[0].fixed_group_id).toBeTruthy();
    });

    it('deve converter account_id com string "null" para null real ao salvar', async () => {
      const insertedRows: any[] = [];

      mockSupabase.client.from.mockImplementation((table: string) => {
        if (table === 'transactions') {
          return {
            insert: vi.fn().mockImplementation((records) => {
              insertedRows.push(...records);
              return {
                select: vi.fn().mockResolvedValue({ data: records, error: null }),
              };
            }),
          };
        }
        return {};
      });

      // Simula input vindo com "null" string do formulário
      await service.createTransaction({
        description: 'Padaria',
        amount: 25,
        date: '2026-10-02',
        type: 'EXPENSE',
        category_id: 'cat-1',
        payment_method: 'DINHEIRO',
        account_id: 'null' as any,
        is_paid: true,
        is_fixed: false,
        installments: 1,
      });

      expect(insertedRows.length).toBe(1);
      expect(insertedRows[0].account_id).toBeNull();
    });

    it('deve limitar o número máximo de parcelas a 120 para evitar DoS por exaustão', async () => {
      const insertedRows: any[] = [];

      mockSupabase.client.from.mockImplementation((table: string) => {
        if (table === 'transactions') {
          return {
            insert: vi.fn().mockImplementation((records) => {
              insertedRows.push(...records);
              return {
                select: vi.fn().mockResolvedValue({ data: records, error: null }),
              };
            }),
          };
        }
        return {};
      });

      // Tenta enviar 9999 parcelas
      await service.createTransaction({
        description: 'Compra Abusiva',
        amount: 12000,
        date: '2026-10-02',
        type: 'EXPENSE',
        category_id: 'cat-1',
        payment_method: 'DINHEIRO',
        is_paid: false,
        is_fixed: false,
        installments: 9999,
      });

      expect(insertedRows.length).toBe(120);
      expect(insertedRows[0].total_installments).toBe(120);
    });
  });

  describe('Utilitário cleanUuid', () => {
    it('deve converter strings "null", "undefined" ou vazias para null real', () => {
      expect(cleanUuid('null')).toBeNull();
      expect(cleanUuid('undefined')).toBeNull();
      expect(cleanUuid('')).toBeNull();
      expect(cleanUuid('   ')).toBeNull();
      expect(cleanUuid(null)).toBeNull();
      expect(cleanUuid(undefined)).toBeNull();
      expect(cleanUuid('  123e4567-e89b-12d3-a456-426614174000  ')).toBe(
        '123e4567-e89b-12d3-a456-426614174000'
      );
    });
  });

  describe('Controle de Limites (Plano Demo)', () => {
    it('deve interceptar erro P0001 do plano demo e disparar toast amigável', async () => {
      mockSupabase.client.from.mockImplementation((table: string) => {
        if (table === 'transactions') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: null,
                error: {
                  code: 'P0001',
                  message: 'Limite do plano de demonstração atingido',
                },
              }),
            }),
          };
        }
        return {};
      });

      await expect(
        service.createTransaction({
          description: '4ª Transação Demo',
          amount: 50,
          date: '2026-10-02',
          type: 'EXPENSE',
          category_id: 'cat-1',
          payment_method: 'PIX',
          is_paid: true,
          is_fixed: false,
          installments: 1,
        })
      ).rejects.toThrow('Limite da Conta de Teste atingido');
    });
  });
});

