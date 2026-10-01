import { Asset, AssetClass, PortfolioItem } from '../../../core/models/database.types';

export interface AporteInput {
  contributionAmount: number;
  assetClasses: AssetClass[];
  assets: Asset[];
  portfolioItems: PortfolioItem[];
}

export interface ClassAllocationAnalysis {
  id: string;
  name: string;
  parentId: string | null;
  isLeaf: boolean;
  targetPercentage: number;
  effectiveTargetPercentage: number;
  currentValue: number;
  currentPercentage: number;
  targetValue: number;
  gapValue: number; // targetValue - currentValue (positivo = defasado)
  suggestedContribution: number;
  projectedValue: number;
  projectedPercentage: number;
}

export interface AssetPurchaseSuggestion {
  assetId: string;
  ticker: string;
  classId: string;
  className: string;
  currentPrice: number;
  currentQuantity: number;
  currentTotal: number;
  targetProportionInClass: number;
  suggestedQuantity: number;
  suggestedTotal: number;
  gapValue: number;
}

export interface AporteRecommendationResult {
  totalCurrentValue: number;
  contributionAmount: number;
  projectedTotalValue: number;
  unallocatedAmount: number; // Sobras de centavos ou arredondamentos de cotas inteiras
  classAllocations: ClassAllocationAnalysis[];
  suggestions: AssetPurchaseSuggestion[];
}
