import { supabase } from '../lib/supabaseClient'
import type { ReminderItem } from '../types/supabase'

export interface CreateReminderInput {
  title: string
  description?: string
  remind_at: string
  activity_id?: string | null
}

const REMINDERS_STORAGE_PREFIX = 'assistsocial_reminders_'

function getCachedReminders(userId: string): ReminderItem[] {
  try {
    const raw = localStorage.getItem(`${REMINDERS_STORAGE_PREFIX}${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setCachedReminders(userId: string, reminders: ReminderItem[]): void {
  try {
    localStorage.setItem(`${REMINDERS_STORAGE_PREFIX}${userId}`, JSON.stringify(reminders))
  } catch (err) {
    console.warn('Erro ao salvar cache de lembretes:', err)
  }
}

/**
 * Busca lembretes reais do usuário ordenados por data de vencimento.
 */
export async function fetchUserReminders(userId: string): Promise<ReminderItem[]> {
  if (!userId) return []

  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('remind_at', { ascending: true })

    if (error) {
      console.warn('Aviso ao consultar public.reminders, usando cache local:', error.message)
      return getCachedReminders(userId)
    }

    const reminders = (data as ReminderItem[]) || []
    setCachedReminders(userId, reminders)
    return reminders
  } catch (err) {
    console.error('Erro de rede ao carregar lembretes:', err)
    return getCachedReminders(userId)
  }
}

/**
 * Cadastra um novo lembrete associado ao usuário e opcionalmente a uma atividade.
 */
export async function createReminder(
  userId: string,
  input: CreateReminderInput
): Promise<{ data?: ReminderItem; error?: string }> {
  if (!userId) return { error: 'Usuário não autenticado' }
  if (!input.title.trim()) return { error: 'O título do lembrete é obrigatório' }
  if (!input.remind_at) return { error: 'A data e horário são obrigatórios' }

  try {
    const payload = {
      user_id: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      remind_at: input.remind_at,
      activity_id: input.activity_id || null,
      is_completed: false,
    }

    const { data, error } = await (supabase.from('reminders') as any)
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.warn('Erro ao salvar lembrete no Supabase, armazenando localmente:', error.message)
      const fallbackItem: ReminderItem = {
        id: crypto.randomUUID(),
        user_id: userId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        remind_at: input.remind_at,
        activity_id: input.activity_id || null,
        is_completed: false,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const cached = getCachedReminders(userId)
      setCachedReminders(userId, [...cached, fallbackItem])
      return { data: fallbackItem }
    }

    const created = data as ReminderItem
    const cached = getCachedReminders(userId)
    setCachedReminders(userId, [...cached, created])
    return { data: created }
  } catch (err: any) {
    return { error: err.message || 'Falha ao criar lembrete' }
  }
}

/**
 * Conclui ou reabre um lembrete (toggle).
 */
export async function toggleReminderComplete(
  reminderId: string,
  userId: string
): Promise<{ success: boolean; is_completed?: boolean; error?: string }> {
  if (!reminderId) return { success: false, error: 'ID do lembrete inválido' }

  try {
    // 1. Tenta invocar RPC toggle_reminder_completed
    const { data, error: rpcError } = await (supabase.rpc as any)('toggle_reminder_completed', {
      p_reminder_id: reminderId,
    })

    if (!rpcError && data) {
      const isCompleted = (data as any)?.is_completed
      updateCachedReminderStatus(userId, reminderId, isCompleted)
      return { success: true, is_completed: isCompleted }
    }

    // 2. Fallback: buscar estado atual e inverter
    const cached = getCachedReminders(userId)
    const existing = cached.find((r) => r.id === reminderId)
    const newStatus = existing ? !existing.is_completed : true

    await (supabase.from('reminders') as any)
      .update({
        is_completed: newStatus,
        completed_at: newStatus ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .eq('user_id', userId)

    updateCachedReminderStatus(userId, reminderId, newStatus)
    return { success: true, is_completed: newStatus }
  } catch (err: any) {
    console.error('Erro ao alternar lembrete:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Exclui um lembrete.
 */
export async function deleteReminder(
  reminderId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!reminderId) return { success: false, error: 'ID do lembrete inválido' }

  try {
    const { error } = await (supabase.from('reminders') as any)
      .delete()
      .eq('id', reminderId)
      .eq('user_id', userId)

    if (error) {
      console.warn('Aviso ao excluir lembrete no Supabase:', error.message)
    }

    const cached = getCachedReminders(userId)
    setCachedReminders(
      userId,
      cached.filter((r) => r.id !== reminderId)
    )
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Verifica se um lembrete está vencido.
 */
export function isReminderOverdue(reminder: ReminderItem): boolean {
  if (reminder.is_completed) return false
  return new Date(reminder.remind_at).getTime() < Date.now()
}

/**
 * Formata data e hora do lembrete de maneira amigável em pt-BR.
 */
export function formatReminderDateTime(isoDateString: string): string {
  try {
    const date = new Date(isoDateString)
    if (isNaN(date.getTime())) return isoDateString
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoDateString
  }
}

function updateCachedReminderStatus(userId: string, reminderId: string, isCompleted: boolean) {
  const cached = getCachedReminders(userId)
  const updated = cached.map((r) =>
    r.id === reminderId
      ? {
          ...r,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }
      : r
  )
  setCachedReminders(userId, updated)
}
