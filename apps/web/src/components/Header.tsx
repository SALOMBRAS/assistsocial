import React, { useMemo } from 'react'
import { Plus, Search, Bell, CheckCircle2 } from 'lucide-react'

interface HeaderProps {
  onOpenNewActivity: () => void
  searchTerm: string
  onSearchChange: (value: string) => void
  totalActivitiesCount: number
  profileName?: string
}

const getFormattedDate = () => {
  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  return today.charAt(0).toUpperCase() + today.slice(1)
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewActivity,
  searchTerm,
  onSearchChange,
  totalActivitiesCount,
  profileName,
}) => {
  const formattedDate = useMemo(() => getFormattedDate(), [])

  return (
    <header className="w-full bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-[#F6E4EC] px-4 md:px-8 py-4 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Greeting & Date */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
              Olá, {profileName || 'Assistente'}! <span className="inline-block animate-wave">🌸</span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-[#36A879] bg-[#EBF7F1] px-2.5 py-0.5 rounded-full">
              <CheckCircle2 size={12} />
              Supabase Sincronizado
            </span>
          </div>
          <p className="text-xs md:text-sm text-[#827780] font-medium mt-0.5">
            {formattedDate} • Você tem <strong className="text-[#F04491]">{totalActivitiesCount}</strong> atividades registradas
          </p>
        </div>

        {/* Right: Search & Action Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]"
            />
            <input
              type="text"
              placeholder="Buscar atendimentos..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] placeholder:text-[#827780]/70 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
            />
          </div>

          {/* Quick Notifications Button */}
          <button
            title="Notificações"
            className="p-2 md:p-2.5 rounded-2xl border border-[#F6E4EC] text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED]/60 transition-all cursor-pointer relative"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F04491]"></span>
          </button>

          {/* Main Action Button */}
          <button
            onClick={onOpenNewActivity}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs md:text-sm font-bold shadow-[0_4px_14px_rgba(240,68,145,0.3)] hover:shadow-[0_6px_20px_rgba(240,68,145,0.4)] transition-all cursor-pointer transform active:scale-95"
          >
            <Plus size={18} className="stroke-[2.5]" />
            <span>Nova Atividade</span>
          </button>
        </div>
      </div>
    </header>
  )
}
