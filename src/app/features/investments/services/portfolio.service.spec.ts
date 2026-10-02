import { TestBed } from '@angular/core/testing';
import { PortfolioService } from './portfolio.service';
import { SupabaseService } from '../../../core/services/supabase.service';

describe('PortfolioService', () => {
  let service: PortfolioService;
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
        PortfolioService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    service = TestBed.inject(PortfolioService);
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeTruthy();
  });

  it('deve interceptar erro P0001 ao cadastrar ativo além do limite do plano demo', async () => {
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

    await expect(
      service.createAssetWithHolding({
        ticker: 'PETR4',
        asset_class_id: 'cls-1',
        current_price: 38.0,
        quantity: 100,
      })
    ).rejects.toThrow('Limite da Conta de Teste atingido');
  });
});
