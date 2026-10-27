import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { AuthLayout } from './AuthLayout'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!email.trim() || !password) {
      setErrorMsg('Por favor, preencha seu e-mail e sua senha.')
      return
    }

    setLoading(true)
    try {
      const { error } = await signIn(email.trim(), password)
      if (error) {
        if (
          error.message.includes('Invalid login credentials') ||
          error.message.includes('invalid_grant')
        ) {
          setErrorMsg('E-mail ou senha incorretos. Por favor, verifique os dados digitados.')
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMsg('Seu endereço de e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada.')
        } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
          setErrorMsg('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.')
        } else {
          setErrorMsg(error.message)
        }
      } else {
        // Redireciona para o painel principal
        navigate('/', { replace: true })
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro inesperado ao realizar login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-[0_10px_35px_rgba(240,68,145,0.06)] p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[#28232A] tracking-tight">
            Bem-vinda de volta!
          </h1>
          <p className="text-xs sm:text-sm text-[#827780] font-medium mt-1">
            Entre na sua conta para continuar.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#FCE8E6] border border-[#D93025]/20 flex items-start gap-2.5 text-xs text-[#D93025] font-semibold animate-shake">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* E-mail */}
          <div>
            <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
              E-mail Profissional *
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="seu.email@orgao.gov.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#28232A] uppercase tracking-wider">
                Senha *
              </label>
              <Link
                to="/recuperar-senha"
                className="text-[11px] font-bold text-[#F04491] hover:underline cursor-pointer"
              >
                Esqueci minha senha
              </Link>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
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

          {/* Lembrar de mim */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-[#F04491] focus:ring-[#F04491] border-[#F6E4EC] cursor-pointer"
            />
            <label htmlFor="remember" className="text-xs text-[#827780] font-medium cursor-pointer">
              Lembrar de mim neste dispositivo
            </label>
          </div>

          {/* Botão Principal Entrar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 px-4 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-sm font-bold shadow-[0_4px_16px_rgba(240,68,145,0.3)] hover:shadow-[0_6px_22px_rgba(240,68,145,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
          >
            {loading ? (
              <span>Entrando na sua conta...</span>
            ) : (
              <>
                <span>Entrar</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 pt-5 border-t border-[#F6E4EC] text-center text-xs text-[#827780]">
          <span>Ainda não tem acesso? </span>
          <Link
            to="/cadastro"
            className="font-bold text-[#F04491] hover:underline cursor-pointer"
          >
            Solicitar convite via WhatsApp
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
