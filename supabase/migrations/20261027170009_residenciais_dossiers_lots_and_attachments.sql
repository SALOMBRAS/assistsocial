-- ==============================================================================
-- ASSISTSOCIAL - MIGRATION 09: RESIDENCIAIS, DOSSIÊS, LOTES E ANEXOS DE ATIVIDADES
-- Suporte completo para:
-- 1. Anexos de relatórios diretamente em atividades (public.activity_attachments)
-- 2. Gestão separada: Residencial Paupina e Residencial Joaquim Machado
-- 3. Acompanhamento de Dossiês (situação operacional, conformidade e lotes)
-- 4. Lotes e envios (public.residential_batches)
-- 5. Gestão de Procurações para titulares que não assinam documentos
-- ==============================================================================

-- 1. TABELA DE ANEXOS DE ATIVIDADES (Relatórios Técnicos e Documentos Vinculados)
CREATE TABLE IF NOT EXISTS public.activity_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_activity_attachments_file_size CHECK (file_size >= 0)
);

CREATE INDEX IF NOT EXISTS idx_activity_attachments_activity ON public.activity_attachments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_attachments_uploader ON public.activity_attachments(uploader_id);

ALTER TABLE public.activity_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para Anexos de Atividades:
-- Leitura: Proprietário da atividade ou usuários autorizados via compartilhamento
DROP POLICY IF EXISTS "activity_attachments_select" ON public.activity_attachments;
CREATE POLICY "activity_attachments_select"
ON public.activity_attachments FOR SELECT
TO authenticated
USING (
  uploader_id = auth.uid()
  OR public.can_access_resource('activity', activity_id, auth.uid(), 'viewer')
);

-- Inserção: Usuário autenticado pode anexar em atividades que tem permissão de editor
DROP POLICY IF EXISTS "activity_attachments_insert" ON public.activity_attachments;
CREATE POLICY "activity_attachments_insert"
ON public.activity_attachments FOR INSERT
TO authenticated
WITH CHECK (
  uploader_id = auth.uid()
  AND public.can_access_resource('activity', activity_id, auth.uid(), 'editor')
);

-- Exclusão: Apenas o uploader ou o proprietário da atividade pode remover o anexo
DROP POLICY IF EXISTS "activity_attachments_delete" ON public.activity_attachments;
CREATE POLICY "activity_attachments_delete"
ON public.activity_attachments FOR DELETE
TO authenticated
USING (
  uploader_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.activities a
    WHERE a.id = activity_id AND a.owner_id = auth.uid()
  )
);

-- 2. TABELA DE LOTES E ENVIOS DE RESIDENCIAIS (public.residential_batches)
CREATE TABLE IF NOT EXISTS public.residential_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  residencial_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  dispatch_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_batches_residencial_slug CHECK (residencial_slug IN ('paupina', 'joaquim_machado')),
  CONSTRAINT chk_batches_status CHECK (status IN ('draft', 'enviado', 'em_processamento', 'concluido', 'arquivado')),
  CONSTRAINT chk_batches_name_not_empty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_batches_residencial ON public.residential_batches(residencial_slug);
CREATE INDEX IF NOT EXISTS idx_batches_status ON public.residential_batches(status);

ALTER TABLE public.residential_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "residential_batches_select" ON public.residential_batches;
CREATE POLICY "residential_batches_select"
ON public.residential_batches FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "residential_batches_insert" ON public.residential_batches;
CREATE POLICY "residential_batches_insert"
ON public.residential_batches FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "residential_batches_update" ON public.residential_batches;
CREATE POLICY "residential_batches_update"
ON public.residential_batches FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "residential_batches_delete" ON public.residential_batches;
CREATE POLICY "residential_batches_delete"
ON public.residential_batches FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() OR public.is_global_admin(auth.uid())
);

