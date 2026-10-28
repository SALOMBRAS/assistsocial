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
    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3.5 mb-5 md:mb-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white p-3.5 md:p-4 rounded-2xl border border-[#F6E4EC] shadow-[0_2px_8px_rgba(240,68,145,0.03)] hover:shadow-[0_4px_16px_rgba(240,68,145,0.06)] hover:border-[#F58BB5]/50 transition-all duration-200 group min-w-0 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
            <span className="text-[11px] md:text-xs font-bold text-[#827780] tracking-wide break-words line-clamp-2">
              {card.title}
            </span>
            <div
              className={`w-8 h-8 md:w-9 md:h-9 rounded-xl ${card.bgIcon} flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shrink-0`}
            >
              {card.icon}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
              {card.value}
            </span>
            <span className="text-[10px] md:text-[11px] text-[#827780] font-medium hidden sm:inline">
              {card.label}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] md:text-[11px] text-[#36A879] font-bold">
            <TrendingUp size={11} />
            <span>{card.trend}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
