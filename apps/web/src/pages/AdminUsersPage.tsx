import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Users,
  UserPlus,
  Mail,
  User,
  Phone,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Search,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import {
  FunctionsHttpError,
  FunctionsFetchError,
  FunctionsRelayError,
} from '@supabase/supabase-js'
import { useAuth, type Profile } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

/**
 * Extrai e formata o erro da Edge Function de forma segura e compreensível,
 * distinguindo erros HTTP, de transporte de rede e de relay, sem expor tokens ou dados sensíveis.
 */
async function parseEdgeFunctionError(error: any): Promise<string> {
  // 1. Erro com resposta HTTP da função ou do gateway (FunctionsHttpError)
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
      return 'A Edge Function "admin-invite-user" está indisponível ou ainda não foi publicada no projeto Supabase (HTTP 404).'
    }

    if (status === 401 || status === 403) {
      return `Sessão expirada ou acesso não autorizado (HTTP ${status}). Apenas a administradora global autenticada pode emitir convites.`
    }

    if (status === 400 || status === 422) {
      return (
        serverMsg ||
        `Dados do convite inválidos. Verifique o formato do e-mail e os campos preenchidos (HTTP ${status}).`
      )
    }

    if (status === 409) {
      return (
        serverMsg ||
        'Este endereço de e-mail já possui um convite pendente ou já está cadastrado no sistema (HTTP 409).'
      )
    }

    if (status && status >= 500) {
      return `Erro interno do servidor ao processar o convite (HTTP ${status}). ${serverMsg}`.trim()
    }

    return serverMsg
      ? `A Edge Function retornou erro (HTTP ${status}): ${serverMsg}`
      : `A Edge Function retornou status HTTP ${status}.`
  }

  // 2. Erro de Relay (falha no roteamento do gateway do Supabase)
  if (error instanceof FunctionsRelayError || error?.name === 'FunctionsRelayError') {
    return 'Falha no gateway do Supabase ao repassar a requisição para a Edge Function (FunctionsRelayError).'
  }

  // 3. Erro de Transporte / Conexão (FunctionsFetchError)
  if (error instanceof FunctionsFetchError || error?.name === 'FunctionsFetchError') {
    return 'Falha de comunicação ou conexão de rede com o endpoint da Edge Function (FunctionsFetchError). Verifique sua conexão com a internet.'
  }

  // 4. Erros genéricos
  return error?.message || 'Falha inesperada ao comunicar com a Edge Function.'
}

