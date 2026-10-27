import React from 'react'
import { HeartHandshake, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react'

interface AuthLayoutProps {
  children: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#FFF9FB] flex flex-col lg:flex-row antialiased selection:bg-[#FCE5ED] selection:text-[#F04491]">
      {/* Área Esquerda (Desktop) */}
      <div className="lg:w-1/2 bg-gradient-to-br from-[#FFF9FB] via-[#FCE5ED]/40 to-[#FFF9FB] border-b lg:border-b-0 lg:border-r border-[#F6E4EC] p-8 md:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Elementos decorativos sutis em rosa */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-br from-[#F58BB5]/15 to-[#F04491]/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-tl from-[#F04491]/10 to-transparent blur-3xl pointer-events-none" />

        {/* Top: Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F04491] to-[#F58BB5] flex items-center justify-center text-white shadow-[0_6px_18px_rgba(240,68,145,0.35)]">
            <HeartHandshake size={26} className="stroke-[2.2]" />
          </div>
          <div>
            <span className="font-black text-xl text-[#28232A] tracking-tight block">
              Assist<span className="text-[#F04491]">Social</span>
            </span>
            <span className="text-[11px] font-semibold text-[#827780] uppercase tracking-wider">
              Plataforma de Gestão Social
            </span>
          </div>
        </div>

        {/* Center: Hero Message & Quote */}
        <div className="my-10 lg:my-auto max-w-lg relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#F6E4EC] text-[#F04491] text-xs font-bold shadow-sm mb-6">
            <Sparkles size={14} />
            <span>Feito exclusivamente para Assistentes Sociais</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#28232A] tracking-tight leading-snug mb-5">
            Bem-vinda ao seu espaço seguro de acolhimento e trabalho.
          </h2>

          <p className="text-base sm:text-lg text-[#827780] font-normal leading-relaxed italic border-l-3 border-[#F04491] pl-4 py-1 mb-8">
            "Organize sua rotina, cuide dos seus registros e tenha mais tranquilidade no seu dia a dia."
          </p>

          <div className="space-y-3 pt-2">
            {[
              'Prontuários e estudos sociais com sigilo absoluto (LGPD & SUAS)',
              'Gestão de visitas domiciliares, relatórios e prazos judiciais',
              'Compartilhamento ético e controlado entre equipes interdisciplinares',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm text-[#28232A] font-medium">
                <div className="w-5 h-5 rounded-full bg-[#EBF7F1] text-[#36A879] flex items-center justify-center shrink-0">
                  <CheckCircle2 size={13} className="stroke-[2.5]" />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Ethical & Security badge */}
        <div className="relative z-10 pt-6 border-t border-[#F6E4EC]/80 flex items-center gap-2 text-xs text-[#827780] font-semibold">
          <ShieldCheck size={16} className="text-[#36A879]" />
          <span>Proteção por Row Level Security (RLS) e conformidade com o CFESS/CRESS</span>
        </div>
      </div>

      {/* Área Direita: Conteúdo do Formulário */}
      <div className="lg:w-1/2 p-6 sm:p-10 lg:p-16 flex items-center justify-center relative">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
