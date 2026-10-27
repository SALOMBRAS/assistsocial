import React from 'react'
import { Users, Home, FileSpreadsheet, CheckCircle, TrendingUp } from 'lucide-react'

interface StatsProps {
  atendimentosCount: number
  visitasCount: number
  relatoriosCount: number
  concluidasCount: number
}

export const StatsCards: React.FC<StatsProps> = ({
  atendimentosCount,
  visitasCount,
  relatoriosCount,
  concluidasCount,
}) => {
  const cards = [
    {
      title: 'Atendimentos Realizados',
      value: atendimentosCount,
      label: 'famílias atendidas',
      icon: <Users size={22} className="text-[#F04491]" />,
      bgIcon: 'bg-[#FCE5ED]',
      trend: '+12% este mês',
    },
    {
      title: 'Visitas Domiciliares',
      value: visitasCount,
      label: 'agendadas / feitas',
      icon: <Home size={22} className="text-[#F04491]" />,
      bgIcon: 'bg-[#FCE5ED]',
      trend: 'Em acompanhamento',
    },
    {
      title: 'Relatórios & Pareceres',
      value: relatoriosCount,
      label: 'documentos técnicos',
      icon: <FileSpreadsheet size={22} className="text-[#F04491]" />,
      bgIcon: 'bg-[#FCE5ED]',
      trend: 'Prazos em dia',
    },
    {
      title: 'Taxa de Conclusão',
      value: concluidasCount,
      label: 'atividades finalizadas',
      icon: <CheckCircle size={22} className="text-[#36A879]" />,
      bgIcon: 'bg-[#EBF7F1]',
      trend: 'Meta superada',
    },
  ]

  return (
    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white p-4 md:p-5 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] hover:shadow-[0_6px_20px_rgba(240,68,145,0.06)] hover:border-[#F58BB5]/50 transition-all group min-w-0 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2 mb-3 min-w-0">
            <span className="text-xs font-semibold text-[#827780] tracking-wide break-words line-clamp-2">
              {card.title}
            </span>
            <div
              className={`w-9 h-9 md:w-10 md:h-10 rounded-2xl ${card.bgIcon} flex items-center justify-center transition-transform group-hover:scale-105 shrink-0`}
            >
              {card.icon}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-[#28232A] tracking-tight">
              {card.value}
            </span>
            <span className="text-[11px] text-[#827780] font-medium hidden sm:inline">
              {card.label}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] md:text-[11px] text-[#36A879] font-bold">
            <TrendingUp size={12} />
            <span>{card.trend}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
