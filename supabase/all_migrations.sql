-- ==============================================================================
-- ASSISTSOCIAL — ARQUIVO CONSOLIDADO DE MIGRAÇÕES (SQL EDITOR COMPATIBLE)
-- Este arquivo consolida integralmente as migrations 01, 02, 03 e 04 na ordem exata.
-- É 100% idempotente e pode ser executado diretamente no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/mnhzikgphdhohlhfsljz/sql
-- ==============================================================================

-- ==============================================================================
-- PARTE 1: SCHEMA INICIAL, TABELAS, CONSTRAINTS E TRIGGERS DE CICLO
-- (Origem: 20261027170001_initial_schema.sql)
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. FUNÇÃO UTILITÁRIA PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TABELA: PROFILES (Perfis de Usuários)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'social_worker',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger automático para criação de perfil quando novo usuário é registrado no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'social_worker'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
      updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. TABELA: ACTIVITIES (Atividades e Atendimentos)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  category TEXT NOT NULL DEFAULT 'atendimento',
  status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  recurrence_rule TEXT,
  reminder_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_activities_status CHECK (
    status IN ('pending', 'in_progress', 'completed', 'not_completed', 'rescheduled', 'cancelled')
  ),
  CONSTRAINT chk_activities_dates CHECK (
    ends_at IS NULL OR ends_at >= starts_at
  )
);

CREATE INDEX IF NOT EXISTS idx_activities_owner ON public.activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_starts_at ON public.activities(starts_at);

DROP TRIGGER IF EXISTS trg_activities_updated_at ON public.activities;
CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. TABELA: FOLDERS (Pastas de Documentos)
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_folders_name_not_empty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_folders_owner ON public.folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON public.folders(parent_folder_id);

DROP TRIGGER IF EXISTS trg_folders_updated_at ON public.folders;
CREATE TRIGGER trg_folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Função e Trigger: Validação contra ciclos e movimentação inválida de pastas
CREATE OR REPLACE FUNCTION public.check_folder_hierarchy_cycle()
RETURNS TRIGGER AS $$
DECLARE
  cycle_detected BOOLEAN := false;
  parent_owner UUID;
BEGIN
  IF NEW.parent_folder_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_folder_id = NEW.id THEN
    RAISE EXCEPTION 'Operação inválida: uma pasta não pode ser sua própria pasta superior (id: %).', NEW.id;
  END IF;

  SELECT owner_id INTO parent_owner FROM public.folders WHERE id = NEW.parent_folder_id;
  IF parent_owner IS NULL THEN
    RAISE EXCEPTION 'Pasta superior informada não existe (parent_folder_id: %).', NEW.parent_folder_id;
  END IF;

  IF parent_owner <> NEW.owner_id THEN
    RAISE EXCEPTION 'Operação inválida: a pasta superior pertence a outro usuário.';
  END IF;

  WITH RECURSIVE ancestor_tree AS (
    SELECT id, parent_folder_id, 1 as depth
    FROM public.folders
    WHERE id = NEW.parent_folder_id
    UNION ALL
    SELECT f.id, f.parent_folder_id, at.depth + 1
    FROM public.folders f
    INNER JOIN ancestor_tree at ON f.id = at.parent_folder_id
    WHERE at.depth < 100
  )
  SELECT EXISTS (
    SELECT 1 FROM ancestor_tree WHERE id = NEW.id
  ) INTO cycle_detected;

  IF cycle_detected THEN
    RAISE EXCEPTION 'Operação inválida: uma pasta não pode ser movida para dentro de si mesma ou de uma pasta descendente.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_check_folder_cycle ON public.folders;
CREATE TRIGGER trg_check_folder_cycle
  BEFORE INSERT OR UPDATE OF parent_folder_id ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_folder_hierarchy_cycle();

