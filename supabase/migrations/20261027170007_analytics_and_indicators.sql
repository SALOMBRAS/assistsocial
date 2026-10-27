-- ==============================================================================
-- ASSISTSOCIAL — MIGRAÇÃO 07: FUNÇÕES ANALÍTICAS E INDICADORES SEGUROS COM RLS
-- Inspiração conceitual: CIVORA e HSDS (Métricas sem vazamento de privacidade)
-- Data: 2026-10-27
-- ==============================================================================

-- 1. FUNÇÃO: get_dashboard_analytics
-- Produz métricas agregadas do profissional logado respeitando estritamente o RLS.
-- Impede vazamento de dados de outros profissionais.
CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(p_period TEXT DEFAULT 'month')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER -- Garante que o RLS das tabelas subjacentes seja ativamente respeitado
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_start_filter TIMESTAMPTZ;
  v_total INTEGER := 0;
  v_completed INTEGER := 0;
  v_pending INTEGER := 0;
  v_overdue INTEGER := 0;
  v_not_completed INTEGER := 0;
  v_rescheduled INTEGER := 0;
  v_cancelled INTEGER := 0;
  v_cat_atendimento INTEGER := 0;
  v_cat_visita INTEGER := 0;
  v_cat_relatorio INTEGER := 0;
  v_cat_reuniao INTEGER := 0;
  v_cat_outros INTEGER := 0;
  v_completion_rate NUMERIC := 0.0;
BEGIN
  -- 1. Valida autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: Usuário não autenticado.';
  END IF;

  -- 2. Define janela temporal
  CASE p_period
    WHEN 'today' THEN
      v_start_filter := date_trunc('day', timezone('utc'::text, now()));
    WHEN 'week' THEN
      v_start_filter := date_trunc('week', timezone('utc'::text, now()));
    WHEN 'month' THEN
      v_start_filter := date_trunc('month', timezone('utc'::text, now()));
    WHEN 'all' THEN
      v_start_filter := '1970-01-01 00:00:00Z'::timestamptz;
    ELSE
      v_start_filter := date_trunc('month', timezone('utc'::text, now()));
  END CASE;

  -- 3. Agregação segura (o RLS da tabela activities atua filtrando apenas
  -- atividades próprias do usuário ou compartilhadas ativamente com ele)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'pending' AND starts_at < timezone('utc'::text, now())),
    COUNT(*) FILTER (WHERE status = 'not_completed'),
    COUNT(*) FILTER (WHERE status = 'rescheduled'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE category = 'atendimento'),
    COUNT(*) FILTER (WHERE category = 'visita_domiciliar'),
    COUNT(*) FILTER (WHERE category = 'elaboracao_relatorio'),
    COUNT(*) FILTER (WHERE category = 'reuniao'),
    COUNT(*) FILTER (WHERE category NOT IN ('atendimento', 'visita_domiciliar', 'elaboracao_relatorio', 'reuniao'))
  INTO
    v_total,
    v_completed,
    v_pending,
    v_overdue,
    v_not_completed,
    v_rescheduled,
    v_cancelled,
    v_cat_atendimento,
    v_cat_visita,
    v_cat_relatorio,
    v_cat_reuniao,
    v_cat_outros
  FROM public.activities
  WHERE starts_at >= v_start_filter;

  -- 4. Cálculo da taxa de conclusão
  IF v_total > 0 THEN
    v_completion_rate := ROUND((v_completed::NUMERIC / v_total::NUMERIC) * 100.0, 1);
  ELSE
    v_completion_rate := 0.0;
  END IF;

  -- 5. Retorno estruturado em JSONB
  RETURN jsonb_build_object(
    'period', p_period,
    'total_activities', v_total,
    'completed_activities', v_completed,
    'pending_activities', v_pending,
    'overdue_activities', v_overdue,
    'not_completed_activities', v_not_completed,
    'rescheduled_activities', v_rescheduled,
    'cancelled_activities', v_cancelled,
    'completion_rate_percent', v_completion_rate,
    'by_category', jsonb_build_object(
      'atendimento', v_cat_atendimento,
      'visita_domiciliar', v_cat_visita,
      'elaboracao_relatorio', v_cat_relatorio,
      'reuniao', v_cat_reuniao,
      'outros', v_cat_outros
    )
  );
END;
$$;

-- 2. FUNÇÃO: get_admin_system_metrics
-- Permite que apenas a Administradora Global consulte métricas consolidadas do sistema
-- sem expor nomes de famílias ou dados de atendimentos confidenciais.
CREATE OR REPLACE FUNCTION public.get_admin_system_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role TEXT;
  v_total_users INTEGER := 0;
  v_total_activities INTEGER := 0;
  v_total_documents INTEGER := 0;
  v_total_shares INTEGER := 0;
BEGIN
  -- 1. Verifica autorização de administradora global
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'global_admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas a administradora global pode consultar métricas globais do sistema.';
  END IF;

  -- 2. Métricas gerais agregadas (sem identificadores ou dados de conteúdo)
  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  SELECT COUNT(*) INTO v_total_activities FROM public.activities;
  SELECT COUNT(*) INTO v_total_documents FROM public.documents;
  SELECT COUNT(*) INTO v_total_shares FROM public.resource_shares WHERE status = 'accepted';

  -- 3. Registro de auditoria forense
  PERFORM public.log_audit_event(
    auth.uid(),
    'admin.metrics_viewed',
    'system',
    auth.uid(),
    jsonb_build_object(
      'timestamp', timezone('utc'::text, now())
    )
  );

  RETURN jsonb_build_object(
    'total_professionals', v_total_users,
    'total_activities', v_total_activities,
    'total_documents', v_total_documents,
    'total_active_shares', v_total_shares,
    'generated_at', timezone('utc'::text, now())
  );
END;
$$;

-- Permissões de Execução
REVOKE ALL ON FUNCTION public.get_dashboard_analytics(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_admin_system_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_system_metrics() TO authenticated;
