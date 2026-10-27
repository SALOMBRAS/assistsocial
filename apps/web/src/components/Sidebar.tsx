import React from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  FileText,
  Users,
  Settings,
  HeartHandshake,
  LogOut,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Building2,
  GitCommit,
} from 'lucide-react'

export type NavTab = 'dashboard' | 'activities' | 'calendar' | 'reports' | 'documents' | 'services' | 'timeline' | 'team' | 'settings'

interface SidebarProps {
  currentTab: NavTab
  onSelectTab: (tab: NavTab) => void
  profileName?: string
  profileEmail?: string
  isAdmin?: boolean
  onLogout?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  profileName,
  profileEmail,
  isAdmin,
  onLogout,
}) => {
  const menuItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Painel Inicial', icon: <LayoutDashboard size={20} /> },
    { id: 'activities', label: 'Atividades', icon: <CalendarCheck size={20} />, badge: '5' },
    { id: 'calendar', label: 'Agenda & Visitas', icon: <Calendar size={20} /> },
    { id: 'timeline', label: 'Linha do Tempo', icon: <GitCommit size={20} /> },
    { id: 'reports', label: 'Relatórios', icon: <FileSpreadsheet size={20} /> },
    { id: 'services', label: 'Diretório de Serviços', icon: <Building2 size={20} /> },
    { id: 'documents', label: 'Pastas & Docs', icon: <FileText size={20} /> },
    { id: 'team', label: 'Compartilhamentos', icon: <Users size={20} /> },
    { id: 'settings', label: 'Configurações', icon: <Settings size={20} /> },
  ]

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#F6E4EC] fixed left-0 top-0 bottom-0 z-30 shadow-[2px_0_12px_rgba(240,68,145,0.03)]">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#F6E4EC]/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F04491] to-[#F58BB5] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(240,68,145,0.3)]">
          <HeartHandshake size={22} className="stroke-[2.2]" />
        </div>
        <div>
          <span className="font-extrabold text-lg text-[#28232A] tracking-tight block">
            Assist<span className="text-[#F04491]">Social</span>
          </span>
          <span className="text-[11px] font-medium text-[#827780] tracking-wide uppercase">
            Gestão & Atendimentos
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-[#827780] uppercase tracking-wider">
          Menu Principal
        </div>
        {menuItems.map((item) => {
          const isActive = currentTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#FCE5ED] text-[#F04491] shadow-sm font-bold'
                  : 'text-[#28232A] hover:bg-[#FFF9FB] hover:text-[#F04491]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-[#F04491]' : 'text-[#827780]'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-[#F04491] text-white'
                      : 'bg-[#FCE5ED] text-[#F04491]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}

        {/* Link para Administração Global (Exibido apenas quando profiles.role = 'global_admin') */}
        {isAdmin && (
          <div className="pt-3 border-t border-[#F6E4EC]/60 mt-3">
            <div className="px-3 pb-2 text-[10px] font-bold text-[#F04491] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={12} />
              <span>Administração Global</span>
            </div>
            <Link
              to="/admin/usuarios"
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 text-[#28232A] hover:bg-[#FFF9FB] hover:text-[#F04491] border border-transparent hover:border-[#F6E4EC]"
            >
              <div className="flex items-center gap-3">
                <span className="text-[#F04491]">
                  <Users size={20} />
                </span>
                <span>Gestão de Usuários</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#FCE5ED] text-[#F04491]">
                Admin
              </span>
            </Link>
          </div>
        )}
      </nav>

      {/* Assistant Card / Pro status */}
      <div className="p-4 m-4 rounded-2xl bg-gradient-to-br from-[#FFF9FB] to-[#FCE5ED]/60 border border-[#F6E4EC]">
        <div className="flex items-center gap-2 text-[#F04491] font-bold text-xs mb-1">
          <Sparkles size={14} />
          <span>Assistente IA Ativo</span>
        </div>
        <p className="text-[11px] text-[#827780] leading-relaxed">
          Geração de relatórios com termos técnicos do SUAS e segurança de dados.
        </p>
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-[#F6E4EC] flex items-center justify-between bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#FCE5ED] text-[#F04491] font-bold flex items-center justify-center text-sm ring-2 ring-[#F04491]/20">
            {(profileName || 'AS').slice(0, 2).toUpperCase()}
          </div>
          <div className="truncate">
            <span className="text-xs font-bold text-[#28232A] block truncate">
              {profileName || 'Assistente Social'}
            </span>
            <span className="text-[10px] text-[#827780] block truncate">
              {profileEmail || 'Profissional Ativo'}
            </span>
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Encerrar Sessão"
          className="text-[#827780] hover:text-[#D93025] p-1.5 rounded-xl hover:bg-[#FCE8E6] transition-colors cursor-pointer"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