-- 6. TABELA: DOCUMENTS (Documentos e Metadados)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  ai_analysis_status TEXT NOT NULL DEFAULT 'not_requested',
  ai_summary TEXT,
  ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_documents_file_size CHECK (file_size >= 0),
  CONSTRAINT chk_documents_ai_status CHECK (
    ai_analysis_status IN ('not_requested', 'pending', 'processing', 'completed', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON public.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_storage_path ON public.documents(storage_path);

DROP TRIGGER IF EXISTS trg_documents_updated_at ON public.documents;
CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 7. TABELA: RESOURCE_SHARES (Compartilhamentos)
CREATE TABLE IF NOT EXISTS public.resource_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  invited_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_email TEXT,
  permission TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_shares_resource_type CHECK (
    resource_type IN ('activity', 'document', 'folder')
  ),
  CONSTRAINT chk_shares_permission CHECK (
    permission IN ('viewer', 'commenter', 'editor')
  ),
  CONSTRAINT chk_shares_status CHECK (
    status IN ('pending', 'accepted', 'revoked', 'expired')
  ),
  CONSTRAINT chk_shares_target CHECK (
    invited_user_id IS NOT NULL OR invited_email IS NOT NULL
  ),
  CONSTRAINT chk_shares_not_self CHECK (
    invited_user_id IS NULL OR invited_user_id <> owner_id
  )
);

CREATE INDEX IF NOT EXISTS idx_shares_owner ON public.resource_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_shares_resource ON public.resource_shares(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_shares_invited_user ON public.resource_shares(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_shares_invited_email ON public.resource_shares(invited_email);
CREATE INDEX IF NOT EXISTS idx_shares_status ON public.resource_shares(status);

DROP TRIGGER IF EXISTS trg_shares_updated_at ON public.resource_shares;
CREATE TRIGGER trg_shares_updated_at
  BEFORE UPDATE ON public.resource_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 8. TABELA: COMMENTS (Comentários Colaborativos)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_comments_resource_type CHECK (
    resource_type IN ('activity', 'document')
  ),
  CONSTRAINT chk_comments_content_not_empty CHECK (char_length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_resource ON public.comments(resource_type, resource_id);

DROP TRIGGER IF EXISTS trg_comments_updated_at ON public.comments;
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 9. TABELA: AUDIT_LOGS (Trilha de Auditoria Imutável)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 10. PROTEÇÃO CONTRA ALTERAÇÃO INDEVIDA DE PROPRIEDADE
CREATE OR REPLACE FUNCTION public.protect_resource_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id <> OLD.owner_id THEN
    RAISE EXCEPTION 'Violação de segurança: Não é permitido transferir a propriedade deste recurso.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_activities_owner ON public.activities;
CREATE TRIGGER trg_protect_activities_owner
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_resource_ownership();

DROP TRIGGER IF EXISTS trg_protect_folders_owner ON public.folders;
CREATE TRIGGER trg_protect_folders_owner
  BEFORE UPDATE ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_resource_ownership();

DROP TRIGGER IF EXISTS trg_protect_documents_owner ON public.documents;
CREATE TRIGGER trg_protect_documents_owner
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_resource_ownership();

DROP TRIGGER IF EXISTS trg_protect_shares_owner ON public.resource_shares;
CREATE TRIGGER trg_protect_shares_owner
  BEFORE UPDATE ON public.resource_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_resource_ownership();


-- ==============================================================================
-- PARTE 2: ROW LEVEL SECURITY (RLS) E FUNÇÕES DE AUTORIZAÇÃO
-- (Origem: 20261027170002_row_level_security.sql)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

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

CREATE OR REPLACE FUNCTION public.get_auth_user_email(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_email := NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'email', '');
  IF v_email IS NOT NULL THEN
    RETURN v_email;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  RETURN v_email;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

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

  IF public.is_resource_owner(p_resource_type, p_resource_id, p_user_id) THEN
    RETURN TRUE;
  END IF;

  IF public.has_active_share(p_resource_type, p_resource_id, p_user_id, p_required_permission) THEN
    RETURN TRUE;
  END IF;

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

-- RLS POLICIES COM IDEMPOTÊNCIA (DROP IF EXISTS)
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "activities_select_policy" ON public.activities;
CREATE POLICY "activities_select_policy" ON public.activities FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_active_share('activity', id, auth.uid(), 'viewer'));

DROP POLICY IF EXISTS "activities_insert_policy" ON public.activities;
CREATE POLICY "activities_insert_policy" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "activities_update_policy" ON public.activities;
CREATE POLICY "activities_update_policy" ON public.activities FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_active_share('activity', id, auth.uid(), 'editor'))
  WITH CHECK (owner_id = auth.uid() OR public.has_active_share('activity', id, auth.uid(), 'editor'));

DROP POLICY IF EXISTS "activities_delete_policy" ON public.activities;
CREATE POLICY "activities_delete_policy" ON public.activities FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "folders_select_policy" ON public.folders;
CREATE POLICY "folders_select_policy" ON public.folders FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_active_share('folder', id, auth.uid(), 'viewer') OR (parent_folder_id IS NOT NULL AND public.has_folder_or_ancestor_share(parent_folder_id, auth.uid(), 'viewer')));

DROP POLICY IF EXISTS "folders_insert_policy" ON public.folders;
CREATE POLICY "folders_insert_policy" ON public.folders FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "folders_update_policy" ON public.folders;
CREATE POLICY "folders_update_policy" ON public.folders FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_active_share('folder', id, auth.uid(), 'editor'))
  WITH CHECK (owner_id = auth.uid() OR public.has_active_share('folder', id, auth.uid(), 'editor'));

