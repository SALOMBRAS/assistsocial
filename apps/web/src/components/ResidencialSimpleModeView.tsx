import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Building2,
  Users,
  DoorOpen,
  Accessibility,
  FileCheck2,
  FileClock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UserX,
  FileX2,
  ThumbsUp,
  ThumbsDown,
  Layers,
  FileSignature,
  Edit3,
  Save,
  X,
  History,
  Info,
  ShieldCheck,
  Calculator,
  RefreshCw,
} from 'lucide-react'
import type { ResidencialItem } from '../types/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useModalA11y } from '../hooks/useModalA11y'
import {
  type ResidentialSimpleMetrics,
  type MetricsHistoryEntry,
  fetchResidentialSimpleMetrics,
  saveResidentialSimpleMetrics,
  fetchResidentialMetricsHistory,
  validateSimpleMetrics,
  calculateSuggestedVacancies,
} from '../services/residentialSimpleMetricsService'

interface ResidencialSimpleModeViewProps {
  residencial: ResidencialItem
}

export const ResidencialSimpleModeView: React.FC<ResidencialSimpleModeViewProps> = ({
  residencial,
}) => {
  const { user } = useAuth()

  // Estado dos dados atuais salvos no backend
  const [persistedMetrics, setPersistedMetrics] = useState<ResidentialSimpleMetrics | null>(null)
  // Estado dos dados em edição (draft)
  const [formData, setFormData] = useState<Partial<ResidentialSimpleMetrics>>({})
  
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Histórico Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyList, setHistoryList] = useState<MetricsHistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => {
      setFeedback(null)
    }, 4500)
  }

  // Carregar dados salvos ao trocar de residencial
  const loadMetrics = useCallback(async () => {
    setIsLoading(true)
    setIsEditing(false)
    try {
      const result = await fetchResidentialSimpleMetrics(residencial.slug)
      if (result.metrics) {
        setPersistedMetrics(result.metrics)
        setFormData(result.metrics)
      } else {
        // Inicializa vazio ou com dados cadastrais de PCD
        const initial: Partial<ResidentialSimpleMetrics> = {
          residencial_slug: residencial.slug,
          total_capacity: null,
          occupied_units: null,
          available_units: null,
          pcd_adapted_units: residencial.pcd_adapted_units_count ?? null,
          pending_documents_count: null,
          regular_documents_count: null,
          dossiers_no_pending_count: null,
          dossiers_with_pending_count: null,
          dossiers_resubmitted_search_count: null,
          no_show_count: null,
          dossiers_excluded_count: null,
          dossiers_compliant_count: null,
          dossiers_non_compliant_count: null,
          dossiers_batched_count: null,
          proxies_needed_count: null,
          notes: '',
        }
        setPersistedMetrics(null)
        setFormData(initial)
      }
    } catch {
      showToast('error', 'Não foi possível carregar os indicadores do residencial.')
    } finally {
      setIsLoading(false)
    }
  }, [residencial.slug, residencial.pcd_adapted_units_count])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  // Verificação de validação em tempo real
  const validation = useMemo(() => {
    return validateSimpleMetrics(formData)
  }, [formData])

  // Cálculo de sugestão de vagas livres
  const suggestedVacancies = useMemo(() => {
    return calculateSuggestedVacancies(formData.total_capacity, formData.occupied_units)
  }, [formData.total_capacity, formData.occupied_units])

  // Tratar alteração nos inputs numéricos
  const handleNumberChange = (key: keyof ResidentialSimpleMetrics, rawValue: string) => {
    if (!isEditing) setIsEditing(true)

    if (rawValue.trim() === '') {
      setFormData((prev) => ({ ...prev, [key]: null }))
      return
    }

    const parsed = parseInt(rawValue, 10)
    if (isNaN(parsed)) {
      setFormData((prev) => ({ ...prev, [key]: null }))
    } else {
      setFormData((prev) => ({ ...prev, [key]: parsed }))
    }
  }

  // Cancelar alterações
  const handleCancelEdit = () => {
    if (persistedMetrics) {
      setFormData(persistedMetrics)
    } else {
      setFormData({
        residencial_slug: residencial.slug,
        pcd_adapted_units: residencial.pcd_adapted_units_count ?? null,
      })
    }
    setIsEditing(false)
  }

  // Salvar no backend
  const handleSave = async () => {
    if (!validation.isValid) {
      showToast('error', validation.errors[0] || 'Por favor, corrija os valores antes de salvar.')
      return
    }

    setIsSaving(true)
    try {
      const result = await saveResidentialSimpleMetrics(
        residencial.slug,
        formData,
        user?.id
      )

      if (result.success && result.data) {
        setPersistedMetrics(result.data)
        setFormData(result.data)
        setIsEditing(false)
        showToast('success', 'Indicadores quantitativos salvos com sucesso no backend.')
      } else {
        showToast('error', result.message || 'Falha ao salvar indicadores.')
      }
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao processar salvamento.')
    } finally {
      setIsSaving(false)
    }
  }

  // Carregar histórico
  const handleOpenHistory = async () => {
    setIsHistoryModalOpen(true)
    setLoadingHistory(true)
    try {
      const history = await fetchResidentialMetricsHistory(residencial.slug, 20)
      setHistoryList(history)
    } catch {
      showToast('error', 'Falha ao carregar histórico quantitativo.')
    } finally {
      setLoadingHistory(false)
    }
  }

  // Formatação de data/hora
  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return null
    try {
      const d = new Date(isoString)
      return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    } catch {
      return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border max-w-md flex items-center gap-3 transition-all animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : feedback.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-pink-50 text-pink-900 border-pink-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : feedback.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-pink-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-auto text-gray-400 hover:text-gray-700 p-1"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho do Modo Simples */}
      <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">{residencial.name}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Modo Simples (LGPD / Privacidade Segura)
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Acompanhamento puramente quantitativo e agregado. Nenhum nome, CPF ou anexo individual é exigido ou gravado nesta modalidade.
            </p>
          </div>

          {/* Ações do Cabeçalho */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenHistory}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
              title="Ver histórico de alterações quantitativas"
            >
              <History className="w-4 h-4 text-gray-500" />
              Histórico
            </button>

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <Edit3 className="w-4 h-4" />
                Editar indicadores
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  type="button"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-gray-500" />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  type="button"
                  disabled={isSaving || !validation.isValid}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar alterações
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Metadados da Última Atualização */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Última atualização:</span>
            <span>
              {persistedMetrics?.updated_at
                ? formatDateTime(persistedMetrics.updated_at)
                : 'Nenhum indicador preenchido até o momento'}
            </span>
          </div>
          {persistedMetrics?.last_updated_by_name && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Responsável:</span>
              <span className="text-gray-900 font-semibold">{persistedMetrics.last_updated_by_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Avisos de Consistência (Não bloqueiam salvar se válidos, mas alertam o usuário sem sobrescrever silenciosamente) */}
      {validation.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Aviso de Consistência Numérica</span>
          </div>
          <ul className="text-xs space-y-1 list-disc list-inside text-amber-800">
            {validation.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-700 pt-1">
            * O sistema respeita estritamente o que você digita e não altera seus números silenciosamente.
          </p>
        </div>
      )}

      {/* Erros de Validação (números negativos ou inválidos) */}
      {!validation.isValid && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Por favor, corrija os seguintes erros:</span>
          </div>
          <ul className="text-xs space-y-1 list-disc list-inside text-rose-800">
            {validation.errors.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          <p className="text-sm font-medium">Carregando indicadores agregados...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SEÇÃO 1: OCUPAÇÃO E VAGAS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <h3 className="text-sm font-bold tracking-wide uppercase text-gray-700">
                  Ocupação e Vagas
                </h3>
              </div>
              {isEditing && suggestedVacancies !== null && formData.available_units !== suggestedVacancies && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, available_units: suggestedVacancies }))}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-lg border border-pink-200 transition-colors"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Preencher sugestão calculada: {suggestedVacancies} vagas livres
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Capacidade Total */}
              <MetricInputCard
                label="Capacidade Total"
                subtitle="Total de apartamentos ou unidades"
                value={formData.total_capacity}
                icon={Building2}
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('total_capacity', v)}
                onCardClick={() => setIsEditing(true)}
              />

              {/* Ocupados Atualmente */}
              <MetricInputCard
                label="Ocupados Atualmente"
                subtitle="Unidades com famílias instaladas"
                value={formData.occupied_units}
                icon={Users}
                colorClass="text-blue-700 bg-blue-50 border-blue-200"
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('occupied_units', v)}
                onCardClick={() => setIsEditing(true)}
              />

              {/* Vagas Disponíveis */}
              <MetricInputCard
                label="Vagas Disponíveis"
                subtitle={
                  suggestedVacancies !== null
                    ? `Sugestão calculada: ${suggestedVacancies}`
                    : 'Unidades prontas e desocupadas'
                }
                value={formData.available_units}
                icon={DoorOpen}
                colorClass="text-emerald-700 bg-emerald-50 border-emerald-200"
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('available_units', v)}
                onCardClick={() => setIsEditing(true)}
              />

              {/* Apartamentos adaptados PCD */}
              <MetricInputCard
                label="Adaptados para PCD"
                subtitle={
                  residencial.pcd_adapted_units_count
                    ? `Cadastro do residencial: ${residencial.pcd_adapted_units_count}`
                    : 'Acessibilidade física'
                }
                value={formData.pcd_adapted_units}
                icon={Accessibility}
                colorClass="text-purple-700 bg-purple-50 border-purple-200"
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('pcd_adapted_units', v)}
                onCardClick={() => setIsEditing(true)}
              />
            </div>
          </div>

          {/* SEÇÃO 2: DOCUMENTAÇÃO */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <h3 className="text-sm font-bold tracking-wide uppercase text-gray-700">
                Documentação e Dossiês
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Documentação Regular */}
              <MetricInputCard
                label="Documentação Regular"
                subtitle="Pessoas com documentos em dia"
                value={formData.regular_documents_count}
                icon={FileCheck2}
                colorClass="text-emerald-700 bg-emerald-50 border-emerald-200"
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('regular_documents_count', v)}
                onCardClick={() => setIsEditing(true)}
              />

              {/* Documentação Pendente */}
              <MetricInputCard
                label="Documentação Pendente"
                subtitle="Pessoas com pendências civis"
                value={formData.pending_documents_count}
                icon={FileClock}
                colorClass="text-amber-700 bg-amber-50 border-amber-200"
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('pending_documents_count', v)}
                onCardClick={() => setIsEditing(true)}
              />

              {/* Dossiês Sem Pendência */}
              <MetricInputCard
                label="Dossiês Sem Pendência"
                subtitle="Prontos para assinatura e envio"
                value={formData.dossiers_no_pending_count}
                icon={CheckCircle2}
                colorClass="text-teal-700 bg-teal-50 border-teal-200"
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('dossiers_no_pending_count', v)}
                onCardClick={() => setIsEditing(true)}
              />

              {/* Dossiês Com Pendência */}
              <MetricInputCard
                label="Dossiês Com Pendência"
                subtitle="Aguardando regularização"
                value={formData.dossiers_with_pending_count}
                icon={AlertTriangle}
                colorClass="text-orange-700 bg-orange-50 border-orange-200"
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('dossiers_with_pending_count', v)}
                onCardClick={() => setIsEditing(true)}
              />

              {/* Reenviados para Pesquisa */}
              <MetricInputCard
                label="Reenviados p/ Pesquisa"
                subtitle="Em reanálise cadastral"
                value={formData.dossiers_resubmitted_search_count}
                icon={RotateCcw}
                colorClass="text-indigo-700 bg-indigo-50 border-indigo-200"
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('dossiers_resubmitted_search_count', v)}
                onCardClick={() => setIsEditing(true)}
              />

              {/* Não Compareceram */}
              <MetricInputCard
                label="Não Compareceram"
                subtitle="Convocados sem presença"
                value={formData.no_show_count}
                icon={UserX}
                colorClass="text-gray-700 bg-gray-50 border-gray-200"
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('no_show_count', v)}
                onCardClick={() => setIsEditing(true)}
              />

              {/* Dossiês Excluídos */}
              <MetricInputCard
                label="Dossiês Excluídos"
                subtitle="Cancelados ou desistências"
                value={formData.dossiers_excluded_count}
                icon={FileX2}
                colorClass="text-rose-700 bg-rose-50 border-rose-200"
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('dossiers_excluded_count', v)}
                onCardClick={() => setIsEditing(true)}
              />

              {/* Dossiês Conformes */}
              <MetricInputCard
                label="Dossiês Conformes"
                subtitle="Validados e aprovados"
                value={formData.dossiers_compliant_count}
                icon={ThumbsUp}
                colorClass="text-emerald-700 bg-emerald-50 border-emerald-200"
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('dossiers_compliant_count', v)}
                onCardClick={() => setIsEditing(true)}
              />

              {/* Dossiês Inconformes */}
              <MetricInputCard
                label="Dossiês Inconformes"
                subtitle="Recusados ou com impedimento"
                value={formData.dossiers_non_compliant_count}
                icon={ThumbsDown}
                colorClass="text-rose-700 bg-rose-50 border-rose-200"
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('dossiers_non_compliant_count', v)}
                onCardClick={() => setIsEditing(true)}
              />

              {/* Dossiês Loteados */}
              <MetricInputCard
                label="Dossiês Loteados"
                subtitle="Agrupados em remessas"
                value={formData.dossiers_batched_count}
                icon={Layers}
                colorClass="text-cyan-700 bg-cyan-50 border-cyan-200"
                isEditing={isEditing}
                onChange={(v) => handleNumberChange('dossiers_batched_count', v)}
                onCardClick={() => setIsEditing(true)}
              />
            </div>
          </div>

          {/* SEÇÃO 3: OUTROS ACOMPANHAMENTOS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <h3 className="text-sm font-bold tracking-wide uppercase text-gray-700">
                Outros Acompanhamentos
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Necessitam de Procuração */}
              <div className="lg:col-span-1">
                <MetricInputCard
                  label="Necessitam de Procuração"
                  subtitle="Impedimento de locomoção / titular ausente"
                  value={formData.proxies_needed_count}
                  icon={FileSignature}
                  colorClass="text-amber-700 bg-amber-50 border-amber-200"
                  isEditing={isEditing}
                  onChange={(v) => handleNumberChange('proxies_needed_count', v)}
                  onCardClick={() => setIsEditing(true)}
                />
              </div>

              {/* Anotações Gerais do Residencial (Contexto do Território sem PII) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-pink-100 p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="notes" className="text-sm font-bold text-gray-900">
                    Anotações e Contexto do Território
                  </label>
                  <span className="text-[11px] text-gray-400">
                    Sem identificação de moradores (LGPD)
                  </span>
                </div>

                {isEditing ? (
                  <textarea
                    id="notes"
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Ex: Mutirão de atualização documental agendado para o próximo sábado; aguardando liberação de habite-se do bloco 4..."
                    className="w-full text-sm rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50/70 p-3 rounded-xl min-h-[5rem] italic">
                    {formData.notes && formData.notes.trim().length > 0
                      ? formData.notes
                      : 'Nenhuma anotação geral registrada para este residencial.'}
                  </p>
                )}
                <p className="text-[11px] text-gray-400">
                  Importante: Não insira nomes, CPFs ou contatos individuais nestas anotações.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico Quantitativo */}
      {isHistoryModalOpen && (
        <HistoryModal
          residencialName={residencial.name}
          historyList={historyList}
          loading={loadingHistory}
          onClose={() => setIsHistoryModalOpen(false)}
          formatDateTime={formatDateTime}
        />
      )}
    </div>
  )
}

