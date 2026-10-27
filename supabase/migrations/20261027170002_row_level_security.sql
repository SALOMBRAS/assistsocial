-- ==============================================================================
-- ASSISTSOCIAL - MIGRATION 02: ROW LEVEL SECURITY (RLS) POLICIES & HELPER FUNCTIONS
-- ==============================================================================

-- 1. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. FUNÇÕES AUXILIARES DE AUTORIZAÇÃO (SECURITY DEFINER)
-- Executadas com contexto seguro, prevenindo recursão circular nas políticas RLS

-- 2.1 Verifica se o usuário é proprietário do recurso
CREATE OR REPLACE FUNCTION public.is_resource_owner(
  p_resource_type TEXT,
  p_resource_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_resource_type = 'activity' THEN
    RETURN EXISTS (SELECT 1 FROM public.activities WHERE id = p_resource_id AND owner_id = p_user_id);
  ELSIF p_resource_type = 'document' THEN
    RETURN EXISTS (SELECT 1 FROM public.documents WHERE id = p_resource_id AND owner_id = p_user_id);
  ELSIF p_resource_type = 'folder' THEN
    RETURN EXISTS (SELECT 1 FROM public.folders WHERE id = p_resource_id AND owner_id = p_user_id);
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2.2 Obtém o e-mail do usuário autenticado de forma segura e performática
CREATE OR REPLACE FUNCTION public.get_auth_user_email(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Tenta obter da claims JWT (sem overhead de I/O em disco)
  v_email := NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'email', '');
  IF v_email IS NOT NULL THEN
    RETURN v_email;
  END IF;

  -- 2. Fallback para consulta na auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  RETURN v_email;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 2.3 Verifica se o usuário tem compartilhamento ativo e aceito para o recurso
CREATE OR REPLACE FUNCTION public.has_active_share(
  p_resource_type TEXT,
  p_resource_id UUID,
  p_user_id UUID,
  p_required_permission TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_user_email := public.get_auth_user_email(p_user_id);

  RETURN EXISTS (
    SELECT 1 FROM public.resource_shares s
    WHERE s.resource_type = p_resource_type
      AND s.resource_id = p_resource_id
      AND (
        s.invited_user_id = p_user_id
        OR (s.invited_user_id IS NULL AND v_user_email IS NOT NULL AND lower(s.invited_email) = lower(v_user_email))
      )
      AND s.status = 'accepted'
      AND (s.expires_at IS NULL OR s.expires_at > timezone('utc'::text, now()))
      AND s.revoked_at IS NULL
      AND (
        CASE
          WHEN p_required_permission = 'viewer' THEN s.permission IN ('viewer', 'commenter', 'editor')
          WHEN p_required_permission = 'commenter' THEN s.permission IN ('commenter', 'editor')
          WHEN p_required_permission = 'editor' THEN s.permission = 'editor'
          ELSE FALSE
        END
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2.4 Verifica permissão herdada de pastas ancestrais (Folder Hierarchy Access)
CREATE OR REPLACE FUNCTION public.has_folder_or_ancestor_share(
  p_folder_id UUID,
  p_user_id UUID,
  p_required_permission TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_email TEXT;
  v_has_access BOOLEAN := false;
BEGIN
  IF p_folder_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_user_email := public.get_auth_user_email(p_user_id);

  -- Percorre a hierarquia de pastas para cima
  WITH RECURSIVE folder_chain AS (
    SELECT id, parent_folder_id, 1 as depth
    FROM public.folders
    WHERE id = p_folder_id

    UNION ALL

    SELECT f.id, f.parent_folder_id, fc.depth + 1
    FROM public.folders f
    INNER JOIN folder_chain fc ON f.id = fc.parent_folder_id
    WHERE fc.depth < 50
  )
  SELECT EXISTS (
    SELECT 1 FROM public.resource_shares s
    INNER JOIN folder_chain fc ON s.resource_id = fc.id
    WHERE s.resource_type = 'folder'
      AND (
        s.invited_user_id = p_user_id
        OR (s.invited_user_id IS NULL AND v_user_email IS NOT NULL AND lower(s.invited_email) = lower(v_user_email))
      )
      AND s.status = 'accepted'
      AND (s.expires_at IS NULL OR s.expires_at > timezone('utc'::text, now()))
      AND s.revoked_at IS NULL
      AND (
        CASE
          WHEN p_required_permission = 'viewer' THEN s.permission IN ('viewer', 'commenter', 'editor')
          WHEN p_required_permission = 'commenter' THEN s.permission IN ('commenter', 'editor')
          WHEN p_required_permission = 'editor' THEN s.permission = 'editor'
          ELSE FALSE
        END
      )
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2.5 Função de verificação combinada (Proprietário OU Compartilhado)
CREATE OR REPLACE FUNCTION public.can_access_resource(
  p_resource_type TEXT,
  p_resource_id UUID,
  p_user_id UUID,
  p_required_permission TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Se for o proprietário, tem acesso irrestrito
  IF public.is_resource_owner(p_resource_type, p_resource_id, p_user_id) THEN
    RETURN TRUE;
  END IF;

  -- 2. Se houver compartilhamento direto aceito
  IF public.has_active_share(p_resource_type, p_resource_id, p_user_id, p_required_permission) THEN
    RETURN TRUE;
  END IF;

  -- 3. Se for documento dentro de pasta com herança
  IF p_resource_type = 'document' THEN
    DECLARE
      v_doc_folder_id UUID;
    BEGIN
      SELECT folder_id INTO v_doc_folder_id FROM public.documents WHERE id = p_resource_id;
      IF v_doc_folder_id IS NOT NULL AND public.has_folder_or_ancestor_share(v_doc_folder_id, p_user_id, p_required_permission) THEN
        RETURN TRUE;
      END IF;
    END;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ==============================================================================
-- 3. POLÍTICAS RLS: PROFILES
-- ==============================================================================

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ==============================================================================
-- 4. POLÍTICAS RLS: ACTIVITIES
-- ==============================================================================

DROP POLICY IF EXISTS "activities_select_policy" ON public.activities;
CREATE POLICY "activities_select_policy" ON public.activities
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_active_share('activity', id, auth.uid(), 'viewer')
  );

DROP POLICY IF EXISTS "activities_insert_policy" ON public.activities;
CREATE POLICY "activities_insert_policy" ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "activities_update_policy" ON public.activities;
CREATE POLICY "activities_update_policy" ON public.activities
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_active_share('activity', id, auth.uid(), 'editor')
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.has_active_share('activity', id, auth.uid(), 'editor')
  );

DROP POLICY IF EXISTS "activities_delete_policy" ON public.activities;
CREATE POLICY "activities_delete_policy" ON public.activities
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());


-- ==============================================================================
-- 5. POLÍTICAS RLS: FOLDERS
-- ==============================================================================

DROP POLICY IF EXISTS "folders_select_policy" ON public.folders;
CREATE POLICY "folders_select_policy" ON public.folders
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_active_share('folder', id, auth.uid(), 'viewer')
    OR (parent_folder_id IS NOT NULL AND public.has_folder_or_ancestor_share(parent_folder_id, auth.uid(), 'viewer'))
  );

DROP POLICY IF EXISTS "folders_insert_policy" ON public.folders;
CREATE POLICY "folders_insert_policy" ON public.folders
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "folders_update_policy" ON public.folders;
CREATE POLICY "folders_update_policy" ON public.folders
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_active_share('folder', id, auth.uid(), 'editor')
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.has_active_share('folder', id, auth.uid(), 'editor')
  );

DROP POLICY IF EXISTS "folders_delete_policy" ON public.folders;
CREATE POLICY "folders_delete_policy" ON public.folders
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());


-- ==============================================================================
-- 6. POLÍTICAS RLS: DOCUMENTS
-- ==============================================================================

DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
CREATE POLICY "documents_select_policy" ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_active_share('document', id, auth.uid(), 'viewer')
    OR (folder_id IS NOT NULL AND public.has_folder_or_ancestor_share(folder_id, auth.uid(), 'viewer'))
  );

