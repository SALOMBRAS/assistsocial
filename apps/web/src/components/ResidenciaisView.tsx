import React, { useState, useEffect, useMemo } from 'react'
import {
  Building2,
  FolderOpen,
  Send,
  FileCheck,
  AlertCircle,
  Clock,
  UserX,
  Trash2,
  CheckCircle2,
  XCircle,
  Layers,
  Plus,
  Search,
  Edit2,
  Check,
  FileSignature,
  RefreshCw,
  X,
  ArrowLeft,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useModalA11y } from '../hooks/useModalA11y'

export type ResidencialSlug = 'paupina' | 'joaquim_machado'
export type ResidentialSubTab = 'dossiers' | 'batches' | 'proxies'

export type OperationalStatus =
  | 'sem_pendencia'
  | 'com_pendencias'
  | 'reenviado_pesquisa'
  | 'nao_veio'
  | 'excluido'

export type ComplianceStatus = 'conforme' | 'inconforme' | 'neutro'
export type ProxyStatus = 'nao_se_aplica' | 'pendente' | 'em_andamento' | 'concluida'

export interface BatchItem {
  id: string
  residencial_slug: ResidencialSlug
  name: string
  dispatch_date: string | null
  status: string
  notes: string | null
  created_at: string
}

export interface DossierItem {
  id: string
  residencial_slug: ResidencialSlug
  code: string | null
  person_name: string
  unit_number: string | null
  phone: string | null
  operational_status: OperationalStatus
  compliance_status: ComplianceStatus
  batch_id: string | null
  needs_proxy: boolean
  proxy_status: ProxyStatus
  proxy_reason: string | null
  proxy_notes: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ResidenciaisViewProps {
  onBackToDashboard?: () => void
}

export const ResidenciaisView: React.FC<ResidenciaisViewProps> = ({ onBackToDashboard }) => {
  const { user } = useAuth()
  const [selectedResidencial, setSelectedResidencial] = useState<ResidencialSlug>('paupina')
  const [currentSubTab, setCurrentSubTab] = useState<ResidentialSubTab>('dossiers')
  
  // Dados do Supabase
  const [dossiers, setDossiers] = useState<DossierItem[]>([])
  const [batches, setBatches] = useState<BatchItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros de dossiês
  const [searchTerm, setSearchTerm] = useState('')
  const [activeIndicatorFilter, setActiveIndicatorFilter] = useState<string>('all')

  // Modais
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false)
  const [editingDossier, setEditingDossier] = useState<DossierItem | null>(null)
  
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<BatchItem | null>(null)

