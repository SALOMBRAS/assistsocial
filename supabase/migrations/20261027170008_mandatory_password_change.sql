-- ==============================================================================
-- ASSISTSOCIAL - MIGRATION 08: MANDATORY FIRST ACCESS PASSWORD CHANGE & SECURITY
-- ==============================================================================

-- 1. ADICIONA COLUNA must_change_password À TABELA public.profiles
-- Compatível com registros existentes (default false para usuários atuais)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Índice para consultas de perfis com troca pendente
CREATE INDEX IF NOT EXISTS idx_profiles_must_change_password
  ON public.profiles (must_change_password)
  WHERE must_change_password = true;

-- 2. ATUALIZA A TRIGGER DE NOVO USUÁRIO (handle_new_user)
-- Lê a flag must_change_password dos metadados do Supabase Auth se fornecida
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_must_change BOOLEAN := false;
BEGIN
  IF NEW.raw_user_meta_data->>'must_change_password' = 'true' THEN
    v_must_change := true;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, role, must_change_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    'social_worker',
    v_must_change
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      must_change_password = CASE 
        WHEN EXCLUDED.must_change_password THEN true 
        ELSE public.profiles.must_change_password 
      END,
      updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 3. TRIGGER DE BLINDAGEM: PREVENÇÃO CONTRA ADULTERAÇÃO DE PAPEL E DO INDICADOR DE SENHA
-- Garante que um usuário comum não possa se autopromover nem desativar must_change_password diretamente via UPDATE
CREATE OR REPLACE FUNCTION public.prevent_profile_tampering()
RETURNS TRIGGER AS $$
BEGIN
  -- A. Proteção do campo 'role' (apenas global_admin ou service_role pode alterar)
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF auth.role() = 'authenticated' THEN
      IF NOT public.is_global_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Violação de segurança: Usuário não tem permissão para alterar o papel (privilégio insuficiente).'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  -- B. Proteção do campo 'must_change_password'
  -- Um usuário autenticado comum NÃO pode desativar seu próprio indicador de troca de senha via UPDATE comum
  IF OLD.must_change_password IS DISTINCT FROM NEW.must_change_password THEN
    IF auth.role() = 'authenticated' AND NOT public.is_global_admin(auth.uid()) THEN
      -- Se não for global_admin, somente permite se o contexto da transação marcar 'assistsocial.in_password_change_rpc'
      IF NULLIF(current_setting('assistsocial.in_password_change_rpc', true), '') IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Violação de segurança: O indicador de troca obrigatória de senha só pode ser alterado pelo fluxo autorizado no servidor.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
DROP TRIGGER IF EXISTS trg_prevent_profile_tampering ON public.profiles;

CREATE TRIGGER trg_prevent_profile_tampering
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_tampering();

-- 4. RPC AUTENTICADA: COMPLETE FIRST PASSWORD CHANGE
-- Altera a senha no auth.users via hash criptográfico seguro (bcrypt) e desativa must_change_password
CREATE OR REPLACE FUNCTION public.complete_first_password_change(p_new_password TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- 1. Verifica autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado para alterar a senha.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Valida critérios de força da nova senha
  IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
    RAISE EXCEPTION 'A nova senha deve possuir no mínimo 8 caracteres.'
      USING ERRCODE = '22023';
  END IF;

  -- 3. Sinaliza contexto seguro para o trigger
  PERFORM set_config('assistsocial.in_password_change_rpc', 'true', true);

  -- 4. Atualiza a senha no Supabase Auth usando bcrypt (gen_salt('bf'))
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = timezone('utc'::text, now())
  WHERE id = v_user_id;

  -- 5. Atualiza o perfil desmarcando a exigência
  UPDATE public.profiles
  SET must_change_password = false,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_user_id;

  -- 6. Registra auditoria forense sem credenciais
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, details)
  VALUES (
    v_user_id,
    'auth.password_changed_first_access',
    'profile',
    v_user_id,
    jsonb_build_object(
      'timestamp', timezone('utc'::text, now()),
      'mechanism', 'rpc.complete_first_password_change'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Senha alterada com sucesso! Acesso completo liberado.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions, pg_temp;

-- 5. RPC AUTENTICADA COMPLEMENTAR: MARK FIRST PASSWORD CHANGED
-- Para quando o frontend efetua o update via client.auth.updateUser({ password })
CREATE OR REPLACE FUNCTION public.mark_first_password_changed()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: Usuário não autenticado.'
      USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('assistsocial.in_password_change_rpc', 'true', true);

  UPDATE public.profiles
  SET must_change_password = false,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_user_id;

  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, details)
  VALUES (
    v_user_id,
    'auth.password_changed_first_access',
    'profile',
    v_user_id,
    jsonb_build_object(
      'timestamp', timezone('utc'::text, now()),
      'mechanism', 'rpc.mark_first_password_changed'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Indicador de troca de senha desativado com sucesso.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Permissões de Execução
REVOKE ALL ON FUNCTION public.complete_first_password_change(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_first_password_change(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_first_password_changed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_first_password_changed() TO authenticated;
