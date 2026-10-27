import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Tratar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta (service role ausente)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Extrair token de autorização do chamador
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado: Token de autenticação ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Validar a sessão do chamador usando cliente com o JWT fornecido
    const userClient = createClient(supabaseUrl, supabaseAnonKey || '', {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado: Sessão inválida ou expirada' }),
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
        JSON.stringify({ error: 'Acesso negado: Apenas a Administradora Global pode convidar novos profissionais' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Validar dados da requisição
    const { email, fullName, phone } = await req.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'E-mail inválido ou não informado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Enviar convite via Supabase Admin API
    // REGRA DE SEGURANÇA: Novos convidados recebem estritamente o papel 'social_worker'
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email.trim(), {
      data: {
        full_name: (fullName || '').trim(),
        phone: (phone || '').trim(),
        role: 'social_worker'
      }
    })

    if (inviteError) {
      return new Response(
        JSON.stringify({ error: `Falha ao enviar convite: ${inviteError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Registro de auditoria forense
    await adminClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'admin.user_invited',
      resource_type: 'user',
      resource_id: inviteData.user.id,
      details: {
        invited_email: email.trim(),
        role_assigned: 'social_worker',
        timestamp: new Date().toISOString()
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Convite enviado com sucesso!',
        user: {
          id: inviteData.user.id,
          email: inviteData.user.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Erro interno no processamento do convite' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
