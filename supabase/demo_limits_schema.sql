-- ==============================================================================
-- iFinance Capital - Controle de Limites (Plano Demo)
-- Criação de user_profiles, ai_usage_logs, triggers e rotina de enforcement
-- ==============================================================================

-- 1. Tabela: user_profiles (Perfil e Plano do Usuário)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL DEFAULT 'PRO' CHECK (plan_type IN ('PRO', 'DEMO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para user_profiles
DROP POLICY IF EXISTS "Usuários podem visualizar seu próprio perfil" ON public.user_profiles;
CREATE POLICY "Usuários podem visualizar seu próprio perfil"
    ON public.user_profiles FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.user_profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
    ON public.user_profiles FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Tabela: ai_usage_logs (Auditoria e Controle de Cota Diária de IA)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'chat',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_date ON public.ai_usage_logs(user_id, created_at);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar seus próprios logs de IA" ON public.ai_usage_logs;
CREATE POLICY "Usuários podem visualizar seus próprios logs de IA"
    ON public.ai_usage_logs FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem inserir seus próprios logs de IA" ON public.ai_usage_logs;
CREATE POLICY "Usuários podem inserir seus próprios logs de IA"
    ON public.ai_usage_logs FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. Trigger para auto-provisionamento de perfil 'PRO' para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, plan_type)
    VALUES (NEW.id, 'PRO')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 4. Função Central de Limites do Plano DEMO
CREATE OR REPLACE FUNCTION public.enforce_demo_limits()
RETURNS TRIGGER AS $$
DECLARE
    v_plan TEXT;
    v_count INT;
BEGIN
    -- Busca o tipo de plano do usuário (se não houver registro, assume 'PRO' para não travar contas)
    SELECT plan_type INTO v_plan
    FROM public.user_profiles
    WHERE user_id = NEW.user_id;

    -- Salvaguarda: se não houver perfil ainda, verifica se é o usuário teste@teste.com
    IF v_plan IS NULL THEN
        IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id AND email = 'teste@teste.com') THEN
            v_plan := 'DEMO';
        END IF;
    END IF;

    -- Se o plano não for DEMO, permite a inserção normalmente
    IF v_plan IS NULL OR v_plan <> 'DEMO' THEN
        RETURN NEW;
    END IF;

    -- 4.1 Limite em financial_accounts: Máximo de 5 contas
    IF TG_TABLE_NAME = 'financial_accounts' THEN
        SELECT count(*) INTO v_count
        FROM public.financial_accounts
        WHERE user_id = NEW.user_id;

        IF v_count >= 5 THEN
            RAISE EXCEPTION 'Limite do plano de demonstração atingido' USING ERRCODE = 'P0001';
        END IF;

    -- 4.2 Limite em transactions: Máximo de 5 transações por mês
    ELSIF TG_TABLE_NAME = 'transactions' THEN
        SELECT count(*) INTO v_count
        FROM public.transactions
        WHERE user_id = NEW.user_id
          AND date_trunc('month', date::date) = date_trunc('month', NEW.date::date);

        IF v_count >= 5 THEN
            RAISE EXCEPTION 'Limite do plano de demonstração atingido' USING ERRCODE = 'P0001';
        END IF;

    -- 4.3 Limite em asset_classes: Máximo de 5 classes de ativos
    ELSIF TG_TABLE_NAME = 'asset_classes' THEN
        SELECT count(*) INTO v_count
        FROM public.asset_classes
        WHERE user_id = NEW.user_id;

        IF v_count >= 5 THEN
            RAISE EXCEPTION 'Limite do plano de demonstração atingido' USING ERRCODE = 'P0001';
        END IF;

    -- 4.4 Limite em assets: Máximo de 5 ativos cadastrados na carteira
    ELSIF TG_TABLE_NAME = 'assets' THEN
        SELECT count(*) INTO v_count
        FROM public.assets
        WHERE user_id = NEW.user_id;

        IF v_count >= 5 THEN
            RAISE EXCEPTION 'Limite do plano de demonstração atingido' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Aplicação das Triggers BEFORE INSERT
DROP TRIGGER IF EXISTS tr_enforce_demo_limits_financial_accounts ON public.financial_accounts;
CREATE TRIGGER tr_enforce_demo_limits_financial_accounts
    BEFORE INSERT ON public.financial_accounts
    FOR EACH ROW EXECUTE FUNCTION public.enforce_demo_limits();

DROP TRIGGER IF EXISTS tr_enforce_demo_limits_transactions ON public.transactions;
CREATE TRIGGER tr_enforce_demo_limits_transactions
    BEFORE INSERT ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.enforce_demo_limits();

DROP TRIGGER IF EXISTS tr_enforce_demo_limits_asset_classes ON public.asset_classes;
CREATE TRIGGER tr_enforce_demo_limits_asset_classes
    BEFORE INSERT ON public.asset_classes
    FOR EACH ROW EXECUTE FUNCTION public.enforce_demo_limits();

DROP TRIGGER IF EXISTS tr_enforce_demo_limits_assets ON public.assets;
CREATE TRIGGER tr_enforce_demo_limits_assets
    BEFORE INSERT ON public.assets
    FOR EACH ROW EXECUTE FUNCTION public.enforce_demo_limits();
