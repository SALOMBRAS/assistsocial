import React, { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { ActivityItem } from './ActivityCard'
import type { ActivityCategory, ActivityStatus } from '../types/supabase'
import { ActivityAttachmentsSection } from './ActivityAttachmentsSection'
import { useModalA11y } from '../hooks/useModalA11y'

interface ActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (activityData: {
    id?: string
    title: string
    category: ActivityCategory | string
    status: ActivityStatus
    starts_at: string
    ends_at: string | null
    description: string | null
    pendingFiles?: File[]
  }) => void | Promise<void>
  editingActivity: ActivityItem | null
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingActivity,
}) => {
  const [title, setTitle] = useState(editingActivity?.title || '')
  const [category, setCategory] = useState<ActivityCategory>(
    (editingActivity?.category as ActivityCategory) || 'atendimento'
  )
  const [status, setStatus] = useState<ActivityStatus>(editingActivity?.status || 'pending')
  const [date, setDate] = useState(() => {
    if (editingActivity?.starts_at) {
      return new Date(editingActivity.starts_at).toISOString().split('T')[0]
    }
    return new Date().toISOString().split('T')[0]
  })
  const [startTime, setStartTime] = useState(() => {
    if (editingActivity?.starts_at) {
      return new Date(editingActivity.starts_at).toTimeString().slice(0, 5)
    }
    return '09:00'
  })
  const [endTime, setEndTime] = useState(() => {
    if (editingActivity?.ends_at) {
      return new Date(editingActivity.ends_at).toTimeString().slice(0, 5)
    }
    return '10:00'
  })
  const [description, setDescription] = useState(editingActivity?.description || '')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddPendingFile = (file: File) => {
    setPendingFiles((prev) => [...prev, file])
  }

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: true,
    preventScroll: true,
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const starts_at = new Date(`${date}T${startTime || '09:00'}:00`).toISOString()
      const ends_at = endTime ? new Date(`${date}T${endTime}:00`).toISOString() : null

      await onSave({
        id: editingActivity?.id,
        title: title.trim(),
        category,
        status,
        starts_at,
        ends_at,
        description: description.trim() || null,
        pendingFiles,
      })
      onClose()
    } catch (err) {
      console.error('Erro ao salvar atividade com anexos:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-modal-title"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-[0_20px_50px_rgba(240,68,145,0.15)] border border-[#F6E4EC] overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Modal Header */}
        <div className="px-6 py-4 sm:py-5 border-b border-[#F6E4EC] flex items-center justify-between bg-gradient-to-r from-[#FFF9FB] to-white shrink-0">
          <div>
            <h2 id="activity-modal-title" className="text-lg font-bold text-[#28232A]">
              {editingActivity ? 'Editar Atividade' : 'Nova Atividade Social'}
            </h2>
            <p className="text-xs text-[#827780] font-medium">
              Preencha os dados do atendimento ou compromisso
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Título */}
          <div>
            <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
              Título da Atividade *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Visita Domiciliar - Família Santos"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
            />
          </div>

          {/* Categoria e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
              >
                <option value="atendimento">Atendimento Social</option>
                <option value="visita_domiciliar">Visita Domiciliar</option>
                <option value="elaboracao_relatorio">Elaboração de Relatório</option>
                <option value="reuniao">Reunião de Equipe</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ActivityStatus)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
              >
                <option value="pending">Pendente</option>
                <option value="in_progress">Em Andamento</option>
                <option value="completed">Concluído</option>
                <option value="rescheduled">Reagendado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Data e Horários */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#28232A] mb-1 uppercase tracking-wider">Data</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#28232A] mb-1 uppercase tracking-wider">Horário Início</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#28232A] mb-1 uppercase tracking-wider">Horário Término</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491]"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
              Anotações & Observações Técnicas
            </label>
            <textarea
              rows={3}
              placeholder="Descreva detalhes do caso, encaminhamentos ou necessidades identificadas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
            ></textarea>
          </div>

          {/* Seção: Relatórios e Anexos */}
          <ActivityAttachmentsSection
            activityId={editingActivity?.id}
            pendingFiles={pendingFiles}
            onAddPendingFile={handleAddPendingFile}
            onRemovePendingFile={handleRemovePendingFile}
          />

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-[#F6E4EC] flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-2xl text-xs md:text-sm font-semibold text-[#827780] hover:bg-[#FFF9FB] hover:text-[#28232A] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 min-h-[44px] rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs md:text-sm font-bold shadow-[0_4px_14px_rgba(240,68,145,0.3)] hover:shadow-[0_6px_20px_rgba(240,68,145,0.4)] transition-all cursor-pointer transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{editingActivity ? 'Salvando...' : 'Criando com Anexos...'}</span>
                </>
              ) : (
                <span>{editingActivity ? 'Salvar Alterações' : pendingFiles.length > 0 ? `Criar com ${pendingFiles.length} Anexo(s)` : 'Criar Atividade'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
