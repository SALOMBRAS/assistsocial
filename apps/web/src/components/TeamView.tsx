import React, { useState, useEffect } from 'react'
import {
  Share2,
  Mail,
  CheckCircle2,
  Trash2,
  Check,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../types/supabase'

export type ResourceShareRow = Database['public']['Tables']['resource_shares']['Row']

export const TeamView: React.FC = () => {
  const { user } = useAuth()
  const [outgoingShares, setOutgoingShares] = useState<ResourceShareRow[]>([])
  const [incomingShares, setIncomingShares] = useState<ResourceShareRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3500)
  }

  const loadShares = async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Enviados por mim
      const { data: outData } = await supabase
        .from('resource_shares')
        .select('*')
        .eq('owner_id', user.id)

      if (outData) setOutgoingShares(outData as ResourceShareRow[])

      // 2. Recebidos por mim (por user.id ou pelo email)
      let inQuery = supabase.from('resource_shares').select('*')
      if (user.email) {
        inQuery = inQuery.or(`invited_user_id.eq.${user.id},invited_email.eq.${user.email.toLowerCase()}`)
      } else {
        inQuery = inQuery.eq('invited_user_id', user.id)
      }
      const { data: inData } = await inQuery

      if (inData) {
        // Exclui compartilhamentos que o próprio usuário enviou para si
        setIncomingShares((inData as ResourceShareRow[]).filter((s) => s.owner_id !== user.id))
      }
    } catch (err) {
      console.error('Erro ao buscar compartilhamentos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShares()
  }, [user])

  // Aceitar convite recebido
  const handleAcceptShare = async (shareId: string) => {
    if (!user) return
    try {
      const { error } = await (supabase.from('resource_shares') as any)
        .update({
          status: 'accepted',
          invited_user_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shareId)

      if (!error) {
        showToast('Convite aceito com sucesso! Agora você tem acesso ao recurso.')
        setIncomingShares((prev) =>
          prev.map((s) => (s.id === shareId ? { ...s, status: 'accepted', invited_user_id: user.id } : s))
        )
      } else {
        showToast('Erro ao aceitar convite: ' + error.message)
      }
    } catch (err: any) {
      showToast('Erro ao aceitar convite: ' + err?.message)
    }
  }

  // Revogar compartilhamento
  const handleRevokeShare = async (shareId: string) => {
    try {
      const { error } = await (supabase.from('resource_shares') as any)
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', shareId)

      if (!error) {
        showToast('Compartilhamento revogado com sucesso.')
        setOutgoingShares((prev) => prev.filter((s) => s.id !== shareId))
      } else {
        showToast('Erro ao revogar: ' + error.message)
      }
    } catch (err: any) {
      showToast('Erro ao revogar: ' + err?.message)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-[#28232A] text-white text-xs font-semibold flex items-center gap-2 shadow-lg">
          <CheckCircle2 size={15} className="text-[#36A879]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
            Equipe & Compartilhamentos
          </h2>
          <p className="text-xs text-[#827780] font-medium mt-0.5">
            Colaboração interdisciplinar ética e controlada via Row Level Security (RLS)
          </p>
        </div>

        <button
          onClick={loadShares}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-[#F6E4EC] text-xs font-bold text-[#827780] hover:text-[#28232A] hover:bg-[#FFF9FB] shadow-sm cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Incoming Invitations */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)]">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#EDF2FF] text-[#4B7BFF] flex items-center justify-center">
            <Mail size={16} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#28232A]">Convites Recebidos</h3>
            <p className="text-[11px] text-[#827780]">Casos e prontuários compartilhados com você por colegas</p>
          </div>
        </div>

        {incomingShares.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-center text-xs text-[#827780]">
            Nenhum convite recebido no momento.
          </div>
        ) : (
          <div className="space-y-2.5">
            {incomingShares.map((share) => (
              <div
                key={share.id}
                className="p-3.5 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold text-[#28232A] block">
                    Recurso: <span className="capitalize">{share.resource_type}</span>
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#827780]">
                    <span className="font-semibold text-[#F04491]">
                      Permissão: {share.permission === 'viewer' ? 'Leitura' : share.permission === 'commenter' ? 'Comentários' : 'Edição'}
                    </span>
                    <span>•</span>
                    <span className="capitalize">Status: {share.status}</span>
                  </div>
                </div>

                {share.status === 'pending' ? (
                  <button
                    onClick={() => handleAcceptShare(share.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#36A879] hover:bg-[#2F9369] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Aceitar Convite</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-[#36A879] bg-[#EBF7F1] px-2.5 py-1 rounded-full">
                    Acesso Ativo
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing Shares */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)]">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center">
            <Share2 size={16} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#28232A]">Compartilhados por Mim</h3>
            <p className="text-[11px] text-[#827780]">Recursos que você compartilhou com outros profissionais</p>
          </div>
        </div>

        {outgoingShares.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-center text-xs text-[#827780]">
            Você ainda não compartilhou nenhum recurso com a equipe.
          </div>
        ) : (
          <div className="space-y-2.5">
            {outgoingShares.map((share) => (
              <div
                key={share.id}
                className="p-3.5 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-[#28232A] block truncate">
                    {share.invited_email || 'Profissional'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#827780]">
                    <span className="capitalize">{share.resource_type}</span>
                    <span>•</span>
                    <span className="font-semibold text-[#F04491]">
                      {share.permission === 'viewer' ? 'Visualização' : share.permission === 'commenter' ? 'Comentários' : 'Edição'}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{share.status}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRevokeShare(share.id)}
                  title="Revogar compartilhamento"
                  className="p-1.5 text-[#827780] hover:text-[#D93025] hover:bg-[#FCE8E6] rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
