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
});
