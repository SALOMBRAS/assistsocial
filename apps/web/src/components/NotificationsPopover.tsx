import React, { useState, useEffect } from 'react'
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  Clock,
  AlertTriangle,
  Calendar,
  UserPlus,
  X,
  Plus,
  FileText,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { useModalA11y } from '../hooks/useModalA11y'
import type { NotificationItem, ReminderItem } from '../types/supabase'
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  subscribeToNotifications,
} from '../services/notificationService'
import {
  fetchUserReminders,
  createReminder,
  toggleReminderComplete,
  deleteReminder,
  isReminderOverdue,
  formatReminderDateTime,
} from '../services/reminderService'

export interface NotificationsPopoverProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  activities?: Array<{ id: string; title: string }>
  onOpenActivity?: (activityId: string) => void
  onAcceptShare?: (shareId: string) => Promise<void>
  onRejectShare?: (shareId: string) => Promise<void>
}

export function NotificationsPopover({
  isOpen,
  onClose,
  userId,
  activities = [],
  onOpenActivity,
  onAcceptShare,
  onRejectShare,
}: NotificationsPopoverProps) {
  useModalA11y({ isOpen, onClose })

  const [activeTab, setActiveTab] = useState<'notifications' | 'reminders'>('notifications')
  
  // Notificações
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null)

  // Lembretes
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [loadingReminders, setLoadingReminders] = useState(false)
  const [showAddReminderForm, setShowAddReminderForm] = useState(false)
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderDesc, setReminderDesc] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderActivityId, setReminderActivityId] = useState('')
  const [savingReminder, setSavingReminder] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Carrega notificações e lembretes quando abre
  const loadData = async () => {
    if (!userId) return
    setLoadingNotifications(true)
    setLoadingReminders(true)

    try {
      const [notifs, rems] = await Promise.all([
        fetchUserNotifications(userId),
        fetchUserReminders(userId),
      ])
      setNotifications(notifs)
      setReminders(rems)
    } finally {
      setLoadingNotifications(false)
      setLoadingReminders(false)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      loadData()
      const unsubscribe = subscribeToNotifications(userId, () => {
        fetchUserNotifications(userId).then(setNotifications)
      })
      return () => {
        unsubscribe()
      }
    }
  }, [isOpen, userId])

  if (!isOpen) return null

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const activeRemindersCount = reminders.filter((r) => !r.is_completed).length

  // Marcar individual como lida
  const handleMarkAsRead = async (notifId: string) => {
    setIsProcessingAction(notifId)
    try {
      await markNotificationAsRead(notifId, userId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      )
    } finally {
      setIsProcessingAction(null)
    }
  }

  // Marcar todas como lidas
  const handleMarkAllRead = async () => {
    setIsProcessingAction('all')
    try {
      await markAllNotificationsAsRead(userId)
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() }))
      )
    } finally {
      setIsProcessingAction(null)
    }
  }

  // Excluir notificação
  const handleDeleteNotif = async (notifId: string) => {
    await deleteNotification(notifId, userId)
    setNotifications((prev) => prev.filter((n) => n.id !== notifId))
  }

  // Concluir ou reabrir lembrete
  const handleToggleReminder = async (reminderId: string) => {
    setIsProcessingAction(reminderId)
    try {
      const res = await toggleReminderComplete(reminderId, userId)
      if (res.success) {
        setReminders((prev) =>
          prev.map((r) =>
            r.id === reminderId ? { ...r, is_completed: res.is_completed ?? !r.is_completed } : r
          )
        )
      }
    } finally {
      setIsProcessingAction(null)
    }
  }

  // Excluir lembrete
  const handleDeleteReminder = async (reminderId: string) => {
    await deleteReminder(reminderId, userId)
    setReminders((prev) => prev.filter((r) => r.id !== reminderId))
  }

  // Salvar novo lembrete
  const handleCreateReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!reminderTitle.trim()) {
      setFormError('Informe um título para o lembrete.')
      return
    }

    if (!reminderDate) {
      setFormError('Selecione data e hora para o lembrete.')
      return
    }

    setSavingReminder(true)
    try {
      const res = await createReminder(userId, {
        title: reminderTitle,
        description: reminderDesc,
        remind_at: new Date(reminderDate).toISOString(),
        activity_id: reminderActivityId || null,
      })

      if (res.error) {
        setFormError(res.error)
      } else if (res.data) {
        setReminders((prev) => [...prev, res.data!])
        setReminderTitle('')
        setReminderDesc('')
        setReminderDate('')
        setReminderActivityId('')
        setShowAddReminderForm(false)
      }
    } finally {
      setSavingReminder(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-2 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Painel de Notificações e Lembretes"
    >
      <div
        className="w-full max-w-md mt-16 sm:mt-14 bg-white rounded-3xl shadow-2xl border border-[#F6E4EC] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com Abas */}
        <div className="p-4 border-b border-[#F6E4EC] bg-[#FFF9FB]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-[#28232A] flex items-center gap-2">
              <Bell size={18} className="text-[#F04491]" />
              <span>Central de Avisos</span>
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[#FCE5ED] text-[#827780] hover:text-[#F04491] transition-colors cursor-pointer"
              title="Fechar painel"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Abas */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-[#F04491] text-white shadow-sm'
                  : 'bg-white text-[#827780] hover:bg-[#FCE5ED]/60 border border-[#F6E4EC]'
              }`}
            >
              <span>Notificações</span>
              {unreadCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'notifications' ? 'bg-white text-[#F04491]' : 'bg-[#F04491] text-white'
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('reminders')}
              className={`flex-1 py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'reminders'
                  ? 'bg-[#F04491] text-white shadow-sm'
                  : 'bg-white text-[#827780] hover:bg-[#FCE5ED]/60 border border-[#F6E4EC]'
              }`}
            >
              <span>Lembretes</span>
              {activeRemindersCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'reminders' ? 'bg-white text-[#F04491]' : 'bg-[#FCE5ED] text-[#F04491]'
                  }`}
                >
                  {activeRemindersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Conteúdo da Aba Ativa */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'notifications' ? (
            <>
              {/* Barra de ação rápida */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-bold text-[#827780]">
                  {unreadCount === 0 ? 'Tudo em dia' : `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={isProcessingAction === 'all'}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F04491] hover:text-[#DE3380] transition-colors cursor-pointer"
                  >
                    <CheckCheck size={14} />
                    <span>Marcar todas como lidas</span>
                  </button>
                )}
              </div>

              {loadingNotifications ? (
                <div className="py-12 flex flex-col items-center justify-center text-xs text-[#827780] gap-2">
                  <Loader2 size={24} className="animate-spin text-[#F04491]" />
                  <span>Carregando notificações...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-[#827780]/60 flex items-center justify-center mb-2">
                    <Bell size={20} />
                  </div>
                  <h4 className="text-xs font-bold text-[#28232A]">Nenhuma notificação</h4>
                  <p className="text-[11px] text-[#827780] mt-0.5">
                    Você será avisado sobre convites de atividades e lembretes aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {notifications.map((notif) => {
                    const isUnread = !notif.is_read
                    const isShareInvite = notif.type === 'share_invite'

                    return (
                      <div
                        key={notif.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isUnread
                            ? 'bg-[#FFF9FB] border-[#F04491]/30 shadow-xs'
                            : 'bg-white border-[#F6E4EC] opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <div
                              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                isShareInvite
                                  ? 'bg-[#FCE5ED] text-[#F04491]'
                                  : notif.type === 'reminder'
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'bg-[#FFF9FB] text-[#827780]'
                              }`}
                            >
                              {isShareInvite ? (
                                <UserPlus size={16} />
                              ) : notif.type === 'reminder' ? (
                                <Clock size={16} />
                              ) : (
                                <Bell size={16} />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4
                                  className={`text-xs leading-snug break-words ${
                                    isUnread ? 'font-bold text-[#28232A]' : 'font-medium text-[#827780]'
                                  }`}
                                >
                                  {notif.title}
                                </h4>
                                {isUnread && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#F04491] shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-[#827780] mt-1 leading-relaxed break-words">
                                {notif.content}
                              </p>
                              <span className="text-[10px] text-[#827780]/70 block mt-1.5">
                                {formatReminderDateTime(notif.created_at)}
                              </span>

                              {/* Ações de Convite de Compartilhamento */}
                              {isShareInvite && (
                                <div className="mt-3 flex items-center gap-2">
                                  <button
                                    onClick={async () => {
                                      if (onAcceptShare && notif.resource_id) {
                                        setIsProcessingAction(notif.id)
                                        try {
                                          await onAcceptShare(notif.resource_id)
                                          handleMarkAsRead(notif.id)
                                        } finally {
                                          setIsProcessingAction(null)
                                        }
                                      }
                                    }}
                                    disabled={isProcessingAction === notif.id}
                                    className="px-3 py-1.5 rounded-xl bg-[#36A879] hover:bg-[#2F936A] text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                                  >
                                    <Check size={12} />
                                    <span>Aceitar</span>
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (onRejectShare && notif.resource_id) {
                                        setIsProcessingAction(notif.id)
                                        try {
                                          await onRejectShare(notif.resource_id)
                                          handleMarkAsRead(notif.id)
                                        } finally {
                                          setIsProcessingAction(null)
                                        }
                                      }
                                    }}
                                    disabled={isProcessingAction === notif.id}
                                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <X size={12} />
                                    <span>Recusar</span>
                                  </button>
                                </div>
                              )}

                              {/* Link para recurso relacionado */}
                              {notif.resource_type === 'activity' && notif.resource_id && !isShareInvite && (
                                <button
                                  onClick={() => {
                                    if (onOpenActivity && notif.resource_id) {
                                      onOpenActivity(notif.resource_id)
                                      handleMarkAsRead(notif.id)
                                      onClose()
                                    }
                                  }}
                                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#F04491] hover:underline cursor-pointer"
                                >
                                  <ExternalLink size={12} />
                                  <span>Visualizar Atividade</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Ações da Notificação */}
                          <div className="flex items-center gap-1 shrink-0">
                            {isUnread && (
                              <button
                                onClick={() => handleMarkAsRead(notif.id)}
                                disabled={isProcessingAction === notif.id}
                                className="p-1 rounded-lg hover:bg-[#FCE5ED] text-[#827780] hover:text-[#F04491] transition-colors cursor-pointer"
                                title="Marcar como lida"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotif(notif.id)}
                              className="p-1 rounded-lg hover:bg-red-50 text-[#827780] hover:text-red-600 transition-colors cursor-pointer"
                              title="Excluir notificação"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Aba de Lembretes */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-bold text-[#827780]">
                  {reminders.length} lembrete{reminders.length !== 1 ? 's' : ''} registrado{reminders.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setShowAddReminderForm((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F04491] hover:text-[#DE3380] transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>{showAddReminderForm ? 'Cancelar' : 'Novo Lembrete'}</span>
                </button>
              </div>

              {/* Formulário Novo Lembrete */}
              {showAddReminderForm && (
                <form
                  onSubmit={handleCreateReminderSubmit}
                  className="p-3.5 bg-[#FFF9FB] rounded-2xl border border-[#F04491]/30 space-y-2.5 animate-in fade-in duration-150"
                >
                  <h4 className="text-xs font-bold text-[#28232A]">Criar Novo Lembrete</h4>
                  {formError && (
                    <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px]">
                      {formError}
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-bold text-[#827780] uppercase tracking-wider block mb-1">
                      Título *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Entregar relatório de visita"
                      value={reminderTitle}
                      onChange={(e) => setReminderTitle(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#F6E4EC] rounded-xl focus:outline-none focus:border-[#F04491]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#827780] uppercase tracking-wider block mb-1">
                      Descrição (opcional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Detalhes ou anotações..."
                      value={reminderDesc}
                      onChange={(e) => setReminderDesc(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#F6E4EC] rounded-xl focus:outline-none focus:border-[#F04491] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-[#827780] uppercase tracking-wider block mb-1">
                        Data e Horário *
                      </label>
                      <input
                        type="datetime-local"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#F6E4EC] rounded-xl focus:outline-none focus:border-[#F04491]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#827780] uppercase tracking-wider block mb-1">
                        Vincular à Atividade
                      </label>
                      <select
                        value={reminderActivityId}
                        onChange={(e) => setReminderActivityId(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-[#F6E4EC] rounded-xl focus:outline-none focus:border-[#F04491] truncate"
                      >
                        <option value="">Nenhuma (geral)</option>
                        {activities.map((act) => (
                          <option key={act.id} value={act.id}>
                            {act.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddReminderForm(false)}
                      className="px-3 py-1.5 text-xs font-bold text-[#827780] hover:text-[#28232A] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingReminder}
                      className="px-4 py-1.5 rounded-xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {savingReminder && <Loader2 size={12} className="animate-spin" />}
                      <span>Salvar Lembrete</span>
                    </button>
                  </div>
                </form>
              )}

              {loadingReminders ? (
                <div className="py-12 flex flex-col items-center justify-center text-xs text-[#827780] gap-2">
                  <Loader2 size={24} className="animate-spin text-[#F04491]" />
                  <span>Carregando lembretes...</span>
                </div>
              ) : reminders.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-[#827780]/60 flex items-center justify-center mb-2">
                    <Clock size={20} />
                  </div>
                  <h4 className="text-xs font-bold text-[#28232A]">Nenhum lembrete cadastrado</h4>
                  <p className="text-[11px] text-[#827780] mt-0.5">
                    Crie lembretes com data e horário para não perder nenhum prazo importante.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reminders.map((reminder) => {
                    const isOverdue = isReminderOverdue(reminder)
                    const isCompleted = reminder.is_completed

                    return (
                      <div
                        key={reminder.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isCompleted
                            ? 'bg-[#F9FAF9] border-gray-200 opacity-60'
                            : isOverdue
                            ? 'bg-red-50/50 border-red-200'
                            : 'bg-white border-[#F6E4EC] hover:border-[#F04491]/30'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Checkbox para Concluir */}
                          <button
                            onClick={() => handleToggleReminder(reminder.id)}
                            disabled={isProcessingAction === reminder.id}
                            className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                              isCompleted
                                ? 'bg-[#36A879] border-[#36A879] text-white'
                                : 'border-[#F6E4EC] hover:border-[#F04491] bg-white'
                            }`}
                            title={isCompleted ? 'Reabrir lembrete' : 'Concluir lembrete'}
                          >
                            {isCompleted && <Check size={12} className="stroke-[3]" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4
                                className={`text-xs font-bold break-words ${
                                  isCompleted
                                    ? 'line-through text-[#827780]'
                                    : isOverdue
                                    ? 'text-red-700'
                                    : 'text-[#28232A]'
                                }`}
                              >
                                {reminder.title}
                              </h4>

                              {/* Badges de Status */}
                              {isCompleted ? (
                                <span className="px-1.5 py-0.2 rounded-md bg-[#EBF7F1] text-[#36A879] text-[9px] font-bold">
                                  Concluído
                                </span>
                              ) : isOverdue ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-red-100 text-red-700 text-[9px] font-bold">
                                  <AlertTriangle size={10} />
                                  <span>Vencido</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded-md bg-[#FCE5ED] text-[#F04491] text-[9px] font-bold">
                                  Próximo
                                </span>
                              )}
                            </div>

                            {reminder.description && (
                              <p className="text-[11px] text-[#827780] mt-1 leading-relaxed break-words">
                                {reminder.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px] text-[#827780]">
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Clock size={11} className={isOverdue ? 'text-red-600' : 'text-[#F04491]'} />
                                <span>{formatReminderDateTime(reminder.remind_at)}</span>
                              </span>

                              {reminder.activity_id && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#FFF9FB] border border-[#F6E4EC] text-[#28232A]">
                                  <FileText size={10} className="text-[#F04491]" />
                                  <span>Atividade vinculada</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Botão Excluir */}
                          <button
                            onClick={() => handleDeleteReminder(reminder.id)}
                            className="p-1 rounded-lg hover:bg-red-50 text-[#827780] hover:text-red-600 transition-colors cursor-pointer shrink-0"
                            title="Excluir lembrete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
