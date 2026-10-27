import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Database } from '../types/supabase'
import {
  executeFirstAccessPasswordChange,
  type PasswordChangeResult,
} from '../services/firstAccessService'

export type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  isAdmin: boolean
  mustChangePassword: boolean
  loading: boolean
  isRecoveryMode: boolean
  setIsRecoveryMode: (val: boolean) => void
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>
  completeFirstAccess: (newPassword: string, confirmation: string) => Promise<PasswordChangeResult>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)

  const fetchProfile = async (userId: string, userEmail?: string | null) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setProfile(data as Profile)
      } else {
        // Se o perfil não existir ainda na tabela profiles, cria o registro básico
        const newProfile = {
          id: userId,
          full_name: userEmail ? userEmail.split('@')[0] : 'Assistente Social',
          email: userEmail || null,
          role: 'social_worker',
          must_change_password: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        await (supabase.from('profiles') as any).upsert(newProfile)
        setProfile(newProfile as Profile)
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err)
    }
  }

  useEffect(() => {
    // Detecta se a URL contém token de recuperação
    if (
      typeof window !== 'undefined' &&
      (window.location.hash.includes('type=recovery') ||
        window.location.search.includes('type=recovery'))
    ) {
      setIsRecoveryMode(true)
    }

    // 1. Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email)
      }
      setLoading(false)
    })

    // 2. Ouvir mudanças no estado de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
      }
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || '',
        },
      },
    })

    if (!error && data.user) {
      const newProfile = {
        id: data.user.id,
        full_name: fullName,
        email: email,
        phone: phone || null,
        role: 'social_worker',
        must_change_password: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      await (supabase.from('profiles') as any).upsert(newProfile)
      setProfile(newProfile as Profile)
    }

    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    setIsRecoveryMode(false)
  }

  const resetPassword = async (email: string) => {
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/recuperar-senha`
      : undefined

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })
    return { error }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (!error) {
      setIsRecoveryMode(false)
    }
    return { error }
  }

  const completeFirstAccess = async (
    newPassword: string,
    confirmation: string
  ): Promise<PasswordChangeResult> => {
    const result = await executeFirstAccessPasswordChange(supabase, newPassword, confirmation)
    if (result.success && user) {
      await fetchProfile(user.id, user.email)
    }
    return result
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email)
    }
  }

  // O privilégio administrativo é concedido estritamente quando profiles.role = 'global_admin'
  // confirmado pelos dados reais do Supabase (sem depender de correspondência direta de e-mail)
  const isAdmin = profile?.role === 'global_admin'

  // Indicador de primeiro acesso obrigatório vindo diretamente da coluna no perfil autenticado
  const mustChangePassword = Boolean(profile?.must_change_password)

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        mustChangePassword,
        loading,
        isRecoveryMode,
        setIsRecoveryMode,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        completeFirstAccess,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
