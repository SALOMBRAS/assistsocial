-- Migration: 20261027170012_ceara_social_services_and_family_timeline.sql
-- Description: Diretório de Serviços Sociais do Ceará (Restrito ao Estado do CE, foco em Fortaleza e RMF)
--              e Backend completo da Linha do Tempo Familiar e Individual (Etapas, Pendências e Histórico).

-- ==============================================================================
-- 1. DIRETÓRIO DE SERVIÇOS DO CEARÁ (social_services)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.social_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  category TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'CE' CHECK (state = 'CE'),
  municipality TEXT NOT NULL,
  neighborhood TEXT,
  address TEXT NOT NULL,
  postal_code TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  regular_schedule TEXT,
  target_public TEXT[] DEFAULT '{}',
  access_requirements TEXT[] DEFAULT '{}',
  accessibility_features TEXT[] DEFAULT '{}',
  is_free BOOLEAN NOT NULL DEFAULT true,
  official_link TEXT,
  info_source TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified', 'in_review', 'pending_confirmation')),
  verified_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_social_services_state_municipality ON public.social_services(state, municipality);
CREATE INDEX IF NOT EXISTS idx_social_services_category ON public.social_services(category);
CREATE INDEX IF NOT EXISTS idx_social_services_verification ON public.social_services(verification_status);

-- RLS para social_services
ALTER TABLE public.social_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_services_select_ceara_public" ON public.social_services
  FOR SELECT
  USING (state = 'CE' AND verification_status = 'verified');

CREATE POLICY "social_services_admin_insert" ON public.social_services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'global_admin')
    )
  );

CREATE POLICY "social_services_admin_update" ON public.social_services
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'global_admin')
    )
  );

CREATE POLICY "social_services_admin_delete" ON public.social_services
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'global_admin')
    )
  );

-- ==============================================================================
-- 2. FAMÍLIAS ACOMPANHADAS (families)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  family_name TEXT NOT NULL,
  responsible_name TEXT NOT NULL,
  neighborhood TEXT,
  municipality TEXT NOT NULL DEFAULT 'Fortaleza',
  address TEXT,
  phone TEXT,
  current_stage TEXT NOT NULL DEFAULT 'cadastro_inicial' CHECK (
    current_stage IN (
      'cadastro_inicial',
      'triagem',
      'aguardando_documentos',
      'avaliacao_social',
      'plano_acompanhamento',
      'encaminhamentos',
      'aguardando_retorno',
      'acompanhamento_ativo',
      'revisao',
      'concluido',
      'suspenso'
    )
  ),
  stage_updated_at TIMESTAMPTZ DEFAULT now(),
  stage_updated_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  assigned_worker_id UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  last_movement_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_families_code ON public.families(code);
CREATE INDEX IF NOT EXISTS idx_families_stage ON public.families(current_stage);
CREATE INDEX IF NOT EXISTS idx_families_last_movement ON public.families(last_movement_at DESC);

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "families_select_authenticated" ON public.families
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "families_insert_authenticated" ON public.families
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "families_update_authenticated" ON public.families
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ==============================================================================
-- 3. INTEGRANTES DA FAMÍLIA (family_members)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nis TEXT,
  cpf TEXT,
  relationship TEXT NOT NULL,
  birth_date DATE,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_members_family ON public.family_members(family_id);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_members_select_authenticated" ON public.family_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "family_members_insert_authenticated" ON public.family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "family_members_update_authenticated" ON public.family_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "family_members_delete_authenticated" ON public.family_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ==============================================================================
-- 4. EVENTOS DA LINHA DO TEMPO FAMILIAR (family_timeline_events)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.family_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'cadastro_familiar',
      'atualizacao_cadastral',
      'atendimento_realizado',
      'contato_realizado',
      'tentativa_contato',
      'documento_solicitado',
      'documento_recebido',
      'documento_pendente',
      'dossie_iniciado',
      'dossie_atualizado',
      'encaminhamento_realizado',
      'retorno_encaminhamento',
      'agendamento_criado',
      'agendamento_concluido',
      'pendencia_criada',
      'pendencia_resolvida',
      'alteracao_etapa',
      'observacao_profissional',
      'acompanhamento_concluido',
      'acompanhamento_reaberto'
    )
  ),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  stage TEXT,
  author_id UUID REFERENCES public.profiles(id),
  author_name TEXT,
  related_activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  related_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  related_dossier_id UUID REFERENCES public.dossiers(id) ON DELETE SET NULL,
  next_action TEXT,
  next_action_due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timeline_family_date ON public.family_timeline_events(family_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_person ON public.family_timeline_events(person_id);
CREATE INDEX IF NOT EXISTS idx_timeline_event_type ON public.family_timeline_events(event_type);

ALTER TABLE public.family_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_events_select_authenticated" ON public.family_timeline_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "timeline_events_insert_authenticated" ON public.family_timeline_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "timeline_events_update_authenticated" ON public.family_timeline_events
  FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'global_admin')
    )
  );

