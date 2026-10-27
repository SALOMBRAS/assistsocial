import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  Mail,
  Phone,
  Building2,
  FileText,
  MessageCircle,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { AuthLayout } from './AuthLayout'

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('')
  const [organization, setOrganization] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [requested, setRequested] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleRequestAccess = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!fullName.trim() || !organization.trim() || !email.trim() || !phone.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (*).')
      return
    }

    // Formata a mensagem para envio pelo WhatsApp
    const message = [
      `*Solicitação de Acesso ao AssistSocial*`,
      `Olá! Gostaria de solicitar a liberação do meu acesso institucional à plataforma AssistSocial.`,
      ``,
      `• *Nome:* ${fullName.trim()}`,
      `• *Órgão / Município:* ${organization.trim()}`,
      `• *E-mail Institucional:* ${email.trim()}`,
      `• *WhatsApp:* ${phone.trim()}`,
      notes.trim() ? `• *Observações:* ${notes.trim()}` : null,
      ``,
      `Aguardo o envio do convite oficial para ativação da minha conta.`,
    ]
      .filter(Boolean)
      .join('\n')

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`

    // Abre a janela do WhatsApp
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    setRequested(true)
  }

  return (
    <AuthLayout>
      <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-[0_10px_35px_rgba(240,68,145,0.06)] p-6 sm:p-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCE5ED] text-[#F04491] text-[11px] font-bold mb-3">
            <ShieldCheck size={14} />
            <span>Acesso Restrito e Institucional</span>
          </div>
          <h1 className="text-2xl font-black text-[#28232A] tracking-tight">
            Solicitar Acesso
          </h1>
          <p className="text-xs sm:text-sm text-[#827780] font-medium mt-1">
            Por sigilo e segurança (LGPD e SUAS), novos cadastros são liberados via convite após solicitação.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#FCE8E6] border border-[#D93025]/20 flex items-start gap-2.5 text-xs text-[#D93025] font-semibold">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {requested ? (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-[#EBF7F1] border border-[#36A879]/20 flex items-start gap-3 text-xs text-[#36A879] font-medium leading-relaxed">
              <CheckCircle2 size={20} className="shrink-0 text-[#36A879] mt-0.5" />
              <div>
                <strong className="block font-bold text-sm text-[#36A879] mb-1">
                  Solicitação Encaminhada!
                </strong>
                Sua mensagem foi gerada e encaminhada via WhatsApp. A administradora global do AssistSocial analisará suas informações e emitirá o convite oficial para o seu e-mail.
              </div>
            </div>

            <p className="text-xs text-[#827780] leading-relaxed text-center">
              Assim que o convite for emitido, você receberá um link seguro para cadastrar sua senha.
            </p>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#F04491] text-white text-xs font-bold shadow-[0_4px_16px_rgba(240,68,145,0.3)] hover:bg-[#DE3380] transition-all"
              >
                <ArrowLeft size={14} />
                <span>Voltar para o Login</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRequestAccess} className="space-y-4">
            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                Nome Completo *
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Dra. Maria Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
                />
              </div>
            </div>

            {/* Órgão ou Entidade */}
            <div>
              <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                Órgão / Município de Atuação *
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
                <input
                  type="text"
                  required
                  placeholder="Ex: CRAS Central / Secretaria de Assistência"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
                />
              </div>
            </div>

            {/* E-mail Institucional */}
            <div>
              <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                E-mail Institucional *
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

            {/* WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                Telefone / WhatsApp *
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
                <input
                  type="tel"
                  required
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-xs font-bold text-[#28232A] mb-1.5 uppercase tracking-wider">
                Finalidade / Observações (Opcional)
              </label>
              <div className="relative">
                <FileText size={16} className="absolute left-3.5 top-3 text-[#827780]" />
                <textarea
                  rows={2}
                  placeholder="Ex: Gestão de prontuários do CRAS e relatórios de acompanhamento familiar."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/60 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20BA5A] text-white text-sm font-bold shadow-[0_4px_16px_rgba(37,211,102,0.35)] hover:shadow-[0_6px_22px_rgba(37,211,102,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
            >
              <MessageCircle size={18} />
              <span>Solicitar Acesso via WhatsApp</span>
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-[#F6E4EC] text-center text-xs text-[#827780]">
          Já possui conta ou convite ativo?{' '}
          <Link
            to="/login"
            className="font-bold text-[#F04491] hover:underline transition-colors"
          >
            Fazer login
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
