import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Lista de origens autorizadas da aplicação em produção e desenvolvimento
const ALLOWED_ORIGINS = [
  'https://assistsocial-app.vercel.app',
  'https://assistsocial-gestao.vercel.app',
  'https://assistsocial-br.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
]

/**
 * Constrói os cabeçalhos CORS com base na origem da requisição,
 * garantindo compatibilidade com chamadas de produção, preview e preflight.
 */
export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : (origin || '*'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  }
}

/**
 * Gera uma senha temporária criptograficamente segura, com alta entropia.
 * Inclui obrigatoriamente letras maiúsculas, minúsculas, dígitos e símbolos.
 */
export function generateSecureTemporaryPassword(length = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const special = '!@#$%&*_-+'
  const allChars = upper + lower + numbers + special

  const randomBuffer = new Uint32Array(length)
  crypto.getRandomValues(randomBuffer)

  // Garante ao menos um caractere de cada conjunto exigido
  const passwordArr: string[] = [
    upper[randomBuffer[0] % upper.length],
    lower[randomBuffer[1] % lower.length],
    numbers[randomBuffer[2] % numbers.length],
    special[randomBuffer[3] % special.length],
  ]

  // Preenche o restante com caracteres aleatórios do conjunto completo
  for (let i = 4; i < length; i++) {
    passwordArr.push(allChars[randomBuffer[i] % allChars.length])
  }

  // Embaralha o array usando algoritmo de Fisher-Yates com valores criptográficos
  for (let i = passwordArr.length - 1; i > 0; i--) {
    const j = randomBuffer[i] % (i + 1)
    const temp = passwordArr[i]
    passwordArr[i] = passwordArr[j]
    passwordArr[j] = temp
  }

  return passwordArr.join('')
}

/**
 * Normaliza e valida o payload recebido.
 * Suporta interoperabilidade com snake_case e camelCase do frontend.
 */
export function normalizeUserPayload(body: any) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const fullName = typeof body?.full_name === 'string' 
    ? body.full_name.trim() 
    : (typeof body?.fullName === 'string' ? body.fullName.trim() : '')
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : null

  return {
    email,
    fullName,
    phone,
    // O papel é SEMPRE forçado pelo servidor como 'social_worker',
    // neutralizando qualquer tentativa de injeção ou elevação de privilégios.
    role: 'social_worker' as const,
    must_change_password: true as const
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // 1. Tratar preflight CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    })
  }

  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido. Utilize POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta (service role ausente).' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Extrair token de autorização do chamador
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado: Token de autenticação ausente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Validar a sessão do chamador
    const userClient = createClient(supabaseUrl, supabaseAnonKey || '', {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado: Sessão inválida ou expirada.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Verificar no banco de dados se o chamador possui o papel 'global_admin'
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'global_admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado: Apenas a Administradora Global pode cadastrar novos profissionais.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Validar corpo da requisição
    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Corpo da requisição inválido. JSON esperado.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, fullName, phone } = normalizeUserPayload(body)

    if (!email || !email.includes('@') || !email.includes('.')) {
      return new Response(
        JSON.stringify({ error: 'E-mail inválido ou não informado.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!fullName) {
      return new Response(
        JSON.stringify({ error: 'Nome completo é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Gerar senha temporária forte criptograficamente segura
    const temporaryPassword = generateSecureTemporaryPassword(16)

    // 7. Criar o usuário diretamente no Supabase Auth via API administrativa
    // - email_confirm: true garante que o e-mail seja confirmado imediatamente sem envio de e-mail
    // - NÃO utiliza inviteUserByEmail() nem dispara links de ativação por e-mail
    const { data: createdUserData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || '',
        role: 'social_worker',
        must_change_password: true
      }
    })

    if (createError) {
      // Tratar e-mail duplicado
      const isDuplicate = createError.message?.toLowerCase().includes('already') ||
                          createError.message?.toLowerCase().includes('registered') ||
                          createError.message?.toLowerCase().includes('exists')

      return new Response(
        JSON.stringify({
          error: isDuplicate 
            ? 'Este e-mail já está cadastrado no sistema.' 
            : `Falha ao criar usuário no Supabase Auth: ${createError.message}`
        }),
        { status: isDuplicate ? 409 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!createdUserData?.user) {
      return new Response(
        JSON.stringify({ error: 'Falha inesperada ao instanciar usuário no provedor de autenticação.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = createdUserData.user.id

    // 8. Garantir que o perfil institucional seja criado/atualizado em public.profiles
    // com role 'social_worker' e o indicador de troca obrigatória de senha
    const { error: upsertProfileError } = await adminClient
      .from('profiles')
      .upsert({
        id: newUserId,
        full_name: fullName,
        email,
        phone: phone || null,
        role: 'social_worker',
        must_change_password: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (upsertProfileError) {
      // Estratégia de compensação/rollback: remove usuário de auth.users para evitar conta órfã
      await adminClient.auth.admin.deleteUser(newUserId)
      
      return new Response(
        JSON.stringify({
          error: `Falha ao consolidar perfil institucional. Usuário removido para evitar inconsistência: ${upsertProfileError.message}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Registrar ação administrativa em public.audit_logs
    // REGRA DE SEGURANÇA MÁXIMA: NUNCA gravar a senha temporária na auditoria ou nos logs!
    await adminClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'admin.user_created',
      resource_type: 'user',
      resource_id: newUserId,
      details: {
        created_email: email,
        role_assigned: 'social_worker',
        must_change_password: true,
        email_confirmed_administratively: true,
        no_email_sent: true,
        timestamp: new Date().toISOString()
      }
    })

    // 10. Retornar resposta de sucesso com a senha temporária para exibição ÚNICA no frontend
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profissional cadastrado com sucesso. Nenhuma mensagem por e-mail foi disparada.',
        user: {
          id: newUserId,
          email: createdUserData.user.email,
          full_name: fullName,
          role: 'social_worker',
          must_change_password: true
        },
        temporary_password: temporaryPassword
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Erro interno no processamento do cadastro administrativo.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
