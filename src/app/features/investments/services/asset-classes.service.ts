import { Injectable, inject } from '@angular/core';
import { AssetClass } from '../../../core/models/database.types';
import { SupabaseService } from '../../../core/services/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AssetClassesService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Busca todas as classes de ativos do usuário logado
   */
  async getClasses(): Promise<AssetClass[]> {
    const { data, error } = await this.supabase.client
      .from('asset_classes')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map((item) => ({
      ...item,
      target_percentage: Number(item.target_percentage) || 0,
    }));
  }

  /**
   * Cria uma nova classe (Raiz ou Subclasse)
   */
  async createClass(payload: {
    name: string;
    parent_id: string | null;
    target_percentage: number;
  }): Promise<AssetClass> {
    const user = this.supabase.currentUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const { data, error } = await this.supabase.client
      .from('asset_classes')
      .insert({
        user_id: user.id,
        name: payload.name.trim(),
        parent_id: payload.parent_id || null,
        target_percentage: payload.target_percentage || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      target_percentage: Number(data.target_percentage) || 0,
    };
  }

  /**
   * Atualiza dados de uma classe existente
   */
  async updateClass(
    id: string,
    payload: { name?: string; target_percentage?: number; parent_id?: string | null }
  ): Promise<void> {
    const updateData: any = {};
    if (payload.name !== undefined) updateData.name = payload.name.trim();
    if (payload.target_percentage !== undefined) updateData.target_percentage = payload.target_percentage;
    if (payload.parent_id !== undefined) updateData.parent_id = payload.parent_id;

    const { error } = await this.supabase.client
      .from('asset_classes')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Atualização em lote de porcentagens alvo
   */
  async batchUpdatePercentages(
    items: { id: string; target_percentage: number }[]
  ): Promise<void> {
    const promises = items.map((item) =>
      this.supabase.client
        .from('asset_classes')
        .update({ target_percentage: item.target_percentage })
        .eq('id', item.id)
    );

    const results = await Promise.all(promises);
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) throw firstError;
  }

  /**
   * Remove uma classe (e suas subclasses via CASCADE no banco)
   */
  async deleteClass(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('asset_classes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
