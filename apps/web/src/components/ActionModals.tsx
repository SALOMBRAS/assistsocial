import React, { useState } from 'react'
import { X, AlertTriangle, Calendar, AlertCircle } from 'lucide-react'
import { useModalA11y } from '../hooks/useModalA11y'

// Modal para Justificar Não Realização
interface FailureReasonModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  activityTitle: string
}

export const FailureReasonModal: React.FC<FailureReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  activityTitle,
}) => {
  const [reason, setReason] = useState('')

  useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: true,
    preventScroll: true,
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    onConfirm(reason.trim())
    setReason('')
    onClose()
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="failure-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#F6E4EC] overflow-hidden p-6 max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#F6E4EC]">
          <div className="flex items-center gap-2.5 text-[#D93025]">
            <AlertCircle size={20} />
            <h3 id="failure-modal-title" className="font-bold text-base text-[#28232A]">
              Motivo da Não Realização
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:bg-[#FCE5ED] hover:text-[#F04491] cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[#827780] mb-3">
          Por favor, justifique o motivo pelo qual a atividade <strong>"{activityTitle}"</strong> não pôde ser realizada.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1">
          <textarea
            required
            rows={3}
            placeholder="Ex: Usuário ausente no domicílio / Falta de transporte institucional / Remanejamento de urgência..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491]"
          />

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] text-xs font-semibold text-[#827780] hover:bg-[#FFF9FB] rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 min-h-[44px] text-xs font-bold bg-[#D93025] hover:bg-[#C5221F] text-white rounded-xl shadow-md transition-all cursor-pointer"
            >
              Registrar Motivo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal para Reagendamento
interface RescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (newStartsAt: string, newEndsAt: string | null) => void
  activityTitle: string
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  activityTitle,
}) => {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')

  useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: true,
    preventScroll: true,
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const startsAt = new Date(`${date}T${startTime}:00`).toISOString()
    const endsAt = endTime ? new Date(`${date}T${endTime}:00`).toISOString() : null
    onConfirm(startsAt, endsAt)
    onClose()
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#F6E4EC] overflow-hidden p-6 max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#F6E4EC]">
          <div className="flex items-center gap-2.5 text-[#4B7BFF]">
            <Calendar size={20} />
            <h3 id="reschedule-modal-title" className="font-bold text-base text-[#28232A]">
              Reagendar Atividade
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:bg-[#FCE5ED] hover:text-[#F04491] cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[#827780] mb-3">
          Selecione a nova data e horário para <strong>"{activityTitle}"</strong>:
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-bold text-[#28232A] mb-1">Nova Data</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:ring-2 focus:ring-[#F04491]/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#28232A] mb-1">Novo Início</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:ring-2 focus:ring-[#F04491]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#28232A] mb-1">Novo Término</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:ring-2 focus:ring-[#F04491]/30"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] text-xs font-semibold text-[#827780] hover:bg-[#FFF9FB] rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 min-h-[44px] text-xs font-bold bg-[#4B7BFF] hover:bg-[#3A68E6] text-white rounded-xl shadow-md transition-all cursor-pointer"
            >
              Confirmar Reagendamento
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal de Confirmação de Exclusão
interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
}) => {
  useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: true,
    preventScroll: true,
  })

  if (!isOpen) return null

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#F6E4EC] p-6 text-center max-h-[90dvh] overflow-y-auto">
        <div className="w-12 h-12 rounded-2xl bg-[#FCE8E6] text-[#D93025] flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={24} />
        </div>
        <h3 id="delete-modal-title" className="font-bold text-base text-[#28232A] mb-1">{title}</h3>
        <p className="text-xs text-[#827780] leading-relaxed mb-6">{description}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 min-h-[44px] text-xs font-semibold text-[#827780] hover:bg-[#FFF9FB] rounded-xl border border-[#F6E4EC] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="flex-1 py-2.5 min-h-[44px] text-xs font-bold bg-[#D93025] hover:bg-[#C5221F] text-white rounded-xl shadow-md cursor-pointer transition-all"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
