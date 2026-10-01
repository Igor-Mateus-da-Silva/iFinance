import { Injectable } from '@angular/core';
import { Asset, AssetClass, PortfolioItem } from '../../../core/models/database.types';
import {
  AporteInput,
  AporteRecommendationResult,
  AssetPurchaseSuggestion,
  ClassAllocationAnalysis,
} from '../models/aporte.model';

@Injectable({
  providedIn: 'root',
})
export class AporteEngineService {
  /**
   * Ponto de entrada principal do cálculo de Aporte Inteligente.
   * Compara a carteira real com a carteira ideal e sugere compras para fechar as maiores defasagens.
   */
  calculateAporte(input: AporteInput): AporteRecommendationResult {
    const { contributionAmount, assetClasses, assets, portfolioItems } = input;

    if (contributionAmount <= 0) {
      return this.createEmptyResult(0);
    }

    // 1. Mapeamento rápido de ativos e saldos de custódia
    const assetMap = new Map<string, Asset>(assets.map((a) => [a.id, a]));
    const assetValues = this.calculateAssetHoldings(portfolioItems, assetMap);
    const totalCurrentValue = Array.from(assetValues.values()).reduce(
      (sum, item) => sum + item.totalValue,
      0
    );

    // 2. Patrimônio projetado = patrimônio que teremos após injetar o aporte
    const projectedTotalValue = totalCurrentValue + contributionAmount;

    // 3. Hierarquia de classes e percentual alvo global efetivo
    const classAnalysisMap = this.buildClassHierarchyAnalysis(
      assetClasses,
      assetValues,
      totalCurrentValue,
      projectedTotalValue
    );

    // 4. Distribuir o aporte entre as classes "folhas" mais defasadas
    this.distributeContributionToClasses(classAnalysisMap, contributionAmount);

    // 5. Atualizar as projeções consolidadas nas classes pai (árvore)
    this.consolidateParentClasses(classAnalysisMap, assetClasses, projectedTotalValue);

    // 6. Selecionar os ativos específicos a comprar dentro de cada classe contemplada
    const { suggestions, unallocatedAmount } = this.generateAssetPurchases(
      classAnalysisMap,
      assets,
      assetValues
    );

    return {
      totalCurrentValue,
      contributionAmount,
      projectedTotalValue,
      unallocatedAmount,
      classAllocations: Array.from(classAnalysisMap.values()),
      suggestions,
    };
  }

  // ---------------------------------------------------------------------------
  // Etapa 1: Posição Atual dos Ativos
  // ---------------------------------------------------------------------------
  private calculateAssetHoldings(
    portfolioItems: PortfolioItem[],
    assetMap: Map<string, Asset>
  ): Map<string, { quantity: number; currentPrice: number; totalValue: number; classId: string }> {
    const holdings = new Map<string, { quantity: number; currentPrice: number; totalValue: number; classId: string }>();

    for (const item of portfolioItems) {
      const asset = assetMap.get(item.asset_id);
      const currentPrice = asset?.current_price ?? 0;
      const quantity = Number(item.quantity) || 0;
      const totalValue = quantity * currentPrice;

      if (asset) {
        holdings.set(item.asset_id, {
          quantity,
          currentPrice,
          totalValue,
          classId: asset.asset_class_id,
        });
      }
    }

    return holdings;
  }

