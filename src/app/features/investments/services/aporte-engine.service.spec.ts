import { TestBed } from '@angular/core/testing';
import { AporteEngineService } from './aporte-engine.service';
import { Asset, AssetClass, PortfolioItem } from '../../../core/models/database.types';

describe('AporteEngineService', () => {
  let service: AporteEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AporteEngineService);
  });

  it('deve priorizar aporte na classe com maior defasagem', () => {
    // Cenário:
    // Raiz: Renda Fixa (50%) e Ações (50%)
    // Carteira:
    // - Renda Fixa: R$ 8.000 (80%)
    // - Ações: R$ 2.000 (20%)
    // Total atual: R$ 10.000.
    // Aporte: R$ 2.000.
    // Total projetado: R$ 12.000.
    // Meta Ações: 50% de 12.000 = R$ 6.000. Defasagem = 6.000 - 2.000 = R$ 4.000.
    // Meta Renda Fixa: 50% de 12.000 = R$ 6.000. Defasagem = 6.000 - 8.000 = -R$ 2.000 (excedente).
    // Esperado: 100% dos R$ 2.000 de aporte devem ir para Ações!

    const classes: AssetClass[] = [
      { id: 'c1', user_id: 'u1', name: 'Renda Fixa', parent_id: null, target_percentage: 50 },
      { id: 'c2', user_id: 'u1', name: 'Ações', parent_id: null, target_percentage: 50 },
    ];

    const assets: Asset[] = [
      { id: 'a1', user_id: 'u1', ticker: 'TESOURO_SELIC', current_price: 100, asset_class_id: 'c1' },
      { id: 'a2', user_id: 'u1', ticker: 'PETR4', current_price: 40, asset_class_id: 'c2' },
    ];

    const portfolio: PortfolioItem[] = [
      { id: 'p1', user_id: 'u1', asset_id: 'a1', quantity: 80, average_price: 100 }, // R$ 8.000
      { id: 'p2', user_id: 'u1', asset_id: 'a2', quantity: 50, average_price: 35 },  // R$ 2.000
    ];

    const result = service.calculateAporte({
      contributionAmount: 2000,
      assetClasses: classes,
      assets,
      portfolioItems: portfolio,
    });

    expect(result.totalCurrentValue).toBe(10000);
    expect(result.projectedTotalValue).toBe(12000);

    const acoes = result.classAllocations.find((c) => c.id === 'c2');
    const rendaFixa = result.classAllocations.find((c) => c.id === 'c1');

    expect(acoes?.suggestedContribution).toBe(2000);
    expect(rendaFixa?.suggestedContribution).toBe(0);

    // Sugestão de compras: PETR4 custa R$ 40 -> 2000 / 40 = 50 cotas
    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0].ticker).toBe('PETR4');
    expect(result.suggestions[0].suggestedQuantity).toBe(50);
  });
});
