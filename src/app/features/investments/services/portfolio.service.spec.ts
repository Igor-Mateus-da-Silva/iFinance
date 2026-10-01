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
});