DROP POLICY IF EXISTS "folders_delete_policy" ON public.folders;
CREATE POLICY "folders_delete_policy" ON public.folders FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
CREATE POLICY "documents_select_policy" ON public.documents FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_active_share('document', id, auth.uid(), 'viewer') OR (folder_id IS NOT NULL AND public.has_folder_or_ancestor_share(folder_id, auth.uid(), 'viewer')));

DROP POLICY IF EXISTS "documents_insert_policy" ON public.documents;
CREATE POLICY "documents_insert_policy" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND (folder_id IS NULL OR EXISTS (SELECT 1 FROM public.folders WHERE id = folder_id AND owner_id = auth.uid())));

DROP POLICY IF EXISTS "documents_update_policy" ON public.documents;
CREATE POLICY "documents_update_policy" ON public.documents FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_active_share('document', id, auth.uid(), 'editor') OR (folder_id IS NOT NULL AND public.has_folder_or_ancestor_share(folder_id, auth.uid(), 'editor')))
  WITH CHECK (owner_id = auth.uid() OR public.has_active_share('document', id, auth.uid(), 'editor') OR (folder_id IS NOT NULL AND public.has_folder_or_ancestor_share(folder_id, auth.uid(), 'editor')));

DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;
CREATE POLICY "documents_delete_policy" ON public.documents FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "shares_select_policy" ON public.resource_shares;
CREATE POLICY "shares_select_policy" ON public.resource_shares FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR invited_user_id = auth.uid() OR (invited_email IS NOT NULL AND lower(invited_email) = lower(public.get_auth_user_email(auth.uid()))));

DROP POLICY IF EXISTS "shares_insert_policy" ON public.resource_shares;
CREATE POLICY "shares_insert_policy" ON public.resource_shares FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.is_resource_owner(resource_type, resource_id, auth.uid()));

DROP POLICY IF EXISTS "shares_update_policy" ON public.resource_shares;
CREATE POLICY "shares_update_policy" ON public.resource_shares FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR ((invited_user_id = auth.uid() OR lower(invited_email) = lower(public.get_auth_user_email(auth.uid()))) AND status = 'pending'))
  WITH CHECK (owner_id = auth.uid() OR ((invited_user_id = auth.uid() OR lower(invited_email) = lower(public.get_auth_user_email(auth.uid()))) AND status = 'accepted'));

DROP POLICY IF EXISTS "shares_delete_policy" ON public.resource_shares;
CREATE POLICY "shares_delete_policy" ON public.resource_shares FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "comments_select_policy" ON public.comments;
CREATE POLICY "comments_select_policy" ON public.comments FOR SELECT TO authenticated
  USING (public.can_access_resource(resource_type, resource_id, auth.uid(), 'viewer'));

DROP POLICY IF EXISTS "comments_insert_policy" ON public.comments;
CREATE POLICY "comments_insert_policy" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_access_resource(resource_type, resource_id, auth.uid(), 'commenter'));

DROP POLICY IF EXISTS "comments_update_policy" ON public.comments;
CREATE POLICY "comments_update_policy" ON public.comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "comments_delete_policy" ON public.comments;
CREATE POLICY "comments_delete_policy" ON public.comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_resource_owner(resource_type, resource_id, auth.uid()));

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.is_resource_owner(resource_type, resource_id, auth.uid()));

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());


-- ==============================================================================
-- PARTE 3: SUPABASE STORAGE (BUCKET 'documents' E POLÍTICAS)
-- (Origem: 20261027170003_storage_and_buckets.sql)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "documents_storage_select_policy" ON storage.objects;
CREATE POLICY "documents_storage_select_policy" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.documents d WHERE d.storage_path = name AND public.can_access_resource('document', d.id, auth.uid(), 'viewer'))
  )
);