-- 3. TABELA DE DOSSIÊS (public.dossiers)
-- Centraliza o acompanhamento operacional, conformidade técnica, vinculação a lote e procurações
CREATE TABLE IF NOT EXISTS public.dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  residencial_slug TEXT NOT NULL,
  code TEXT,
  person_name TEXT NOT NULL,
  unit_number TEXT,
  phone TEXT,
  operational_status TEXT NOT NULL DEFAULT 'sem_pendencia',
  compliance_status TEXT NOT NULL DEFAULT 'neutro',
  batch_id UUID REFERENCES public.residential_batches(id) ON DELETE SET NULL,
  needs_proxy BOOLEAN NOT NULL DEFAULT false,
  proxy_status TEXT NOT NULL DEFAULT 'nao_se_aplica',
  proxy_reason TEXT,
  proxy_notes TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_dossiers_residencial_slug CHECK (residencial_slug IN ('paupina', 'joaquim_machado')),
  CONSTRAINT chk_dossiers_operational_status CHECK (
    operational_status IN ('sem_pendencia', 'com_pendencias', 'reenviado_pesquisa', 'nao_veio', 'excluido')
  ),
  CONSTRAINT chk_dossiers_compliance_status CHECK (
    compliance_status IN ('conforme', 'inconforme', 'neutro')
  ),
  CONSTRAINT chk_dossiers_proxy_status CHECK (
    proxy_status IN ('nao_se_aplica', 'pendente', 'em_andamento', 'concluida')
  ),
  CONSTRAINT chk_dossiers_person_name_not_empty CHECK (char_length(trim(person_name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_dossiers_residencial ON public.dossiers(residencial_slug);
CREATE INDEX IF NOT EXISTS idx_dossiers_operational_status ON public.dossiers(operational_status);
CREATE INDEX IF NOT EXISTS idx_dossiers_compliance_status ON public.dossiers(compliance_status);
CREATE INDEX IF NOT EXISTS idx_dossiers_batch ON public.dossiers(batch_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_needs_proxy ON public.dossiers(residencial_slug, needs_proxy) WHERE needs_proxy = true;

ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dossiers_select" ON public.dossiers;
CREATE POLICY "dossiers_select"
ON public.dossiers FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "dossiers_insert" ON public.dossiers;
CREATE POLICY "dossiers_insert"
ON public.dossiers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dossiers_update" ON public.dossiers;
CREATE POLICY "dossiers_update"
ON public.dossiers FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dossiers_delete" ON public.dossiers;
CREATE POLICY "dossiers_delete"
ON public.dossiers FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() OR public.is_global_admin(auth.uid())
);

-- 4. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA DE UPDATED_AT
DROP TRIGGER IF EXISTS trg_activity_attachments_updated_at ON public.activity_attachments;
CREATE TRIGGER trg_activity_attachments_updated_at
  BEFORE UPDATE ON public.activity_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_residential_batches_updated_at ON public.residential_batches;
CREATE TRIGGER trg_residential_batches_updated_at
  BEFORE UPDATE ON public.residential_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_dossiers_updated_at ON public.dossiers;
CREATE TRIGGER trg_dossiers_updated_at
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. SEED INICIAL DOS LOTES BÁSICOS PARA AMBOS OS RESIDENCIAIS
INSERT INTO public.residential_batches (residencial_slug, name, status, notes)
VALUES
  ('paupina', 'Lote 1', 'enviado', 'Envio inicial de famílias prioritárias'),
  ('paupina', 'Lote 2', 'em_processamento', 'Aguardando validação cadastral'),
  ('paupina', 'Lote 3', 'draft', 'Fase de triagem documental'),
  ('paupina', 'Lote 4', 'draft', 'Em planejamento'),
  ('joaquim_machado', 'Lote 1', 'enviado', 'Remessa técnica inicial'),
  ('joaquim_machado', 'Lote 2', 'draft', 'Famílias em análise'),
  ('joaquim_machado', 'Lote 3', 'draft', 'Planejamento de atendimento'),
  ('joaquim_machado', 'Lote 4', 'draft', 'Planejamento de atendimento')
ON CONFLICT DO NOTHING;

-- Notifica o PostgREST para recarregar o cache do esquema imediatamente
NOTIFY pgrst, 'reload schema';
