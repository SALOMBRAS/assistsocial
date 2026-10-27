-- ==============================================================================
-- ASSISTSOCIAL - SEED DATA
-- Dados de demonstração e teste para desenvolvimento local
-- ==============================================================================

-- Observação: Como os perfis dependem de auth.users, em um ambiente real
-- os usuários são criados via Supabase Auth. Este seed contém estruturas de exemplo.

DO $$
DECLARE
  v_demo_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_colleague_id UUID := '00000000-0000-0000-0000-000000000002';
  v_folder_casos UUID;
  v_folder_familias UUID;
  v_activity_id UUID;
  v_document_id UUID;
BEGIN
  -- Criação condicional para testes locais se a tabela auth.users existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    
    -- Inserir usuários demo em auth.users se não existirem
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES 
      (v_demo_user_id, 'assistente@assistsocial.local', crypt('SenhaForte123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Assistente Social Ana Lima"}', now(), now()),
      (v_colleague_id, 'colega@assistsocial.local', crypt('SenhaForte123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Assistente Social Carlos Silva"}', now(), now())
    ON CONFLICT (id) DO NOTHING;

    -- Inserir / garantir profiles
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES 
      (v_demo_user_id, 'Assistente Social Ana Lima', 'assistente@assistsocial.local', 'social_worker'),
      (v_colleague_id, 'Assistente Social Carlos Silva', 'colega@assistsocial.local', 'social_worker')
    ON CONFLICT (id) DO NOTHING;

    -- Criar Pasta Raiz
    INSERT INTO public.folders (id, owner_id, name, parent_folder_id)
    VALUES (gen_random_uuid(), v_demo_user_id, 'Casos Complexos 2026', NULL)
    RETURNING id INTO v_folder_casos;

    -- Criar Subpasta
    INSERT INTO public.folders (id, owner_id, name, parent_folder_id)
    VALUES (gen_random_uuid(), v_demo_user_id, 'Família Santos e Silva', v_folder_casos)
    RETURNING id INTO v_folder_familias;

    -- Criar Atividades de Exemplo
    INSERT INTO public.activities (id, owner_id, title, description, starts_at, ends_at, category, status)
    VALUES 
      (gen_random_uuid(), v_demo_user_id, 'Visita Domiciliar - Bairro Nova Esperança', 'Avaliação da infraestrutura familiar e vulnerabilidade social.', now() + interval '1 day', now() + interval '1 day 2 hours', 'visita_domiciliar', 'pending'),
      (gen_random_uuid(), v_demo_user_id, 'Atendimento Individual - Maria Souza', 'Orientação sobre acesso a benefícios socioassistenciais.', now() + interval '2 days', now() + interval '2 days 1 hour', 'atendimento', 'pending'),
      (gen_random_uuid(), v_demo_user_id, 'Reunião de Rede com CRAS e CREAS', 'Alinhamento intersetorial de casos prioritários.', now() - interval '2 days', now() - interval '2 days' + interval '2 hours', 'reuniao', 'completed')
    RETURNING id INTO v_activity_id;

    -- Criar Documento de Exemplo
    INSERT INTO public.documents (id, owner_id, folder_id, original_name, display_name, storage_path, mime_type, file_size)
    VALUES (
      gen_random_uuid(),
      v_demo_user_id,
      v_folder_familias,
      'relatorio_visita_inicial.pdf',
      'Relatório de Visita Inicial - Caso 402',
      v_demo_user_id::text || '/docs/relatorio_visita_inicial.pdf',
      'application/pdf',
      245760
    )
    RETURNING id INTO v_document_id;

    -- Criar Compartilhamento de Exemplo para o Colega (Viewer)
    INSERT INTO public.resource_shares (owner_id, resource_type, resource_id, invited_user_id, permission, status)
    VALUES (
      v_demo_user_id,
      'document',
      v_document_id,
      v_colleague_id,
      'viewer',
      'accepted'
    )
    ON CONFLICT DO NOTHING;

  END IF;
END $$;
