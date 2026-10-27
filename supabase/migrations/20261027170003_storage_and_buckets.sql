-- ==============================================================================
-- ASSISTSOCIAL - MIGRATION 03: STORAGE BUCKETS & POLICIES
-- Configuração do bucket privado 'documents' e políticas RLS para storage.objects
-- ==============================================================================

-- 1. CRIAÇÃO DO BUCKET PRIVADO 'documents'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50 MB
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

-- 2. POLÍTICAS DE ACESSO AO SUPABASE STORAGE (storage.objects)

-- 2.1 DOWNLOAD / VISUALIZAÇÃO (SELECT)
-- Permitido ao proprietário OU a qualquer usuário com compartilhamento ativo do documento
DROP POLICY IF EXISTS "documents_storage_select_policy" ON storage.objects;
CREATE POLICY "documents_storage_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- O usuário é o proprietário (o primeiro segmento do caminho é seu UID)
    (storage.foldername(name))[1] = auth.uid()::text
    -- OU o usuário possui permissão de leitura sobre o documento correspondente
    OR EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.storage_path = name
        AND public.can_access_resource('document', d.id, auth.uid(), 'viewer')
    )
  )
);

-- 2.2 UPLOAD / ENVIO DE ARQUIVO (INSERT)
-- O usuário autenticado só pode enviar arquivos para seu próprio diretório privado (/user_id/*)
DROP POLICY IF EXISTS "documents_storage_insert_policy" ON storage.objects;
CREATE POLICY "documents_storage_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2.3 ATUALIZAÇÃO DE ARQUIVO (UPDATE)
-- Restrito ao proprietário do arquivo
DROP POLICY IF EXISTS "documents_storage_update_policy" ON storage.objects;
CREATE POLICY "documents_storage_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2.4 EXCLUSÃO DE ARQUIVO (DELETE)
-- Apenas o proprietário legítimo pode excluir arquivos do bucket
DROP POLICY IF EXISTS "documents_storage_delete_policy" ON storage.objects;
CREATE POLICY "documents_storage_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
