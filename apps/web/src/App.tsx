import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { FirstAccessPage } from './pages/FirstAccessPage'
import { MainDashboard } from './pages/MainDashboard'
import { ProtectedRoute, PublicOnlyRoute, AdminRoute, FirstAccessRoute } from './pages/Guards'
import { AdminUsersPage } from './pages/AdminUsersPage'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas (acessíveis quando NÃO autenticado) */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
          </Route>

          {/* Recuperação de Senha (acessível publicamente e no callback de recuperação) */}
          <Route path="/recuperar-senha" element={<ResetPasswordPage />} />

          {/* Rota Exclusiva de Primeiro Acesso (Troca Obrigatória de Senha) */}
          <Route element={<FirstAccessRoute />}>
            <Route path="/primeiro-acesso" element={<FirstAccessPage />} />
          </Route>

          {/* Rotas Privadas (acessíveis apenas quando autenticado e sem pendência de troca) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainDashboard />} />
          </Route>

          {/* Rota Administrativa (Acesso restrito e exclusivo para profiles.role = 'global_admin') */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/usuarios" element={<AdminUsersPage />} />
          </Route>

          {/* Fallback de redirecionamento */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
