import {
  FunctionsHttpError,
  FunctionsFetchError,
  FunctionsRelayError,
} from '@supabase/supabase-js'

export interface AdminCreateUserInput {
  fullName: string
  email: string
  phone?: string | null
}

export interface AdminCreateUserPayload {
  full_name: string
  email: string
  phone: string | null
}

export interface AdminCreateUserResponse {
  success?: boolean
  message?: string
  error?: string
  user?: {
    id: string
    email: string
    full_name: string
    role: string
    must_change_password: boolean
  }
  temporary_password?: string
}

/**
 * Prepara o payload para criação administrativa de profissional.
 * Garante estritamente que NUNCA seja enviado 'role', 'email_confirm' ou outros campos.
 */
export function prepareAdminCreateUserPayload(input: AdminCreateUserInput): AdminCreateUserPayload {
  return {
    full_name: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone && input.phone.trim() ? input.phone.trim() : null,
  }
}

/**
 * Extrai e formata o erro da Edge Function de forma segura e compreensível,
 * distinguindo erros HTTP, de transporte de rede e de relay, sem expor tokens ou dados sensíveis.
 */
export async function parseEdgeFunctionError(error: any): Promise<string> {
  if (error instanceof FunctionsHttpError || error?.name === 'FunctionsHttpError') {
    const response = error.context as Response | undefined
    const status = response?.status
    let serverMsg = ''

    if (response) {
      try {
        const body = await response.clone().json()
        serverMsg = body?.error || body?.message || body?.msg || ''
      } catch {
        try {
          serverMsg = await response.clone().text()
        } catch {}
      }
    }

    if (status === 404) {
      return 'A Edge Function "admin-create-user" está indisponível ou ainda não foi publicada no projeto Supabase (HTTP 404).'
    }

    if (status === 401 || status === 403) {
      return `Sessão expirada ou acesso não autorizado (HTTP ${status}). Apenas a administradora global autenticada pode cadastrar novos profissionais.`
    }

    if (status === 400 || status === 422) {
      return (
        serverMsg ||
        `Dados do cadastro inválidos. Verifique o formato do e-mail e os campos preenchidos (HTTP ${status}).`
      )
    }

    if (status === 409) {
      return (
        serverMsg ||
        'Este endereço de e-mail já está cadastrado no sistema (HTTP 409).'
      )
    }

    if (status && status >= 500) {
      return `Erro interno do servidor ao processar o cadastro administrativo (HTTP ${status}). ${serverMsg}`.trim()
    }

    return serverMsg
      ? `A Edge Function retornou erro (HTTP ${status}): ${serverMsg}`
      : `A Edge Function retornou status HTTP ${status}.`
  }

  if (error instanceof FunctionsRelayError || error?.name === 'FunctionsRelayError') {
    return 'Falha no gateway do Supabase ao repassar a requisição para a Edge Function (FunctionsRelayError).'
  }

  if (error instanceof FunctionsFetchError || error?.name === 'FunctionsFetchError') {
    return 'Falha de comunicação ou conexão de rede com o endpoint da Edge Function (FunctionsFetchError). Verifique sua conexão com a internet.'
  }

  return error?.message || 'Falha inesperada ao comunicar com a Edge Function.'
}

/**
 * Invoca a Edge Function canônica 'admin-create-user' com fallback transparente para 'admin-invite-user' em caso de 404.
 */
export async function callAdminCreateUser(
  client: any,
  payload: AdminCreateUserPayload
): Promise<{ data: AdminCreateUserResponse | null; error: any }> {
  let result = await client.functions.invoke('admin-create-user', {
    body: payload,
  })

  // Se a Edge Function principal retornar 404, aciona a função de compatibilidade 'admin-invite-user'
  if (
    result.error &&
    ((result.error as any).context?.status === 404 ||
      result.error.message?.includes('404'))
  ) {
    result = await client.functions.invoke('admin-invite-user', {
      body: payload,
    })
  }

  return result
}
