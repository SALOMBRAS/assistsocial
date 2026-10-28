-- ==============================================================================
-- ASSISTSOCIAL - MIGRATION 14: PREFERÊNCIAS DE USUÁRIO E CONTROLE DE ACESSO A MENUS
-- ==============================================================================

-- 1. Adiciona coluna preferences na tabela profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. RPC para salvar preferências do próprio usuário autenticado
CREATE OR REPLACE FUNCTION public.update_user_preferences(p_preferences JSONB)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: É necessário estar autenticado.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET preferences = COALESCE(preferences, '{}'::jsonb) || p_preferences,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Preferências atualizadas com sucesso.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.update_user_preferences(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_user_preferences(JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
