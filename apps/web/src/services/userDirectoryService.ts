import { supabase } from '../lib/supabaseClient'

export interface DirectoryUser {
  id: string
  full_name: string | null
  email: string
  role: string | null
  avatar_url: string | null
}

/**
 * AssistSocial - User Directory Service
 * Pesquisa segura de usuários registrados no sistema para colaboração e compartilhamento.
 */
export async function searchDirectoryUsers(
  query: string,
  currentUserId: string,
  limit: number = 10
): Promise<DirectoryUser[]> {
  const cleanQuery = query.trim()
  if (cleanQuery.length < 2) return []

  try {
    // 1. Tenta RPC oficial search_users_for_sharing
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
      'search_users_for_sharing',
      {
        p_query: cleanQuery,
        p_limit: limit,
      }
    )

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      return rpcData as DirectoryUser[]
    }

    // 2. Fallback direto consultando tabela public.profiles com filtros
    let profileQuery = (supabase.from('profiles') as any)
      .select('id, full_name, email, role, avatar_url')
      .or(`full_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`)
      .limit(limit)

    if (currentUserId) {
      profileQuery = profileQuery.neq('id', currentUserId)
    }

    const { data, error } = await profileQuery

    if (error) {
      console.warn('Aviso ao consultar profiles para busca:', error.message)
      return []
    }

    return (data as DirectoryUser[]) || []
  } catch (err) {
    console.error('Erro de rede ao pesquisar usuários:', err)
    return []
  }
}