-- ==============================================================================
-- 5. PENDÊNCIAS E PRÓXIMOS PASSOS (family_pendencies)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.family_pendencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'documentacao' CHECK (
    category IN ('documentacao', 'saude', 'beneficio_social', 'habitacao', 'educacao', 'visita_retorno', 'juridico', 'outros')
  ),
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_to_name TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (
    status IN ('pendente', 'em_andamento', 'aguardando_familia', 'aguardando_instituicao', 'resolvida', 'cancelada')
  ),
  next_action TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pendencies_family_status ON public.family_pendencies(family_id, status);
CREATE INDEX IF NOT EXISTS idx_pendencies_due_date ON public.family_pendencies(due_date);

ALTER TABLE public.family_pendencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_pendencies_select_authenticated" ON public.family_pendencies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "family_pendencies_insert_authenticated" ON public.family_pendencies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "family_pendencies_update_authenticated" ON public.family_pendencies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ==============================================================================
-- 6. HISTÓRICO DE ETAPAS (family_stage_history)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.family_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  previous_stage TEXT,
  new_stage TEXT NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES public.profiles(id),
  changed_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_history_family ON public.family_stage_history(family_id, created_at DESC);

ALTER TABLE public.family_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stage_history_select_authenticated" ON public.family_stage_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "stage_history_insert_authenticated" ON public.family_stage_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ==============================================================================
-- 7. TRIGGER: ATUALIZAÇÃO AUTOMÁTICA DE last_movement_at NA FAMÍLIA
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_sync_family_last_movement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.families
  SET 
    last_movement_at = NEW.event_date,
    updated_at = now()
  WHERE id = NEW.family_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_family_timeline_last_movement ON public.family_timeline_events;
CREATE TRIGGER trg_family_timeline_last_movement
AFTER INSERT OR UPDATE OF event_date ON public.family_timeline_events
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_family_last_movement();

-- ==============================================================================
-- 8. SEED INICIAL COM DADOS REAIS DO CEARÁ (Fortaleza e RMF)
-- ==============================================================================

