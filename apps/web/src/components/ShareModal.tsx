import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Share2,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  User,
  Users,
  Loader2,
  Clock,
  Check,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useModalA11y } from '../hooks/useModalA11y'
import type { ResourceType, SharePermission } from '../types/supabase'
import {
  searchDirectoryUsers,
  type DirectoryUser,
} from '../services/userDirectoryService'
import {
  sendShareInvite,
  fetchResourceShares,
  revokeResourceShare,
  type ResourceShareRecord,
} from '../services/shareService'

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
  const { user, profile } = useAuth()
  
  // Pesquisa de usuários
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<DirectoryUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<DirectoryUser[]>([])
  
  // Permissão e envio
  const [permission, setPermission] = useState<SharePermission>('viewer')
  const [shares, setShares] = useState<ResourceShareRecord[]>([])
  const [loadingShares, setLoadingShares] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: true,
    preventScroll: true,
  })

  // Carrega compartilhamentos existentes
  const loadShares = async () => {
    if (!resourceId) return
    setLoadingShares(true)
    try {
      const records = await fetchResourceShares(resourceId)
      setShares(records)
    } finally {
      setLoadingShares(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadShares()
      setErrorMsg(null)
      setSuccessMsg(null)
      setSearchQuery('')
      setSearchResults([])
      setSelectedUsers([])
    }
  }, [isOpen, resourceId])

  // Busca em tempo real com debounce de 250ms
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchDirectoryUsers(trimmed, user?.id || '', 10)
        // Filtra os usuários que já foram selecionados
        const filtered = results.filter(
          (u) => !selectedUsers.some((sel) => sel.id === u.id)
        )
        setSearchResults(filtered)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [searchQuery, selectedUsers, user?.id])

  // Adicionar usuário à lista de selecionados
  const handleSelectUser = (userToSelect: DirectoryUser) => {
    if (selectedUsers.some((u) => u.id === userToSelect.id)) return
    setSelectedUsers((prev) => [...prev, userToSelect])
    setSearchQuery('')
    setSearchResults([])
  }

  // Remover usuário da lista de selecionados antes de enviar
  const handleRemoveSelectedUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  // Enviar convites para os selecionados
  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!user) {
      setErrorMsg('Você precisa estar autenticado para compartilhar.')
      return
    }

    if (selectedUsers.length === 0) {
      setErrorMsg('Pesquise e selecione pelo menos um usuário cadastrado.')
      return
    }

    setIsSubmitting(true)
    let successCount = 0
    const errors: string[] = []

    try {
      for (const recipient of selectedUsers) {
        const res = await sendShareInvite({
          resourceType,
          resourceId,
          resourceTitle,
          recipient,
          permission,
          currentUserId: user.id,
          currentUserName: profile?.full_name || user.email || 'Colega',
        })

        if (res.success) {
          successCount++
        } else if (res.error) {
          errors.push(res.error)
        }
      }

      if (successCount > 0) {
        setSuccessMsg(
          successCount === 1
            ? 'Convite de compartilhamento enviado com sucesso no AssistSocial!'
            : `${successCount} convites de compartilhamento enviados com sucesso!`
        )
        setSelectedUsers([])
        setSearchQuery('')
        await loadShares()
      }

      if (errors.length > 0) {
        setErrorMsg(errors.join(' | '))
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao processar convites.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Revogar compartilhamento existente
  const handleRevokeShare = async (shareId: string) => {
    setErrorMsg(null)
    try {
      const res = await revokeResourceShare(shareId)
      if (res.success) {
        setShares((prev) => prev.filter((s) => s.id !== shareId))
        setSuccessMsg('Compartilhamento revogado com sucesso.')
      } else {
        setErrorMsg(res.error || 'Erro ao revogar compartilhamento.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado.')
    }
  }

  if (!isOpen) return null

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#F6E4EC] overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F6E4EC] flex items-center justify-between bg-gradient-to-r from-[#FFF9FB] to-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center shrink-0">
              <Share2 size={18} />
            </div>
            <div className="min-w-0">
              <h2 id="share-modal-title" className="text-sm sm:text-base font-black text-[#28232A] truncate">
                Compartilhar {resourceType === 'activity' ? 'Atividade' : 'Documento'}
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
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] cursor-pointer transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-[#EBF7F1] border border-[#36A879]/20 flex items-start gap-2 text-xs text-[#36A879] animate-in fade-in">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form com Seletor Pesquisável */}
          <form onSubmit={handleSendInvites} className="space-y-3">
            <label className="block text-xs font-bold text-[#28232A] uppercase tracking-wider">
              Pesquisar Usuário Cadastrado
            </label>

            {/* Campo de Busca */}
            <div className="relative">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
                <input
                  type="text"
                  placeholder="Digite nome ou e-mail institucional..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:ring-2 focus:ring-[#F04491]/30 focus:border-[#F04491]"
                />
                {isSearching && (
                  <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-[#F04491]" />
                )}
              </div>

              {/* Menu Dropdown de Resultados da Busca */}
              {searchQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#F6E4EC] rounded-2xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-[#F6E4EC]">
                  {searchResults.length === 0 && !isSearching ? (
                    <div className="p-4 text-center text-xs text-[#827780]">
                      Nenhum usuário cadastrado encontrado com esse termo.
                    </div>
                  ) : (
                    searchResults.map((usr) => (
                      <button
                        key={usr.id}
                        type="button"
                        onClick={() => handleSelectUser(usr)}
                        className="w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 hover:bg-[#FFF9FB] hover:text-[#F04491] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#FCE5ED] text-[#F04491] flex items-center justify-center font-bold text-xs shrink-0">
                            {usr.full_name ? usr.full_name.charAt(0).toUpperCase() : <User size={14} />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#28232A] block truncate">
                              {usr.full_name || 'Sem nome cadastrado'}
                            </span>
                            <span className="text-[11px] text-[#827780] block truncate">
                              {usr.email}
                            </span>
                          </div>
                        </div>

                        {usr.role && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF9FB] border border-[#F6E4EC] text-[#827780] shrink-0">
                            {usr.role}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Chips de Usuários Selecionados */}
            {selectedUsers.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#827780]">
                  Destinatários selecionados ({selectedUsers.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map((sel) => (
                    <div
                      key={sel.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF9FB] border border-[#F04491]/30 rounded-xl text-xs text-[#28232A]"
                    >
                      <span className="font-bold">{sel.full_name || sel.email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedUser(sel.id)}
                        className="p-0.5 hover:bg-[#FCE5ED] rounded-md text-[#827780] hover:text-[#F04491] transition-colors cursor-pointer"
                        title="Remover"
                        aria-label={`Remover ${sel.full_name || sel.email}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nível de Permissão e Botão de Enviar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#827780] shrink-0">
                  Permissão:
                </label>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as SharePermission)}
                  className="px-3 py-2 text-xs font-bold bg-[#FFF9FB] border border-[#F6E4EC] rounded-xl text-[#28232A] focus:outline-none focus:border-[#F04491]"
                >
                  <option value="viewer">Visualizar</option>
                  <option value="commenter">Comentar</option>
                  <option value="editor">Editar</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || selectedUsers.length === 0}
                className="px-5 py-2.5 min-h-[40px] bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Enviando convite...</span>
                  </>
                ) : (
                  <>
                    <Users size={14} />
                    <span>Enviar Convite{selectedUsers.length > 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Lista de Compartilhamentos Existentes */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-[#28232A] uppercase tracking-wider mb-2.5">
              Compartilhamentos Registrados ({shares.length})
            </h4>

            {loadingShares ? (
              <div className="p-4 text-center text-xs text-[#827780]">
                Carregando acessos...
              </div>
            ) : shares.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-center text-xs text-[#827780]">
                Nenhum colega possui compartilhamento registrado para este recurso ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => {
                  const isPending = share.status === 'pending'
                  const isAccepted = share.status === 'accepted'
                  const isRejected = share.status === 'rejected'

                  return (
                    <div
                      key={share.id}
                      className="p-3 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-[#28232A] block truncate">
                          {share.invited_email}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#827780] flex-wrap">
                          <span className="capitalize font-semibold text-[#F04491]">
                            {share.permission === 'viewer' && 'Leitura'}
                            {share.permission === 'commenter' && 'Comentários'}
                            {share.permission === 'editor' && 'Edição Completa'}
                          </span>
                          <span>•</span>
                          {/* Estado do Convite */}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold">
                              <Clock size={11} />
                              <span>Pendente</span>
                            </span>
                          )}
                          {isAccepted && (
                            <span className="inline-flex items-center gap-1 text-[#36A879] bg-[#EBF7F1] px-2 py-0.5 rounded-md font-bold">
                              <Check size={11} />
                              <span>Aceito</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-md font-bold">
                              <ShieldAlert size={11} />
                              <span>Recusado</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevokeShare(share.id)}
                        title="Revogar acesso"
                        aria-label="Revogar acesso"
                        className="w-9 h-9 flex items-center justify-center text-[#827780] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
