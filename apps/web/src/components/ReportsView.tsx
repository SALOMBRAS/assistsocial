import React, { useState, useMemo, useCallback } from 'react'
import {
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  TrendingUp,
  Home,
  Users,
  FileText,
  Briefcase,
  Search,
} from 'lucide-react'
import type { ActivityItem } from './ActivityCard'

interface ReportsViewProps {
  activities: ActivityItem[]
  profileName?: string
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  activities,
  profileName = 'Assistente Social',
}) => {
  // Filtros de Data
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')

  const nowTimestamp = useMemo(() => Date.now(), [])

  // Helper para verificar se está atrasada
  const isOverdue = useCallback((act: ActivityItem) => {
    if (act.status !== 'pending') return false
    return new Date(act.starts_at).getTime() < nowTimestamp
  }, [nowTimestamp])

  // Atalhos de Intervalo de Datas
  const setDatePreset = (preset: 'today' | '7days' | 'this_month' | 'all') => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    if (preset === 'today') {
      setStartDate(todayStr)
      setEndDate(todayStr)
    } else if (preset === '7days') {
      const prior = new Date()
      prior.setDate(today.getDate() - 7)
      setStartDate(prior.toISOString().split('T')[0])
      setEndDate(todayStr)
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setStartDate(firstDay.toISOString().split('T')[0])
      setEndDate(lastDay.toISOString().split('T')[0])
    } else {
      setStartDate('')
      setEndDate('')
    }
  }

  // Filtragem dos dados reais
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // Data Início
      if (startDate) {
        const actDate = act.starts_at.split('T')[0]
        if (actDate < startDate) return false
      }
      // Data Fim
      if (endDate) {
        const actDate = act.starts_at.split('T')[0]
        if (actDate > endDate) return false
      }
      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue') {
          if (!isOverdue(act)) return false
        } else if (act.status !== statusFilter) {
          return false
        }
      }
      // Categoria
      if (categoryFilter !== 'all' && act.category !== categoryFilter) {
        return false
      }
      // Busca por texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchesTitle = act.title.toLowerCase().includes(q)
        const matchesDesc = act.description ? act.description.toLowerCase().includes(q) : false
        if (!matchesTitle && !matchesDesc) return false
      }

      return true
    })
  }, [activities, startDate, endDate, statusFilter, categoryFilter, searchTerm, isOverdue])

  // Contadores e Métricas
  const totalCount = filteredActivities.length
  const completedCount = filteredActivities.filter((a) => a.status === 'completed').length
  const pendingCount = filteredActivities.filter((a) => a.status === 'pending' && !isOverdue(a)).length
  const overdueCount = filteredActivities.filter(isOverdue).length
  const notCompletedCount = filteredActivities.filter((a) => a.status === 'not_completed').length

  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Distribuição por Categoria
  const visitasCount = filteredActivities.filter((a) => a.category === 'visita_domiciliar').length
  const atendimentosCount = filteredActivities.filter((a) => a.category === 'atendimento').length
  const relatoriosCount = filteredActivities.filter((a) => a.category === 'elaboracao_relatorio').length
  const reunioesCount = filteredActivities.filter((a) => a.category === 'reuniao').length

  // Categorias Helpers
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'visita_domiciliar':
        return 'Visita Domiciliar'
      case 'atendimento':
        return 'Atendimento Social'
      case 'elaboracao_relatorio':
        return 'Relatório Técnico'
      case 'reuniao':
        return 'Reunião de Rede'
      default:
        return 'Outros'
    }
  }

  const getStatusBadge = (act: ActivityItem) => {
    if (isOverdue(act)) {
      return { label: 'Atrasada', bg: 'bg-[#FEF1F2] text-[#D93025] border border-[#FCA5A5]' }
    }
    switch (act.status) {
      case 'completed':
        return { label: 'Concluída', bg: 'bg-[#EBF7F1] text-[#36A879] border border-[#A7E2C6]' }
      case 'pending':
        return { label: 'Pendente', bg: 'bg-[#FCE5ED] text-[#F04491] border border-[#F58BB5]/40' }
      case 'not_completed':
        return { label: 'Não Realizada', bg: 'bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]' }
      case 'cancelled':
        return { label: 'Cancelada', bg: 'bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]' }
      case 'rescheduled':
        return { label: 'Reagendada', bg: 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]' }
      default:
        return { label: act.status, bg: 'bg-gray-100 text-gray-700 border' }
    }
  }

  // Exportação CSV com UTF-8 BOM
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Título da Atividade',
      'Categoria',
      'Status',
      'Data de Início',
      'Data de Término',
      'Descrição',
      'Motivo Não Realização',
    ]

    const rows = filteredActivities.map((act) => [
      `"${act.id}"`,
      `"${(act.title || '').replace(/"/g, '""')}"`,
      `"${getCategoryLabel(act.category)}"`,
      `"${isOverdue(act) ? 'Atrasada' : act.status}"`,
      `"${act.starts_at}"`,
      `"${act.ends_at || ''}"`,
      `"${(act.description || '').replace(/"/g, '""')}"`,
      `"${(act.failure_reason || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const fileName = `relatorio-atividades-${new Date().toISOString().split('T')[0]}.csv`
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Impressão com formatação de página
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 animate-fade-in print:m-0 print:p-0">
      {/* 1. CABEÇALHO DO RELATÓRIO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-[#FCE5ED] text-[#F04491]">
              <FileSpreadsheet size={22} />
            </span>
            <h2 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
              Relatório Executivo de Atividades
            </h2>
          </div>
          <p className="text-xs text-[#827780] font-medium mt-1">
            Totais analíticos, monitoramento de prazos e exportação oficial para prestação de contas
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-[#F6E4EC] text-[#28232A] hover:text-[#F04491] hover:border-[#F04491] text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="Baixar arquivo no formato CSV (Excel)"
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-[0_4px_12px_rgba(240,68,145,0.25)] transition-all cursor-pointer"
            title="Imprimir relatório formatado"
          >
            <Printer size={15} />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* CABEÇALHO EXCLUSIVO PARA IMPRESSÃO (PRINT ONLY) */}
      <div className="hidden print:block border-b-2 border-[#28232A] pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-[#28232A] uppercase tracking-wide">
              AssistSocial — Sistema de Gestão Socioassistencial
            </h1>
            <p className="text-xs font-bold text-[#827780]">
              Relatório Individual de Atividades e Atendimentos do Serviço Social
            </p>
          </div>
          <div className="text-right text-[11px] text-[#28232A]">
            <p><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
            <p><strong>Profissional:</strong> {profileName}</p>
          </div>
        </div>
      </div>

      {/* 2. FILTROS POR DATA, STATUS E CATEGORIA */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] space-y-4 print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-[#28232A]">
          <Calendar size={15} className="text-[#F04491]" />
          <span>Filtros do Relatório</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Data Inicial */}
          <div>
            <label className="block text-[11px] font-bold text-[#827780] uppercase mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A] focus:outline-none focus:border-[#F04491]"
            />
          </div>

          {/* Data Final */}
          <div>
            <label className="block text-[11px] font-bold text-[#827780] uppercase mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A] focus:outline-none focus:border-[#F04491]"
            />
          </div>

          {/* Filtro Status */}
          <div>
            <label className="block text-[11px] font-bold text-[#827780] uppercase mb-1">
              Status da Atividade
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A] focus:outline-none focus:border-[#F04491]"
            >
              <option value="all">Todos os Status</option>
              <option value="completed">Concluídas</option>
              <option value="pending">Pendentes</option>
              <option value="overdue">Atrasadas</option>
              <option value="not_completed">Não Realizadas</option>
              <option value="rescheduled">Reagendadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>

          {/* Filtro Categoria */}
          <div>
            <label className="block text-[11px] font-bold text-[#827780] uppercase mb-1">
              Tipologia / Categoria
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A] focus:outline-none focus:border-[#F04491]"
            >
              <option value="all">Todas as Categorias</option>
              <option value="visita_domiciliar">Visita Domiciliar</option>
              <option value="atendimento">Atendimento Social</option>
              <option value="elaboracao_relatorio">Relatório Técnico</option>
              <option value="reuniao">Reunião de Rede</option>
            </select>
          </div>
        </div>

        {/* Atalhos Rápidos de Datas e Campo de Busca */}
        <div className="pt-2 border-t border-[#F6E4EC] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-[#827780] mr-1">Períodos pré-definidos:</span>
            <button
              onClick={() => setDatePreset('today')}
              className="px-2.5 py-1 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] text-[11px] font-bold text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] cursor-pointer"
            >
              Hoje
            </button>
            <button
              onClick={() => setDatePreset('7days')}
              className="px-2.5 py-1 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] text-[11px] font-bold text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] cursor-pointer"
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => setDatePreset('this_month')}
              className="px-2.5 py-1 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] text-[11px] font-bold text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] cursor-pointer"
            >
              Este Mês
            </button>
            <button
              onClick={() => setDatePreset('all')}
              className="px-2.5 py-1 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] text-[11px] font-bold text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] cursor-pointer"
            >
              Limpar Intervalo
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#827780]" />
            <input
              type="text"
              placeholder="Buscar no relatório..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A] focus:outline-none focus:border-[#F04491]"
            />
          </div>
        </div>
      </div>

      {/* 3. TOTAIS E CARDS DE RESUMO VISUAL */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Filtradas */}
        <div className="bg-white p-4 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)]">
          <div className="flex items-center justify-between text-[#827780] mb-2">
            <span className="text-[11px] font-bold uppercase">Total Registros</span>
            <FileSpreadsheet size={16} />
          </div>
          <span className="text-2xl font-black text-[#28232A]">{totalCount}</span>
          <p className="text-[10px] text-[#827780] mt-0.5">atividades no período</p>
        </div>

        {/* Concluídas */}
        <div className="bg-white p-4 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)]">
          <div className="flex items-center justify-between text-[#36A879] mb-2">
            <span className="text-[11px] font-bold uppercase">Concluídas</span>
            <CheckCircle2 size={16} />
          </div>
          <span className="text-2xl font-black text-[#36A879]">{completedCount}</span>
          <p className="text-[10px] text-[#827780] mt-0.5">{completionRate}% taxa de êxito</p>
        </div>

        {/* Pendentes Em Dia */}
        <div className="bg-white p-4 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)]">
          <div className="flex items-center justify-between text-[#F04491] mb-2">
            <span className="text-[11px] font-bold uppercase">Pendentes</span>
            <Clock size={16} />
          </div>
          <span className="text-2xl font-black text-[#F04491]">{pendingCount}</span>
          <p className="text-[10px] text-[#827780] mt-0.5">dentro do cronograma</p>
        </div>

        {/* Atrasadas */}
        <div className={`p-4 rounded-3xl border shadow-[0_2px_12px_rgba(240,68,145,0.03)] ${
          overdueCount > 0 ? 'bg-[#FEF1F2] border-[#FCA5A5]' : 'bg-white border-[#F6E4EC]'
        }`}>
          <div className={`flex items-center justify-between mb-2 ${overdueCount > 0 ? 'text-[#D93025]' : 'text-[#827780]'}`}>
            <span className="text-[11px] font-bold uppercase">Atrasadas</span>
            <AlertTriangle size={16} />
          </div>
          <span className={`text-2xl font-black ${overdueCount > 0 ? 'text-[#D93025]' : 'text-[#28232A]'}`}>
            {overdueCount}
          </span>
          <p className="text-[10px] text-[#827780] mt-0.5">requerem atenção</p>
        </div>

        {/* Não Realizadas */}
        <div className="bg-white p-4 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[#EA580C] mb-2">
            <span className="text-[11px] font-bold uppercase">Não Realizadas</span>
            <XCircle size={16} />
          </div>
          <span className="text-2xl font-black text-[#EA580C]">{notCompletedCount}</span>
          <p className="text-[10px] text-[#827780] mt-0.5">com justificativa</p>
        </div>
      </div>

      {/* 4. DISTRIBUIÇÃO POR CATEGORIA */}
      <div className="bg-white p-5 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[#F04491]" />
            <h3 className="text-sm font-bold text-[#28232A]">Distribuição dos Atendimentos por Tipologia</h3>
          </div>
          <span className="text-xs font-semibold text-[#827780]">
            Total analisado: {totalCount}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FCE5ED] text-[#F04491]">
              <Home size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#827780] block">Visitas</span>
              <span className="text-base font-black text-[#28232A]">{visitasCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#EDF2FF] text-[#4B7BFF]">
              <Users size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#827780] block">Atendimentos</span>
              <span className="text-base font-black text-[#28232A]">{atendimentosCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#F5EBFF] text-[#9B51E0]">
              <FileText size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#827780] block">Relatórios</span>
              <span className="text-base font-black text-[#28232A]">{relatoriosCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FEF8EC] text-[#E59B28]">
              <Briefcase size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#827780] block">Reuniões</span>
              <span className="text-base font-black text-[#28232A]">{reunioesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. TABELA DETALHADA DE ATIVIDADES PARA RELATÓRIO E IMPRESSÃO */}
      <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] overflow-hidden">
        <div className="p-4 md:p-5 border-b border-[#F6E4EC] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#28232A]">Relação Analítica de Atividades</h3>
            <p className="text-[11px] text-[#827780]">Exibindo {filteredActivities.length} registros correspondentes</p>
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#827780]">
            Nenhuma atividade localizada com os filtros especificados.
          </div>
        ) : (
          <>
            {/* Visualização em Lista de Cards no Celular (md:hidden) */}
            <div className="md:hidden divide-y divide-[#F6E4EC] p-3 space-y-3">
              {filteredActivities.map((act) => {
                const badge = getStatusBadge(act)
                const dateStr = new Intl.DateTimeFormat('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(act.starts_at))

                return (
                  <div key={act.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-[#827780]">{dateStr}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#F04491] block">
                        {getCategoryLabel(act.category)}
                      </span>
                      <h4 className="font-bold text-[#28232A] text-sm break-words">{act.title}</h4>
                    </div>
                    {act.description && (
                      <p className="text-[11px] text-[#827780] leading-relaxed break-words">
                        {act.description}
                      </p>
                    )}
                    {act.status === 'not_completed' && act.failure_reason && (
                      <div className="p-2 rounded-xl bg-[#FCE8E6] text-[#D93025] text-[11px] font-semibold">
                        Motivo: {act.failure_reason}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Visualização em Tabela no Desktop (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
              <thead className="bg-[#FFF9FB] text-[#827780] uppercase text-[10px] font-bold border-b border-[#F6E4EC]">
                <tr>
                  <th className="py-3 px-4">Data / Horário</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Título do Caso / Demanda</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Observações / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F6E4EC] font-medium text-[#28232A]">
                {filteredActivities.map((act) => {
                  const badge = getStatusBadge(act)
                  const dateStr = new Intl.DateTimeFormat('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(act.starts_at))

                  return (
                    <tr key={act.id} className="hover:bg-[#FFF9FB]/60 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-[#827780]">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-[#28232A]">
                          {getCategoryLabel(act.category)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#28232A]">
                        {act.title}
                        {act.description && (
                          <span className="block text-[11px] font-normal text-[#827780] truncate max-w-xs mt-0.5">
                            {act.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-[#827780]">
                        {act.failure_reason ? (
                          <span className="text-[#EA580C] italic">Justificativa: {act.failure_reason}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* RODAPÉ EXCLUSIVO PARA IMPRESSÃO (ASSINATURA) */}
      <div className="hidden print:block pt-12 mt-12 border-t border-[#827780] text-center text-xs text-[#28232A]">
        <div className="w-64 mx-auto border-t border-[#28232A] pt-2 mb-1 font-bold">
          {profileName}
        </div>
        <p className="text-[11px] text-[#827780]">Assistente Social Responsável — Registro CRESS</p>
      </div>
    </div>
  )
}