  // Feedback Toast
  const [feedback, setFeedback] = useState<string | null>(null)
  const showFeedback = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3500)
  }

  // 1. Carregar Lotes e Dossiês do Supabase
  const loadData = async () => {
    setLoading(true)
    try {
      // Carregar Lotes
      const { data: batchesData, error: batchesError } = await supabase
        .from('residential_batches')
        .select('*')
        .eq('residencial_slug', selectedResidencial)
        .order('name', { ascending: true })

      if (!batchesError && batchesData) {
        setBatches(batchesData as BatchItem[])
      }

      // Carregar Dossiês
      const { data: dossiersData, error: dossiersError } = await supabase
        .from('dossiers')
        .select('*')
        .eq('residencial_slug', selectedResidencial)
        .order('person_name', { ascending: true })

      if (!dossiersError && dossiersData) {
        setDossiers(dossiersData as DossierItem[])
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do Supabase:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedResidencial])

  // 2. Indicadores Calculados a Partir dos Dados Reais
  const indicators = useMemo(() => {
    const semPendencia = dossiers.filter((d) => d.operational_status === 'sem_pendencia').length
    const comPendencias = dossiers.filter((d) => d.operational_status === 'com_pendencias').length
    const reenviado = dossiers.filter((d) => d.operational_status === 'reenviado_pesquisa').length
    const naoVeio = dossiers.filter((d) => d.operational_status === 'nao_veio').length
    const excluidos = dossiers.filter((d) => d.operational_status === 'excluido').length
    const conformes = dossiers.filter((d) => d.compliance_status === 'conforme').length
    const inconformes = dossiers.filter((d) => d.compliance_status === 'inconforme').length
    const loteados = dossiers.filter((d) => d.batch_id !== null).length
    const procuracoes = dossiers.filter((d) => d.needs_proxy).length

    return {
      semPendencia,
      comPendencias,
      reenviado,
      naoVeio,
      excluidos,
      conformes,
      inconformes,
      loteados,
      procuracoes,
    }
  }, [dossiers])

  // 3. Dossiês Filtrados pela Busca e pelo Indicador Selecionado
  const filteredDossiers = useMemo(() => {
    return dossiers.filter((d) => {
      // Busca por nome, código ou unidade
      const matchSearch =
        d.person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.code && d.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.unit_number && d.unit_number.toLowerCase().includes(searchTerm.toLowerCase()))

      if (!matchSearch) return false

      // Filtro por indicador clicado
      switch (activeIndicatorFilter) {
        case 'sem_pendencia':
          return d.operational_status === 'sem_pendencia'
        case 'com_pendencias':
          return d.operational_status === 'com_pendencias'
        case 'reenviado_pesquisa':
          return d.operational_status === 'reenviado_pesquisa'
        case 'nao_veio':
          return d.operational_status === 'nao_veio'
        case 'excluido':
          return d.operational_status === 'excluido'
        case 'conforme':
          return d.compliance_status === 'conforme'
        case 'inconforme':
          return d.compliance_status === 'inconforme'
        case 'loteados':
          return d.batch_id !== null
        default:
          return true
      }
    })
  }, [dossiers, searchTerm, activeIndicatorFilter])

  // 4. Pessoas que precisam de procuração (Aba Procurações)
  const proxyDossiers = useMemo(() => {
    return dossiers.filter((d) => {
      if (!d.needs_proxy) return false
      const matchSearch =
        d.person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.unit_number && d.unit_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.proxy_reason && d.proxy_reason.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchSearch
    })
  }, [dossiers, searchTerm])

  // Helper para nome do lote
  const getBatchName = (batchId: string | null) => {
    if (!batchId) return 'Sem Lote'
    const b = batches.find((x) => x.id === batchId)
    return b ? b.name : 'Lote Desconhecido'
  }

  // Ações de Dossiê: Salvar (Criar ou Editar)
  const handleSaveDossier = async (formData: Partial<DossierItem>) => {
    try {
      if (editingDossier?.id) {
        // Atualizar
        const { error } = await (supabase.from('dossiers') as any)
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDossier.id)

        if (error) throw error

        setDossiers((prev) =>
          prev.map((d) => (d.id === editingDossier.id ? { ...d, ...formData } as DossierItem : d))
        )
        showFeedback('Dossiê atualizado com sucesso!')
      } else {
        // Criar Novo
        const newRecord = {
          residencial_slug: selectedResidencial,
          created_by: user?.id,
          ...formData,
        }

        const { data, error } = await (supabase.from('dossiers') as any)
          .insert(newRecord)
          .select()
          .single()

        if (error) throw error

        if (data) {
          setDossiers((prev) => [data as DossierItem, ...prev])
        } else {
          loadData()
        }
        showFeedback('Dossiê cadastrado com sucesso!')
      }
    } catch (err: any) {
      console.error('Erro ao salvar dossiê:', err)
      showFeedback(`Erro ao salvar: ${err?.message || 'Falha no banco de dados'}`)
    } finally {
      setIsDossierModalOpen(false)
      setEditingDossier(null)
    }
  }

  // Ações de Lote: Salvar (Criar ou Editar)
  const handleSaveBatch = async (formData: Partial<BatchItem>) => {
    try {
      if (editingBatch?.id) {
        // Atualizar
        const { error } = await (supabase.from('residential_batches') as any)
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBatch.id)

        if (error) throw error

        setBatches((prev) =>
          prev.map((b) => (b.id === editingBatch.id ? { ...b, ...formData } as BatchItem : b))
        )
        showFeedback('Lote atualizado com sucesso!')
      } else {
        // Criar Novo
        const newRecord = {
          residencial_slug: selectedResidencial,
          created_by: user?.id,
          ...formData,
        }

        const { data, error } = await (supabase.from('residential_batches') as any)
          .insert(newRecord)
          .select()
          .single()

        if (error) throw error

        if (data) {
          setBatches((prev) => [...prev, data as BatchItem])
        } else {
          loadData()
        }
        showFeedback('Novo lote criado com sucesso!')
      }
    } catch (err: any) {
      console.error('Erro ao salvar lote:', err)
      showFeedback(`Erro ao salvar lote: ${err?.message || 'Falha no banco'}`)
    } finally {
      setIsBatchModalOpen(false)
      setEditingBatch(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed top-5 right-5 z-50 bg-[#28232A] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-[#F04491]/30">
          <CheckCircle2 size={16} className="text-[#36A879]" />
          <span>{feedback}</span>
        </div>
      )}

      {/* CABEÇALHO COM SELEÇÃO DO RESIDENCIAL */}
      <div className="bg-white rounded-3xl p-6 border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#F6E4EC] text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED]/40 text-xs font-bold transition-all cursor-pointer shadow-xs mr-1"
                title="Voltar ao Painel Inicial"
              >
                <ArrowLeft size={14} />
                <span>Painel Inicial</span>
              </button>
            )}
            <div className="flex items-center gap-2 text-[#F04491] text-xs font-bold uppercase tracking-wider">
              <Building2 size={16} />
              <span>Gestão Territorial de Habitação de Interesse Social</span>
            </div>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
            Área dos Residenciais
          </h1>
          <p className="text-xs text-[#827780] mt-0.5">
            Acompanhamento individualizado de dossiês, conformidade, lotes de envio e procurações.
          </p>
        </div>

        {/* BOTÕES DE TROCA DE RESIDENCIAL */}
        <div className="flex items-center p-1 bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl shadow-sm">
          <button
            onClick={() => {
              setSelectedResidencial('paupina')
              setActiveIndicatorFilter('all')
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              selectedResidencial === 'paupina'
                ? 'bg-[#F04491] text-white shadow-sm'
                : 'text-[#827780] hover:text-[#28232A]'
            }`}
          >
            <span>Residencial Paupina</span>
          </button>
          <button
            onClick={() => {
              setSelectedResidencial('joaquim_machado')
              setActiveIndicatorFilter('all')
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              selectedResidencial === 'joaquim_machado'
                ? 'bg-[#F04491] text-white shadow-sm'
                : 'text-[#827780] hover:text-[#28232A]'
            }`}
          >
            <span>Residencial Joaquim Machado</span>
          </button>
        </div>
      </div>

      {/* 8 INDICADORES OBRIGATÓRIOS DO RESIDENCIAL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {[
          { id: 'sem_pendencia', label: 'Sem Pendência', count: indicators.semPendencia, icon: <CheckCircle2 size={14} />, color: 'text-[#36A879] bg-[#EBF7F1]' },
          { id: 'com_pendencias', label: 'Com Pendência', count: indicators.comPendencias, icon: <AlertCircle size={14} />, color: 'text-[#E59B28] bg-[#FEF8EC]' },
          { id: 'reenviado_pesquisa', label: 'Reenviados', count: indicators.reenviado, icon: <Clock size={14} />, color: 'text-[#4B7BFF] bg-[#EDF2FF]' },
          { id: 'nao_veio', label: 'Não Vieram', count: indicators.naoVeio, icon: <UserX size={14} />, color: 'text-[#827780] bg-[#F5F4F5]' },
          { id: 'excluido', label: 'Excluídos', count: indicators.excluidos, icon: <Trash2 size={14} />, color: 'text-[#D93025] bg-[#FEF1F2]' },
          { id: 'conforme', label: 'Conformes', count: indicators.conformes, icon: <FileCheck size={14} />, color: 'text-[#36A879] bg-[#EBF7F1]' },
          { id: 'inconforme', label: 'Inconformes', count: indicators.inconformes, icon: <XCircle size={14} />, color: 'text-[#D93025] bg-[#FEF1F2]' },
          { id: 'loteados', label: 'Loteados', count: indicators.loteados, icon: <Layers size={14} />, color: 'text-[#9B51E0] bg-[#F5EBFF]' },
        ].map((ind) => {
          const isSelected = activeIndicatorFilter === ind.id
          return (
            <button
              key={ind.id}
              onClick={() => {
                setActiveIndicatorFilter(isSelected ? 'all' : ind.id)
                setCurrentSubTab('dossiers')
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#F04491] ring-2 ring-[#F04491]/20 bg-[#FFF9FB] shadow-sm'
                  : 'border-[#F6E4EC] bg-white hover:border-[#F58BB5]/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`p-1 rounded-lg ${ind.color}`}>
                  {ind.icon}
                </span>
                <span className="text-base font-black text-[#28232A]">
                  {ind.count}
                </span>
              </div>
              <p className="text-[11px] font-bold text-[#827780] truncate leading-tight">
                {ind.label}
              </p>
            </button>
          )
        })}
      </div>

      {/* BARRA DE NAVEGAÇÃO DE SEÇÕES DO RESIDENCIAL */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[#F6E4EC] pb-2">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'dossiers', label: 'Dossiês do Residencial', icon: <FolderOpen size={15} />, count: dossiers.length },
            { id: 'batches', label: 'Lotes e Envios', icon: <Layers size={15} />, count: batches.length },
            { id: 'proxies', label: 'Procurações (Não Assinam)', icon: <FileSignature size={15} />, count: indicators.procuracoes },
          ].map((tab) => {
            const isActive = currentSubTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentSubTab(tab.id as ResidentialSubTab)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#F04491] text-white shadow-sm'
                    : 'bg-white text-[#827780] hover:text-[#28232A] hover:bg-[#FCE5ED]/30 border border-[#F6E4EC]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#FFF9FB] text-[#827780]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* BOTÃO DE AÇÃO PRINCIPAL CONTEXTUAL */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {currentSubTab === 'dossiers' && (
            <button
              onClick={() => {
                setEditingDossier(null)
                setIsDossierModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Novo Dossiê</span>
            </button>
          )}

          {currentSubTab === 'batches' && (
            <button
              onClick={() => {
                setEditingBatch(null)
                setIsBatchModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Novo Lote de Envio</span>
            </button>
          )}

          {currentSubTab === 'proxies' && (
            <button
              onClick={() => {
                setEditingDossier(null)
                setIsDossierModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Cadastrar Não Assinante</span>
            </button>
          )}
        </div>
      </div>

      {/* SEÇÃO 1: TABELA E GESTÃO DE DOSSIÊS */}
      {currentSubTab === 'dossiers' && (
        <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] overflow-hidden">
          {/* Barra de Pesquisa e Filtros */}
          <div className="p-4 border-b border-[#F6E4EC] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FFF9FB]/50">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
              <input
                type="text"
                placeholder="Buscar por titular, código ou bloco..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#F6E4EC] rounded-2xl text-xs font-semibold text-[#28232A] focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491]"
              />
            </div>

            {activeIndicatorFilter !== 'all' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#827780]">Filtro ativo:</span>
                <span className="font-bold text-[#F04491] bg-[#FCE5ED] px-2.5 py-1 rounded-xl">
                  {activeIndicatorFilter}
                </span>
                <button
                  onClick={() => setActiveIndicatorFilter('all')}
                  className="text-xs text-[#827780] hover:text-[#28232A] underline cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          {/* Tabela de Dossiês */}
          {loading ? (
            <div className="py-16 text-center text-xs text-[#827780] flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-[#F04491]" />
              <span>Carregando dossiês de {selectedResidencial === 'paupina' ? 'Paupina' : 'Joaquim Machado'}...</span>
            </div>
          ) : filteredDossiers.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <FolderOpen size={36} className="mx-auto text-[#827780]/40" />
              <h4 className="text-sm font-bold text-[#28232A]">Nenhum dossiê encontrado</h4>
              <p className="text-xs text-[#827780] max-w-sm mx-auto">
                Cadastre o primeiro titular ou ajuste os filtros da pesquisa.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF9FB] border-b border-[#F6E4EC] text-[#827780] font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Titular / Código</th>
                    <th className="py-3 px-4">Unidade / Apto</th>
                    <th className="py-3 px-4">Situação Operacional</th>
                    <th className="py-3 px-4">Conformidade</th>
                    <th className="py-3 px-4">Lote Vinculado</th>
                    <th className="py-3 px-4">Procuração</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F6E4EC]/60">
                  {filteredDossiers.map((dossier) => (
                    <tr key={dossier.id} className="hover:bg-[#FFF9FB]/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#28232A]">{dossier.person_name}</p>
                        <p className="text-[10px] text-[#827780] font-mono">{dossier.code || 'S/ CÓDIGO'}</p>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#28232A]">
                        {dossier.unit_number || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                            dossier.operational_status === 'sem_pendencia'
                              ? 'bg-[#EBF7F1] text-[#36A879]'
                              : dossier.operational_status === 'com_pendencias'
                              ? 'bg-[#FEF8EC] text-[#E59B28]'
                              : dossier.operational_status === 'reenviado_pesquisa'
                              ? 'bg-[#EDF2FF] text-[#4B7BFF]'
                              : dossier.operational_status === 'nao_veio'
                              ? 'bg-[#F5F4F5] text-[#827780]'
                              : 'bg-[#FEF1F2] text-[#D93025]'
                          }`}
                        >
                          {dossier.operational_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            dossier.compliance_status === 'conforme'
                              ? 'bg-[#EBF7F1] text-[#36A879]'
                              : dossier.compliance_status === 'inconforme'
                              ? 'bg-[#FEF1F2] text-[#D93025]'
                              : 'bg-[#F5F4F5] text-[#827780]'
                          }`}
                        >
                          {dossier.compliance_status === 'conforme' && <Check size={10} />}
                          {dossier.compliance_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {dossier.batch_id ? (
                          <span className="px-2.5 py-1 rounded-xl bg-[#F5EBFF] text-[#9B51E0] font-bold text-[10px]">
                            {getBatchName(dossier.batch_id)}
                          </span>
                        ) : (
                          <span className="text-[#827780] text-[11px]">Não Loteado</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {dossier.needs_proxy ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E59B28] bg-[#FEF8EC] px-2 py-0.5 rounded-full">
                            <FileSignature size={11} />
                            <span>{dossier.proxy_status}</span>
                          </span>
                        ) : (
                          <span className="text-[#827780] text-[11px]">Não requer</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingDossier(dossier)
                            setIsDossierModalOpen(true)
                          }}
                          className="p-1.5 rounded-xl text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] transition-colors cursor-pointer"
                          title="Editar Dossiê"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 2: LOTES E ENVIOS */}
      {currentSubTab === 'batches' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {batches.map((batch) => {
              const batchDossiers = dossiers.filter((d) => d.batch_id === batch.id)
              return (
                <div
                  key={batch.id}
                  className="bg-white rounded-3xl p-5 border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-1 rounded-xl bg-[#F5EBFF] text-[#9B51E0] text-xs font-black">
                        {batch.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          batch.status === 'enviado'
                            ? 'bg-[#EBF7F1] text-[#36A879]'
                            : batch.status === 'em_processamento'
                            ? 'bg-[#EDF2FF] text-[#4B7BFF]'
                            : 'bg-[#FEF8EC] text-[#E59B28]'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#28232A]">
                      {batchDossiers.length} Dossiê(s) Vinculado(s)
                    </h4>
                    {batch.notes && (
                      <p className="text-xs text-[#827780] mt-1 line-clamp-2">
                        {batch.notes}
                      </p>
                    )}
                    {batch.dispatch_date && (
                      <p className="text-[11px] text-[#4B7BFF] font-semibold mt-2 flex items-center gap-1">
                        <Send size={12} />
                        <span>Envio: {new Date(batch.dispatch_date).toLocaleDateString('pt-BR')}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#F6E4EC] flex items-center justify-between">
                    <button
                      onClick={() => {
                        setEditingBatch(batch)
                        setIsBatchModalOpen(true)
                      }}
                      className="text-xs font-bold text-[#F04491] hover:underline cursor-pointer"
                    >
                      Editar Dados do Lote
                    </button>
                    <button
                      onClick={() => {
                        setActiveIndicatorFilter('loteados')
                        setCurrentSubTab('dossiers')
                      }}
                      className="text-xs text-[#827780] hover:text-[#28232A] cursor-pointer"
                    >
                      Ver Famílias
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SEÇÃO 3: ABA DE PROCURAÇÕES (NÃO ASSINAM) */}
      {currentSubTab === 'proxies' && (
        <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-[#FEF8EC] border border-[#FDE68A] text-xs text-[#92400E] flex items-start gap-3">
            <FileSignature size={20} className="text-[#E59B28] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Controle Especial de Procurações & Representação Legal</h4>
              <p className="text-[11px] mt-0.5 leading-relaxed">
                Esta aba consolida todos os titulares do <strong>{selectedResidencial === 'paupina' ? 'Residencial Paupina' : 'Residencial Joaquim Machado'}</strong> que possuem impedimento para assinatura autônoma de contratos habitacionais (analfabetismo, incapacidade civil ou limitação física).
              </p>
            </div>
          </div>

          {proxyDossiers.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#827780]">
              Nenhum titular registrado com necessidade de procuração neste residencial.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {proxyDossiers.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#28232A]">{p.person_name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.proxy_status === 'concluida'
                            ? 'bg-[#EBF7F1] text-[#36A879]'
                            : p.proxy_status === 'em_andamento'
                            ? 'bg-[#EDF2FF] text-[#4B7BFF]'
                            : 'bg-[#FEF8EC] text-[#E59B28]'
                        }`}
                      >
                        {p.proxy_status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#827780] font-mono mt-0.5">
                      Unidade: {p.unit_number || 'S/N'} • Cód: {p.code || '—'}
                    </p>
                    {p.proxy_reason && (
                      <p className="text-xs text-[#28232A] font-semibold mt-2 bg-white p-2 rounded-xl border border-[#F6E4EC]">
                        Motivo: {p.proxy_reason}
                      </p>
                    )}
                    {p.proxy_notes && (
                      <p className="text-[11px] text-[#827780] mt-1.5 italic">
                        Obs: {p.proxy_notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#F6E4EC] flex items-center justify-end">
                    <button
                      onClick={() => {
                        setEditingDossier(p)
                        setIsDossierModalOpen(true)
                      }}
                      className="text-xs font-bold text-[#F04491] hover:underline cursor-pointer"
                    >
                      Atualizar Situação
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE DOSSIÊ */}
      {isDossierModalOpen && (
        <DossierModal
          isOpen={isDossierModalOpen}
          onClose={() => {
            setIsDossierModalOpen(false)
            setEditingDossier(null)
          }}
          onSave={handleSaveDossier}
          initialData={editingDossier}
          batches={batches}
          residencialName={selectedResidencial === 'paupina' ? 'Residencial Paupina' : 'Residencial Joaquim Machado'}
        />
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE LOTE */}
      {isBatchModalOpen && (
        <BatchModal
          isOpen={isBatchModalOpen}
          onClose={() => {
            setIsBatchModalOpen(false)
            setEditingBatch(null)
          }}
          onSave={handleSaveBatch}
          initialData={editingBatch}
          residencialName={selectedResidencial === 'paupina' ? 'Residencial Paupina' : 'Residencial Joaquim Machado'}
        />
      )}
    </div>
  )
}

// -------------------------------------------------------------
// MODAL DE CADASTRO / EDIÇÃO DE DOSSIÊ
// -------------------------------------------------------------
interface DossierModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<DossierItem>) => void
  initialData: DossierItem | null
  batches: BatchItem[]
  residencialName: string
}

const DossierModal: React.FC<DossierModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  batches,
  residencialName,
}) => {
  const [personName, setPersonName] = useState(initialData?.person_name || '')
  const [code, setCode] = useState(initialData?.code || '')
  const [unitNumber, setUnitNumber] = useState(initialData?.unit_number || '')
  const [phone] = useState(initialData?.phone || '')
  const [operationalStatus, setOperationalStatus] = useState<OperationalStatus>(
    initialData?.operational_status || 'sem_pendencia'
  )
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>(
    initialData?.compliance_status || 'neutro'
  )
  const [batchId, setBatchId] = useState<string | null>(initialData?.batch_id || null)
  const [needsProxy, setNeedsProxy] = useState(initialData?.needs_proxy || false)
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus>(
    initialData?.proxy_status || 'pendente'
  )
  const [proxyReason, setProxyReason] = useState(initialData?.proxy_reason || '')
  const [notes, setNotes] = useState(initialData?.notes || '')

  useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: true,
    preventScroll: true,
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!personName.trim()) return

    onSave({
      person_name: personName.trim(),
      code: code.trim() || null,
      unit_number: unitNumber.trim() || null,
      phone: phone.trim() || null,
      operational_status: operationalStatus,
      compliance_status: complianceStatus,
      batch_id: batchId || null,
      needs_proxy: needsProxy,
      proxy_status: needsProxy ? proxyStatus : 'nao_se_aplica',
      proxy_reason: needsProxy ? proxyReason.trim() : null,
      notes: notes.trim() || null,
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-[#F6E4EC] overflow-hidden flex flex-col max-h-[90dvh]">
        <div className="px-6 py-4 border-b border-[#F6E4EC] flex items-center justify-between bg-[#FFF9FB]">
          <div>
            <h3 id="dossier-modal-title" className="text-base font-black text-[#28232A]">
              {initialData ? 'Editar Dossiê' : 'Novo Dossiê'}
            </h3>
            <p className="text-xs text-[#827780]">{residencialName}</p>
          </div>
          <button
            type="button"
            aria-label="Fechar dossiê"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:text-[#28232A] hover:bg-[#FCE5ED] cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#28232A] mb-1">Nome Completo do Titular *</label>
            <input
              type="text"
              required
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Ex: Maria das Graças Silva"
              className="w-full px-3.5 py-2.5 bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-sm font-semibold text-[#28232A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#28232A] mb-1">Código do Dossiê</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: DOS-042"
                className="w-full px-3.5 py-2 bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-[#28232A] mb-1">Bloco / Apartamento</label>
              <input
                type="text"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="Ex: Bloco B, Apt 204"
                className="w-full px-3.5 py-2 bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#28232A] mb-1">Situação Operacional</label>
              <select
                value={operationalStatus}
                onChange={(e) => setOperationalStatus(e.target.value as OperationalStatus)}
                className="w-full px-3 py-2 bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl font-semibold text-xs"
              >
                <option value="sem_pendencia">Sem Pendência</option>
                <option value="com_pendencias">Com Pendências</option>
                <option value="reenviado_pesquisa">Reenviado para Pesquisa</option>
                <option value="nao_veio">Não Veio</option>
                <option value="excluido">Excluído</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#28232A] mb-1">Conformidade Técnica</label>
              <select
                value={complianceStatus}
                onChange={(e) => setComplianceStatus(e.target.value as ComplianceStatus)}
                className="w-full px-3 py-2 bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl font-semibold text-xs"
              >
                <option value="neutro">Neutro (Não avaliado)</option>
                <option value="conforme">Conforme</option>
                <option value="inconforme">Inconforme</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#28232A] mb-1">Lote de Envio Associado</label>
            <select
              value={batchId || ''}
              onChange={(e) => setBatchId(e.target.value || null)}
              className="w-full px-3 py-2 bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl font-semibold text-xs"
            >
              <option value="">Nenhum Lote (Não Loteado)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.status})
                </option>
              ))}
            </select>
          </div>

          {/* Seção de Procuração */}
          <div className="p-3.5 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] space-y-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-[#28232A]">
              <input
                type="checkbox"
                checked={needsProxy}
                onChange={(e) => setNeedsProxy(e.target.checked)}
                className="w-4 h-4 rounded text-[#F04491] accent-[#F04491]"
              />
              <span>Necessita de Procuração (Não assina documentos)</span>
            </label>

            {needsProxy && (
              <div className="space-y-2 pt-2 border-t border-[#F6E4EC]/60">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#827780] mb-1">Status da Procuração</label>
                    <select
                      value={proxyStatus}
                      onChange={(e) => setProxyStatus(e.target.value as ProxyStatus)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#F6E4EC] rounded-xl text-xs"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#827780] mb-1">Motivo do Impedimento</label>
                    <input
                      type="text"
                      value={proxyReason}
                      onChange={(e) => setProxyReason(e.target.value)}
                      placeholder="Ex: Analfabetismo"
                      className="w-full px-2.5 py-1.5 bg-white border border-[#F6E4EC] rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-[#28232A] mb-1">Anotações e Histórico</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações complementares do atendimento ou visita..."
              className="w-full px-3 py-2 bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-xs"
            ></textarea>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#F6E4EC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#827780] hover:bg-[#FFF9FB]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-sm"
            >
              Salvar Dossiê
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// MODAL DE CADASTRO / EDIÇÃO DE LOTE
// -------------------------------------------------------------
interface BatchModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<BatchItem>) => void
  initialData: BatchItem | null
  residencialName: string
}

const BatchModal: React.FC<BatchModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  residencialName,
}) => {
  const [name, setName] = useState(initialData?.name || '')
  const [dispatchDate, setDispatchDate] = useState(initialData?.dispatch_date || '')
  const [status, setStatus] = useState(initialData?.status || 'draft')
  const [notes, setNotes] = useState(initialData?.notes || '')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    onSave({
      name: name.trim(),
      dispatch_date: dispatchDate || null,
      status,
      notes: notes.trim() || null,
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#F6E4EC] overflow-hidden flex flex-col max-h-[90dvh]">
        <div className="px-6 py-4 border-b border-[#F6E4EC] flex items-center justify-between bg-[#FFF9FB]">
          <div>
            <h3 id="batch-modal-title" className="text-base font-black text-[#28232A]">
              {initialData ? 'Editar Lote de Envio' : 'Novo Lote de Envio'}
            </h3>
            <p className="text-xs text-[#827780]">{residencialName}</p>
          </div>
          <button
            type="button"
            aria-label="Fechar lote"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:text-[#28232A] hover:bg-[#FCE5ED] cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#28232A] mb-1">Identificação do Lote *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lote 5 ou Remessa Especial Outubro"
              className="w-full px-3.5 py-2.5 bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-sm font-semibold text-[#28232A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#28232A] mb-1">Data de Envio</label>
              <input
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-[#28232A] mb-1">Situação do Lote</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl font-semibold text-xs"
              >
                <option value="draft">Rascunho (Em montagem)</option>
                <option value="enviado">Enviado</option>
                <option value="em_processamento">Em Processamento</option>
                <option value="concluido">Concluído</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#28232A] mb-1">Observações do Envio</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes sobre a remessa, órgão receptor, protocolo de entrega..."
              className="w-full px-3 py-2 bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-xs"
            ></textarea>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#F6E4EC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#827780] hover:bg-[#FFF9FB]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-sm"
            >
              Salvar Lote
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
