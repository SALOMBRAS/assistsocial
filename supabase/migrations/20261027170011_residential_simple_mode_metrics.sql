-- ==============================================================================
-- ASSISTSOCIAL - MIGRATION 11: MODO SIMPLES DOS RESIDENCIAIS (INDICADORES AGREGADOS)
-- Suporte a gestão quantitativa agregada sem armazenamento de dados pessoais
-- Preservando integralmente o Modo Avançado (Dossiês, Lotes e Anexos)
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE INDICADORES AGREGADOS DO MODO SIMPLES
CREATE TABLE IF NOT EXISTS public.residential_simple_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  residencial_id UUID NOT NULL REFERENCES public.residenciais(id) ON DELETE CASCADE,
  residencial_slug TEXT NOT NULL REFERENCES public.residenciais(slug) ON DELETE CASCADE,
  total_capacity INTEGER,
  occupied_units INTEGER,
  available_units INTEGER,
  pcd_adapted_units INTEGER,
  pending_documents_count INTEGER,
  regular_documents_count INTEGER,
  dossiers_no_pending_count INTEGER,
  dossiers_with_pending_count INTEGER,
  dossiers_resubmitted_search_count INTEGER,
  no_show_count INTEGER,
  dossiers_excluded_count INTEGER,
  dossiers_compliant_count INTEGER,
  dossiers_non_compliant_count INTEGER,
  dossiers_batched_count INTEGER,
  proxies_needed_count INTEGER,
  notes TEXT,
  custom_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_residential_simple_metrics UNIQUE (residencial_id),
  CONSTRAINT chk_simple_total_capacity CHECK (total_capacity IS NULL OR total_capacity >= 0),
  CONSTRAINT chk_simple_occupied_units CHECK (occupied_units IS NULL OR occupied_units >= 0),
  CONSTRAINT chk_simple_available_units CHECK (available_units IS NULL OR available_units >= 0),
  CONSTRAINT chk_simple_pcd_adapted_units CHECK (pcd_adapted_units IS NULL OR pcd_adapted_units >= 0),
  CONSTRAINT chk_simple_pending_documents CHECK (pending_documents_count IS NULL OR pending_documents_count >= 0),
  CONSTRAINT chk_simple_regular_documents CHECK (regular_documents_count IS NULL OR regular_documents_count >= 0),
  CONSTRAINT chk_simple_dossiers_no_pending CHECK (dossiers_no_pending_count IS NULL OR dossiers_no_pending_count >= 0),
  CONSTRAINT chk_simple_dossiers_with_pending CHECK (dossiers_with_pending_count IS NULL OR dossiers_with_pending_count >= 0),
  CONSTRAINT chk_simple_dossiers_resubmitted CHECK (dossiers_resubmitted_search_count IS NULL OR dossiers_resubmitted_search_count >= 0),
  CONSTRAINT chk_simple_no_show CHECK (no_show_count IS NULL OR no_show_count >= 0),
  CONSTRAINT chk_simple_dossiers_excluded CHECK (dossiers_excluded_count IS NULL OR dossiers_excluded_count >= 0),
  CONSTRAINT chk_simple_dossiers_compliant CHECK (dossiers_compliant_count IS NULL OR dossiers_compliant_count >= 0),
  CONSTRAINT chk_simple_dossiers_non_compliant CHECK (dossiers_non_compliant_count IS NULL OR dossiers_non_compliant_count >= 0),
  CONSTRAINT chk_simple_dossiers_batched CHECK (dossiers_batched_count IS NULL OR dossiers_batched_count >= 0),
  CONSTRAINT chk_simple_proxies_needed CHECK (proxies_needed_count IS NULL OR proxies_needed_count >= 0),
  CONSTRAINT chk_simple_capacity_consistency CHECK (
    total_capacity IS NULL OR occupied_units IS NULL OR (total_capacity >= occupied_units)
  )
);

CREATE INDEX IF NOT EXISTS idx_simple_metrics_slug 
  ON public.residential_simple_metrics(residencial_slug);

