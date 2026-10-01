import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AssetClass } from '../../../core/models/database.types';

export interface PortfolioHolding {
  portfolioId: string;
  assetId: string;
  ticker: string;
  currentPrice: number;
  quantity: number;
  averagePrice: number;
  totalValue: number;
  assetClassId: string;
  assetClassName: string;
  parentClassId: string | null;
  parentClassName: string | null;
  targetPercentage: number;
}

export interface CreateAssetHoldingPayload {
  ticker: string;
  asset_class_id: string;
  current_price: number;
  quantity: number;
  average_price?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Busca todas as posições da carteira unificadas com os ativos e suas classes
   */
  async getHoldings(): Promise<PortfolioHolding[]> {
    // 1. Busca ativos do usuário
    const { data: assets, error: assetsError } = await this.supabase.client
      .from('assets')
      .select('id, ticker, current_price, asset_class_id, created_at')
      .order('ticker', { ascending: true });

    if (assetsError) throw assetsError;
    if (!assets || assets.length === 0) return [];

    // 2. Busca registros de carteira
    const { data: portfolioItems, error: portfolioError } = await this.supabase.client
      .from('portfolio')
      .select('id, asset_id, quantity, average_price');

    if (portfolioError) throw portfolioError;

    // 3. Busca classes para mapear nomes e hierarquia
    const { data: classes, error: classesError } = await this.supabase.client
      .from('asset_classes')
      .select('id, user_id, name, parent_id, target_percentage');

    if (classesError) throw classesError;

    const classMap = new Map<string, AssetClass>((classes || []).map((c: any) => [c.id, c as AssetClass]));
    const portfolioMap = new Map<string, any>((portfolioItems || []).map((p) => [p.asset_id, p]));

    // 4. Monta os holdings consolidados
    return assets.map((asset) => {
      const pItem = portfolioMap.get(asset.id);
      const assetClass = classMap.get(asset.asset_class_id);
      const parentClass = assetClass?.parent_id ? classMap.get(assetClass.parent_id) : null;

      const currentPrice = Number(asset.current_price) || 0;
      const quantity = Number(pItem?.quantity) || 0;
      const averagePrice = Number(pItem?.average_price) || currentPrice;
      const totalValue = currentPrice * quantity;

      return {
        portfolioId: pItem?.id || '',
        assetId: asset.id,
        ticker: asset.ticker.toUpperCase(),
        currentPrice,
        quantity,
        averagePrice,
        totalValue,
        assetClassId: asset.asset_class_id,
        assetClassName: assetClass?.name || 'Sem Classe',
        parentClassId: assetClass?.parent_id || null,
        parentClassName: parentClass?.name || null,
        targetPercentage: Number(assetClass?.target_percentage) || 0,
      };
    });
  }

  /**
   * Cadastra o ativo em assets e vincula na tabela portfolio
   */
  async createAssetWithHolding(payload: CreateAssetHoldingPayload): Promise<void> {
    const user = this.supabase.currentUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const cleanTicker = payload.ticker.trim().toUpperCase();
    const currentPrice = Number(payload.current_price) || 0;
    const quantity = Number(payload.quantity) || 0;
    const averagePrice = payload.average_price !== undefined ? Number(payload.average_price) : currentPrice;

    // 1. Insere ou recupera o ativo na tabela assets
    const { data: asset, error: assetError } = await this.supabase.client
      .from('assets')
      .insert({
        user_id: user.id,
        ticker: cleanTicker,
        current_price: currentPrice,
        asset_class_id: payload.asset_class_id,
      })
      .select('id')
      .single();

    if (assetError) throw assetError;

    // 2. Insere a custódia na tabela portfolio
    const { error: portfolioError } = await this.supabase.client
      .from('portfolio')
      .insert({
        user_id: user.id,
        asset_id: asset.id,
        quantity,
        average_price: averagePrice,
      });

    if (portfolioError) throw portfolioError;
  }

  /**
   * Atualização rápida inline de cotação e quantidade
   */
  async updateQuickValues(
    assetId: string,
    portfolioId: string,
    currentPrice: number,
    quantity: number
  ): Promise<void> {
    const user = this.supabase.currentUser();
    if (!user) throw new Error('Usuário não autenticado.');

    // Atualiza preço em assets
    const { error: assetError } = await this.supabase.client
      .from('assets')
      .update({ current_price: currentPrice })
      .eq('id', assetId);

    if (assetError) throw assetError;

    // Atualiza quantidade em portfolio se existir o registro
    if (portfolioId) {
      const { error: portfolioError } = await this.supabase.client
        .from('portfolio')
        .update({ quantity: quantity })
        .eq('id', portfolioId);

      if (portfolioError) throw portfolioError;
    } else {
      // Se não existia portfolio, cria
      const { error: insertError } = await this.supabase.client
        .from('portfolio')
        .insert({
          user_id: user.id,
          asset_id: assetId,
          quantity: quantity,
          average_price: currentPrice,
        });

      if (insertError) throw insertError;
    }
  }

  /**
   * Remove o ativo (cascata apagará a custódia no portfolio)
   */
  async deleteAsset(assetId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('assets')
      .delete()
      .eq('id', assetId);

    if (error) throw error;
  }
}