DROP POLICY IF EXISTS "documents_storage_insert_policy" ON storage.objects;
CREATE POLICY "documents_storage_insert_policy" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "documents_storage_update_policy" ON storage.objects;
CREATE POLICY "documents_storage_update_policy" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "documents_storage_delete_policy" ON storage.objects;
CREATE POLICY "documents_storage_delete_policy" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ==============================================================================
-- PARTE 4: AUDITORIA AUTOMÁTICA E TRIGGERS
-- (Origem: 20261027170004_audit_and_triggers.sql)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_actor_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, details)
  VALUES (p_actor_id, p_action, p_resource_type, p_resource_id, p_details)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.trigger_audit_activity_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_action TEXT;
  v_details JSONB;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := 'activity.status_changed';
    v_details := jsonb_build_object('title', NEW.title, 'old_status', OLD.status, 'new_status', NEW.status, 'failure_reason', NEW.failure_reason);
  ELSE
    v_action := 'activity.updated';
    v_details := jsonb_build_object('title', NEW.title, 'starts_at', NEW.starts_at, 'ends_at', NEW.ends_at, 'category', NEW.category);
  END IF;

  PERFORM public.log_audit_event(COALESCE(v_actor, NEW.owner_id), v_action, 'activity', NEW.id, v_details);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_audit_activities ON public.activities;
CREATE TRIGGER trg_audit_activities
  AFTER UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_audit_activity_changes();

CREATE OR REPLACE FUNCTION public.trigger_audit_share_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_action TEXT;
  v_details JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'share.created';
    v_details := jsonb_build_object('resource_type', NEW.resource_type, 'resource_id', NEW.resource_id, 'permission', NEW.permission, 'invited_email', NEW.invited_email, 'invited_user_id', NEW.invited_user_id);
    PERFORM public.log_audit_event(COALESCE(v_actor, NEW.owner_id), v_action, NEW.resource_type, NEW.resource_id, v_details);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
      v_action := 'share.accepted';
      v_details := jsonb_build_object('permission', NEW.permission, 'accepted_by', v_actor);
    ELSIF NEW.status = 'revoked' OR (NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL) THEN
      v_action := 'share.revoked';
      v_details := jsonb_build_object('permission', NEW.permission, 'revoked_by', v_actor);
    ELSIF OLD.permission IS DISTINCT FROM NEW.permission THEN
      v_action := 'share.permission_changed';
      v_details := jsonb_build_object('old_permission', OLD.permission, 'new_permission', NEW.permission);
    ELSE
      v_action := 'share.updated';
      v_details := jsonb_build_object('status', NEW.status, 'permission', NEW.permission);
    END IF;
    PERFORM public.log_audit_event(COALESCE(v_actor, NEW.owner_id), v_action, NEW.resource_type, NEW.resource_id, v_details);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_audit_shares ON public.resource_shares;
CREATE TRIGGER trg_audit_shares
  AFTER INSERT OR UPDATE ON public.resource_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_audit_share_changes();


-- ==============================================================================
-- PARTE 5: BLINDAGEM DE PRIVACIDADE E CAPTURA DE TELEFONE NO CADASTRO
-- (Origem: 20261027170005_auth_profiles_hardening.sql)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    'social_worker'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.resource_shares s
      WHERE s.status = 'accepted'
        AND (
          (s.owner_id = auth.uid() AND s.invited_user_id = profiles.id)
          OR (s.invited_user_id = auth.uid() AND s.owner_id = profiles.id)
        )
    )
  );


-- ==============================================================================
-- PARTE 6: PAPEL GLOBAL_ADMIN E PROTEÇÃO CONTRA AUTO-ELEVAÇÃO DE PRIVILÉGIOS
-- (Origem: 20261027170006_global_admin_and_role_security.sql)
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_role'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profiles_role
      CHECK (role IN ('social_worker', 'supervisor', 'global_admin'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_single_global_admin
  ON public.profiles (role)
  WHERE role = 'global_admin';

CREATE OR REPLACE FUNCTION public.is_global_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'global_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF auth.role() = 'authenticated' THEN
      IF NOT public.is_global_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Violação de segurança: Usuário não tem permissão para alterar o papel (privilégio insuficiente).';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();
