import React, { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'
import type { ActivityItem } from './ActivityCard'

interface CalendarViewProps {
  activities: ActivityItem[]
  onOpenNewActivity: () => void
  onSelectActivity: (activity: ActivityItem) => void
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  activities,
  onOpenNewActivity,
  onSelectActivity,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date())

  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate)
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // Obter dias do mês atual
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days = []
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i))
  }

  // Filtrar atividades do mês
  const activitiesByDay = (day: Date) => {
    const dayStr = day.toISOString().split('T')[0]
    return activities.filter((act) => act.starts_at.startsWith(dayStr))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
            Agenda & Cronograma de Visitas
          </h2>
          <p className="text-xs text-[#827780] font-medium mt-0.5">
            Organização temporal dos atendimentos e estudos sociais
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl bg-white border border-[#F6E4EC] p-1 shadow-sm">
            <button
              onClick={handlePrevMonth}
              title="Mês anterior"
              className="p-1.5 rounded-xl text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-xs font-bold text-[#28232A] min-w-[130px] text-center">
              {capitalizedMonth}
            </span>
            <button
              onClick={handleNextMonth}
              title="Próximo mês"
              className="p-1.5 rounded-xl text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={onOpenNewActivity}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] p-4 md:p-6 overflow-hidden">
        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-[#827780] pb-3 border-b border-[#F6E4EC]">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 gap-1.5 pt-3">
          {days.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="min-h-[85px] md:min-h-[110px] rounded-2xl bg-[#FFF9FB]/50" />
            }

            const dayActivities = activitiesByDay(day)
            const isToday = day.toDateString() === new Date().toDateString()

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[85px] md:min-h-[110px] p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                  isToday
                    ? 'border-[#F04491] bg-[#FFF9FB]'
                    : 'border-[#F6E4EC]/70 hover:border-[#F58BB5]/50 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-[#F04491] text-white' : 'text-[#28232A]'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {dayActivities.length > 0 && (
                    <span className="text-[10px] font-extrabold text-[#F04491] bg-[#FCE5ED] px-1.5 py-0.2 rounded-full">
                      {dayActivities.length}
                    </span>
                  )}
                </div>

                {/* Day events badges */}
                <div className="space-y-1 mt-1 overflow-y-auto max-h-[60px] no-scrollbar">
                  {dayActivities.slice(0, 2).map((act) => (
                    <div
                      key={act.id}
                      onClick={() => onSelectActivity(act)}
                      title={act.title}
                      className="text-[10px] px-1.5 py-0.5 rounded-lg bg-[#FCE5ED] text-[#F04491] font-semibold truncate cursor-pointer hover:bg-[#FAD5E3]"
                    >
                      {act.title}
                    </div>
                  ))}
                  {dayActivities.length > 2 && (
                    <span className="text-[9px] text-[#827780] font-bold block">
                      +{dayActivities.length - 2} mais
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
