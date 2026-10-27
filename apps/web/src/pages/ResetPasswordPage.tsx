import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { AuthLayout } from './AuthLayout'

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const { resetPassword, updatePassword, isRecoveryMode, setIsRecoveryMode } = useAuth()

  // Estado para solicitação de link
  const [email, setEmail] = useState('')

  // Estado para definição de nova senha (fluxo de recuperação)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Verifica se a URL contém hash de recuperação do Supabase (#access_token=...&type=recovery)
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.hash.includes('type=recovery') ||
        window.location.search.includes('type=recovery'))
    ) {
      setIsRecoveryMode(true)
    }
  }, [setIsRecoveryMode])

  // 1. Enviar link de recuperação para o e-mail
  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email.trim()) {
      setErrorMsg('Por favor, informe seu endereço de e-mail.')
      return
    }

    setLoading(true)
    try {
      const { error } = await resetPassword(email.trim())
      if (error) {
        setErrorMsg(error.message)
      } else {
        setSuccessMsg(
          'Se o e-mail informado estiver cadastrado, você receberá um link seguro com instruções para redefinir sua senha.'
        )
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao solicitar redefinição de senha.')
    } finally {
      setLoading(false)
    }
  }

  // 2. Salvar nova senha
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (newPassword.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem. Verifique a confirmação.')
      return
    }

    setLoading(true)
    try {
      const { error } = await updatePassword(newPassword)
      if (error) {
        setErrorMsg(error.message)
      } else {
        setSuccessMsg('Sua senha foi redefinida com sucesso! Você já pode entrar com a nova senha.')
        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 3000)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao redefinir senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-[0_10px_35px_rgba(240,68,145,0.06)] p-6 sm:p-8">
        <div className="mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center mb-3">
            <KeyRound size={20} />
          </div>
          <h1 className="text-2xl font-black text-[#28232A] tracking-tight">
            {isRecoveryMode ? 'Criar nova senha' : 'Recuperar senha'}
          </h1>
          <p className="text-xs sm:text-sm text-[#827780] font-medium mt-1">
            {isRecoveryMode
              ? 'Digite sua nova senha de acesso abaixo.'
              : 'Informe o e-mail cadastrado para receber as instruções de recuperação.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#FCE8E6] border border-[#D93025]/20 flex items-start gap-2.5 text-xs text-[#D93025] font-semibold">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#EBF7F1] border border-[#36A879]/20 flex items-start gap-2.5 text-xs text-[#36A879] font-semibold">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {isRecoveryMode ? (
          /* Formulário de Redefinição de Nova Senha */
          !successMsg ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                  Nova Senha *
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#827780] hover:text-[#28232A] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                  Confirmar Nova Senha *
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 px-4 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-sm font-bold shadow-[0_4px_16px_rgba(240,68,145,0.3)] hover:shadow-[0_6px_22px_rgba(240,68,145,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
              >
                {loading ? (
                  <span>Salvando nova senha...</span>
                ) : (
                  <>
                    <span>Atualizar Senha</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#F04491] text-white text-xs font-bold shadow-md hover:bg-[#DE3380] transition-all"
              >
                <ArrowLeft size={14} />
                <span>Ir para o Login</span>
              </Link>
            </div>
          )
        ) : (
          /* Formulário de Envio de Link para E-mail */
          !successMsg ? (
            <form onSubmit={handleRequestLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                  E-mail Cadastrado *
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

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 px-4 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-sm font-bold shadow-[0_4px_16px_rgba(240,68,145,0.3)] hover:shadow-[0_6px_22px_rgba(240,68,145,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
              >
                {loading ? (
                  <span>Enviando link...</span>
                ) : (
                  <>
                    <span>Enviar Link de Recuperação</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#F04491] text-white text-xs font-bold shadow-md hover:bg-[#DE3380] transition-all"
              >
                <ArrowLeft size={14} />
                <span>Voltar para o Login</span>
              </Link>
            </div>
          )
        )}

        <div className="mt-6 pt-5 border-t border-[#F6E4EC] text-center text-xs text-[#827780]">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-bold text-[#827780] hover:text-[#F04491] transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Voltar para o login</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
