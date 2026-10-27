import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { HeartHandshake } from 'lucide-react'

export const ProtectedRoute: React.FC = () => {
  const { user, profile, loading } = useAuth()

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

  // FASE 3: Se a troca obrigatória de primeiro acesso estiver pendente, bloqueia as áreas privadas
  if (profile?.must_change_password) {
    return <Navigate to="/primeiro-acesso" replace />
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

  // Se a troca obrigatória de primeiro acesso estiver pendente, bloqueia até a área administrativa
  if (profile?.must_change_password) {
    return <Navigate to="/primeiro-acesso" replace />
  }

  // Apenas perfis com role = 'global_admin' autenticados no Supabase têm acesso
  if (!isAdmin || profile?.role !== 'global_admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

/**
 * Guarda de Rota Exclusiva de Primeiro Acesso
 * Permite acesso apenas para usuários autenticados que tenham must_change_password === true.
 * Usuários comuns ou já liberados são redirecionados automaticamente para a home ("/").
 */
export const FirstAccessRoute: React.FC = () => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9FB] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F04491] to-[#F58BB5] flex items-center justify-center text-white shadow-[0_6px_18px_rgba(240,68,145,0.35)] animate-pulse mb-3">
          <HeartHandshake size={24} className="stroke-[2.2]" />
        </div>
        <span className="text-xs font-bold text-[#827780]">Verificando pendências de primeiro acesso...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Se já concluiu a troca de senha obrigatória no servidor, segue para o sistema normal
  if (!profile?.must_change_password) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
