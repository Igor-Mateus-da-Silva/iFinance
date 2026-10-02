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
});
