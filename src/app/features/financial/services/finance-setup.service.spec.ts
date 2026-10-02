import { TestBed } from '@angular/core/testing';
import { FinanceSetupService } from './finance-setup.service';
import { SupabaseService } from '../../../core/services/supabase.service';

describe('FinanceSetupService', () => {
  let service: FinanceSetupService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      currentUser: () => ({ id: 'user-test-123' }),
      client: {
        from: vi.fn(),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        FinanceSetupService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    service = TestBed.inject(FinanceSetupService);
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeTruthy();
  });

  it('deve interceptar erro P0001 ao criar conta além do limite e lançar mensagem amigável', async () => {
    mockSupabase.client.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: {
              code: 'P0001',
              message: 'Limite do plano de demonstração atingido',
            },
          }),
        }),
      }),
    });

    await expect(service.createAccount('4ª Conta Bancária', 100)).rejects.toThrow(
      'Limite da Conta de Teste atingido'
    );
  });

  it('deve semear os 3 grupos 50/30/20 e as categorias de despesa e receita corretamente', async () => {
    const insertedGroups: any[] = [];
    const insertedCategories: any[] = [];

    mockSupabase.client.from.mockImplementation((table: string) => {
      if (table === 'budget_groups') {
        return {
          insert: vi.fn().mockImplementation((payload: any) => {
            const groupData = { ...payload, id: `grp-${payload.name.slice(0, 5)}` };
            insertedGroups.push(groupData);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: groupData, error: null }),
              }),
            };
          }),
        };
      }

      if (table === 'categories') {
        return {
          insert: vi.fn().mockImplementation((payload: any) => {
            const catData = { ...payload, id: `cat-${payload.name.slice(0, 5)}` };
            insertedCategories.push(catData);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: catData, error: null }),
              }),
            };
          }),
        };
      }

      return {
        select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      };
    });

    await service.seedDefault503020();

    // 1. Validação dos Grupos de Orçamento
    expect(insertedGroups.length).toBe(3);
    expect(insertedGroups[0].name).toBe('Gastos Fixos (Essencial)');
    expect(insertedGroups[0].target_percentage).toBe(50);
    expect(insertedGroups[1].name).toBe('Desejos (Estilo de Vida)');
    expect(insertedGroups[1].target_percentage).toBe(30);
    expect(insertedGroups[2].name).toBe('Objetivos & Futuro (Investimentos)');
    expect(insertedGroups[2].target_percentage).toBe(20);

    // 2. Validação das Categorias de Despesa
    const expenseCategories = insertedCategories.filter((c) => c.type === 'EXPENSE');
    expect(expenseCategories.length).toBe(13); // 5 fixos + 6 desejos + 2 objetivos

    const fixosCategories = expenseCategories.filter((c) => c.budget_group_id === insertedGroups[0].id);
    expect(fixosCategories.map((c) => c.name)).toEqual([
      'Moradia',
      'Alimentação Básica',
      'Transporte',
      'Comunicação',
      'Educação & Dívidas',
    ]);

    const desejosCategories = expenseCategories.filter((c) => c.budget_group_id === insertedGroups[1].id);
    expect(desejosCategories.map((c) => c.name)).toEqual([
      'Saúde & Bem-Estar',
      'Desenvolvimento Pessoal',
      'Conveniência / Serviços',
      'Lazer & Restaurantes',
      'Assinaturas',
      'Compras Variadas',
    ]);

    const objetivosCategories = expenseCategories.filter((c) => c.budget_group_id === insertedGroups[2].id);
    expect(objetivosCategories.map((c) => c.name)).toEqual([
      'Reserva de Emergência',
      'Investimentos (Aportes)',
    ]);

    // 3. Validação das Categorias de Receita
    const incomeCategories = insertedCategories.filter((c) => c.type === 'INCOME');
    expect(incomeCategories.length).toBe(5);
    expect(incomeCategories.every((c) => c.budget_group_id === null)).toBe(true);
    expect(incomeCategories.map((c) => c.name)).toEqual([
      'Salário Principal',
      'Vale Alimentação',
      'Bônus',
      'Renda Extra & Freelance',
      'Rendimentos & Dividendos',
    ]);
  });
});

