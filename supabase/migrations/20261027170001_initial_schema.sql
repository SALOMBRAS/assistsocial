-- ==============================================================================
-- ASSISTSOCIAL - MIGRATION 01: INITIAL SCHEMA
-- Entidades: profiles, activities, folders, documents, resource_shares, comments, audit_logs
-- ==============================================================================

-- 1. EXTENSIONS
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
-- Relacionada diretamente ao auth.users do Supabase Auth
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

-- Trigger para updated_at em profiles
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
-- Compatível com o contrato do frontend (Terminal 1)
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
-- Organização hierárquica com proteção contra ciclos
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

-- Função e Trigger: Validação rigorosa contra ciclos e movimentação inválida de pastas
CREATE OR REPLACE FUNCTION public.check_folder_hierarchy_cycle()
RETURNS TRIGGER AS $$
DECLARE
  cycle_detected BOOLEAN := false;
  parent_owner UUID;
BEGIN
  -- Se parent_folder_id for nulo, a pasta está na raiz e não há ciclo
  IF NEW.parent_folder_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Uma pasta não pode ser pai de si mesma
  IF NEW.parent_folder_id = NEW.id THEN
    RAISE EXCEPTION 'Operação inválida: uma pasta não pode ser sua própria pasta superior (id: %).', NEW.id;
  END IF;

  -- 2. Garantir que a pasta pai pertença ao mesmo proprietário
  SELECT owner_id INTO parent_owner FROM public.folders WHERE id = NEW.parent_folder_id;
  IF parent_owner IS NULL THEN
    RAISE EXCEPTION 'Pasta superior informada não existe (parent_folder_id: %).', NEW.parent_folder_id;
  END IF;

  IF parent_owner <> NEW.owner_id THEN
    RAISE EXCEPTION 'Operação inválida: a pasta superior pertence a outro usuário.';
  END IF;

  -- 3. Verificar recursivamente se a pasta atual não está nos ancestrais do novo pai (ciclo de descendentes)
  WITH RECURSIVE ancestor_tree AS (
    SELECT id, parent_folder_id, 1 as depth
    FROM public.folders
    WHERE id = NEW.parent_folder_id
    
    UNION ALL
    
    SELECT f.id, f.parent_folder_id, at.depth + 1
    FROM public.folders f
    INNER JOIN ancestor_tree at ON f.id = at.parent_folder_id
    WHERE at.depth < 100 -- Proteção contra estouro de pilha
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
-- Arquivos residem no bucket privado 'documents' do Supabase Storage
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
-- Controle de acesso granular e autenticado
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

-- 10. PROTEÇÃO CONTRA ALTERAÇÃO INDEVIDA DE PROPRIEDADE (OWNERSHIP PROTECTION)
-- Impede que um usuário tente transferir a posse de um recurso por requisição manipulada
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
