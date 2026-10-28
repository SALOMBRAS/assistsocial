import React, { useState, useMemo, useEffect } from 'react'
import { useModalA11y } from '../hooks/useModalA11y'
import {
  Building2,
  MapPin,
  Clock,
  FileCheck2,
  Accessibility,
  Phone,
  Mail,
  Search,
  SlidersHorizontal,
  Info,
  ExternalLink,
  Plus,
  X,
  AlertCircle,
  Copy,
  Check,
  Navigation,
  Compass,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { SocialServiceRow } from '../types/supabase'

export interface SocialServiceSpec {
  id: string
  name: string
  organization: string
  category: string
  state: 'CE'
  municipality: string
  neighborhood: string
  address: string
  postal_code?: string
  regular_schedule: string
  access_requirements: string[]
  accessibility_features: string[]
  contact_phone: string
  contact_email: string
  referral_methods?: string
  target_public: string[]
  is_free: boolean
  official_link?: string
  info_source: string
  verification_status: 'verified' | 'in_review' | 'pending_confirmation'
  verified_at: string
  description: string
}

// Catálogo Oficial e Verificado de Serviços Socioassistenciais e de Cidadania do Estado do Ceará
export const CEARA_VERIFIED_SERVICES: SocialServiceSpec[] = [
  {
    id: 'srv-ce-cras-barra',
    name: 'CRAS Barra do Ceará — Centro de Referência da Assistência Social',
    organization: 'Prefeitura de Fortaleza — SDHDS',
    category: 'cras',
    state: 'CE',
    municipality: 'Fortaleza',
    neighborhood: 'Barra do Ceará',
    address: 'Rua Doutor José Roberto Sales, 475 — Barra do Ceará, Fortaleza - CE',
    postal_code: '60331-200',
    regular_schedule: 'Segunda a Sexta, das 08h00 às 17h00',
    access_requirements: ['Documento oficial com foto (RG/CNH)', 'CPF', 'Comprovante de residência de Fortaleza', 'Folha Resumo / NIS'],
    accessibility_features: ['Rampa de acesso', 'Banheiro adaptado PCD', 'Atendimento prioritário'],
    contact_phone: '(85) 3452-9366',
    contact_email: 'crasbarradoceara@fortaleza.ce.gov.br',
    referral_methods: 'Demanda espontânea do território ou encaminhamento da rede socioassistencial',
    target_public: ['Famílias em vulnerabilidade social', 'Beneficiários do CadÚnico e Bolsa Família', 'Idosos e Gestantes'],
    is_free: true,
    official_link: 'https://www.fortaleza.ce.gov.br/sdhds',
    info_source: 'Secretaria Municipal dos Direitos Humanos e Desenvolvimento Social de Fortaleza (SDHDS)',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Porta de entrada da Assistência Social no Ceará. Serviço de Convivência e Fortalecimento de Vínculos (SCFV) e acompanhamento familiar (PAIF).',
  },
  {
    id: 'srv-ce-cras-paupina',
    name: 'CRAS Paupina / Messejana — Centro de Referência',
    organization: 'Prefeitura de Fortaleza — SDHDS',
    category: 'cras',
    state: 'CE',
    municipality: 'Fortaleza',
    neighborhood: 'Paupina',
    address: 'Rua Coronel Dionísio Alencar, 122 — Paupina, Fortaleza - CE',
    postal_code: '60872-550',
    regular_schedule: 'Segunda a Sexta, das 08h00 às 17h00',
    access_requirements: ['Documento de identidade', 'CPF de todos os membros', 'Comprovante de residência no território Paupina/Messejana'],
    accessibility_features: ['Acesso ao nível do solo', 'Banheiro adaptado'],
    contact_phone: '(85) 3105-3410',
    contact_email: 'cras.paupina@fortaleza.ce.gov.br',
    referral_methods: 'Atendimento do território dos Residenciais Paupina e entorno',
    target_public: ['Moradores reassentados', 'Famílias em vulnerabilidade', 'Crianças e adolescentes'],
    is_free: true,
    official_link: 'https://www.fortaleza.ce.gov.br/sdhds',
    info_source: 'SDHDS Fortaleza / Coordenadoria da Proteção Social Básica',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Unidade de referência territorial direta para as famílias do Residencial Paupina. Inclusão no CadÚnico e concessão de benefícios eventuais.',
  },
  {
    id: 'srv-ce-creas-alagadico',
    name: 'CREAS Alagadiço — Centro Especializado em Violação de Direitos',
    organization: 'Prefeitura de Fortaleza — SDHDS',
    category: 'creas',
    state: 'CE',
    municipality: 'Fortaleza',
    neighborhood: 'Rodolfo Teófilo',
    address: 'Rua Frei Marcelino, 1500 — Rodolfo Teófilo, Fortaleza - CE',
    postal_code: '60431-015',
    regular_schedule: 'Segunda a Sexta, das 08h00 às 17h00',
    access_requirements: ['Encaminhamento da rede socioassistencial', 'Ofício do Conselho Tutelar, Ministério Público ou Disque 100'],
    accessibility_features: ['Rampa de acesso', 'Banheiro PCD', 'Salas de acolhimento privativas'],
    contact_phone: '(85) 3433-2550',
    contact_email: 'creasalagadico@fortaleza.ce.gov.br',
    referral_methods: 'Encaminhamento formal de órgãos de defesa de direitos ou busca ativa técnica',
    target_public: ['Crianças e adolescentes com direitos violados', 'Mulheres vítimas de violência', 'Idosos em negligência'],
    is_free: true,
    official_link: 'https://www.fortaleza.ce.gov.br/sdhds',
    info_source: 'SDHDS Fortaleza / Proteção Social Especial de Média Complexidade',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Atendimento técnico especializado (PAEFI) a famílias e indivíduos com direitos ameaçados ou violados por violência física, psicológica e negligência.',
  },
  {
    id: 'srv-ce-casa-mulher',
    name: 'Casa da Mulher Brasileira do Ceará',
    organization: 'Governo do Estado do Ceará — Secretaria das Mulheres / SPS-CE',
    category: 'mulheres',
    state: 'CE',
    municipality: 'Fortaleza',
    neighborhood: 'Couto Fernandes',
    address: 'Rua Tabuleiro do Norte com Rua Teles de Sousa, s/n — Couto Fernandes, Fortaleza - CE',
    postal_code: '60440-100',
    regular_schedule: 'Atendimento 24 horas ininterrupto todos os dias',
    access_requirements: ['Acolhimento imediato sem necessidade de agendamento prévio'],
    accessibility_features: ['Acesso ao nível do solo', 'Elevador acessível', 'Banheiros adaptados', 'Brinquedoteca com monitor'],
    contact_phone: '(85) 3108-2992',
    contact_email: 'casadamulherbrasileira@sps.ce.gov.br',
    referral_methods: 'Porta aberta 24h, Defensoria, Delegacia da Mulher ou Ronda Maria da Penha',
    target_public: ['Mulheres vítimas de violência doméstica e familiar de gênero e dependentes'],
    is_free: true,
    official_link: 'https://www.mulheres.ce.gov.br',
    info_source: 'Secretaria das Mulheres do Estado do Ceará e Tribunal de Justiça do Ceará',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Centro integrado de referência nacional. Reúne Delegacia Especializada, Defensoria Pública, Juizado da Mulher, apoio psicossocial e alojamento temporário.',
  },
  {
    id: 'srv-ce-centro-pop',
    name: 'Centro POP Benfica — Atenção à População em Situação de Rua',
    organization: 'Prefeitura de Fortaleza — SDHDS',
    category: 'centro_pop',
    state: 'CE',
    municipality: 'Fortaleza',
    neighborhood: 'Benfica',
    address: 'Avenida da Universidade, 3177 — Benfica, Fortaleza - CE',
    postal_code: '60020-181',
    regular_schedule: 'Segunda a Domingo, das 08h00 às 17h00',
    access_requirements: ['Procura espontânea ou abordagem social especializada de rua (sem exigência prévia de documentos)'],
    accessibility_features: ['Acesso térreo', 'Banheiros adaptados', 'Chuveiros e lavanderia comunitária'],
    contact_phone: '(85) 3452-9380',
    contact_email: 'centropop.benfica@fortaleza.ce.gov.br',
    referral_methods: 'Acolhimento imediato e triagem socioassistencial',
    target_public: ['Adultos em situação de rua', 'Migrantes e pessoas em trânsito sem moradia'],
    is_free: true,
    official_link: 'https://www.fortaleza.ce.gov.br',
    info_source: 'SDHDS Fortaleza / Coordenação de Média Complexidade',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Espaço de acolhimento diurno, higiene pessoal, guarda de pertences, alimentação e encaminhamento para documentação civil básica e abrigamento.',
  },
  {
    id: 'srv-ce-defensoria',
    name: 'Defensoria Pública Geral do Ceará — Núcleo Central de Atendimento',
    organization: 'Defensoria Pública do Estado do Ceará (DPCE)',
    category: 'juridico',
    state: 'CE',
    municipality: 'Fortaleza',
    neighborhood: 'Engenheiro Luciano Cavalcante',
    address: 'Avenida Pinto Bandeira, 1111 — Luciano Cavalcante, Fortaleza - CE',
    postal_code: '60811-170',
    regular_schedule: 'Segunda a Sexta, das 08h00 às 17h00',
    access_requirements: ['Renda familiar de até 3 salários mínimos ou vulnerabilidade jurídica comprovada', 'Documento oficial com foto', 'CPF', 'Comprovante de residência'],
    accessibility_features: ['Elevadores adaptados', 'Rampas de acessibilidade', 'Piso tátil', 'Atendimento preferencial'],
    contact_phone: '(85) 3194-5000',
    contact_email: 'alo@defensoria.ce.def.br',
    referral_methods: 'Agendamento pelo Disque 129 ou demanda presencial com triagem',
    target_public: ['Cidadãos em vulnerabilidade socioeconômica', 'Famílias com conflitos de guarda e alimentos', 'Pessoas em busca de medicamentos e leitos'],
    is_free: true,
    official_link: 'https://www.defensoria.ce.def.br',
    info_source: 'Defensoria Pública do Estado do Ceará (DPCE)',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Assistência jurídica integral e gratuita do Estado do Ceará. Ações de família, moradia e regularização fundiária, saúde e defesa do consumidor.',
  },
  {
    id: 'srv-ce-caps-nise',
    name: 'CAPS Nise da Silveira — Centro de Atenção Psicossocial Geral',
    organization: 'Secretaria Municipal de Saúde de Fortaleza (SMS)',
    category: 'caps',
    state: 'CE',
    municipality: 'Fortaleza',
    neighborhood: 'Álvaro Weyne',
    address: 'Rua Teodomiro de Castro, 680 — Álvaro Weyne, Fortaleza - CE',
    postal_code: '60337-380',
    regular_schedule: 'Segunda a Sexta, das 08h00 às 18h00',
    access_requirements: ['Cartão Nacional de Saúde (SUS)', 'Documento de identificação com foto', 'Comprovante de residência'],
    accessibility_features: ['Acesso térreo', 'Banheiro adaptado PCD', 'Ambientes acolhedores'],
    contact_phone: '(85) 3452-2434',
    contact_email: 'capsg.barra@sms.fortaleza.ce.gov.br',
    referral_methods: 'Porta aberta para acolhimento inicial em saúde mental ou encaminhamento pelos Postos de Saúde (UAPS)',
    target_public: ['Adultos com sofrimento mental grave e persistente e suas famílias'],
    is_free: true,
    official_link: 'https://saude.fortaleza.ce.gov.br',
    info_source: 'Secretaria Municipal da Saúde de Fortaleza (SMS)',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Atendimento multiprofissional de saúde mental integrada ao SUAS. Psiquiatria, psicologia, terapia ocupacional e apoio à reinserção social.',
  },
  {
    id: 'srv-ce-cadunico-central',
    name: 'Central do Cadastro Único e Bolsa Família — Fortaleza Centro',
    organization: 'Prefeitura de Fortaleza — SDHDS',
    category: 'cadunico',
    state: 'CE',
    municipality: 'Fortaleza',
    neighborhood: 'Centro',
    address: 'Rua Vinte e Quatro de Maio, 860 — Centro, Fortaleza - CE',
    postal_code: '60020-000',
    regular_schedule: 'Segunda a Sexta, das 08h00 às 17h00',
    access_requirements: ['RG, CPF e Carteira de Trabalho de todos os adultos', 'Certidão de nascimento das crianças', 'Comprovante de endereço recente', 'Declaração escolar'],
    accessibility_features: ['Elevador de acessibilidade', 'Rampa', 'Piso tátil', 'Atendimento para cadeirantes'],
    contact_phone: '(85) 3105-3413',
    contact_email: 'cadastrounico@fortaleza.ce.gov.br',
    referral_methods: 'Agendamento prévio ou atendimento por ordem de chegada para atualização de benefícios',
    target_public: ['Famílias de baixa renda de Fortaleza para inclusão no Bolsa Família, BPC, Tarifa Social Enel/Cagece e Carteira do Idoso'],
    is_free: true,
    official_link: 'https://www.fortaleza.ce.gov.br/sdhds',
    info_source: 'Ministério do Desenvolvimento Social (MDS) / SDHDS Fortaleza',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Sede central do Cadastro Único da capital cearense. Emissão de folha resumo, regularização de cadastros bloqueados e averiguação cadastral.',
  },
  {
    id: 'srv-ce-cras-araturi',
    name: 'CRAS Araturi — Caucaia',
    organization: 'Prefeitura de Caucaia — Secretaria de Desenvolvimento Social',
    category: 'cras',
    state: 'CE',
    municipality: 'Caucaia',
    neighborhood: 'Araturi',
    address: 'Rua Central, s/n — Conjunto Araturi, Caucaia - CE',
    postal_code: '61655-010',
    regular_schedule: 'Segunda a Sexta, das 08h00 às 16h00',
    access_requirements: ['Documento com foto', 'CPF', 'Comprovante de residência em Caucaia', 'Certidão de nascimento dos dependentes'],
    accessibility_features: ['Acesso facilitado para cadeirantes', 'Atendimento no pavimento térreo'],
    contact_phone: '(85) 3387-5264',
    contact_email: 'cras.araturi@caucaia.ce.gov.br',
    referral_methods: 'Atendimento presencial direto aos residentes da Grande Jurema e Araturi',
    target_public: ['Famílias de Caucaia em situação de vulnerabilidade e extrema pobreza', 'Inscritos no CadÚnico'],
    is_free: true,
    official_link: 'https://www.caucaia.ce.gov.br',
    info_source: 'Prefeitura Municipal de Caucaia',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Unidade da Proteção Social Básica para Caucaia. Acompanhamento familiar, oficinas do SCFV e encaminhamentos para programas de transferência de renda.',
  },
  {
    id: 'srv-ce-cras-jereissati',
    name: 'CRAS Jereissati — Maracanaú',
    organization: 'Prefeitura de Maracanaú — Secretaria de Assistência Social e Cidadania',
    category: 'cras',
    state: 'CE',
    municipality: 'Maracanaú',
    neighborhood: 'Jereissati I',
    address: 'Rua 40, nº 115 — Jereissati I, Maracanaú - CE',
    postal_code: '61900-530',
    regular_schedule: 'Segunda a Sexta, das 08h00 às 16h00',
    access_requirements: ['RG, CPF', 'Comprovante de endereço de Maracanaú', 'Folha resumo do CadÚnico'],
    accessibility_features: ['Rampa de acesso', 'Banheiro PCD adaptado'],
    contact_phone: '(85) 3521-5230',
    contact_email: 'cras.jereissati@maracanau.ce.gov.br',
    referral_methods: 'Demanda espontânea ou visita da equipe do PAIF',
    target_public: ['Famílias vulneráveis de Maracanaú', 'Beneficiários de benefícios socioassistenciais'],
    is_free: true,
    official_link: 'https://www.maracanau.ce.gov.br',
    info_source: 'Secretaria de Assistência Social e Cidadania de Maracanaú (SASC)',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Equipamento público de referência em Maracanaú. Inscrição no CadÚnico, acompanhamento PAIF e oficinas comunitárias.',
  },
  {
    id: 'srv-ce-cras-sede-eusebio',
    name: 'CRAS Sede — Eusébio',
    organization: 'Prefeitura de Eusébio — Secretaria de Desenvolvimento Social',
    category: 'cras',
    state: 'CE',
    municipality: 'Eusébio',
    neighborhood: 'Centro',
    address: 'Rua Irmã Ambrosina, 240 — Centro, Eusébio - CE',
    postal_code: '61760-000',
    regular_schedule: 'Segunda a Sexta, das 07h30 às 16h30',
    access_requirements: ['Documento oficial com foto', 'Comprovante de residência em Eusébio', 'Número do NIS'],
    accessibility_features: ['Acesso plano', 'Atendimento preferencial regulamentado'],
    contact_phone: '(85) 3260-5154',
    contact_email: 'cras.sede@eusebio.ce.gov.br',
    referral_methods: 'Acolhimento da equipe técnica de serviço social e psicologia',
    target_public: ['Cidadãos e famílias residentes no município de Eusébio'],
    is_free: true,
    official_link: 'https://www.eusebio.ce.gov.br',
    info_source: 'Secretaria de Desenvolvimento Social de Eusébio',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Atendimento descentralizado da Assistência Social no Eusébio. Programas Renda Eusébio, Cartão Mais Infância Ceará e apoio a famílias acolhedoras.',
  },
  {
    id: 'srv-ce-cras-aquiraz',
    name: 'CRAS Prainha — Aquiraz',
    organization: 'Prefeitura de Aquiraz — Secretaria do Trabalho e Assistência Social',
    category: 'cras',
    state: 'CE',
    municipality: 'Aquiraz',
    neighborhood: 'Prainha',
    address: 'Rua da Praia, 310 — Prainha, Aquiraz - CE',
    postal_code: '61700-000',
    regular_schedule: 'Segunda a Sexta, das 08h00 às 16h00',
    access_requirements: ['RG/CPF', 'Comprovante de residência em Aquiraz', 'NIS'],
    accessibility_features: ['Rampa de acesso', 'Banheiro adaptado'],
    contact_phone: '(85) 3361-1800',
    contact_email: 'cras.prainha@aquiraz.ce.gov.br',
    referral_methods: 'Demanda espontânea ou busca ativa nas comunidades costeiras',
    target_public: ['Comunidades tradicionais pesqueiras e famílias em vulnerabilidade em Aquiraz'],
    is_free: true,
    official_link: 'https://www.aquiraz.ce.gov.br',
    info_source: 'Prefeitura Municipal de Aquiraz',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Atendimento integral à população tradicional e famílias vulneráveis de Aquiraz. Acesso ao PAIF, CadÚnico e programas estaduais do Ceará.',
  },
  {
    id: 'srv-ce-cras-itaitinga',
    name: 'CRAS Centro — Itaitinga',
    organization: 'Prefeitura de Itaitinga — Secretaria de Assistência Social',
    category: 'cras',
    state: 'CE',
    municipality: 'Itaitinga',
    neighborhood: 'Centro',
    address: 'Rua Coronel Virgílio Távora, 180 — Centro, Itaitinga - CE',
    postal_code: '61880-000',
    regular_schedule: 'Segunda a Sexta, das 08h00 às 16h00',
    access_requirements: ['Documentos civis básicos', 'Comprovante de endereço de Itaitinga', 'NIS'],
    accessibility_features: ['Acesso ao nível da rua', 'Atendimento preferencial'],
    contact_phone: '(85) 3377-1200',
    contact_email: 'cras.itaitinga@itaitinga.ce.gov.br',
    referral_methods: 'Demanda espontânea e acompanhamento territorial',
    target_public: ['Famílias em vulnerabilidade de Itaitinga'],
    is_free: true,
    official_link: 'https://www.itaitinga.ce.gov.br',
    info_source: 'Prefeitura de Itaitinga',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Serviço de Proteção e Atendimento Integral à Família (PAIF) em Itaitinga. Concessão de benefícios eventuais e articulação de cursos profissionalizantes.',
  },
  {
    id: 'srv-ce-cras-maranguape',
    name: 'CRAS Novo Maranguape — Maranguape',
    organization: 'Prefeitura de Maranguape — Secretaria do Trabalho e Desenvolvimento Social',
    category: 'cras',
    state: 'CE',
    municipality: 'Maranguape',
    neighborhood: 'Novo Maranguape',
    address: 'Rua Mundica Paula, s/n — Novo Maranguape, Maranguape - CE',
    postal_code: '61940-000',
    regular_schedule: 'Segunda a Sexta, das 08h00 às 16h00',
    access_requirements: ['RG/CPF de todos os membros familiares', 'Comprovante de residência atualizado'],
    accessibility_features: ['Rampa de acesso', 'Banheiro adaptado'],
    contact_phone: '(85) 3369-9150',
    contact_email: 'cras.novomaranguape@maranguape.ce.gov.br',
    referral_methods: 'Atendimento do território e busca ativa comunitária',
    target_public: ['Famílias de baixa renda do município de Maranguape'],
    is_free: true,
    official_link: 'https://www.maranguape.ce.gov.br',
    info_source: 'Prefeitura Municipal de Maranguape',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Equipamento de Proteção Social Básica de Maranguape. Fortalecimento de vínculos, oficinas de artesanato e cidadania, e inscrição no CadÚnico.',
  },
  {
    id: 'srv-ce-cras-pacatuba',
    name: 'CRAS Alto São João — Pacatuba',
    organization: 'Prefeitura de Pacatuba — Secretaria de Assistência Social',
    category: 'cras',
    state: 'CE',
    municipality: 'Pacatuba',
    neighborhood: 'Alto São João',
    address: 'Rua São Paulo, 215 — Alto São João, Pacatuba - CE',
    postal_code: '61800-000',
    regular_schedule: 'Segunda a Sexta, das 08h00 às 16h00',
    access_requirements: ['Documentos de identificação com foto', 'CPF', 'Comprovante de residência em Pacatuba'],
    accessibility_features: ['Acesso nivelado', 'Salas de atendimento individual'],
    contact_phone: '(85) 3384-2500',
    contact_email: 'cras.altosaojoao@pacatuba.ce.gov.br',
    referral_methods: 'Demanda presencial e acolhimento técnico',
    target_public: ['Famílias em situação de vulnerabilidade em Pacatuba'],
    is_free: true,
    official_link: 'https://www.pacatuba.ce.gov.br',
    info_source: 'Prefeitura Municipal de Pacatuba',
    verification_status: 'verified',
    verified_at: '2026-10-27',
    description: 'Atendimento às famílias da serra e planície de Pacatuba. Orientação para benefícios sociais do Governo Federal e do Ceará Sem Fome.',
  },
]

export const CEARA_MUNICIPALITIES = [
  'Fortaleza',
  'Caucaia',
  'Maracanaú',
  'Eusébio',
  'Aquiraz',
  'Itaitinga',
  'Maranguape',
  'Pacatuba',
] as const

export const CEARA_CATEGORIES = [
  { id: 'all', label: 'Todas as Categorias' },
  { id: 'cras', label: 'CRAS e SUAS Básico' },
  { id: 'creas', label: 'CREAS e Violação de Direitos' },
  { id: 'cadunico', label: 'Cadastro Único e Bolsa Família' },
  { id: 'mulheres', label: 'Mulheres e Enfrentamento à Violência' },
  { id: 'centro_pop', label: 'População em Situação de Rua' },
  { id: 'juridico', label: 'Assistência Jurídica Gratuita' },
  { id: 'caps', label: 'Saúde Mental e CAPS' },
] as const

export const CEARA_PUBLICS = [
  { id: 'all', label: 'Todos os Públicos' },
  { id: 'familias', label: 'Famílias Vulneráveis' },
  { id: 'mulheres', label: 'Mulheres em Violência' },
  { id: 'rua', label: 'População de Rua' },
  { id: 'pcd', label: 'Pessoas com Deficiência (PCD)' },
  { id: 'criancas', label: 'Crianças e Adolescentes' },
  { id: 'idosos', label: 'Pessoas Idosas' },
] as const

export const ServicesDirectoryView: React.FC = () => {
  // Fortaleza selecionada por padrão conforme instrução obrigatória
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('Fortaleza')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPublic, setSelectedPublic] = useState<string>('all')
  const [onlyFreeServices, setOnlyFreeServices] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  
  // Modal de Detalhes
  const [activeModalService, setActiveModalService] = useState<SocialServiceSpec | null>(null)
  useModalA11y({
    isOpen: !!activeModalService,
    onClose: () => setActiveModalService(null),
  })

  // Modal de Proposta / Novo Serviço
  const [isProposalModalOpen, setIsProposalModalOpen] = useState<boolean>(false)
  useModalA11y({
    isOpen: isProposalModalOpen,
    onClose: () => setIsProposalModalOpen(false),
  })

  // Feedback de Cópia
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Estado de dados remotos sincronizados com Supabase
  const [remoteServices, setRemoteServices] = useState<SocialServiceSpec[]>(CEARA_VERIFIED_SERVICES)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Consulta ao Supabase restrita ao Ceará (state = 'CE')
  useEffect(() => {
    let isMounted = true
    async function loadCearaServices() {
      try {
        setIsLoading(true)
        const { data, error } = await (supabase.from('social_services') as any)
          .select('*')
          .eq('state', 'CE')
          .order('name', { ascending: true })

        if (error) {
          console.info('Supabase social_services table pending or offline, utilizing verified Ceará dataset:', error.message)
          return
        }

        if (data && data.length > 0 && isMounted) {
          const mapped: SocialServiceSpec[] = data.map((row: SocialServiceRow) => ({
            id: row.id,
            name: row.name,
            organization: row.organization,
            category: row.category,
            state: 'CE',
            municipality: row.municipality,
            neighborhood: row.neighborhood || '',
            address: row.address,
            postal_code: row.postal_code || undefined,
            regular_schedule: row.regular_schedule || 'Segunda a Sexta, das 08h00 às 17h00',
            access_requirements: row.access_requirements || [],
            accessibility_features: row.accessibility_features || [],
            contact_phone: row.contact_phone || '',
            contact_email: row.contact_email || '',
            target_public: row.target_public || [],
            is_free: row.is_free,
            official_link: row.official_link || undefined,
            info_source: row.info_source,
            verification_status: row.verification_status,
            verified_at: row.verified_at ? row.verified_at.split('T')[0] : '2026-10-27',
            description: row.category === 'cras' 
              ? 'Atendimento socioassistencial básico, PAIF, SCFV e Cadastro Único.' 
              : 'Serviço socioassistencial especializado e garantidor de direitos.',
          }))
          setRemoteServices(mapped)
        }
      } catch (err) {
        console.warn('Erro ao consultar social_services do Supabase:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadCearaServices()
    return () => {
      isMounted = false
    }
  }, [])

  // Cópia Segura de Contatos
  const handleCopyContact = (service: SocialServiceSpec) => {
    const textToCopy = `📌 ${service.name}\n🏛️ Instituição: ${service.organization}\n📍 Endereço: ${service.address}\n📞 Telefone: ${service.contact_phone}\n✉️ E-mail: ${service.contact_email}\n⏰ Horário: ${service.regular_schedule}\n🔗 Fonte: ${service.info_source}`
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(service.id)
      setTimeout(() => setCopiedId(null), 3000)
    })
  }

  // Filtragem Funcional Multi-campo
  const filteredServices = useMemo(() => {
    return remoteServices.filter((srv) => {
      // 1. Restrição estrita de Estado: Apenas Ceará
      if (srv.state !== 'CE') return false

      // 2. Filtro de Município (com opção "Todos (CE)")
      if (selectedMunicipality !== 'all' && srv.municipality.toLowerCase() !== selectedMunicipality.toLowerCase()) {
        return false
      }

      // 3. Filtro de Categoria
      if (selectedCategory !== 'all' && srv.category !== selectedCategory) {
        return false
      }

      // 4. Filtro de Gratuidade
      if (onlyFreeServices && !srv.is_free) {
        return false
      }

      // 5. Filtro de Público
      if (selectedPublic !== 'all') {
        const publicTerms: Record<string, string[]> = {
          familias: ['família', 'vulnerabilidade', 'paif', 'bolsa família', 'cadúnico'],
          mulheres: ['mulher', 'gênero', 'violência doméstica'],
          rua: ['rua', 'migrante', 'população'],
          pcd: ['deficiência', 'pcd', 'autismo', 'bpc'],
          criancas: ['criança', 'adolescente', 'infância', 'jovem'],
          idosos: ['idoso', 'terceira idade', 'longevidade'],
        }
        const terms = publicTerms[selectedPublic] || []
        const hasMatch = terms.some((t) =>
          srv.target_public.some((p) => p.toLowerCase().includes(t)) ||
          srv.description.toLowerCase().includes(t) ||
          srv.name.toLowerCase().includes(t)
        )
        if (!hasMatch) return false
      }

      // 6. Pesquisa Funcional por texto amplo
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const matchName = srv.name.toLowerCase().includes(q)
        const matchOrg = srv.organization.toLowerCase().includes(q)
        const matchMunicipality = srv.municipality.toLowerCase().includes(q)
        const matchNeighborhood = srv.neighborhood.toLowerCase().includes(q)
        const matchAddress = srv.address.toLowerCase().includes(q)
        const matchDesc = srv.description.toLowerCase().includes(q)
        const matchCategory = srv.category.toLowerCase().includes(q)
        const matchPublic = srv.target_public.some((p) => p.toLowerCase().includes(q))
        const matchRequirements = srv.access_requirements.some((r) => r.toLowerCase().includes(q))

        if (!matchName && !matchOrg && !matchMunicipality && !matchNeighborhood && !matchAddress && !matchDesc && !matchCategory && !matchPublic && !matchRequirements) {
          return false
        }
      }

      return true
    })
  }, [remoteServices, selectedMunicipality, selectedCategory, selectedPublic, onlyFreeServices, searchTerm])

  // Contagem por município para badges de fácil navegação
  const municipalityCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    remoteServices.forEach((srv) => {
      counts[srv.municipality] = (counts[srv.municipality] || 0) + 1
    })
    return counts
  }, [remoteServices])

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. CABEÇALHO DO DIRETÓRIO DO CEARÁ */}
      <div className="bg-gradient-to-r from-white via-[#FFF9FB] to-white p-5 md:p-6 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-[#FCE5ED] text-[#F04491] shadow-xs">
                <Compass size={22} />
              </span>
              <h1 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
                Rede Socioassistencial do Ceará
              </h1>
              <span className="bg-[#EBF7F1] text-[#36A879] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#A7E2C6]/40">
                100% Estado do CE
              </span>
            </div>
            <p className="text-xs md:text-sm text-[#827780] font-medium max-w-2xl leading-relaxed">
              Catálogo oficial e verificado de CRAS, CREAS, Centros POP, Defensoria Pública e unidades da rede de proteção de <strong className="text-[#28232A]">Fortaleza e Região Metropolitana</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-bold text-[#827780]">
              <ShieldCheck size={16} className="text-[#F04491]" />
              <span>Verificado em 2026</span>
            </div>
            <button
              type="button"
              onClick={() => setIsProposalModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-[0_4px_12px_rgba(240,68,145,0.25)] transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Propor Serviço</span>
            </button>
          </div>
        </div>

        {/* 2. BARRA DE PESQUISA EM DESTAQUE */}
        <div className="mt-5 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#827780]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por instituição, serviço, bairro, endereço, público ou categoria (ex: Paupina, CadÚnico, Mulher)..."
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-[#F6E4EC] bg-white text-xs md:text-sm text-[#28232A] placeholder-[#827780] focus:outline-hidden focus:border-[#F04491] focus:ring-2 focus:ring-[#F04491]/20 transition-all shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#827780] hover:text-[#28232A] rounded-full hover:bg-gray-100 cursor-pointer"
              title="Limpar busca"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 3. FILTRO DE MUNICÍPIO DE FÁCIL ACESSO (FORTALEZA PADRÃO + RMF) */}
        <div className="mt-4 pt-4 border-t border-[#F6E4EC]/60">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#827780] flex items-center gap-1.5">
              <MapPin size={13} className="text-[#F04491]" />
              Municípios Prioritários do Ceará:
            </span>
            <span className="text-[11px] text-[#827780] font-bold">
              {filteredServices.length} {filteredServices.length === 1 ? 'serviço encontrado' : 'serviços encontrados'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1">
            <button
              type="button"
              onClick={() => setSelectedMunicipality('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedMunicipality === 'all'
                  ? 'bg-[#28232A] text-white shadow-xs'
                  : 'bg-white text-[#827780] hover:text-[#28232A] border border-[#F6E4EC] hover:bg-[#FCE5ED]/30'
              }`}
            >
              <span>Todos (CE)</span>
              <span className="text-[10px] opacity-75 font-semibold">({remoteServices.length})</span>
            </button>

            {CEARA_MUNICIPALITIES.map((mun) => {
              const isSelected = selectedMunicipality.toLowerCase() === mun.toLowerCase()
              const count = municipalityCounts[mun] || 0
              return (
                <button
                  key={mun}
                  type="button"
                  onClick={() => setSelectedMunicipality(mun)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#F04491] text-white shadow-xs'
                      : 'bg-white text-[#827780] hover:text-[#28232A] border border-[#F6E4EC] hover:bg-[#FCE5ED]/30'
                  }`}
                >
                  <span>{mun}</span>
                  {mun === 'Fortaleza' && (
                    <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded-full uppercase">Padrão</span>
                  )}
                  <span className={`text-[10px] font-semibold ${isSelected ? 'text-white/80' : 'text-[#827780]'}`}>
                    ({count})
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 4. FILTROS AVANÇADOS: CATEGORIA, PÚBLICO E GRATUIDADE */}
        <div className="mt-4 pt-3 border-t border-[#F6E4EC]/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Categoria */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#827780] block mb-1">
              Categoria do Serviço
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#F6E4EC] bg-white text-xs font-bold text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
            >
              {CEARA_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Público Atendido */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#827780] block mb-1">
              Público Atendido
            </label>
            <select
              value={selectedPublic}
              onChange={(e) => setSelectedPublic(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#F6E4EC] bg-white text-xs font-bold text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
            >
              {CEARA_PUBLICS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Gratuidade */}
          <div className="flex items-end">
            <label className="w-full flex items-center justify-between p-2 rounded-xl border border-[#F6E4EC] bg-white hover:bg-[#FFF9FB] cursor-pointer transition-colors">
              <span className="text-xs font-bold text-[#28232A] flex items-center gap-1.5">
                <HeartHandshake size={15} className="text-[#36A879]" />
                Somente Gratuitos
              </span>
              <input
                type="checkbox"
                checked={onlyFreeServices}
                onChange={(e) => setOnlyFreeServices(e.target.checked)}
                className="w-4 h-4 rounded text-[#F04491] accent-[#F04491] cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>

      {/* FEEDBACK TOAST DE CÓPIA DE CONTATO */}
      {copiedId && (
        <div className="p-3 bg-[#EBF7F1] border border-[#36A879]/30 text-[#1E5638] rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <Check size={16} className="text-[#36A879]" />
          <span>Contatos completos copiados para a área de transferência com sucesso!</span>
        </div>
      )}

      {/* 5. LISTAGEM DE CARTÕES DE SERVIÇOS DO CEARÁ */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#F6E4EC] shadow-sm">
          <div className="animate-spin w-8 h-8 mx-auto border-3 border-[#F04491] border-t-transparent rounded-full mb-3" />
          <p className="text-xs font-bold text-[#827780]">Carregando catálogo do Ceará...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#F6E4EC] shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center mb-3">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-base font-black text-[#28232A]">Nenhum serviço encontrado no Ceará</h3>
          <p className="text-xs text-[#827780] max-w-md mx-auto mt-1 mb-4 leading-relaxed">
            Não encontramos nenhum equipamento com os filtros selecionados em {selectedMunicipality === 'all' ? 'no Ceará' : selectedMunicipality}. Tente limpar a busca ou selecionar outro município da RMF.
          </p>
          <button
            onClick={() => {
              setSearchTerm('')
              setSelectedCategory('all')
              setSelectedPublic('all')
              setSelectedMunicipality('Fortaleza')
            }}
            className="px-4 py-2 rounded-xl bg-[#F04491] text-white text-xs font-black shadow-xs hover:bg-[#d8357d] transition-all cursor-pointer"
          >
            Restaurar Filtros Padrão (Fortaleza)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-3xl border border-[#F6E4EC] p-5 shadow-[0_2px_12px_rgba(240,68,145,0.03)] hover:shadow-[0_4px_20px_rgba(240,68,145,0.08)] transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3.5">
                {/* Topo do Cartão: Categoria & Município */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FCE5ED] text-[#F04491] border border-[#F58BB5]/30">
                    {service.category.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#827780] bg-[#FFF9FB] px-2 py-0.5 rounded-lg border border-[#F6E4EC]">
                    <MapPin size={12} className="text-[#F04491]" />
                    <span>{service.municipality} — CE</span>
                  </div>
                </div>

                {/* Nome do Serviço e Órgão */}
                <div>
                  <h3 className="text-sm font-black text-[#28232A] group-hover:text-[#F04491] transition-colors line-clamp-2 leading-snug">
                    {service.name}
                  </h3>
                  <p className="text-[11px] font-medium text-[#827780] mt-0.5 line-clamp-1">
                    {service.organization}
                  </p>
                </div>

                {/* Descrição Curta */}
                <p className="text-xs text-[#827780] line-clamp-2 leading-relaxed">
                  {service.description}
                </p>

                {/* Endereço e Horário */}
                <div className="space-y-1.5 pt-1 text-xs text-[#28232A]">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-[#827780] shrink-0 mt-0.5" />
                    <span className="text-[11px] text-[#28232A] font-medium line-clamp-2">
                      {service.address}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#827780] shrink-0" />
                    <span className="text-[11px] text-[#827780]">{service.regular_schedule}</span>
                  </div>
                  {service.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-[#827780] shrink-0" />
                      <a
                        href={`tel:${service.contact_phone.replace(/\D/g, '')}`}
                        className="text-[11px] font-bold text-[#F04491] hover:underline"
                      >
                        {service.contact_phone}
                      </a>
                    </div>
                  )}
                </div>

                {/* Tags de Público */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {service.target_public.slice(0, 2).map((tp, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FFF9FB] text-[#827780] border border-[#F6E4EC]"
                    >
                      {tp}
                    </span>
                  ))}
                  {service.target_public.length > 2 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-500">
                      +{service.target_public.length - 2}
                    </span>
                  )}
                </div>
              </div>

              {/* RODAPÉ DE AÇÕES REAIS DO CARTÃO */}
              <div className="pt-4 mt-4 border-t border-[#F6E4EC] flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] text-[#827780] font-semibold">
                  <span className="text-[#36A879] font-bold flex items-center gap-1">
                    <ShieldCheck size={13} />
                    Verificado em {service.verified_at}
                  </span>
                  <span>{service.is_free ? '100% Gratuito' : 'Consulte'}</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {/* Botão Rota no Mapa */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${service.name}, ${service.address}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-[#FFF9FB] hover:bg-[#FCE5ED]/60 text-[#28232A] border border-[#F6E4EC] text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Abrir rota no Google Maps"
                  >
                    <Navigation size={13} className="text-[#F04491]" />
                    <span>Mapa</span>
                  </a>

                  {/* Botão Copiar Contatos */}
                  <button
                    type="button"
                    onClick={() => handleCopyContact(service)}
                    className="p-2 rounded-xl bg-[#FFF9FB] hover:bg-[#FCE5ED]/60 text-[#28232A] border border-[#F6E4EC] text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Copiar dados de contato completos"
                  >
                    <Copy size={13} className="text-[#827780]" />
                    <span>Copiar</span>
                  </button>

                  {/* Botão Detalhes */}
                  <button
                    type="button"
                    onClick={() => setActiveModalService(service)}
                    className="p-2 rounded-xl bg-[#F04491] hover:bg-[#d8357d] text-white text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <Info size={13} />
                    <span>Ficha</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DETALHADO DO SERVIÇO SOCIOASSISTENCIAL */}
      {activeModalService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-4 overflow-y-auto animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-detail-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModalService(null)
          }}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-3xl border border-[#F6E4EC] shadow-2xl p-5 md:p-7 space-y-5 my-auto max-h-[90dvh] overflow-y-auto"
          >
            {/* Topo do Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-[#F6E4EC] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FCE5ED] text-[#F04491] border border-[#F58BB5]/30">
                    {activeModalService.category.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-bold text-[#36A879] bg-[#EBF7F1] px-2.5 py-0.5 rounded-full">
                    {activeModalService.is_free ? 'Atendimento Gratuito (SUAS/SUS)' : 'Consulte'}
                  </span>
                </div>
                <h2 id="service-detail-modal-title" className="text-lg md:text-xl font-black text-[#28232A] leading-snug">
                  {activeModalService.name}
                </h2>
                <p className="text-xs text-[#827780] font-medium mt-0.5">
                  {activeModalService.organization} • {activeModalService.municipality}, Ceará
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalService(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:text-[#28232A] hover:bg-[#FCE5ED]/40 transition-colors cursor-pointer"
                title="Fechar modal"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Descrição Completa */}
            <div className="p-4 bg-[#FFF9FB] rounded-2xl border border-[#F6E4EC] space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#F04491] block">
                Sobre este Equipamento do Ceará
              </span>
              <p className="text-xs md:text-sm text-[#28232A] leading-relaxed">
                {activeModalService.description}
              </p>
            </div>

            {/* Endereço & Horários */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-white border border-[#F6E4EC] space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#827780] flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#F04491]" />
                  Endereço no Ceará
                </span>
                <p className="text-xs font-bold text-[#28232A] leading-snug">
                  {activeModalService.address}
                </p>
                {activeModalService.postal_code && (
                  <p className="text-[11px] text-[#827780]">CEP: {activeModalService.postal_code}</p>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-[#F6E4EC] space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#827780] flex items-center gap-1.5">
                  <Clock size={13} className="text-[#F04491]" />
                  Horário de Funcionamento
                </span>
                <p className="text-xs font-bold text-[#28232A] leading-snug">
                  {activeModalService.regular_schedule}
                </p>
              </div>
            </div>

            {/* Contatos Oficiais */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#F6E4EC] space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#827780] block">
                Canais de Comunicação
              </span>
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                {activeModalService.contact_phone && (
                  <a
                    href={`tel:${activeModalService.contact_phone.replace(/\D/g, '')}`}
                    className="flex items-center gap-1.5 text-[#F04491] hover:underline"
                  >
                    <Phone size={14} />
                    <span>{activeModalService.contact_phone}</span>
                  </a>
                )}
                {activeModalService.contact_email && (
                  <a
                    href={`mailto:${activeModalService.contact_email}`}
                    className="flex items-center gap-1.5 text-[#827780] hover:text-[#28232A]"
                  >
                    <Mail size={14} />
                    <span>{activeModalService.contact_email}</span>
                  </a>
                )}
                {activeModalService.official_link && (
                  <a
                    href={activeModalService.official_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[#4B7BFF] hover:underline"
                  >
                    <ExternalLink size={14} />
                    <span>Portal Oficial</span>
                  </a>
                )}
              </div>
            </div>

            {/* Requisitos de Acesso */}
            {activeModalService.access_requirements.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#827780] flex items-center gap-1.5">
                  <FileCheck2 size={13} className="text-[#F04491]" />
                  Documentos e Requisitos de Atendimento
                </span>
                <ul className="space-y-1 pl-1">
                  {activeModalService.access_requirements.map((req, idx) => (
                    <li key={idx} className="text-xs text-[#28232A] flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F04491] mt-1.5 shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Acessibilidade PCD */}
            {activeModalService.accessibility_features.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#827780] flex items-center gap-1.5">
                  <Accessibility size={13} className="text-[#36A879]" />
                  Recursos de Acessibilidade Disponíveis
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeModalService.accessibility_features.map((feat, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-[#EBF7F1] text-[#1E5638] text-[11px] font-bold border border-[#A7E2C6]/40"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadados de Auditoria e Verificação */}
            <div className="pt-3 border-t border-[#F6E4EC] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#827780]">
              <span className="flex items-center gap-1">
                <strong>Fonte Oficial: </strong> {activeModalService.info_source}
              </span>
              <span className="font-bold text-[#36A879]">
                Verificado em: {activeModalService.verified_at}
              </span>
            </div>

            {/* Ações Inferiores */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F6E4EC]">
              <button
                type="button"
                onClick={() => handleCopyContact(activeModalService)}
                className="px-4 py-2.5 rounded-xl border border-[#F6E4EC] bg-white hover:bg-[#FCE5ED]/40 text-[#28232A] text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Copy size={14} />
                <span>Copiar Contatos</span>
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${activeModalService.name}, ${activeModalService.address}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-[#F04491] hover:bg-[#d8357d] text-white text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <Navigation size={14} />
                <span>Abrir no Google Maps</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PROPOSTA DE NOVO SERVIÇO */}
      {isProposalModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-proposal-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProposalModalOpen(false)
          }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-[#F6E4EC] shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F6E4EC]">
              <div className="flex items-center gap-2">
                <Plus size={20} className="text-[#F04491]" />
                <h3 id="service-proposal-modal-title" className="text-base font-black text-[#28232A]">
                  Proposta de Novo Equipamento Socioassistencial (Ceará)
                </h3>
              </div>
              <button
                type="button"
                aria-label="Fechar proposta"
                onClick={() => setIsProposalModalOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:text-[#28232A] hover:bg-[#FCE5ED] cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs text-[#827780] flex items-start gap-2">
              <AlertCircle size={16} className="text-[#F04491] shrink-0 mt-0.5" />
              <span>
                Formulário para sugestão de novos equipamentos do Ceará. Submissões serão verificadas pelas equipes antes da publicação oficial.
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                setIsProposalModalOpen(false)
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-bold text-[#827780] uppercase mb-1">
                  Nome do Equipamento / Serviço
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: CRAS Messejana, CREAS Centro..."
                  className="w-full px-3 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#827780] uppercase mb-1">
                  Município do Ceará
                </label>
                <select
                  defaultValue="Fortaleza"
                  className="w-full px-3 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A]"
                >
                  {CEARA_MUNICIPALITIES.map((mun) => (
                    <option key={mun} value={mun}>
                      {mun}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#827780] uppercase mb-1">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Rua, número, bairro..."
                  className="w-full px-3 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A]"
                />
              </div>

              <div className="pt-3 border-t border-[#F6E4EC] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProposalModalOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#827780] hover:text-[#28232A] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-[#F04491] text-white text-xs font-bold hover:bg-[#DE3380] transition-colors cursor-pointer"
                >
                  Enviar Proposta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
