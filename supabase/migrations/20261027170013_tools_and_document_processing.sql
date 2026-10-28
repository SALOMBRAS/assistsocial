-- ==============================================================================
-- ASSISTSOCIAL - MIGRATION 13: CENTRAL DE FERRAMENTAS E PROCESSAMENTO DE DOCUMENTOS
-- Suporte a governança de jobs, histórico de operações locais/remotas e segurança
-- ==============================================================================

-- 1. TABELA DE TRABALHOS DE PROCESSAMENTO DE DOCUMENTOS (JOBS)
CREATE TABLE IF NOT EXISTS public.document_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CONSTRAINT chk_doc_job_status CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled', 'expired')),
  original_filename TEXT,
  result_filename TEXT,
  output_format TEXT,
  file_size BIGINT CONSTRAINT chk_doc_job_file_size CHECK (file_size IS NULL OR file_size >= 0),
  error_code TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_doc_jobs_user_status ON public.document_processing_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_doc_jobs_created_at ON public.document_processing_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_jobs_expires_at ON public.document_processing_jobs(expires_at) WHERE status != 'expired';

ALTER TABLE public.document_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS estritas: Cada usuário acessa apenas seus próprios jobs
DROP POLICY IF EXISTS "doc_jobs_select_policy" ON public.document_processing_jobs;
CREATE POLICY "doc_jobs_select_policy" ON public.document_processing_jobs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_global_admin(auth.uid()));

DROP POLICY IF EXISTS "doc_jobs_insert_policy" ON public.document_processing_jobs;
CREATE POLICY "doc_jobs_insert_policy" ON public.document_processing_jobs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "doc_jobs_update_policy" ON public.document_processing_jobs;
CREATE POLICY "doc_jobs_update_policy" ON public.document_processing_jobs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_global_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_global_admin(auth.uid()));

DROP POLICY IF EXISTS "doc_jobs_delete_policy" ON public.document_processing_jobs;
CREATE POLICY "doc_jobs_delete_policy" ON public.document_processing_jobs
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_global_admin(auth.uid()));


-- 2. BUCKET TEMPORÁRIO PRIVADO PARA PROCESSAMENTO (SE NECESSÁRIO)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temp-processing',
  'temp-processing',
  false,
  52428800, -- 50 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]::text[];

-- Políticas do Storage para o bucket temp-processing:
-- Apenas o proprietário autenticado tem acesso aos arquivos da sua própria pasta {auth.uid()}/...
DROP POLICY IF EXISTS "temp_processing_owner_select" ON storage.objects;
CREATE POLICY "temp_processing_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'temp-processing'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "temp_processing_owner_insert" ON storage.objects;
CREATE POLICY "temp_processing_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'temp-processing'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "temp_processing_owner_update" ON storage.objects;
CREATE POLICY "temp_processing_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'temp-processing'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "temp_processing_owner_delete" ON storage.objects;
CREATE POLICY "temp_processing_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'temp-processing'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- 3. RPC: CRIAR TRABALHO DE PROCESSAMENTO (create_document_job)
CREATE OR REPLACE FUNCTION public.create_document_job(
  p_operation_type TEXT,
  p_original_filename TEXT DEFAULT NULL,
  p_output_format TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_job_id UUID;
  v_expires_at TIMESTAMPTZ := timezone('utc'::text, now() + interval '24 hours');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  IF p_operation_type IS NULL OR length(trim(p_operation_type)) = 0 THEN
    RAISE EXCEPTION 'Parâmetro obrigatório ausente: operation_type.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.document_processing_jobs (
    user_id,
    operation_type,
    status,
    original_filename,
    output_format,
    metadata,
    expires_at
  )
  VALUES (
    v_user_id,
    trim(p_operation_type),
    'processing',
    trim(p_original_filename),
    trim(p_output_format),
    COALESCE(p_metadata, '{}'::jsonb),
    v_expires_at
  )
  RETURNING id INTO v_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', v_job_id,
    'status', 'processing',
    'operation_type', p_operation_type,
    'expires_at', v_expires_at,
    'message', 'Trabalho de processamento registrado com sucesso.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 4. RPC: ATUALIZAR ESTADO DO TRABALHO (update_document_job_status)
