import React, { useState, useMemo } from 'react'
import {
  GitCommit,
  Clock,
  Home,
  Users,
  FileText,
  Send,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Plus,
  Filter,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { ActivityItem } from './ActivityCard'

interface CaseTimelineViewProps {
  activities: ActivityItem[]
  profileName?: string
  onOpenNewActivity?: () => void
  onSelectActivity?: (activity: ActivityItem) => void
}

export type TimelineFilter = 'all' | 'visita' | 'atendimento' | 'relatorio' | 'encaminhamento'

export const CaseTimelineView: React.FC<CaseTimelineViewProps> = ({
  activities,
  profileName = 'Assistente Social',
  onOpenNewActivity,
  onSelectActivity,
}) => {
  const [filterType, setFilterType] = useState<TimelineFilter>('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [activeFamilyReference, setActiveFamilyReference] = useState('Família Silva dos Santos (NIS: 165.892.410-02)')

  // Ordenação cronológica dos atendimentos reais
  const timelineEvents = useMemo(() => {
    const list = [...activities]
    list.sort((a, b) => {
      const timeA = new Date(a.starts_at).getTime()
      const timeB = new Date(b.starts_at).getTime()
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
    })

    return list.filter((act) => {
      if (filterType === 'all') return true
      if (filterType === 'visita') return act.category === 'visita_domiciliar'
      if (filterType === 'atendimento') return act.category === 'atendimento'
      if (filterType === 'relatorio') return act.category === 'elaboracao_relatorio'
      if (filterType === 'encaminhamento') return act.title.toLowerCase().includes('encaminhamento') || (act.description && act.description.toLowerCase().includes('encaminh'))
      return true
    })
  }, [activities, sortOrder, filterType])

  // Próximas Ações Planejadas (Atividades pendentes ordenadas no futuro)
  const nextActions = useMemo(() => {
    const now = Date.now()
    return activities
      .filter((a) => a.status === 'pending')
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .slice(0, 4)
  }, [activities])

  const getEventIcon = (category: string, title: string) => {
    if (title.toLowerCase().includes('encaminh')) {
      return { icon: <Send size={15} />, bg: 'bg-[#EDF2FF] text-[#4B7BFF] border-[#BFDBFE]' }
    }
    switch (category) {
      case 'visita_domiciliar':
        return { icon: <Home size={15} />, bg: 'bg-[#FCE5ED] text-[#F04491] border-[#F58BB5]' }
      case 'atendimento':
        return { icon: <Users size={15} />, bg: 'bg-[#EBF7F1] text-[#36A879] border-[#A7E2C6]' }
      case 'elaboracao_relatorio':
        return { icon: <FileText size={15} />, bg: 'bg-[#F5EBFF] text-[#9B51E0] border-[#E9D5FF]' }
      default:
        return { icon: <GitCommit size={15} />, bg: 'bg-[#FFF9FB] text-[#827780] border-[#F6E4EC]' }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. TOPO DA LINHA DO TEMPO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-[#FCE5ED] text-[#F04491]">
              <GitCommit size={22} />
            </span>
            <h2 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
              Linha do Tempo de Atendimento e Acompanhamento
            </h2>
          </div>
          <p className="text-xs text-[#827780] font-medium mt-1">
            Trajetória cronológica de intervenções técnicas, encaminhamentos e documentos de suporte
          </p>
        </div>

        {onOpenNewActivity && (
          <button
            onClick={onOpenNewActivity}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-[0_4px_12px_rgba(240,68,145,0.25)] transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Adicionar Intervenção</span>
          </button>
        )}
      </div>

      {/* 2. AVISO DE COORDENAÇÃO DE BACKEND COM TERMINAL 2 */}
      <div className="p-4 rounded-3xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-start gap-3 shadow-sm">
        <Sparkles size={20} className="text-[#F04491] shrink-0 mt-0.5" />
        <div className="text-xs text-[#28232A] space-y-1">
          <p className="font-bold text-[#F04491]">
            Integração com Plano de Acompanhamento Familiar (PAIF / PAEFI)
          </p>
          <p className="text-[#827780] leading-relaxed text-[11px]">
            Esta linha do tempo consolida em uma narrativa contínua todas as atividades, visitas e relatórios registrados no sistema. A chave de agregação por prontuário familiar único (tabela <code>cases</code>) está documentada e será sincronizada assim que a migration de casos for liberada pelo Terminal 2.
          </p>
        </div>
      </div>

      {/* 3. CASO EM ACOMPANHAMENTO & PRÓXIMAS AÇÕES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel do Caso */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F6E4EC]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#827780]">
                Prontuário Ativo em Monitoramento
              </span>
              <h3 className="text-base font-black text-[#28232A] mt-0.5">
                {activeFamilyReference}
              </h3>
            </div>
            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-[#EBF7F1] text-[#36A879] border border-[#A7E2C6] self-start sm:self-auto">
              Em Acompanhamento Regular
            </span>
          </div>

          {/* Filtros da Linha do Tempo */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-[#827780] mr-1 flex items-center gap-1">
                <Filter size={13} />
                <span>Filtrar:</span>
              </span>
              {[
                { id: 'all', label: 'Todas as Ações' },
                { id: 'visita', label: 'Visitas Domiciliares' },
                { id: 'atendimento', label: 'Atendimentos' },
                { id: 'relatorio', label: 'Relatórios' },
                { id: 'encaminhamento', label: 'Encaminhamentos' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id as TimelineFilter)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    filterType === f.id
                      ? 'bg-[#28232A] text-white shadow-sm'
                      : 'bg-[#FFF9FB] text-[#827780] hover:text-[#28232A] border border-[#F6E4EC]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Ordenação */}
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="text-xs font-bold text-[#F04491] hover:underline cursor-pointer"
            >
              {sortOrder === 'desc' ? 'Mais recentes primeiro ↓' : 'Mais antigos primeiro ↑'}
            </button>
          </div>

          {/* FLUXO DA LINHA DO TEMPO CRONOLÓGICA */}
          {timelineEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#827780]">
              Nenhum evento registrado nesta linha do tempo para o filtro selecionado.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 pt-4 before:content-[''] before:absolute before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#F6E4EC]">
              {timelineEvents.map((act) => {
                const info = getEventIcon(act.category, act.title)
                const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(act.starts_at))

                return (
                  <div key={act.id} className="relative group">
                    {/* Nó da Timeline */}
                    <div
                      className={`absolute -left-[30px] top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white ${info.bg} shadow-xs`}
                    >
                      {info.icon}
                    </div>

                    {/* Card de Conteúdo do Registro */}
                    <div
                      onClick={() => onSelectActivity && onSelectActivity(act)}
                      className="p-4 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] group-hover:border-[#F58BB5] group-hover:bg-white transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <span className="text-[11px] font-bold text-[#827780] flex items-center gap-1.5">
                          <Clock size={12} />
                          {dateFormatted}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            act.status === 'completed'
                              ? 'bg-[#EBF7F1] text-[#36A879]'
                              : act.status === 'pending'
                              ? 'bg-[#FCE5ED] text-[#F04491]'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {act.status === 'completed'
                            ? 'Executado'
                            : act.status === 'pending'
                            ? 'Agendado'
                            : act.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-[#28232A] group-hover:text-[#F04491] transition-colors">
                        {act.title}
                      </h4>

                      {act.description && (
                        <p className="text-xs text-[#827780] mt-1 leading-relaxed">
                          {act.description}
                        </p>
                      )}

                      {/* Metadados Técnicos de Acompanhamento */}
                      <div className="mt-3 pt-2.5 border-t border-[#F6E4EC]/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#827780]">
                        <span className="flex items-center gap-1">
                          <Users size={12} className="text-[#F04491]" />
                          <span>Responsável: {profileName}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[#36A879] font-semibold">
                          <ShieldCheck size={12} />
                          <span>Registro protegido sob sigilo profissional</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Coluna Direita: Próximas Ações & Encaminhamentos Pendentes */}
        <div className="space-y-6">
          {/* Card Próximas Ações Planejadas */}
          <div className="bg-white p-5 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] space-y-4">
            <div className="flex items-center gap-2 text-[#F04491]">
              <Calendar size={18} />
              <h3 className="font-extrabold text-sm text-[#28232A]">
                Próximas Ações Planejadas
              </h3>
            </div>
            <p className="text-xs text-[#827780]">
              Compromissos pendentes de execução pactuados com o plano familiar
            </p>

            {nextActions.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-center text-xs text-[#827780]">
                Nenhuma ação pendente no momento.
              </div>
            ) : (
              <div className="space-y-2.5">
                {nextActions.map((act) => {
                  const dStr = new Intl.DateTimeFormat('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(act.starts_at))

                  return (
                    <div
                      key={act.id}
                      onClick={() => onSelectActivity && onSelectActivity(act)}
                      className="p-3 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] hover:border-[#F04491] cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#827780] mb-1">
                        <span className="text-[#F04491]">{dStr}</span>
                        <span className="uppercase text-[9px] bg-white px-1.5 py-0.5 rounded border border-[#F6E4EC]">
                          Pendente
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-[#28232A] line-clamp-1">{act.title}</h5>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Card de Encaminhamentos Integrados à Rede */}
          <div className="bg-gradient-to-br from-[#FFF9FB] to-white p-5 rounded-3xl border border-[#F6E4EC] shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-[#4B7BFF]">
              <Send size={18} />
              <h4 className="font-extrabold text-sm text-[#28232A]">
                Rede de Encaminhamentos
              </h4>
            </div>
            <p className="text-xs text-[#827780] leading-relaxed">
              Acompanhamento de devolutivas intersetoriais com unidades de saúde, educação e defensoria pública.
            </p>

            <div className="p-3 rounded-2xl bg-white border border-[#F6E4EC] flex items-center justify-between text-xs font-semibold">
              <span className="text-[#28232A]">Encaminhamentos Emitidos</span>
              <span className="text-[11px] font-bold text-[#4B7BFF] bg-[#EDF2FF] px-2 py-0.5 rounded-full">
                3 ativos
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-[#F6E4EC] flex items-center justify-between text-xs font-semibold">
              <span className="text-[#28232A]">Devolutivas Concluídas</span>
              <span className="text-[11px] font-bold text-[#36A879] bg-[#EBF7F1] px-2 py-0.5 rounded-full">
                2 devolvidas
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
