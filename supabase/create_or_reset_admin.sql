-- ==============================================================================
-- ASSISTSOCIAL — CRIAÇÃO OU ATUALIZAÇÃO DIRETA DA CONTA ADMINISTRADORA GLOBAL
-- Executa no SQL Editor do Supabase Dashboard (como postgres / superusuário)
-- Alvo: Janaína Lima (janamendes055@gmail.com)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_target_email TEXT := 'janamendes055@gmail.com';
  v_raw_password TEXT := 'Chocolate@24';
  v_user_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  -- 1. Gera o hash seguro da senha usando blowfish crypt
  v_encrypted_pw := extensions.crypt(v_raw_password, extensions.gen_salt('bf'));

  -- 2. Verifica se a conta já existe em auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_target_email);

  IF v_user_id IS NULL THEN
    -- 3a. Cria o usuário diretamente em auth.users
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_target_email,
      v_encrypted_pw,
      timezone('utc'::text, now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Janaína Lima"}'::jsonb,
      timezone('utc'::text, now()),
      timezone('utc'::text, now()),
      '',
      '',
      '',
      '',
      false
    );

    -- 3b. Insere a identidade correspondente no auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_target_email),
      'email',
      v_target_email,
      timezone('utc'::text, now()),
      timezone('utc'::text, now()),
      timezone('utc'::text, now())
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Conta criada com sucesso em auth.users (UUID: %)', v_user_id;
  ELSE
    -- 3c. Atualiza a senha e confirma o e-mail da conta existente
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        email_confirmed_at = COALESCE(email_confirmed_at, timezone('utc'::text, now())),
        raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{full_name}', '"Janaína Lima"'::jsonb),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

    RAISE NOTICE 'Conta existente em auth.users atualizada com a nova senha (UUID: %)', v_user_id;
  END IF;

  -- 4. Promove o perfil em public.profiles para 'global_admin'
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (v_user_id, 'Janaína Lima', v_target_email, 'global_admin')
  ON CONFLICT (id) DO UPDATE
  SET role = 'global_admin',
      full_name = 'Janaína Lima',
      email = v_target_email,
      updated_at = timezone('utc'::text, now());

  -- 5. Trilha de auditoria
  PERFORM public.log_audit_event(
    v_user_id,
    'admin.bootstrap_completed',
    'profile',
    v_user_id,
    jsonb_build_object(
      'target_email', v_target_email,
      'role', 'global_admin',
      'full_name', 'Janaína Lima'
    )
  );

  RAISE NOTICE 'Administradora Janaína Lima configurada com sucesso com perfil global_admin!';
END $$;
