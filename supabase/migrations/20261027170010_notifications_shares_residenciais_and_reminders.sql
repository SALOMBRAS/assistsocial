-- ==============================================================================
-- ASSISTSOCIAL - MIGRATION 10: NOTIFICAÇÕES, CONVITES DE COMPARTILHAMENTO,
-- PESQUISA SEGURA DE USUÁRIOS, RESIDENCIAIS E LEMBRETES
-- ==============================================================================

-- 1. TABELA DE NOTIFICAÇÕES INTERNAS (public.notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_notifications_type CHECK (
    type IN ('share_invite', 'share_response', 'reminder', 'system', 'activity')
  ),
  CONSTRAINT chk_notifications_title CHECK (char_length(trim(title)) > 0),
  CONSTRAINT chk_notifications_content CHECK (char_length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_resource 
  ON public.notifications(resource_type, resource_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
CREATE POLICY "notifications_delete_policy" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RPC: Marcar notificação individual como lida
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.notifications
  SET is_read = true,
      read_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_notification_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notificação não encontrada ou acesso não autorizado.' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('success', true, 'id', p_notification_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Marcar todas as notificações do usuário como lidas
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.notifications
  SET is_read = true,
      read_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE user_id = v_user_id AND is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'updated_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Obter contagem de não lidas
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count()
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.notifications
  WHERE user_id = v_user_id AND is_read = false;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

REVOKE ALL ON FUNCTION public.get_unread_notifications_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unread_notifications_count() TO authenticated;


-- 2. AJUSTE DE CONSTRAINT DE STATUS EM RESOURCE_SHARES
DO $$
BEGIN
  ALTER TABLE public.resource_shares DROP CONSTRAINT IF EXISTS chk_shares_status;
  ALTER TABLE public.resource_shares ADD CONSTRAINT chk_shares_status CHECK (
    status IN ('pending', 'accepted', 'rejected', 'declined', 'revoked', 'expired')
  );
END $$;

-- RPC: Criar convite de compartilhamento de atividade com notificação interna
CREATE OR REPLACE FUNCTION public.create_activity_share_invite(
  p_activity_id UUID,
  p_recipient_user_id UUID,
  p_permission TEXT DEFAULT 'viewer'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_act_owner_id UUID;
  v_act_title TEXT;
  v_sender_name TEXT;
  v_recipient_email TEXT;
  v_share_id UUID;
  v_existing_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  IF p_recipient_user_id = v_user_id THEN
    RAISE EXCEPTION 'Operação inválida: Não é permitido compartilhar um recurso consigo mesmo.' USING ERRCODE = '22023';
  END IF;

  IF p_permission NOT IN ('viewer', 'commenter', 'editor') THEN
    RAISE EXCEPTION 'Permissão inválida. Use viewer, commenter ou editor.' USING ERRCODE = '22023';
  END IF;

  -- 1. Verifica se a atividade existe e se o remetente tem autorização (é dono ou tem permissão de editor)
  SELECT owner_id, title INTO v_act_owner_id, v_act_title
  FROM public.activities
  WHERE id = p_activity_id;

  IF v_act_owner_id IS NULL THEN
    RAISE EXCEPTION 'Atividade não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF v_act_owner_id <> v_user_id AND NOT public.can_access_resource('activity', p_activity_id, v_user_id, 'editor') THEN
    RAISE EXCEPTION 'Acesso negado: Você não tem autorização para compartilhar esta atividade.' USING ERRCODE = '42501';
  END IF;

  -- 2. Verifica se o destinatário existe
  SELECT email INTO v_recipient_email
  FROM public.profiles
  WHERE id = p_recipient_user_id;

  IF v_recipient_email IS NULL THEN
    RAISE EXCEPTION 'Destinatário não encontrado no sistema.' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Verifica duplicidade de compartilhamento ativo ou pendente
  SELECT status INTO v_existing_status
  FROM public.resource_shares
  WHERE resource_type = 'activity'
    AND resource_id = p_activity_id
    AND invited_user_id = p_recipient_user_id
    AND status IN ('pending', 'accepted');

  IF v_existing_status = 'accepted' THEN
    RAISE EXCEPTION 'Este usuário já possui acesso ativo a esta atividade.' USING ERRCODE = '23505';
  ELSIF v_existing_status = 'pending' THEN
    RAISE EXCEPTION 'Já existe um convite pendente para este usuário nesta atividade.' USING ERRCODE = '23505';
  END IF;

  -- 4. Cria o compartilhamento em status 'pending'
  INSERT INTO public.resource_shares (
    owner_id,
    resource_type,
    resource_id,
    invited_user_id,
    invited_email,
    permission,
    status
  )
  VALUES (
    v_user_id,
    'activity',
    p_activity_id,
    p_recipient_user_id,
    v_recipient_email,
    p_permission,
    'pending'
  )
  RETURNING id INTO v_share_id;

  -- 5. Obtém nome do remetente
  SELECT COALESCE(full_name, 'Colega de trabalho') INTO v_sender_name
  FROM public.profiles
  WHERE id = v_user_id;

  -- 6. Registra notificação interna no sistema para o destinatário (zero e-mails disparados)
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    content,
    resource_type,
    resource_id
  )
  VALUES (
    p_recipient_user_id,
    'share_invite',
    'Novo convite de compartilhamento',
    v_sender_name || ' convidou você para colaborar na atividade: "' || v_act_title || '".',
    'activity',
    p_activity_id
  );

  -- 7. Auditoria
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, details)
  VALUES (
    v_user_id,
    'share.invite_created',
    'activity',
    p_activity_id,
    jsonb_build_object('recipient_id', p_recipient_user_id, 'permission', p_permission, 'share_id', v_share_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'share_id', v_share_id,
    'status', 'pending',
    'message', 'Convite de compartilhamento enviado com sucesso via notificação interna.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Aceitar ou recusar convite de compartilhamento
CREATE OR REPLACE FUNCTION public.respond_to_share_invite(
  p_share_id UUID,
  p_action TEXT -- 'accept' ou 'reject'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_share RECORD;
  v_act_title TEXT := '';
  v_responder_name TEXT;
  v_new_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  IF p_action NOT IN ('accept', 'reject', 'decline') THEN
    RAISE EXCEPTION 'Ação inválida. Utilize "accept" ou "reject".' USING ERRCODE = '22023';
  END IF;

  v_user_email := public.get_auth_user_email(v_user_id);

  -- 1. Localiza o convite
  SELECT * INTO v_share
  FROM public.resource_shares
  WHERE id = p_share_id;

  IF v_share.id IS NULL THEN
    RAISE EXCEPTION 'Convite não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Valida se o chamador é de fato o destinatário
  IF v_share.invited_user_id IS DISTINCT FROM v_user_id THEN
    IF v_share.invited_email IS NULL OR lower(v_share.invited_email) <> lower(v_user_email) THEN
      RAISE EXCEPTION 'Acesso negado: Você não é o destinatário deste convite.' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 3. Valida se está pendente
  IF v_share.status <> 'pending' THEN
    RAISE EXCEPTION 'Este convite já foi respondido anteriormente (status atual: %).', v_share.status USING ERRCODE = '22023';
  END IF;

  -- 4. Define novo status
  IF p_action = 'accept' THEN
    v_new_status := 'accepted';
  ELSE
    v_new_status := 'rejected';
  END IF;

  -- 5. Atualiza o compartilhamento
  UPDATE public.resource_shares
  SET status = v_new_status,
      invited_user_id = v_user_id,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_share_id;

  -- 6. Notifica o remetente sobre a resposta
  SELECT COALESCE(full_name, 'Profissional') INTO v_responder_name
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_share.resource_type = 'activity' THEN
    SELECT title INTO v_act_title FROM public.activities WHERE id = v_share.resource_id;
  ELSIF v_share.resource_type = 'document' THEN
    SELECT title INTO v_act_title FROM public.documents WHERE id = v_share.resource_id;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    content,
    resource_type,
    resource_id
  )
  VALUES (
    v_share.owner_id,
    'share_response',
    CASE WHEN v_new_status = 'accepted' THEN 'Convite aceito' ELSE 'Convite recusado' END,
    v_responder_name || ' ' || CASE WHEN v_new_status = 'accepted' THEN 'aceitou' ELSE 'recusou' END ||
      ' o compartilhamento de "' || COALESCE(v_act_title, 'Recurso') || '".',
    v_share.resource_type,
    v_share.resource_id
  );

  -- 7. Auditoria
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, details)
  VALUES (
    v_user_id,
    'share.invite_responded',
    v_share.resource_type,
    v_share.resource_id,
    jsonb_build_object('share_id', p_share_id, 'action', p_action, 'status', v_new_status)
  );

  RETURN jsonb_build_object(
    'success', true,
    'share_id', p_share_id,
    'status', v_new_status,
    'message', CASE WHEN v_new_status = 'accepted' 
      THEN 'Convite aceito! Acesso concedido com sucesso.' 
      ELSE 'Convite recusado. Nenhum acesso foi concedido.' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.create_activity_share_invite(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_activity_share_invite(UUID, UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.respond_to_share_invite(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_share_invite(UUID, TEXT) TO authenticated;


-- 3. PESQUISA SEGURA DE USUÁRIOS PARA COMPARTILHAMENTO
CREATE OR REPLACE FUNCTION public.search_users_for_sharing(
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  avatar_url TEXT
) AS $$
DECLARE
  v_cleaned_query TEXT;
  v_effective_limit INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  v_cleaned_query := trim(COALESCE(p_query, ''));
  v_effective_limit := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 20);

  -- Exige no mínimo 2 caracteres para evitar varredura/enumeração indiscriminada
  IF char_length(v_cleaned_query) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.avatar_url
  FROM public.profiles p
  WHERE p.id <> auth.uid()
    AND (
      p.full_name ILIKE '%' || v_cleaned_query || '%'
      OR p.email ILIKE '%' || v_cleaned_query || '%'
    )
  ORDER BY
    CASE WHEN p.full_name ILIKE v_cleaned_query || '%' THEN 0 ELSE 1 END,
    p.full_name ASC
  LIMIT v_effective_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.search_users_for_sharing(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_users_for_sharing(TEXT, INTEGER) TO authenticated;

-- RPC: Compartilhamento seguro de documentos com notificação interna
CREATE OR REPLACE FUNCTION public.create_document_share_invite(
  p_document_id UUID,
  p_recipient_user_id UUID,
  p_permission TEXT DEFAULT 'viewer'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_doc_owner_id UUID;
  v_doc_title TEXT;
  v_sender_name TEXT;
  v_recipient_email TEXT;
  v_share_id UUID;
  v_existing_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  IF p_recipient_user_id = v_user_id THEN
    RAISE EXCEPTION 'Operação inválida: Não é permitido compartilhar um documento consigo mesmo.' USING ERRCODE = '22023';
  END IF;

  IF p_permission NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'Permissão inválida para documentos. Use viewer ou editor.' USING ERRCODE = '22023';
  END IF;

  SELECT owner_id, title INTO v_doc_owner_id, v_doc_title
  FROM public.documents
  WHERE id = p_document_id;

  IF v_doc_owner_id IS NULL THEN
    RAISE EXCEPTION 'Documento não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF v_doc_owner_id <> v_user_id AND NOT public.can_access_resource('document', p_document_id, v_user_id, 'editor') THEN
    RAISE EXCEPTION 'Acesso negado: Você não tem autorização para compartilhar este documento.' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_recipient_email
  FROM public.profiles
  WHERE id = p_recipient_user_id;

  IF v_recipient_email IS NULL THEN
    RAISE EXCEPTION 'Destinatário não encontrado no sistema.' USING ERRCODE = 'P0002';
  END IF;

  SELECT status INTO v_existing_status
  FROM public.resource_shares
  WHERE resource_type = 'document'
    AND resource_id = p_document_id
    AND invited_user_id = p_recipient_user_id
    AND status IN ('pending', 'accepted');

  IF v_existing_status = 'accepted' THEN
    RAISE EXCEPTION 'Este usuário já possui acesso ativo a este documento.' USING ERRCODE = '23505';
  ELSIF v_existing_status = 'pending' THEN
    RAISE EXCEPTION 'Já existe um convite pendente para este usuário neste documento.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.resource_shares (
    owner_id,
    resource_type,
    resource_id,
    invited_user_id,
    invited_email,
    permission,
    status
  )
  VALUES (
    v_user_id,
    'document',
    p_document_id,
    p_recipient_user_id,
    v_recipient_email,
    p_permission,
    'pending'
  )
  RETURNING id INTO v_share_id;

  SELECT COALESCE(full_name, 'Colega de trabalho') INTO v_sender_name
  FROM public.profiles
  WHERE id = v_user_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    content,
    resource_type,
    resource_id
  )
  VALUES (
    p_recipient_user_id,
    'share_invite',
    'Novo documento compartilhado',
    v_sender_name || ' compartilhou o documento: "' || v_doc_title || '" com você.',
    'document',
    p_document_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'share_id', v_share_id,
    'status', 'pending',
    'message', 'Convite para documento enviado com sucesso via notificação interna.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.create_document_share_invite(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_document_share_invite(UUID, UUID, TEXT) TO authenticated;


-- 4. TABELA DE RESIDENCIAIS (public.residenciais)
CREATE TABLE IF NOT EXISTS public.residenciais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  blocks_count INTEGER NOT NULL DEFAULT 0,
  floors_count INTEGER NOT NULL DEFAULT 0,
  pcd_adapted_units_count INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_residenciais_name CHECK (char_length(trim(name)) > 0),
  CONSTRAINT chk_residenciais_address CHECK (char_length(trim(address)) > 0),
  CONSTRAINT chk_residenciais_blocks CHECK (blocks_count >= 0),
  CONSTRAINT chk_residenciais_floors CHECK (floors_count >= 0),
  CONSTRAINT chk_residenciais_pcd CHECK (pcd_adapted_units_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_residenciais_slug ON public.residenciais(slug);

ALTER TABLE public.residenciais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "residenciais_select_policy" ON public.residenciais;
CREATE POLICY "residenciais_select_policy" ON public.residenciais
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "residenciais_insert_policy" ON public.residenciais;
CREATE POLICY "residenciais_insert_policy" ON public.residenciais
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "residenciais_update_policy" ON public.residenciais;
CREATE POLICY "residenciais_update_policy" ON public.residenciais
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR public.is_global_admin(auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid() OR public.is_global_admin(auth.uid())
  );

DROP POLICY IF EXISTS "residenciais_delete_policy" ON public.residenciais;
CREATE POLICY "residenciais_delete_policy" ON public.residenciais
  FOR DELETE TO authenticated
  USING (public.is_global_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_residenciais_updated_at ON public.residenciais;
CREATE TRIGGER trg_residenciais_updated_at
  BEFORE UPDATE ON public.residenciais
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seeds iniciais dos residenciais padrão garantindo compatibilidade com Migration 09
INSERT INTO public.residenciais (slug, name, address, blocks_count, floors_count, pcd_adapted_units_count, description)
VALUES
  ('paupina', 'Residencial Paupina', 'Rua Paupina, s/n, Bairro Paupina, Fortaleza - CE', 12, 4, 16, 'Conjunto habitacional do programa Minha Casa Minha Vida.'),
  ('joaquim_machado', 'Residencial Joaquim Machado', 'Av. Joaquim Machado, 1500, Fortaleza - CE', 8, 4, 10, 'Empreendimento social destinado a famílias de interesse prioritário.')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    address = EXCLUDED.address,
    blocks_count = EXCLUDED.blocks_count,
    floors_count = EXCLUDED.floors_count,
    pcd_adapted_units_count = EXCLUDED.pcd_adapted_units_count;


-- 5. TABELA DE LEMBRETES INTERNOS (public.reminders)
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_reminders_title CHECK (char_length(trim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_date 
  ON public.reminders(user_id, remind_at, is_completed);
CREATE INDEX IF NOT EXISTS idx_reminders_activity 
  ON public.reminders(activity_id);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminders_select_policy" ON public.reminders;
CREATE POLICY "reminders_select_policy" ON public.reminders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "reminders_insert_policy" ON public.reminders;
CREATE POLICY "reminders_insert_policy" ON public.reminders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reminders_update_policy" ON public.reminders;
CREATE POLICY "reminders_update_policy" ON public.reminders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reminders_delete_policy" ON public.reminders;
CREATE POLICY "reminders_delete_policy" ON public.reminders
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_reminders_updated_at ON public.reminders;
CREATE TRIGGER trg_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RPC: Concluir ou reabrir lembrete
CREATE OR REPLACE FUNCTION public.toggle_reminder_completed(p_reminder_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_status BOOLEAN;
  v_new_status BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  SELECT is_completed INTO v_current_status
  FROM public.reminders
  WHERE id = p_reminder_id AND user_id = v_user_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Lembrete não encontrado ou não pertence ao usuário.' USING ERRCODE = 'P0002';
  END IF;

  v_new_status := NOT v_current_status;

  UPDATE public.reminders
  SET is_completed = v_new_status,
      completed_at = CASE WHEN v_new_status THEN timezone('utc'::text, now()) ELSE NULL END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_reminder_id AND user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', p_reminder_id,
    'is_completed', v_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.toggle_reminder_completed(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_reminder_completed(UUID) TO authenticated;

-- Notifica o PostgREST para recarregar o cache do esquema imediatamente
NOTIFY pgrst, 'reload schema';