ALTER TABLE public.residential_simple_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "simple_metrics_select_policy" ON public.residential_simple_metrics;
CREATE POLICY "simple_metrics_select_policy" ON public.residential_simple_metrics
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "simple_metrics_insert_policy" ON public.residential_simple_metrics;
CREATE POLICY "simple_metrics_insert_policy" ON public.residential_simple_metrics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "simple_metrics_update_policy" ON public.residential_simple_metrics;
CREATE POLICY "simple_metrics_update_policy" ON public.residential_simple_metrics
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "simple_metrics_delete_policy" ON public.residential_simple_metrics;
CREATE POLICY "simple_metrics_delete_policy" ON public.residential_simple_metrics
  FOR DELETE TO authenticated
  USING (public.is_global_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_simple_metrics_updated_at ON public.residential_simple_metrics;
CREATE TRIGGER trg_simple_metrics_updated_at
  BEFORE UPDATE ON public.residential_simple_metrics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 2. TABELA DE HISTÓRICO QUANTITATIVO (AUDITORIA DO MODO SIMPLES)
CREATE TABLE IF NOT EXISTS public.residential_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  residencial_id UUID NOT NULL REFERENCES public.residenciais(id) ON DELETE CASCADE,
  residencial_slug TEXT NOT NULL,
  metrics_snapshot JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_metrics_history_residencial 
  ON public.residential_metrics_history(residencial_id, recorded_at DESC);

ALTER TABLE public.residential_metrics_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "metrics_history_select_policy" ON public.residential_metrics_history;
CREATE POLICY "metrics_history_select_policy" ON public.residential_metrics_history
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "metrics_history_insert_policy" ON public.residential_metrics_history;
CREATE POLICY "metrics_history_insert_policy" ON public.residential_metrics_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);


