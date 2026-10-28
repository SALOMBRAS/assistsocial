import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileText,
  Plus,
  Download,
  Save,
  Trash2,
  Edit3,
  Search,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Printer,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  FileSignature,
  FileCheck,
  ChevronRight,
  Building2,
  Calendar,
  Layers,
  Settings,
  X,
  Copy,
} from 'lucide-react'
import {
  type DocumentBlock,
  type EditorDocument,
  type DocumentTemplate,
  type LetterheadSettings,
  DEFAULT_LETTERHEAD_SETTINGS,
  OFFICIAL_TEMPLATES,
  fetchUserEditorDocuments,
  saveUserEditorDocument,
  deleteUserEditorDocument,
  downloadDocxFile,
} from '../services/documentEditorService'
import { useAuth } from '../contexts/AuthContext'

interface DocumentEditorViewProps {
  onBackToDashboard?: () => void
}

export const DocumentEditorView: React.FC<DocumentEditorViewProps> = ({ onBackToDashboard }) => {
  const { user } = useAuth()

  // Lista de rascunhos salvos
  const [documents, setDocuments] = useState<EditorDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true)

  // Documento atualmente em edição (se null, exibe a tela inicial da galeria)
  const [activeDoc, setActiveDoc] = useState<EditorDocument | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isExporting, setIsExporting] = useState<boolean>(false)

  // Filtros da Galeria
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('todos')
  const [activeTab, setActiveTab] = useState<'modelos' | 'meus_documentos'>('modelos')

  // Painel de Configurações da Folha Timbrada no Editor
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false)

  // Feedback Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // Carregar documentos salvos
  const loadDocuments = useCallback(async () => {
    setIsLoadingDocs(true)
    try {
      const list = await fetchUserEditorDocuments()
      setDocuments(list)
    } catch {
      showToast('error', 'Falha ao carregar rascunhos de documentos.')
    } finally {
      setIsLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Iniciar novo documento a partir de um modelo
  const handleSelectTemplate = (template: DocumentTemplate) => {
    const newDoc: EditorDocument = {
      title: template.title,
      category: template.category,
      template_id: template.id,
      blocks: JSON.parse(JSON.stringify(template.defaultBlocks)),
      settings: {
        ...DEFAULT_LETTERHEAD_SETTINGS,
        ...template.defaultSettings,
        signerName: user?.email ? user.email.split('@')[0] : DEFAULT_LETTERHEAD_SETTINGS.signerName,
      },
    }
    setActiveDoc(newDoc)
    setHasUnsavedChanges(true)
  }

  // Iniciar documento em branco
  const handleCreateBlankDoc = () => {
    const blankDoc: EditorDocument = {
      title: 'Novo Documento Oficial',
      category: 'geral',
      template_id: 'folha_timbrada_em_branco',
      blocks: [
        { id: 'b1', type: 'heading1', text: 'TÍTULO DO DOCUMENTO', align: 'center', bold: true },
        { id: 'b2', type: 'paragraph', text: 'Digite o conteúdo do seu documento aqui...', align: 'justify' },
        { id: 'b3', type: 'signature', text: 'Assinatura', align: 'center' },
      ],
      settings: {
        ...DEFAULT_LETTERHEAD_SETTINGS,
        signerName: user?.email ? user.email.split('@')[0] : DEFAULT_LETTERHEAD_SETTINGS.signerName,
      },
    }
    setActiveDoc(blankDoc)
    setHasUnsavedChanges(true)
  }

  // Abrir documento existente
  const handleOpenExistingDoc = (doc: EditorDocument) => {
    setActiveDoc(JSON.parse(JSON.stringify(doc)))
    setHasUnsavedChanges(false)
  }

  // Salvar rascunho
  const handleSave = async () => {
    if (!activeDoc) return
    if (!activeDoc.title.trim()) {
      showToast('error', 'Informe um título para o documento.')
      return
    }

    setIsSaving(true)
    try {
      const res = await saveUserEditorDocument(activeDoc)
      if (res.success) {
        if (res.id && !activeDoc.id) {
          setActiveDoc((prev) => (prev ? { ...prev, id: res.id } : null))
        }
        setHasUnsavedChanges(false)
        showToast('success', res.message || 'Documento salvo com sucesso!')
        loadDocuments()
      } else {
        showToast('error', res.message)
      }
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar documento.')
    } finally {
      setIsSaving(false)
    }
  }

  // Baixar arquivo .docx
  const handleDownloadDocx = async (docToDownload?: EditorDocument) => {
    const target = docToDownload || activeDoc
    if (!target) return

    setIsExporting(true)
    try {
      await downloadDocxFile(target)
      showToast('success', `Arquivo "${target.title}.docx" gerado e baixado com sucesso!`)
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Falha na exportação do arquivo Word.')
    } finally {
      setIsExporting(false)
    }
  }

  // Excluir documento
  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) return
    const success = await deleteUserEditorDocument(id)
    if (success) {
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      if (activeDoc?.id === id) {
        setActiveDoc(null)
      }
      showToast('success', 'Documento excluído com sucesso.')
    } else {
      showToast('error', 'Falha ao excluir documento.')
    }
  }

  // Fechar editor e voltar à galeria
  const handleCloseEditor = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Existem alterações não salvas neste documento. Deseja realmente sair?')) {
        return
      }
    }
    setActiveDoc(null)
    setHasUnsavedChanges(false)
  }

  // Filtragem dos modelos da galeria
  const filteredTemplates = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return OFFICIAL_TEMPLATES.filter((tpl) => {
      const matchCategory =
        activeCategoryFilter === 'todos' || tpl.category === activeCategoryFilter
      const matchSearch =
        !term ||
        tpl.title.toLowerCase().includes(term) ||
        tpl.description.toLowerCase().includes(term) ||
        tpl.categoryLabel.toLowerCase().includes(term)
      return matchCategory && matchSearch
    })
  }, [searchTerm, activeCategoryFilter])

  // Filtragem dos meus documentos salvos
  const filteredMyDocs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return documents.filter((doc) => {
      return !term || doc.title.toLowerCase().includes(term)
    })
  }, [documents, searchTerm])

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl border max-w-md flex items-center gap-3 transition-all animate-fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-pink-50 text-pink-900 border-pink-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
          )}
          <span className="text-xs md:text-sm font-semibold">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-auto text-gray-400 hover:text-gray-700 p-1"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODO 1: EDITOR ATIVO                                                 */}
      {/* ==================================================================== */}
      {activeDoc ? (
        <DocumentEditorCanvas
          doc={activeDoc}
          setDoc={setActiveDoc}
          hasUnsavedChanges={hasUnsavedChanges}
          setHasUnsavedChanges={setHasUnsavedChanges}
          isSaving={isSaving}
          isExporting={isExporting}
          onSave={handleSave}
          onDownloadDocx={() => handleDownloadDocx()}
          onCloseEditor={handleCloseEditor}
          showSettingsDrawer={showSettingsDrawer}
          setShowSettingsDrawer={setShowSettingsDrawer}
        />
      ) : (
        /* ==================================================================== */
        /* MODO 2: TELA INICIAL / GALERIA DE MODELOS E RASCUNHOS               */
        /* ==================================================================== */
        <div className="space-y-6">
          {/* Header Superior da Área de Documentos */}
          <div className="bg-white rounded-3xl border border-pink-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <FileText size={16} />
                <span>Central de Documentos Oficiais & Folha Timbrada</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
                Documentos Word (.docx)
              </h1>
              <p className="text-xs text-[#827780]">
                Crie relatórios, estudos, pareceres e ofícios socioassistenciais padronizados com cabeçalho institucional e exportação direta em DOCX.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCreateBlankDoc}
                className="px-4 py-2.5 rounded-2xl bg-white border border-[#F6E4EC] hover:bg-[#FFF9FB] text-[#28232A] hover:text-primary text-xs md:text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer min-h-[44px]"
              >
                <Plus size={16} className="text-primary stroke-[2.5]" />
                <span>Documento em Branco</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('modelos')
                  window.scrollTo({ top: 300, behavior: 'smooth' })
                }}
                className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs md:text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer min-h-[44px]"
              >
                <Sparkles size={16} />
                <span>Usar Modelo da Galeria</span>
              </button>
            </div>
          </div>

          {/* Abas e Filtros de Pesquisa */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Seletor de Abas: Modelos vs Meus Documentos */}
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-pink-100 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab('modelos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'modelos'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-[#827780] hover:text-[#28232A] hover:bg-[#FFF9FB]'
                }`}
              >
                <Sparkles size={14} />
                <span>Galeria de Modelos ({OFFICIAL_TEMPLATES.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('meus_documentos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'meus_documentos'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-[#827780] hover:text-[#28232A] hover:bg-[#FFF9FB]'
                }`}
              >
                <FileCheck size={14} />
                <span>Meus Documentos Salvos ({documents.length})</span>
              </button>
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por título, objetivo ou categoria..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-white rounded-2xl border border-[#F6E4EC] text-[#28232A] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all min-h-[40px]"
              />
            </div>
          </div>

          {/* Categorias Filtro (Pílulas) */}
          {activeTab === 'modelos' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'todos', label: 'Todos os Modelos' },
                { id: 'relatorios', label: 'Relatórios Sociais' },
                { id: 'pareceres', label: 'Pareceres & Estudos' },
                { id: 'declaracoes', label: 'Declarações & Atas' },
                { id: 'oficios', label: 'Ofícios & Gestão' },
                { id: 'geral', label: 'Geral' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeCategoryFilter === cat.id
                      ? 'bg-pink-100/80 text-primary border border-primary/30'
                      : 'bg-white text-[#827780] hover:text-[#28232A] border border-[#F6E4EC]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Conteúdo da Aba 1: Galeria de Modelos */}
          {activeTab === 'modelos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="bg-white rounded-3xl p-5 border border-[#F6E4EC] hover:border-primary/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-50 text-primary border border-pink-200">
                        {template.badge}
                      </span>
                      <span className="text-[11px] font-semibold text-[#827780]">
                        {template.categoryLabel}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#28232A] group-hover:text-primary transition-colors">
                      {template.title}
                    </h3>

                    <p className="text-xs text-[#827780] line-clamp-3 leading-relaxed">
                      {template.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Criar com este modelo <ChevronRight size={14} />
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-pink-50 text-primary flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Conteúdo da Aba 2: Meus Documentos Salvos */}
          {activeTab === 'meus_documentos' && (
            <div className="space-y-4">
              {isLoadingDocs ? (
                <div className="bg-white rounded-3xl border border-pink-100 p-12 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                  <p className="text-xs font-semibold">Carregando documentos salvos...</p>
                </div>
              ) : filteredMyDocs.length === 0 ? (
                <div className="bg-white rounded-3xl border border-pink-100 p-12 text-center text-gray-500 space-y-3">
                  <FileText className="w-12 h-12 mx-auto text-gray-300" />
                  <h3 className="text-base font-bold text-[#28232A]">
                    Nenhum documento salvo encontrado
                  </h3>
                  <p className="text-xs text-[#827780] max-w-sm mx-auto">
                    Você ainda não possui rascunhos criados. Escolha um modelo da galeria para começar ou crie um documento em branco.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('modelos')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-hover transition-colors"
                  >
                    <Sparkles size={14} />
                    Ver Modelos Prontos
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMyDocs.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => handleOpenExistingDoc(doc)}
                      className="bg-white rounded-3xl p-5 border border-[#F6E4EC] hover:border-primary/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Word .docx
                          </span>
                          <span className="text-[10px] text-[#827780]">
                            {doc.updated_at
                              ? new Date(doc.updated_at).toLocaleDateString('pt-BR')
                              : 'Hoje'}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-[#28232A] group-hover:text-primary transition-colors line-clamp-2">
                          {doc.title}
                        </h3>

                        <p className="text-xs text-[#827780] line-clamp-2 italic">
                          {doc.blocks[1]?.text || doc.blocks[0]?.text || 'Documento sem texto inicial...'}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadDocx(doc)
                          }}
                          className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-primary text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Baixar arquivo Word (.docx)"
                        >
                          <Download size={13} />
                          <span>Baixar</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenExistingDoc(doc)
                            }}
                            className="p-1.5 rounded-xl text-[#827780] hover:text-primary hover:bg-pink-50 transition-colors"
                            title="Editar Documento"
                          >
                            <Edit3 size={15} />
                          </button>
                          {doc.id && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDoc(doc.id!, e)}
                              className="p-1.5 rounded-xl text-[#827780] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Excluir Documento"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * ============================================================================
 * SUBCOMPONENTE: CANVAS E BARRA DE FERRAMENTAS DO EDITOR VISUAL A4
 * ============================================================================
 */
interface DocumentEditorCanvasProps {
  doc: EditorDocument
  setDoc: React.Dispatch<React.SetStateAction<EditorDocument | null>>
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (val: boolean) => void
  isSaving: boolean
  isExporting: boolean
  onSave: () => void
  onDownloadDocx: () => void
  onCloseEditor: () => void
  showSettingsDrawer: boolean
  setShowSettingsDrawer: React.Dispatch<React.SetStateAction<boolean>>
}

const DocumentEditorCanvas: React.FC<DocumentEditorCanvasProps> = ({
  doc,
  setDoc,
  hasUnsavedChanges,
  setHasUnsavedChanges,
  isSaving,
  isExporting,
  onSave,
  onDownloadDocx,
  onCloseEditor,
  showSettingsDrawer,
  setShowSettingsDrawer,
}) => {
  const updateBlock = (blockId: string, updates: Partial<DocumentBlock>) => {
    setDoc((prev) => {
      if (!prev) return null
      const updatedBlocks = prev.blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b))
      return { ...prev, blocks: updatedBlocks }
    })
    setHasUnsavedChanges(true)
  }

  const addBlock = (type: DocumentBlock['type'], afterBlockId?: string) => {
    const newBlock: DocumentBlock = {
      id: 'b_' + Date.now() + Math.random().toString(36).slice(2, 6),
      type,
      text: type === 'table' ? '' : 'Novo parágrafo...',
      align: 'justify',
      tableData:
        type === 'table'
          ? [
              ['Item / Identificador', 'Situação Atual', 'Observações Técnicas'],
              ['Documento 01', 'Regular', 'Apresentou comprovante original'],
              ['Documento 02', 'Pendente', 'Aguardando 2ª via do cartório'],
            ]
          : undefined,
    }

    setDoc((prev) => {
      if (!prev) return null
      const index = afterBlockId ? prev.blocks.findIndex((b) => b.id === afterBlockId) : -1
      const newBlocks = [...prev.blocks]
      if (index >= 0) {
        newBlocks.splice(index + 1, 0, newBlock)
      } else {
        newBlocks.push(newBlock)
      }
      return { ...prev, blocks: newBlocks }
    })
    setHasUnsavedChanges(true)
  }

  const removeBlock = (blockId: string) => {
    setDoc((prev) => {
      if (!prev) return null
      return { ...prev, blocks: prev.blocks.filter((b) => b.id !== blockId) }
    })
    setHasUnsavedChanges(true)
  }

  return (
    <div className="space-y-4">
      {/* Barra de Ações Superior do Editor */}
      <div className="bg-white rounded-3xl border border-pink-100 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-2 z-20 backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCloseEditor}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title="Voltar para a Galeria de Documentos"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <input
              type="text"
              value={doc.title}
              onChange={(e) => {
                setDoc((prev) => (prev ? { ...prev, title: e.target.value } : null))
                setHasUnsavedChanges(true)
              }}
              className="text-base md:text-lg font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-pink-300 focus:border-primary focus:outline-none transition-colors px-1"
              placeholder="Título do Documento..."
            />
            <div className="flex items-center gap-2 text-[11px] text-gray-500 px-1">
              <span>Formato A4 Word (.docx)</span>
              {hasUnsavedChanges ? (
                <span className="text-amber-600 font-semibold">• Alterações não salvas</span>
              ) : (
                <span className="text-emerald-600 font-semibold">• Todas as alterações salvas</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSettingsDrawer((prev) => !prev)}
            className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Configurar Folha Timbrada e Margens"
          >
            <Settings size={15} />
            <span>Folha Timbrada</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-white border border-primary text-primary hover:bg-pink-50 text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Salvar</span>
          </button>

          <button
            type="button"
            onClick={onDownloadDocx}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Baixar .docx</span>
          </button>
        </div>
      </div>

      {/* Barra de Formatação Rápida (Toolbar estilo Word) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-xs flex items-center gap-1 flex-wrap text-xs text-gray-700">
        <button
          type="button"
          onClick={() => addBlock('paragraph')}
          className="px-2.5 py-1.5 rounded-lg hover:bg-pink-50 hover:text-primary font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Plus size={13} /> Parágrafo
        </button>

        <button
          type="button"
          onClick={() => addBlock('heading1')}
          className="px-2.5 py-1.5 rounded-lg hover:bg-pink-50 hover:text-primary font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Plus size={13} /> Título 1
        </button>

        <button
          type="button"
          onClick={() => addBlock('heading2')}
          className="px-2.5 py-1.5 rounded-lg hover:bg-pink-50 hover:text-primary font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Plus size={13} /> Título 2
        </button>

        <div className="w-[1px] h-5 bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={() => addBlock('bullet')}
          className="p-1.5 rounded-lg hover:bg-pink-50 hover:text-primary transition-colors cursor-pointer"
          title="Adicionar Marcador com Ponto"
        >
          <List size={16} />
        </button>

        <button
          type="button"
          onClick={() => addBlock('numbered')}
          className="p-1.5 rounded-lg hover:bg-pink-50 hover:text-primary transition-colors cursor-pointer"
          title="Adicionar Marcador Numerado"
        >
          <ListOrdered size={16} />
        </button>

        <button
          type="button"
          onClick={() => addBlock('table')}
          className="px-2.5 py-1.5 rounded-lg hover:bg-pink-50 hover:text-primary font-semibold flex items-center gap-1 cursor-pointer"
          title="Inserir Tabela de Dados"
        >
          <TableIcon size={14} /> Tabela
        </button>

        <button
          type="button"
          onClick={() => addBlock('signature')}
          className="px-2.5 py-1.5 rounded-lg hover:bg-pink-50 hover:text-primary font-semibold flex items-center gap-1 cursor-pointer"
          title="Adicionar Bloco de Assinatura Profissional"
        >
          <FileSignature size={14} /> Assinatura
        </button>
      </div>

      {/* Painel Lateral Deslizante: Configurações da Folha Timbrada */}
      {showSettingsDrawer && (
        <div className="bg-pink-50/70 border border-pink-200 rounded-3xl p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-pink-200/60 pb-3">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-primary" />
              <h3 className="text-sm font-bold text-gray-900">
                Configurações da Folha Timbrada & Cabeçalho Institucional
              </h3>
            </div>
            <button
              onClick={() => setShowSettingsDrawer(false)}
              className="text-gray-400 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Nome da Instituição (Linha 1)</label>
              <input
                type="text"
                value={doc.settings.institutionName}
                onChange={(e) => {
                  setDoc((prev) =>
                    prev
                      ? {
                          ...prev,
                          settings: { ...prev.settings, institutionName: e.target.value },
                        }
                      : null
                  )
                  setHasUnsavedChanges(true)
                }}
                className="w-full p-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Unidade / Equipamento (Linha 2)</label>
              <input
                type="text"
                value={doc.settings.institutionUnit}
                onChange={(e) => {
                  setDoc((prev) =>
                    prev
                      ? {
                          ...prev,
                          settings: { ...prev.settings, institutionUnit: e.target.value },
                        }
                      : null
                  )
                  setHasUnsavedChanges(true)
                }}
                className="w-full p-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Endereço e Contato (Linha 3)</label>
              <input
                type="text"
                value={doc.settings.institutionAddress}
                onChange={(e) => {
                  setDoc((prev) =>
                    prev
                      ? {
                          ...prev,
                          settings: { ...prev.settings, institutionAddress: e.target.value },
                        }
                      : null
                  )
                  setHasUnsavedChanges(true)
                }}
                className="w-full p-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Nome do(a) Signatário(a)</label>
              <input
                type="text"
                value={doc.settings.signerName}
                onChange={(e) => {
                  setDoc((prev) =>
                    prev
                      ? {
                          ...prev,
                          settings: { ...prev.settings, signerName: e.target.value },
                        }
                      : null
                  )
                  setHasUnsavedChanges(true)
                }}
                className="w-full p-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Cargo e Registro CRESS</label>
              <input
                type="text"
                value={doc.settings.signerRole}
                onChange={(e) => {
                  setDoc((prev) =>
                    prev
                      ? {
                          ...prev,
                          settings: { ...prev.settings, signerRole: e.target.value },
                        }
                      : null
                  )
                  setHasUnsavedChanges(true)
                }}
                className="w-full p-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Fonte Padrão do Documento</label>
              <select
                value={doc.settings.fontFamily}
                onChange={(e) => {
                  setDoc((prev) =>
                    prev
                      ? {
                          ...prev,
                          settings: {
                            ...prev.settings,
                            fontFamily: e.target.value as LetterheadSettings['fontFamily'],
                          },
                        }
                      : null
                  )
                  setHasUnsavedChanges(true)
                }}
                className="w-full p-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-primary"
              >
                <option value="Calibri">Calibri (Padrão Office)</option>
                <option value="Arial">Arial (ABNT)</option>
                <option value="Times New Roman">Times New Roman (Clássico)</option>
                <option value="Georgia">Georgia (Editorial)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SIMULADOR VISUAL DE FOLHA A4 (PREVIEW E EDIÇÃO INLINE)               */}
      {/* ==================================================================== */}
      <div className="flex justify-center p-2 sm:p-6 bg-gray-100/70 rounded-3xl overflow-x-auto">
        <div
          className="bg-white w-full max-w-[820px] min-h-[1140px] p-8 sm:p-14 shadow-2xl rounded-sm border border-gray-200 flex flex-col justify-between"
          style={{ fontFamily: doc.settings.fontFamily || 'Calibri' }}
        >
          {/* CABEÇALHO DA FOLHA TIMBRADA VISÍVEL */}
          {doc.settings.includeLetterhead && (
            <div className="border-b-2 border-primary pb-3 mb-8 text-center space-y-1 select-none">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-[#F58BB5] text-white flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Building2 size={24} />
              </div>
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-gray-900">
                {doc.settings.institutionName}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-primary">
                {doc.settings.institutionUnit}
              </p>
              <p className="text-[11px] text-gray-500">
                {doc.settings.institutionAddress} • Tel: {doc.settings.institutionPhone} • {doc.settings.institutionEmail}
              </p>
            </div>
          )}

          {/* CORPO DO DOCUMENTO (BLOCO A BLOCO) */}
          <div className="space-y-4 flex-1">
            {doc.blocks.map((block) => (
              <div key={block.id} className="relative group">
                {/* Controles Flutuantes do Bloco */}
                <div className="absolute -left-10 top-0 hidden group-hover:flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-xs z-10">
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="p-1 text-gray-400 hover:text-rose-600"
                    title="Remover este bloco"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {block.type === 'heading1' ? (
                  <input
                    type="text"
                    value={block.text}
                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                    className="w-full text-xl sm:text-2xl font-black text-gray-900 tracking-tight border-b border-transparent hover:border-gray-200 focus:border-primary focus:outline-none transition-colors py-1 text-center"
                  />
                ) : block.type === 'heading2' ? (
                  <input
                    type="text"
                    value={block.text}
                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                    className="w-full text-base sm:text-lg font-bold text-gray-800 border-b border-transparent hover:border-gray-200 focus:border-primary focus:outline-none transition-colors py-1"
                  />
                ) : block.type === 'table' ? (
                  <div className="overflow-x-auto py-2">
                    <table className="w-full border-collapse border border-gray-300 text-xs">
                      <tbody>
                        {(block.tableData || []).map((row, rIdx) => (
                          <tr key={rIdx} className={rIdx === 0 ? 'bg-pink-50 font-bold' : ''}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="border border-gray-300 p-2">
                                <input
                                  type="text"
                                  value={cell}
                                  onChange={(e) => {
                                    const newData = [...(block.tableData || [])]
                                    newData[rIdx] = [...newData[rIdx]]
                                    newData[rIdx][cIdx] = e.target.value
                                    updateBlock(block.id, { tableData: newData })
                                  }}
                                  className="w-full bg-transparent focus:outline-none"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : block.type === 'signature' ? (
                  <div className="pt-10 text-center space-y-1">
                    <p className="text-right text-xs text-gray-600 mb-8">
                      {doc.settings.cityDateLine}
                    </p>
                    <div className="w-72 border-t border-gray-400 mx-auto pt-2">
                      <p className="font-bold text-sm text-gray-900">
                        {doc.settings.signerName || 'Nome do(a) Profissional'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {doc.settings.signerRole} {doc.settings.signerRegistration ? `• ${doc.settings.signerRegistration}` : ''}
                      </p>
                    </div>
                  </div>
                ) : (
                  <textarea
                    rows={Math.max(2, Math.ceil(block.text.length / 80))}
                    value={block.text}
                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                    className="w-full text-sm text-gray-800 leading-relaxed bg-transparent border border-transparent hover:border-gray-200 focus:border-primary focus:bg-pink-50/20 focus:outline-none rounded-lg p-2 transition-all resize-none text-justify"
                  />
                )}
              </div>
            ))}
          </div>

          {/* RODAPÉ COM NUMERAÇÃO DE PÁGINA */}
          {doc.settings.includePageNumbers && (
            <div className="border-t border-gray-200 pt-3 mt-8 flex items-center justify-between text-[11px] text-gray-400 select-none">
              <span>AssistSocial — Sistema de Gestão Socioassistencial</span>
              <span>Página 1 de 1</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
