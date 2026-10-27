import React, { useState, useMemo, useCallback } from 'react'
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  List,
  CalendarDays,
  CalendarRange,
  Home,
  Users,
  FileText,
  Briefcase,
  RefreshCw,
  Check,
  Search,
  X,
} from 'lucide-react'
import type { ActivityItem } from './ActivityCard'
import type { ActivityStatus } from '../types/supabase'

export type AgendaViewMode = 'month' | 'week' | 'day' | 'list'
export type PeriodFilter = 'all' | 'today' | 'week' | 'month'
export type StatusFilter = 'all' | 'pending' | 'overdue' | 'completed'

interface CalendarViewProps {
  activities: ActivityItem[]
  loading?: boolean
  onOpenNewActivity: () => void
  onSelectActivity: (activity: ActivityItem) => void
  onToggleComplete?: (id: string, currentStatus: ActivityStatus) => void
  onReschedule?: (activity: ActivityItem) => void
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  activities,
  loading = false,
  onOpenNewActivity,
  onSelectActivity,
  onToggleComplete,
  onReschedule,
}) => {
  const [viewMode, setViewMode] = useState<AgendaViewMode>('month')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')
  const [selectedDayModal, setSelectedDayModal] = useState<Date | null>(null)
  const [daySearchTerm, setDaySearchTerm] = useState('')

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const currentTimestamp = useMemo(() => Date.now(), [])

  // Helpers de Categoria
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'visita_domiciliar':
        return { label: 'Visita Domiciliar', icon: <Home size={12} />, bg: 'bg-[#FCE5ED] text-[#F04491]' }
      case 'atendimento':
        return { label: 'Atendimento Social', icon: <Users size={12} />, bg: 'bg-[#EDF2FF] text-[#4B7BFF]' }
      case 'elaboracao_relatorio':
        return { label: 'Relatório Técnico', icon: <FileText size={12} />, bg: 'bg-[#F5EBFF] text-[#9B51E0]' }
      case 'reuniao':
        return { label: 'Reunião de Rede', icon: <Briefcase size={12} />, bg: 'bg-[#FEF8EC] text-[#E59B28]' }
      default:
        return { label: 'Outros', icon: <Briefcase size={12} />, bg: 'bg-[#F0EEF0] text-[#827780]' }
    }
  }

  // Verifica se atividade está atrasada
  const isOverdue = useCallback((act: ActivityItem) => {
    if (act.status !== 'pending') return false
    const actTime = new Date(act.starts_at).getTime()
    return actTime < currentTimestamp
  }, [currentTimestamp])

  // Atividades do Modal do Dia Filtradas pela Busca
  const dayModalActivities = useMemo(() => {
    if (!selectedDayModal) return []
    const acts = getActivitiesForDay(selectedDayModal)
    if (!daySearchTerm.trim()) return acts
    const term = daySearchTerm.toLowerCase().trim()
    return acts.filter(
      (act) =>
        act.title.toLowerCase().includes(term) ||
        (act.description && act.description.toLowerCase().includes(term)) ||
        act.category.toLowerCase().includes(term)
    )
  }, [selectedDayModal, activities, daySearchTerm])

  // Estatísticas de Hoje e Geral
  const stats = useMemo(() => {
    const todayActivities = activities.filter((a) => a.starts_at.startsWith(todayStr))
    const todayCompleted = todayActivities.filter((a) => a.status === 'completed').length
    const todayPending = todayActivities.filter((a) => a.status === 'pending').length
    const totalOverdue = activities.filter(isOverdue).length

    return {
      todayTotal: todayActivities.length,
      todayCompleted,
      todayPending,
      totalOverdue,
    }
  }, [activities, todayStr, isOverdue])

  // Navegação Temporal
  const handlePrev = () => {
    const d = new Date(currentDate)
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1)
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7)
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() - 1)
    }
    setCurrentDate(d)
  }

  const handleNext = () => {
    const d = new Date(currentDate)
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1)
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7)
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() + 1)
    }
    setCurrentDate(d)
  }

  const handleGoToday = () => {
    setCurrentDate(new Date())
  }

  // Formatação de Título do Período
  const periodTitle = useMemo(() => {
    if (viewMode === 'month') {
      const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate)
      return monthName.charAt(0).toUpperCase() + monthName.slice(1)
    }
    if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      const fmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })
      return `${fmt.format(startOfWeek)} — ${fmt.format(endOfWeek)}, ${endOfWeek.getFullYear()}`
    }
    if (viewMode === 'day') {
      return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(currentDate)
    }
    return 'Todas as Atividades Agendadas'
  }, [viewMode, currentDate])

  // Filtros aplicados na lista
  const filteredActivities = useMemo(() => {
    const nowRef = new Date()
    return activities.filter((act) => {
      // Filtro de Status
      if (statusFilter === 'pending' && act.status !== 'pending') return false
      if (statusFilter === 'completed' && act.status !== 'completed') return false
      if (statusFilter === 'overdue' && !isOverdue(act)) return false

      // Filtro de Período
      if (periodFilter === 'today') {
        if (!act.starts_at.startsWith(todayStr)) return false
      } else if (periodFilter === 'week') {
        const actDate = new Date(act.starts_at)
        const startOfWeek = new Date(nowRef)
        startOfWeek.setDate(nowRef.getDate() - nowRef.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 7)
        if (actDate < startOfWeek || actDate >= endOfWeek) return false
      } else if (periodFilter === 'month') {
        const actDate = new Date(act.starts_at)
        if (actDate.getFullYear() !== nowRef.getFullYear() || actDate.getMonth() !== nowRef.getMonth()) {
          return false
        }
      }

      return true
    })
  }, [activities, statusFilter, periodFilter, todayStr, isOverdue])

  // Dados do Mês
  const monthDays = useMemo(() => {
    const yr = currentDate.getFullYear()
    const mo = currentDate.getMonth()
    const firstDay = new Date(yr, mo, 1).getDay()
    const totalDays = new Date(yr, mo + 1, 0).getDate()

    const days = []
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(yr, mo, i))
    }
    return days
  }, [currentDate])

  // Dados da Semana (7 dias a partir do domingo)
  const weekDays = useMemo(() => {
    const start = new Date(currentDate)
    start.setDate(currentDate.getDate() - currentDate.getDay())
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push(d)
    }
    return days
  }, [currentDate])

  // Atividades por dia
  const getActivitiesForDay = (date: Date) => {
    const dStr = date.toISOString().split('T')[0]
    return activities.filter((act) => act.starts_at.startsWith(dStr))
  }

  const isTodayDate = (date: Date) => {
    return date.toISOString().split('T')[0] === todayStr
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. TOPO DA AGENDA INTELIGENTE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-[#FCE5ED] text-[#F04491]">
              <CalendarIcon size={20} />
            </span>
            <h2 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
              Agenda Inteligente de Atendimentos
            </h2>
          </div>
          <p className="text-xs text-[#827780] font-medium mt-1">
            Planejamento diário, semanal e mensal de visitas domiciliares e estudos de caso
          </p>
        </div>

        {/* Botão Principal Nova Atividade */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewActivity}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-[0_4px_12px_rgba(240,68,145,0.25)] transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* 2. RESUMO DAS ATIVIDADES DE HOJE & ALERTA DE ATRASADAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Hoje Total */}
        <div className="bg-white p-4 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#827780] block">Atividades Hoje</span>
            <span className="text-xl font-black text-[#28232A]">{stats.todayTotal}</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center justify-center text-[#F04491]">
            <CalendarDays size={18} />
          </div>
        </div>

        {/* Hoje Pendentes */}
        <div className="bg-white p-4 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#827780] block">Pendentes Hoje</span>
            <span className="text-xl font-black text-[#F04491]">{stats.todayPending}</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FCE5ED] flex items-center justify-center text-[#F04491]">
            <Clock size={18} />
          </div>
        </div>

        {/* Hoje Concluídas */}
        <div className="bg-white p-4 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#827780] block">Concluídas Hoje</span>
            <span className="text-xl font-black text-[#36A879]">{stats.todayCompleted}</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#EBF7F1] flex items-center justify-center text-[#36A879]">
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Atrasadas Geral */}
        <div
          onClick={() => {
            setStatusFilter('overdue')
            setViewMode('list')
          }}
          className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-center justify-between ${
            stats.totalOverdue > 0
              ? 'bg-[#FEF1F2] border-[#FCA5A5] text-[#D93025]'
              : 'bg-white border-[#F6E4EC] text-[#827780]'
          }`}
          title="Clique para filtrar atividades atrasadas"
        >
          <div>
            <span className="text-[11px] font-semibold block">Atrasadas</span>
            <span className="text-xl font-black">
              {stats.totalOverdue}
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              stats.totalOverdue > 0 ? 'bg-white text-[#D93025]' : 'bg-[#FFF9FB] text-[#827780]'
            }`}
          >
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* Alerta Destacado se houver atividades atrasadas */}
      {stats.totalOverdue > 0 && (
        <div className="p-4 rounded-3xl bg-[#FEF1F2] border border-[#FCA5A5] flex items-center justify-between gap-3 text-xs text-[#D93025]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="shrink-0" />
            <div>
              <span className="font-bold">Atenção:</span> Existem{' '}
              <span className="font-extrabold">{stats.totalOverdue} atividade(s) pendente(s) com data anterior à de hoje</span>.
              Recomenda-se concluir ou reagendar para manter a fidedignidade dos registros.
            </div>
          </div>
          <button
            onClick={() => {
              setStatusFilter('overdue')
              setViewMode('list')
            }}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#FCA5A5] text-xs font-bold hover:bg-[#FEE2E2] transition-colors shrink-0 cursor-pointer"
          >
            Filtrar Atrasadas
          </button>
        </div>
      )}

      {/* 3. BARRA DE CONTROLE: MODOS DE VISUALIZAÇÃO E NAVEGAÇÃO TEMPORAL */}
      <div className="bg-white p-3 md:p-4 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Modos: Mês / Semana / Dia / Lista */}
        <div className="flex items-center gap-1 bg-[#FFF9FB] p-1 rounded-2xl border border-[#F6E4EC] self-start md:self-auto overflow-x-auto">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === 'month'
                ? 'bg-[#F04491] text-white shadow-sm'
                : 'text-[#827780] hover:text-[#28232A]'
            }`}
          >
            <CalendarRange size={14} />
            <span>Mês</span>
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === 'week'
                ? 'bg-[#F04491] text-white shadow-sm'
                : 'text-[#827780] hover:text-[#28232A]'
            }`}
          >
            <CalendarDays size={14} />
            <span>Semana</span>
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === 'day'
                ? 'bg-[#F04491] text-white shadow-sm'
                : 'text-[#827780] hover:text-[#28232A]'
            }`}
          >
            <Clock size={14} />
            <span>Dia</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === 'list'
                ? 'bg-[#F04491] text-white shadow-sm'
                : 'text-[#827780] hover:text-[#28232A]'
            }`}
          >
            <List size={14} />
            <span>Lista</span>
          </button>
        </div>

        {/* Navegação Temporal (Mês / Semana / Dia) */}
        {viewMode !== 'list' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoToday}
              className="px-3 py-1.5 rounded-xl bg-[#FCE5ED] text-[#F04491] text-xs font-bold hover:bg-[#FAD5E3] transition-colors cursor-pointer"
            >
              Hoje
            </button>
            <div className="flex items-center rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] p-1">
              <button
                onClick={handlePrev}
                title="Anterior"
                className="p-1.5 rounded-xl text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-xs font-bold text-[#28232A] min-w-[140px] text-center capitalize">
                {periodTitle}
              </span>
              <button
                onClick={handleNext}
                title="Próximo"
                className="p-1.5 rounded-xl text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs font-bold text-[#827780]">
            {filteredActivities.length} atividade(s) encontrada(s)
          </div>
        )}
      </div>

      {/* 4. FILTROS RÁPIDOS (PERÍODO E STATUS) */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Status Filters */}
        <span className="font-bold text-[#827780] mr-1">Status:</span>
        {[
          { id: 'all', label: 'Todos' },
          { id: 'pending', label: 'Pendentes' },
          { id: 'overdue', label: 'Atrasadas' },
          { id: 'completed', label: 'Concluídas' },
        ].map((f) => {
          const isSelected = statusFilter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as StatusFilter)}
              className={`px-3 py-1.5 rounded-2xl font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#28232A] text-white shadow-sm'
                  : 'bg-white text-[#827780] border border-[#F6E4EC] hover:text-[#28232A]'
              }`}
            >
              {f.label}
            </button>
          )
        })}

        <div className="h-4 w-px bg-[#F6E4EC] mx-1 hidden sm:block" />

        {/* Period Filters */}
        <span className="font-bold text-[#827780] mr-1">Período:</span>
        {[
          { id: 'all', label: 'Todo Período' },
          { id: 'today', label: 'Hoje' },
          { id: 'week', label: 'Esta Semana' },
          { id: 'month', label: 'Este Mês' },
        ].map((p) => {
          const isSelected = periodFilter === p.id
          return (
            <button
              key={p.id}
              onClick={() => setPeriodFilter(p.id as PeriodFilter)}
              className={`px-3 py-1.5 rounded-2xl font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#F04491] text-white shadow-sm'
                  : 'bg-white text-[#827780] border border-[#F6E4EC] hover:text-[#F04491]'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* 5. CARREGAMENTO */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-[#F6E4EC] p-12 text-center shadow-sm">
          <div className="w-10 h-10 border-3 border-[#F04491] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-[#827780]">Carregando cronograma da agenda...</p>
        </div>
      ) : (
        <>
          {/* MODO MÊS */}
          {viewMode === 'month' && (
            <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] p-4 md:p-6 overflow-hidden">
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-[#827780] pb-3 border-b border-[#F6E4EC]">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 pt-3">
                {monthDays.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="min-h-[90px] md:min-h-[110px] rounded-2xl bg-[#FFF9FB]/50" />
                  }

                  const dayActs = getActivitiesForDay(day)
                  const isDayToday = isTodayDate(day)
                  const hasOverdueInDay = dayActs.some(isOverdue)

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => {
                        setSelectedDayModal(day)
                        setDaySearchTerm('')
                      }}
                      className={`min-h-[90px] md:min-h-[110px] p-2 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
                        isDayToday
                          ? 'border-[#F04491] bg-[#FFF9FB] ring-1 ring-[#F04491]'
                          : hasOverdueInDay
                          ? 'border-[#FCA5A5] bg-[#FEF1F2]/40'
                          : 'border-[#F6E4EC]/70 hover:border-[#F58BB5]/50 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            isDayToday
                              ? 'bg-[#F04491] text-white'
                              : 'text-[#28232A]'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        {dayActs.length > 0 && (
                          <span
                            className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                              hasOverdueInDay
                                ? 'bg-[#FEF1F2] text-[#D93025]'
                                : 'bg-[#FCE5ED] text-[#F04491]'
                            }`}
                          >
                            {dayActs.length}
                          </span>
                        )}
                      </div>

                      {/* Mobile compact indicator dots (< 640px) */}
                      <div className="flex sm:hidden items-center justify-center gap-1 mt-1 flex-wrap">
                        {dayActs.slice(0, 3).map((act) => {
                          const overdue = isOverdue(act)
                          return (
                            <span
                              key={act.id}
                              className={`w-1.5 h-1.5 rounded-full ${
                                overdue
                                  ? 'bg-[#D93025]'
                                  : act.status === 'completed'
                                  ? 'bg-[#36A879]'
                                  : 'bg-[#F04491]'
                              }`}
                            />
                          )
                        })}
                        {dayActs.length > 3 && (
                          <span className="text-[8px] font-black text-[#827780]">
                            +{dayActs.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Desktop/Tablet text labels (>= 640px) */}
                      <div className="hidden sm:block space-y-1 mt-1 overflow-y-auto max-h-[60px] no-scrollbar">
                        {dayActs.slice(0, 2).map((act) => {
                          const overdue = isOverdue(act)
                          return (
                            <div
                              key={act.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelectActivity(act)
                              }}
                              title={`${act.title} (${act.status})`}
                              className={`text-[10px] px-1.5 py-0.5 rounded-lg font-semibold truncate ${
                                overdue
                                  ? 'bg-[#FEF1F2] text-[#D93025] font-bold'
                                  : act.status === 'completed'
                                  ? 'bg-[#EBF7F1] text-[#36A879] line-through'
                                  : 'bg-[#FCE5ED] text-[#F04491]'
                              }`}
                            >
                              {act.title}
                            </div>
                          )
                        })}
                        {dayActs.length > 2 && (
                          <span className="text-[9px] text-[#827780] font-bold block">
                            +{dayActs.length - 2} mais
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* MODO SEMANA */}
          {viewMode === 'week' && (
            <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] p-4 md:p-6 overflow-x-auto">
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 min-w-[700px]">
                {weekDays.map((day) => {
                  const dayActs = getActivitiesForDay(day)
                  const isDayToday = isTodayDate(day)

                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-3 rounded-2xl border flex flex-col min-h-[300px] ${
                        isDayToday ? 'border-[#F04491] bg-[#FFF9FB]' : 'border-[#F6E4EC] bg-white'
                      }`}
                    >
                      <div 
                        onClick={() => {
                          setSelectedDayModal(day)
                          setDaySearchTerm('')
                        }}
                        className="pb-2 border-b border-[#F6E4EC] mb-2 flex items-center justify-between cursor-pointer hover:bg-[#FCE5ED]/30 p-1 rounded-xl transition-colors"
                        title="Ver todas as atividades deste dia"
                      >
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#827780] block">
                            {new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(day)}
                          </span>
                          <span className={`text-sm font-black ${isDayToday ? 'text-[#F04491]' : 'text-[#28232A]'}`}>
                            {day.getDate()}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-[#827780] bg-[#FFF9FB] px-1.5 py-0.5 rounded-full border border-[#F6E4EC]">
                          {dayActs.length}
                        </span>
                      </div>

                      {/* Lista de Atividades do Dia na Semana */}
                      <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar">
                        {dayActs.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-[11px] text-[#827780] italic py-8">
                            Sem eventos
                          </div>
                        ) : (
                          dayActs.map((act) => {
                            const overdue = isOverdue(act)
                            const timeStr = act.starts_at.includes('T')
                              ? act.starts_at.split('T')[1].slice(0, 5)
                              : ''
                            return (
                              <div
                                key={act.id}
                                onClick={() => onSelectActivity(act)}
                                className={`p-2 rounded-xl border text-xs cursor-pointer transition-all hover:shadow-sm ${
                                  overdue
                                    ? 'bg-[#FEF1F2] border-[#FCA5A5]'
                                    : act.status === 'completed'
                                    ? 'bg-[#EBF7F1]/60 border-[#A7E2C6]'
                                    : 'bg-white border-[#F6E4EC] hover:border-[#F58BB5]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-[10px] font-bold text-[#827780] flex items-center gap-1">
                                    <Clock size={10} />
                                    {timeStr || 'Horário n/d'}
                                  </span>
                                  {overdue && (
                                    <span className="text-[9px] font-extrabold text-[#D93025] bg-white px-1 rounded">
                                      Atrasada
                                    </span>
                                  )}
                                </div>
                                <h4
                                  className={`font-bold line-clamp-2 ${
                                    act.status === 'completed' ? 'line-through text-[#827780]' : 'text-[#28232A]'
                                  }`}
                                >
                                  {act.title}
                                </h4>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* MODO DIA */}
          {viewMode === 'day' && (
            <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] p-4 md:p-8 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#F6E4EC]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setViewMode('month')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="Voltar ao Calendário Mensal"
                  >
                    <ChevronLeft size={16} />
                    <span>Voltar ao Mês</span>
                  </button>
                  <div>
                  <h3 className="text-base font-black text-[#28232A] capitalize">{periodTitle}</h3>
                  <p className="text-xs text-[#827780]">
                    {getActivitiesForDay(currentDate).length} atividade(s) agendada(s) para esta data
                    </p>
                  </div>
                </div>
                <button
                  onClick={onOpenNewActivity}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#F04491] text-white text-xs font-bold shadow-sm hover:bg-[#DE3380] cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Adicionar Neste Dia</span>
                </button>
              </div>

              {/* Lista do Dia */}
              {getActivitiesForDay(currentDate).length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center">
                    <CalendarIcon size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-[#28232A]">Nenhuma atividade para este dia</h4>
                  <p className="text-xs text-[#827780] max-w-sm mx-auto">
                    Aproveite para organizar prontuários ou agendar novas visitas e atendimentos.
                  </p>
                  <button
                    onClick={onOpenNewActivity}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#F04491] text-white text-xs font-bold hover:bg-[#DE3380] cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Criar Atividade</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {getActivitiesForDay(currentDate).map((act) => {
                    const overdue = isOverdue(act)
                    const catInfo = getCategoryBadge(act.category)
                    const timeStr = act.starts_at.includes('T')
                      ? act.starts_at.split('T')[1].slice(0, 5)
                      : '08:00'

                    return (
                      <div
                        key={act.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          overdue
                            ? 'bg-[#FEF1F2]/60 border-[#FCA5A5]'
                            : act.status === 'completed'
                            ? 'bg-[#EBF7F1]/40 border-[#A7E2C6]'
                            : 'bg-[#FFF9FB] border-[#F6E4EC]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Toggle Rápido */}
                          {onToggleComplete && (
                            <button
                              onClick={() => onToggleComplete(act.id, act.status)}
                              title={act.status === 'completed' ? 'Marcar como pendente' : 'Marcar como concluída'}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center border mt-0.5 cursor-pointer transition-all ${
                                act.status === 'completed'
                                  ? 'bg-[#36A879] border-[#36A879] text-white'
                                  : 'border-[#827780] hover:border-[#F04491] bg-white'
                              }`}
                            >
                              {act.status === 'completed' && <Check size={14} />}
                            </button>
                          )}

                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs font-extrabold text-[#28232A] flex items-center gap-1">
                                <Clock size={12} className="text-[#827780]" />
                                {timeStr}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${catInfo.bg}`}>
                                {catInfo.icon}
                                <span>{catInfo.label}</span>
                              </span>
                              {overdue && (
                                <span className="text-[10px] font-extrabold bg-[#D93025] text-white px-2 py-0.5 rounded-full">
                                  Atrasada
                                </span>
                              )}
                            </div>
                            <h4
                              onClick={() => onSelectActivity(act)}
                              className={`text-sm font-bold cursor-pointer hover:text-[#F04491] ${
                                act.status === 'completed' ? 'line-through text-[#827780]' : 'text-[#28232A]'
                              }`}
                            >
                              {act.title}
                            </h4>
                            {act.description && (
                              <p className="text-xs text-[#827780] mt-0.5 line-clamp-1">
                                {act.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Ações Rápidas */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {onReschedule && act.status !== 'completed' && (
                            <button
                              onClick={() => onReschedule(act)}
                              className="px-3 py-1.5 rounded-xl bg-white border border-[#F6E4EC] text-xs font-semibold text-[#827780] hover:text-[#F04491] hover:border-[#F04491] transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw size={12} />
                              <span>Reagendar</span>
                            </button>
                          )}
                          <button
                            onClick={() => onSelectActivity(act)}
                            className="px-3 py-1.5 rounded-xl bg-[#FCE5ED] text-[#F04491] text-xs font-bold hover:bg-[#FAD5E3] transition-colors cursor-pointer"
                          >
                            Detalhes
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* MODO LISTA */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] p-4 md:p-6 space-y-3">
              {filteredActivities.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center">
                    <List size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-[#28232A]">Nenhuma atividade encontrada</h4>
                  <p className="text-xs text-[#827780] max-w-sm mx-auto">
                    Tente ajustar os filtros de status e período para visualizar seus atendimentos.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#F6E4EC]">
                  {filteredActivities.map((act) => {
                    const overdue = isOverdue(act)
                    const catInfo = getCategoryBadge(act.category)
                    const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(act.starts_at))

                    return (
                      <div
                        key={act.id}
                        className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          {onToggleComplete && (
                            <button
                              onClick={() => onToggleComplete(act.id, act.status)}
                              title={act.status === 'completed' ? 'Marcar como pendente' : 'Marcar como concluída'}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center border mt-0.5 cursor-pointer transition-all ${
                                act.status === 'completed'
                                  ? 'bg-[#36A879] border-[#36A879] text-white'
                                  : 'border-[#827780] hover:border-[#F04491] bg-white'
                              }`}
                            >
                              {act.status === 'completed' && <Check size={14} />}
                            </button>
                          )}

                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-[#827780] flex items-center gap-1">
                                <Clock size={12} />
                                {dateFormatted}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${catInfo.bg}`}>
                                {catInfo.icon}
                                <span>{catInfo.label}</span>
                              </span>
                              {overdue && (
                                <span className="text-[10px] font-extrabold bg-[#D93025] text-white px-2 py-0.5 rounded-full">
                                  Atrasada
                                </span>
                              )}
                              {act.status === 'completed' && (
                                <span className="text-[10px] font-bold bg-[#EBF7F1] text-[#36A879] px-2 py-0.5 rounded-full">
                                  Concluída
                                </span>
                              )}
                            </div>
                            <h4
                              onClick={() => onSelectActivity(act)}
                              className={`text-sm font-bold cursor-pointer hover:text-[#F04491] ${
                                act.status === 'completed' ? 'line-through text-[#827780]' : 'text-[#28232A]'
                              }`}
                            >
                              {act.title}
                            </h4>
                            {act.description && (
                              <p className="text-xs text-[#827780] mt-0.5 line-clamp-1">
                                {act.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {onReschedule && act.status !== 'completed' && (
                            <button
                              onClick={() => onReschedule(act)}
                              className="px-3 py-1.5 rounded-xl bg-white border border-[#F6E4EC] text-xs font-semibold text-[#827780] hover:text-[#F04491] hover:border-[#F04491] transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw size={12} />
                              <span>Reagendar</span>
                            </button>
                          )}
                          <button
                            onClick={() => onSelectActivity(act)}
                            className="px-3 py-1.5 rounded-xl bg-[#FCE5ED] text-[#F04491] text-xs font-bold hover:bg-[#FAD5E3] transition-colors cursor-pointer"
                          >
                            Detalhes
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL / CARD COMPLETO DE ATIVIDADES DO DIA */}
      {selectedDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(240,68,145,0.18)] border border-[#F6E4EC] overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
            
            {/* Cabeçalho do Card */}
            <div className="px-6 py-5 border-b border-[#F6E4EC] flex items-center justify-between bg-gradient-to-r from-[#FFF9FB] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center shrink-0 shadow-sm">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#28232A] capitalize">
                    {new Intl.DateTimeFormat('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }).format(selectedDayModal)}
                  </h3>
                  <p className="text-xs text-[#827780]">
                    {getActivitiesForDay(selectedDayModal).length} atividade(s) agendada(s) para este dia
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDayModal(null)
                    onOpenNewActivity()
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Nova Atividade</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDayModal(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Barra de Pesquisa no Topo do Modal */}
            <div className="p-4 border-b border-[#F6E4EC] bg-[#FFF9FB]/60">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Pesquisar atividades deste dia por nome, descrição ou tipo..."
                  value={daySearchTerm}
                  onChange={(e) => setDaySearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-white border border-[#F6E4EC] rounded-2xl text-xs font-semibold text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] shadow-sm transition-all"
                />
                {daySearchTerm && (
                  <button
                    type="button"
                    onClick={() => setDaySearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#827780] hover:text-[#28232A] cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Lista de Atividades do Dia com Scroll */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {getActivitiesForDay(selectedDayModal).length === 0 ? (
                /* Estado Vazio Quando o Dia NÃO tem Atividades */
                <div className="py-12 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-3xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center shadow-inner">
                    <CalendarIcon size={28} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#28232A]">
                      Nenhuma atividade agendada para este dia
                    </h4>
                    <p className="text-xs text-[#827780] max-w-sm mx-auto mt-1">
                      Este dia está livre na sua agenda de atendimentos e visitas domiciliares.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDayModal(null)
                      onOpenNewActivity()
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer transform active:scale-95"
                  >
                    <Plus size={16} />
                    <span>Criar Atividade Neste Dia</span>
                  </button>
                </div>
              ) : dayModalActivities.length === 0 ? (
                /* Estado Quando a Busca não encontra resultados */
                <div className="py-10 text-center space-y-3">
                  <Search size={32} className="mx-auto text-[#827780]/40" />
                  <h4 className="text-sm font-bold text-[#28232A]">
                    Nenhuma atividade encontrada com "{daySearchTerm}"
                  </h4>
                  <p className="text-xs text-[#827780]">
                    Tente buscar por outro termo ou limpe o campo de pesquisa.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDaySearchTerm('')}
                    className="px-3.5 py-1.5 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-bold text-[#F04491] hover:bg-[#FCE5ED] cursor-pointer"
                  >
                    Limpar Filtro
                  </button>
                </div>
              ) : (
                /* Lista Completa das Atividades (suporta dezenas/centenas de atividades com scroll) */
                dayModalActivities.map((act) => {
                  const overdue = isOverdue(act)
                  const catInfo = getCategoryBadge(act.category)
                  const timeStr = act.starts_at.includes('T')
                    ? act.starts_at.split('T')[1].slice(0, 5)
                    : '08:00'

                  return (
                    <div
                      key={act.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        overdue
                          ? 'bg-[#FEF1F2]/60 border-[#FCA5A5]'
                          : act.status === 'completed'
                          ? 'bg-[#EBF7F1]/40 border-[#A7E2C6]'
                          : 'bg-[#FFF9FB] border-[#F6E4EC] hover:border-[#F58BB5]/50'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {onToggleComplete && (
                          <button
                            type="button"
                            onClick={() => onToggleComplete(act.id, act.status)}
                            title={act.status === 'completed' ? 'Marcar como pendente' : 'Marcar como concluída'}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center border mt-0.5 cursor-pointer shrink-0 transition-all ${
                              act.status === 'completed'
                                ? 'bg-[#36A879] border-[#36A879] text-white'
                                : 'border-[#827780] hover:border-[#F04491] bg-white'
                            }`}
                          >
                            {act.status === 'completed' && <Check size={14} />}
                          </button>
                        )}

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs font-extrabold text-[#28232A] flex items-center gap-1">
                              <Clock size={12} className="text-[#827780]" />
                              {timeStr}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${catInfo.bg}`}>
                              {catInfo.icon}
                              <span>{catInfo.label}</span>
                            </span>
                            {overdue && (
                              <span className="text-[10px] font-extrabold bg-[#D93025] text-white px-2 py-0.5 rounded-full">
                                Atrasada
                              </span>
                            )}
                            {act.status === 'completed' && (
                              <span className="text-[10px] font-bold bg-[#EBF7F1] text-[#36A879] px-2 py-0.5 rounded-full">
                                Concluída
                              </span>
                            )}
                          </div>

                          <h4
                            onClick={() => {
                              setSelectedDayModal(null)
                              onSelectActivity(act)
                            }}
                            className={`text-sm font-bold cursor-pointer hover:text-[#F04491] truncate ${
                              act.status === 'completed' ? 'line-through text-[#827780]' : 'text-[#28232A]'
                            }`}
                            title={act.title}
                          >
                            {act.title}
                          </h4>

                          {act.description && (
                            <p className="text-xs text-[#827780] mt-0.5 line-clamp-2">
                              {act.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {onReschedule && act.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDayModal(null)
                              onReschedule(act)
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white border border-[#F6E4EC] text-xs font-semibold text-[#827780] hover:text-[#F04491] hover:border-[#F04491] transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw size={12} />
                            <span>Reagendar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDayModal(null)
                            onSelectActivity(act)
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#FCE5ED] text-[#F04491] text-xs font-bold hover:bg-[#FAD5E3] transition-colors cursor-pointer"
                        >
                          Ver Detalhes
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="px-6 py-3 border-t border-[#F6E4EC] bg-[#FFF9FB] flex items-center justify-between text-xs text-[#827780]">
              <span>
                Exibindo {dayModalActivities.length} de {getActivitiesForDay(selectedDayModal).length} atividade(s)
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayModal(null)}
                className="px-4 py-1.5 rounded-xl bg-white border border-[#F6E4EC] text-[#28232A] font-bold hover:bg-[#FCE5ED]/30 cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