-- 3. RPC: CONSULTAR INDICADORES DO MODO SIMPLES
CREATE OR REPLACE FUNCTION public.get_residential_simple_metrics(p_residencial_slug TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_res RECORD;
  v_metrics RECORD;
  v_author_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_res
  FROM public.residenciais
  WHERE slug = p_residencial_slug;

  IF v_res.id IS NULL THEN
    RAISE EXCEPTION 'Residencial não encontrado: %', p_residencial_slug USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_metrics
  FROM public.residential_simple_metrics
  WHERE residencial_id = v_res.id;

  IF v_metrics.id IS NOT NULL AND v_metrics.last_updated_by IS NOT NULL THEN
    SELECT COALESCE(full_name, 'Profissional') INTO v_author_name
    FROM public.profiles
    WHERE id = v_metrics.last_updated_by;
  END IF;

  RETURN jsonb_build_object(
    'residencial', jsonb_build_object(
      'id', v_res.id,
      'slug', v_res.slug,
      'name', v_res.name,
      'address', v_res.address,
      'blocks_count', v_res.blocks_count,
      'floors_count', v_res.floors_count,
      'pcd_adapted_units_count', v_res.pcd_adapted_units_count
    ),
    'metrics', CASE WHEN v_metrics.id IS NOT NULL THEN jsonb_build_object(
      'id', v_metrics.id,
      'total_capacity', v_metrics.total_capacity,
      'occupied_units', v_metrics.occupied_units,
      'available_units', v_metrics.available_units,
      'pcd_adapted_units', v_metrics.pcd_adapted_units,
      'pending_documents_count', v_metrics.pending_documents_count,
      'regular_documents_count', v_metrics.regular_documents_count,
      'dossiers_no_pending_count', v_metrics.dossiers_no_pending_count,
      'dossiers_with_pending_count', v_metrics.dossiers_with_pending_count,
      'dossiers_resubmitted_search_count', v_metrics.dossiers_resubmitted_search_count,
      'no_show_count', v_metrics.no_show_count,
      'dossiers_excluded_count', v_metrics.dossiers_excluded_count,
      'dossiers_compliant_count', v_metrics.dossiers_compliant_count,
      'dossiers_non_compliant_count', v_metrics.dossiers_non_compliant_count,
      'dossiers_batched_count', v_metrics.dossiers_batched_count,
      'proxies_needed_count', v_metrics.proxies_needed_count,
      'notes', v_metrics.notes,
      'custom_metrics', v_metrics.custom_metrics,
      'last_updated_by', v_metrics.last_updated_by,
      'last_updated_by_name', v_author_name,
      'created_at', v_metrics.created_at,
      'updated_at', v_metrics.updated_at
    ) ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 4. RPC: ATUALIZAR OU CRIAR INDICADORES AGREGADOS DO MODO SIMPLES
CREATE OR REPLACE FUNCTION public.upsert_residential_simple_metrics(
  p_residencial_slug TEXT,
  p_metrics JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_res RECORD;
  v_tot_cap INTEGER;
  v_occ_units INTEGER;
  v_avail_units INTEGER;
  v_pcd_units INTEGER;
  v_pend_docs INTEGER;
  v_reg_docs INTEGER;
  v_doss_no_pend INTEGER;
  v_doss_with_pend INTEGER;
  v_doss_resub INTEGER;
  v_no_show INTEGER;
  v_doss_excl INTEGER;
  v_doss_comp INTEGER;
  v_doss_non_comp INTEGER;
  v_doss_batch INTEGER;
  v_proxies INTEGER;
  v_notes TEXT;
  v_custom JSONB;
  v_record_id UUID;
BEGIN
  -- 1. Autenticação estrita
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  -- 2. Localiza o residencial
  SELECT * INTO v_res
  FROM public.residenciais
  WHERE slug = p_residencial_slug;

  IF v_res.id IS NULL THEN
    RAISE EXCEPTION 'Residencial não encontrado: %', p_residencial_slug USING ERRCODE = 'P0002';
  END IF;

  -- 3. Extração e validação de valores inteiros
  v_tot_cap := CASE WHEN p_metrics ? 'total_capacity' AND p_metrics->>'total_capacity' IS NOT NULL 
    THEN (p_metrics->>'total_capacity')::INTEGER ELSE NULL END;
  v_occ_units := CASE WHEN p_metrics ? 'occupied_units' AND p_metrics->>'occupied_units' IS NOT NULL 
    THEN (p_metrics->>'occupied_units')::INTEGER ELSE NULL END;
  v_avail_units := CASE WHEN p_metrics ? 'available_units' AND p_metrics->>'available_units' IS NOT NULL 
    THEN (p_metrics->>'available_units')::INTEGER ELSE NULL END;
  v_pcd_units := CASE WHEN p_metrics ? 'pcd_adapted_units' AND p_metrics->>'pcd_adapted_units' IS NOT NULL 
    THEN (p_metrics->>'pcd_adapted_units')::INTEGER ELSE NULL END;
  v_pend_docs := CASE WHEN p_metrics ? 'pending_documents_count' AND p_metrics->>'pending_documents_count' IS NOT NULL 
    THEN (p_metrics->>'pending_documents_count')::INTEGER ELSE NULL END;
  v_reg_docs := CASE WHEN p_metrics ? 'regular_documents_count' AND p_metrics->>'regular_documents_count' IS NOT NULL 
    THEN (p_metrics->>'regular_documents_count')::INTEGER ELSE NULL END;
  v_doss_no_pend := CASE WHEN p_metrics ? 'dossiers_no_pending_count' AND p_metrics->>'dossiers_no_pending_count' IS NOT NULL 
    THEN (p_metrics->>'dossiers_no_pending_count')::INTEGER ELSE NULL END;
  v_doss_with_pend := CASE WHEN p_metrics ? 'dossiers_with_pending_count' AND p_metrics->>'dossiers_with_pending_count' IS NOT NULL 
    THEN (p_metrics->>'dossiers_with_pending_count')::INTEGER ELSE NULL END;
  v_doss_resub := CASE WHEN p_metrics ? 'dossiers_resubmitted_search_count' AND p_metrics->>'dossiers_resubmitted_search_count' IS NOT NULL 
    THEN (p_metrics->>'dossiers_resubmitted_search_count')::INTEGER ELSE NULL END;
  v_no_show := CASE WHEN p_metrics ? 'no_show_count' AND p_metrics->>'no_show_count' IS NOT NULL 
    THEN (p_metrics->>'no_show_count')::INTEGER ELSE NULL END;
  v_doss_excl := CASE WHEN p_metrics ? 'dossiers_excluded_count' AND p_metrics->>'dossiers_excluded_count' IS NOT NULL 
    THEN (p_metrics->>'dossiers_excluded_count')::INTEGER ELSE NULL END;
  v_doss_comp := CASE WHEN p_metrics ? 'dossiers_compliant_count' AND p_metrics->>'dossiers_compliant_count' IS NOT NULL 
    THEN (p_metrics->>'dossiers_compliant_count')::INTEGER ELSE NULL END;
  v_doss_non_comp := CASE WHEN p_metrics ? 'dossiers_non_compliant_count' AND p_metrics->>'dossiers_non_compliant_count' IS NOT NULL 
    THEN (p_metrics->>'dossiers_non_compliant_count')::INTEGER ELSE NULL END;
  v_doss_batch := CASE WHEN p_metrics ? 'dossiers_batched_count' AND p_metrics->>'dossiers_batched_count' IS NOT NULL 
    THEN (p_metrics->>'dossiers_batched_count')::INTEGER ELSE NULL END;
  v_proxies := CASE WHEN p_metrics ? 'proxies_needed_count' AND p_metrics->>'proxies_needed_count' IS NOT NULL 
    THEN (p_metrics->>'proxies_needed_count')::INTEGER ELSE NULL END;
  v_notes := p_metrics->>'notes';
  v_custom := COALESCE(p_metrics->'custom_metrics', '{}'::jsonb);

  -- 4. Verificação de valores negativos
  IF (v_tot_cap < 0) OR (v_occ_units < 0) OR (v_avail_units < 0) OR (v_pcd_units < 0) OR
     (v_pend_docs < 0) OR (v_reg_docs < 0) OR (v_doss_no_pend < 0) OR (v_doss_with_pend < 0) OR
     (v_doss_resub < 0) OR (v_no_show < 0) OR (v_doss_excl < 0) OR (v_doss_comp < 0) OR
     (v_doss_non_comp < 0) OR (v_doss_batch < 0) OR (v_proxies < 0) THEN
    RAISE EXCEPTION 'Validação falhou: Valores quantitativos não podem ser negativos.' USING ERRCODE = '22023';
  END IF;

  -- 5. Consistência entre Capacidade Total e Ocupação
  IF v_tot_cap IS NOT NULL AND v_occ_units IS NOT NULL AND v_occ_units > v_tot_cap THEN
    RAISE EXCEPTION 'Inconsistência de capacidade: A quantidade ocupada (%) não pode exceder a capacidade total (%).',
      v_occ_units, v_tot_cap USING ERRCODE = '22023';
  END IF;

  -- 6. Upsert atômico
  INSERT INTO public.residential_simple_metrics (
    residencial_id,
    residencial_slug,
    total_capacity,
    occupied_units,
    available_units,
    pcd_adapted_units,
    pending_documents_count,
    regular_documents_count,
    dossiers_no_pending_count,
    dossiers_with_pending_count,
    dossiers_resubmitted_search_count,
    no_show_count,
    dossiers_excluded_count,
    dossiers_compliant_count,
    dossiers_non_compliant_count,
    dossiers_batched_count,
    proxies_needed_count,
    notes,
    custom_metrics,
    last_updated_by,
    updated_at
  )
  VALUES (
    v_res.id,
    v_res.slug,
    v_tot_cap,
    v_occ_units,
    v_avail_units,
    v_pcd_units,
    v_pend_docs,
    v_reg_docs,
    v_doss_no_pend,
    v_doss_with_pend,
    v_doss_resub,
    v_no_show,
    v_doss_excl,
    v_doss_comp,
    v_doss_non_comp,
    v_doss_batch,
    v_proxies,
    v_notes,
    v_custom,
    v_user_id,
    timezone('utc'::text, now())
  )
  ON CONFLICT (residencial_id) DO UPDATE
  SET total_capacity = EXCLUDED.total_capacity,
      occupied_units = EXCLUDED.occupied_units,
      available_units = EXCLUDED.available_units,
      pcd_adapted_units = EXCLUDED.pcd_adapted_units,
      pending_documents_count = EXCLUDED.pending_documents_count,
      regular_documents_count = EXCLUDED.regular_documents_count,
      dossiers_no_pending_count = EXCLUDED.dossiers_no_pending_count,
      dossiers_with_pending_count = EXCLUDED.dossiers_with_pending_count,
      dossiers_resubmitted_search_count = EXCLUDED.dossiers_resubmitted_search_count,
      no_show_count = EXCLUDED.no_show_count,
      dossiers_excluded_count = EXCLUDED.dossiers_excluded_count,
      dossiers_compliant_count = EXCLUDED.dossiers_compliant_count,
      dossiers_non_compliant_count = EXCLUDED.dossiers_non_compliant_count,
      dossiers_batched_count = EXCLUDED.dossiers_batched_count,
      proxies_needed_count = EXCLUDED.proxies_needed_count,
      notes = EXCLUDED.notes,
      custom_metrics = EXCLUDED.custom_metrics,
      last_updated_by = v_user_id,
      updated_at = timezone('utc'::text, now())
  RETURNING id INTO v_record_id;

  -- 7. Gravação de histórico para auditoria quantitativa (sem dados pessoais)
  INSERT INTO public.residential_metrics_history (
    residencial_id,
    residencial_slug,
    metrics_snapshot,
    updated_by,
    reason
  )
  VALUES (
    v_res.id,
    v_res.slug,
    jsonb_build_object(
      'total_capacity', v_tot_cap,
      'occupied_units', v_occ_units,
      'available_units', v_avail_units,
      'pcd_adapted_units', v_pcd_units,
      'pending_documents_count', v_pend_docs,
      'regular_documents_count', v_reg_docs,
      'dossiers_no_pending_count', v_doss_no_pend,
      'dossiers_with_pending_count', v_doss_with_pend,
      'dossiers_resubmitted_search_count', v_doss_resub,
      'no_show_count', v_no_show,
      'dossiers_excluded_count', v_doss_excl,
      'dossiers_compliant_count', v_doss_comp,
      'dossiers_non_compliant_count', v_doss_non_comp,
      'dossiers_batched_count', v_doss_batch,
      'proxies_needed_count', v_proxies
    ),
    v_user_id,
    'Atualização manual do Modo Simples'
  );

  -- 8. Auditoria forense do sistema
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, details)
  VALUES (
    v_user_id,
    'residential.simple_metrics_updated',
    'residential',
    v_res.id,
    jsonb_build_object('slug', v_res.slug, 'record_id', v_record_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', v_record_id,
    'residencial_slug', v_res.slug,
    'message', 'Indicadores do modo simples atualizados com sucesso.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 5. RPC: CONSULTAR HISTÓRICO DE AUDITORIA DO MODO SIMPLES
CREATE OR REPLACE FUNCTION public.get_residential_metrics_history(
  p_residencial_slug TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  recorded_at TIMESTAMPTZ,
  updated_by UUID,
  updated_by_name TEXT,
  reason TEXT,
  metrics_snapshot JSONB
) AS $$
DECLARE
  v_effective_limit INTEGER;
  v_res_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  SELECT r.id INTO v_res_id
  FROM public.residenciais r
  WHERE r.slug = p_residencial_slug;

  IF v_res_id IS NULL THEN
    RAISE EXCEPTION 'Residencial não encontrado: %', p_residencial_slug USING ERRCODE = 'P0002';
  END IF;

  v_effective_limit := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);

  RETURN QUERY
  SELECT
    h.id,
    h.recorded_at,
    h.updated_by,
    COALESCE(p.full_name, 'Profissional')::TEXT AS updated_by_name,
    h.reason,
    h.metrics_snapshot
  FROM public.residential_metrics_history h
  LEFT JOIN public.profiles p ON p.id = h.updated_by
  WHERE h.residencial_id = v_res_id
  ORDER BY h.recorded_at DESC
  LIMIT v_effective_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_residential_simple_metrics(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_residential_simple_metrics(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.upsert_residential_simple_metrics(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_residential_simple_metrics(TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.get_residential_metrics_history(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_residential_metrics_history(TEXT, INTEGER) TO authenticated;

-- Notifica recarregamento de schema
NOTIFY pgrst, 'reload schema';
