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
  Key,
  Copy,
  Check,
  X,
  Lock,
  MessageCircle,
} from 'lucide-react'
import { useAuth, type Profile } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  prepareAdminCreateUserPayload,
  parseEdgeFunctionError,
  callAdminCreateUser,
} from '../services/adminUserService'

interface CreatedCredentials {
  fullName: string
  email: string
  temporaryPassword: string
  phone?: string | null
}

export const AdminUsersPage: React.FC = () => {
  const { profile } = useAuth()

  // Lista de perfis
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [search, setSearch] = useState('')

  // Formulário de criação administrativa
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Diálogo de uso único para credenciais geradas
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)

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

  // Criação administrativa via Edge Function canônica 'admin-create-user'
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)
    setCreatedCredentials(null)

    if (!fullName.trim() || !email.trim()) {
      setInviteError('Por favor, preencha o nome completo e o e-mail institucional.')
      return
    }

    setInviting(true)
    try {
      const payload = prepareAdminCreateUserPayload({
        fullName,
        email,
        phone,
      })

      // Invoca a Edge Function canônica com fallback automático
      const { data, error } = await callAdminCreateUser(supabase, payload)

      if (error) {
        const errorMsg = await parseEdgeFunctionError(error)
        setInviteError(errorMsg)
      } else if (data && data.error) {
        setInviteError(`Erro retornado pela função: ${data.error}`)
      } else {
        // Sucesso real retornado pelo servidor
        const tempPassword = data?.temporary_password || ''

        if (tempPassword) {
          setCreatedCredentials({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || null,
            temporaryPassword: tempPassword,
          })
          setInviteSuccess(
            `Conta administrativa criada com sucesso para ${email.trim()}! Copie a senha temporária exibida no diálogo abaixo.`
          )
        } else {
          setInviteSuccess(
            `Conta administrativa criada com sucesso para ${email.trim()}!`
          )
        }

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

  // Copiar senha temporária de uso único
  const handleCopyPassword = async () => {
    if (!createdCredentials?.temporaryPassword) return
    try {
      await navigator.clipboard.writeText(createdCredentials.temporaryPassword)
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 2500)
    } catch {
      setCopiedPassword(true)
    }
  }

  // Copiar mensagem completa pronta para canal institucional
  const handleCopyMessage = async () => {
    if (!createdCredentials) return
    const message = `Olá ${createdCredentials.fullName},\n\nSeu acesso profissional ao AssistSocial foi criado com sucesso!\n\n• E-mail institucional: ${createdCredentials.email}\n• Senha temporária: ${createdCredentials.temporaryPassword}\n• Endereço de acesso: https://assistsocial-app.vercel.app/login\n\nNo seu primeiro login, o sistema exigirá a definição de uma nova senha pessoal definitiva.`

    try {
      await navigator.clipboard.writeText(message)
      setCopiedMessage(true)
      setTimeout(() => setCopiedMessage(false), 2500)
    } catch {
      setCopiedMessage(true)
    }
  }

  // Fechar diálogo de uso único e expurgar senha da memória da interface
  const handleCloseCredentialsModal = () => {
    setCreatedCredentials(null)
    setCopiedPassword(false)
    setCopiedMessage(false)
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
                Cadastro administrativo direto sem e-mail e controle de credenciais
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
                Criação Administrativa de Contas Institucionais
              </h2>
              <p className="text-xs sm:text-sm text-[#827780] max-w-2xl mt-0.5 leading-relaxed">
                Por exigência de sigilo e segurança (LGPD e Código de Ética do Assistente Social), o cadastro público foi desativado. Novos profissionais são criados diretamente pela administradora global com senha temporária criptográfica e exigência de troca obrigatória no primeiro acesso.
              </p>
            </div>
          </div>
        </div>

        {/* Grid: Formulário de Cadastro + Lista de Profissionais */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Card: Cadastrar Novo Profissional (Edge Function) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-[#F6E4EC] p-6 shadow-[0_6px_25px_rgba(240,68,145,0.04)]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center">
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#28232A]">
                  Cadastrar Novo Profissional
                </h3>
                <span className="text-xs text-[#827780]">
                  Via Edge Function <code className="text-[#F04491] font-mono">admin-create-user</code>
                </span>
              </div>
            </div>

            {inviteError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-[#FCE8E6] border border-[#D93025]/20 flex items-start gap-2.5 text-xs text-[#D93025] font-semibold">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccess && !createdCredentials && (
              <div className="mb-4 p-3.5 rounded-2xl bg-[#EBF7F1] border border-[#36A879]/20 flex items-start gap-2.5 text-xs text-[#36A879] font-semibold">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
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
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#FFF9FB] rounded-2xl border border-[#F6E4EC] text-xs text-[#827780] space-y-1 leading-relaxed">
                <span className="font-bold text-[#28232A] block">Protocolo de Criação Direta:</span>
                <p>• Papel fixado no servidor: <strong className="text-[#36A879]">Assistente Social (social_worker)</strong>.</p>
                <p>• E-mail confirmado automaticamente sem envio de mensagens externas.</p>
                <p>• Uma senha temporária forte será gerada e exibida na tela seguinte.</p>
              </div>

              <button
                type="submit"
                disabled={inviting}
                className="w-full py-3 px-4 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-[#F04491] to-[#DE3380] hover:from-[#DE3380] hover:to-[#C2256D] active:scale-[0.99] transition-all shadow-[0_4px_16px_rgba(240,68,145,0.35)] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {inviting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Processando Criação no Servidor...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>Criar Conta e Gerar Senha Temporária</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Lista de Profissionais Cadastrados */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#F6E4EC] p-6 shadow-[0_6px_25px_rgba(240,68,145,0.04)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-[#28232A] flex items-center gap-2">
                  <Users size={18} className="text-[#F04491]" />
                  <span>Profissionais Cadastrados</span>
                </h3>
                <p className="text-xs text-[#827780]">
                  {profiles.length} contas registradas na tabela <code className="font-mono text-[#F04491]">public.profiles</code>
                </p>
              </div>

              <button
                onClick={loadProfiles}
                disabled={loadingList}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#F6E4EC] text-xs font-semibold text-[#827780] hover:text-[#28232A] hover:bg-[#FFF9FB] transition-all cursor-pointer self-start sm:self-auto"
                title="Recarregar lista"
              >
                <RefreshCw size={13} className={loadingList ? 'animate-spin' : ''} />
                <span>Atualizar</span>
              </button>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
              <input
                type="text"
                placeholder="Filtrar por nome, e-mail ou papel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-[#FFF9FB] border border-[#F6E4EC] rounded-xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:border-[#F04491] transition-all"
              />
            </div>

            {/* Lista com scroll */}
            <div className="divide-y divide-[#F6E4EC] max-h-[480px] overflow-y-auto no-scrollbar">
              {loadingList ? (
                <div className="py-12 text-center text-xs text-[#827780]">
                  Carregando perfis do Supabase...
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#827780]">
                  Nenhum profissional localizado com os critérios da busca.
                </div>
              ) : (
                filteredProfiles.map((p) => (
                  <div key={p.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#FCE5ED] text-[#F04491] font-black text-xs flex items-center justify-center shrink-0">
                        {(p.full_name || 'AS').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#28232A] block truncate">
                          {p.full_name || 'Profissional'}
                        </span>
                        <span className="text-[11px] text-[#827780] block truncate">
                          {p.email || 'E-mail não informado'}
                          {p.phone ? ` • ${p.phone}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {(p as any).must_change_password && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF8EC] text-[#E59B28] border border-[#FED7AA]">
                          Primeiro Acesso
                        </span>
                      )}
                      {getRoleBadge(p.role)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* DIÁLOGO DE USO ÚNICO PARA EXIBIÇÃO DA SENHA TEMPORÁRIA */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-[#F6E4EC] shadow-2xl space-y-5 animate-scale-up">
            {/* Topo do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F6E4EC]">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-2xl bg-[#FCE5ED] text-[#F04491]">
                  <Key size={22} />
                </span>
                <div>
                  <h3 className="text-base md:text-lg font-black text-[#28232A]">
                    Credenciais Temporárias de Acesso
                  </h3>
                  <p className="text-xs text-[#827780]">
                    Exibição única gerada com segurança pelo servidor
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseCredentialsModal}
                className="p-1 rounded-xl text-[#827780] hover:text-[#28232A] cursor-pointer"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dados do Profissional */}
            <div className="p-4 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#827780] font-bold uppercase text-[10px]">Profissional:</span>
                <span className="font-bold text-[#28232A]">{createdCredentials.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#827780] font-bold uppercase text-[10px]">E-mail de Login:</span>
                <span className="font-mono font-semibold text-[#28232A]">{createdCredentials.email}</span>
              </div>
            </div>

            {/* Senha Temporária com Botão Copiar */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#827780] uppercase tracking-wider">
                Senha Temporária de Primeiro Acesso
              </label>
              <div className="p-3.5 rounded-2xl bg-white border-2 border-[#F04491]/30 flex items-center justify-between gap-3 shadow-sm">
                <span className="font-mono text-base font-black tracking-widest text-[#28232A] select-all">
                  {createdCredentials.temporaryPassword}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    copiedPassword
                      ? 'bg-[#36A879] text-white shadow-sm'
                      : 'bg-[#FCE5ED] text-[#F04491] hover:bg-[#FAD5E3]'
                  }`}
                >
                  {copiedPassword ? (
                    <>
                      <Check size={14} />
                      <span>Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar Senha</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instruções para Canal Seguro */}
            <div className="p-3.5 rounded-2xl bg-[#EDF2FF] border border-[#BFDBFE] text-xs text-[#1E3A8A] space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold">
                <Lock size={14} className="text-[#4B7BFF]" />
                <span>Instrução de Segurança Institucional:</span>
              </div>
              <p className="text-[11px] text-[#3B82F6]">
                Entregue estas credenciais por um canal institucional seguro (WhatsApp verificado, presencialmente ou memorando interno). A profissional será <strong>obrigada a redefinir uma nova senha definitiva</strong> no primeiro acesso antes de entrar no painel.
              </p>
            </div>

            {/* Alerta de Não Retenção */}
            <p className="text-[11px] text-[#827780] italic text-center">
              ⚠️ Esta senha temporária não será exibida novamente e não é mantida em texto puro pelo sistema.
            </p>

            {/* Ações do Modal */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-bold text-[#28232A] hover:text-[#F04491] hover:border-[#F04491] transition-all cursor-pointer"
              >
                <MessageCircle size={15} className="text-[#36A879]" />
                <span>{copiedMessage ? 'Mensagem Copiada!' : 'Copiar Texto para WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={handleCloseCredentialsModal}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#28232A] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer shadow-sm text-center"
              >
                Concluir e Fechar Diálogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
