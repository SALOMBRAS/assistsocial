import React, { useMemo } from 'react'
import { Plus, Search, Bell, CheckCircle2, Menu } from 'lucide-react'

interface HeaderProps {
  onOpenNewActivity: () => void
  searchTerm: string
  onSearchChange: (value: string) => void
  totalActivitiesCount: number
  profileName?: string
  onToggleMobileMenu?: () => void
  unreadNotificationsCount?: number
  onToggleNotifications?: () => void
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
  onToggleMobileMenu,
  unreadNotificationsCount = 0,
  onToggleNotifications,
}) => {
  const formattedDate = useMemo(() => getFormattedDate(), [])

  return (
    <header className="w-full bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-[#F6E4EC] px-4 md:px-8 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Hamburger & Greeting */}
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              type="button"
              aria-label="Abrir menu de navegação"
              onClick={onToggleMobileMenu}
              className="hidden md:hidden w-10 h-10 rounded-2xl border border-[#F6E4EC] bg-white items-center justify-center text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED]/60 cursor-pointer transition-colors shrink-0 shadow-xs"
            >
              <Menu size={20} />
            </button>
          )}
          <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-black text-[#28232A] tracking-tight">
              Olá, {profileName || 'Assistente'}! <span className="inline-block animate-wave">🌸</span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-[#36A879] bg-[#EBF7F1] px-2 py-0.5 rounded-full">
              <CheckCircle2 size={11} />
              Supabase Sincronizado
            </span>
          </div>
          <p className="text-[11px] md:text-xs text-[#827780] font-medium mt-0.5">
            {formattedDate} • Você tem <strong className="text-[#F04491]">{totalActivitiesCount}</strong> atividades registradas
          </p>
        </div>
        </div>

        {/* Right: Search & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 md:w-60">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#827780]"
            />
            <input
              type="text"
              placeholder="Buscar atendimentos..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8.5 pr-3.5 py-1.5 text-xs bg-[#FFF9FB] border border-[#F6E4EC] rounded-xl text-[#28232A] placeholder:text-[#827780]/70 focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491] transition-all"
            />
          </div>

          {/* Quick Notifications Button */}
          <button
            type="button"
            onClick={onToggleNotifications}
            title={unreadNotificationsCount > 0 ? `${unreadNotificationsCount} notificações não lidas` : 'Central de Notificações e Lembretes'}
            aria-label="Abrir central de notificações e lembretes"
            className="p-1.5 md:p-2 rounded-xl border border-[#F6E4EC] text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED]/60 transition-all cursor-pointer relative"
          >
            <Bell size={17} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#F04491] text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in duration-150">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Main Action Button */}
          <button
            onClick={onOpenNewActivity}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-[0_3px_12px_rgba(240,68,145,0.28)] hover:shadow-[0_5px_16px_rgba(240,68,145,0.36)] transition-all cursor-pointer transform active:scale-95"
          >
            <Plus size={16} className="stroke-[2.5]" />
            <span>Nova Atividade</span>
          </button>
        </div>
      </div>
    </header>
  )
}