CREATE OR REPLACE FUNCTION public.update_document_job_status(
  p_job_id UUID,
  p_status TEXT,
  p_result_filename TEXT DEFAULT NULL,
  p_file_size BIGINT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_job RECORD;
  v_completed_at TIMESTAMPTZ := NULL;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_job
  FROM public.document_processing_jobs
  WHERE id = p_job_id;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Trabalho não encontrado: %', p_job_id USING ERRCODE = 'P0002';
  END IF;

  -- Validação de isolamento: usuário comum só atualiza o seu próprio trabalho
  IF v_job.user_id != v_user_id AND NOT public.is_global_admin(v_user_id) THEN
    RAISE EXCEPTION 'Acesso negado ao trabalho de outro usuário.' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('queued', 'processing', 'completed', 'failed', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status USING ERRCODE = '22023';
  END IF;

  IF p_status IN ('completed', 'failed', 'cancelled') THEN
    v_completed_at := timezone('utc'::text, now());
  END IF;

  UPDATE public.document_processing_jobs
  SET status = p_status,
      result_filename = COALESCE(p_result_filename, result_filename),
      file_size = COALESCE(p_file_size, file_size),
      error_code = COALESCE(p_error_code, error_code),
      error_message = COALESCE(p_error_message, error_message),
      metadata = CASE WHEN p_metadata IS NOT NULL THEN metadata || p_metadata ELSE metadata END,
      completed_at = COALESCE(v_completed_at, completed_at)
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'status', p_status,
    'completed_at', v_completed_at,
    'message', 'Status do trabalho atualizado com sucesso.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 5. RPC: CONSULTAR HISTÓRICO DE TRABALHOS DO USUÁRIO (get_user_document_jobs)
CREATE OR REPLACE FUNCTION public.get_user_document_jobs(
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  operation_type TEXT,
  status TEXT,
  original_filename TEXT,
  result_filename TEXT,
  output_format TEXT,
  file_size BIGINT,
  error_code TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_effective_limit INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  v_effective_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);

  RETURN QUERY
  SELECT
    j.id,
    j.operation_type,
    j.status,
    j.original_filename,
    j.result_filename,
    j.output_format,
    j.file_size,
    j.error_code,
    j.created_at,
    j.completed_at,
    j.expires_at
  FROM public.document_processing_jobs j
  WHERE j.user_id = auth.uid()
  ORDER BY j.created_at DESC
  LIMIT v_effective_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 6. RPC: CANCELAR TRABALHO (cancel_document_job)
CREATE OR REPLACE FUNCTION public.cancel_document_job(p_job_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_job RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_job
  FROM public.document_processing_jobs
  WHERE id = p_job_id;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Trabalho não encontrado: %', p_job_id USING ERRCODE = 'P0002';
  END IF;

  IF v_job.user_id != v_user_id AND NOT public.is_global_admin(v_user_id) THEN
    RAISE EXCEPTION 'Acesso negado ao trabalho de outro usuário.' USING ERRCODE = '42501';
  END IF;

  IF v_job.status IN ('completed', 'failed', 'cancelled') THEN
    RETURN jsonb_build_object(
      'success', false,
      'job_id', p_job_id,
      'status', v_job.status,
      'message', 'Trabalho já se encontra finalizado.'
    );
  END IF;

  UPDATE public.document_processing_jobs
  SET status = 'cancelled',
      completed_at = timezone('utc'::text, now())
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'status', 'cancelled',
    'message', 'Trabalho cancelado com sucesso.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 7. RPC: LIMPEZA DE TRABALHOS EXPIRADOS (cleanup_expired_document_jobs)
CREATE OR REPLACE FUNCTION public.cleanup_expired_document_jobs()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Marca como expirados jobs que ultrapassaram a data de retenção
  UPDATE public.document_processing_jobs
  SET status = 'expired'
  WHERE expires_at < timezone('utc'::text, now())
    AND status NOT IN ('expired', 'failed', 'cancelled');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Exclui jobs com mais de 7 dias de retenção para liberar espaço
  DELETE FROM public.document_processing_jobs
  WHERE created_at < timezone('utc'::text, now() - interval '7 days');

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- Permissões de Execução das RPCs
REVOKE ALL ON FUNCTION public.create_document_job(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_document_job(TEXT, TEXT, TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.update_document_job_status(UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_document_job_status(UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_document_jobs(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_document_jobs(INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_document_job(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_document_job(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.cleanup_expired_document_jobs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_document_jobs() TO authenticated;

NOTIFY pgrst, 'reload schema';
