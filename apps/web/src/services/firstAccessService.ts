/**
 * AssistSocial - First Access & Mandatory Password Change Service
 * 
 * Regras do Contrato:
 * 1. O profissional entra com o e-mail institucional e a senha temporária.
 * 2. O frontend consulta o perfil autenticado e verifica `must_change_password`.
 * 3. Enquanto a troca estiver pendente, bloqueia o acesso e direciona para definir nova senha.
 * 4. A nova senha é atualizada por meio do mecanismo oficial do Supabase Auth.
 * 5. Somente após atualização bem-sucedida, invoca o mecanismo autenticado do servidor (RPC).
 * 6. O acesso normal é liberado somente após confirmação da conclusão no servidor.
 * 7. NUNCA simula sucesso caso a RPC retorne erro ou 404.
 */

export interface PasswordRequirements {
  minLength: boolean
  hasUpper: boolean
  hasLower: boolean
  hasNumber: boolean
  hasSymbol: boolean
  matchesConfirmation: boolean
}

export interface FirstAccessValidationResult {
  isValid: boolean
  requirements: PasswordRequirements
  errors: string[]
}

export interface PasswordChangeResult {
  success: boolean
  step?: 'validation' | 'auth_update' | 'server_confirmation' | 'profile_refresh'
  error?: string
  isBackendPending?: boolean
  message?: string
}

/**
 * Validação rigorosa dos critérios de segurança para a nova senha institucional.
 */
export function validateFirstAccessPassword(
  password: string,
  confirmation: string
): FirstAccessValidationResult {
  const requirements: PasswordRequirements = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
    matchesConfirmation: password.length > 0 && password === confirmation,
  }

  const errors: string[] = []
  if (!requirements.minLength) {
    errors.push('A nova senha deve ter no mínimo 8 caracteres.')
  }
  if (!requirements.hasUpper) {
    errors.push('A nova senha deve conter pelo menos uma letra maiúscula.')
  }
  if (!requirements.hasLower) {
    errors.push('A nova senha deve conter pelo menos uma letra minúscula.')
  }
  if (!requirements.hasNumber) {
    errors.push('A nova senha deve conter pelo menos um número.')
  }
  if (!requirements.hasSymbol) {
    errors.push('A nova senha deve conter pelo menos um caractere especial (!@#$%...).')
  }
  if (!requirements.matchesConfirmation) {
    errors.push('A confirmação da senha não confere com a nova senha digitada.')
  }

  const isValid =
    requirements.minLength &&
    requirements.hasUpper &&
    requirements.hasLower &&
    requirements.hasNumber &&
    requirements.hasSymbol &&
    requirements.matchesConfirmation

  return {
    isValid,
    requirements,
    errors,
  }
}

/**
 * Executa o fluxo oficial e seguro de primeiro acesso no servidor:
 * 1. Atualiza a senha no Supabase Auth via auth.updateUser()
 * 2. Invoca a RPC autenticada mark_first_password_changed (com fallback para complete_first_password_change)
 * 3. Garante que qualquer falha do servidor impeça a liberação do acesso.
 */
export async function executeFirstAccessPasswordChange(
  client: any,
  newPassword: string,
  confirmation: string
): Promise<PasswordChangeResult> {
  // 1. Validação local
  const validation = validateFirstAccessPassword(newPassword, confirmation)
  if (!validation.isValid) {
    return {
      success: false,
      step: 'validation',
      error: validation.errors[0] || 'A nova senha não atende aos critérios de segurança.',
    }
  }

  // 2. Mecanismo oficial de autenticação: auth.updateUser
  try {
    const { error: authError } = await client.auth.updateUser({
      password: newPassword,
    })

    if (authError) {
      return {
        success: false,
        step: 'auth_update',
        error: `Falha ao atualizar senha na autenticação: ${authError.message}`,
      }
    }
  } catch (err: any) {
    return {
      success: false,
      step: 'auth_update',
      error: `Erro de conexão com o serviço de autenticação: ${err?.message || 'Falha de rede.'}`,
    }
  }

  // 3. Mecanismo seguro de conclusão no servidor (RPC mark_first_password_changed)
  try {
    let rpcResult = await client.rpc('mark_first_password_changed')

    // Fallback de compatibilidade caso o backend remoto tenha implementado a RPC alternativa
    if (
      rpcResult.error &&
      (rpcResult.error.code === 'PGRST202' ||
        rpcResult.error.message?.includes('not found') ||
        rpcResult.error.message?.includes('404'))
    ) {
      rpcResult = await client.rpc('complete_first_password_change', {
        p_new_password: newPassword,
      })
    }

    if (rpcResult.error) {
      const isMissingRpc =
        rpcResult.error.code === 'PGRST202' ||
        rpcResult.error.message?.includes('not found') ||
        rpcResult.error.message?.includes('function')

      return {
        success: false,
        step: 'server_confirmation',
        isBackendPending: isMissingRpc,
        error: isMissingRpc
          ? 'A migration de troca de senha (RPC mark_first_password_changed) ainda não foi aplicada no Supabase remoto. Contate o administrador do sistema.'
          : `Falha ao confirmar conclusão da troca no servidor: ${rpcResult.error.message}`,
      }
    }

    const rpcData = rpcResult.data
    return {
      success: true,
      step: 'server_confirmation',
      message:
        rpcData?.message ||
        'Senha alterada com sucesso! O indicador de troca obrigatória foi removido pelo servidor.',
    }
  } catch (err: any) {
    return {
      success: false,
      step: 'server_confirmation',
      error: `Erro inesperado ao invocar confirmação no servidor: ${err?.message || 'Falha de comunicação.'}`,
    }
  }
}
