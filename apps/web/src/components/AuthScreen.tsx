import React, { useState } from 'react'
import { HeartHandshake, Mail, Lock, User, Phone, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMsg('E-mail ou senha incorretos. Por favor, verifique seus dados.')
          } else {
            setErrorMsg(error.message)
          }
        }
      } else if (mode === 'signup') {
        if (!fullName.trim()) {
          setErrorMsg('Por favor, informe seu nome completo.')
          setLoading(false)
          return
        }
        if (password.length < 6) {
          setErrorMsg('A senha deve ter no mínimo 6 caracteres.')
          setLoading(false)
          return
        }
        const { error } = await signUp(email, password, fullName, phone)
        if (error) {
          setErrorMsg(error.message)
        } else {
          setSuccessMsg('Cadastro realizado com sucesso! Se necessário, confirme seu e-mail para ativar.')
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email)
        if (error) {
          setErrorMsg(error.message)
        } else {
          setSuccessMsg('Enviamos um link de recuperação para seu e-mail cadastrado.')
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocorreu um erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF9FB] flex flex-col justify-center items-center p-4 selection:bg-[#FCE5ED] selection:text-[#F04491]">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 text-center animate-fade-in">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#F04491] to-[#F58BB5] flex items-center justify-center text-white shadow-[0_8px_24px_rgba(240,68,145,0.35)] mb-3">
          <HeartHandshake size={32} className="stroke-[2.2]" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#28232A] tracking-tight">
          Assist<span className="text-[#F04491]">Social</span>
        </h1>
        <p className="text-xs md:text-sm font-medium text-[#827780] mt-1 max-w-xs">
          A plataforma moderna e segura para a rotina e os atendimentos de assistentes sociais
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#F6E4EC] shadow-[0_10px_35px_rgba(240,68,145,0.06)] p-6 md:p-8">
        {/* Tab switchers */}
        <div className="flex rounded-2xl bg-[#FFF9FB] p-1 border border-[#F6E4EC] mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-[#F04491] shadow-sm'
                : 'text-[#827780] hover:text-[#28232A]'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-[#F04491] shadow-sm'
                : 'text-[#827780] hover:text-[#28232A]'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#FCE8E6] border border-[#D93025]/20 flex items-start gap-2.5 text-xs text-[#D93025] font-semibold animate-shake">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#EBF7F1] border border-[#36A879]/20 flex items-start gap-2.5 text-xs text-[#36A879] font-semibold animate-fade-in">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dra. Janaína Lima"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
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
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
              E-mail Profissional *
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
              <input
                type="email"
                required
                placeholder="seu.email@orgao.gov.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#28232A] uppercase tracking-wider">
                  Senha *
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset')
                      setErrorMsg(null)
                      setSuccessMsg(null)
                    }}
                    className="text-[11px] font-bold text-[#F04491] hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-sm font-bold shadow-[0_4px_16px_rgba(240,68,145,0.3)] hover:shadow-[0_6px_22px_rgba(240,68,145,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
          >
            {loading ? (
              <span>Processando...</span>
            ) : (
              <>
                <span>
                  {mode === 'signin' && 'Acessar Sistema'}
                  {mode === 'signup' && 'Cadastrar Profissional'}
                  {mode === 'reset' && 'Enviar Link de Recuperação'}
                </span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {mode === 'reset' && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setErrorMsg(null)
                setSuccessMsg(null)
              }}
              className="text-xs font-bold text-[#827780] hover:text-[#F04491] transition-colors cursor-pointer"
            >
              ← Voltar para o Login
            </button>
          </div>
        )}
      </div>

      {/* Security info */}
      <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#827780]">
        <Sparkles size={14} className="text-[#F04491]" />
        <span>Ambiente seguro em conformidade com RLS do Supabase e LGPD</span>
      </div>
    </div>
  )
}
