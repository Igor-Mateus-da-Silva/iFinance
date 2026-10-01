export interface AssetClass {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  target_percentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface Asset {
  id: string;
  user_id: string;
  ticker: string;
  current_price: number;
  asset_class_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface PortfolioItem {
  id: string;
  user_id: string;
  asset_id: string;
  quantity: number;
  average_price: number;
  created_at?: string;
  updated_at?: string;
}

export interface PortfolioItemDetail extends PortfolioItem {
  asset?: Asset;
  asset_class?: AssetClass;
}
