import React, { useState, useEffect } from 'react'
import {
  Plus,
  Calendar as CalendarIcon,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  LogOut,
  LayoutDashboard,
  CalendarCheck,
  Building2,
  GitCommit,
  FileSpreadsheet,
  FileText,
  Users,
  SlidersHorizontal,
  User,
  RotateCcw,
} from 'lucide-react'
import { Sidebar, type NavTab } from '../components/Sidebar'
import { Header } from '../components/Header'
import { StatsCards } from '../components/StatsCards'
import { ActivityCard, type ActivityItem } from '../components/ActivityCard'
import { ActivityModal } from '../components/ActivityModal'
import {
  FailureReasonModal,
  RescheduleModal,
  DeleteConfirmModal,
} from '../components/ActionModals'
import { ShareModal } from '../components/ShareModal'
import { BottomNav } from '../components/BottomNav'
import { CalendarView } from '../components/CalendarView'
import { ReportsView } from '../components/ReportsView'
import { ServicesDirectoryView } from '../components/ServicesDirectoryView'
import { CaseTimelineView } from '../components/CaseTimelineView'
import { DocumentsView } from '../components/DocumentsView'
import { DocumentEditorView } from '../components/DocumentEditorView'
import { TeamView } from '../components/TeamView'
import { ResidenciaisView } from '../components/ResidenciaisView'
import { NotificationsPopover } from '../components/NotificationsPopover'
import { fetchUserNotifications, subscribeToNotifications } from '../services/notificationService'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import type { ActivityStatus, ActivityCategory } from '../types/supabase'


const ALL_NAV_PAGES: Array<{ id: NavTab; label: string; description: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Painel Inicial', description: 'Visão geral com indicadores, métricas e atalhos rápidos', icon: <LayoutDashboard size={16} /> },
  { id: 'activities', label: 'Atividades', description: 'Registro e controle diário de atendimentos, visitas e tarefas', icon: <CalendarCheck size={16} /> },
  { id: 'calendar', label: 'Agenda & Visitas', description: 'Agendamentos com lembretes e prazos de acompanhamento', icon: <CalendarIcon size={16} /> },
  { id: 'residenciais', label: 'Residenciais', description: 'Gestão habitacional territorial com Modo Simples e Modo Avançado', icon: <Building2 size={16} /> },
  { id: 'timeline', label: 'Linha do Tempo', description: 'Acompanhamento histórico familiar e eventos cronológicos (Em breve)', icon: <GitCommit size={16} /> },
  { id: 'reports', label: 'Relatórios', description: 'Geração e exportação de estudos sociais e pareceres técnicos', icon: <FileSpreadsheet size={16} /> },
  { id: 'services', label: 'Diretório de Serviços', description: 'Guia de serviços socioassistenciais do Ceará (CRAS, CREAS, etc.)', icon: <Building2 size={16} /> },
  { id: 'documents', label: 'Pastas & Docs', description: 'Repositório confidencial de arquivos com criptografia e RLS', icon: <FileText size={16} /> },
  { id: 'team', label: 'Compartilhamentos', description: 'Compartilhamento ético e colaboração intersetorial entre profissionais', icon: <Users size={16} /> },
]

