-- ==============================================================================
-- iFinance Capital - Script de Reforço de Cibersegurança (Security Hardening)
-- Execute este script no SQL Editor do Supabase para aplicar as melhorias
-- ==============================================================================

-- 1. PREVENÇÃO DE DoS: Limite rígido no número de parcelas (máx: 120 / 10 anos)
ALTER TABLE public.transactions 
    DROP CONSTRAINT IF EXISTS chk_transactions_total_installments,
    DROP CONSTRAINT IF EXISTS chk_transactions_current_installment;

ALTER TABLE public.transactions 
    ADD CONSTRAINT chk_transactions_total_installments CHECK (total_installments BETWEEN 1 AND 120),
    ADD CONSTRAINT chk_transactions_current_installment CHECK (current_installment BETWEEN 1 AND 120);

-- 2. OPERAÇÃO ATÔMICA & ANTI-RACE CONDITION: Ajuste seguro de saldo bancário
-- Substitui leituras e gravações concorrentes no cliente por operação ACID direta no banco.
CREATE OR REPLACE FUNCTION public.adjust_account_balance(
    p_account_id UUID,
    p_delta NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    v_new_balance NUMERIC;
BEGIN
    -- Atualiza e bloqueia a linha de forma atômica, validando propriedade (anti-IDOR)
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

-- 3. INTEGRIDADE REFERENCIAL & PREVENÇÃO DE IDOR (Insecure Direct Object Reference)
-- Garante que ninguém possa associar contas, cartões ou categorias de outro usuário.
CREATE OR REPLACE FUNCTION public.validate_transaction_ownership()
RETURNS TRIGGER AS $$
BEGIN
    -- Validação da Conta Bancária
    IF NEW.account_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.financial_accounts 
            WHERE id = NEW.account_id AND user_id = NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Acesso negado: a conta financeira informada não pertence ao usuário.';
        END IF;
    END IF;

    -- Validação do Cartão de Crédito
    IF NEW.credit_card_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.credit_cards 
            WHERE id = NEW.credit_card_id AND user_id = NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Acesso negado: o cartão de crédito informado não pertence ao usuário.';
        END IF;
    END IF;

    -- Validação da Categoria
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
