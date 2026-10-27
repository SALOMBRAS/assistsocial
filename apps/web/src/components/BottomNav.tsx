import React from 'react'
import { LayoutDashboard, CalendarCheck, Calendar, Users, Plus } from 'lucide-react'
import type { NavTab } from './Sidebar'

interface BottomNavProps {
  currentTab: NavTab
  onSelectTab: (tab: NavTab) => void
  onOpenNewActivity: () => void
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewActivity,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-[#F6E4EC] shadow-[0_-4px_20px_rgba(240,68,145,0.06)] px-2 py-1.5 flex items-center justify-around safe-area-pb">
      {/* 1. Painel Inicial */}
      <button
        onClick={() => onSelectTab('dashboard')}
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 cursor-pointer transition-colors ${
          currentTab === 'dashboard' ? 'text-[#F04491]' : 'text-[#827780]'
        }`}
      >
        <LayoutDashboard size={20} className={currentTab === 'dashboard' ? 'stroke-[2.5]' : ''} />
        <span className="text-[10px] font-bold mt-0.5">Início</span>
      </button>

      {/* 2. Atividades */}
      <button
        onClick={() => onSelectTab('activities')}
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 cursor-pointer transition-colors ${
          currentTab === 'activities' ? 'text-[#F04491]' : 'text-[#827780]'
        }`}
      >
        <CalendarCheck size={20} className={currentTab === 'activities' ? 'stroke-[2.5]' : ''} />
        <span className="text-[10px] font-bold mt-0.5">Atividades</span>
      </button>

      {/* Central Highlighted Button: + Nova Atividade */}
      <div className="relative -top-4 flex items-center justify-center">
        <button
          onClick={onOpenNewActivity}
          title="Nova Atividade"
          className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#F04491] to-[#F58BB5] text-white flex items-center justify-center shadow-[0_6px_20px_rgba(240,68,145,0.45)] hover:shadow-[0_8px_25px_rgba(240,68,145,0.55)] active:scale-95 transition-all cursor-pointer border-3 border-white ring-2 ring-[#FCE5ED]"
        >
          <Plus size={24} className="stroke-[3]" />
        </button>
      </div>

      {/* 3. Agenda / Calendário */}
      <button
        onClick={() => onSelectTab('calendar')}
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 cursor-pointer transition-colors ${
          currentTab === 'calendar' ? 'text-[#F04491]' : 'text-[#827780]'
        }`}
      >
        <Calendar size={20} className={currentTab === 'calendar' ? 'stroke-[2.5]' : ''} />
        <span className="text-[10px] font-bold mt-0.5">Agenda</span>
      </button>

      {/* 4. Compartilhamento / Equipe */}
      <button
        onClick={() => onSelectTab('team')}
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 cursor-pointer transition-colors ${
          currentTab === 'team' ? 'text-[#F04491]' : 'text-[#827780]'
        }`}
      >
        <Users size={20} className={currentTab === 'team' ? 'stroke-[2.5]' : ''} />
        <span className="text-[10px] font-bold mt-0.5">Equipe</span>
      </button>
    </nav>
  )
}
