import React, { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export interface ActivityAttachment {
  id: string
  activity_id: string
  uploader_id: string
  storage_path: string
  original_name: string
  mime_type: string
  file_size: number
  created_at: string
  updated_at: string
}

interface ActivityAttachmentsSectionProps {
  activityId?: string
  readOnly?: boolean
  pendingFiles?: File[]
  onAddPendingFile?: (file: File) => void
  onRemovePendingFile?: (index: number) => void
}

export const ActivityAttachmentsSection: React.FC<ActivityAttachmentsSectionProps> = ({
  activityId,
  readOnly = false,
  pendingFiles = [],
  onAddPendingFile,
  onRemovePendingFile,
}) => {
  const { user } = useAuth()
  const [attachments, setAttachments] = useState<ActivityAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3500)
  }

  const showError = (msg: string) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 4500)
  }

  // Carregar anexos existentes da atividade
  const loadAttachments = async () => {
    if (!activityId) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const { data, error } = await supabase
        .from('activity_attachments')
        .select('*')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false })

      if (error) {
        // Se a tabela ainda não foi criada no banco remoto, degrada graciosamente
        console.warn('Erro ao carregar anexos:', error.message)
      } else if (data) {
        setAttachments(data as ActivityAttachment[])
      }
    } catch (err: any) {
      console.warn('Exceção ao listar anexos:', err?.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAttachments()
  }, [activityId])

  // Formatar bytes legíveis
  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Obter ícone correspondente ao MIME
  const getFileIcon = (mime: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (mime.includes('pdf') || ext === 'pdf') {
      return <FileText size={18} className="text-[#F04491]" />
    }
    if (mime.includes('sheet') || mime.includes('excel') || ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
      return <FileSpreadsheet size={18} className="text-[#36A879]" />
    }
    if (mime.includes('image') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      return <ImageIcon size={18} className="text-[#4B7BFF]" />
    }
    return <FileCode size={18} className="text-[#827780]" />
  }

  // Upload de arquivo ou adição aos pendentes de envio
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const MAX_SIZE = 25 * 1024 * 1024

    // Se a atividade AINDA NÃO foi criada, adiciona aos arquivos pendentes para envio no submit
    if (!activityId) {
      for (const file of files) {
        if (file.size > MAX_SIZE) {
          showError(`O arquivo "${file.name}" excede o limite máximo permitido de 25 MB.`)
          continue
        }
        if (onAddPendingFile) {
          onAddPendingFile(file)
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const file = files[0]
    if (!file || !user) return

    // Validação de Tamanho (Limite de 25MB)
    if (file.size > MAX_SIZE) {
      showError('O arquivo selecionado excede o limite máximo permitido de 25 MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      // 1. Sanitizar nome e gerar caminho dentro do bucket 'documents'
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${user.id}/activities/${activityId}/${Date.now()}_${cleanName}`

      // 2. Upload para o Supabase Storage no bucket privado
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (storageError) {
        throw new Error(`Falha no armazenamento: ${storageError.message}`)
      }

      // 3. Registrar metadados na tabela public.activity_attachments
      const { data: recordData, error: dbError } = await (supabase
        .from('activity_attachments') as any)
        .insert({
          activity_id: activityId,
          uploader_id: user.id,
          storage_path: storagePath,
          original_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
        })
        .select()
        .single()

      if (dbError) {
        // Compensação: remove do storage se falhar no banco
        await supabase.storage.from('documents').remove([storagePath])
        throw new Error(`Falha ao registrar anexo no banco: ${dbError.message}`)
      }

      showSuccess('Relatório/anexo enviado e vinculado com sucesso!')
      if (recordData) {
        setAttachments((prev) => [recordData as ActivityAttachment, ...prev])
      } else {
        loadAttachments()
      }
    } catch (err: any) {
      console.error('Erro ao anexar arquivo:', err)
      showError(err?.message || 'Falha ao realizar upload do arquivo.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Baixar / Visualizar arquivo via Signed URL autorizada
  const handleDownload = async (attachment: ActivityAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(attachment.storage_path, 300) // 5 minutos de validade

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Não foi possível gerar link de acesso seguro.')
      }

      // Abre em nova aba
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      showError(`Erro ao abrir documento: ${err?.message}`)
    }
  }

  // Excluir anexo com política anti-órfãos
  const handleDelete = async (attachment: ActivityAttachment) => {
    if (!window.confirm(`Deseja realmente remover o anexo "${attachment.original_name}"?`)) {
      return
    }

    try {
      // 1. Remove do banco
      const { error: dbError } = await supabase
        .from('activity_attachments')
        .delete()
        .eq('id', attachment.id)

      if (dbError) throw dbError

      // 2. Remove do Supabase Storage
      await supabase.storage.from('documents').remove([attachment.storage_path])

      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))
      showSuccess('Anexo excluído com sucesso.')
    } catch (err: any) {
      showError(`Erro ao excluir anexo: ${err?.message}`)
    }
  }

  return (
    <div className="pt-4 border-t border-[#F6E4EC] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={16} className="text-[#F04491]" />
          <h3 className="text-xs font-bold text-[#28232A] uppercase tracking-wider">
            Relatórios e Anexos
          </h3>
          {attachments.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#FCE5ED] text-[#F04491]">
              {attachments.length}
            </span>
          )}
        </div>

        {!readOnly && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-bold text-[#F04491] hover:bg-[#FCE5ED] transition-colors cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Upload size={13} />
                <span>{activityId ? 'Anexar Relatório' : 'Anexar Arquivo'}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Input de arquivo invisível */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.txt"
      />

      {/* Mensagens de Sucesso e Erro */}
      {successMsg && (
        <div className="p-2.5 rounded-xl bg-[#EBF7F1] border border-[#36A879]/30 text-[#36A879] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-[#FEF1F2] border border-[#FCA5A5] text-[#D93025] text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Lista de Arquivos Pré-selecionados para envio junto com a atividade */}
      {pendingFiles && pendingFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#F04491]">
            <span>Anexos prontos para vinculação ({pendingFiles.length})</span>
            <span className="text-[10px] text-[#827780] font-normal">Serão enviados automaticamente ao salvar</span>
          </div>
          <div className="space-y-1.5">
            {pendingFiles.map((file, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center justify-between gap-3 hover:border-[#F58BB5]/50 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-xl bg-white border border-[#F6E4EC] shrink-0">
                    {getFileIcon(file.type, file.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#28232A] truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[10px] text-[#827780] flex items-center gap-2">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span className="text-[#36A879] font-bold">Pronto para envio</span>
                    </p>
                  </div>
                </div>

                {onRemovePendingFile && (
                  <button
                    type="button"
                    onClick={() => onRemovePendingFile(idx)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[#827780] hover:text-[#D93025] hover:bg-[#FEF1F2] transition-colors cursor-pointer shrink-0"
                    title="Remover anexo da seleção"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dica para nova atividade sem anexos ainda */}
      {!activityId && pendingFiles.length === 0 && (
        <div className="p-3 rounded-2xl bg-[#FFF9FB] border border-dashed border-[#F6E4EC] text-center">
          <p className="text-[11px] text-[#827780]">
            📎 Você já pode selecionar relatórios, fotos ou documentos antes de salvar. Eles serão enviados e vinculados diretamente à atividade.
          </p>
        </div>
      )}

      {/* Lista de anexos existentes */}
      {activityId && (
        <div className="space-y-1.5">
          {loading ? (
            <div className="py-4 text-center text-xs text-[#827780] flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin text-[#F04491]" />
              <span>Carregando anexos vinculados...</span>
            </div>
          ) : attachments.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[#FFF9FB] border border-dashed border-[#F6E4EC] text-center">
              <p className="text-xs text-[#827780]">
                Nenhum relatório técnico ou documento anexado a esta atividade.
              </p>
              <p className="text-[10px] text-[#827780] mt-0.5">
                Formatos suportados: PDF, Word, Excel, Planilhas e Fotos de Visita (até 25 MB).
              </p>
            </div>
          ) : (
            attachments.map((att) => (
              <div
                key={att.id}
                className="p-2.5 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center justify-between gap-3 hover:border-[#F58BB5]/50 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-xl bg-white border border-[#F6E4EC] shrink-0">
                    {getFileIcon(att.mime_type, att.original_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#28232A] truncate" title={att.original_name}>
                      {att.original_name}
                    </p>
                    <p className="text-[10px] text-[#827780] flex items-center gap-2">
                      <span>{formatFileSize(att.file_size)}</span>
                      <span>•</span>
                      <span>
                        {new Date(att.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(att)}
                    className="p-1.5 rounded-xl text-[#827780] hover:text-[#4B7BFF] hover:bg-white transition-colors cursor-pointer"
                    title="Baixar ou Visualizar Documento"
                  >
                    <Download size={15} />
                  </button>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDelete(att)}
                      className="p-1.5 rounded-xl text-[#827780] hover:text-[#D93025] hover:bg-[#FEF1F2] transition-colors cursor-pointer"
                      title="Excluir Anexo"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
