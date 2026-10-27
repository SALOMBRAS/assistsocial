-- ==============================================================================
-- ASSISTSOCIAL — BOOTSTRAP CONTROLADO DA ADMINISTRADORA GLOBAL
-- Executa a verificação e promoção de forma segura, transacional e sem expor senhas.
-- Alvo indicado: Janaína Lima (janamendes055@gmail.com)
--
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Este script deve ser executado no SQL Editor do Supabase Dashboard após a
--    criação e confirmação da conta de e-mail indicada.
-- 2. Ele valida a existência da conta em auth.users, verifica se o e-mail está
--    confirmado e se não há conflito com outra administradora existente.
-- ==============================================================================

DO $$
DECLARE
  v_target_email TEXT := 'janamendes055@gmail.com';
  v_user_id UUID;
  v_email_confirmed TIMESTAMPTZ;
  v_existing_admin_id UUID;
  v_existing_admin_email TEXT;
BEGIN
  RAISE NOTICE '=== INICIANDO VERIFICAÇÃO DE BOOTSTRAP ADMINISTRATIVO ===';

  -- 1. Verifica se já existe uma administradora global no sistema
  SELECT id INTO v_existing_admin_id 
  FROM public.profiles 
  WHERE role = 'global_admin' 
  LIMIT 1;

  IF v_existing_admin_id IS NOT NULL THEN
    SELECT email INTO v_existing_admin_email FROM auth.users WHERE id = v_existing_admin_id;
    IF lower(COALESCE(v_existing_admin_email, '')) = lower(v_target_email) THEN
      RAISE NOTICE 'A conta indicada (%) já possui o papel global_admin ativo no sistema (UUID: %). Nenhuma ação necessária.',
        v_target_email, v_existing_admin_id;
      RETURN;
    ELSE
      RAISE EXCEPTION 'CONFLITO: Já existe outra administradora global cadastrada no sistema (UUID: %, E-mail: %). A promoção de % foi bloqueada.',
        v_existing_admin_id, COALESCE(v_existing_admin_email, 'desconhecido'), v_target_email;
    END IF;
  END IF;

  -- 2. Verifica a existência da conta em auth.users
  SELECT id, email_confirmed_at INTO v_user_id, v_email_confirmed
  FROM auth.users
  WHERE lower(email) = lower(v_target_email);

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'CONTA NÃO ENCONTRADA: O e-mail % ainda não existe em auth.users. A conta deve ser criada no Supabase Auth antes de executar o bootstrap.', v_target_email;
  END IF;

  -- 3. Verifica se o e-mail foi devidamente confirmado
  IF v_email_confirmed IS NULL THEN
    RAISE EXCEPTION 'E-MAIL NÃO CONFIRMADO: A conta % foi localizada (UUID: %), mas o e-mail ainda não foi confirmado. Confirme o e-mail no painel do Supabase antes do bootstrap.', v_target_email, v_user_id;
  END IF;

  -- 4. Promove o perfil para global_admin associando estritamente ao UUID verificado
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (v_user_id, 'Janaína Lima', v_target_email, 'global_admin')
  ON CONFLICT (id) DO UPDATE
  SET role = 'global_admin',
      full_name = CASE WHEN public.profiles.full_name = '' THEN 'Janaína Lima' ELSE public.profiles.full_name END,
      updated_at = timezone('utc'::text, now());

  -- 5. Registro forense na trilha de auditoria
  PERFORM public.log_audit_event(
    v_user_id,
    'admin.bootstrap_completed',
    'profile',
    v_user_id,
    jsonb_build_object(
      'target_email', v_target_email,
      'assigned_role', 'global_admin',
      'verified_at', now()
    )
  );

  RAISE NOTICE '=== BOOTSTRAP CONCLUÍDO COM SUCESSO ===';
  RAISE NOTICE 'A conta % (UUID: %) agora é a Administradora Global oficial do AssistSocial.', v_target_email, v_user_id;
END $$;
