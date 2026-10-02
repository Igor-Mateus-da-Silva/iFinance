-- ==============================================================================
-- iFinance Capital - Criação / Correção do Usuário de Testes (Plano DEMO)
-- Credenciais: teste@teste.com / teste123
-- ==============================================================================

-- 1. Se o usuário foi inserido manualmente e gerou erro de scan (Database error querying schema),
-- preenchemos todos os campos de texto internos do GoTrue com string vazia:
UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone = COALESCE(phone, NULL),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    is_super_admin = COALESCE(is_super_admin, false),
    is_sso_user = COALESCE(is_sso_user, false)
WHERE email = 'teste@teste.com';

-- 2. Garante a flag de plano DEMO em user_profiles:
INSERT INTO public.user_profiles (user_id, plan_type)
SELECT id, 'DEMO'
FROM auth.users
WHERE email = 'teste@teste.com'
ON CONFLICT (user_id) DO UPDATE SET plan_type = 'DEMO', updated_at = now();
