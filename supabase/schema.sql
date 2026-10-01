-- ==============================================================================
-- iFinance Capital - Database Schema
-- Supabase (PostgreSQL) com Row Level Security (RLS)
-- ==============================================================================

-- 1. Habilitar extensão de UUID se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função utilitária para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. Tabela: asset_classes (Classes e Subclasses de Ativos)
-- Ex: Renda Fixa, Ações -> Brasileiras, Internacionais
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.asset_classes(id) ON DELETE CASCADE,
    target_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (target_percentage >= 0 AND target_percentage <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_asset_classes_user_id ON public.asset_classes(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_classes_parent_id ON public.asset_classes(parent_id);

-- RLS: Isolamento estrito por usuário
ALTER TABLE public.asset_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam suas próprias classes de ativos"
    ON public.asset_classes
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER tr_asset_classes_updated_at
    BEFORE UPDATE ON public.asset_classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 3. Tabela: assets (Cadastro de Ativos e Cotações)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    current_price NUMERIC(15, 4) NOT NULL DEFAULT 0.00 CHECK (current_price >= 0),
    asset_class_id UUID NOT NULL REFERENCES public.asset_classes(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_assets_user_ticker UNIQUE (user_id, ticker)
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_asset_class_id ON public.assets(asset_class_id);

-- RLS: Isolamento estrito por usuário
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seus próprios ativos"
    ON public.assets
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER tr_assets_updated_at
    BEFORE UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. Tabela: portfolio (Custódia do Usuário / Posições Atuais)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    quantity NUMERIC(15, 6) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    average_price NUMERIC(15, 4) NOT NULL DEFAULT 0.00 CHECK (average_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_portfolio_user_asset UNIQUE (user_id, asset_id)
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON public.portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_asset_id ON public.portfolio(asset_id);

-- RLS: Isolamento estrito por usuário
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seus próprios registros de carteira"
    ON public.portfolio
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER tr_portfolio_updated_at
    BEFORE UPDATE ON public.portfolio
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
