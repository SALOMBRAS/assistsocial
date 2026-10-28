import React, { useState } from 'react'
import { useModalA11y } from '../hooks/useModalA11y'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  FileText,
  Wrench,
  Users,
  Settings,
  HeartHandshake,
  LogOut,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Building2,
  GitCommit,
  X,
} from 'lucide-react'

export type NavTab =
  | 'dashboard'
  | 'activities'
  | 'calendar'
  | 'residenciais'
  | 'reports'
  | 'documents'
  | 'tools'
  | 'services'
  | 'timeline'
  | 'team'
  | 'settings'

interface SidebarProps {
  currentTab: NavTab
  onSelectTab: (tab: NavTab) => void
  profileName?: string
  profileEmail?: string
  isAdmin?: boolean
  onLogout?: () => void
  isMobileOpen?: boolean
  onCloseMobile?: () => void
  hiddenTabs?: NavTab[]
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  profileName,
  profileEmail,
  isAdmin,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
  hiddenTabs = [],
}) => {
  // Mobile drawer accessibility hook
  useModalA11y({
    isOpen: isMobileOpen,
    onClose: onCloseMobile || (() => {}),
    closeOnEscape: true,
    preventScroll: true,
  })

  // Desktop hover and keyboard focus state
  const [isHovered, setIsHovered] = useState(false)

  // Menu items: Replacing duplicate 'activities' with official 'documents' (Word DOCX Studio)
  // while preserving fallback for legacy navigation links.
  const menuItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Painel Inicial', icon: <LayoutDashboard size={20} /> },
    { id: 'documents', label: 'Documentos Word', icon: <FileText size={20} />, badge: 'DOCX' },
    { id: 'tools', label: 'Ferramentas PDF', icon: <Wrench size={20} />, badge: 'NOVO' },
    { id: 'calendar', label: 'Agenda & Visitas', icon: <Calendar size={20} /> },
    { id: 'residenciais', label: 'Residenciais', icon: <Building2 size={20} /> },
    { id: 'timeline', label: 'Linha do Tempo', icon: <GitCommit size={20} /> },
    { id: 'reports', label: 'Relatórios', icon: <FileSpreadsheet size={20} /> },
    { id: 'services', label: 'Diretório de Serviços', icon: <Building2 size={20} /> },
    { id: 'team', label: 'Compartilhamentos', icon: <Users size={20} /> },
    { id: 'settings', label: 'Configurações', icon: <Settings size={20} />, badge: hiddenTabs.length > 0 ? `${hiddenTabs.length} ocultas` : undefined },
  ]

  // Legacy fallback support for backward compatibility:
  // id: 'activities' -> mapped internally to dashboard/activities when called
  const visibleMenuItems = menuItems.filter((item) => !hiddenTabs.includes(item.id))

  return (
    <>
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR: Auto-expand on hover & keyboard focus, collapsed by default */}
      {/* Fixed gutter on page prevents layout shift; expands smoothly over content */}
      {/* ========================================================================= */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setIsHovered(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsHovered(false)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsHovered(false)
          }
        }}
        aria-label="Menu principal de navegação"
        aria-expanded={isHovered}
        className={`hidden md:flex flex-col bg-white border-r border-[#F6E4EC] fixed left-0 top-0 bottom-0 z-40 transition-[width,box-shadow] duration-200 ease-in-out motion-reduce:transition-none ${
          isHovered
            ? 'w-64 shadow-[4px_0_24px_rgba(240,68,145,0.12)]'
            : 'w-20 shadow-[2px_0_12px_rgba(240,68,145,0.03)]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-3.5 border-b border-[#F6E4EC]/60 flex items-center overflow-hidden shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F04491] to-[#F58BB5] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(240,68,145,0.3)] shrink-0">
              <HeartHandshake size={22} className="stroke-[2.2]" />
            </div>
            {isHovered && (
              <div className="truncate animate-fade-in">
                <span className="font-extrabold text-base text-[#28232A] tracking-tight block leading-tight">
                  Assist<span className="text-[#F04491]">Social</span>
                </span>
                <span className="text-[10px] font-medium text-[#827780] tracking-wide uppercase block">
                  Gestão & Atendimentos
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2.5 py-3 space-y-1.5 overflow-y-auto no-scrollbar">
          {isHovered ? (
            <div className="px-2 pb-1 text-[10px] font-bold text-[#827780] uppercase tracking-wider animate-fade-in">
              Menu Principal
            </div>
          ) : (
            <div className="h-2" />
          )}

          {visibleMenuItems.map((item) => {
            const isActive = currentTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id)
                  // Optional auto-collapse after click so the page is immediately focused
                  setIsHovered(false)
                }}
                title={!isHovered ? item.label : undefined}
                aria-label={item.label}
                className={`relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#F04491] focus-visible:outline-none ${
                  isHovered
                    ? 'w-full px-3 py-2.5 justify-between'
                    : 'w-11 h-11 mx-auto justify-center'
                } ${
                  isActive
                    ? 'bg-[#FCE5ED] text-[#F04491] shadow-xs font-bold'
                    : 'text-[#28232A] hover:bg-[#FFF9FB] hover:text-[#F04491]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 transition-colors ${
                      isActive ? 'text-[#F04491]' : 'text-[#827780]'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {isHovered && (
                    <span className="truncate whitespace-nowrap animate-fade-in">
                      {item.label}
                    </span>
                  )}
                </div>

                {/* Badge when expanded */}
                {isHovered && item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 animate-fade-in ${
                      isActive ? 'bg-[#F04491] text-white' : 'bg-[#FCE5ED] text-[#F04491]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Micro badge dot when collapsed */}
                {!isHovered && item.badge && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F04491] ring-2 ring-white" />
                )}
              </button>
            )
          })}

          {/* Link para Administração Global */}
          {isAdmin && (
            <div className="pt-2 border-t border-[#F6E4EC]/60 mt-2">
              {isHovered && (
                <div className="px-2 pb-1.5 text-[9px] font-bold text-[#F04491] uppercase tracking-wider flex items-center gap-1.5 animate-fade-in">
                  <ShieldCheck size={12} />
                  <span>Administração Global</span>
                </div>
              )}
              <Link
                to="/admin/usuarios"
                title={!isHovered ? 'Gestão de Usuários (Admin)' : undefined}
                aria-label="Gestão de Usuários (Admin)"
                className={`flex items-center rounded-xl text-xs font-semibold transition-all duration-150 text-[#28232A] hover:bg-[#FFF9FB] hover:text-[#F04491] focus-visible:ring-2 focus-visible:ring-[#F04491] ${
                  isHovered
                    ? 'w-full px-3 py-2.5 justify-between'
                    : 'w-11 h-11 mx-auto justify-center'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[#F04491] shrink-0">
                    <Users size={20} />
                  </span>
                  {isHovered && (
                    <span className="truncate whitespace-nowrap animate-fade-in">
                      Gestão de Usuários
                    </span>
                  )}
                </div>
                {isHovered && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#FCE5ED] text-[#F04491] shrink-0 animate-fade-in">
                    Admin
                  </span>
                )}
              </Link>
            </div>
          )}
        </nav>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-[#F6E4EC] bg-white shrink-0 overflow-hidden">
          {isHovered ? (
            <div className="flex items-center justify-between animate-fade-in gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#FCE5ED] text-[#F04491] font-bold flex items-center justify-center text-xs ring-2 ring-[#F04491]/20 shrink-0">
                  {(profileName || 'AS').slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <span className="text-xs font-bold text-[#28232A] block truncate leading-tight">
                    {profileName || 'Assistente Social'}
                  </span>
                  <span className="text-[10px] text-[#827780] block truncate">
                    {profileEmail || 'Profissional Ativo'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Encerrar Sessão"
                aria-label="Encerrar Sessão"
                className="text-[#827780] hover:text-[#D93025] p-1.5 rounded-xl hover:bg-[#FCE8E6] transition-colors cursor-pointer shrink-0"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div
              className="w-10 h-10 mx-auto rounded-full bg-[#FCE5ED] text-[#F04491] font-bold flex items-center justify-center text-xs ring-2 ring-[#F04491]/20 cursor-default"
              title={`${profileName || 'Assistente Social'} (${profileEmail || 'Profissional'})`}
            >
              {(profileName || 'AS').slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE SLIDE-IN DRAWER: Touch friendly, safe-area-insets, accessible       */}
      {/* ========================================================================= */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal de navegação"
          className="fixed inset-0 z-50 md:hidden flex"
        >
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
          />

          {/* Drawer Sheet */}
          <div className="relative w-[84vw] max-w-xs h-[100dvh] bg-white flex flex-col shadow-2xl z-10 animate-slide-right pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
            {/* Mobile Drawer Header */}
            <div className="p-4 border-b border-[#F6E4EC]/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#F04491] to-[#F58BB5] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(240,68,145,0.3)]">
                  <HeartHandshake size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <span className="font-extrabold text-base text-[#28232A] tracking-tight block">
                    Assist<span className="text-[#F04491]">Social</span>
                  </span>
                  <span className="text-[10px] font-medium text-[#827780] tracking-wide uppercase">
                    Gestão & Atendimentos
                  </span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={onCloseMobile}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:text-[#28232A] hover:bg-[#FCE5ED] cursor-pointer transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <div className="px-3 pb-1 text-[10px] font-semibold text-[#827780] uppercase tracking-wider">
                Menu de Seções
              </div>
              {visibleMenuItems.map((item) => {
                const isActive = currentTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id)
                      onCloseMobile?.()
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer min-h-[40px] ${
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
                          isActive ? 'bg-[#F04491] text-white' : 'bg-[#FCE5ED] text-[#F04491]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}

              {isAdmin && (
                <div className="pt-3 border-t border-[#F6E4EC]/60 mt-3">
                  <div className="px-3 pb-1.5 text-[10px] font-bold text-[#F04491] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={12} />
                    <span>Administração Global</span>
                  </div>
                  <Link
                    to="/admin/usuarios"
                    onClick={onCloseMobile}
                    className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 text-[#28232A] hover:bg-[#FFF9FB] hover:text-[#F04491] border border-transparent hover:border-[#F6E4EC] min-h-[44px]"
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

            {/* Mobile Drawer Footer User Profile */}
            <div className="p-3 border-t border-[#F6E4EC] flex items-center justify-between bg-[#FFF9FB]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#FCE5ED] text-[#F04491] font-bold flex items-center justify-center text-xs ring-2 ring-[#F04491]/20 shrink-0">
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
                type="button"
                onClick={() => {
                  onCloseMobile?.()
                  onLogout?.()
                }}
                aria-label="Encerrar Sessão"
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:text-[#D93025] hover:bg-[#FCE8E6] transition-colors cursor-pointer shrink-0"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
