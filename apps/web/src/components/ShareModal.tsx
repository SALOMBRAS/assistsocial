import React, { useState, useEffect } from 'react'
import { X, Share2, Mail, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useModalA11y } from '../hooks/useModalA11y'
import type { ResourceType, SharePermission, ShareStatus } from '../types/supabase'

interface ShareItem {
  id: string
  invited_email: string | null
  permission: SharePermission
  status: ShareStatus
  created_at: string
}

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  resourceType: ResourceType
  resourceId: string
  resourceTitle: string
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceTitle,
}) => {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<SharePermission>('viewer')
  const [shares, setShares] = useState<ShareItem[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: true,
    preventScroll: true,
  })

  const loadShares = async () => {
    if (!resourceId) return
    try {
      const { data, error } = await supabase
        .from('resource_shares')
        .select('id, invited_email, permission, status, created_at')
        .eq('resource_id', resourceId)

      if (!error && data) {
        setShares(data as ShareItem[])
      }
    } catch (err) {
      console.error('Erro ao carregar compartilhamentos:', err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadShares()
      setErrorMsg(null)
      setSuccessMsg(null)
      setEmail('')
    }
  }, [isOpen, resourceId])

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!user) {
      setErrorMsg('Você precisa estar autenticado.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Por favor, informe um endereço de e-mail institucional válido.')
      return
    }

    setLoading(true)
    try {
      const newShare = {
        owner_id: user.id,
        resource_type: resourceType,
        resource_id: resourceId,
        invited_email: email.trim().toLowerCase(),
        permission: permission,
        status: 'pending' as ShareStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await (supabase.from('resource_shares') as any)
        .insert(newShare)
        .select()
        .single()

      if (!error && data) {
        setShares((prev) => [data as ShareItem, ...prev])
        setSuccessMsg(`Convite enviado com sucesso para ${email.trim()}!`)
        setEmail('')
      } else {
        setErrorMsg(error?.message || 'Falha ao registrar convite de compartilhamento.')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro inesperado ao compartilhar recurso.')
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (shareId: string) => {
    try {
      const { error } = await (supabase.from('resource_shares') as any)
        .update({ status: 'revoked', revoked_at: new Date().toISOString() })
        .eq('id', shareId)

      if (!error) {
        setShares((prev) => prev.filter((s) => s.id !== shareId))
        setSuccessMsg('Compartilhamento revogado com sucesso.')
      } else {
        setErrorMsg('Erro ao revogar: ' + error.message)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao revogar compartilhamento.')
    }
  }

  if (!isOpen) return null

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#F6E4EC] overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-6 py-4 sm:py-5 border-b border-[#F6E4EC] flex items-center justify-between bg-gradient-to-r from-[#FFF9FB] to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#EDF2FF] text-[#4B7BFF] flex items-center justify-center shrink-0">
              <Share2 size={18} />
            </div>
            <div className="min-w-0">
              <h2 id="share-modal-title" className="text-base font-bold text-[#28232A]">
                Compartilhar Recurso
              </h2>
              <p className="text-xs text-[#827780] font-medium truncate max-w-xs">
                {resourceTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-[#FCE8E6] border border-[#D93025]/20 flex items-start gap-2 text-xs text-[#D93025]">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-[#EBF7F1] border border-[#36A879]/20 flex items-start gap-2 text-xs text-[#36A879]">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleShare} className="space-y-3">
            <label className="block text-xs font-bold text-[#28232A] uppercase tracking-wider">
              Convidar Assistente Social ou Colega
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
                <input
                  type="email"
                  required
                  placeholder="colega@orgao.gov.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491]"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as SharePermission)}
                  className="px-3 py-2.5 text-xs font-bold bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none"
                >
                  <option value="viewer">Visualizar</option>
                  <option value="commenter">Comentar</option>
                  <option value="editor">Editar</option>
                </select>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2.5 min-h-[44px] bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shrink-0"
                >
                  {loading ? 'Enviando...' : 'Convidar'}
                </button>
              </div>
            </div>
          </form>

          {/* Existing shares */}
          <div>
            <h4 className="text-xs font-bold text-[#28232A] uppercase tracking-wider mb-2.5">
              Compartilhamentos Ativos ({shares.length})
            </h4>

            {shares.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-center text-xs text-[#827780]">
                Nenhum colega possui acesso a este recurso ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="p-3 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-[#28232A] block truncate">
                        {share.invited_email}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#827780]">
                        <span className="capitalize font-semibold text-[#F04491]">
                          {share.permission === 'viewer' && 'Leitura'}
                          {share.permission === 'commenter' && 'Comentários'}
                          {share.permission === 'editor' && 'Edição Completa'}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{share.status}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRevoke(share.id)}
                      title="Revogar acesso"
                      aria-label="Revogar acesso"
                      className="w-10 h-10 flex items-center justify-center text-[#827780] hover:text-[#D93025] hover:bg-[#FCE8E6] rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
