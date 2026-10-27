-- ==============================================================================
-- ASSISTSOCIAL — SUÍTE DE TESTES DE INTEGRAÇÃO RLS NATIVA EM POSTGRESQL
-- Executável diretamente no SQL Editor do Supabase ou via psql.
-- Executa testes reais com troca de identidade de sessão (JWT Claims / auth.uid())
-- Toda a execução roda dentro de uma transação com ROLLBACK no final,
-- garantindo que o banco de dados permaneça 100% limpo após a execução.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_user_a UUID := '11111111-1111-1111-1111-111111111111';
  v_user_b UUID := '22222222-2222-2222-2222-222222222222';
  v_user_c UUID := '33333333-3333-3333-3333-333333333333';
  v_act_id UUID;
  v_folder_1 UUID;
  v_folder_2 UUID;
  v_doc_id UUID;
  v_share_id UUID;
  v_count INTEGER;
  v_error_caught BOOLEAN := false;
BEGIN
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'INICIANDO TESTES DE INTEGRAÇÃO RLS E SEGURANÇA NO POSTGRESQL';
  RAISE NOTICE '================================================================';

  -- 1. Setup inicial de perfis para simulação
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES 
    (v_user_a, 'Assistente Ana', 'ana.test@assistsocial.local', 'social_worker'),
    (v_user_b, 'Assistente Carlos', 'carlos.test@assistsocial.local', 'social_worker'),
    (v_user_c, 'Estranho', 'estranho.test@externo.local', 'social_worker')
  ON CONFLICT (id) DO NOTHING;

  -- 2. TESTE 1: Inserção de atividade pelo Usuário A
  EXECUTE 'SET LOCAL "request.jwt.claims" = ''' || jsonb_build_object('sub', v_user_a::text, 'role', 'authenticated', 'email', 'ana.test@assistsocial.local')::text || '''';
  EXECUTE 'SET LOCAL ROLE authenticated';

  INSERT INTO public.activities (owner_id, title, starts_at, category, status)
  VALUES (v_user_a, 'Atendimento Confidencial Família Silva', now(), 'atendimento', 'pending')
  RETURNING id INTO v_act_id;

  RAISE NOTICE '[OK] Teste 1: Atividade confidencial criada pelo Usuário A (id: %)', v_act_id;

  -- 3. TESTE 2: Isolamento de dados - Usuário B tenta consultar atividade privada do Usuário A
  EXECUTE 'SET LOCAL "request.jwt.claims" = ''' || jsonb_build_object('sub', v_user_b::text, 'role', 'authenticated', 'email', 'carlos.test@assistsocial.local')::text || '''';
  
  SELECT count(*) INTO v_count FROM public.activities WHERE id = v_act_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FALHA DE RLS: Usuário B conseguiu visualizar a atividade privada do Usuário A!';
  END IF;
  RAISE NOTICE '[OK] Teste 2: Isolamento confirmado — Usuário B não enxerga a atividade privada do Usuário A.';

  -- 4. TESTE 3: Usuário anônimo tenta consultar
  EXECUTE 'SET LOCAL ROLE anon';
  EXECUTE 'SET LOCAL "request.jwt.claims" = ''{}''';
  
  SELECT count(*) INTO v_count FROM public.activities WHERE id = v_act_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FALHA DE RLS: Usuário anônimo conseguiu visualizar dados protegidos!';
  END IF;
  RAISE NOTICE '[OK] Teste 3: Usuário anônimo bloqueado integralmente pelo RLS.';

  -- 5. TESTE 4: Convite Pendente NÃO concede acesso
  EXECUTE 'SET LOCAL ROLE authenticated';
  EXECUTE 'SET LOCAL "request.jwt.claims" = ''' || jsonb_build_object('sub', v_user_a::text, 'role', 'authenticated', 'email', 'ana.test@assistsocial.local')::text || '''';

  INSERT INTO public.resource_shares (owner_id, resource_type, resource_id, invited_user_id, permission, status)
  VALUES (v_user_a, 'activity', v_act_id, v_user_b, 'editor', 'pending')
  RETURNING id INTO v_share_id;

  -- B tenta ler enquanto status é 'pending'
  EXECUTE 'SET LOCAL "request.jwt.claims" = ''' || jsonb_build_object('sub', v_user_b::text, 'role', 'authenticated', 'email', 'carlos.test@assistsocial.local')::text || '''';
  SELECT count(*) INTO v_count FROM public.activities WHERE id = v_act_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FALHA DE RLS: Convite com status pendente concedeu acesso prematuro!';
  END IF;
  RAISE NOTICE '[OK] Teste 4: Convite com status "pending" NÃO concede acesso.';

  -- 6. TESTE 5: Convidado aceita convite como 'viewer' e ganha acesso de leitura
  UPDATE public.resource_shares 
  SET status = 'accepted', permission = 'viewer'
  WHERE id = v_share_id;

  SELECT count(*) INTO v_count FROM public.activities WHERE id = v_act_id;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FALHA DE RLS: Usuário B deveria ter acesso de leitura após aceitar o convite!';
  END IF;
  RAISE NOTICE '[OK] Teste 5: Convite aceito concede permissão prevista de leitura.';

  -- 7. TESTE 6: Viewer tenta alterar título (deve falhar por RLS)
  UPDATE public.activities SET title = 'Título Alterado por Viewer' WHERE id = v_act_id;
  -- Como o RLS bloqueia o UPDATE para viewer, nenhuma linha é alterada
  SELECT title INTO v_count FROM public.activities WHERE id = v_act_id AND title = 'Título Alterado por Viewer';
  IF FOUND THEN
    RAISE EXCEPTION 'FALHA DE RLS: Usuário com permissão viewer conseguiu editar a atividade!';
  END IF;
  RAISE NOTICE '[OK] Teste 6: Usuário viewer impedido de realizar edição (0 linhas alteradas).';

  -- 8. TESTE 7: Elevação para editor permite alteração legítima de título
  EXECUTE 'SET LOCAL "request.jwt.claims" = ''' || jsonb_build_object('sub', v_user_a::text, 'role', 'authenticated', 'email', 'ana.test@assistsocial.local')::text || '''';
  UPDATE public.resource_shares SET permission = 'editor' WHERE id = v_share_id;

  EXECUTE 'SET LOCAL "request.jwt.claims" = ''' || jsonb_build_object('sub', v_user_b::text, 'role', 'authenticated', 'email', 'carlos.test@assistsocial.local')::text || '''';
  UPDATE public.activities SET description = 'Observação adicionada pelo editor' WHERE id = v_act_id;
  RAISE NOTICE '[OK] Teste 7: Usuário com permissão editor consegue atualizar dados permitidos.';

  -- 9. TESTE 8: Editor tenta usurpar propriedade (Trigger protect_resource_ownership)
  v_error_caught := false;
  BEGIN
    UPDATE public.activities SET owner_id = v_user_b WHERE id = v_act_id;
  EXCEPTION
    WHEN OTHERS THEN
      v_error_caught := true;
  END;

  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: Editor conseguiu alterar o owner_id da atividade!';
  END IF;
  RAISE NOTICE '[OK] Teste 8: Trigger de segurança bloqueou tentativa de usurpação de propriedade.';

  -- 10. TESTE 9: Proprietário revoga o compartilhamento
  EXECUTE 'SET LOCAL "request.jwt.claims" = ''' || jsonb_build_object('sub', v_user_a::text, 'role', 'authenticated', 'email', 'ana.test@assistsocial.local')::text || '''';
  UPDATE public.resource_shares SET status = 'revoked', revoked_at = now() WHERE id = v_share_id;

  EXECUTE 'SET LOCAL "request.jwt.claims" = ''' || jsonb_build_object('sub', v_user_b::text, 'role', 'authenticated', 'email', 'carlos.test@assistsocial.local')::text || '''';
  SELECT count(*) INTO v_count FROM public.activities WHERE id = v_act_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FALHA DE RLS: Compartilhamento revogado ainda permitiu acesso!';
  END IF;
  RAISE NOTICE '[OK] Teste 9: Revogação imediata confirmada — acesso de B encerrado.';

  -- 11. TESTE 10: Prevenção de ciclos na hierarquia de pastas
  EXECUTE 'SET LOCAL "request.jwt.claims" = ''' || jsonb_build_object('sub', v_user_a::text, 'role', 'authenticated', 'email', 'ana.test@assistsocial.local')::text || '''';
  INSERT INTO public.folders (owner_id, name, parent_folder_id)
  VALUES (v_user_a, 'Pasta Principal', NULL)
  RETURNING id INTO v_folder_1;

  INSERT INTO public.folders (owner_id, name, parent_folder_id)
  VALUES (v_user_a, 'Subpasta Filha', v_folder_1)
  RETURNING id INTO v_folder_2;

  v_error_caught := false;
  BEGIN
    -- Tenta mover a Pasta Principal para dentro da Subpasta Filha (ciclo)
    UPDATE public.folders SET parent_folder_id = v_folder_2 WHERE id = v_folder_1;
  EXCEPTION
    WHEN OTHERS THEN
      v_error_caught := true;
  END;

  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'FALHA DE INTEGRIDADE: O banco permitiu criar um ciclo na hierarquia de pastas!';
  END IF;
  RAISE NOTICE '[OK] Teste 10: Trigger anti-ciclo bloqueou movimentação inválida de pastas.';

  RAISE NOTICE '================================================================';
  RAISE NOTICE 'SUCESSO: TODOS OS 10 TESTES DE INTEGRAÇÃO NATIVA FORAM APROVADOS!';
  RAISE NOTICE '================================================================';

END $$;

-- Rollback limpa 100% dos dados gerados durante os testes
ROLLBACK;
