import { TestBed } from '@angular/core/testing';
import { AssetClassesService } from './asset-classes.service';
import { SupabaseService } from '../../../core/services/supabase.service';

describe('AssetClassesService', () => {
  let service: AssetClassesService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      currentUser: () => ({ id: 'user-123', email: 'test@example.com' }),
      client: {
        from: vi.fn(),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        AssetClassesService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    service = TestBed.inject(AssetClassesService);
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeTruthy();
  });

  it('deve buscar as classes de ativos com valores numéricos', async () => {
    const mockData = [
      { id: '1', user_id: 'u1', name: 'Ações', parent_id: null, target_percentage: '50.00' },
      { id: '2', user_id: 'u1', name: 'Renda Fixa', parent_id: null, target_percentage: '50.00' },
    ];

    mockSupabase.client.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    });

    const result = await service.getClasses();
    expect(result.length).toBe(2);
    expect(result[0].target_percentage).toBe(50);
  });

  it('deve interceptar erro P0001 ao criar classe além do limite do plano demo', async () => {
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
      service.createClass({
        name: 'Criptomoedas',
        parent_id: null,
        target_percentage: 10,
      })
    ).rejects.toThrow('Limite da Conta de Teste atingido');
  });

  it('deve interceptar erro de chave estrangeira (ativos vinculados) ao excluir classe e lançar mensagem amigável', async () => {
    mockSupabase.client.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23503',
            message: 'update or delete on table "asset_classes" violates foreign key constraint "assets_asset_class_id_fkey" on table "assets"',
          },
        }),
      }),
    });

    await expect(service.deleteClass('class-123')).rejects.toThrow(
      'Não é possível excluir esta classe porque existem ativos da sua carteira vinculados a ela'
    );
  });
});

