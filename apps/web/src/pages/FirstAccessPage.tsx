import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  LogOut,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { AuthLayout } from './AuthLayout'
import { validateFirstAccessPassword } from '../services/firstAccessService'

export const FirstAccessPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile, completeFirstAccess, signOut } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isBackendPending, setIsBackendPending] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Validação dinâmica dos requisitos de segurança
  const validation = useMemo(() => {
    return validateFirstAccessPassword(password, confirmation)
  }, [password, confirmation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsBackendPending(false)
    setSuccessMsg(null)

    if (!validation.isValid) {
      setErrorMsg(validation.errors[0] || 'Por favor, cumpra todos os requisitos de segurança da senha.')
      return
    }

    setSubmitting(true)
    try {
      const result = await completeFirstAccess(password, confirmation)

      if (!result.success) {
        setErrorMsg(result.error || 'Não foi possível concluir a troca da senha.')
        setIsBackendPending(Boolean(result.isBackendPending))
      } else {
        setSuccessMsg(result.message || 'Senha definida com sucesso! Liberando acesso...')
        // Redireciona para o painel principal após confirmação do servidor
        setTimeout(() => {
          navigate('/', { replace: true })
        }, 1200)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha inesperada ao registrar a nova senha.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout>
      <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-[0_10px_35px_rgba(240,68,145,0.06)] p-6 sm:p-8">
        {/* Cabeçalho */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FCE5ED] text-[#F04491] text-xs font-bold mb-3">
            <ShieldAlert size={14} />
            <span>Primeiro Acesso Institucional</span>
          </div>
          <h1 className="text-2xl font-black text-[#28232A] tracking-tight">
            Defina sua Senha Definitiva
          </h1>
          <p className="text-xs sm:text-sm text-[#827780] font-medium mt-1">
            Por segurança, sua senha temporária deve ser substituída agora.
          </p>
        </div>

        {/* Identificação da Profissional */}
        <div className="mb-5 p-3.5 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F04491]/10 text-[#F04491] flex items-center justify-center font-bold">
              <UserCheck size={16} />
            </div>
            <div>
              <p className="font-bold text-[#28232A] leading-tight">
                {profile?.full_name || 'Profissional SUAS'}
              </p>
              <p className="text-[11px] text-[#827780]">{user?.email}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#36A879] bg-[#E8F8F0] px-2 py-0.5 rounded-md">
            E-mail Confirmado
          </span>
        </div>

        {/* Mensagem de Erro Real do Servidor */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#FCE8E6] border border-[#D93025]/20 flex items-start gap-2.5 text-xs text-[#D93025] font-semibold leading-relaxed">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span>{errorMsg}</span>
              {isBackendPending && (
                <p className="text-[11px] text-[#A51D24] font-normal">
                  Aviso técnico: O servidor ainda não possui a RPC de confirmação publicada. O acesso normal permanece bloqueado para sua proteção até a aplicação da migração.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Mensagem de Sucesso */}
        {successMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#E8F8F0] border border-[#36A879]/30 flex items-center gap-2.5 text-xs text-[#237050] font-bold">
            <CheckCircle2 size={16} className="shrink-0 text-[#36A879]" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nova Senha */}
          <div>
            <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
              Nova Senha Pessoal *
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Crie uma nova senha forte"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#827780] hover:text-[#28232A] transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirmação da Nova Senha */}
          <div>
            <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
              Confirme a Nova Senha *
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
              <input
                type={showConfirmation ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Repita a nova senha"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmation(!showConfirmation)}
                title={showConfirmation ? 'Ocultar senha' : 'Ver senha'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#827780] hover:text-[#28232A] transition-colors cursor-pointer"
              >
                {showConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Checklist Visual de Requisitos */}
          <div className="p-3.5 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] space-y-2 text-xs">
            <span className="block font-bold text-[#28232A] text-[11px] uppercase tracking-wider">
              Requisitos de Segurança da Senha:
            </span>
            <ul className="space-y-1.5 text-[11px]">
              <li className={`flex items-center gap-2 ${validation.requirements.minLength ? 'text-[#36A879] font-bold' : 'text-[#827780]'}`}>
                <CheckCircle2 size={13} className={validation.requirements.minLength ? 'text-[#36A879]' : 'text-gray-300'} />
                <span>Mínimo de 8 caracteres</span>
              </li>
              <li className={`flex items-center gap-2 ${validation.requirements.hasUpper ? 'text-[#36A879] font-bold' : 'text-[#827780]'}`}>
                <CheckCircle2 size={13} className={validation.requirements.hasUpper ? 'text-[#36A879]' : 'text-gray-300'} />
                <span>Pelo menos uma letra maiúscula (A-Z)</span>
              </li>
              <li className={`flex items-center gap-2 ${validation.requirements.hasLower ? 'text-[#36A879] font-bold' : 'text-[#827780]'}`}>
                <CheckCircle2 size={13} className={validation.requirements.hasLower ? 'text-[#36A879]' : 'text-gray-300'} />
                <span>Pelo menos uma letra minúscula (a-z)</span>
              </li>
              <li className={`flex items-center gap-2 ${validation.requirements.hasNumber ? 'text-[#36A879] font-bold' : 'text-[#827780]'}`}>
                <CheckCircle2 size={13} className={validation.requirements.hasNumber ? 'text-[#36A879]' : 'text-gray-300'} />
                <span>Pelo menos um número (0-9)</span>
              </li>
              <li className={`flex items-center gap-2 ${validation.requirements.hasSymbol ? 'text-[#36A879] font-bold' : 'text-[#827780]'}`}>
                <CheckCircle2 size={13} className={validation.requirements.hasSymbol ? 'text-[#36A879]' : 'text-gray-300'} />
                <span>Pelo menos um caractere especial (!@#$%...)</span>
              </li>
              <li className={`flex items-center gap-2 ${validation.requirements.matchesConfirmation ? 'text-[#36A879] font-bold' : 'text-[#827780]'}`}>
                <CheckCircle2 size={13} className={validation.requirements.matchesConfirmation ? 'text-[#36A879]' : 'text-gray-300'} />
                <span>As duas senhas digitadas conferem</span>
              </li>
            </ul>
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={submitting || !validation.isValid}
            className="w-full mt-3 py-3 px-4 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-sm font-bold shadow-[0_4px_16px_rgba(240,68,145,0.3)] hover:shadow-[0_6px_22px_rgba(240,68,145,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
          >
            {submitting ? (
              <span>Salvando e validando no servidor...</span>
            ) : (
              <>
                <span>Confirmar Nova Senha e Acessar</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Opção de Logout Seguro */}
        <div className="mt-5 pt-4 border-t border-[#F6E4EC] flex items-center justify-center">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#827780] hover:text-[#D93025] transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sair da conta e definir senha mais tarde</span>
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