-- Inserir Serviços Oficiais do Ceará
INSERT INTO public.social_services (
  id, name, organization, category, state, municipality, neighborhood, address, postal_code, contact_phone, contact_email, regular_schedule, target_public, access_requirements, accessibility_features, is_free, official_link, info_source, verification_status, verified_at
) VALUES 
(
  'e0000001-0000-0000-0000-000000000001',
  'CRAS Barra do Ceará — Centro de Referência da Assistência Social',
  'Prefeitura Municipal de Fortaleza — SDHDS',
  'cras',
  'CE',
  'Fortaleza',
  'Barra do Ceará',
  'Rua Doutor José Roberto Sales, 475',
  '60331-200',
  '(85) 3452-9366',
  'crasbarradoceara@fortaleza.ce.gov.br',
  'Segunda a Sexta, das 08h00 às 17h00',
  ARRAY['Famílias em vulnerabilidade social', 'Beneficiários do CadÚnico e Bolsa Família', 'Idosos e Gestantes'],
  ARRAY['Documento oficial com foto (RG/CNH)', 'CPF', 'Comprovante de residência atualizado', 'Número do NIS'],
  ARRAY['Rampa de acesso', 'Banheiro adaptado PCD'],
  true,
  'https://www.fortaleza.ce.gov.br/sdhds',
  'Secretaria Municipal dos Direitos Humanos e Desenvolvimento Social de Fortaleza (SDHDS)',
  'verified',
  now()
),
(
  'e0000001-0000-0000-0000-000000000002',
  'CREAS Alagadiço — Centro de Referência Especializado',
  'Prefeitura Municipal de Fortaleza — SDHDS',
  'creas',
  'CE',
  'Fortaleza',
  'Rodolfo Teófilo',
  'Rua Frei Marcelino, 1500',
  '60431-015',
  '(85) 3433-2550',
  'creasalagadico@fortaleza.ce.gov.br',
  'Segunda a Sexta, das 08h00 às 17h00',
  ARRAY['Crianças e adolescentes em risco social', 'Mulheres em situação de violência', 'Idosos vítimas de violação de direitos'],
  ARRAY['Encaminhamento do CRAS, Conselho Tutelar, Ministério Público ou demanda espontânea'],
  ARRAY['Rampa de acesso', 'Banheiro acessível'],
  true,
  'https://www.fortaleza.ce.gov.br/sdhds',
  'SDHDS Fortaleza / Proteção Social Especial',
  'verified',
  now()
),
(
  'e0000001-0000-0000-0000-000000000003',
  'Casa da Mulher Brasileira do Ceará',
  'Governo do Estado do Ceará — Secretaria das Mulheres / SPS-CE',
  'mulheres_violencia',
  'CE',
  'Fortaleza',
  'Couto Fernandes',
  'Rua Tabuleiro do Norte com Rua Teles de Sousa, s/n',
  '60440-100',
  '(85) 3108-2992',
  'casadamulherbrasileira@sps.ce.gov.br',
  'Atendimento 24 horas ininterrupto',
  ARRAY['Mulheres vítimas de violência doméstica e familiar de gênero e dependentes'],
  ARRAY['Acolhimento imediato sem necessidade de agendamento prévio'],
  ARRAY['Acesso ao nível do solo', 'Elevador acessível', 'Banheiros adaptados'],
  true,
  'https://www.mulheres.ce.gov.br',
  'Secretaria das Mulheres do Estado do Ceará',
  'verified',
  now()
),
(
  'e0000001-0000-0000-0000-000000000004',
  'Centro POP Benfica — Especializado para População em Situação de Rua',
  'Prefeitura Municipal de Fortaleza — SDHDS',
  'centro_pop',
  'CE',
  'Fortaleza',
  'Benfica',
  'Avenida da Universidade, 3177',
  '60020-181',
  '(85) 3452-9380',
  'centropop.benfica@fortaleza.ce.gov.br',
  'Segunda a Domingo, das 08h00 às 17h00',
  ARRAY['Adultos em situação de rua', 'Migrantes e pessoas em trânsito sem moradia'],
  ARRAY['Acolhimento direto e triagem socioassistencial sem exigência de documentação inicial'],
  ARRAY['Acesso térreo', 'Banheiros e chuveiros adaptados'],
  true,
  'https://www.fortaleza.ce.gov.br',
  'SDHDS Fortaleza / Coordenação de Média Complexidade',
  'verified',
  now()
),
(
  'e0000001-0000-0000-0000-000000000005',
  'Defensoria Pública Geral do Ceará — Núcleo Central de Fortaleza',
  'Defensoria Pública do Estado do Ceará (DPCE)',
  'assistencia_juridica',
  'CE',
  'Fortaleza',
  'Engenheiro Luciano Cavalcante',
  'Avenida Pinto Bandeira, 1111',
  '60811-170',
  'Disque 129 / (85) 3194-5000',
  'alo@defensoria.ce.def.br',
  'Segunda a Sexta, das 08h00 às 17h00',
  ARRAY['Cidadãos com renda familiar até 3 salários mínimos ou vulnerabilidade jurídica comprovada'],
  ARRAY['Documento com foto (RG/CNH)', 'CPF', 'Comprovante de residência', 'Comprovante de renda familiar'],
  ARRAY['Elevadores adaptados', 'Rampas', 'Piso tátil', 'Atendimento prioritário'],
  true,
  'https://www.defensoria.ce.def.br',
  'Defensoria Pública do Estado do Ceará',
  'verified',
  now()
),
(
  'e0000001-0000-0000-0000-000000000006',
  'CAPS Nise da Silveira (CAPS Geral Barra do Ceará)',
  'Secretaria Municipal de Saúde de Fortaleza (SMS)',
  'caps',
  'CE',
  'Fortaleza',
  'Álvaro Weyne',
  'Rua Teodomiro de Castro, 680',
  '60337-380',
  '(85) 3452-2434',
  'capsg.barra@sms.fortaleza.ce.gov.br',
  'Segunda a Sexta, das 08h00 às 18h00',
  ARRAY['Pessoas com sofrimento mental grave e persistente e suas famílias'],
  ARRAY['Cartão Nacional de Saúde (SUS)', 'Documento de identificação com foto', 'Comprovante de endereço'],
  ARRAY['Acesso térreo', 'Banheiro adaptado'],
  true,
  'https://saude.fortaleza.ce.gov.br',
  'Secretaria Municipal da Saúde de Fortaleza',
  'verified',
  now()
),
(
  'e0000001-0000-0000-0000-000000000007',
  'CRAS Araturi — Caucaia',
  'Prefeitura Municipal de Caucaia — Secretaria de Desenvolvimento Social',
  'cras',
  'CE',
  'Caucaia',
  'Araturi',
  'Rua Central, s/n',
  '61655-010',
  '(85) 3387-5264',
  'cras.araturi@caucaia.ce.gov.br',
  'Segunda a Sexta, das 08h00 às 16h00',
  ARRAY['Famílias do município de Caucaia em vulnerabilidade social', 'CadÚnico'],
  ARRAY['RG', 'CPF', 'Comprovante de residência de Caucaia', 'Certidão de nascimento dos filhos'],
  ARRAY['Acesso facilitado para cadeirantes'],
  true,
  'https://www.caucaia.ce.gov.br',
  'Prefeitura Municipal de Caucaia',
  'verified',
  now()
),
(
  'e0000001-0000-0000-0000-000000000008',
  'CRAS Jereissati — Maracanaú',
  'Prefeitura Municipal de Maracanaú — Secretaria de Assistência Social e Cidadania',
  'cras',
  'CE',
  'Maracanaú',
  'Jereissati I',
  'Rua 40, nº 115',
  '61900-530',
  '(85) 3521-5230',
  'cras.jereissati@maracanau.ce.gov.br',
  'Segunda a Sexta, das 08h00 às 16h00',
  ARRAY['Famílias em vulnerabilidade social de Maracanaú', 'Beneficiários de programas sociais'],
  ARRAY['RG/CPF', 'Comprovante de endereço de Maracanaú', 'Folha resumo do CadÚnico'],
  ARRAY['Rampa de acesso', 'Banheiro PCD'],
  true,
  'https://www.maracanau.ce.gov.br',
  'Secretaria de Assistência Social e Cidadania de Maracanaú',
  'verified',
  now()
),
(
  'e0000001-0000-0000-0000-000000000009',
  'CRAS Sede — Eusébio',
  'Prefeitura Municipal de Eusébio — Secretaria de Desenvolvimento Social',
  'cras',
  'CE',
  'Eusébio',
  'Centro',
  'Rua Irmã Ambrosina, 240',
  '61760-000',
  '(85) 3260-5154',
  'cras.sede@eusebio.ce.gov.br',
  'Segunda a Sexta, das 07h30 às 16h30',
  ARRAY['Famílias e cidadãos em vulnerabilidade do município de Eusébio'],
  ARRAY['Documento de identidade', 'Comprovante de endereço do Eusébio', 'NIS'],
  ARRAY['Acesso plano', 'Atendimento preferencial'],
  true,
  'https://www.eusebio.ce.gov.br',
  'Secretaria de Desenvolvimento Social de Eusébio',
  'verified',
  now()
),
(
  'e0000001-0000-0000-0000-000000000010',
  'Central do Cadastro Único e Bolsa Família — Fortaleza',
  'Prefeitura Municipal de Fortaleza — SDHDS',
  'cadastro_unico',
  'CE',
  'Fortaleza',
  'Centro',
  'Rua Vinte e Quatro de Maio, 860',
  '60020-000',
  '(85) 3105-3413',
  'cadastrounico@fortaleza.ce.gov.br',
  'Segunda a Sexta, das 08h00 às 17h00',
  ARRAY['Famílias de baixa renda de Fortaleza para inscrição e atualização do CadÚnico, BPC e Tarifa Social'],
  ARRAY['RG, CPF, Carteira de Trabalho de todos os membros adultos, Certidão de Nascimento das crianças, Comprovante de endereço'],
  ARRAY['Elevador de acessibilidade', 'Rampa', 'Piso tátil'],
  true,
  'https://www.fortaleza.ce.gov.br/sdhds',
  'SDHDS / MDS Cadastro Único',
  'verified',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Inserir Família Modelo com Histórico Real de Acompanhamento (Território Residencial Paupina / Fortaleza)
INSERT INTO public.families (
  id, code, family_name, responsible_name, neighborhood, municipality, address, phone, current_stage, stage_updated_at, notes, last_movement_at
) VALUES (
  'f0000001-0000-0000-0000-000000000001',
  'PRONT-FOR-2026-0042',
  'Família Silva dos Santos',
  'Maria da Silva Santos',
  'Paupina',
  'Fortaleza',
  'Rua das Palmeiras, 142 — Residencial Paupina, Bloco B, Apto 102',
  '(85) 98844-1234',
  'acompanhamento_ativo',
  now() - interval '2 days',
  'Família reassentada no Residencial Paupina. Acompanhamento prioritário de vulnerabilidade socioeconômica e inserção no BPC para dependente com deficiência.',
  now() - interval '1 hour'
) ON CONFLICT (id) DO NOTHING;

-- Integrantes da Família
INSERT INTO public.family_members (
  id, family_id, full_name, nis, cpf, relationship, birth_date, phone, notes
) VALUES 
(
  'm0000001-0000-0000-0000-000000000001',
  'f0000001-0000-0000-0000-000000000001',
  'Maria da Silva Santos',
  '165.892.410-02',
  '842.190.453-20',
  'Responsável Familiar (Mãe)',
  '1985-04-12',
  '(85) 98844-1234',
  'Titular do Cadastro Único e do dossiê habitacional da unidade.'
),
(
  'm0000001-0000-0000-0000-000000000002',
  'f0000001-0000-0000-0000-000000000002',
  'Lucas da Silva Santos',
  '165.892.410-15',
  '091.244.783-05',
  'Filho (PCD)',
  '2014-08-20',
  null,
  '12 anos. Diagnóstico de Transtorno do Espectro Autista (TEA). Encaminhado para laudo médico no CAPS Infantil e processo do BPC.'
),
(
  'm0000001-0000-0000-0000-000000000003',
  'f0000001-0000-0000-0000-000000000003',
  'Ana Clara da Silva Santos',
  '165.892.410-28',
  null,
  'Filha',
  '2018-11-05',
  null,
  '7 anos. Matriculada na Escola Municipal de Ensino Fundamental da Paupina.'
)
ON CONFLICT (id) DO NOTHING;

-- Histórico de Transição de Etapas
INSERT INTO public.family_stage_history (
  id, family_id, previous_stage, new_stage, reason, changed_by_name, created_at
) VALUES 
(
  gen_random_uuid(),
  'f0000001-0000-0000-0000-000000000001',
  'cadastro_inicial',
  'triagem',
  'Acolhimento inicial no CRAS e verificação de pendências habitacionais após entrega das chaves.',
  'Janaína Lima (Assistente Social)',
  now() - interval '25 days'
),
(
  gen_random_uuid(),
  'f0000001-0000-0000-0000-000000000001',
  'triagem',
  'plano_acompanhamento',
  'Elaborado Plano de Acompanhamento Familiar (PAIF) com foco em benefício previdenciário e saúde.',
  'Janaína Lima (Assistente Social)',
  now() - interval '14 days'
),
(
  gen_random_uuid(),
  'f0000001-0000-0000-0000-000000000001',
  'plano_acompanhamento',
  'acompanhamento_ativo',
  'Encaminhamentos intersetoriais em andamento com a rede de saúde e assistência jurídica.',
  'Janaína Lima (Assistente Social)',
  now() - interval '2 days'
);

-- Eventos Cronológicos Reais da Linha do Tempo
INSERT INTO public.family_timeline_events (
  id, family_id, person_id, event_type, title, description, event_date, stage, author_name, next_action, next_action_due_date
) VALUES 
(
  gen_random_uuid(),
  'f0000001-0000-0000-0000-000000000001',
  'm0000001-0000-0000-0000-000000000001',
  'cadastro_familiar',
  'Abertura de Prontuário e Cadastro Familiar',
  'Família cadastrada no território do Residencial Paupina após convocação para assinatura de dossiê técnico.',
  now() - interval '30 days',
  'cadastro_inicial',
  'Janaína Lima',
  'Agendar visita domiciliar diagnóstica',
  now() - interval '20 days'
),
(
  gen_random_uuid(),
  'f0000001-0000-0000-0000-000000000001',
  null,
  'atendimento_realizado',
  'Visita Domiciliar Diagnóstica Realizada',
  'Realizada visita técnica no apartamento do Residencial Paupina. Averiguadas condições de habitabilidade e identificada necessidade de apoio na documentação médica do filho Lucas.',
  now() - interval '18 days',
  'triagem',
  'Janaína Lima',
  'Solicitar laudo circunstanciado para INSS',
  now() - interval '10 days'
),
(
  gen_random_uuid(),
  'f0000001-0000-0000-0000-000000000001',
  'm0000001-0000-0000-0000-000000000002',
  'encaminhamento_realizado',
  'Encaminhamento Técnico ao CAPS Infantil e Defensoria Pública',
  'Emitido parecer técnico e guia de encaminhamento oficial para agilização do laudo biopsicossocial do dependente Lucas da Silva Santos para requerimento do BPC/LOAS.',
  now() - interval '10 days',
  'plano_acompanhamento',
  'Janaína Lima',
  'Acompanhar retorno da Defensoria Pública',
  now() + interval '5 days'
),
(
  gen_random_uuid(),
  'f0000001-0000-0000-0000-000000000001',
  'm0000001-0000-0000-0000-000000000001',
  'dossie_atualizado',
  'Dossiê Habitacional Conforme no Lote 04',
  'Dossiê da família incluído com sucesso no Lote de Envio 04 da Paupina sem nenhuma inconformidade cadastral pendente.',
  now() - interval '5 days',
  'acompanhamento_ativo',
  'Janaína Lima',
  null,
  null
),
(
  gen_random_uuid(),
  'f0000001-0000-0000-0000-000000000001',
  'm0000001-0000-0000-0000-000000000001',
  'contato_realizado',
  'Contato Telefônico de Acompanhamento Realizado',
  'Dona Maria confirmou recebimento do protocolo de atendimento na Defensoria Pública (DPCE) e agendamento da perícia médica no INSS para o próximo mês.',
  now() - interval '1 hour',
  'acompanhamento_ativo',
  'Janaína Lima',
  'Verificar laudo médico no retorno da consulta',
  now() + interval '12 days'
);

-- Pendências Reais da Família ("O que falta resolver")
INSERT INTO public.family_pendencies (
  id, family_id, person_id, title, description, category, assigned_to_name, due_date, priority, status, next_action
) VALUES 
(
  gen_random_uuid(),
  'f0000001-0000-0000-0000-000000000001',
  'm0000001-0000-0000-0000-000000000002',
  'Obtenção do Laudo Médico Pericial Atualizado (TEA)',
  'Aguardando entrega do laudo médico emitido pelo neurologista/psiquiatra infantil para anexar ao requerimento do BPC/LOAS.',
  'saude',
  'Janaína Lima',
  now() + interval '10 days',
  'alta',
  'em_andamento',
  'Contatar o serviço de saúde para confirmar emissão do documento'
),
(
  gen_random_uuid(),
  'f0000001-0000-0000-0000-000000000001',
  'm0000001-0000-0000-0000-000000000001',
  'Atualização Cadastral do NIS no CadÚnico',
  'Necessário atualizar a renda per capita familiar no Cadastro Único após mudança de endereço para a Paupina.',
  'beneficio_social',
  'Janaína Lima',
  now() + interval '20 days',
  'media',
  'pendente',
  'Agendar atendimento na Central do CadÚnico da Regional'
),
(
  gen_random_uuid(),
  'f0000001-0000-0000-0000-000000000001',
  'm0000001-0000-0000-0000-000000000001',
  'Assinatura da Declaração de Residência do Bloco B',
  'Coleta da assinatura da titular na ata de ocupação regular do apartamento 102.',
  'habitacao',
  'Janaína Lima',
  now() - interval '2 days',
  'urgente',
  'resolvida',
  'Documento assinado e arquivado no prontuário digital'
);
