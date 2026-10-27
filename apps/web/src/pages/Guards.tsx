import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { HeartHandshake } from 'lucide-react'

export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9FB] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F04491] to-[#F58BB5] flex items-center justify-center text-white shadow-[0_6px_18px_rgba(240,68,145,0.35)] animate-pulse mb-3">
          <HeartHandshake size={24} className="stroke-[2.2]" />
        </div>
        <span className="text-xs font-bold text-[#827780]">Carregando AssistSocial...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export const PublicOnlyRoute: React.FC = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9FB] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F04491] to-[#F58BB5] flex items-center justify-center text-white shadow-[0_6px_18px_rgba(240,68,145,0.35)] animate-pulse mb-3">
          <HeartHandshake size={24} className="stroke-[2.2]" />
        </div>
        <span className="text-xs font-bold text-[#827780]">Carregando...</span>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export const AdminRoute: React.FC = () => {
  const { user, profile, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9FB] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F04491] to-[#F58BB5] flex items-center justify-center text-white shadow-[0_6px_18px_rgba(240,68,145,0.35)] animate-pulse mb-3">
          <HeartHandshake size={24} className="stroke-[2.2]" />
        </div>
        <span className="text-xs font-bold text-[#827780]">Verificando credenciais de administração...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Apenas perfis com role = 'global_admin' autenticados no Supabase têm acesso
  if (!isAdmin || profile?.role !== 'global_admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