  // ---------------------------------------------------------------------------
  // Etapa 2: Análise da Hierarquia de Classes
  // ---------------------------------------------------------------------------
  private buildClassHierarchyAnalysis(
    assetClasses: AssetClass[],
    assetValues: Map<string, { totalValue: number; classId: string }>,
    totalCurrentValue: number,
    projectedTotalValue: number
  ): Map<string, ClassAllocationAnalysis> {
    const parentMap = new Map<string, AssetClass>();
    const childrenMap = new Map<string, AssetClass[]>();

    for (const cls of assetClasses) {
      if (cls.parent_id) {
        const list = childrenMap.get(cls.parent_id) ?? [];
        list.push(cls);
        childrenMap.set(cls.parent_id, list);
      } else {
        parentMap.set(cls.id, cls);
      }
    }

    const analysisMap = new Map<string, ClassAllocationAnalysis>();

    for (const cls of assetClasses) {
      const isLeaf = !(childrenMap.get(cls.id)?.length);

      // Regra de Três da Meta Global:
      // Se for raiz, usa o próprio target (ex: 40%).
      // Se for subclasse, calcula a fatia que ela representa do bolo total (ex: 40% de 50% = 20%).
      let effectiveTargetPercentage = Number(cls.target_percentage);
      if (cls.parent_id) {
        const parent = assetClasses.find((p) => p.id === cls.parent_id);
        const parentTarget = parent ? Number(parent.target_percentage) : 100;
        effectiveTargetPercentage = (parentTarget / 100) * effectiveTargetPercentage;
      }

      // Soma o valor atual apenas dos ativos vinculados diretamente a esta classe
      let currentValue = 0;
      for (const holding of assetValues.values()) {
        if (holding.classId === cls.id) {
          currentValue += holding.totalValue;
        }
      }

      const currentPercentage =
        totalCurrentValue > 0 ? (currentValue / totalCurrentValue) * 100 : 0;

      const targetValue = (effectiveTargetPercentage / 100) * projectedTotalValue;
      const gapValue = targetValue - currentValue;

      analysisMap.set(cls.id, {
        id: cls.id,
        name: cls.name,
        parentId: cls.parent_id,
        isLeaf,
        targetPercentage: Number(cls.target_percentage),
        effectiveTargetPercentage,
        currentValue,
        currentPercentage,
        targetValue,
        gapValue,
        suggestedContribution: 0,
        projectedValue: currentValue,
        projectedPercentage: currentPercentage,
      });
    }

    return analysisMap;
  }

