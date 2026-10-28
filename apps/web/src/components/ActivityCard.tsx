import React, { useState } from 'react'
import {
  Calendar,
  Clock,
  Home,
  Users,
  FileText,
  Briefcase,
  Check,
  Trash2,
  Edit2,
  MoreVertical,
  XCircle,
  CalendarDays,
  Share2,
  AlertCircle,
} from 'lucide-react'
import type { Database, ActivityStatus } from '../types/supabase'

export type ActivityItem = Database['public']['Tables']['activities']['Row']

interface ActivityCardProps {
  activity: ActivityItem
  onToggleComplete: (id: string, currentStatus: ActivityStatus) => void
  onEdit: (activity: ActivityItem) => void
  onDeleteRequest: (activity: ActivityItem) => void
  onMarkNotCompleted: (activity: ActivityItem) => void
  onRescheduleRequest: (activity: ActivityItem) => void
  onCancelRequest: (activity: ActivityItem) => void
  onShareRequest: (activity: ActivityItem) => void
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  onToggleComplete,
  onEdit,
  onDeleteRequest,
  onMarkNotCompleted,
  onRescheduleRequest,
  onCancelRequest,
  onShareRequest,
}) => {
  const [menuOpen, setMenuOpen] = useState(false)

  const getCategoryInfo = (cat: string) => {
    switch (cat) {
      case 'visita_domiciliar':
        return { label: 'Visita Domiciliar', icon: <Home size={13} />, color: 'text-[#F04491] bg-[#FCE5ED]' }
      case 'atendimento':
        return { label: 'Atendimento Social', icon: <Users size={13} />, color: 'text-[#4B7BFF] bg-[#EDF2FF]' }
      case 'elaboracao_relatorio':
        return { label: 'Relatório Técnico', icon: <FileText size={13} />, color: 'text-[#9B51E0] bg-[#F5EBFF]' }
      case 'reuniao':
        return { label: 'Reunião de Equipe', icon: <Briefcase size={13} />, color: 'text-[#E59B28] bg-[#FEF8EC]' }
      default:
        return { label: 'Outros', icon: <Briefcase size={13} />, color: 'text-[#827780] bg-[#F0EEF0]' }
    }
  }

  const getStatusInfo = (status: ActivityStatus) => {
    switch (status) {
      case 'completed':
        return { label: 'Concluído', badgeClass: 'text-[#36A879] bg-[#EBF7F1] border-[#36A879]/20' }
      case 'in_progress':
        return { label: 'Em Andamento', badgeClass: 'text-[#F04491] bg-[#FCE5ED] border-[#F04491]/20' }
      case 'pending':
        return { label: 'Pendente', badgeClass: 'text-[#E59B28] bg-[#FEF8EC] border-[#E59B28]/20' }
      case 'rescheduled':
        return { label: 'Reagendado', badgeClass: 'text-[#4B7BFF] bg-[#EDF2FF] border-[#4B7BFF]/20' }
      case 'cancelled':
        return { label: 'Cancelado', badgeClass: 'text-[#827780] bg-[#F0EEF0] border-[#827780]/20' }
      case 'not_completed':
        return { label: 'Não Realizado', badgeClass: 'text-[#D93025] bg-[#FCE8E6] border-[#D93025]/20' }
      default:
        return { label: status, badgeClass: 'text-[#827780] bg-[#F0EEF0] border-[#827780]/20' }
    }
  }

  const catInfo = getCategoryInfo(activity.category)
  const statusInfo = getStatusInfo(activity.status)
  const isCompleted = activity.status === 'completed'
  const isNotCompleted = activity.status === 'not_completed'

  // Format date and time
  const startDate = new Date(activity.starts_at)
  const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(startDate)

  const timeFormatted = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(startDate)

  return (
    <div
      className={`bg-white rounded-2xl p-3.5 md:p-4 border transition-all duration-200 group relative ${
        isCompleted
          ? 'border-[#36A879]/30 bg-white/80'
          : isNotCompleted
          ? 'border-[#D93025]/30 bg-white/90'
          : 'border-[#F6E4EC] shadow-[0_2px_8px_rgba(240,68,145,0.02)] hover:shadow-[0_4px_16px_rgba(240,68,145,0.06)] hover:border-[#F58BB5]/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Checkbox toggle and Title */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <button
            onClick={() => onToggleComplete(activity.id, activity.status)}
            title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluído'}
            className={`w-6 h-6 rounded-xl flex items-center justify-center transition-all cursor-pointer mt-0.5 shrink-0 ${
              isCompleted
                ? 'bg-[#36A879] text-white shadow-sm'
                : 'border-2 border-[#F6E4EC] hover:border-[#F04491] text-transparent hover:text-[#F04491]'
            }`}
          >
            <Check size={14} className="stroke-[3]" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${catInfo.color}`}
              >
                {catInfo.icon}
                {catInfo.label}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.badgeClass}`}
              >
                {statusInfo.label}
              </span>
            </div>

            <h3
              className={`text-sm md:text-base font-bold text-[#28232A] tracking-tight leading-snug break-words line-clamp-2 ${
                isCompleted ? 'line-through text-[#827780]' : ''
              }`}
            >
              {activity.title}
            </h3>

            {activity.description && (
              <p className="text-xs text-[#827780] font-normal line-clamp-2 mt-1 leading-relaxed">
                {activity.description}
              </p>
            )}

            {/* Motivo de não realização, se aplicável */}
            {activity.status === 'not_completed' && activity.failure_reason && (
              <div className="mt-2 p-2.5 rounded-2xl bg-[#FCE8E6]/60 border border-[#D93025]/20 flex items-start gap-2 text-xs text-[#D93025]">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>
                  <strong>Motivo:</strong> {activity.failure_reason}
                </span>
              </div>
            )}

            {/* Date and time tags */}
            <div className="flex items-center gap-2.5 mt-3 text-[11px] text-[#827780] font-semibold flex-wrap">
              <div className="flex items-center gap-1 bg-[#FFF9FB] px-2 py-1 rounded-xl border border-[#F6E4EC]/70">
                <Calendar size={12} className="text-[#F04491]" />
                <span>{dateFormatted}</span>
              </div>
              <div className="flex items-center gap-1 bg-[#FFF9FB] px-2 py-1 rounded-xl border border-[#F6E4EC]/70">
                <Clock size={12} className="text-[#F04491]" />
                <span>{timeFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action icons / Menu */}
        <div className="flex items-center gap-1 relative">
          <button
            type="button"
            aria-label="Editar atividade"
            onClick={() => onEdit(activity)}
            title="Editar atividade"
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] transition-all cursor-pointer"
          >
            <Edit2 size={16} />
          </button>

          <button
            type="button"
            aria-label="Compartilhar com colega"
            onClick={() => onShareRequest(activity)}
            title="Compartilhar com colega"
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-[#827780] hover:text-[#4B7BFF] hover:bg-[#EDF2FF] transition-all cursor-pointer"
          >
            <Share2 size={16} />
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label="Mais opções"
              onClick={() => setMenuOpen(!menuOpen)}
              title="Mais opções"
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-[#827780] hover:text-[#28232A] hover:bg-[#FFF9FB] transition-all cursor-pointer"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-8 z-30 w-44 bg-white rounded-2xl shadow-xl border border-[#F6E4EC] py-1.5 text-xs text-[#28232A] font-semibold animate-fade-in">
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onRescheduleRequest(activity)
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-[#FFF9FB] flex items-center gap-2 text-[#4B7BFF] cursor-pointer"
                  >
                    <CalendarDays size={14} />
                    <span>Reagendar</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onMarkNotCompleted(activity)
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-[#FFF9FB] flex items-center gap-2 text-[#E59B28] cursor-pointer"
                  >
                    <XCircle size={14} />
                    <span>Marcar Não Realizada</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onCancelRequest(activity)
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-[#FFF9FB] flex items-center gap-2 text-[#827780] cursor-pointer"
                  >
                    <XCircle size={14} />
                    <span>Cancelar Atividade</span>
                  </button>

                  <div className="border-t border-[#F6E4EC] my-1" />

                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onDeleteRequest(activity)
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-[#FCE8E6] flex items-center gap-2 text-[#D93025] cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Excluir Atividade</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
