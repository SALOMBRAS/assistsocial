-- ==============================================================================
-- ASSISTSOCIAL - MIGRATION 05: AUTH, PROFILES & PRIVACY HARDENING
-- Atualizações aditivas e não-destrutivas para integração com Auth e Telas de Login
-- ==============================================================================

-- 1. ATUALIZAÇÃO DA TRIGGER DE AUTO-CRIAÇÃO DE PERFIL
-- Captura full_name e phone enviados pelo frontend no options.data do signUp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    'social_worker'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 2. BLINDAGEM DE PRIVACIDADE NO RLS DE PROFILES
-- Substitui a leitura pública por isolamento estrito:
-- O usuário consulta apenas o seu próprio perfil OU perfis com quem mantém colaboração ativa aceita
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.resource_shares s
      WHERE s.status = 'accepted'
        AND (
          (s.owner_id = auth.uid() AND s.invited_user_id = profiles.id)
          OR (s.invited_user_id = auth.uid() AND s.owner_id = profiles.id)
        )
    )
  );