export const AdminUsersPage: React.FC = () => {
  const { profile } = useAuth()

  // Lista de perfis
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [search, setSearch] = useState('')

  // Formulário de convite (mantém os nomes visuais para acessibilidade)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Carregar perfis cadastrados do Supabase
  const loadProfiles = async () => {
    setLoadingList(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setProfiles(data as Profile[])
      } else if (error) {
        console.error('Erro ao listar perfis:', error.message)
      }
    } catch (err) {
      console.error('Erro ao conectar ao Supabase:', err)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [])

  // Enviar convite via Edge Function 'admin-invite-user'
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)

    if (!fullName.trim() || !email.trim()) {
      setInviteError('Por favor, preencha o nome completo e o e-mail institucional.')
      return
    }

    setInviting(true)
    try {
      // Contrato estrito da Edge Function: { full_name, email, phone }
      // Não enviamos role do cliente; o papel padrão social_worker é definido de forma segura pelo servidor
      const { data, error } = await supabase.functions.invoke('admin-invite-user', {
        body: {
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
        },
      })

      if (error) {
        const errorMsg = await parseEdgeFunctionError(error)
        setInviteError(errorMsg)
      } else if (data && data.error) {
        setInviteError(`Erro retornado pela função: ${data.error}`)
      } else {
        setInviteSuccess(
          `Convite oficial emitido com sucesso para ${email.trim()}! As instruções de acesso foram enviadas por e-mail.`
        )
        setFullName('')
        setEmail('')
        setPhone('')
        loadProfiles()
      }
    } catch (err: any) {
      const errorMsg = await parseEdgeFunctionError(err)
      setInviteError(errorMsg)
    } finally {
      setInviting(false)
    }
  }

  // Filtragem da lista
  const filteredProfiles = profiles.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.role?.toLowerCase().includes(q)
    )
  })

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case 'global_admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FCE5ED] text-[#F04491] border border-[#F04491]/20">
            <ShieldCheck size={12} />
            Administradora Global
          </span>
        )
      case 'supervisor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
            Supervisora / Coordenação
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EBF7F1] text-[#36A879] border border-[#36A879]/20">
            Assistente Social
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF9FB] text-[#28232A] pb-16 antialiased selection:bg-[#FCE5ED] selection:text-[#F04491]">
      {/* Top Header */}
      <header className="bg-white border-b border-[#F6E4EC] sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl text-[#827780] hover:text-[#28232A] hover:bg-[#FFF9FB] transition-colors cursor-pointer"
              title="Voltar ao Painel Principal"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-[#28232A] tracking-tight">
                  Painel de Administração Global
                </span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-[#FCE5ED] text-[#F04491]">
                  SUAS / CRAS
                </span>
              </div>
              <p className="text-xs text-[#827780] font-medium hidden sm:block">
                Gestão restrita de acessos, convites e controle de papéis institucionais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-[#28232A] block">
                {profile?.full_name || 'Administradora'}
              </span>
              <span className="text-[11px] text-[#F04491] font-semibold">
                Perfil: global_admin
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F04491] to-[#F58BB5] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(240,68,145,0.3)]">
              <ShieldCheck size={20} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Informativo */}
        <div className="bg-gradient-to-r from-white via-white to-[#FCE5ED]/30 rounded-3xl border border-[#F6E4EC] p-6 shadow-[0_4px_20px_rgba(240,68,145,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#28232A]">
                Controle de Acessos Institucionais
              </h2>
              <p className="text-xs sm:text-sm text-[#827780] max-w-2xl mt-0.5 leading-relaxed">
                Por exigência de sigilo e segurança (LGPD e Código de Ética do Assistente Social), o cadastro público foi desativado. Novos profissionais só ingressam no sistema através deste formulário oficial de convite.
              </p>
            </div>
          </div>
        </div>

        {/* Grid: Formulário de Convite + Lista de Profissionais */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Card: Convidar Novo Profissional (Edge Function) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-[#F6E4EC] p-6 shadow-[0_6px_25px_rgba(240,68,145,0.04)]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center">
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#28232A]">
                  Convidar Novo Profissional
                </h3>
                <span className="text-xs text-[#827780]">
                  Via Edge Function <code className="text-[#F04491] font-mono">admin-invite-user</code>
                </span>
              </div>
            </div>

            {inviteError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-[#FCE8E6] border border-[#D93025]/20 flex items-start gap-2.5 text-xs text-[#D93025] font-semibold">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccess && (
              <div className="mb-4 p-3.5 rounded-2xl bg-[#EBF7F1] border border-[#36A879]/20 flex items-start gap-2.5 text-xs text-[#36A879] font-semibold">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maria Aparecida da Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                  E-mail Institucional *
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
                  <input
                    type="email"
                    required
                    placeholder="profissional@orgao.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                  Telefone / WhatsApp (Opcional)
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                  Papel de Acesso
                </label>
                <div className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] flex items-center justify-between">
                  <span className="font-semibold text-[#28232A]">Assistente Social</span>
                  <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#EBF7F1] text-[#36A879] border border-[#36A879]/20">
                    Padrão do Servidor
                  </span>
                </div>
                <p className="text-[11px] text-[#827780] mt-1">
                  Por segurança e conformidade, novos convites recebem automaticamente o papel institucional de Assistente Social definido pelo servidor.
                </p>
              </div>

              <button
                type="submit"
                disabled={inviting}
                className="w-full mt-3 py-3 px-4 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-sm font-bold shadow-[0_4px_16px_rgba(240,68,145,0.3)] hover:shadow-[0_6px_22px_rgba(240,68,145,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
              >
                {inviting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Conectando à Edge Function...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Enviar Convite Oficial</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card: Lista de Profissionais Cadastrados (public.profiles) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#F6E4EC] p-6 shadow-[0_6px_25px_rgba(240,68,145,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#28232A]">
                    Profissionais Registrados
                  </h3>
                  <span className="text-xs text-[#827780]">
                    Total: {profiles.length} conta(s) no Supabase
                  </span>
                </div>
              </div>

              <button
                onClick={loadProfiles}
                title="Atualizar Lista"
                className="p-2 rounded-xl text-[#827780] hover:text-[#28232A] hover:bg-[#FFF9FB] border border-[#F6E4EC] transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <RefreshCw size={14} className={loadingList ? 'animate-spin' : ''} />
                <span>Atualizar</span>
              </button>
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative mb-5">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou papel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
              />
            </div>

            {/* Lista de Registros */}
            {loadingList ? (
              <div className="py-12 flex flex-col items-center justify-center text-[#827780]">
                <RefreshCw size={24} className="animate-spin text-[#F04491] mb-2" />
                <span className="text-xs font-semibold">Carregando lista de profissionais...</span>
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="py-12 text-center text-[#827780] border border-dashed border-[#F6E4EC] rounded-2xl">
                <Users size={32} className="mx-auto text-[#827780]/40 mb-2" />
                <p className="text-xs font-semibold">Nenhum profissional encontrado.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F6E4EC]/60 overflow-hidden">
                {filteredProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FFF9FB] rounded-xl px-2 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#FCE5ED] text-[#F04491] font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-[#F04491]/20">
                        {(p.full_name || 'AS').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="text-xs sm:text-sm font-bold text-[#28232A] block truncate">
                          {p.full_name || 'Sem nome informado'}
                        </span>
                        <span className="text-xs text-[#827780] block truncate">
                          {p.email || 'Sem e-mail'}
                        </span>
                        {p.phone && (
                          <span className="text-[11px] text-[#827780]/80 block">
                            WhatsApp: {p.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {getRoleBadge(p.role)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
