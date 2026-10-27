-- ==============================================================================
-- ASSISTSOCIAL - MIGRAÇÃO 08: INDICADOR DE PRIMEIRO ACESSO E SEGURANÇA DE SENHA
-- Fluxo Oficial Seguro: Troca via Supabase Auth SDK + Confirmação RPC
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

-- 4. RPC AUTENTICADA: MARK FIRST PASSWORD CHANGED
-- Fluxo Oficial e Seguro: O usuário altera a senha via client.auth.updateUser({ password })
-- e em seguida invoca esta RPC autenticada para atestar a conclusão e desativar must_change_password.
-- Não manipula strings de senha em SQL nem altera auth.users diretamente.
CREATE OR REPLACE FUNCTION public.mark_first_password_changed()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- 1. Validação estrita de autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: Usuário não autenticado.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Habilita flag transacional para permitir a atualização pelo trigger
  PERFORM set_config('assistsocial.in_password_change_rpc', 'true', true);

  -- 3. Atualiza o perfil institucional do chamador
  UPDATE public.profiles
  SET must_change_password = false,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_user_id;

  -- 4. Registro forense de auditoria (sem expor credenciais)
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
    'message', 'Indicador de troca de senha desativado com sucesso. Acesso completo liberado.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Permissões de Execução
REVOKE ALL ON FUNCTION public.mark_first_password_changed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_first_password_changed() TO authenticated;