  // ---------------------------------------------------------------------------
  // Etapa 3: Distribuição do Montante do Aporte (Rebalanceamento Otimizado)
  // ---------------------------------------------------------------------------
  private distributeContributionToClasses(
    analysisMap: Map<string, ClassAllocationAnalysis>,
    contributionAmount: number
  ): void {
    // Apenas distribuímos dinheiro nas classes folhas (onde os ativos realmente moram)
    const leafNodes = Array.from(analysisMap.values()).filter((item) => item.isLeaf);
    if (!leafNodes.length) return;

    // Filtra quem está para trás do alvo ideal (gap > 0)
    const defasadas = leafNodes.filter((c) => c.gapValue > 0);
    const sumPositiveGap = defasadas.reduce((sum, c) => sum + c.gapValue, 0);

    if (sumPositiveGap > 0) {
      if (contributionAmount <= sumPositiveGap) {
        // O valor do aporte não é suficiente para zerar todas as defasagens:
        // Distribuímos proporcionalmente à defasagem de cada uma (as mais distantes recebem mais).
        for (const cls of defasadas) {
          const share = (cls.gapValue / sumPositiveGap) * contributionAmount;
          cls.suggestedContribution = share;
          cls.projectedValue = cls.currentValue + share;
        }
      } else {
        // O aporte é maior que a defasagem total acumulada:
        // 1. Zera a defasagem de todas as classes atrasadas
        for (const cls of defasadas) {
          cls.suggestedContribution = cls.gapValue;
          cls.projectedValue = cls.currentValue + cls.gapValue;
        }

        // 2. O excedente é distribuído proporcionalmente à meta original de todas as folhas
        const leftover = contributionAmount - sumPositiveGap;
        const totalEffectiveLeaves = leafNodes.reduce(
          (sum, c) => sum + c.effectiveTargetPercentage,
          0
        ) || 1;

        for (const cls of leafNodes) {
          const surplusShare =
            (cls.effectiveTargetPercentage / totalEffectiveLeaves) * leftover;
          cls.suggestedContribution += surplusShare;
          cls.projectedValue += surplusShare;
        }
      }
    } else {
      // Nenhuma classe está defasada (carteira perfeitamente balanceada ou zerada):
      // Distribui de acordo com a porcentagem alvo de cada folha
      const totalTarget = leafNodes.reduce((sum, c) => sum + c.effectiveTargetPercentage, 0) || 1;
      for (const cls of leafNodes) {
        const share = (cls.effectiveTargetPercentage / totalTarget) * contributionAmount;
        cls.suggestedContribution = share;
        cls.projectedValue = cls.currentValue + share;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Etapa 4: Consolidação dos Nós Pais na Árvore
  // ---------------------------------------------------------------------------
  private consolidateParentClasses(
    analysisMap: Map<string, ClassAllocationAnalysis>,
    assetClasses: AssetClass[],
    projectedTotalValue: number
  ): void {
    // Nós pais somam o valor de suas filhas para visualização consolidada
    const parents = assetClasses.filter((c) => !c.parent_id);

    for (const parent of parents) {
      const parentAnalysis = analysisMap.get(parent.id);
      if (!parentAnalysis || parentAnalysis.isLeaf) continue;

      const children = Array.from(analysisMap.values()).filter(
        (c) => c.parentId === parent.id
      );

      parentAnalysis.currentValue = children.reduce((s, c) => s + c.currentValue, 0);
      parentAnalysis.suggestedContribution = children.reduce(
        (s, c) => s + c.suggestedContribution,
        0
      );
      parentAnalysis.projectedValue = children.reduce((s, c) => s + c.projectedValue, 0);
      parentAnalysis.currentPercentage =
        projectedTotalValue > 0
          ? (parentAnalysis.currentValue / (projectedTotalValue - parentAnalysis.suggestedContribution)) * 100
          : 0;
      parentAnalysis.projectedPercentage =
        projectedTotalValue > 0
          ? (parentAnalysis.projectedValue / projectedTotalValue) * 100
          : 0;
    }

    // Calcula as porcentagens projetadas finais de cada nó
    for (const analysis of analysisMap.values()) {
      analysis.projectedPercentage =
        projectedTotalValue > 0
          ? (analysis.projectedValue / projectedTotalValue) * 100
          : 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Etapa 5: Seleção de Ativos a Comprar
  // ---------------------------------------------------------------------------
  private generateAssetPurchases(
    analysisMap: Map<string, ClassAllocationAnalysis>,
    assets: Asset[],
    assetValues: Map<string, { quantity: number; currentPrice: number; totalValue: number; classId: string }>
  ): { suggestions: AssetPurchaseSuggestion[]; unallocatedAmount: number } {
    const suggestions: AssetPurchaseSuggestion[] = [];
    let totalResidual = 0;

    // Para cada classe folha que recebeu verba de aporte
    for (const cls of analysisMap.values()) {
      if (!cls.isLeaf || cls.suggestedContribution <= 0) continue;

      const classAssets = assets.filter((a) => a.asset_class_id === cls.id);
      if (!classAssets.length) {
        // Se a classe não tem ativos cadastrados ainda, o valor fica como sobra
        totalResidual += cls.suggestedContribution;
        continue;
      }

      // Distribuição uniforme do aporte da classe entre seus ativos, priorizando os menores saldos
      const classBudget = cls.suggestedContribution;
      const budgetPerAsset = classBudget / classAssets.length;

      for (const asset of classAssets) {
        const holding = assetValues.get(asset.id) ?? {
          quantity: 0,
          currentPrice: asset.current_price,
          totalValue: 0,
          classId: cls.id,
        };

        const price = asset.current_price > 0 ? asset.current_price : 1;
        // Cotas inteiras para ativos tradicionais
        const suggestedQty = Math.floor(budgetPerAsset / price);
        const suggestedTotal = suggestedQty * price;
        const residual = budgetPerAsset - suggestedTotal;

        totalResidual += residual;

        suggestions.push({
          assetId: asset.id,
          ticker: asset.ticker,
          classId: cls.id,
          className: cls.name,
          currentPrice: asset.current_price,
          currentQuantity: holding.quantity,
          currentTotal: holding.totalValue,
          targetProportionInClass: (1 / classAssets.length) * 100,
          suggestedQuantity: suggestedQty,
          suggestedTotal,
          gapValue: cls.gapValue,
        });
      }
    }

    return {
      suggestions: suggestions.filter((s) => s.suggestedQuantity > 0 || s.currentPrice === 0),
      unallocatedAmount: Math.round(totalResidual * 100) / 100,
    };
  }

  private createEmptyResult(contributionAmount: number): AporteRecommendationResult {
    return {
      totalCurrentValue: 0,
      contributionAmount,
      projectedTotalValue: 0,
      unallocatedAmount: 0,
      classAllocations: [],
      suggestions: [],
    };
  }
}
