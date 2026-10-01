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
});
