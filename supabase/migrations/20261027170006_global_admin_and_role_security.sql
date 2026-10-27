-- ==============================================================================
-- ASSISTSOCIAL - MIGRATION 06: GLOBAL ADMIN ROLE & PRIVILEGE ESCALATION PROTECTION
-- ==============================================================================

-- 1. VALIDAÇÃO DE PAPÉIS PERMITIDOS
-- Garante que 'global_admin' seja um papel oficialmente reconhecido no esquema
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

-- 2. REGRA DE NEGÓCIO: APENAS UMA CONTA PODE OCUPAR O PAPEL 'global_admin'
-- Índice único condicional que impede múltiplos administradores globais no sistema
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_global_admin
  ON public.profiles (role)
  WHERE role = 'global_admin';

-- 3. FUNÇÃO AUXILIAR: VERIFICA SE O USUÁRIO É ADMINISTRADORA GLOBAL
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

-- 4. TRIGGER: PREVENÇÃO CONTRA AUTO-ELEVAÇÃO DE PRIVILÉGIOS (ROLE ESCALATION)
-- Impede que usuários comuns alterem seu próprio papel para 'global_admin' via API
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o papel estiver sendo modificado
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Requisições autenticadas comuns não podem alterar o campo role
    IF auth.role() = 'authenticated' THEN
      -- Apenas quem JÁ É global_admin pode alterar papéis de perfis
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