/**
 * Cartão de Indicador Quantitativo Editável e Reativo
 */
interface MetricInputCardProps {
  label: string
  subtitle: string
  value: number | null | undefined
  icon: React.ComponentType<{ className?: string }>
  colorClass?: string
  isEditing: boolean
  onChange: (val: string) => void
  onCardClick?: () => void
}

const MetricInputCard: React.FC<MetricInputCardProps> = ({
  label,
  subtitle,
  value,
  icon: Icon,
  colorClass = 'text-primary bg-pink-50 border-pink-200',
  isEditing,
  onChange,
  onCardClick,
}) => {
  const isFilled = typeof value === 'number'

  return (
    <div
      onClick={!isEditing ? onCardClick : undefined}
      className={`bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
        !isEditing ? 'cursor-pointer hover:border-pink-200' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-gray-700 leading-tight block">
            {label}
          </span>
          <span className="text-[11px] text-gray-400 block line-clamp-1">
            {subtitle}
          </span>
        </div>
        <div className={`p-2 rounded-xl border shrink-0 ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="pt-2">
        {isEditing ? (
          <div className="relative">
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={value !== null && value !== undefined ? value : ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="0"
              className="w-full text-2xl font-extrabold text-gray-900 bg-pink-50/40 rounded-xl border border-pink-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-center"
            />
          </div>
        ) : (
          <div className="flex items-baseline justify-between">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                isFilled ? 'text-gray-900' : 'text-gray-300'
              }`}
            >
              {isFilled ? value : '0'}
            </span>
            {!isFilled && (
              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Pendente
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Modal de Histórico de Auditoria do Modo Simples
 */
interface HistoryModalProps {
  residencialName: string
  historyList: MetricsHistoryEntry[]
  loading: boolean
  onClose: () => void
  formatDateTime: (iso?: string | null) => string | null
}

const HistoryModal: React.FC<HistoryModalProps> = ({
  residencialName,
  historyList,
  loading,
  onClose,
  formatDateTime,
}) => {
  useModalA11y({
    isOpen: true,
    onClose,
  })

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
        className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 id="history-modal-title" className="text-base font-bold text-gray-900">
              Histórico de Atualizações Quantitativas
            </h3>
            <p className="text-xs text-gray-500">{residencialName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Fechar histórico"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-8 text-center text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
              <p className="text-xs">Carregando histórico...</p>
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <History className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium">Nenhum registro anterior encontrado.</p>
              <p className="text-xs text-gray-400 mt-1">
                As próximas atualizações salvas aparecerão registradas aqui com data e autor.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyList.map((entry) => {
                const s = entry.metrics_snapshot || {}
                return (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-gray-900 font-bold">
                        {formatDateTime(entry.recorded_at) || 'Data desconhecida'}
                      </span>
                      <span className="text-primary font-semibold">
                        {entry.updated_by_name || 'Profissional'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200/60 text-gray-600">
                      <div>
                        <span className="text-gray-400 block text-[10px]">Capacidade:</span>
                        <span className="font-semibold text-gray-800">{String(s.total_capacity ?? '—')}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Ocupados:</span>
                        <span className="font-semibold text-gray-800">{String(s.occupied_units ?? '—')}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Vagas Livres:</span>
                        <span className="font-semibold text-gray-800">{String(s.available_units ?? '—')}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
