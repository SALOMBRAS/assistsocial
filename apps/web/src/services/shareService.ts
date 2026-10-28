import { supabase } from '../lib/supabaseClient'
import type { DirectoryUser } from './userDirectoryService'

export interface ShareInvitePayload {
  resourceType: 'activity' | 'document' | 'folder'
  resourceId: string
  resourceTitle: string
  recipient: DirectoryUser
  permission: 'viewer' | 'commenter' | 'editor'
  currentUserId: string
  currentUserName: string
}

export interface ResourceShareRecord {
  id: string
  invited_user_id: string | null
  invited_email: string | null
  recipient_name?: string
  permission: 'viewer' | 'commenter' | 'editor'
  status: 'pending' | 'accepted' | 'rejected' | 'revoked'
  created_at: string
}

/**
 * AssistSocial - Share Service
 * Gerencia compartilhamentos seguros internos de atividades e documentos.
 */

/**
 * Envia convite de compartilhamento no backend com notificação interna.
 */
export async function sendShareInvite(
  payload: ShareInvitePayload
): Promise<{ success: boolean; error?: string; shareId?: string }> {
  const { resourceType, resourceId, resourceTitle, recipient, permission, currentUserId, currentUserName } = payload

  if (!currentUserId) return { success: false, error: 'Usuário não autenticado.' }
  if (recipient.id === currentUserId) return { success: false, error: 'Não é permitido compartilhar recursos consigo mesmo.' }

  try {
    // 1. Verifica se já existe compartilhamento ativo ou pendente
    const { data: existingShares, error: checkError } = await (supabase.from('resource_shares') as any)
      .select('id, status')
      .eq('resource_id', resourceId)
      .eq('invited_user_id', recipient.id)
      .in('status', ['pending', 'accepted'])

    if (!checkError && existingShares && existingShares.length > 0) {
      const activeStatus = existingShares[0].status
      return {
        success: false,
        error:
          activeStatus === 'accepted'
            ? `${recipient.full_name || recipient.email} já possui acesso ativo a este recurso.`
            : `Já existe um convite pendente para ${recipient.full_name || recipient.email}.`,
      }
    }

    // 2. Invoca RPC correspondente
    const rpcName =
      resourceType === 'activity' ? 'create_activity_share_invite' : 'create_document_share_invite'
    const paramKey = resourceType === 'activity' ? 'p_activity_id' : 'p_document_id'

    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(rpcName, {
      [paramKey]: resourceId,
      p_recipient_user_id: recipient.id,
      p_permission: permission,
    })

    if (!rpcError && rpcData) {
      return { success: true, shareId: (rpcData as any)?.share_id }
    }

    // 3. Fallback: Inserção direta em resource_shares e criação de notificação interna
    const newShare = {
      owner_id: currentUserId,
      resource_type: resourceType,
      resource_id: resourceId,
      invited_user_id: recipient.id,
      invited_email: recipient.email.toLowerCase(),
      permission: permission,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: insertData, error: insertError } = await (supabase.from('resource_shares') as any)
      .insert(newShare)
      .select()
      .single()

    if (insertError) {
      return { success: false, error: insertError.message || 'Falha ao registrar convite.' }
    }

    const shareId = insertData?.id

    // Cria notificação interna para o destinatário
    try {
      await (supabase.from('notifications') as any).insert({
        user_id: recipient.id,
        type: 'share_invite',
        title: resourceType === 'activity' ? 'Novo convite de atividade' : 'Novo documento compartilhado',
        content: `${currentUserName || 'Um colega'} convidou você para colaborar em "${resourceTitle}".`,
        resource_type: resourceType,
        resource_id: resourceId,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } catch (notifErr) {
      console.warn('Aviso ao criar notificação de convite:', notifErr)
    }

    return { success: true, shareId }
  } catch (err: any) {
    console.error('Erro ao enviar convite:', err)
    return { success: false, error: err.message || 'Erro inesperado ao compartilhar recurso.' }
  }
}

/**
 * Responde a um convite de compartilhamento (aceitar ou recusar).
 */
export async function respondToShareInvite(
  shareId: string,
  action: 'accept' | 'reject'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error: rpcError } = await (supabase.rpc as any)('respond_to_share_invite', {
      p_share_id: shareId,
      p_action: action,
    })

    if (!rpcError && data) {
      return { success: true }
    }

    // Fallback: update direto
    const newStatus = action === 'accept' ? 'accepted' : 'rejected'
    const { error: updateError } = await (supabase.from('resource_shares') as any)
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shareId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Busca compartilhamentos existentes para um determinado recurso.
 */
export async function fetchResourceShares(resourceId: string): Promise<ResourceShareRecord[]> {
  if (!resourceId) return []

  try {
    const { data, error } = await (supabase.from('resource_shares') as any)
      .select('id, invited_user_id, invited_email, permission, status, created_at')
      .eq('resource_id', resourceId)
      .neq('status', 'revoked')
      .order('created_at', { ascending: false })

    if (error || !data) return []

    return data as ResourceShareRecord[]
  } catch (err) {
    console.error('Erro ao buscar compartilhamentos:', err)
    return []
  }
}

/**
 * Revoga um compartilhamento ativo ou pendente.
 */
export async function revokeResourceShare(shareId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await (supabase.from('resource_shares') as any)
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', shareId)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