export const MainDashboard: React.FC = () => {
  const { user, profile, isAdmin, signOut } = useAuth()
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard')
    const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'access'>('access')
  const [hiddenTabs, setHiddenTabs] = useState<NavTab[]>(() => {
    try {
      const saved = localStorage.getItem(`assistsocial_hidden_tabs_${user?.id || 'guest'}`)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Sincroniza preferências salvas no Supabase
  useEffect(() => {
    if (!user?.id) return
    try {
      const local = localStorage.getItem(`assistsocial_hidden_tabs_${user.id}`)
      if (local) setHiddenTabs(JSON.parse(local))
    } catch {}

    const loadPrefs = async () => {
      try {
        const { data, error } = await (supabase.from('profiles') as any)
          .select('preferences')
          .eq('id', user.id)
          .single()

        if (!error && data?.preferences) {
          const prefs = data.preferences as Record<string, unknown>
          if (Array.isArray(prefs.hidden_tabs)) {
            setHiddenTabs(prefs.hidden_tabs as NavTab[])
            localStorage.setItem(`assistsocial_hidden_tabs_${user.id}`, JSON.stringify(prefs.hidden_tabs))
          }
        }
      } catch (err) {
        console.warn('Preferências:', err)
      }
    }

    loadPrefs()
  }, [user?.id])

  const handleToggleTabVisibility = async (tabId: NavTab) => {
    if (!user?.id) return
    const isCurrentlyHidden = hiddenTabs.includes(tabId)
    const newHidden = isCurrentlyHidden
      ? hiddenTabs.filter((t) => t !== tabId)
      : [...hiddenTabs, tabId]

    setHiddenTabs(newHidden)
    localStorage.setItem(`assistsocial_hidden_tabs_${user.id}`, JSON.stringify(newHidden))

    showToast(
      isCurrentlyHidden
        ? 'Página reativada no menu lateral! ✨'
        : 'Página ocultada do menu lateral. 🔒'
    )

    if (!isCurrentlyHidden && currentTab === tabId) {
      setCurrentTab('settings')
    }

    try {
      await (supabase.rpc as any)('update_user_preferences', {
        p_preferences: { hidden_tabs: newHidden },
      })
    } catch (err) {
      console.warn('Erro ao salvar no Supabase:', err)
    }
  }

  const handleRestoreAllTabs = async () => {
    if (!user?.id) return
    setHiddenTabs([])
    localStorage.removeItem(`assistsocial_hidden_tabs_${user.id}`)
    showToast('Todas as páginas foram restauradas no menu!')
    try {
      await (supabase.rpc as any)('update_user_preferences', {
        p_preferences: { hidden_tabs: [] },
      })
    } catch (err) {}
  }

  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0)

  const refreshNotificationsCount = async () => {
    if (!user?.id) return
    const notifs = await fetchUserNotifications(user.id)
    setUnreadNotifsCount(notifs.filter((n) => !n.is_read).length)
  }

  useEffect(() => {
    if (!user?.id) return
    refreshNotificationsCount()
    const unsubscribe = subscribeToNotifications(user.id, () => {
      refreshNotificationsCount()
    })
    return () => {
      unsubscribe()
    }
  }, [user?.id])
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null)
  const [failureTarget, setFailureTarget] = useState<ActivityItem | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<ActivityItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ActivityItem | null>(null)
  const [shareTarget, setShareTarget] = useState<ActivityItem | null>(null)

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Carregar atividades do Supabase
  const loadActivities = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('starts_at', { ascending: true })

      if (!error && data) {
        setActivities(data as ActivityItem[])
      }
    } catch (err) {
      console.error('Erro ao carregar atividades do Supabase:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivities()
  }, [user])

  // 1. Toggle Complete
  const handleToggleComplete = async (id: string, currentStatus: ActivityStatus) => {
    const newStatus: ActivityStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    setActivities((prev) =>
      prev.map((act) => (act.id === id ? { ...act, status: newStatus } : act))
    )

    showToast(
      newStatus === 'completed'
        ? 'Atividade marcada como concluída! 🎉'
        : 'Atividade retornada para pendente.'
    )

    try {
      await (supabase.from('activities') as any).update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id)
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
    }
  }

  // 2. Marcar como Não Realizada
  const handleConfirmFailure = async (reason: string) => {
    if (!failureTarget) return
    const id = failureTarget.id
    setActivities((prev) =>
      prev.map((act) =>
        act.id === id
          ? { ...act, status: 'not_completed', failure_reason: reason, updated_at: new Date().toISOString() }
          : act
      )
    )
    showToast('Atividade marcada como não realizada com justificativa registrada.')

    try {
      await (supabase.from('activities') as any)
        .update({
          status: 'not_completed',
          failure_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    } catch (err) {
      console.error('Erro ao registrar justificativa:', err)
    } finally {
      setFailureTarget(null)
    }
  }

  // 3. Reagendar
  const handleConfirmReschedule = async (newStartsAt: string, newEndsAt: string | null) => {
    if (!rescheduleTarget) return
    const id = rescheduleTarget.id
    setActivities((prev) =>
      prev.map((act) =>
        act.id === id
          ? {
              ...act,
              status: 'rescheduled',
              starts_at: newStartsAt,
              ends_at: newEndsAt,
              updated_at: new Date().toISOString(),
            }
          : act
      )
    )
    showToast('Atividade reagendada com sucesso! 📅')

    try {
      await (supabase.from('activities') as any)
        .update({
          status: 'rescheduled',
          starts_at: newStartsAt,
          ends_at: newEndsAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    } catch (err) {
      console.error('Erro ao reagendar:', err)
    } finally {
      setRescheduleTarget(null)
    }
  }

  // 4. Cancelar
  const handleCancelActivity = async (activity: ActivityItem) => {
    setActivities((prev) =>
      prev.map((act) => (act.id === activity.id ? { ...act, status: 'cancelled' } : act))
    )
    showToast('Atividade cancelada.')

    try {
      await (supabase.from('activities') as any)
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', activity.id)
    } catch (err) {
      console.error('Erro ao cancelar atividade:', err)
    }
  }

  // 5. Excluir com confirmação
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setActivities((prev) => prev.filter((act) => act.id !== id))
    showToast('Atividade removida com sucesso.')

    try {
      await supabase.from('activities').delete().eq('id', id)
    } catch (err) {
      console.error('Erro ao remover atividade:', err)
    } finally {
      setDeleteTarget(null)
    }
  }

  // 6. Criar ou Salvar atividade com upload imediato de anexos vinculados
  const handleSaveActivity = async (data: {
    id?: string
    title: string
    category: ActivityCategory | string
    status: ActivityStatus
    starts_at: string
    ends_at: string | null
    description: string | null
    pendingFiles?: File[]
  }) => {
    if (!user) return

    let targetActivityId = data.id

    if (data.id) {
      // Edição
      setActivities((prev) =>
        prev.map((act) => (act.id === data.id ? { ...act, ...data, updated_at: new Date().toISOString() } : act))
      )
      showToast('Atividade atualizada com sucesso! ✨')
      try {
        await (supabase.from('activities') as any)
          .update({
            title: data.title,
            category: data.category,
            status: data.status,
            starts_at: data.starts_at,
            ends_at: data.ends_at,
            description: data.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id)
      } catch (err) {
        console.error('Erro ao atualizar atividade:', err)
      }
    } else {
      // Criação
      const newActivity = {
        owner_id: user.id,
        title: data.title,
        category: data.category,
        status: data.status,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        description: data.description,
        failure_reason: null,
        recurrence_rule: null,
        reminder_minutes: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      try {
        const { data: insertedData, error } = await (supabase.from('activities') as any)
          .insert(newActivity)
          .select()
          .single()

        if (!error && insertedData) {
          targetActivityId = insertedData.id
          setActivities((prev) => [insertedData, ...prev])
          showToast('Nova atividade registrada no Supabase! 🌸')
        } else {
          // Fallback local se RLS bloquear ou rede
          targetActivityId = 'act-' + Date.now()
          const fallbackItem: ActivityItem = {
            id: targetActivityId,
            ...newActivity,
          }
          setActivities((prev) => [fallbackItem, ...prev])
          showToast('Atividade salva localmente.')
        }
      } catch {
        targetActivityId = 'act-' + Date.now()
        const fallbackItem: ActivityItem = {
          id: targetActivityId,
          ...newActivity,
        }
        setActivities((prev) => [fallbackItem, ...prev])
      }
    }

    // Processamento dos anexos selecionados junto com a atividade
    if (data.pendingFiles && data.pendingFiles.length > 0 && targetActivityId) {
      let uploadCount = 0
      for (const file of data.pendingFiles) {
        try {
          const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
          const storagePath = `${user.id}/activities/${targetActivityId}/${Date.now()}_${cleanName}`

          const { error: storageError } = await supabase.storage
            .from('documents')
            .upload(storagePath, file, { cacheControl: '3600', upsert: false })

          if (!storageError) {
            await (supabase.from('activity_attachments') as any).insert({
              activity_id: targetActivityId,
              uploader_id: user.id,
              storage_path: storagePath,
              original_name: file.name,
              mime_type: file.type || 'application/octet-stream',
              file_size: file.size,
            })
            uploadCount++
          }
        } catch (uploadErr) {
          console.warn('Erro ao processar anexo pendente:', uploadErr)
        }
      }
      if (uploadCount > 0) {
        showToast(`${uploadCount} anexo(s) vinculado(s) com sucesso à atividade! 📎`)
      }
    }

    setEditingActivity(null)
  }

  // Filtros
  const filteredActivities = activities.filter((act) => {
    const matchesSearch =
      act.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (act.description && act.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === 'all' || act.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Métricas
  const atendimentosCount = activities.filter((a) => a.category === 'atendimento').length
  const visitasCount = activities.filter((a) => a.category === 'visita_domiciliar').length
  const relatoriosCount = activities.filter((a) => a.category === 'elaboracao_relatorio').length
  const concluidasCount = activities.filter((a) => a.status === 'completed').length

  const profileDisplayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Janaína')
  const profileEmail = profile?.email || user?.email || 'Assistente Social'

  return (
    <div className="min-h-screen bg-[#FFF9FB] text-[#28232A] flex flex-col antialiased selection:bg-[#FCE5ED] selection:text-[#F04491]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#28232A] text-white text-xs md:text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-bounce-short border border-[#F04491]/30">
          <Sparkles size={16} className="text-[#F04491]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Desktop & Mobile Drawer Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        profileName={profileDisplayName}
        profileEmail={profileEmail}
        isAdmin={isAdmin}
        onLogout={signOut}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        hiddenTabs={hiddenTabs}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-20 transition-[padding] duration-200 flex flex-col min-w-0">
        <Header
          onOpenNewActivity={() => {
            setEditingActivity(null)
            setIsModalOpen(true)
          }}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          totalActivitiesCount={activities.length}
          profileName={profileDisplayName}
          onToggleMobileMenu={() => setIsMobileNavOpen((prev) => !prev)}
          unreadNotificationsCount={unreadNotifsCount}
          onToggleNotifications={() => setIsNotificationsOpen((prev) => !prev)}
        />

        <main className="flex-1 p-3.5 sm:p-5 md:p-6 max-w-7xl w-full mx-auto pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-10">
          {/* BOTÃO DISCRETO PADRÃO PARA VOLTAR AO MENU INICIAL (EXCLUSIVO NO MOBILE, POIS NO DESKTOP HÁ MENU LATERAL FIXO) */}
          {currentTab !== 'dashboard' && (
            <div className="mb-4 md:hidden">
              <button
                type="button"
                onClick={() => setCurrentTab('dashboard')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FCE5ED]/50 text-[#827780] hover:text-[#F04491] border border-[#F6E4EC] text-xs font-bold transition-all shadow-xs group cursor-pointer"
                title="Voltar ao Painel Inicial"
              >
                <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5 text-[#827780] group-hover:text-[#F04491]" />
                <span>Voltar ao Painel Inicial</span>
              </button>
            </div>
          )}
          {/* VIEW: DASHBOARD & ATIVIDADES */}
          {(currentTab === 'dashboard' || currentTab === 'activities') && (
            <>
              {/* STATS CARDS */}
              <StatsCards
                atendimentosCount={atendimentosCount}
                visitasCount={visitasCount}
                relatoriosCount={relatoriosCount}
                concluidasCount={concluidasCount}
              />

              {/* QUICK CATEGORY FILTER TABS */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 no-scrollbar">
                {[
                  { id: 'all', label: 'Todas as Atividades', count: activities.length },
                  { id: 'visita_domiciliar', label: 'Visitas Domiciliares', count: visitasCount },
                  { id: 'atendimento', label: 'Atendimentos', count: atendimentosCount },
                  { id: 'elaboracao_relatorio', label: 'Relatórios Técnicos', count: relatoriosCount },
                  { id: 'reuniao', label: 'Reuniões de Rede', count: activities.filter((a) => a.category === 'reuniao').length },
                ].map((tab) => {
                  const isSelected = categoryFilter === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setCategoryFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#F04491] text-white shadow-[0_4px_12px_rgba(240,68,145,0.25)]'
                          : 'bg-white text-[#827780] hover:text-[#28232A] hover:bg-[#FCE5ED]/40 border border-[#F6E4EC]'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-[#FFF9FB] text-[#827780]'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* MAIN CONTENT GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
                {/* Left 2 Cols: Activity Feed */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg md:text-xl font-black text-[#28232A] tracking-tight">
                        Cronograma de Atendimentos
                      </h2>
                      <p className="text-xs text-[#827780] font-medium">
                        Casos e compromissos sincronizados com o Supabase
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#F04491] bg-[#FCE5ED] px-3 py-1 rounded-full">
                      {filteredActivities.length} listados
                    </span>
                  </div>

                  {loading ? (
                    <div className="p-8 text-center text-xs text-[#827780]">
                      Carregando atividades...
                    </div>
                  ) : filteredActivities.length === 0 ? (
                    <div className="bg-white rounded-2xl p-6 border border-[#F6E4EC] text-center shadow-sm">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center mb-3">
                        <CalendarIcon size={26} />
                      </div>
                      <h3 className="text-base font-bold text-[#28232A]">Nenhuma atividade encontrada</h3>
                      <p className="text-xs text-[#827780] max-w-sm mx-auto mt-1 mb-4">
                        Comece cadastrando seu primeiro atendimento ou visita social.
                      </p>
                      <button
                        onClick={() => {
                          setEditingActivity(null)
                          setIsModalOpen(true)
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#F04491] text-white text-xs font-bold shadow-md hover:bg-[#DE3380] transition-colors cursor-pointer"
                      >
                        <Plus size={16} />
                        <span>Adicionar Primeira Atividade</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredActivities.map((act) => (
                        <ActivityCard
                          key={act.id}
                          activity={act}
                          onToggleComplete={handleToggleComplete}
                          onEdit={(activity) => {
                            setEditingActivity(activity)
                            setIsModalOpen(true)
                          }}
                          onDeleteRequest={(activity) => setDeleteTarget(activity)}
                          onMarkNotCompleted={(activity) => setFailureTarget(activity)}
                          onRescheduleRequest={(activity) => setRescheduleTarget(activity)}
                          onCancelRequest={(activity) => handleCancelActivity(activity)}
                          onShareRequest={(activity) => setShareTarget(activity)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Right 1 Col: Side Cards */}
                <div className="space-y-4">
                  {/* Daily Focus Card */}
                  <div className="bg-gradient-to-br from-white to-[#FFF9FB] p-4 rounded-2xl border border-[#F6E4EC] shadow-[0_2px_8px_rgba(240,68,145,0.02)]">
                    <div className="flex items-center gap-2.5 mb-3 text-[#F04491]">
                      <Sparkles size={18} />
                      <h3 className="font-extrabold text-sm text-[#28232A]">Foco do Dia — Assistência</h3>
                    </div>
                    <p className="text-xs text-[#827780] leading-relaxed mb-4">
                      Acompanhamento integrado com a rede socioassistencial e proteção de dados confidenciais.
                    </p>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#28232A]">Atividades Pendentes</span>
                        <span className="text-[10px] font-bold text-[#F04491] bg-[#FCE5ED] px-2 py-0.5 rounded-full">
                          {activities.filter((a) => a.status === 'pending').length} casos
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#28232A]">Concluídas com Sucesso</span>
                        <span className="text-[10px] font-bold text-[#36A879] bg-[#EBF7F1] px-2 py-0.5 rounded-full">
                          {concluidasCount} feitas
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Security & Confidentiality Badge */}
                  <div className="p-3.5 rounded-2xl bg-[#EBF7F1]/80 border border-[#36A879]/20 flex items-start gap-3">
                    <ShieldCheck size={20} className="text-[#36A879] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#28232A]">Sigilo Profissional e LGPD</h4>
                      <p className="text-[11px] text-[#827780] leading-relaxed mt-0.5">
                        Dados protegidos por Row Level Security (RLS) no Supabase conforme o Código de Ética do Assistente Social.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* VIEW: RESIDENCIAIS (PAUPINA & JOAQUIM MACHADO) */}
          {currentTab === 'residenciais' && (
            <ErrorBoundary fallbackTitle="Erro ao carregar Área dos Residenciais" onReset={() => setCurrentTab('dashboard')}>
              <ResidenciaisView />
            </ErrorBoundary>
          )}

          {/* VIEW: AGENDA & CALENDAR */}
          {currentTab === 'calendar' && (
            <ErrorBoundary fallbackTitle="Erro ao carregar a Agenda" onReset={() => setCurrentTab('dashboard')}>
              <CalendarView
                activities={activities}
                loading={loading}
                onOpenNewActivity={() => {
                  setEditingActivity(null)
                  setIsModalOpen(true)
                }}
                onSelectActivity={(activity) => {
                  setEditingActivity(activity)
                  setIsModalOpen(true)
                }}
                onToggleComplete={handleToggleComplete}
                onReschedule={(activity) => setRescheduleTarget(activity)}
                />
            </ErrorBoundary>
          )}

          {/* VIEW: REPORTS & METRICS */}
          {currentTab === 'reports' && (
            <ErrorBoundary fallbackTitle="Erro ao carregar Relatórios" onReset={() => setCurrentTab('dashboard')}>
              <ReportsView
                activities={activities}
                profileName={profileDisplayName}
              />
            </ErrorBoundary>
          )}

          {/* VIEW: CASE TIMELINE */}
          {currentTab === 'timeline' && (
            <ErrorBoundary fallbackTitle="Erro ao carregar Linha do Tempo" onReset={() => setCurrentTab('dashboard')}>
              <CaseTimelineView
                activities={activities}
                profileName={profileDisplayName}
                onOpenNewActivity={() => {
                  setEditingActivity(null)
                  setIsModalOpen(true)
                }}
                onSelectActivity={(activity) => {
                  setEditingActivity(activity)
                  setIsModalOpen(true)
                }}
              />
            </ErrorBoundary>
          )}

          {/* VIEW: SERVICES DIRECTORY (HSDS) */}
          {currentTab === 'services' && (
            <ErrorBoundary fallbackTitle="Erro ao carregar Guia de Serviços" onReset={() => setCurrentTab('dashboard')}>
              <ServicesDirectoryView />
            </ErrorBoundary>
          )}

          {/* VIEW: DOCUMENTS & STORAGE */}
          {currentTab === 'documents' && (
            <ErrorBoundary fallbackTitle="Erro ao carregar Documentos" onReset={() => setCurrentTab('dashboard')}>
              <DocumentEditorView onBackToDashboard={() => setCurrentTab('dashboard')} />
            </ErrorBoundary>
          )}

          {/* VIEW: TEAM & SHARES */}
          {currentTab === 'team' && (
            <ErrorBoundary fallbackTitle="Erro ao carregar Equipe" onReset={() => setCurrentTab('dashboard')}>
              <TeamView />
            </ErrorBoundary>
          )}

          {/* VIEW: SETTINGS */}
          {currentTab === 'settings' && (
            <div className="max-w-2xl bg-white rounded-2xl p-5 md:p-6 border border-[#F6E4EC] shadow-sm space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F6E4EC]">
                <div>
                  <h2 className="text-lg md:text-xl font-black text-[#28232A] tracking-tight">Perfil & Configurações</h2>
                  <p className="text-xs text-[#827780]">Gerencie seus dados cadastrais e personalize as páginas do menu</p>
                </div>
                {/* SUB-TABS */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('access')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      settingsSubTab === 'access'
                        ? 'bg-[#F04491] text-white shadow-xs'
                        : 'text-[#827780] hover:text-[#28232A]'
                    }`}
                  >
                    <SlidersHorizontal size={13} />
                    <span>Acessos & Menus</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('profile')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      settingsSubTab === 'profile'
                        ? 'bg-[#F04491] text-white shadow-xs'
                        : 'text-[#827780] hover:text-[#28232A]'
                    }`}
                  >
                    <User size={13} />
                    <span>Meu Perfil</span>
                  </button>
                </div>
              </div>

              {settingsSubTab === 'access' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-start gap-2.5">
                    <Sparkles size={16} className="text-[#F04491] shrink-0 mt-0.5" />
                    <div className="text-xs text-[#28232A] space-y-0.5">
                      <p className="font-bold text-[#F04491]">Personalização de Acessos do Menu Lateral</p>
                      <p className="text-[#827780] text-[11px] leading-relaxed">
                        Desmarque as páginas que você não utiliza para manter seu menu enxuto e ágil. 
                        As alterações são <strong>salvas automaticamente na sua conta</strong> e persistidas em todos os seus acessos.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {ALL_NAV_PAGES.map((page) => {
                      const isVisible = !hiddenTabs.includes(page.id)
                      return (
                        <div
                          key={page.id}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isVisible
                              ? 'bg-white border-[#F6E4EC] hover:border-[#F58BB5]/50'
                              : 'bg-[#FAF8F9] border-gray-200/80 opacity-75'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`p-2 rounded-xl shrink-0 transition-colors ${
                                isVisible ? 'bg-[#FCE5ED] text-[#F04491]' : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {page.icon}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-[#28232A]">{page.label}</span>
                                <span
                                  className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                                    isVisible
                                      ? 'bg-[#EBF7F1] text-[#36A879] border border-[#A7E2C6]/50'
                                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                                  }`}
                                >
                                  {isVisible ? 'Visível no Menu' : 'Oculto'}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#827780] block truncate">
                                {page.description}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleTabVisibility(page.id)}
                            role="switch"
                            aria-checked={isVisible}
                            aria-label={`Alternar visibilidade de ${page.label}`}
                            className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center shrink-0 ${
                              isVisible ? 'bg-[#F04491] justify-end' : 'bg-gray-300 justify-start'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <div className="pt-3 border-t border-[#F6E4EC] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] text-[#36A879] font-bold flex items-center gap-1">
                      <ShieldCheck size={14} />
                      Sincronizado e salvo permanentemente na sua conta
                    </span>
                    {hiddenTabs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleRestoreAllTabs}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#F6E4EC] hover:bg-[#FFF9FB] text-[#827780] hover:text-[#F04491] text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                      >
                        <RotateCcw size={12} />
                        <span>Restaurar Todas as Páginas</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {settingsSubTab === 'profile' && (
                <div className="space-y-4 pt-1 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-[#827780] uppercase tracking-wider mb-1">Nome Completo</label>
                    <input
                      type="text"
                      disabled
                      value={profileDisplayName}
                      className="w-full px-3.5 py-2 bg-[#FFF9FB] border border-[#F6E4EC] rounded-xl text-xs font-semibold text-[#28232A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#827780] uppercase tracking-wider mb-1">E-mail Cadastrado</label>
                    <input
                      type="email"
                      disabled
                      value={profileEmail}
                      className="w-full px-3.5 py-2 bg-[#FFF9FB] border border-[#F6E4EC] rounded-xl text-xs font-semibold text-[#28232A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#827780] uppercase tracking-wider mb-1">Ambiente Supabase</label>
                    <div className="px-3.5 py-2.5 bg-[#EBF7F1] border border-[#36A879]/30 rounded-xl text-xs font-bold text-[#36A879] flex items-center justify-between">
                      <span>Projeto: mnhzikgphdhohlhfsljz</span>
                      <span>Conectado (RLS Ativo)</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#F6E4EC]">
                    <button
                      onClick={signOut}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#FCE8E6] text-[#D93025] hover:bg-[#D93025] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Encerrar Sessão</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewActivity={() => {
          setEditingActivity(null)
          setIsModalOpen(true)
        }}
        onToggleMore={() => setIsMobileNavOpen((prev) => !prev)}
      />

      {/* POPOVER: NOTIFICAÇÕES E LEMBRETES */}
      <NotificationsPopover
        isOpen={isNotificationsOpen}
        onClose={() => {
          setIsNotificationsOpen(false)
          refreshNotificationsCount()
        }}
        userId={user?.id || ''}
        activities={activities.map((a) => ({ id: a.id, title: a.title }))}
        onOpenActivity={(activityId) => {
          const found = activities.find((a) => a.id === activityId)
          if (found) {
            setEditingActivity(found)
            setIsModalOpen(true)
          } else {
            setCurrentTab('activities')
          }
        }}
        onAcceptShare={async (shareId) => {
          try {
            await (supabase.rpc as any)('respond_to_share_invite', {
              p_share_id: shareId,
              p_action: 'accept',
            })
            showToast('Compartilhamento aceito com sucesso!')
            loadActivities()
          } catch (err) {
            console.error('Erro ao aceitar convite:', err)
          }
        }}
        onRejectShare={async (shareId) => {
          try {
            await (supabase.rpc as any)('respond_to_share_invite', {
              p_share_id: shareId,
              p_action: 'reject',
            })
            showToast('Convite recusado.')
          } catch (err) {
            console.error('Erro ao recusar convite:', err)
          }
        }}
      />

      {/* Activity Create / Edit Modal */}
      <ActivityModal
        key={editingActivity ? editingActivity.id : isModalOpen ? 'open' : 'closed'}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingActivity(null)
        }}
        onSave={handleSaveActivity}
        editingActivity={editingActivity}
      />

      {/* Justificativa de Não Realização */}
      <FailureReasonModal
        isOpen={Boolean(failureTarget)}
        onClose={() => setFailureTarget(null)}
        onConfirm={handleConfirmFailure}
        activityTitle={failureTarget?.title || ''}
      />

      {/* Reagendamento */}
      <RescheduleModal
        isOpen={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={handleConfirmReschedule}
        activityTitle={rescheduleTarget?.title || ''}
      />

      {/* Confirmação de Exclusão */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Atividade?"
        description={`Tem certeza que deseja excluir "${deleteTarget?.title}"? Esta ação removerá o registro do Supabase.`}
      />

      {/* Compartilhamento de Atividade */}
      {shareTarget && (
        <ShareModal
          isOpen={Boolean(shareTarget)}
          onClose={() => setShareTarget(null)}
          resourceType="activity"
          resourceId={shareTarget.id}
          resourceTitle={shareTarget.title}
        />
      )}
    </div>
  )
}
