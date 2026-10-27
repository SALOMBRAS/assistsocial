-- ==============================================================================
-- ASSISTSOCIAL - MIGRATION 04: AUDIT LOGGING TRIGGERS & PROCEDURES
-- ==============================================================================

-- 1. FUNÇÃO AUXILIAR PARA REGISTRO SEGURO DE EVENTOS DE AUDITORIA
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
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    details
  )
  VALUES (
    p_actor_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. TRIGGER: AUDITORIA DE ATIVIDADES (Alteração geral e mudança de status)
CREATE OR REPLACE FUNCTION public.trigger_audit_activity_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_action TEXT;
  v_details JSONB;
BEGIN
  -- Se o status mudou
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := 'activity.status_changed';
    v_details := jsonb_build_object(
      'title', NEW.title,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'failure_reason', NEW.failure_reason
    );
  ELSE
    v_action := 'activity.updated';
    v_details := jsonb_build_object(
      'title', NEW.title,
      'starts_at', NEW.starts_at,
      'ends_at', NEW.ends_at,
      'category', NEW.category
    );
  END IF;

  PERFORM public.log_audit_event(
    COALESCE(v_actor, NEW.owner_id),
    v_action,
    'activity',
    NEW.id,
    v_details
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_audit_activities ON public.activities;
CREATE TRIGGER trg_audit_activities
  AFTER UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_audit_activity_changes();

-- 3. TRIGGER: AUDITORIA DE COMPARTILHAMENTOS
CREATE OR REPLACE FUNCTION public.trigger_audit_share_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_action TEXT;
  v_details JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'share.created';
    v_details := jsonb_build_object(
      'resource_type', NEW.resource_type,
      'resource_id', NEW.resource_id,
      'permission', NEW.permission,
      'invited_email', NEW.invited_email,
      'invited_user_id', NEW.invited_user_id
    );

    PERFORM public.log_audit_event(
      COALESCE(v_actor, NEW.owner_id),
      v_action,
      NEW.resource_type,
      NEW.resource_id,
      v_details
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Aceitação de convite
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
      v_action := 'share.accepted';
      v_details := jsonb_build_object(
        'permission', NEW.permission,
        'accepted_by', v_actor
      );
    -- Revogação de acesso
    ELSIF NEW.status = 'revoked' OR (NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL) THEN
      v_action := 'share.revoked';
      v_details := jsonb_build_object(
        'permission', NEW.permission,
        'revoked_by', v_actor
      );
    -- Alteração de permissão
    ELSIF OLD.permission IS DISTINCT FROM NEW.permission THEN
      v_action := 'share.permission_changed';
      v_details := jsonb_build_object(
        'old_permission', OLD.permission,
        'new_permission', NEW.permission
      );
    ELSE
      v_action := 'share.updated';
      v_details := jsonb_build_object(
        'status', NEW.status,
        'permission', NEW.permission
      );
    END IF;

    PERFORM public.log_audit_event(
      COALESCE(v_actor, NEW.owner_id),
      v_action,
      NEW.resource_type,
      NEW.resource_id,
      v_details
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_audit_shares ON public.resource_shares;
CREATE TRIGGER trg_audit_shares
  AFTER INSERT OR UPDATE ON public.resource_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_audit_share_changes();