DROP POLICY IF EXISTS "documents_insert_policy" ON public.documents;
CREATE POLICY "documents_insert_policy" ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      folder_id IS NULL
      OR EXISTS (SELECT 1 FROM public.folders WHERE id = folder_id AND owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "documents_update_policy" ON public.documents;
CREATE POLICY "documents_update_policy" ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_active_share('document', id, auth.uid(), 'editor')
    OR (folder_id IS NOT NULL AND public.has_folder_or_ancestor_share(folder_id, auth.uid(), 'editor'))
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.has_active_share('document', id, auth.uid(), 'editor')
    OR (folder_id IS NOT NULL AND public.has_folder_or_ancestor_share(folder_id, auth.uid(), 'editor'))
  );

DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;
CREATE POLICY "documents_delete_policy" ON public.documents
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());


-- ==============================================================================
-- 7. POLÍTICAS RLS: RESOURCE_SHARES
-- ==============================================================================

DROP POLICY IF EXISTS "shares_select_policy" ON public.resource_shares;
CREATE POLICY "shares_select_policy" ON public.resource_shares
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR invited_user_id = auth.uid()
    OR (invited_email IS NOT NULL AND lower(invited_email) = lower(public.get_auth_user_email(auth.uid())))
  );

DROP POLICY IF EXISTS "shares_insert_policy" ON public.resource_shares;
CREATE POLICY "shares_insert_policy" ON public.resource_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND public.is_resource_owner(resource_type, resource_id, auth.uid())
  );

DROP POLICY IF EXISTS "shares_update_policy" ON public.resource_shares;
CREATE POLICY "shares_update_policy" ON public.resource_shares
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR (
      (invited_user_id = auth.uid() OR lower(invited_email) = lower(public.get_auth_user_email(auth.uid())))
      AND status = 'pending'
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR (
      (invited_user_id = auth.uid() OR lower(invited_email) = lower(public.get_auth_user_email(auth.uid())))
      AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "shares_delete_policy" ON public.resource_shares;
CREATE POLICY "shares_delete_policy" ON public.resource_shares
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());


-- ==============================================================================
-- 8. POLÍTICAS RLS: COMMENTS
-- ==============================================================================

DROP POLICY IF EXISTS "comments_select_policy" ON public.comments;
CREATE POLICY "comments_select_policy" ON public.comments
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_resource(resource_type, resource_id, auth.uid(), 'viewer')
  );

DROP POLICY IF EXISTS "comments_insert_policy" ON public.comments;
CREATE POLICY "comments_insert_policy" ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.can_access_resource(resource_type, resource_id, auth.uid(), 'commenter')
  );

DROP POLICY IF EXISTS "comments_update_policy" ON public.comments;
CREATE POLICY "comments_update_policy" ON public.comments
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "comments_delete_policy" ON public.comments;
CREATE POLICY "comments_delete_policy" ON public.comments
  FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR public.is_resource_owner(resource_type, resource_id, auth.uid())
  );


-- ==============================================================================
-- 9. POLÍTICAS RLS: AUDIT_LOGS
-- ==============================================================================

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    actor_id = auth.uid()
    OR public.is_resource_owner(resource_type, resource_id, auth.uid())
  );

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- ATUALIZAÇÃO E EXCLUSÃO: PROIBIDAS (Imutabilidade da trilha de auditoria)
