import React, { useState, useEffect } from 'react'
import {
  Folder,
  FolderPlus,
  FileText,
  Upload,
  Download,
  Trash2,
  Edit2,
  ChevronRight,
  Share2,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  FileCheck,
} from 'lucide-react'
import { DocumentReviewAssistant } from './DocumentReviewAssistant'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { DeleteConfirmModal } from './ActionModals'
import { ShareModal } from './ShareModal'

export interface FolderItem {
  id: string
  name: string
  parent_folder_id: string | null
  owner_id: string
  created_at: string
}

export interface DocumentItem {
  id: string
  folder_id: string | null
  original_name: string
  display_name: string
  storage_path: string
  mime_type: string
  file_size: number
  ai_analysis_status: string
  owner_id: string
  created_at: string
}

export const DocumentsView: React.FC = () => {
  const { user } = useAuth()
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Raiz' },
  ])

  const [folders, setFolders] = useState<FolderItem[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // New Folder modal
  const [newFolderName, setNewFolderName] = useState('')
  const [showFolderModal, setShowFolderModal] = useState(false)

  // Rename modal
  const [renameTarget, setRenameTarget] = useState<{ type: 'folder' | 'document'; id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'document'; id: string; name: string; storage_path?: string } | null>(null)

  // Share modal
  const [shareTarget, setShareTarget] = useState<{ type: 'folder' | 'document'; id: string; name: string } | null>(null)

  // Document Review state
  const [reviewTarget, setReviewTarget] = useState<DocumentItem | null>(null)
  const [documentFilter, setDocumentFilter] = useState<'all' | 'pending' | 'reviewed'>('all')

  const handleSaveReview = async (docId: string, isCompleted: boolean) => {
    const newStatus = isCompleted ? 'completed' : 'pending'
    try {
      await (supabase.from('documents') as any)
        .update({ ai_analysis_status: newStatus })
        .eq('id', docId)

      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, ai_analysis_status: newStatus } : d))
      )
      showToast(
        isCompleted
          ? 'Conferência técnica do documento concluída com sucesso! 📄'
          : 'Rascunho de conferência salvo localmente.'
      )
    } catch (err) {
      console.error('Erro ao atualizar status de revisão:', err)
      showToast('Erro ao atualizar status no banco.', true)
    }
  }

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(null), 4000)
    } else {
      setSuccessMsg(msg)
      setTimeout(() => setSuccessMsg(null), 4000)
    }
  }

  // Fetch folders and documents
  const loadContent = async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Fetch folders
      let folderQuery = supabase.from('folders').select('*')
      if (currentFolderId) {
        folderQuery = folderQuery.eq('parent_folder_id', currentFolderId)
      } else {
        folderQuery = folderQuery.is('parent_folder_id', null)
      }
      const { data: fData, error: fError } = await folderQuery

      if (!fError && fData) {
        setFolders(fData as FolderItem[])
      }

      // 2. Fetch documents
      let docQuery = supabase.from('documents').select('*')
      if (currentFolderId) {
        docQuery = docQuery.eq('folder_id', currentFolderId)
      } else {
        docQuery = docQuery.is('folder_id', null)
      }
      const { data: dData, error: dError } = await docQuery

      if (!dError && dData) {
        setDocuments(dData as DocumentItem[])
      }
    } catch (err: any) {
      console.error('Erro ao carregar documentos:', err)
      showToast('Erro ao carregar conteúdo do armazenamento.', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContent()
  }, [currentFolderId, user])

  // Navigate into folder
  const handleOpenFolder = (folder: FolderItem) => {
    setCurrentFolderId(folder.id)
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }])
  }

  // Navigate via breadcrumb
  const handleBreadcrumbClick = (index: number) => {
    const target = folderPath[index]
    setCurrentFolderId(target.id)
    setFolderPath((prev) => prev.slice(0, index + 1))
  }

  // Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim() || !user) return

    try {
      const newFolder = {
        name: newFolderName.trim(),
        owner_id: user.id,
        parent_folder_id: currentFolderId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await (supabase.from('folders') as any)
        .insert(newFolder)
        .select()
        .single()

      if (error) {
        showToast('Erro ao criar pasta: ' + error.message, true)
      } else {
        showToast('Pasta criada com sucesso! 📁')
        setFolders((prev) => [...prev, data])
        setNewFolderName('')
        setShowFolderModal(false)
      }
    } catch (err: any) {
      showToast(err?.message || 'Erro inesperado ao criar pasta.', true)
    }
  }

  // Upload file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !user) return

    const file = files[0]
    setUploading(true)

    try {
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${user.id}/${timestamp}_${sanitizedName}`

      // 1. Upload to Supabase Storage bucket 'documents'
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        showToast('Erro no envio ao Supabase Storage: ' + uploadError.message, true)
        setUploading(false)
        return
      }

      // 2. Register metadata in public.documents
      const docRecord = {
        owner_id: user.id,
        folder_id: currentFolderId,
        original_name: file.name,
        display_name: file.name,
        storage_path: storagePath,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        ai_analysis_status: 'not_requested',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: dbData, error: dbError } = await (supabase.from('documents') as any)
        .insert(docRecord)
        .select()
        .single()

      if (dbError) {
        showToast('Arquivo enviado ao storage, mas falhou ao gravar no banco: ' + dbError.message, true)
      } else {
        showToast('Documento anexado com sucesso! 📄')
        setDocuments((prev) => [dbData, ...prev])
      }
    } catch (err: any) {
      showToast(err?.message || 'Falha no upload do documento.', true)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // Download / View file via temporary signed URL
  const handleDownload = async (doc: DocumentItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 300) // 5 minutes validity

      if (error || !data) {
        showToast('Não foi possível gerar link assinado seguro: ' + (error?.message || ''), true)
        return
      }

      window.open(data.signedUrl, '_blank')
    } catch (err: any) {
      showToast('Erro ao abrir documento: ' + err?.message, true)
    }
  }

  // Rename item
  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renameTarget || !renameValue.trim()) return

    try {
      if (renameTarget.type === 'folder') {
        const { error } = await (supabase.from('folders') as any)
          .update({ name: renameValue.trim(), updated_at: new Date().toISOString() })
          .eq('id', renameTarget.id)

        if (!error) {
          setFolders((prev) =>
            prev.map((f) => (f.id === renameTarget.id ? { ...f, name: renameValue.trim() } : f))
          )
          showToast('Pasta renomeada com sucesso.')
        } else {
          showToast('Erro ao renomear pasta: ' + error.message, true)
        }
      } else {
        const { error } = await (supabase.from('documents') as any)
          .update({ display_name: renameValue.trim(), updated_at: new Date().toISOString() })
          .eq('id', renameTarget.id)

        if (!error) {
          setDocuments((prev) =>
            prev.map((d) => (d.id === renameTarget.id ? { ...d, display_name: renameValue.trim() } : d))
          )
          showToast('Documento renomeado com sucesso.')
        } else {
          showToast('Erro ao renomear documento: ' + error.message, true)
        }
      }
    } catch (err: any) {
      showToast('Erro ao renomear: ' + err?.message, true)
    } finally {
      setRenameTarget(null)
      setRenameValue('')
    }
  }

  // Delete item
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      if (deleteTarget.type === 'folder') {
        const { error } = await supabase.from('folders').delete().eq('id', deleteTarget.id)
        if (!error) {
          setFolders((prev) => prev.filter((f) => f.id !== deleteTarget.id))
          showToast('Pasta removida.')
        } else {
          showToast('Erro ao excluir pasta: ' + error.message, true)
        }
      } else {
        // Exclui do banco
        const { error: dbError } = await supabase.from('documents').delete().eq('id', deleteTarget.id)
        // Exclui do storage
        if (deleteTarget.storage_path) {
          await supabase.storage.from('documents').remove([deleteTarget.storage_path])
        }

        if (!dbError) {
          setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id))
          showToast('Documento removido.')
        } else {
          showToast('Erro ao excluir documento: ' + dbError.message, true)
        }
      }
    } catch (err: any) {
      showToast('Erro ao excluir: ' + err?.message, true)
    } finally {
      setDeleteTarget(null)
    }
  }

  // Formatar tamanho de arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#FCE8E6] border border-[#D93025]/20 flex items-start gap-2.5 text-xs text-[#D93025] font-semibold">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-[#EBF7F1] border border-[#36A879]/20 flex items-start gap-2.5 text-xs text-[#36A879] font-semibold">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
            Prontuários & Documentos Sociais
          </h2>
          <p className="text-xs text-[#827780] font-medium mt-0.5">
            Armazenamento seguro com criptografia e controle de acesso individual
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowFolderModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-[#F6E4EC] text-[#28232A] hover:bg-[#FFF9FB] text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <FolderPlus size={16} className="text-[#F04491]" />
            <span>Nova Pasta</span>
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-md transition-all cursor-pointer">
            <Upload size={16} />
            <span>{uploading ? 'Enviando...' : 'Enviar Arquivo'}</span>
            <input
              type="file"
              disabled={uploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white border border-[#F6E4EC] text-xs text-[#827780] overflow-x-auto">
        <HardDrive size={15} className="text-[#F04491] shrink-0" />
        {folderPath.map((item, index) => {
          const isLast = index === folderPath.length - 1
          return (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight size={14} className="text-[#827780]/60 shrink-0" />}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`font-semibold hover:text-[#F04491] transition-colors truncate max-w-[120px] ${
                  isLast ? 'text-[#F04491] font-bold' : ''
                }`}
              >
                {item.name}
              </button>
            </React.Fragment>
          )
        })}
      </div>

      {/* Folders & Documents Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#827780]">
          Carregando pastas e documentos...
        </div>
      ) : folders.length === 0 && documents.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-[#F6E4EC] text-center shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center mb-3">
            <Folder size={26} />
          </div>
          <h3 className="text-base font-bold text-[#28232A]">Esta pasta está vazia</h3>
          <p className="text-xs text-[#827780] max-w-sm mx-auto mt-1 mb-4">
            Crie uma nova subpasta ou envie relatórios e laudos em PDF/documentos.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Folders List */}
          {folders.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[#827780] uppercase tracking-wider mb-3">
                Pastas ({folders.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="p-3.5 bg-white rounded-2xl border border-[#F6E4EC] shadow-sm hover:border-[#F58BB5] hover:shadow-md transition-all flex items-center justify-between group"
                  >
                    <div
                      onClick={() => handleOpenFolder(folder)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center shrink-0">
                        <Folder size={20} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#28232A] block truncate group-hover:text-[#F04491] transition-colors">
                          {folder.name}
                        </span>
                        <span className="text-[10px] text-[#827780]">Pasta de Prontuários</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setRenameTarget({ type: 'folder', id: folder.id, name: folder.name })
                          setRenameValue(folder.name)
                        }}
                        title="Renomear pasta"
                        className="p-1 text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] rounded-lg cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            type: 'folder',
                            id: folder.id,
                            name: folder.name,
                          })
                        }
                        title="Excluir pasta"
                        className="p-1 text-[#827780] hover:text-[#D93025] hover:bg-[#FCE8E6] rounded-lg cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents List */}
          {documents.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-[#827780] uppercase tracking-wider">
                  Arquivos ({documents.length})
                </h3>
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setDocumentFilter('all')}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      documentFilter === 'all'
                        ? 'bg-[#28232A] text-white'
                        : 'bg-white text-[#827780] border border-[#F6E4EC]'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setDocumentFilter('pending')}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      documentFilter === 'pending'
                        ? 'bg-[#EA580C] text-white'
                        : 'bg-white text-[#827780] border border-[#F6E4EC]'
                    }`}
                  >
                    Pendentes de Revisão
                  </button>
                  <button
                    onClick={() => setDocumentFilter('reviewed')}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      documentFilter === 'reviewed'
                        ? 'bg-[#36A879] text-white'
                        : 'bg-white text-[#827780] border border-[#F6E4EC]'
                    }`}
                  >
                    Revisados
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {documents
                  .filter((doc) => {
                    if (documentFilter === 'pending') {
                      return doc.ai_analysis_status !== 'completed' && doc.ai_analysis_status !== 'reviewed'
                    }
                    if (documentFilter === 'reviewed') {
                      return doc.ai_analysis_status === 'completed' || doc.ai_analysis_status === 'reviewed'
                    }
                    return true
                  })
                  .map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 bg-white rounded-2xl border border-[#F6E4EC] shadow-sm hover:border-[#F58BB5] hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#EDF2FF] text-[#4B7BFF] flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-[#28232A] block truncate" title={doc.display_name}>
                          {doc.display_name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-[#827780] mt-0.5">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#F6E4EC]/60">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#F04491] hover:underline cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Abrir / Baixar</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setReviewTarget(doc)}
                          title="Revisão de Conformidade Técnica"
                          className="p-1 text-[#827780] hover:text-[#36A879] hover:bg-[#EBF7F1] rounded-lg cursor-pointer"
                        >
                          <FileCheck size={14} />
                        </button>
                        <button
                          onClick={() => setShareTarget({ type: 'document', id: doc.id, name: doc.display_name })}
                          title="Compartilhar documento"
                          className="p-1 text-[#827780] hover:text-[#4B7BFF] hover:bg-[#EDF2FF] rounded-lg cursor-pointer"
                        >
                          <Share2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setRenameTarget({ type: 'document', id: doc.id, name: doc.display_name })
                            setRenameValue(doc.display_name)
                          }}
                          title="Renomear documento"
                          className="p-1 text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] rounded-lg cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              type: 'document',
                              id: doc.id,
                              name: doc.display_name,
                              storage_path: doc.storage_path,
                            })
                          }
                          title="Excluir documento"
                          className="p-1 text-[#827780] hover:text-[#D93025] hover:bg-[#FCE8E6] rounded-lg cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-[#F6E4EC]">
            <h3 className="text-base font-bold text-[#28232A] mb-3">Criar Nova Pasta</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Prontuários CRAS 2026"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs md:text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:ring-2 focus:ring-[#F04491]/30"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-[#827780] hover:bg-[#FFF9FB] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#F04491] hover:bg-[#DE3380] text-white rounded-xl shadow-md cursor-pointer"
                >
                  Criar Pasta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-[#F6E4EC]">
            <h3 className="text-base font-bold text-[#28232A] mb-3">
              Renomear {renameTarget.type === 'folder' ? 'Pasta' : 'Documento'}
            </h3>
            <form onSubmit={handleRename} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-3.5 py-2 text-xs md:text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:ring-2 focus:ring-[#F04491]/30"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-3 py-2 text-xs font-semibold text-[#827780] hover:bg-[#FFF9FB] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#F04491] hover:bg-[#DE3380] text-white rounded-xl shadow-md cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={`Excluir ${deleteTarget?.type === 'folder' ? 'Pasta' : 'Documento'}?`}
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação removerá o registro e os arquivos associados.`}
      />

      {/* Document Review Assistant Modal */}
      {reviewTarget && (
        <DocumentReviewAssistant
          isOpen={Boolean(reviewTarget)}
          document={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSaveReview={handleSaveReview}
        />
      )}

      {/* Share Modal */}
      {shareTarget && (
        <ShareModal
          isOpen={Boolean(shareTarget)}
          onClose={() => setShareTarget(null)}
          resourceType={shareTarget.type}
          resourceId={shareTarget.id}
          resourceTitle={shareTarget.name}
        />
      )}
    </div>
  )
}
