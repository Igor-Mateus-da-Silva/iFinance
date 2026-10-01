-- ==============================================================================
-- iFinance Capital - Fase 2: Módulo de Controle Financeiro
-- Scripts DDL para Supabase (PostgreSQL) com Row Level Security (RLS)
-- ==============================================================================

-- Garante que a função utilitária de timestamp existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. Tabela: financial_accounts (Contas Bancárias / Carteiras)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_user_id ON public.financial_accounts(user_id);
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam suas próprias contas financeiras"
    ON public.financial_accounts FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER tr_financial_accounts_updated_at
    BEFORE UPDATE ON public.financial_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 2. Tabela: credit_cards (Cartões de Crédito)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    closing_day INT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
    due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON public.credit_cards(user_id);
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seus próprios cartões de crédito"
    ON public.credit_cards FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER tr_credit_cards_updated_at
    BEFORE UPDATE ON public.credit_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 3. Tabela: budget_groups (Grupos de Orçamento - Ex: 50/30/20)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budget_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (target_percentage >= 0 AND target_percentage <= 100),
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_budget_groups_user_id ON public.budget_groups(user_id);
ALTER TABLE public.budget_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seus próprios grupos de orçamento"
    ON public.budget_groups FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER tr_budget_groups_updated_at
    BEFORE UPDATE ON public.budget_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. Tabela: categories (Categorias de Receitas e Despesas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    budget_group_id UUID REFERENCES public.budget_groups(id) ON DELETE SET NULL,
    color_or_icon TEXT DEFAULT '#10b981',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_budget_group_id ON public.categories(budget_group_id);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam suas próprias categorias"
    ON public.categories FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER tr_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 5. Tabela: transactions (Transações Diárias, Fixas e Parceladas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL, -- Opcional para receitas
    payment_method TEXT NOT NULL DEFAULT 'PIX' CHECK (payment_method IN ('PIX', 'DINHEIRO', 'CREDITO', 'DEBITO', 'VALE')),
    is_paid BOOLEAN NOT NULL DEFAULT true,
    is_fixed BOOLEAN NOT NULL DEFAULT false,
    fixed_group_id UUID,
    current_installment INT NOT NULL DEFAULT 1 CHECK (current_installment BETWEEN 1 AND 120),
    total_installments INT NOT NULL DEFAULT 1 CHECK (total_installments BETWEEN 1 AND 120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_credit_card_id ON public.transactions(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_fixed_group_id ON public.transactions(fixed_group_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam suas próprias transações"
    ON public.transactions FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER tr_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 6. Reforço de Segurança & Operações Atômicas (Hardening)
-- ------------------------------------------------------------------------------

-- Função atômica para debitar/creditar saldo em conta com trava ACID (anti-race condition)
CREATE OR REPLACE FUNCTION public.adjust_account_balance(
    p_account_id UUID,
    p_delta NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    v_new_balance NUMERIC;
BEGIN
    UPDATE public.financial_accounts
    SET balance = balance + p_delta
    WHERE id = p_account_id AND user_id = auth.uid()
    RETURNING balance INTO v_new_balance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta inexistente ou não autorizada para este usuário.';
    END IF;

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger anti-IDOR: garante que conta, cartão e categoria pertençam ao mesmo usuário
CREATE OR REPLACE FUNCTION public.validate_transaction_ownership()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.account_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.financial_accounts 
            WHERE id = NEW.account_id AND user_id = NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Acesso negado: a conta financeira informada não pertence ao usuário.';
        END IF;
    END IF;

    IF NEW.credit_card_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.credit_cards 
            WHERE id = NEW.credit_card_id AND user_id = NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Acesso negado: o cartão de crédito informado não pertence ao usuário.';
        END IF;
    END IF;

    IF NEW.category_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.categories 
            WHERE id = NEW.category_id AND user_id = NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Acesso negado: a categoria informada não pertence ao usuário.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_validate_transaction_ownership ON public.transactions;

CREATE TRIGGER tr_validate_transaction_ownership
    BEFORE INSERT OR UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_ownership();

