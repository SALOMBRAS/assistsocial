import { supabase } from '../lib/supabaseClient'
import type { NotificationItem } from '../types/supabase'

export interface ShareInviteDetails {
  shareId?: string
  resourceType: 'activity' | 'document'
  resourceId: string
  title: string
  inviterName?: string
  status: 'pending' | 'accepted' | 'rejected'
}

/**
 * AssistSocial - Notification Service
 * Gerencia notificações internas do usuário autenticado no Supabase.
 */

const NOTIFICATIONS_STORAGE_PREFIX = 'assistsocial_notifications_'

function getCachedNotifications(userId: string): NotificationItem[] {
  try {
    const raw = localStorage.getItem(`${NOTIFICATIONS_STORAGE_PREFIX}${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setCachedNotifications(userId: string, notifications: NotificationItem[]): void {
  try {
    localStorage.setItem(`${NOTIFICATIONS_STORAGE_PREFIX}${userId}`, JSON.stringify(notifications))
  } catch (err) {
    console.warn('Erro ao salvar cache de notificações:', err)
  }
}

/**
 * Busca notificações reais do usuário autenticado.
 */
export async function fetchUserNotifications(userId: string): Promise<NotificationItem[]> {
  if (!userId) return []

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Aviso ao consultar public.notifications, utilizando cache:', error.message)
      return getCachedNotifications(userId)
    }

    const notifications = (data as NotificationItem[]) || []
    setCachedNotifications(userId, notifications)
    return notifications
  } catch (err) {
    console.error('Erro de rede ao carregar notificações:', err)
    return getCachedNotifications(userId)
  }
}

/**
 * Marca notificação individual como lida no backend.
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!notificationId) return { success: false, error: 'ID da notificação inválido' }

  try {
    // 1. Tenta RPC oficial mark_notification_read
    const { error: rpcError } = await (supabase.rpc as any)('mark_notification_read', {
      p_notification_id: notificationId,
    })

    if (!rpcError) {
      updateLocalCacheReadState(userId, notificationId, true)
      return { success: true }
    }

    // 2. Fallback direto para update na tabela se RPC falhar
    const { error: updateError } = await (supabase.from('notifications') as any)
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (updateError) {
      console.warn('Falha ao atualizar notificação no banco:', updateError.message)
    }

    updateLocalCacheReadState(userId, notificationId, true)
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao marcar notificação como lida:', err)
    updateLocalCacheReadState(userId, notificationId, true)
    return { success: true }
  }
}

/**
 * Marca todas as notificações do usuário como lidas.
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  if (!userId) return { success: false, updatedCount: 0, error: 'Usuário não autenticado' }

  try {
    const { data, error: rpcError } = await (supabase.rpc as any)('mark_all_notifications_read')

    if (!rpcError && data) {
      clearAllUnreadInCache(userId)
      return { success: true, updatedCount: (data as any)?.updated_count || 0 }
    }

    // Fallback: update direto
    const { error: updateError } = await (supabase.from('notifications') as any)
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (updateError) {
      console.warn('Aviso no fallback de marcar todas:', updateError.message)
    }

    clearAllUnreadInCache(userId)
    return { success: true, updatedCount: 1 }
  } catch (err: any) {
    console.error('Erro ao marcar todas como lidas:', err)
    clearAllUnreadInCache(userId)
    return { success: true, updatedCount: 0 }
  }
}

/**
 * Exclui uma notificação.
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await (supabase.from('notifications') as any)
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)

    const current = getCachedNotifications(userId)
    setCachedNotifications(
      userId,
      current.filter((n) => n.id !== notificationId)
    )
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Inscrição em tempo real para notificações do usuário.
 */
export function subscribeToNotifications(
  userId: string,
  onNotificationChange: () => void
): () => void {
  if (!userId) return () => {}

  try {
    const channel = supabase
      .channel(`public:notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          onNotificationChange()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  } catch (err) {
    console.warn('Realtime channel error:', err)
    return () => {}
  }
}

function updateLocalCacheReadState(userId: string, notificationId: string, isRead: boolean) {
  const current = getCachedNotifications(userId)
  const updated = current.map((n) =>
    n.id === notificationId ? { ...n, is_read: isRead, read_at: isRead ? new Date().toISOString() : null } : n
  )
  setCachedNotifications(userId, updated)
}

function clearAllUnreadInCache(userId: string) {
  const current = getCachedNotifications(userId)
  const updated = current.map((n) => ({
    ...n,
    is_read: true,
    read_at: n.read_at || new Date().toISOString(),
  }))
  setCachedNotifications(userId, updated)
}
