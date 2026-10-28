import React, { useState, useMemo, useEffect } from 'react'
import {
  GitCommit,
  Clock,
  Home,
  Users,
  FileText,
  Send,
  Calendar,
  Plus,
  Filter,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  User,
  ArrowRight,
  Phone,
  MapPin,
  Search,
  Check,
  RefreshCw,
  FolderOpen,
  X,
  FileCheck,
  HelpCircle,
  Layers,
  ChevronDown
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { ActivityItem } from './ActivityCard'
import type {
  FamilyRow,
  FamilyMemberRow,
  FamilyTimelineEventRow,
  FamilyPendencyRow,
  FamilyStageHistoryRow,
  FamilyStage,
  PendencyPriority,
  PendencyStatus
} from '../types/supabase'

interface CaseTimelineViewProps {
  activities?: ActivityItem[]
  profileName?: string
  onOpenNewActivity?: () => void
  onSelectActivity?: (activity: ActivityItem) => void
  familyId?: string
}

// 11 Etapas Oficiais do Fluxo de Trabalho SUAS
export const SUAS_STAGES: { id: FamilyStage; label: string; shortLabel: string; desc: string; order: number }[] = [
  { id: 'cadastro_inicial', label: '1. Cadastro Inicial', shortLabel: 'Cad. Inicial', desc: 'Abertura de prontuário e inserção de dados da família', order: 1 },
  { id: 'triagem', label: '2. Triagem e Levantamento', shortLabel: 'Triagem', desc: 'Identificação de demandas emergenciais e vulnerabilidades', order: 2 },
  { id: 'aguardando_documentos', label: '3. Aguardando Documentos', shortLabel: 'Documentos', desc: 'Coleta de certidões, laudos ou comprovantes pendentes', order: 3 },
  { id: 'avaliacao_social', label: '4. Avaliação Social', shortLabel: 'Avaliação', desc: 'Estudo social aprofundado e parecer técnico inicial', order: 4 },
  { id: 'plano_acompanhamento', label: '5. Plano de Acompanhamento (PAIF)', shortLabel: 'Plano PAIF', desc: 'Definição de metas e compromissos com a família', order: 5 },
  { id: 'encaminhamentos', label: '6. Encaminhamentos em Andamento', shortLabel: 'Encaminham.', desc: 'Articulação com CRAS, CREAS, Saúde, Habitação ou DPCE', order: 6 },
  { id: 'aguardando_retorno', label: '7. Aguardando Retorno', shortLabel: 'Aguard. Ret.', desc: 'Espera por resposta oficial de órgãos da rede intersetorial', order: 7 },
  { id: 'acompanhamento_ativo', label: '8. Acompanhamento Ativo', shortLabel: 'Ativo', desc: 'Intervenções sistemáticas, visitas e escutas periódicas', order: 8 },
  { id: 'revisao', label: '9. Revisão ou Reavaliação', shortLabel: 'Reavaliação', desc: 'Verificação do alcance das metas pactuadas no plano', order: 9 },
  { id: 'concluido', label: '10. Concluído', shortLabel: 'Concluído', desc: 'Superação das vulnerabilidades ou alcance pleno dos objetivos', order: 10 },
  { id: 'suspenso', label: '11. Suspenso ou Interrompido', shortLabel: 'Suspenso', desc: 'Mudança de domicílio, não localização ou recusa justificada', order: 11 }
]

// Tipos de Eventos da Linha do Tempo (20 Tipos SUAS)
export const TIMELINE_EVENT_TYPES: { id: string; label: string; category: string }[] = [
  { id: 'cadastro_familiar', label: 'Cadastro da Família', category: 'cadastro' },
  { id: 'atualizacao_cadastral', label: 'Atualização Cadastral', category: 'cadastro' },
  { id: 'atendimento_realizado', label: 'Atendimento Presencial / Técnico', category: 'atendimento' },
  { id: 'visita_domiciliar', label: 'Visita Domiciliar Realizada', category: 'atendimento' },
  { id: 'contato_realizado', label: 'Contato Telefônico / WhatsApp', category: 'contato' },
  { id: 'tentativa_contato', label: 'Tentativa de Contato Sem Sucesso', category: 'contato' },
  { id: 'documento_solicitado', label: 'Documentação Solicitada', category: 'documento' },
  { id: 'documento_recebido', label: 'Documentação Entregue / Recebida', category: 'documento' },
  { id: 'documento_pendente', label: 'Pendência Documental Notificada', category: 'documento' },
  { id: 'dossie_iniciado', label: 'Dossiê Habitacional Iniciado', category: 'habitacao' },
  { id: 'dossie_atualizado', label: 'Dossiê Habitacional Atualizado', category: 'habitacao' },
  { id: 'encaminhamento_realizado', label: 'Encaminhamento à Rede Socioassistencial', category: 'encaminhamento' },
  { id: 'encaminhamento_respondido', label: 'Retorno de Encaminhamento Recebido', category: 'encaminhamento' },
  { id: 'agendamento_criado', label: 'Agendamento Técnico Realizado', category: 'agenda' },
  { id: 'agendamento_concluido', label: 'Agendamento Concluído', category: 'agenda' },
  { id: 'pendencia_criada', label: 'Pendência de Acompanhamento Aberta', category: 'pendencia' },
  { id: 'pendencia_resolvida', label: 'Pendência Resolvida com Sucesso', category: 'pendencia' },
  { id: 'alteracao_etapa', label: 'Transição de Etapa do SUAS', category: 'fluxo' },
  { id: 'observacao_profissional', label: 'Parecer / Observação Técnica', category: 'tecnico' },
  { id: 'acompanhamento_concluido', label: 'Acompanhamento Concluído', category: 'conclusao' },
  { id: 'acompanhamento_reaberto', label: 'Acompanhamento Reaberto', category: 'conclusao' }
]

// Dados Piloto de Alta Fidelidade (Território Paupina / Messejana, Fortaleza - CE)
const PILOT_FAMILY: FamilyRow = {
  id: 'f0000001-0000-0000-0000-000000000001',
  code: 'FAM-CE-001',
  family_name: 'Família Silva dos Santos',
  responsible_name: 'Maria da Silva Santos',
  neighborhood: 'Paupina',
  municipality: 'Fortaleza',
  address: 'Rua Coronel Dionísio Alencar, Bloco B, Apt 204 — Residencial Paupina, Fortaleza - CE',
  phone: '(85) 98844-1234',
  current_stage: 'acompanhamento_ativo',
  stage_updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  stage_updated_by: null,
  notes: 'Família reassentada no Residencial Paupina. Situação prioritária de acompanhamento intersetorial de saúde e assistência social.',
  assigned_worker_id: null,
  created_by: null,
  last_movement_at: new Date(Date.now() - 3600000).toISOString(),
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  updated_at: new Date().toISOString()
}

const PILOT_MEMBERS: FamilyMemberRow[] = [
  {
    id: 'a0000001-0000-0000-0000-000000000001',
    family_id: 'f0000001-0000-0000-0000-000000000001',
    full_name: 'Maria da Silva Santos',
    nis: '165.892.410-02',
    cpf: '842.190.453-20',
    relationship: 'Responsável Familiar (Mãe)',
    birth_date: '1985-04-12',
    phone: '(85) 98844-1234',
    notes: 'Titular do Cadastro Único e do dossiê habitacional da unidade.',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'a0000001-0000-0000-0000-000000000002',
    family_id: 'f0000001-0000-0000-0000-000000000001',
    full_name: 'Lucas da Silva Santos',
    nis: '165.892.410-15',
    cpf: '091.244.783-05',
    relationship: 'Filho (PCD)',
    birth_date: '2014-08-20',
    phone: null,
    notes: '12 anos. Diagnóstico de Transtorno do Espectro Autista (TEA). Encaminhado para laudo médico no CAPS Infantil e processo do BPC.',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'a0000001-0000-0000-0000-000000000003',
    family_id: 'f0000001-0000-0000-0000-000000000001',
    full_name: 'Ana Clara da Silva Santos',
    nis: '165.892.410-28',
    cpf: null,
    relationship: 'Filha',
    birth_date: '2018-11-05',
    phone: null,
    notes: '7 anos. Matriculada na Escola Municipal de Ensino Fundamental da Paupina.',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  }
]

const PILOT_EVENTS: FamilyTimelineEventRow[] = [
  {
    id: 'e-ce-005',
    family_id: 'f0000001-0000-0000-0000-000000000001',
    person_id: 'a0000001-0000-0000-0000-000000000001',
    event_type: 'contato_realizado',
    title: 'Contato Telefônico de Acompanhamento Realizado',
    description: 'Dona Maria confirmou o recebimento do protocolo de atendimento na Defensoria Pública (DPCE) e informou agendamento da perícia do INSS.',
    event_date: new Date(Date.now() - 3600000).toISOString(),
    stage: 'acompanhamento_ativo',
    author_id: null,
    author_name: 'Janaína Lima (Assistente Social)',
    related_activity_id: null,
    related_document_id: null,
    related_dossier_id: null,
    next_action: 'Averiguar comparecimento à perícia do INSS',
    next_action_due_date: new Date(Date.now() + 10 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'e-ce-004',
    family_id: 'f0000001-0000-0000-0000-000000000001',
    person_id: 'a0000001-0000-0000-0000-000000000001',
    event_type: 'dossie_atualizado',
    title: 'Dossiê Habitacional Conforme no Lote de Envio 04',
    description: 'Dossiê da família incluído com sucesso no Lote de Envio 04 da Paupina sem nenhuma inconformidade cadastral pendente.',
    event_date: new Date(Date.now() - 5 * 86400000).toISOString(),
    stage: 'acompanhamento_ativo',
    author_id: null,
    author_name: 'Janaína Lima (Assistente Social)',
    related_activity_id: null,
    related_document_id: null,
    related_dossier_id: null,
    next_action: null,
    next_action_due_date: null,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'e-ce-003',
    family_id: 'f0000001-0000-0000-0000-000000000001',
    person_id: 'a0000001-0000-0000-0000-000000000002',
    event_type: 'encaminhamento_realizado',
    title: 'Encaminhamento Técnico ao CAPS Infantil e Defensoria Pública',
    description: 'Emitido parecer técnico e guia de encaminhamento oficial para agilização do laudo biopsicossocial do dependente Lucas da Silva Santos para requerimento do BPC/LOAS.',
    event_date: new Date(Date.now() - 10 * 86400000).toISOString(),
    stage: 'plano_acompanhamento',
    author_id: null,
    author_name: 'Janaína Lima (Assistente Social)',
    related_activity_id: null,
    related_document_id: null,
    related_dossier_id: null,
    next_action: 'Acompanhar retorno da Defensoria Pública',
    next_action_due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: 'e-ce-002',
    family_id: 'f0000001-0000-0000-0000-000000000001',
    person_id: null,
    event_type: 'visita_domiciliar',
    title: 'Visita Domiciliar Diagnóstica Realizada',
    description: 'Realizada visita técnica no apartamento do Residencial Paupina. Averiguadas condições de habitabilidade e identificada necessidade de apoio na documentação médica do filho Lucas.',
    event_date: new Date(Date.now() - 18 * 86400000).toISOString(),
    stage: 'triagem',
    author_id: null,
    author_name: 'Janaína Lima (Assistente Social)',
    related_activity_id: null,
    related_document_id: null,
    related_dossier_id: null,
    next_action: 'Solicitar laudo circunstanciado para INSS',
    next_action_due_date: new Date(Date.now() - 10 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 18 * 86400000).toISOString()
  },
  {
    id: 'e-ce-001',
    family_id: 'f0000001-0000-0000-0000-000000000001',
    person_id: 'a0000001-0000-0000-0000-000000000001',
    event_type: 'cadastro_familiar',
    title: 'Abertura de Prontuário e Cadastro Familiar',
    description: 'Família cadastrada no território do Residencial Paupina após convocação para assinatura de dossiê técnico.',
    event_date: new Date(Date.now() - 30 * 86400000).toISOString(),
    stage: 'cadastro_inicial',
    author_id: null,
    author_name: 'Janaína Lima (Assistente Social)',
    related_activity_id: null,
    related_document_id: null,
    related_dossier_id: null,
    next_action: 'Agendar visita domiciliar diagnóstica',
    next_action_due_date: new Date(Date.now() - 20 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 86400000).toISOString()
  }
]

const PILOT_PENDENCIES: FamilyPendencyRow[] = [
  {
    id: 'pen-ce-001',
    family_id: 'f0000001-0000-0000-0000-000000000001',
    person_id: 'a0000001-0000-0000-0000-000000000002',
    title: 'Obtenção de Laudo Médico Pericial Atualizado (TEA)',
    description: 'Aguardando entrega do laudo médico emitido pelo neurologista/psiquiatra infantil para anexar ao requerimento do BPC/LOAS de Lucas.',
    category: 'saude',
    assigned_to: null,
    assigned_to_name: 'Janaína Lima',
    due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
    priority: 'alta',
    status: 'pendente',
    next_action: 'Fazer contato telefônico de cobrança com o posto de saúde',
    resolved_at: null,
    resolved_by: null,
    resolution_notes: null,
    created_by: null,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'pen-ce-002',
    family_id: 'f0000001-0000-0000-0000-000000000001',
    person_id: 'a0000001-0000-0000-0000-000000000001',
    title: 'Comprovante de Atualização do Cadastro Único (V7)',
    description: 'Necessário apresentar espelho do CadÚnico atualizado com o novo endereço da Paupina no CRAS Messejana.',
    category: 'documentacao',
    assigned_to: null,
    assigned_to_name: 'Janaína Lima',
    due_date: new Date(Date.now() - 2 * 86400000).toISOString(), // Vencida para alertar na interface!
    priority: 'urgente',
    status: 'em_andamento',
    next_action: 'Solicitar folha resumo ao CRAS Paupina via e-mail oficial',
    resolved_at: null,
    resolved_by: null,
    resolution_notes: null,
    created_by: null,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  }
]

export const CaseTimelineView: React.FC<CaseTimelineViewProps> = ({
  activities = [],
  profileName = 'Janaína Lima',
  onOpenNewActivity,
  onSelectActivity,
  familyId
}) => {
  // Estados de dados da família e linha do tempo
  const [family, setFamily] = useState<FamilyRow>(PILOT_FAMILY)
  const [members, setMembers] = useState<FamilyMemberRow[]>(PILOT_MEMBERS)
  const [events, setEvents] = useState<FamilyTimelineEventRow[]>(PILOT_EVENTS)
  const [pendencies, setPendencies] = useState<FamilyPendencyRow[]>(PILOT_PENDENCIES)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Filtros de visualização
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all') // 'all' ou ID da pessoa
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  // Modais
  const [isStageModalOpen, setIsStageModalOpen] = useState<boolean>(false)
  const [newSelectedStage, setNewSelectedStage] = useState<FamilyStage>(family.current_stage as FamilyStage)
  const [stageJustification, setStageJustification] = useState<string>('')

  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState<boolean>(false)
  const [newEventData, setNewEventData] = useState({
    event_type: 'atendimento_realizado',
    title: '',
    description: '',
    person_id: '',
    event_date: new Date().toISOString().slice(0, 16),
    next_action: '',
    next_action_due_date: ''
  })

  const [isNewPendencyModalOpen, setIsNewPendencyModalOpen] = useState<boolean>(false)
  const [newPendencyData, setNewPendencyData] = useState({
    title: '',
    description: '',
    person_id: '',
    category: 'documentacao',
    priority: 'media' as PendencyPriority,
    due_date: '',
    next_action: ''
  })

  // Mensagens visuais de feedback
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  // Carregar dados reais do Supabase (com fallback seguro e gracioso para os dados piloto)
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        setIsLoading(true)

        // 1. Consultar Família
        let famQuery = supabase.from('families').select('*')
        if (familyId) {
          famQuery = famQuery.eq('id', familyId)
        }
        const { data: famData, error: famErr } = await famQuery.order('created_at', { ascending: false }).limit(1)

        if (!famErr && famData && famData.length > 0) {
          const currentFam = famData[0] as FamilyRow
          if (isMounted) {
            setFamily(currentFam)
            setNewSelectedStage(currentFam.current_stage as FamilyStage)
          }

          // 2. Consultar Integrantes
          const { data: memData } = await supabase
            .from('family_members')
            .select('*')
            .eq('family_id', currentFam.id)
            .order('relationship', { ascending: true })

          if (isMounted && memData && memData.length > 0) {
            setMembers(memData as FamilyMemberRow[])
          }

          // 3. Consultar Eventos da Linha do Tempo
          const { data: evtData } = await supabase
            .from('family_timeline_events')
            .select('*')
            .eq('family_id', currentFam.id)
            .order('event_date', { ascending: false })

          if (isMounted && evtData && evtData.length > 0) {
            setEvents(evtData as FamilyTimelineEventRow[])
          }

          // 4. Consultar Pendências
          const { data: penData } = await supabase
            .from('family_pendencies')
            .select('*')
            .eq('family_id', currentFam.id)
            .order('created_at', { ascending: false })

          if (isMounted && penData && penData.length > 0) {
            setPendencies(penData as FamilyPendencyRow[])
          }
        }
      } catch (err) {
        console.warn('Usando dados piloto para visualização da Linha do Tempo:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [familyId])

  // Ação: Alterar Etapa do Fluxo SUAS com Justificativa Técnica Obrigatória
  const handleUpdateStage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stageJustification.trim()) {
      showNotification('error', 'A justificativa técnica da mudança de etapa é obrigatória pelo SUAS.')
      return
    }

    setIsSubmitting(true)
    try {
      const prevStage = family.current_stage
      const newStage = newSelectedStage
      const now = new Date().toISOString()

      // 1. Atualizar registro da família no Supabase
      try {
        await (supabase.from('families') as any)
          .update({
            current_stage: newStage,
            stage_updated_at: now,
            updated_at: now
          })
          .eq('id', family.id)

        // 2. Registrar no histórico de transições
        await (supabase.from('family_stage_history') as any).insert({
          family_id: family.id,
          previous_stage: prevStage,
          new_stage: newStage,
          reason: stageJustification,
          changed_by_name: profileName
        })

        // 3. Registrar movimentação na Linha do Tempo
        const stageObj = SUAS_STAGES.find((s) => s.id === newStage)
        await (supabase.from('family_timeline_events') as any).insert({
          family_id: family.id,
          event_type: 'alteracao_etapa',
          title: `Transição para Etapa: ${stageObj?.label || newStage}`,
          description: `Justificativa técnica: ${stageJustification}`,
          event_date: now,
          stage: newStage,
          author_name: profileName
        })
      } catch (err) {
        console.warn('Persistindo localmente alteração de etapa:', err)
      }

      // Atualizar estados locais
      setFamily((prev) => ({
        ...prev,
        current_stage: newStage,
        stage_updated_at: now,
        last_movement_at: now
      }))

      const stageObj = SUAS_STAGES.find((s) => s.id === newStage)
      const newEvt: FamilyTimelineEventRow = {
        id: `evt-${Date.now()}`,
        family_id: family.id,
        person_id: null,
        event_type: 'alteracao_etapa',
        title: `Transição para Etapa: ${stageObj?.label || newStage}`,
        description: `Justificativa técnica: ${stageJustification}`,
        event_date: now,
        stage: newStage,
        author_id: null,
        author_name: profileName,
        related_activity_id: null,
        related_document_id: null,
        related_dossier_id: null,
        next_action: null,
        next_action_due_date: null,
        created_at: now,
        updated_at: now
      }
      setEvents((prev) => [newEvt, ...prev])

      showNotification('success', `Etapa alterada para "${stageObj?.shortLabel}" com sucesso!`)
      setIsStageModalOpen(false)
      setStageJustification('')
    } catch {
      showNotification('error', 'Ocorreu um erro ao atualizar a etapa.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ação: Registrar Nova Movimentação
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEventData.title.trim()) {
      showNotification('error', 'Informe o título da movimentação.')
      return
    }

    setIsSubmitting(true)
    try {
      const now = new Date().toISOString()
      const eventDate = newEventData.event_date ? new Date(newEventData.event_date).toISOString() : now

      const payload = {
        family_id: family.id,
        person_id: newEventData.person_id || null,
        event_type: newEventData.event_type,
        title: newEventData.title.trim(),
        description: newEventData.description.trim() || null,
        event_date: eventDate,
        stage: family.current_stage,
        author_name: profileName,
        next_action: newEventData.next_action.trim() || null,
        next_action_due_date: newEventData.next_action_due_date ? new Date(newEventData.next_action_due_date).toISOString() : null
      }

      let createdId = `evt-${Date.now()}`
      try {
        const { data } = await (supabase.from('family_timeline_events') as any).insert(payload).select().single()
        if (data && data.id) createdId = data.id

        await (supabase.from('families') as any)
          .update({ last_movement_at: eventDate, updated_at: now })
          .eq('id', family.id)
      } catch (err) {
        console.warn('Persistindo localmente movimentação:', err)
      }

      const createdEvent: FamilyTimelineEventRow = {
        id: createdId,
        family_id: family.id,
        person_id: newEventData.person_id || null,
        event_type: newEventData.event_type,
        title: newEventData.title.trim(),
        description: newEventData.description.trim() || null,
        event_date: eventDate,
        stage: family.current_stage,
        author_id: null,
        author_name: profileName,
        related_activity_id: null,
        related_document_id: null,
        related_dossier_id: null,
        next_action: newEventData.next_action.trim() || null,
        next_action_due_date: newEventData.next_action_due_date ? new Date(newEventData.next_action_due_date).toISOString() : null,
        created_at: now,
        updated_at: now
      }

      setEvents((prev) => [createdEvent, ...prev])
      setFamily((prev) => ({ ...prev, last_movement_at: eventDate }))

      showNotification('success', 'Movimentação registrada com sucesso na Linha do Tempo!')
      setIsNewEventModalOpen(false)
      setNewEventData({
        event_type: 'atendimento_realizado',
        title: '',
        description: '',
        person_id: '',
        event_date: new Date().toISOString().slice(0, 16),
        next_action: '',
        next_action_due_date: ''
      })
    } catch {
      showNotification('error', 'Erro ao salvar a nova movimentação.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ação: Criar Nova Pendência ("O que falta resolver")
  const handleCreatePendency = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPendencyData.title.trim()) {
      showNotification('error', 'Informe o título da pendência.')
      return
    }

    setIsSubmitting(true)
    try {
      const now = new Date().toISOString()
      const payload = {
        family_id: family.id,
        person_id: newPendencyData.person_id || null,
        title: newPendencyData.title.trim(),
        description: newPendencyData.description.trim() || null,
        category: newPendencyData.category,
        priority: newPendencyData.priority,
        status: 'pendente' as PendencyStatus,
        assigned_to_name: profileName,
        due_date: newPendencyData.due_date ? new Date(newPendencyData.due_date).toISOString() : null,
        next_action: newPendencyData.next_action.trim() || null
      }

      let createdId = `pen-${Date.now()}`
      try {
        const { data } = await (supabase.from('family_pendencies') as any).insert(payload).select().single()
        if (data && data.id) createdId = data.id
      } catch (err) {
        console.warn('Persistindo localmente pendência:', err)
      }

      const createdPen: FamilyPendencyRow = {
        id: createdId,
        family_id: family.id,
        person_id: newPendencyData.person_id || null,
        title: newPendencyData.title.trim(),
        description: newPendencyData.description.trim() || null,
        category: newPendencyData.category,
        assigned_to: null,
        assigned_to_name: profileName,
        due_date: newPendencyData.due_date ? new Date(newPendencyData.due_date).toISOString() : null,
        priority: newPendencyData.priority,
        status: 'pendente',
        next_action: newPendencyData.next_action.trim() || null,
        resolved_at: null,
        resolved_by: null,
        resolution_notes: null,
        created_by: null,
        created_at: now,
        updated_at: now
      }

      setPendencies((prev) => [createdPen, ...prev])
      showNotification('success', 'Pendência registrada em "O que falta resolver"!')
      setIsNewPendencyModalOpen(false)
      setNewPendencyData({
        title: '',
        description: '',
        person_id: '',
        category: 'documentacao',
        priority: 'media',
        due_date: '',
        next_action: ''
      })
    } catch {
      showNotification('error', 'Erro ao registrar a pendência.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ação: Alternar Status de Pendência (Resolver / Reabrir)
  const handleTogglePendencyStatus = async (pen: FamilyPendencyRow) => {
    const isCurrentlyResolved = pen.status === 'resolvida'
    const newStatus: PendencyStatus = isCurrentlyResolved ? 'pendente' : 'resolvida'
    const now = new Date().toISOString()

    try {
      try {
        await (supabase.from('family_pendencies') as any)
          .update({
            status: newStatus,
            resolved_at: isCurrentlyResolved ? null : now,
            resolved_by: null,
            resolution_notes: isCurrentlyResolved ? null : `Resolvido por ${profileName}`,
            updated_at: now
          })
          .eq('id', pen.id)
      } catch (err) {
        console.warn('Atualizando status local da pendência:', err)
      }

      setPendencies((prev) =>
        prev.map((item) =>
          item.id === pen.id
            ? {
                ...item,
                status: newStatus,
                resolved_at: isCurrentlyResolved ? null : now,
                resolution_notes: isCurrentlyResolved ? null : `Resolvido por ${profileName}`
              }
            : item
        )
      )

      showNotification(
        'success',
        isCurrentlyResolved ? 'Pendência reaberta com sucesso!' : 'Pendência marcada como resolvida!'
      )
    } catch {
      showNotification('error', 'Não foi possível alterar o status da pendência.')
    }
  }

  // Filtragem e Ordenação da Linha do Tempo
  const filteredEvents = useMemo(() => {
    let list = [...events]

    // 1. Filtro por Integrante da Família ('all' ou person_id)
    if (selectedMemberId !== 'all') {
      list = list.filter((e) => e.person_id === selectedMemberId)
    }

    // 2. Filtro por Categoria do Evento
    if (filterCategory !== 'all') {
      list = list.filter((e) => {
        const typeSpec = TIMELINE_EVENT_TYPES.find((t) => t.id === e.event_type)
        return typeSpec ? typeSpec.category === filterCategory : false
      })
    }

    // 3. Pesquisa por Termo
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.author_name && e.author_name.toLowerCase().includes(q)) ||
          (e.next_action && e.next_action.toLowerCase().includes(q))
      )
    }

    // 4. Ordenação Cronológica
    list.sort((a, b) => {
      const timeA = new Date(a.event_date).getTime()
      const timeB = new Date(b.event_date).getTime()
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
    })

    return list
  }, [events, selectedMemberId, filterCategory, searchTerm, sortOrder])

  // Pendências Filtradas (visíveis para a família ou para o integrante selecionado)
  const filteredPendencies = useMemo(() => {
    return pendencies.filter((p) => {
      if (selectedMemberId !== 'all') {
        return p.person_id === selectedMemberId
      }
      return true
    })
  }, [pendencies, selectedMemberId])

  // Indicadores de Pendências
  const unresolvedPendencies = useMemo(() => {
    return filteredPendencies.filter((p) => p.status !== 'resolvida' && p.status !== 'cancelada')
  }, [filteredPendencies])

  const overduePendencies = useMemo(() => {
    const now = Date.now()
    return unresolvedPendencies.filter((p) => p.due_date && new Date(p.due_date).getTime() < now)
  }, [unresolvedPendencies])

  // Etapa Atual Objeto
  const currentStageObj = useMemo(() => {
    return SUAS_STAGES.find((s) => s.id === family.current_stage) || SUAS_STAGES[0]
  }, [family.current_stage])

  // Renderizador de Ícones por Tipo de Evento
  const getEventIcon = (eventType: string) => {
    if (eventType.includes('visita')) {
      return { icon: <Home size={15} />, bg: 'bg-[#FCE5ED] text-[#F04491] border-[#F58BB5]' }
    }
    if (eventType.includes('atendimento')) {
      return { icon: <Users size={15} />, bg: 'bg-[#EBF7F1] text-[#36A879] border-[#A7E2C6]' }
    }
    if (eventType.includes('contato')) {
      return { icon: <Phone size={15} />, bg: 'bg-[#EDF2FF] text-[#4B7BFF] border-[#BFDBFE]' }
    }
    if (eventType.includes('encaminhamento')) {
      return { icon: <Send size={15} />, bg: 'bg-[#F5EBFF] text-[#9B51E0] border-[#E9D5FF]' }
    }
    if (eventType.includes('documento')) {
      return { icon: <FileText size={15} />, bg: 'bg-[#FFF7ED] text-[#F97316] border-[#FED7AA]' }
    }
    if (eventType.includes('dossie') || eventType.includes('habitacao')) {
      return { icon: <FolderOpen size={15} />, bg: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' }
    }
    if (eventType.includes('etapa')) {
      return { icon: <GitCommit size={15} />, bg: 'bg-[#FCE5ED] text-[#F04491] border-[#F04491]' }
    }
    if (eventType.includes('pendencia')) {
      return { icon: <AlertCircle size={15} />, bg: 'bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]' }
    }
    return { icon: <Sparkles size={15} />, bg: 'bg-[#FFF9FB] text-[#827780] border-[#F6E4EC]' }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ALERTA DE NOTIFICAÇÃO */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-2.5 transition-all text-xs font-bold ${
            notification.type === 'success'
              ? 'bg-[#EBF7F1] text-[#1E5638] border-[#A7E2C6]'
              : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 1. CARTÃO DA FAMÍLIA E INDICADORES EXECUTIVOS */}
      <div className="bg-gradient-to-r from-white via-[#FFF9FB] to-white p-5 md:p-6 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Dados Principais da Família */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-2 rounded-2xl bg-[#FCE5ED] text-[#F04491]">
                <Users size={22} />
              </span>
              <h1 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
                {family.family_name}
              </h1>
              {family.code && (
                <span className="bg-[#28232A] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {family.code}
                </span>
              )}
              <span className="bg-[#EBF7F1] text-[#36A879] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#A7E2C6]/40">
                {family.municipality} - CE
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#827780] font-medium">
              <span className="flex items-center gap-1.5">
                <User size={13} className="text-[#F04491]" />
                Responsável: <strong className="text-[#28232A]">{family.responsible_name}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-[#F04491]" />
                {family.neighborhood ? `${family.neighborhood}, ${family.municipality}` : family.address}
              </span>
              {family.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-[#F04491]" />
                  {family.phone}
                </span>
              )}
            </div>
          </div>

          {/* Ações Técnicas: Alterar Etapa e Registrar Movimentação */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsStageModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white border border-[#F6E4EC] hover:bg-[#FCE5ED]/30 text-[#28232A] text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <GitCommit size={15} className="text-[#F04491]" />
              <span>Alterar Etapa SUAS</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewEventModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#F04491] hover:bg-[#d8357d] text-white text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-xs"
            >
              <Plus size={16} />
              <span>Registrar Movimentação</span>
            </button>
          </div>
        </div>

        {/* 2. BARRA DE PROGRESSÃO VISUAL DAS 11 ETAPAS DO SUAS */}
        <div className="mt-6 pt-5 border-t border-[#F6E4EC]/70">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#827780] flex items-center gap-1.5">
              <Layers size={13} className="text-[#F04491]" />
              Fluxo Metodológico SUAS — Etapa Atual:
            </span>
            <div className="flex items-center gap-1.5 text-xs font-black text-[#F04491]">
              <span className="w-2 h-2 rounded-full bg-[#F04491] animate-pulse" />
              <span>{currentStageObj.label}</span>
            </div>
          </div>

          {/* Stepper horizontal das etapas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-1.5">
            {SUAS_STAGES.map((stg) => {
              const isCurrent = stg.id === family.current_stage
              const isPast = stg.order < currentStageObj.order
              return (
                <div
                  key={stg.id}
                  title={`${stg.label}: ${stg.desc}`}
                  className={`p-2 rounded-xl text-center flex flex-col items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-[#F04491] text-white shadow-xs scale-102 ring-2 ring-[#F04491]/30 font-black'
                      : isPast
                      ? 'bg-[#EBF7F1] text-[#1E5638] font-bold border border-[#A7E2C6]/40'
                      : 'bg-white text-[#827780] font-medium border border-[#F6E4EC]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {isPast && <Check size={11} className="text-[#36A879]" />}
                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                    <span className="text-[9px] uppercase tracking-tighter truncate max-w-[85px]">
                      {stg.shortLabel}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 3. RESUMO RÁPIDO EM CARDS */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-white border border-[#F6E4EC] space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#827780]">
              Última Movimentação
            </span>
            <p className="text-xs font-bold text-[#28232A] flex items-center gap-1.5">
              <Clock size={13} className="text-[#F04491]" />
              {family.last_movement_at ? new Date(family.last_movement_at).toLocaleDateString('pt-BR') : 'Sem registro'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-[#F6E4EC] space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#827780]">
              Pendências em Aberto
            </span>
            <p className="text-xs font-bold text-[#28232A] flex items-center gap-1.5">
              <AlertCircle size={13} className={unresolvedPendencies.length > 0 ? 'text-[#EF4444]' : 'text-[#36A879]'} />
              <span>{unresolvedPendencies.length} pendências</span>
              {overduePendencies.length > 0 && (
                <span className="text-[10px] bg-[#FEF2F2] text-[#EF4444] px-1.5 py-0.5 rounded-full font-black">
                  {overduePendencies.length} vencidas
                </span>
              )}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-[#F6E4EC] space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#827780]">
              Integrantes Registrados
            </span>
            <p className="text-xs font-bold text-[#28232A] flex items-center gap-1.5">
              <Users size={13} className="text-[#4B7BFF]" />
              <span>{members.length} pessoas vinculadas</span>
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-[#F6E4EC] space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#827780]">
              Profissional Responsável
            </span>
            <p className="text-xs font-bold text-[#28232A] flex items-center gap-1.5 truncate">
              <ShieldCheck size={13} className="text-[#36A879]" />
              <span className="truncate">{profileName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 4. SELETOR DE TRAJETÓRIA: VISÃO GERAL OU INTEGRANTE INDIVIDUAL */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-black uppercase tracking-wider text-[#827780] mr-1 flex items-center gap-1">
            <User size={13} className="text-[#F04491]" />
            Trajetória:
          </span>

          <button
            type="button"
            onClick={() => setSelectedMemberId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              selectedMemberId === 'all'
                ? 'bg-[#28232A] text-white shadow-xs'
                : 'bg-white text-[#827780] hover:text-[#28232A] border border-[#F6E4EC]'
            }`}
          >
            Toda a Família (Visão Geral)
          </button>

          {members.map((mem) => {
            const isSelected = selectedMemberId === mem.id
            return (
              <button
                key={mem.id}
                type="button"
                onClick={() => setSelectedMemberId(mem.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#F04491] text-white shadow-xs font-black'
                    : 'bg-white text-[#827780] hover:text-[#28232A] border border-[#F6E4EC]'
                }`}
              >
                <span>{mem.full_name.split(' ')[0]}</span>
                <span className="text-[10px] opacity-75">({mem.relationship.split(' ')[0]})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 5. SEÇÃO: "O QUE FALTA RESOLVER" (PENDÊNCIAS E TAREFAS PRIORITÁRIAS) */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.04)] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-[#FEF2F2] text-[#EF4444]">
                <AlertCircle size={18} />
              </span>
              <h2 className="text-base md:text-lg font-black text-[#28232A] tracking-tight">
                O que falta resolver
              </h2>
              <span className="bg-[#FFF9FB] text-[#F04491] border border-[#F6E4EC] text-[10px] font-black px-2 py-0.5 rounded-full">
                {unresolvedPendencies.length} ativas
              </span>
            </div>
            <p className="text-xs text-[#827780] font-medium">
              Tarefas críticas, documentos solicitados e encaminhamentos pendentes de retorno
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsNewPendencyModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#FFF9FB] hover:bg-[#FCE5ED]/50 border border-[#F6E4EC] text-[#F04491] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={14} />
            <span>Nova Pendência</span>
          </button>
        </div>

        {/* Lista de Pendências */}
        {filteredPendencies.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#FFF9FB] text-center border border-dashed border-[#F6E4EC]">
            <CheckCircle2 size={24} className="mx-auto text-[#36A879] mb-1.5" />
            <p className="text-xs font-bold text-[#28232A]">Nenhuma pendência em aberto para esta visualização.</p>
            <p className="text-[11px] text-[#827780] mt-0.5">Todas as exigências e documentos foram cumpridos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPendencies.map((pen) => {
              const isResolved = pen.status === 'resolvida'
              const isOverdue = !isResolved && pen.due_date && new Date(pen.due_date).getTime() < Date.now()
              const memberRelated = members.find((m) => m.id === pen.person_id)

              return (
                <div
                  key={pen.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isResolved
                      ? 'bg-[#F9FAFB] border-gray-200 opacity-60'
                      : isOverdue
                      ? 'bg-[#FFF5F5] border-[#FEB2B2] shadow-xs'
                      : 'bg-white border-[#F6E4EC]'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#827780]">
                        {memberRelated ? `👤 ${memberRelated.full_name}` : '👥 Família Geral'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isOverdue && (
                          <span className="bg-[#EF4444] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                            <AlertTriangle size={10} />
                            Vencida
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                            pen.priority === 'urgente'
                              ? 'bg-[#EF4444] text-white'
                              : pen.priority === 'alta'
                              ? 'bg-[#F97316] text-white'
                              : 'bg-gray-100 text-[#827780]'
                          }`}
                        >
                          {pen.priority}
                        </span>
                      </div>
                    </div>

                    <h3 className={`text-xs md:text-sm font-bold text-[#28232A] ${isResolved ? 'line-through' : ''}`}>
                      {pen.title}
                    </h3>

                    {pen.description && (
                      <p className="text-xs text-[#827780] font-medium leading-relaxed">
                        {pen.description}
                      </p>
                    )}

                    {pen.next_action && !isResolved && (
                      <div className="p-2 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] text-[11px] text-[#28232A] flex items-center gap-1.5">
                        <ArrowRight size={12} className="text-[#F04491] shrink-0" />
                        <span><strong>Próximo passo: </strong>{pen.next_action}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-[11px] text-[#827780]">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className={isOverdue ? 'text-[#EF4444]' : 'text-[#827780]'} />
                        Prazo: {pen.due_date ? new Date(pen.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePendencyStatus(pen)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                        isResolved
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-[#EBF7F1] text-[#1E5638] hover:bg-[#d5f0e3] border border-[#A7E2C6]/40'
                      }`}
                    >
                      <Check size={12} />
                      <span>{isResolved ? 'Reabrir' : 'Concluir'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 6. CABEÇALHO DA SEQUÊNCIA CRONOLÓGICA E FILTROS */}
      <div className="bg-white p-5 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-[#FCE5ED] text-[#F04491]">
              <GitCommit size={20} />
            </span>
            <div>
              <h2 className="text-base md:text-lg font-black text-[#28232A] tracking-tight">
                Histórico Cronológico de Atendimento
              </h2>
              <p className="text-xs text-[#827780] font-medium">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'registro encontrado' : 'registros encontrados'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-1.5 rounded-xl border border-[#F6E4EC] bg-white text-xs font-bold text-[#827780] hover:text-[#28232A] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Clock size={13} />
              <span>{sortOrder === 'desc' ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}</span>
            </button>
          </div>
        </div>

        {/* Barra de Pesquisa e Filtro de Categoria */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#F6E4EC]/60">
          <div className="sm:col-span-2 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar em movimentações, pareceres e ações..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#F6E4EC] text-xs text-[#28232A] placeholder-[#827780] focus:outline-hidden focus:border-[#F04491]"
            />
          </div>

          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#F6E4EC] bg-white text-xs font-bold text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
            >
              <option value="all">Todas as Categorias</option>
              <option value="atendimento">Atendimentos e Visitas</option>
              <option value="contato">Contatos e WhatsApp</option>
              <option value="documento">Documentação e Certidões</option>
              <option value="habitacao">Dossiês e Habitação</option>
              <option value="encaminhamento">Encaminhamentos</option>
              <option value="fluxo">Transições de Etapa</option>
            </select>
          </div>
        </div>
      </div>

      {/* 7. LISTA CRONOLÓGICA DE MOVIMENTAÇÕES (TIMELINE) */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-[#F6E4EC] text-center space-y-2">
            <HelpCircle size={32} className="mx-auto text-[#827780]/60 mb-2" />
            <p className="text-sm font-bold text-[#28232A]">Nenhuma movimentação encontrada para os filtros selecionados.</p>
            <p className="text-xs text-[#827780]">Tente limpar os termos de pesquisa ou selecionar outro integrante.</p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#F6E4EC]">
            {filteredEvents.map((evt, idx) => {
              const iconMeta = getEventIcon(evt.event_type)
              const relatedPerson = members.find((m) => m.id === evt.person_id)
              const typeSpec = TIMELINE_EVENT_TYPES.find((t) => t.id === evt.event_type)

              return (
                <div key={evt.id} className="relative mb-6 last:mb-0 group">
                  {/* Marcador na linha */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-1.5 w-7 h-7 rounded-full border-2 flex items-center justify-center z-10 transition-transform group-hover:scale-110 shadow-xs ${iconMeta.bg}`}
                  >
                    {iconMeta.icon}
                  </div>

                  {/* Card do Evento */}
                  <div className="p-4 md:p-5 rounded-2xl bg-white border border-[#F6E4EC] shadow-[0_1px_6px_rgba(0,0,0,0.02)] hover:border-[#F04491]/30 transition-all space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#F04491] bg-[#FCE5ED] px-2 py-0.5 rounded-md">
                          {typeSpec?.label || evt.event_type}
                        </span>
                        {relatedPerson && (
                          <span className="text-[10px] font-bold text-[#4B7BFF] bg-[#EDF2FF] px-2 py-0.5 rounded-md">
                            👤 {relatedPerson.full_name}
                          </span>
                        )}
                        {evt.stage && (
                          <span className="text-[10px] font-bold text-[#827780] bg-gray-100 px-2 py-0.5 rounded-md">
                            Etapa: {SUAS_STAGES.find((s) => s.id === evt.stage)?.shortLabel || evt.stage}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[#827780] font-medium text-[11px]">
                        <Clock size={12} className="text-[#F04491]" />
                        <span>
                          {new Date(evt.event_date).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-[#28232A] leading-snug">
                      {evt.title}
                    </h3>

                    {evt.description && (
                      <p className="text-xs text-[#827780] leading-relaxed font-normal whitespace-pre-line">
                        {evt.description}
                      </p>
                    )}

                    {evt.next_action && (
                      <div className="p-2.5 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-[#28232A]">
                          <ArrowRight size={13} className="text-[#F04491] shrink-0" />
                          <span><strong>Próxima ação: </strong>{evt.next_action}</span>
                        </div>
                        {evt.next_action_due_date && (
                          <span className="text-[10px] font-bold text-[#827780] shrink-0">
                            Prazo: {new Date(evt.next_action_due_date).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-[10px] text-[#827780]">
                      <span>Responsável: <strong>{evt.author_name || profileName}</strong></span>
                      <span className="text-gray-400">ID: {evt.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 8. MODAL: ALTERAR ETAPA DO FLUXO SUAS */}
      {isStageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-[#FCE5ED] text-[#F04491]">
                  <GitCommit size={20} />
                </span>
                <h3 className="text-base md:text-lg font-black text-[#28232A]">
                  Alterar Etapa do Acompanhamento SUAS
                </h3>
              </div>
              <button
                onClick={() => setIsStageModalOpen(false)}
                className="p-1 rounded-full text-[#827780] hover:text-[#28232A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStage} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1.5">
                  Nova Etapa
                </label>
                <select
                  value={newSelectedStage}
                  onChange={(e) => setNewSelectedStage(e.target.value as FamilyStage)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#F6E4EC] text-xs font-bold text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                >
                  {SUAS_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#827780] mt-1">
                  {SUAS_STAGES.find((s) => s.id === newSelectedStage)?.desc}
                </p>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1.5">
                  Justificativa / Parecer Técnico <span className="text-[#F04491]">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={stageJustification}
                  onChange={(e) => setStageJustification(e.target.value)}
                  placeholder="Fundamente o motivo técnico da transição de etapa (ex: família concluiu os encaminhamentos iniciais e pactuou metas do PAIF)..."
                  className="w-full p-3 rounded-xl border border-[#F6E4EC] text-xs text-[#28232A] placeholder-[#827780] focus:outline-hidden focus:border-[#F04491]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F6E4EC]">
                <button
                  type="button"
                  onClick={() => setIsStageModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#827780] hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#F04491] hover:bg-[#d8357d] text-white text-xs font-black cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                >
                  {isSubmitting ? 'Salvando...' : 'Confirmar Transição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: REGISTRAR NOVA MOVIMENTAÇÃO */}
      {isNewEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-[#FCE5ED] text-[#F04491]">
                  <Plus size={20} />
                </span>
                <h3 className="text-base md:text-lg font-black text-[#28232A]">
                  Registrar Movimentação na Linha do Tempo
                </h3>
              </div>
              <button
                onClick={() => setIsNewEventModalOpen(false)}
                className="p-1 rounded-full text-[#827780] hover:text-[#28232A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1">
                  Tipo de Evento
                </label>
                <select
                  value={newEventData.event_type}
                  onChange={(e) => setNewEventData({ ...newEventData, event_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F6E4EC] text-xs font-bold text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                >
                  {TIMELINE_EVENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1">
                  Pessoa Relacionada
                </label>
                <select
                  value={newEventData.person_id}
                  onChange={(e) => setNewEventData({ ...newEventData, person_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F6E4EC] text-xs text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                >
                  <option value="">Toda a Família (Geral)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.relationship})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1">
                  Título da Movimentação <span className="text-[#F04491]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Visita Domiciliar Diagnóstica, Contato Telefônico..."
                  value={newEventData.title}
                  onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F6E4EC] text-xs text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1">
                  Descrição ou Parecer Técnico
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalhes da intervenção, constatações técnicas ou orientações repassadas..."
                  value={newEventData.description}
                  onChange={(e) => setNewEventData({ ...newEventData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#F6E4EC] text-xs text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1">
                    Data do Acontecimento
                  </label>
                  <input
                    type="datetime-local"
                    value={newEventData.event_date}
                    onChange={(e) => setNewEventData({ ...newEventData, event_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#F6E4EC] text-xs text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1">
                    Prazo Próxima Ação (Opcional)
                  </label>
                  <input
                    type="date"
                    value={newEventData.next_action_due_date}
                    onChange={(e) => setNewEventData({ ...newEventData, next_action_due_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#F6E4EC] text-xs text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1">
                  Próxima Ação Recomendada (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cobrar retorno do relatório ao posto de saúde..."
                  value={newEventData.next_action}
                  onChange={(e) => setNewEventData({ ...newEventData, next_action: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F6E4EC] text-xs text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F6E4EC]">
                <button
                  type="button"
                  onClick={() => setIsNewEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#827780] hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#F04491] hover:bg-[#d8357d] text-white text-xs font-black cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Movimentação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. MODAL: REGISTRAR NOVA PENDÊNCIA */}
      {isNewPendencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-[#FEF2F2] text-[#EF4444]">
                  <AlertCircle size={20} />
                </span>
                <h3 className="text-base md:text-lg font-black text-[#28232A]">
                  Nova Pendência em "O que falta resolver"
                </h3>
              </div>
              <button
                onClick={() => setIsNewPendencyModalOpen(false)}
                className="p-1 rounded-full text-[#827780] hover:text-[#28232A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePendency} className="space-y-3.5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1">
                  Título da Pendência <span className="text-[#F04491]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Entregar Comprovante de Matrícula Escolar, Laudo Médico..."
                  value={newPendencyData.title}
                  onChange={(e) => setNewPendencyData({ ...newPendencyData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F6E4EC] text-xs text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1">
                  Pessoa Relacionada
                </label>
                <select
                  value={newPendencyData.person_id}
                  onChange={(e) => setNewPendencyData({ ...newPendencyData, person_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F6E4EC] text-xs text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                >
                  <option value="">Família Geral</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.relationship})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1">
                    Prioridade
                  </label>
                  <select
                    value={newPendencyData.priority}
                    onChange={(e) => setNewPendencyData({ ...newPendencyData, priority: e.target.value as PendencyPriority })}
                    className="w-full px-3 py-2 rounded-xl border border-[#F6E4EC] text-xs font-bold text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1">
                    Prazo Limite
                  </label>
                  <input
                    type="date"
                    value={newPendencyData.due_date}
                    onChange={(e) => setNewPendencyData({ ...newPendencyData, due_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#F6E4EC] text-xs text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1">
                  Descrição dos Requisitos
                </label>
                <textarea
                  rows={2}
                  placeholder="Orientações específicas sobre o que a família ou o profissional deve providenciar..."
                  value={newPendencyData.description}
                  onChange={(e) => setNewPendencyData({ ...newPendencyData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#F6E4EC] text-xs text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#827780] block mb-1">
                  Próximo Passo / Ação Imediata
                </label>
                <input
                  type="text"
                  placeholder="Ex: Entrar em contato com o CRAS..."
                  value={newPendencyData.next_action}
                  onChange={(e) => setNewPendencyData({ ...newPendencyData, next_action: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F6E4EC] text-xs text-[#28232A] focus:outline-hidden focus:border-[#F04491]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F6E4EC]">
                <button
                  type="button"
                  onClick={() => setIsNewPendencyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#827780] hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#F04491] hover:bg-[#d8357d] text-white text-xs font-black cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                >
                  {isSubmitting ? 'Salvando...' : 'Adicionar Pendência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
