-- ==============================================================================
-- ASSISTSOCIAL - MIGRATION 15: DOCUMENTOS WORD (.DOCX), MODELOS E FOLHA TIMBRADA
-- Suporte a editor visual de documentos socioassistenciais com persistência de rascunhos,
-- configurações de folha timbrada e exportação DOCX com estrito isolamento RLS.
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE DOCUMENTOS E RASCUNHOS DO EDITOR
CREATE TABLE IF NOT EXISTS public.editor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'relatorio',
  template_id TEXT,
  content JSONB NOT NULL DEFAULT '{"blocks": []}'::jsonb,
  plain_text TEXT,
  settings JSONB NOT NULL DEFAULT '{
    "pageSize": "A4",
    "orientation": "portrait",
    "fontFamily": "Calibri",
    "fontSize": 12,
    "lineSpacing": 1.15,
    "includeLetterhead": true,
    "institutionName": "Secretaria de Proteção Social",
    "institutionUnit": "Centro de Referência de Assistência Social (CRAS)",
    "institutionAddress": "Território de Atendimento Socioassistencial",
    "institutionPhone": "(85) 3101-0000",
    "institutionEmail": "cras@assistsocial.ce.gov.br",
    "includeSignature": true,
    "signerName": "",
    "signerRole": "Assistente Social — CRESS/CE",
    "includePageNumbers": true,
    "margins": { "top": 25, "bottom": 25, "left": 30, "right": 20 }
  }'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  last_downloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_editor_documents_owner ON public.editor_documents(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_editor_documents_category ON public.editor_documents(category);

ALTER TABLE public.editor_documents ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS RLS ESTRITAS (ISOLAMENTO MULTI-TENANT)
DROP POLICY IF EXISTS "editor_documents_select_policy" ON public.editor_documents;
CREATE POLICY "editor_documents_select_policy" ON public.editor_documents
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_global_admin(auth.uid()));

DROP POLICY IF EXISTS "editor_documents_insert_policy" ON public.editor_documents;
CREATE POLICY "editor_documents_insert_policy" ON public.editor_documents
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "editor_documents_update_policy" ON public.editor_documents;
CREATE POLICY "editor_documents_update_policy" ON public.editor_documents
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_global_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_global_admin(auth.uid()));

DROP POLICY IF EXISTS "editor_documents_delete_policy" ON public.editor_documents;
CREATE POLICY "editor_documents_delete_policy" ON public.editor_documents
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_global_admin(auth.uid()));

-- 3. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
DROP TRIGGER IF EXISTS trg_editor_documents_updated_at ON public.editor_documents;
CREATE TRIGGER trg_editor_documents_updated_at
  BEFORE UPDATE ON public.editor_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. RPC PARA SALVAR OU ATUALIZAR RASCUNHO DE FORMA ATÔMICA
CREATE OR REPLACE FUNCTION public.save_editor_document(
  p_id UUID,
  p_title TEXT,
  p_category TEXT,
  p_template_id TEXT,
  p_content JSONB,
  p_plain_text TEXT,
  p_settings JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_doc_id UUID;
  v_is_new BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'O título do documento é obrigatório.' USING ERRCODE = '22023';
  END IF;

  IF p_id IS NOT NULL THEN
    -- Atualiza documento existente (apenas se for o dono ou admin)
    UPDATE public.editor_documents
    SET title = p_title,
        category = COALESCE(p_category, 'geral'),
        template_id = p_template_id,
        content = COALESCE(p_content, '{"blocks": []}'::jsonb),
        plain_text = p_plain_text,
        settings = COALESCE(p_settings, settings),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_id AND (owner_id = v_user_id OR public.is_global_admin(v_user_id))
    RETURNING id INTO v_doc_id;

    IF v_doc_id IS NULL THEN
      RAISE EXCEPTION 'Documento não encontrado ou sem permissão para edição.' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Cria novo documento
    v_is_new := true;
    INSERT INTO public.editor_documents (
      owner_id,
      title,
      category,
      template_id,
      content,
      plain_text,
      settings
    ) VALUES (
      v_user_id,
      p_title,
      COALESCE(p_category, 'geral'),
      p_template_id,
      COALESCE(p_content, '{"blocks": []}'::jsonb),
      p_plain_text,
      COALESCE(p_settings, '{}'::jsonb)
    )
    RETURNING id INTO v_doc_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_doc_id,
    'is_new', v_is_new,
    'message', 'Documento salvo com sucesso no banco de dados.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.save_editor_document(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_editor_document(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB) TO authenticated;

-- 5. NOTIFICAÇÃO DE RELOAD DO SCHEMA POSTGREST
NOTIFY pgrst, 'reload schema';
